import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService }   from './users.service';
import { InviteUserDto }  from './dto/invite-user.dto';
import { UpdateUserDto }  from './dto/update-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard, RolesGuard, Roles, PERFIS } from '../../common/guards/auth.guards';
import { TenantsService } from '../tenants/tenants.service';
import { MailService }    from '../mail/mail.service';
import { AuditService }   from '../audit/audit.service';

@Controller('users')
export class UsersController {

  constructor(
    private readonly usersService:   UsersService,
    private readonly tenantsService: TenantsService,
    private readonly mailService:    MailService,
    private readonly auditService:   AuditService,
  ) {}

  // ── Listar usuários do tenant ────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  async listar(@Req() req: any) {
    return this.usersService.listar(req.user.tenantId);
  }

  // ── Convidar usuário (UC-08) ─────────────────────────────────
  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async convidar(@Req() req: any, @Body() dto: InviteUserDto) {
    const tenant = await this.tenantsService.buscarPorId(req.user.tenantId);
    if (!tenant) throw new Error('Tenant não encontrado.');

    const { usuario, token } = await this.usersService.convidar(
      req.user.tenantId,
      dto.email,
      dto.perfil,
      tenant.plano,
    );

    // Envia e-mail de convite
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/aceitar-convite?token=${token}`;
    await this.mailService.enviarConvite(dto.email, req.user.nome || 'Administrador', tenant.razao_social, link);

    await this.auditService.registrar({
      tenantId:    req.user.tenantId,
      usuarioId:   req.user.userId,
      usuarioNome: req.user.nome,
      acao:        'USUARIO_CONVIDADO',
      modulo:      'users',
      entidadeId:  usuario.id,
      descricao:   `Convite enviado para ${dto.email} com perfil ${dto.perfil}`,
      ip:          req.ip,
    });

    return {
      mensagem: `Convite enviado para ${dto.email}. O link expira em 48 horas.`,
      usuarioId: usuario.id,
    };
  }

  // ── Aceitar convite (rota pública) ───────────────────────────
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  async aceitarConvite(@Body() dto: AcceptInviteDto) {
    const usuario = await this.usersService.aceitarConvite(dto.token, dto.nome, dto.senha);

    await this.auditService.registrar({
      tenantId:    usuario.tenant_id,
      usuarioId:   usuario.id,
      usuarioNome: usuario.nome,
      acao:        'CONVITE_ACEITO',
      modulo:      'users',
      entidadeId:  usuario.id,
      descricao:   `${usuario.email} aceitou o convite e criou sua conta.`,
    });

    return { mensagem: 'Conta criada com sucesso! Faça login para continuar.' };
  }

  // ── Reenviar convite ─────────────────────────────────────────
  @Post(':id/resend-invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  async reenviarConvite(@Req() req: any, @Param('id') id: string) {
    const { usuario, token } = await this.usersService.reenviarConvite(req.user.tenantId, id);
    const tenant = await this.tenantsService.buscarPorId(req.user.tenantId);

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/aceitar-convite?token=${token}`;
    await this.mailService.enviarConvite(usuario.email, req.user.nome || 'Administrador', tenant?.razao_social || '', link);

    await this.auditService.registrar({
      tenantId:    req.user.tenantId,
      usuarioId:   req.user.userId,
      usuarioNome: req.user.nome,
      acao:        'CONVITE_REENVIADO',
      modulo:      'users',
      entidadeId:  id,
      descricao:   `Convite reenviado para ${usuario.email}`,
      ip:          req.ip,
    });

    return { mensagem: `Convite reenviado para ${usuario.email}.` };
  }

  // ── Atualizar perfil / nome ──────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  async atualizar(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    const anterior = await this.usersService.findById(id, req.user.tenantId);
    const usuario  = await this.usersService.atualizar(req.user.tenantId, id, dto);

    const mudancas: string[] = [];
    if (dto.perfil && dto.perfil !== anterior?.perfil)
      mudancas.push(`perfil: ${anterior?.perfil} → ${dto.perfil}`);
    if (dto.nome && dto.nome !== anterior?.nome)
      mudancas.push(`nome alterado`);

    if (mudancas.length) {
      await this.auditService.registrar({
        tenantId:    req.user.tenantId,
        usuarioId:   req.user.userId,
        usuarioNome: req.user.nome,
        acao:        'USUARIO_ATUALIZADO',
        modulo:      'users',
        entidadeId:  id,
        descricao:   mudancas.join('; '),
        ip:          req.ip,
      });
    }

    return usuario;
  }

  // ── Ativar/Desativar usuário ─────────────────────────────────
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  async toggle(@Req() req: any, @Param('id') id: string, @Body('ativo') ativo: boolean) {
    // Impede que admin se desative
    if (id === req.user.userId && !ativo) {
      return { mensagem: 'Você não pode desativar sua própria conta.' };
    }

    const result = await this.usersService.toggleAtivo(req.user.tenantId, id, ativo);

    await this.auditService.registrar({
      tenantId:    req.user.tenantId,
      usuarioId:   req.user.userId,
      usuarioNome: req.user.nome,
      acao:        ativo ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
      modulo:      'users',
      entidadeId:  id,
      descricao:   result.mensagem,
      ip:          req.ip,
    });

    return result;
  }
}
