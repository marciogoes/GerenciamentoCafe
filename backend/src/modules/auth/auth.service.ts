import {
  Injectable, UnauthorizedException,
  BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt       from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode       from 'qrcode';

import { UsersService }   from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { AuditService }   from '../audit/audit.service';

@Injectable()
export class AuthService {

  private readonly maxTentativas:  number;
  private readonly bloqueioMin:    number;
  private readonly jwtSecret:      string;
  private readonly refreshSecret:  string;

  constructor(
    private usersService:   UsersService,
    private tenantsService: TenantsService,
    private jwtService:     JwtService,
    private config:         ConfigService,
    private auditService:   AuditService,
  ) {
    this.maxTentativas = config.get<number>('LOGIN_MAX_ATTEMPTS')  || 5;
    this.bloqueioMin   = config.get<number>('LOGIN_BLOCK_MINUTES') || 15;
    this.jwtSecret     = config.get<string>('JWT_SECRET');
    this.refreshSecret = config.get<string>('JWT_REFRESH_SECRET');
  }

  // ── LOGIN etapa 1: email + senha ─────────────────────────────
  async login(email: string, senha: string, tenantSlug: string) {

    // FIX #1 — resolve slug para UUID real do tenant
    const tenant = await this.tenantsService.buscarPorSlug(tenantSlug);
    if (!tenant) {
      throw new UnauthorizedException('Empresa não encontrada. Verifique o identificador.');
    }
    if (tenant.status === 'suspenso' || tenant.status === 'cancelado') {
      throw new ForbiddenException(
        `Esta conta está ${tenant.status}. Entre em contato com o suporte.`,
      );
    }

    const tenantId = tenant.id;                    // UUID real

    const usuario = await this.usersService.findByEmail(email, tenantId);
    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Verifica bloqueio
    if (usuario.bloqueado_ate && new Date() < new Date(usuario.bloqueado_ate)) {
      const min = Math.ceil(
        (new Date(usuario.bloqueado_ate).getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Conta bloqueada. Tente novamente em ${min} minuto(s).`,
      );
    }

    // Verifica senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      const tentativas = (usuario.tentativas_login || 0) + 1;
      await this.usersService.registrarTentativaFalha(
        usuario.id, tentativas, this.maxTentativas, this.bloqueioMin,
      );
      const restantes = this.maxTentativas - tentativas;
      if (restantes <= 0) {
        await this.auditService.registrar({
          tenantId:    tenantId,
          usuarioId:   usuario.id,
          usuarioNome: usuario.nome,
          acao:        'LOGIN_BLOQUEADO',
          modulo:      'auth',
          descricao:   `Conta bloqueada após ${this.maxTentativas} tentativas inválidas`,
        });
        throw new ForbiddenException(
          `Conta bloqueada por ${this.bloqueioMin} minutos após ${this.maxTentativas} tentativas inválidas.`,
        );
      }
      throw new UnauthorizedException(
        `Credenciais inválidas. ${restantes} tentativa(s) restante(s).`,
      );
    }

    if (!usuario.ativo) {
      throw new ForbiddenException('Usuário desativado. Contate o administrador.');
    }

    // FIX #2 — verifica e-mail da empresa (não bloqueia, avisa)
    if (!tenant.email_verificado) {
      throw new ForbiddenException(
        'E-mail da empresa ainda não verificado. Verifique sua caixa de entrada.',
      );
    }

    // 2FA ativo → retorna token temporário para verificação
    if (usuario.dois_fa_ativo) {
      const tokenTemp = this.jwtService.sign(
        { sub: usuario.id, tenantId, step: '2fa' },
        { secret: this.jwtSecret, expiresIn: '5m' },
      );
      return {
        requer2FA: true,
        tokenTemp,
        mensagem:  'Informe o código do seu aplicativo autenticador.',
      };
    }

    await this.usersService.atualizarLogin(usuario.id);
    await this.auditService.registrar({
      tenantId:    tenantId,
      usuarioId:   usuario.id,
      usuarioNome: usuario.nome,
      acao:        'LOGIN',
      modulo:      'auth',
      descricao:   `Login bem-sucedido — ${email}`,
    });
    return this.gerarTokens(usuario);
  }

  // ── LOGIN etapa 2: verificação TOTP ──────────────────────────
  async verificar2Fa(codigo: string, tokenTemp: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tokenTemp, { secret: this.jwtSecret });
    } catch {
      throw new UnauthorizedException('Token temporário inválido ou expirado.');
    }

    if (payload.step !== '2fa') {
      throw new BadRequestException('Token inválido para este fluxo.');
    }

    // Uma única query que já traz o secret (fix #12 — elimina double-fetch)
    const comSecret = await this.usersService.findByIdComSecret(payload.sub, payload.tenantId);
    if (!comSecret || !comSecret.dois_fa_ativo) {
      throw new UnauthorizedException('Usuário não encontrado ou 2FA não ativo.');
    }

    const valido = authenticator.verify({
      token:  codigo,
      secret: comSecret.dois_fa_secret,
    });

    if (!valido) {
      throw new UnauthorizedException('Código 2FA inválido. Verifique seu aplicativo autenticador.');
    }

    await this.usersService.atualizarLogin(comSecret.id);
    return this.gerarTokens(comSecret);
  }

  // ── CONFIGURAR 2FA passo 1: gera secret e QR Code ─────────────
  // FIX #3 — agora salva o secret em campo temporário e só ativa após confirmação
  async iniciar2Fa(userId: string, tenantId: string) {
    const usuario = await this.usersService.findById(userId, tenantId);
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.');

    const secret    = authenticator.generateSecret();
    const otpauth   = authenticator.keyuri(usuario.email, 'Vending Manager', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Salva apenas o secret (sem ativar 2FA ainda)
    await this.usersService.salvar2FaSecretPendente(userId, secret);

    return { secret, qrCodeUrl, mensagem: 'Escaneie o QR e confirme com o código.' };
  }

  // ── CONFIGURAR 2FA passo 2: confirma código e ativa ───────────
  async confirmar2Fa(userId: string, tenantId: string, codigo: string) {
    const comSecret = await this.usersService.findByIdComSecret(userId, tenantId);
    if (!comSecret?.dois_fa_secret) {
      throw new BadRequestException('Inicie o setup de 2FA antes de confirmar.');
    }

    const valido = authenticator.verify({ token: codigo, secret: comSecret.dois_fa_secret });
    if (!valido) {
      throw new UnauthorizedException('Código inválido. Verifique o app autenticador.');
    }

    await this.usersService.ativar2Fa(userId);
    return { mensagem: '2FA ativado com sucesso.' };
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────────
  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const usuario = await this.usersService.findById(payload.sub, payload.tenantId);
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo ou não encontrado.');
    }
    return this.gerarTokens(usuario);
  }

  // ── Validação de força de senha ───────────────────────────────
  static validarForcaSenha(senha: string): { valida: boolean; erros: string[] } {
    const erros: string[] = [];
    if (senha.length < 8)            erros.push('Mínimo 8 caracteres.');
    if (!/[A-Z]/.test(senha))        erros.push('Pelo menos 1 letra maiúscula.');
    if (!/[0-9]/.test(senha))        erros.push('Pelo menos 1 número.');
    if (!/[^A-Za-z0-9]/.test(senha)) erros.push('Pelo menos 1 símbolo especial.');
    return { valida: erros.length === 0, erros };
  }

  async hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 12);
  }

  // ── Helper: monta access + refresh tokens ─────────────────────
  private gerarTokens(usuario: any) {
    const payload = {
      sub:      usuario.id,
      email:    usuario.email,
      tenantId: usuario.tenant_id,
      perfil:   usuario.perfil,
    };

    const access_token = this.jwtService.sign(payload, {
      secret:    this.jwtSecret,
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '8h',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret:    this.refreshSecret,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    return {
      requer2FA: false,
      access_token,
      refresh_token,
      usuario: {
        id:       usuario.id,
        nome:     usuario.nome,
        email:    usuario.email,
        perfil:   usuario.perfil,
        tenantId: usuario.tenant_id,
        dois_fa:  usuario.dois_fa_ativo,
      },
    };
  }
}
