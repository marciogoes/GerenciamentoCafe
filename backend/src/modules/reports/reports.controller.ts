import {
  Controller, Get, Post, Patch, Delete, Query, Res, Body, Param,
  UseGuards, Req, HttpCode,
} from '@nestjs/common';
import { Response }      from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser, PERFIS } from '../../common/guards/auth.guards';
import { ReportsService }          from './reports.service';
import { ReportSchedulerService }  from './report-scheduler.service';
import { CriarAgendamentoDto, AtualizarAgendamentoDto } from './dto/schedule.dto';

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fimMesAtual(): string {
  const d = new Date();
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return fim.toISOString().split('T')[0];
}
function anoInicio(): string {
  return `${new Date().getFullYear()}-01-01`;
}

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {

  constructor(
    private reports:   ReportsService,
    private scheduler: ReportSchedulerService,
  ) {}

  // ── GET /reports/financeiro ──────────────────────────────────────
  @Get('financeiro')
  @ApiOperation({ summary: 'Relatório financeiro mensal (RF-R01)' })
  relatorioFinanceiro(
    @Req() req: any,
    @Query('data_inicio') di = anoInicio(),
    @Query('data_fim')    df = fimMesAtual(),
  ) {
    return this.reports.relatorioFinanceiro(req.user.tenantId, di, df);
  }

  // ── GET /reports/financeiro/excel ────────────────────────────────
  @Get('financeiro/excel')
  @ApiOperation({ summary: 'Exportar relatório financeiro em Excel' })
  async exportarFinanceiroExcel(
    @Req() req: any,
    @Res() res: Response,
    @Query('data_inicio') di = anoInicio(),
    @Query('data_fim')    df = fimMesAtual(),
  ) {
    const buffer = await this.reports.exportarFinanceiroExcel(req.user.tenantId, di, df);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-financeiro-${di}-${df}.xlsx"`,
    });
    res.send(buffer);
  }

  // ── GET /reports/contratos ───────────────────────────────────────
  @Get('contratos')
  @ApiOperation({ summary: 'Relatório de contratos (RF-R02)' })
  relatorioContratos(@Req() req: any) {
    return this.reports.relatorioContratos(req.user.tenantId);
  }

  // ── GET /reports/contratos/excel ─────────────────────────────────
  @Get('contratos/excel')
  @ApiOperation({ summary: 'Exportar contratos em Excel' })
  async exportarContratosExcel(@Req() req: any, @Res() res: Response) {
    const buffer = await this.reports.exportarContratosExcel(req.user.tenantId);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="relatorio-contratos.xlsx"',
    });
    res.send(buffer);
  }

  // ── GET /reports/maquinas ────────────────────────────────────────
  @Get('maquinas')
  @ApiOperation({ summary: 'Relatório de movimentação de máquinas (RF-R04)' })
  relatorioMaquinas(
    @Req() req: any,
    @Query('data_inicio') di = anoInicio(),
    @Query('data_fim')    df = fimMesAtual(),
  ) {
    return this.reports.relatorioMaquinas(req.user.tenantId, di, df);
  }

  // ── GET /reports/maquinas/excel ──────────────────────────────────
  @Get('maquinas/excel')
  @ApiOperation({ summary: 'Exportar movimentações de máquinas em Excel' })
  async exportarMaquinasExcel(
    @Req() req: any,
    @Res() res: Response,
    @Query('data_inicio') di = anoInicio(),
    @Query('data_fim')    df = fimMesAtual(),
  ) {
    const buffer = await this.reports.exportarMaquinasExcel(req.user.tenantId, di, df);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-maquinas-${di}-${df}.xlsx"`,
    });
    res.send(buffer);
  }

  // ── GET /reports/estoque/excel ───────────────────────────────────
  @Get('estoque/excel')
  @ApiOperation({ summary: 'Exportar estoque em Excel (RF-R05)' })
  async exportarEstoqueExcel(@Req() req: any, @Res() res: Response) {
    const buffer = await this.reports.exportarEstoqueExcel(req.user.tenantId);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="relatorio-estoque.xlsx"',
    });
    res.send(buffer);
  }

  // ─────────────────────────────────────────────────────────────────
  //  AGENDAMENTOS DE RELATÓRIOS — RF-R06  (Sprint 17)
  //  GET/POST/PATCH/DELETE /reports/schedules
  // ─────────────────────────────────────────────────────────────────

  /** GET /reports/schedules — lista todos os agendamentos do tenant */
  @Get('schedules')
  @ApiOperation({ summary: 'Listar agendamentos de relatórios automáticos (RF-R06)' })
  listarAgendamentos(@TenantId() tenantId: string) {
    return this.scheduler.listar(tenantId);
  }

  /** GET /reports/schedules/:id — detalhe de um agendamento */
  @Get('schedules/:id')
  @ApiOperation({ summary: 'Detalhe de um agendamento' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  buscarAgendamento(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.scheduler.buscar(tenantId, id);
  }

  /** POST /reports/schedules — criar agendamento */
  @Post('schedules')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({
    summary: 'Criar agendamento de relatório automático (RF-R06)',
    description:
      'O relatório será gerado e enviado por e-mail (.xlsx) na frequência especificada. ' +
      'Máximo de 10 agendamentos ativos por tenant.',
  })
  criar(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CriarAgendamentoDto,
  ) {
    return this.scheduler.criar(tenantId, user.userId, dto);
  }

  /** PATCH /reports/schedules/:id — atualizar agendamento */
  @Patch('schedules/:id')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @HttpCode(200)
  @ApiOperation({ summary: 'Atualizar frequência, destinatários ou status do agendamento' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  atualizar(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarAgendamentoDto,
  ) {
    return this.scheduler.atualizar(tenantId, id, dto);
  }

  /** DELETE /reports/schedules/:id — remover agendamento */
  @Delete('schedules/:id')
  @Roles(PERFIS.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Remover agendamento de relatório' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  remover(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.scheduler.remover(tenantId, id);
  }

  /** POST /reports/schedules/:id/executar — disparo manual imediato */
  @Post('schedules/:id/executar')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Disparar relatório agendado manualmente (teste/debug)',
    description: 'Gera e envia o relatório imediatamente, sem aguardar o próximo ciclo do cron.',
  })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  executarManual(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.scheduler.executarManual(tenantId, id);
  }
}
