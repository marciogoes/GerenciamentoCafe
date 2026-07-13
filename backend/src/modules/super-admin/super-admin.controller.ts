import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, HttpCode,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, PERFIS } from '../../common/guards/auth.guards';
import { SuperAdminService }  from './super-admin.service';
import { AssinaturasService } from '../tenants/assinaturas.service';
import {
  AlterarStatusTenantDto,
  AlterarPlanoTenantDto,
  AlterarTrialTenantDto,
  AplicarDescontoDto,
  ImpersonateDto,
  FiltrosTenantDto,
  CriarAssinaturaDto,
  GerarCobrancaDto,
  RegistrarPagamentoAssinaturaDto,
} from './dto/super-admin.dto';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PERFIS.SUPER_ADMIN)
@ApiBearerAuth()
export class SuperAdminController {

  constructor(
    private readonly svc:         SuperAdminService,
    private readonly assinaturas: AssinaturasService,
  ) {}

  // ── Dashboard global ──────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: '[Super Admin] Dashboard com métricas globais do SaaS' })
  @ApiResponse({ status: 200, description: 'Métricas globais + crescimento + recentes' })
  dashboard() {
    return this.svc.dashboard();
  }

  // ── Assinaturas do SaaS — ERR-24 (cobrança manual) ────────────

  @Get('assinaturas/em-aberto')
  @ApiOperation({ summary: '[Super Admin] Cobranças vencidas e não pagas (todos os tenants)' })
  cobrancasEmAberto() {
    return this.assinaturas.emAberto();
  }

  @Post('assinaturas/atualizar-inadimplencia')
  @HttpCode(200)
  @ApiOperation({ summary: '[Super Admin] Reavalia inadimplência (também roda no cron diário)' })
  atualizarInadimplencia() {
    return this.assinaturas.atualizarInadimplencia();
  }

