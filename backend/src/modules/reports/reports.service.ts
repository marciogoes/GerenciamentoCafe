import { Injectable, Logger }    from '@nestjs/common';
import { InjectDataSource }       from '@nestjs/typeorm';
import { DataSource }             from 'typeorm';
import * as ExcelJS               from 'exceljs';

@Injectable()
export class ReportsService {

  private readonly logger = new Logger(ReportsService.name);

  constructor(@InjectDataSource() private ds: DataSource) {}

  // ══════════════════════════════════════════════════════════════
  //  RF-R01 — RELATÓRIO FINANCEIRO MENSAL
  // ══════════════════════════════════════════════════════════════

  async relatorioFinanceiro(tenantId: string, dataInicio: string, dataFim: string) {
    // Receita por mês
    const receitaQuery = `
      SELECT
        DATE_FORMAT(lm.competencia, '%Y-%m')  AS mes,
        DATE_FORMAT(lm.competencia, '%m/%Y')  AS mes_label,
        COALESCE(SUM(lm.valor), 0)                                          AS faturado,
        COALESCE(SUM(CASE WHEN lm.situacao='pago' THEN lm.valor_pago END),0) AS recebido,
        COALESCE(SUM(CASE WHEN lm.situacao IN ('pendente','vencido') AND lm.data_vencimento < CURDATE() THEN lm.valor END),0) AS inadimplente,
        COUNT(DISTINCT lm.contrato_id)         AS qtd_contratos,
        COUNT(lm.id)                           AS qtd_lancamentos,
        SUM(lm.situacao='pago')                AS pagos,
        SUM(lm.situacao IN ('pendente','vencido')) AS abertos
      FROM lancamento_mensal lm
      WHERE lm.tenant_id = ?
        AND lm.competencia BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(lm.competencia, '%Y-%m')
      ORDER BY mes ASC
    `;

    // Ticket médio e top clientes
    const topClientesQuery = `
      SELECT
        cl.razao_social,
        COUNT(DISTINCT co.id) AS contratos,
        COALESCE(SUM(CASE WHEN lm.situacao='pago' THEN lm.valor_pago END),0) AS receita_total,
        COALESCE(SUM(CASE WHEN lm.situacao IN ('pendente','vencido') AND lm.data_vencimento < CURDATE() THEN lm.valor END),0) AS em_aberto
      FROM lancamento_mensal lm
      JOIN contrato co ON co.id = lm.contrato_id
      JOIN cliente cl  ON cl.id = co.cliente_id
      WHERE lm.tenant_id = ?
        AND lm.competencia BETWEEN ? AND ?
      GROUP BY cl.id, cl.razao_social
      ORDER BY receita_total DESC
      LIMIT 10
    `;

    const [linhasMensais, topClientes] = await Promise.all([
      this.ds.query(receitaQuery, [tenantId, dataInicio, dataFim]),
      this.ds.query(topClientesQuery, [tenantId, dataInicio, dataFim]),
    ]);

    const totais = linhasMensais.reduce((acc: any, r: any) => ({
      faturado:      acc.faturado    + Number(r.faturado),
      recebido:      acc.recebido    + Number(r.recebido),
      inadimplente:  acc.inadimplente + Number(r.inadimplente),
      qtd_lancamentos: acc.qtd_lancamentos + Number(r.qtd_lancamentos),
    }), { faturado: 0, recebido: 0, inadimplente: 0, qtd_lancamentos: 0 });

    const ticketMedio = totais.qtd_lancamentos > 0
      ? totais.recebido / totais.qtd_lancamentos : 0;

    return {
      periodo:      { data_inicio: dataInicio, data_fim: dataFim },
      totais:       { ...totais, ticket_medio: ticketMedio },
      por_mes:      linhasMensais.map((r: any) => ({
        mes:         r.mes,
        mes_label:   r.mes_label,
        faturado:    Number(r.faturado),
        recebido:    Number(r.recebido),
        inadimplente: Number(r.inadimplente),
        qtd_contratos: Number(r.qtd_contratos),
        qtd_lancamentos: Number(r.qtd_lancamentos),
        pagos:       Number(r.pagos),
        abertos:     Number(r.abertos),
      })),
      top_clientes: topClientes.map((r: any) => ({
        razao_social:  r.razao_social,
        contratos:     Number(r.contratos),
        receita_total: Number(r.receita_total),
        em_aberto:     Number(r.em_aberto),
      })),
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  RF-R02 — RELATÓRIO DE CONTRATOS
  // ══════════════════════════════════════════════════════════════

  async relatorioContratos(tenantId: string) {
    const query = `
      SELECT
        co.id, co.tipo, co.situacao, co.valor_mensal,
        co.data_inicio, co.data_fim, co.dia_vencimento,
        co.indice_reajuste, co.ultimo_reajuste_em,
        cl.razao_social AS cliente_nome,
        cl.segmento,
        m.patrimonio,
        DATEDIFF(co.data_fim, CURDATE()) AS dias_para_vencer
      FROM contrato co
      JOIN cliente cl ON cl.id = co.cliente_id
      LEFT JOIN maquina m ON m.id = co.maquina_id
      WHERE co.tenant_id = ?
      ORDER BY co.situacao ASC, co.data_inicio DESC
    `;

    const rows = await this.ds.query(query, [tenantId]);
    const hoje = new Date().toISOString().split('T')[0];

    const itens = rows.map((r: any) => ({
      id:               r.id,
      tipo:             r.tipo,
      situacao:         r.situacao,
      valor_mensal:     Number(r.valor_mensal),
      data_inicio:      r.data_inicio,
      data_fim:         r.data_fim,
      dias_para_vencer: r.data_fim ? Number(r.dias_para_vencer) : null,
      a_vencer_30dias:  r.data_fim && Number(r.dias_para_vencer) >= 0 && Number(r.dias_para_vencer) <= 30,
      cliente_nome:     r.cliente_nome,
      segmento:         r.segmento,
      patrimonio:       r.patrimonio,
      indice_reajuste:  r.indice_reajuste,
      ultimo_reajuste_em: r.ultimo_reajuste_em,
    }));

    return {
      total:       itens.length,
      ativos:      itens.filter((i: any) => i.situacao === 'ativo').length,
      inativos:    itens.filter((i: any) => i.situacao === 'encerrado').length,
      suspensos:   itens.filter((i: any) => i.situacao === 'suspenso').length,
      a_vencer_30: itens.filter((i: any) => i.a_vencer_30dias).length,
      valor_carteira: itens
        .filter((i: any) => i.situacao === 'ativo')
        .reduce((s: number, i: any) => s + i.valor_mensal, 0),
      itens,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  RF-R04 — RELATÓRIO DE MOVIMENTAÇÃO DE MÁQUINAS
  // ══════════════════════════════════════════════════════════════

  async relatorioMaquinas(tenantId: string, dataInicio: string, dataFim: string) {
    const query = `
      SELECT
        mm.id,
        mm.data_saida, mm.hora_saida,
        mm.data_retorno, mm.hora_retorno,
        mm.periodo_dias,
        mm.local, mm.contrato_id, mm.os_referencia, mm.ocorrencia,
        m.patrimonio,
        mc.nome AS modelo,
        COALESCE(cl.razao_social, mm.local) AS destino,
        u.nome AS responsavel
      FROM movimentacao_maquina mm
      JOIN maquina m         ON m.id  = mm.maquina_id
      LEFT JOIN modelo_catalogo mc ON mc.id = m.modelo_id
      LEFT JOIN cliente cl   ON cl.id  = mm.cliente_id
      LEFT JOIN usuario u    ON u.id   = mm.responsavel_id
      WHERE mm.tenant_id = ?
        AND mm.data_saida BETWEEN ? AND ?
      ORDER BY mm.data_saida DESC
    `;

    const rows = await this.ds.query(query, [tenantId, dataInicio, dataFim]);

    const itens = rows.map((r: any) => ({
      id:           r.id,
      patrimonio:   r.patrimonio,
      modelo:       r.modelo,
      destino:      r.destino,
      data_saida:   r.data_saida,
      data_retorno: r.data_retorno,
      periodo_dias: r.data_retorno ? Number(r.periodo_dias) : null,
      sem_retorno:  !r.data_retorno,
      dias_fora:    !r.data_retorno
        ? Math.round((Date.now() - new Date(r.data_saida).getTime()) / 86400000)
        : Number(r.periodo_dias),
      // ERR-11 CORRIGIDO: contrato_os dividido em contrato_id + os_referencia
      contrato_id:   r.contrato_id   ?? null,
      os_referencia: r.os_referencia ?? null,
      responsavel:  r.responsavel,
      ocorrencia:   r.ocorrencia,
    }));

    const rowsDistintas = await this.ds.query(
      `SELECT COUNT(DISTINCT maquina_id) AS total FROM movimentacao_maquina WHERE tenant_id=? AND data_saida BETWEEN ? AND ?`,
      [tenantId, dataInicio, dataFim],
    );

    return {
      periodo:       { data_inicio: dataInicio, data_fim: dataFim },
      total_saidas:  itens.length,
      sem_retorno:   itens.filter((i: any) => i.sem_retorno).length,
      media_periodo: itens.filter((i: any) => i.periodo_dias !== null).length > 0
        ? (itens.filter((i: any) => i.periodo_dias !== null)
            .reduce((s: number, i: any) => s + i.dias_fora, 0)
           / itens.filter((i: any) => i.periodo_dias !== null).length).toFixed(1)
        : 0,
      maquinas_distintas: Number(rowsDistintas[0]?.total ?? 0),
      itens,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  EXPORTAÇÃO EXCEL (RF-R05)
  // ══════════════════════════════════════════════════════════════

  async exportarFinanceiroExcel(tenantId: string, dataInicio: string, dataFim: string): Promise<Buffer> {
    const dados = await this.relatorioFinanceiro(tenantId, dataInicio, dataFim);

    const wb  = new ExcelJS.Workbook();
    wb.creator = 'Vending Manager';
    wb.created = new Date();

    // ── Aba 1: Resumo Mensal ────────────────────────────────────
    const ws = wb.addWorksheet('Receita Mensal');
    ws.getRow(1).font = { bold: true, size: 13 };
    ws.getCell('A1').value = 'RELATÓRIO FINANCEIRO — VENDING MANAGER';
    ws.getCell('A2').value = `Período: ${dataInicio} a ${dataFim}`;
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };

    ws.addRow([]);

    const headerRow = ws.addRow(['Mês', 'Faturado', 'Recebido', 'Inadimplente', 'Contratos', 'Lançamentos', 'Pagos', 'Em Aberto']);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };

    for (const row of dados.por_mes) {
      ws.addRow([
        row.mes_label,
        row.faturado, row.recebido, row.inadimplente,
        row.qtd_contratos, row.qtd_lancamentos, row.pagos, row.abertos,
      ]);
    }

    // Totais
    const totalRow = ws.addRow([
      'TOTAL',
      dados.totais.faturado, dados.totais.recebido, dados.totais.inadimplente,
      '', dados.totais.qtd_lancamentos, '', '',
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

    // Formata colunas monetárias
    [2, 3, 4].forEach(col => {
      ws.getColumn(col).numFmt = 'R$ #,##0.00';
      ws.getColumn(col).width  = 16;
    });
    ws.getColumn(1).width = 12;

    // ── Aba 2: Top Clientes ─────────────────────────────────────
    const ws2 = wb.addWorksheet('Top Clientes');
    ws2.addRow(['Cliente', 'Contratos', 'Receita Total', 'Em Aberto']).font = { bold: true };
    for (const c of dados.top_clientes) {
      ws2.addRow([c.razao_social, c.contratos, c.receita_total, c.em_aberto]);
    }
    ws2.getColumn(1).width = 40;
    ws2.getColumn(3).numFmt = 'R$ #,##0.00';
    ws2.getColumn(4).numFmt = 'R$ #,##0.00';

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportarContratosExcel(tenantId: string): Promise<Buffer> {
    const dados = await this.relatorioContratos(tenantId);
    const wb  = new ExcelJS.Workbook();
    const ws  = wb.addWorksheet('Contratos');

    const hr = ws.addRow([
      'Cliente', 'Tipo', 'Situação', 'Valor Mensal',
      'Início', 'Fim', 'Dias p/ Vencer', 'Máquina', 'Índice Reajuste',
    ]);
    hr.font = { bold: true };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };

    for (const i of dados.itens) {
      const row = ws.addRow([
        i.cliente_nome, i.tipo, i.situacao,
        i.valor_mensal,
        i.data_inicio, i.data_fim ?? '—', i.dias_para_vencer ?? '—',
        i.patrimonio ?? '—', i.indice_reajuste ?? '—',
      ]);
      if (i.a_vencer_30dias) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
      }
    }

    ws.getColumn(1).width = 40;
    ws.getColumn(4).numFmt = 'R$ #,##0.00';
    ws.getColumn(4).width  = 16;

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportarMaquinasExcel(tenantId: string, dataInicio: string, dataFim: string): Promise<Buffer> {
    const dados = await this.relatorioMaquinas(tenantId, dataInicio, dataFim);
    const wb  = new ExcelJS.Workbook();
    const ws  = wb.addWorksheet('Movimentações de Máquinas');

    const hr = ws.addRow([
      'Patrimônio', 'Modelo', 'Destino', 'Data Saída', 'Data Retorno',
      'Dias Fora', 'Sem Retorno', 'Contrato ID', 'OS Referência', 'Responsável',
    ]);
    hr.font = { bold: true };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE7F3' } };

    for (const i of dados.itens) {
      const row = ws.addRow([
        i.patrimonio, i.modelo, i.destino,
        i.data_saida, i.data_retorno ?? '—',
        i.dias_fora, i.sem_retorno ? 'SIM' : 'não',
        // ERR-11: contrato_os → contrato_id + os_referencia
        i.contrato_id   ?? '—',
        i.os_referencia ?? '—',
        i.responsavel   ?? '—',
      ]);
      if (i.sem_retorno) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
      }
    }

    [1, 2, 3].forEach(c => ws.getColumn(c).width = 28);
    [4, 5].forEach(c => ws.getColumn(c).width = 14);

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportarEstoqueExcel(tenantId: string): Promise<Buffer> {
    // Chama a mesma query do StockService
    const query = `
      SELECT
        p.codigo, p.descricao, p.marca, p.categoria, p.unidade,
        p.valor_unitario, p.estoque_minimo, p.validade,
        COALESCE(SUM(CASE WHEN m.tipo='entrada' THEN m.quantidade ELSE 0 END),0)
        - COALESCE(SUM(CASE WHEN m.tipo='saida'  THEN m.quantidade ELSE 0 END),0) AS saldo_atual
      FROM produto p
      LEFT JOIN movimentacao_estoque m ON m.produto_id=p.id AND m.tenant_id=p.tenant_id
      WHERE p.tenant_id=? AND p.ativo=1
      GROUP BY p.id, p.codigo, p.descricao, p.marca, p.categoria, p.unidade, p.valor_unitario, p.estoque_minimo, p.validade
      ORDER BY p.categoria, p.descricao
    `;
    const rows = await this.ds.query(query, [tenantId]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Estoque');
    const hr = ws.addRow([
      'Código', 'Produto', 'Marca', 'Categoria', 'Unidade',
      'Saldo Atual', 'Estoque Mín.', 'Valor Unit.', 'Valor em Estoque', 'Validade', 'Situação',
    ]);
    hr.font = { bold: true };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    for (const r of rows) {
      const saldo = Number(r.saldo_atual);
      const min   = r.estoque_minimo ? Number(r.estoque_minimo) : null;
      const sit   = saldo <= 0 ? 'Zerado' : (min && saldo <= min) ? 'Baixo' : 'Normal';
      const row = ws.addRow([
        r.codigo, r.descricao, r.marca ?? '—', r.categoria,
        r.unidade, saldo, min ?? '—',
        Number(r.valor_unitario),
        saldo * Number(r.valor_unitario),
        r.validade ?? '—',
        sit,
      ]);
      if (sit === 'Zerado')  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      else if (sit === 'Baixo') row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
    }

    ws.getColumn(2).width = 36;
    ws.getColumn(8).numFmt  = 'R$ #,##0.0000';
    ws.getColumn(9).numFmt  = 'R$ #,##0.00';

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
