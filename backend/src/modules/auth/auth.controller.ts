import {
  Controller, Post, Get, Body, Req, HttpCode,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard }    from '@nestjs/passport';
import { AuthService }  from './auth.service';
import { LoginDto, Verify2FaDto } from './dto/auth.dto';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

  constructor(
    private authService:  AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login — Etapa 1: e-mail + senha' })
  @ApiResponse({ status: 200, description: 'Retorna tokens JWT ou solicita 2FA' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 403, description: 'Conta bloqueada ou empresa não verificada' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha, dto.tenantSlug);
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login — Etapa 2: verificação do código TOTP' })
  async verify2Fa(@Body() dto: Verify2FaDto) {
    return this.authService.verificar2Fa(dto.codigo, dto.tokenTemp);
  }

  // FIX #3 — separado em dois endpoints: iniciar (gera QR) e confirmar (valida + ativa)
  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gerar QR Code para configurar 2FA — passo 1' })
  async setup2Fa(@Req() req: any) {
    return this.authService.iniciar2Fa(req.user.userId, req.user.tenantId);
  }

  @Post('2fa/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar código TOTP e ativar 2FA — passo 2' })
  async confirm2Fa(@Req() req: any, @Body() body: { codigo: string }) {
    return this.authService.confirmar2Fa(req.user.userId, req.user.tenantId, body.codigo);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token com refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) throw new UnauthorizedException('Refresh token ausente.');
    return this.authService.refresh(body.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  async me(@Req() req: any) {
    const usuario = await this.usersService.findById(req.user.userId, req.user.tenantId);
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.');
    return usuario;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (token removido no frontend)' })
  logout() {
    return { mensagem: 'Logout realizado com sucesso.' };
  }

  // ── SSO OAuth2 (ERR-20 CORRIGIDO) — planos Pro e Enterprise ────────────────────
  // UC-11: fluxo completo documentado na Especificação Técnica v2.2

  @Get('sso/google')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth2 com Google (UC-11)' })
  @ApiResponse({ status: 302, description: 'Redireciona para página de login do Google' })
  iniciarSsoGoogle() {
    // TODO: implementar redirect para Google OAuth2
    // URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=.../auth/sso/callback&scope=email profile
    return { mensagem: 'SSO Google: endpoint reservado. Implementáciaón pendente (UC-11).' };
  }

  @Get('sso/microsoft')
  @ApiOperation({ summary: 'Iniciar fluxo OAuth2 com Microsoft (UC-11)' })
  @ApiResponse({ status: 302, description: 'Redireciona para login da Microsoft' })
  iniciarSsoMicrosoft() {
    // TODO: implementar redirect para Microsoft OAuth2
    // URL: https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...&scope=openid email profile
    return { mensagem: 'SSO Microsoft: endpoint reservado. Implementação pendente (UC-11).' };
  }

  @Get('sso/callback')
  @ApiOperation({ summary: 'Callback OAuth2 unificado para Google e Microsoft (UC-11)' })
  @ApiResponse({ status: 200, description: 'Retorna JWT após autenticação SSO bem-sucedida' })
  @ApiResponse({ status: 401, description: 'State inválido (possível CSRF) ou token rejeitado' })
  async callbackSso(
    @Req() req: any,
    @Body() body: { code?: string; state?: string; provider?: 'google' | 'microsoft' },
  ) {
    // TODO: implementar:
    // 1. Validar state (proteção CSRF — RN-SSO03)
    // 2. Trocar code pelo access_token no provedor
    // 3. Obter email + nome do usuário
    // 4a. E-mail existe no tenant → login do usuário existente
    // 4b. E-mail novo → criar usuário com perfil 'consulta' + avisar Admin
    // 5. Emitir JWT e retornar tokens
    return { mensagem: 'SSO Callback: endpoint reservado. Implementação pendente (UC-11).' };
  }
}
