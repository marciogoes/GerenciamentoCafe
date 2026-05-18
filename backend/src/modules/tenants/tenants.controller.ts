import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, Req, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard }      from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { CadastroTenantDto, ConfigurarTenantDto, WizardPassoDto } from './dto/tenant.dto';
import { Roles, RolesGuard, PERFIS } from '../../common/guards/auth.guards';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {

  constructor(private tenantsService: TenantsService) {}

  // ── PÚBLICOS ──────────────────────────────────────────────────
  @Post('cadastro')
  @HttpCode(201)
  cadastrar(@Body() dto: CadastroTenantDto) {
    return this.tenantsService.cadastrar(dto);
  }

  @Get('verificar/:token')
  verificarEmail(@Param('token') token: string) {
    return this.tenantsService.verificarEmail(token);
  }

  @Post('reenviar-verificacao')
  @HttpCode(200)
  reenviar(@Body() body: { email: string }) {
    return this.tenantsService.reenviarVerificacao(body.email);
  }

  @Get('slug-disponivel')
  verificarSlug(@Query('slug') slug: string) {
    return this.tenantsService.verificarSlug(slug);
  }

  // ── ADMIN DO TENANT ───────────────────────────────────────────
  @Patch('configurar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.ADMIN)
  @ApiBearerAuth()
  configurar(@Req() req: any, @Body() dto: ConfigurarTenantDto) {
    return this.tenantsService.configurar(req.user.tenantId, dto);
  }

  @Get('meu')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  meuTenant(@Req() req: any) {
    return this.tenantsService.buscarPorId(req.user.tenantId);
  }

  @Patch('wizard')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  atualizarWizard(@Req() req: any, @Body() dto: WizardPassoDto) {
    return this.tenantsService.atualizarWizard(req.user.tenantId, dto);
  }

  /** Sprint 11 — Configurações operacionais do tenant */
  @Patch('configuracoes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza configurações operacionais do tenant (Admin)' })
  atualizarConfiguracoes(@Req() req: any, @Body() body: any) {
    return this.tenantsService.atualizarConfiguracoes(req.user.tenantId, body);
  }

  // ── SUPER ADMIN ───────────────────────────────────────────────
  @Get('metricas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Super Admin] Métricas globais do SaaS' })
  metricas() {
    return this.tenantsService.metricas();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Super Admin] Lista todos os tenants' })
  listarTodos() {
    return this.tenantsService.listarTodos();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  buscarPorId(@Param('id') id: string) {
    return this.tenantsService.buscarPorId(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Super Admin] Altera status de um tenant' })
  atualizarStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ativo' | 'suspenso' | 'cancelado' },
  ) {
    return this.tenantsService.atualizarStatus(id, body.status);
  }

  @Patch(':id/plano')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PERFIS.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Super Admin] Altera plano de um tenant' })
  atualizarPlano(
    @Param('id') id: string,
    @Body() body: { plano: 'starter' | 'pro' | 'enterprise' },
  ) {
    return this.tenantsService.atualizarPlano(id, body.plano);
  }
}
