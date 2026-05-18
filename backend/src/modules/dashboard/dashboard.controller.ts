import { Controller, Get, Query, UseGuards, Req, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard }       from '@nestjs/passport';
import { Response }        from 'express';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DashboardController {

  constructor(private service: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs principais do dashboard' })
  @ApiQuery({ name: 'periodo', required: false, example: 'mes' })
  getKpis(@Req() req: any, @Query('periodo') periodo: string) {
    return this.service.getKpis(req.user.tenantId, periodo || 'mes');
  }

  @Get('grafico-receita')
  @ApiOperation({ summary: 'Receita mensal dos últimos 12 meses' })
  getGraficoReceita(@Req() req: any) {
    return this.service.getGraficoReceita(req.user.tenantId);
  }

  @Get('grafico-maquinas')
  @ApiOperation({ summary: 'Máquinas alugadas vs disponíveis por mês' })
  getGraficoMaquinas(@Req() req: any) {
    return this.service.getGraficoMaquinas(req.user.tenantId);
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Alertas ativos do tenant' })
  getAlertas(@Req() req: any) {
    return this.service.getAlertas(req.user.tenantId);
  }

  @Get('distribuicao-maquinas')
  @ApiOperation({ summary: 'Distribuição de máquinas por situação' })
  getDistribuicao(@Req() req: any) {
    return this.service.getDistribuicaoMaquinas(req.user.tenantId);
  }

  @Get('inadimplencia')
  @ApiOperation({ summary: 'Detalhe de inadimplência por cliente' })
  getInadimplencia(@Req() req: any) {
    return this.service.getInadimplenciaDetalhe(req.user.tenantId);
  }

  @Get('top-clientes')
  @ApiOperation({ summary: 'Top 5 clientes por receita' })
  getTopClientes(@Req() req: any) {
    return this.service.getTopClientes(req.user.tenantId);
  }

  // ── Sprint 14 ─────────────────────────────────────────────────

  @Get('receita-por-tipo')
  @ApiOperation({ summary: 'Receita consolidada por tipo (locacao, doses, servico, insumos, evento)' })
  getReceitaPorTipo(@Req() req: any) {
    return this.service.getReceitaPorTipo(req.user.tenantId);
  }

  @Get('grafico-receita-por-tipo')
  @ApiOperation({ summary: 'Gráfico de receita por tipo nos últimos 6 meses (stacked bar)' })
  getGraficoReceitaPorTipo(@Req() req: any) {
    return this.service.getGraficoReceitaPorTipo(req.user.tenantId);
  }

  @Get('kpi-atividades')
  @ApiOperation({ summary: 'Resumo do checklist de atividades do mês corrente' })
  getKpiAtividades(@Req() req: any) {
    return this.service.getKpiAtividades(req.user.tenantId);
  }

  /**
   * GET /dashboard/snapshot
   * Consolida todos os dados para geração de PDF/snapshot no frontend.
   */
  @Get('snapshot')
  @ApiOperation({ summary: 'Snapshot completo para exportação PDF (RF-D07)' })
  @ApiQuery({ name: 'periodo', required: false, example: 'mes' })
  async getSnapshot(@Req() req: any, @Query('periodo') periodo: string) {
    const tenantId = req.user.tenantId;
    const p = periodo || 'mes';

    const [kpis, graficoReceita, graficoMaquinas, alertas, distribuicao, topClientes, inadimplencia] =
      await Promise.all([
        this.service.getKpis(tenantId, p),
        this.service.getGraficoReceita(tenantId),
        this.service.getGraficoMaquinas(tenantId),
        this.service.getAlertas(tenantId),
        this.service.getDistribuicaoMaquinas(tenantId),
        this.service.getTopClientes(tenantId),
        this.service.getInadimplenciaDetalhe(tenantId),
      ]);

    return {
      gerado_em:      new Date().toISOString(),
      periodo:        p,
      kpis,
      grafico_receita:   graficoReceita,
      grafico_maquinas:  graficoMaquinas,
      alertas,
      distribuicao,
      top_clientes:      topClientes,
      inadimplencia,
    };
  }
}
