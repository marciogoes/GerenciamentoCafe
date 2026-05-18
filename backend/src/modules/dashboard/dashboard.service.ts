import {
  Injectable, Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';

export type Periodo = 'semana' | 'mes' | 'trimestre' | 'ano' | string;

@Injectable()
export class DashboardService {

  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectDataSource()
    private ds: DataSource,
  ) {}

  // ── KPIs principais ───────────────────────────────────────────
  async getKpis(tenantId: string, periodo: Periodo = 'mes') {
    const { dataInicio, dataFim } = this.resolverPeriodo(periodo);

    const [
      maquinas,
      receita,
      inadimplencia,
      estoque,
      doses,
      contratos,
    ] = await Promise.all([
      this.kpiMaquinas(tenantId),
      this.kpiReceita(tenantId, dataInicio, dataFim),
      this.kpiInadimplencia(tenantId),
      this.kpiEstoque(tenantId),
      this.kpiDoses(tenantId, dataInicio, dataFim),
      this.kpiContratos(tenantId),
    ]);

    return {
      periodo: { dataInicio, dataFim, label: periodo },
      maquinas,
      receita,
      inadimplencia,
      estoque,
      doses,
      contratos,
    };
  }

  // ── Gráfico: receita + doses últimos 12 meses ─────────────────
  async getGraficoReceita(tenantId: string) {
    const query = `
      SELECT
        DATE_FORMAT(lm.competencia, '%Y-%m') AS mes,
        DATE_FORMAT(lm.competencia, '%b/%Y')  AS mes_label,
        COALESCE(SUM(CASE WHEN lm.situacao = 'pago' THEN lm.valor_pago ELSE 0 END), 0) AS receita,
        COALESCE(SUM(lm.valor), 0)             AS faturado,
        COUNT(DISTINCT lm.contrato_id)         AS qtd_contratos
      FROM lancamento_mensal lm
      WHERE lm.tenant_id = ?
        AND lm.competencia >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
        AND lm.competencia <= LAST_DAY(CURDATE())
      GROUP BY DATE_FORMAT(lm.competencia, '%Y-%m')
      ORDER BY mes ASC
    `;

    try {
      const rows = await this.ds.query(query, [tenantId]);
      return this.preencherMesesFaltantes(rows);
    } catch (err) {
      this.logger.warn(`getGraficoReceita: ${err.message} — retornando mock`);
      return this.mockGraficoReceita();
    }
  }

  // ── Gráfico: máquinas alugadas vs disponíveis por mês ─────────
  // Conta o estado real da frota: ao final de cada mês, quantas estavam em locação
  // (saída antes do fim do mês e retorno após o início do mês ou sem retorno)
  async getGraficoMaquinas(tenantId: string) {
    // Snapshot mensal: para cada mês, conta máquinas com saída aberta no período
    const query = `
      SELECT
        meses.mes,
        meses.mes_label,
        COUNT(DISTINCT CASE
          WHEN mm.data_saida <= meses.fim_mes
           AND (mm.data_retorno IS NULL OR mm.data_retorno > meses.ini_mes)
          THEN mm.maquina_id
        END) AS em_locacao
      FROM (
        SELECT
          DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.n MONTH), '%Y-%m') AS mes,
          DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.n MONTH), '%b/%Y') AS mes_label,
          DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.n MONTH), '%Y-%m-01') AS ini_mes,
          LAST_DAY(DATE_SUB(CURDATE(), INTERVAL seq.n MONTH)) AS fim_mes
        FROM (SELECT 11 n UNION SELECT 10 UNION SELECT 9 UNION SELECT 8
              UNION SELECT 7 UNION SELECT 6 UNION SELECT 5 UNION SELECT 4
              UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) seq
      ) meses
      LEFT JOIN movimentacao_maquina mm
        ON mm.tenant_id = ?
      GROUP BY meses.mes, meses.mes_label
      ORDER BY meses.mes ASC
    `;

    const totalQuery = `
      SELECT COUNT(*) AS total
      FROM maquina
      WHERE tenant_id = ? AND situacao != 'desativada'
    `;

    try {
      const [rows, totalRows] = await Promise.all([
        this.ds.query(query, [tenantId]),
        this.ds.query(totalQuery, [tenantId]),
      ]);
      const total = Number(totalRows[0]?.total ?? 0);
      return rows.map((r: any) => ({
        mes:       r.mes,
        mes_label: r.mes_label,
        em_locacao:  Number(r.em_locacao ?? 0),
        disponivel:  Math.max(0, total - Number(r.em_locacao ?? 0)),
      }));
    } catch (err) {
      this.logger.warn(`getGraficoMaquinas: ${err.message} — retornando mock`);
      return this.mockGraficoMaquinas();
    }
  }

  // ── Alertas ativos ────────────────────────────────────────────
  async getAlertas(tenantId: string) {
    const [boletosVencidos, estoqueBaixo, maquinasSemRetorno] = await Promise.all([
      this.alertasBoletosVencidos(tenantId),
      this.alertasEstoqueBaixo(tenantId),
      this.alertasMaquinasSemRetorno(tenantId),
    ]);

    return {
      total:              boletosVencidos.length + estoqueBaixo.length + maquinasSemRetorno.length,
      boletos_vencidos:   boletosVencidos,
      estoque_baixo:      estoqueBaixo,
      maquinas_sem_retorno: maquinasSemRetorno,
    };
  }

  // ── Distribuição de máquinas por situação ─────────────────────
  async getDistribuicaoMaquinas(tenantId: string) {
    const query = `
      SELECT situacao, COUNT(*) AS total
      FROM maquina
      WHERE tenant_id = ?
      GROUP BY situacao
    `;
    try {
      const rows = await this.ds.query(query, [tenantId]);
      return rows.map((r: any) => ({ situacao: r.situacao, total: Number(r.total) }));
    } catch {
      return [
        { situacao: 'apta',        total: 0 },
        { situacao: 'em_locacao',  total: 0 },
        { situacao: 'manutencao',  total: 0 },
        { situacao: 'evento',      total: 0 },
      ];
    }
  }

  // ── Inadimplência detalhada (aging) ───────────────────────────
  async getInadimplenciaDetalhe(tenantId: string) {
    const query = `
      SELECT
        c.razao_social AS cliente,
        SUM(lm.valor)  AS valor_aberto,
        DATEDIFF(CURDATE(), MIN(lm.data_vencimento)) AS maior_atraso,
        COUNT(*)       AS qtd_boletos
      FROM lancamento_mensal lm
      JOIN contrato co ON co.id = lm.contrato_id
      JOIN cliente c   ON c.id  = co.cliente_id
      WHERE lm.tenant_id = ?
        AND lm.situacao IN ('pendente', 'vencido')
        AND lm.data_vencimento < CURDATE()
      GROUP BY c.id, c.razao_social
      ORDER BY valor_aberto DESC
      LIMIT 10
    `;
    try {
      const rows = await this.ds.query(query, [tenantId]);
      return rows.map((r: any) => ({
        ...r,
        valor_aberto: Number(r.valor_aberto),
        maior_atraso: Number(r.maior_atraso),
        qtd_boletos:  Number(r.qtd_boletos),
      }));
    } catch {
      return [];
    }
  }

  // ── Receita por tipo (Sprint 14) ──────────────────────────────
  async getReceitaPorTipo(tenantId: string) {
    const query = `
      SELECT
        lm.tipo_receita,
        COALESCE(SUM(CASE WHEN lm.situacao = 'pago' THEN lm.valor_pago ELSE 0 END), 0) AS recebido,
        COALESCE(SUM(lm.valor), 0)  AS faturado,
        COUNT(*) AS qtd_lancamentos
      FROM lancamento_mensal lm
      WHERE lm.tenant_id = ?
        AND lm.competencia >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
        AND lm.competencia <= LAST_DAY(CURDATE())
      GROUP BY lm.tipo_receita
      ORDER BY recebido DESC
    `;
    try {
      const rows = await this.ds.query(query, [tenantId]);
      return rows.map((r: any) => ({
        tipo_receita:    r.tipo_receita,
        recebido:        Number(r.recebido),
        faturado:        Number(r.faturado),
        qtd_lancamentos: Number(r.qtd_lancamentos),
      }));
    } catch { return []; }
  }

  // ── Gráfico receita por tipo por mês (últimos 6 meses) ────────
  async getGraficoReceitaPorTipo(tenantId: string) {
    const query = `
      SELECT
        DATE_FORMAT(lm.competencia, '%Y-%m') AS mes,
        DATE_FORMAT(lm.competencia, '%b/%Y') AS mes_label,
        lm.tipo_receita,
        COALESCE(SUM(CASE WHEN lm.situacao = 'pago' THEN lm.valor_pago ELSE 0 END), 0) AS valor
      FROM lancamento_mensal lm
      WHERE lm.tenant_id = ?
        AND lm.competencia >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
      GROUP BY mes, lm.tipo_receita
      ORDER BY mes ASC
    `;
    try {
      const rows = await this.ds.query(query, [tenantId]);
      // Pivoteia para formato {mes, mes_label, locacao, doses, servico, insumos, evento}
      const tipos = ['locacao', 'doses', 'servico', 'insumos', 'evento'];
      const mapa = new Map<string, any>();
      for (const r of rows) {
        if (!mapa.has(r.mes)) {
          mapa.set(r.mes, { mes: r.mes, mes_label: r.mes_label, locacao: 0, doses: 0, servico: 0, insumos: 0, evento: 0 });
        }
        const item = mapa.get(r.mes);
        if (tipos.includes(r.tipo_receita)) item[r.tipo_receita] = Number(r.valor);
      }
      return Array.from(mapa.values());
    } catch { return []; }
  }

  // ── KPI de atividades mensais (Sprint 14) ─────────────────────
  async getKpiAtividades(tenantId: string) {
    const comp = new Date();
    const competencia = `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}-01`;
    const query = `
      SELECT
        COUNT(*) AS total,
        SUM(situacao = 'realizado')     AS realizadas,
        SUM(situacao = 'pendente')      AS pendentes,
        SUM(situacao = 'nao_aplicavel') AS nao_aplicavel
      FROM atividade_execucao
      WHERE tenant_id = ? AND competencia = ?
    `;
    try {
      const [r] = await this.ds.query(query, [tenantId, competencia]);
      return {
        total:          Number(r?.total         ?? 0),
        realizadas:     Number(r?.realizadas    ?? 0),
        pendentes:      Number(r?.pendentes     ?? 0),
        nao_aplicavel:  Number(r?.nao_aplicavel ?? 0),
        competencia,
      };
    } catch {
      return { total: 0, realizadas: 0, pendentes: 0, nao_aplicavel: 0, competencia };
    }
  }

  // ── Top 5 clientes por receita ─────────────────────────────────
  async getTopClientes(tenantId: string) {
    const query = `
      SELECT
        c.razao_social,
        SUM(lm.valor_pago) AS receita_total,
        COUNT(DISTINCT co.id) AS contratos
      FROM lancamento_mensal lm
      JOIN contrato co ON co.id = lm.contrato_id
      JOIN cliente c   ON c.id  = co.cliente_id
      WHERE lm.tenant_id = ?
        AND lm.situacao = 'pago'
        AND lm.competencia >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
      GROUP BY c.id, c.razao_social
      ORDER BY receita_total DESC
      LIMIT 5
    `;
    try {
      const rows = await this.ds.query(query, [tenantId]);
      return rows.map((r: any) => ({ ...r, receita_total: Number(r.receita_total) }));
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Helpers privados — KPIs individuais
  // ═══════════════════════════════════════════════════════════════

  private async kpiMaquinas(tenantId: string) {
    const q = `
      SELECT
        COUNT(*) AS total,
        SUM(situacao = 'apta')       AS aptas,
        SUM(situacao = 'em_locacao') AS em_locacao,
        SUM(situacao = 'manutencao') AS em_manutencao,
        SUM(situacao = 'evento')     AS em_evento
      FROM maquina
      WHERE tenant_id = ? AND situacao != 'desativada'
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId]);
      return {
        total:         Number(r.total || 0),
        aptas:         Number(r.aptas || 0),
        em_locacao:    Number(r.em_locacao || 0),
        em_manutencao: Number(r.em_manutencao || 0),
        em_evento:     Number(r.em_evento || 0),
      };
    } catch {
      return { total: 0, aptas: 0, em_locacao: 0, em_manutencao: 0, em_evento: 0 };
    }
  }

  private async kpiReceita(tenantId: string, dataInicio: string, dataFim: string) {
    const q = `
      SELECT
        COALESCE(SUM(CASE WHEN situacao = 'pago' THEN valor_pago ELSE 0 END), 0) AS recebido,
        COALESCE(SUM(valor), 0) AS faturado,
        COUNT(*) AS lancamentos
      FROM lancamento_mensal
      WHERE tenant_id = ?
        AND competencia BETWEEN ? AND ?
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId, dataInicio, dataFim]);
      return {
        recebido:    Number(r.recebido),
        faturado:    Number(r.faturado),
        lancamentos: Number(r.lancamentos),
        ticket_medio: r.lancamentos > 0
          ? Number(r.recebido) / Number(r.lancamentos)
          : 0,
      };
    } catch {
      return { recebido: 0, faturado: 0, lancamentos: 0, ticket_medio: 0 };
    }
  }

  private async kpiInadimplencia(tenantId: string) {
    const q = `
      SELECT
        COALESCE(SUM(valor), 0) AS valor_total,
        COUNT(*)                AS qtd_boletos
      FROM lancamento_mensal
      WHERE tenant_id = ?
        AND situacao IN ('pendente', 'vencido')
        AND data_vencimento < CURDATE()
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId]);
      return { valor_total: Number(r.valor_total), qtd_boletos: Number(r.qtd_boletos) };
    } catch {
      return { valor_total: 0, qtd_boletos: 0 };
    }
  }

  private async kpiEstoque(tenantId: string) {
    const q = `
      SELECT
        COUNT(*) AS total_produtos,
        SUM(saldo_atual * valor_unitario) AS valor_total,
        SUM(CASE WHEN saldo_atual <= estoque_minimo THEN 1 ELSE 0 END) AS produtos_alerta
      FROM (
        SELECT
          p.id,
          p.valor_unitario,
          p.estoque_minimo,
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'saida'  THEN m.quantidade ELSE 0 END), 0) AS saldo_atual
        FROM produto p
        LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id AND m.tenant_id = p.tenant_id
        WHERE p.tenant_id = ? AND p.ativo = 1
        GROUP BY p.id, p.valor_unitario, p.estoque_minimo
      ) saldos
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId]);
      return {
        total_produtos:  Number(r.total_produtos || 0),
        valor_total:     Number(r.valor_total || 0),
        produtos_alerta: Number(r.produtos_alerta || 0),
      };
    } catch {
      return { total_produtos: 0, valor_total: 0, produtos_alerta: 0 };
    }
  }

  private async kpiDoses(tenantId: string, dataInicio: string, dataFim: string) {
    const q = `
      SELECT COALESCE(SUM(me.quantidade), 0) AS total_doses
      FROM movimentacao_estoque me
      JOIN produto p ON p.id = me.produto_id
      WHERE me.tenant_id = ?
        AND me.tipo = 'saida'
        AND me.data BETWEEN ? AND ?
        AND p.categoria IN ('cafe_graos', 'cafe_leite', 'cappuccino', 'chocolate')
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId, dataInicio, dataFim]);
      return { total: Number(r.total_doses || 0) };
    } catch {
      return { total: 0 };
    }
  }

  private async kpiContratos(tenantId: string) {
    const q = `
      SELECT
        COUNT(*) AS total,
        SUM(situacao = 'ativo')    AS ativos,
        SUM(situacao = 'encerrado') AS encerrados,
        SUM(situacao = 'suspenso')  AS suspensos
      FROM contrato
      WHERE tenant_id = ?
    `;
    try {
      const [r] = await this.ds.query(q, [tenantId]);
      return {
        total:      Number(r.total || 0),
        ativos:     Number(r.ativos || 0),
        encerrados: Number(r.encerrados || 0),
        suspensos:  Number(r.suspensos || 0),
      };
    } catch {
      return { total: 0, ativos: 0, encerrados: 0, suspensos: 0 };
    }
  }

  // ─── Alertas individuais ──────────────────────────────────────

  private async alertasBoletosVencidos(tenantId: string) {
    const q = `
      SELECT
        lm.id, lm.data_vencimento, lm.valor,
        c.razao_social AS cliente,
        DATEDIFF(CURDATE(), lm.data_vencimento) AS dias_atraso
      FROM lancamento_mensal lm
      JOIN contrato co ON co.id = lm.contrato_id
      JOIN cliente c   ON c.id  = co.cliente_id
      WHERE lm.tenant_id = ?
        AND lm.situacao IN ('pendente', 'vencido')
        AND lm.data_vencimento < CURDATE()
      ORDER BY lm.data_vencimento ASC
      LIMIT 20
    `;
    try {
      return await this.ds.query(q, [tenantId]);
    } catch {
      return [];
    }
  }

  private async alertasEstoqueBaixo(tenantId: string) {
    const q = `
      SELECT
        p.id, p.descricao, p.categoria, p.unidade, p.estoque_minimo,
        (
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'saida'  THEN m.quantidade ELSE 0 END), 0)
        ) AS saldo_atual
      FROM produto p
      LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id AND m.tenant_id = p.tenant_id
      WHERE p.tenant_id = ? AND p.ativo = 1 AND p.estoque_minimo > 0
      GROUP BY p.id, p.descricao, p.categoria, p.unidade, p.estoque_minimo
      HAVING saldo_atual <= p.estoque_minimo
      ORDER BY saldo_atual ASC
      LIMIT 10
    `;
    try {
      return await this.ds.query(q, [tenantId]);
    } catch {
      return [];
    }
  }

  private async alertasMaquinasSemRetorno(tenantId: string) {
    const q = `
      SELECT
        mm.id, mm.data_saida,
        m.patrimonio, m.situacao,
        COALESCE(c.razao_social, mm.local) AS destino,
        DATEDIFF(CURDATE(), mm.data_saida) AS dias_fora
      FROM movimentacao_maquina mm
      JOIN maquina m  ON m.id = mm.maquina_id
      LEFT JOIN cliente c ON c.id = mm.cliente_id
      WHERE mm.tenant_id = ?
        AND mm.data_retorno IS NULL
        AND DATEDIFF(CURDATE(), mm.data_saida) > 30
      ORDER BY dias_fora DESC
      LIMIT 10
    `;
    try {
      return await this.ds.query(q, [tenantId]);
    } catch {
      return [];
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private resolverPeriodo(periodo: Periodo): { dataInicio: string; dataFim: string } {
    const hoje = new Date();
    const fmt  = (d: Date) => d.toISOString().split('T')[0];

    if (periodo === 'semana') {
      const ini = new Date(hoje); ini.setDate(hoje.getDate() - 6);
      return { dataInicio: fmt(ini), dataFim: fmt(hoje) };
    }
    if (periodo === 'mes') {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return { dataInicio: fmt(ini), dataFim: fmt(fim) };
    }
    if (periodo === 'trimestre') {
      const ini = new Date(hoje); ini.setMonth(hoje.getMonth() - 2); ini.setDate(1);
      return { dataInicio: fmt(ini), dataFim: fmt(hoje) };
    }
    if (periodo === 'ano') {
      const ini = new Date(hoje.getFullYear(), 0, 1);
      return { dataInicio: fmt(ini), dataFim: fmt(hoje) };
    }
    // Formato personalizado: "2026-01-01,2026-03-31"
    if (periodo.includes(',')) {
      const [ini, fim] = periodo.split(',');
      return { dataInicio: ini.trim(), dataFim: fim.trim() };
    }
    // Fallback: mês atual
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { dataInicio: fmt(ini), dataFim: fmt(fim) };
  }

  /** Garante 12 meses contínuos mesmo sem lançamentos em algum mês */
  private preencherMesesFaltantes(rows: any[]) {
    const meses: any[] = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const row = rows.find((r: any) => r.mes === mesKey);
      meses.push({
        mes:             mesKey,
        mes_label:       row?.mes_label ?? mesLabel,
        receita:         Number(row?.receita         ?? 0),
        faturado:        Number(row?.faturado        ?? 0),
        qtd_contratos:   Number(row?.qtd_contratos   ?? 0),
      });
    }
    return meses;
  }

  /** Dados simulados para testes quando tabelas ainda não existem */
  private mockGraficoReceita() {
    const base = [4200, 4800, 5100, 5500, 4900, 5700, 6200, 5900, 6500, 7100, 6800, 7400];
    const hoje = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      return {
        mes:           `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        mes_label:     d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receita:       base[i],
        faturado:      base[i] + Math.floor(base[i] * 0.12),
        qtd_contratos: Math.floor(base[i] / 400),
      };
    });
  }

  private mockGraficoMaquinas() {
    const hoje = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      const em_locacao = 8 + i;
      return {
        mes:       `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        mes_label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        em_locacao,
        disponivel: Math.max(0, 20 - em_locacao),
      };
    });
  }
}
