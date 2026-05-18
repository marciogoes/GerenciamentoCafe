import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { v4 as uuidv4 }     from 'uuid';
import * as bcrypt          from 'bcrypt';
import { Usuario }          from './entities/usuario.entity';

// ── Limites por plano (espelha requisitos v2.0) ───────────────
const LIMITE_USUARIOS: Record<string, number> = {
  starter:    5,
  pro:        20,
  enterprise: Infinity,
};

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(Usuario)
    private repo: Repository<Usuario>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CONSULTA BÁSICA
  // ─────────────────────────────────────────────────────────────

  /**
   * BUG-11 FIX — busca por email SEM filtrar por ativo.
   * O auth.service.ts verifica explicitamente usuario.ativo
   * e retorna "Usuário desativado" em vez de "Credenciais inválidas".
   */
  async findByEmail(email: string, tenantId: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.senha_hash')
      .addSelect('u.dois_fa_secret')
      .where('u.email = :email AND u.tenant_id = :tenantId', { email, tenantId })
      .getOne();
  }

  async findById(id: string, tenantId: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id, tenant_id: tenantId, ativo: true } });
  }

  /** Busca por ID incluindo 2FA secret (para fluxo 2FA e confirmação). */
  async findByIdComSecret(id: string, tenantId: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.dois_fa_secret')
      .where('u.id = :id AND u.tenant_id = :tenantId', { id, tenantId })
      .getOne();
  }

  /** Busca por token de convite (rota pública - sem tenant_id). */
  async findByTokenConvite(token: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .where('u.token_convite = :token', { token })
      .getOne();
  }

  // ─────────────────────────────────────────────────────────────
  // LISTAGEM
  // ─────────────────────────────────────────────────────────────

  async listar(tenantId: string): Promise<Partial<Usuario>[]> {
    return this.repo.find({
      where:  { tenant_id: tenantId },
      order:  { nome: 'ASC' },
      select: [
        'id', 'nome', 'email', 'perfil', 'ativo',
        'dois_fa_ativo', 'ultimo_login', 'criado_em',
        'token_convite', 'token_expira_em',
      ],
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CRIAÇÃO DIRETA (admin cria com senha — uso interno / seed)
  // ─────────────────────────────────────────────────────────────

  async criar(tenantId: string, data: {
    nome: string; email: string; senha: string; perfil: string;
  }): Promise<Usuario> {
    const existe = await this.repo.findOne({ where: { email: data.email, tenant_id: tenantId } });
    if (existe) throw new ConflictException('E-mail já cadastrado neste tenant.');

    const hash = await bcrypt.hash(data.senha, 12);
    const usuario = this.repo.create({
      id:         uuidv4(),
      tenant_id:  tenantId,
      nome:       data.nome,
      email:      data.email,
      senha_hash: hash,
      perfil:     data.perfil as any,
    });
    return this.repo.save(usuario);
  }

  // ─────────────────────────────────────────────────────────────
  // CONVITE (UC-08)
  // ─────────────────────────────────────────────────────────────

  /**
   * Cria um usuário inativo com token de convite.
   * Retorna { usuario, token } para que o caller envie o e-mail.
   */
  async convidar(
    tenantId: string,
    email: string,
    perfil: string,
    planoTenant: string,
  ): Promise<{ usuario: Usuario; token: string }> {

    // RN-U03: verifica limite do plano
    const limite = LIMITE_USUARIOS[planoTenant] ?? 5;
    if (limite !== Infinity) {
      const atual = await this.repo.count({
        where: { tenant_id: tenantId, ativo: true },
      });
      if (atual >= limite) {
        throw new ForbiddenException(
          `Limite de ${limite} usuários atingido para o plano ${planoTenant}. Faça upgrade para adicionar mais.`,
        );
      }
    }

    // RN-U02: Admin não pode convidar super_admin
    if (perfil === 'super_admin') {
      throw new ForbiddenException('Não é permitido convidar usuários com perfil Super Admin.');
    }

    // Verifica unicidade de e-mail no tenant
    const existe = await this.repo.findOne({ where: { email, tenant_id: tenantId } });
    if (existe) {
      throw new ConflictException('Este e-mail já está cadastrado neste tenant.');
    }

    // RN-U01: token expira em 48h
    const token          = uuidv4();
    const expiracao      = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const usuario = this.repo.create({
      id:              uuidv4(),
      tenant_id:       tenantId,
      nome:            email.split('@')[0],  // nome provisório
      email,
      senha_hash:      '',            // sem senha até aceitar convite
      perfil:          perfil as any,
      ativo:           false,         // inativo até aceitar
      token_convite:   token,
      token_expira_em: expiracao,
    });

    await this.repo.save(usuario);
    return { usuario, token };
  }

  /**
   * Aceita o convite: define nome e senha, ativa o usuário.
   */
  async aceitarConvite(
    token: string,
    nome: string,
    senha: string,
  ): Promise<Usuario> {
    const usuario = await this.findByTokenConvite(token);

    if (!usuario) {
      throw new NotFoundException('Convite não encontrado ou já utilizado.');
    }

    if (usuario.ativo) {
      throw new BadRequestException('Este convite já foi aceito. Faça login normalmente.');
    }

    // RN-U01: verifica expiração de 48h
    if (usuario.token_expira_em && new Date() > new Date(usuario.token_expira_em)) {
      throw new BadRequestException(
        'Este convite expirou (validade: 48 horas). Solicite um novo convite ao administrador.',
      );
    }

    const hash = await bcrypt.hash(senha, 12);

    await this.repo.update(usuario.id, {
      nome,
      senha_hash:      hash,
      ativo:           true,
      token_convite:   null,
      token_expira_em: null,
    });

    return this.repo.findOne({ where: { id: usuario.id } });
  }

  /**
   * Reenvio de convite: gera novo token e atualiza expiração.
   */
  async reenviarConvite(
    tenantId: string,
    usuarioId: string,
  ): Promise<{ usuario: Usuario; token: string }> {
    const usuario = await this.repo.findOne({ where: { id: usuarioId, tenant_id: tenantId, ativo: false } });

    if (!usuario) {
      throw new NotFoundException('Usuário pendente não encontrado.');
    }

    const token     = uuidv4();
    const expiracao = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.repo.update(usuarioId, {
      token_convite:   token,
      token_expira_em: expiracao,
    });

    return { usuario, token };
  }

  // ─────────────────────────────────────────────────────────────
  // EDIÇÃO
  // ─────────────────────────────────────────────────────────────

  async atualizar(
    tenantId: string,
    usuarioId: string,
    data: { nome?: string; perfil?: string },
  ): Promise<Usuario> {
    const usuario = await this.repo.findOne({ where: { id: usuarioId, tenant_id: tenantId } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    if (data.perfil === 'super_admin') {
      throw new ForbiddenException('Perfil super_admin não pode ser atribuído via painel.');
    }

    const update: Partial<Usuario> = {};
    if (data.nome)   update.nome   = data.nome;
    if (data.perfil) update.perfil = data.perfil as any;

    await this.repo.update(usuarioId, update);
    return this.repo.findOne({ where: { id: usuarioId } });
  }

  /**
   * Ativa ou desativa um usuário.
   * RN-U05: usuário desativado não pode fazer login, histórico é preservado.
   */
  async toggleAtivo(tenantId: string, usuarioId: string, ativo: boolean): Promise<{ mensagem: string }> {
    const usuario = await this.repo.findOne({ where: { id: usuarioId, tenant_id: tenantId } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    if (usuario.perfil === 'super_admin') {
      throw new ForbiddenException('Não é possível desativar um Super Admin por este painel.');
    }

    await this.repo.update(usuarioId, { ativo });

    return {
      mensagem: ativo
        ? `Usuário ${usuario.nome} ativado com sucesso.`
        : `Usuário ${usuario.nome} desativado. Histórico de ações preservado.`,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CONTROLE DE AUTENTICAÇÃO (usados pelo AuthService)
  // ─────────────────────────────────────────────────────────────

  async atualizarLogin(id: string): Promise<void> {
    await this.repo.update(id, {
      ultimo_login:     new Date(),
      tentativas_login: 0,
      bloqueado_ate:    null,
    });
  }

  async registrarTentativaFalha(
    id: string,
    tentativas: number,
    maxTentativas: number,
    bloqueioMin: number,
  ): Promise<void> {
    const update: Partial<Usuario> = { tentativas_login: tentativas };
    if (tentativas >= maxTentativas) {
      update.bloqueado_ate = new Date(Date.now() + bloqueioMin * 60 * 1000);
    }
    await this.repo.update(id, update);
  }

  // ─────────────────────────────────────────────────────────────
  // 2FA
  // ─────────────────────────────────────────────────────────────

  async salvar2FaSecretPendente(id: string, secret: string): Promise<void> {
    await this.repo.update(id, { dois_fa_secret: secret });
  }

  async ativar2Fa(id: string): Promise<void> {
    await this.repo.update(id, { dois_fa_ativo: true });
  }

  async salvar2FaSecret(id: string, secret: string): Promise<void> {
    await this.repo.update(id, { dois_fa_secret: secret, dois_fa_ativo: true });
  }

  async desativar2Fa(id: string): Promise<void> {
    await this.repo.update(id, { dois_fa_secret: null, dois_fa_ativo: false });
  }
}