  @Get('tenants/:id/assinatura')
  @ApiOperation({ summary: '[Super Admin] Assinatura e histórico de cobranças do tenant' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  resumoAssinatura(@Param('id') id: string) {
    return this.assinaturas.resumo(id);
  }

  @Post('tenants/:id/assinatura')
  @ApiOperation({ summary: '[Super Admin] Criar assinatura do tenant (gateway manual)' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  criarAssinatura(@Param('id') id: string, @Body() dto: CriarAssinaturaDto) {
    return this.assinaturas.criar(id, dto);
  }

  @Post('tenants/:id/assinatura/cobrancas')
  @ApiOperation({ summary: '[Super Admin] Gerar cobrança do mês (idempotente)' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  gerarCobranca(@Param('id') id: string, @Body() dto: GerarCobrancaDto) {
    return this.assinaturas.gerarCobranca(id, dto.competencia);
  }

  @Patch('assinaturas/cobrancas/:cobrancaId/pagar')
  @ApiOperation({ summary: '[Super Admin] Dar baixa no pagamento de uma cobrança' })
  @ApiParam({ name: 'cobrancaId', description: 'UUID da cobrança' })
  pagarCobranca(
    @Param('cobrancaId') cobrancaId: string,
    @Body() dto: RegistrarPagamentoAssinaturaDto,
    @CurrentUser() user: any,
  ) {
    return this.assinaturas.registrarPagamento(cobrancaId, dto, user?.userId);
  }

  @Patch('tenants/:id/assinatura/cancelar')
  @ApiOperation({ summary: '[Super Admin] Cancelar assinatura do tenant' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  cancelarAssinatura(@Param('id') id: string) {
    return this.assinaturas.cancelar(id);
  }

  // ── Planos ────────────────────────────────────────────────────

  @Get('planos')
  @ApiOperation({ summary: '[Super Admin] Visão geral dos planos e MRR por plano' })
  listarPlanos() {
    return this.svc.listarPlanos();
  }

  // ── Logs globais ──────────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: '[Super Admin] Últimas ações administrativas' })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo de registros (padrão: 50)' })
  logs(@Query('limite') limite?: number) {
    return this.svc.logsGlobais(limite ? Number(limite) : 50);
  }

  // ── Modo Suporte Assistido (Impersonate) ──────────────────────

  @Post('impersonate/:tenantId')
  @HttpCode(200)
  @ApiOperation({
    summary: '[Super Admin] Iniciar modo de suporte assistido (impersonate)',
    description:
      'Gera um token JWT de 2h que autentica o super admin como o admin do tenant-alvo. ' +
      'Toda a sessão é registrada em log_atividade. ' +
      'Use o token retornado como Bearer nas chamadas de suporte.',
  })
  @ApiParam({ name: 'tenantId', description: 'UUID do tenant a acessar em modo suporte' })
  @ApiResponse({ status: 200, description: 'Token de suporte gerado com sucesso' })
  impersonate(
    @Param('tenantId') tenantId: string,
    @Body() dto: ImpersonateDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.impersonate(tenantId, user.userId, user.email, dto.motivo);
  }

  @Get('impersonations')
  @ApiOperation({ summary: '[Super Admin] Histórico de sessões de suporte assistido' })
  @ApiQuery({ name: 'limite', required: false })
  historicoImpersonations(@Query('limite') limite?: number) {
    return this.svc.historicoImpersonations(limite ? Number(limite) : 50);
  }

  // ── Tenants: listagem ─────────────────────────────────────────

  @Get('tenants')
  @ApiOperation({ summary: '[Super Admin] Listar todos os tenants com filtros' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'plano',  required: false })
  @ApiQuery({ name: 'busca',  required: false })
  listarTenants(@Query() filtros: FiltrosTenantDto) {
    return this.svc.listarTenants(filtros);
  }

  // ── Tenants: detalhe ──────────────────────────────────────────

  @Get('tenants/:id')
  @ApiOperation({ summary: '[Super Admin] Ficha completa do tenant com métricas' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  detalharTenant(@Param('id') id: string) {
    return this.svc.detalharTenant(id);
  }

  // ── Tenants: alterar status ───────────────────────────────────

  @Patch('tenants/:id/status')
  @HttpCode(200)
  @ApiOperation({ summary: '[Super Admin] Ativar, suspender ou cancelar tenant' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  alterarStatus(
    @Param('id') id: string,
    @Body() dto: AlterarStatusTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.alterarStatus(id, dto.status, user.userId);
  }

  // ── Tenants: alterar plano ────────────────────────────────────

  @Patch('tenants/:id/plano')
  @HttpCode(200)
  @ApiOperation({ summary: '[Super Admin] Mudar plano do tenant (upgrade/downgrade)' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  alterarPlano(
    @Param('id') id: string,
    @Body() dto: AlterarPlanoTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.alterarPlano(id, dto.plano, user.userId);
  }

  // ── Tenants: estender trial ───────────────────────────────────

  @Patch('tenants/:id/trial')
  @HttpCode(200)
  @ApiOperation({ summary: '[Super Admin] Estender período de trial do tenant' })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  estenderTrial(
    @Param('id') id: string,
    @Body() dto: AlterarTrialTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.estenderTrial(id, dto.trial_ate, user.userId);
  }

  // ── Tenants: aplicar desconto ─────────────────────────────────

  @Post('tenants/:id/desconto')
  @HttpCode(200)
  @ApiOperation({
    summary: '[Super Admin] Aplicar desconto comercial ao tenant',
    description: 'Persiste o percentual de desconto e a data de expiração no tenant. Registra log de auditoria.',
  })
  @ApiParam({ name: 'id', description: 'UUID do tenant' })
  @ApiResponse({ status: 200, description: 'Desconto aplicado com sucesso' })
  aplicarDesconto(
    @Param('id') id: string,
    @Body() dto: AplicarDescontoDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.aplicarDesconto(id, dto.percentual, dto.expira_em, dto.motivo, user.userId);
  }
}
