import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource }             from 'typeorm';
import { v4 as uuidv4 }                       from 'uuid';

import { Manutencao } from './entities/manutencao.entity';
import {
  CriarManutencaoDto, AtualizarManutencaoDto,
  FiltrosManutencaoDto, ConcluirManutencaoDto,
} from './dto/manutencao.dto';

@Injectable()
export class ManutencaoService {

  constructor(
    @InjectRepository(Manutencao)
    private repo: Repository<Manutencao>,

    @InjectDataSource()
    private ds: DataSource,
  ) {}

  // ── Listar ──────────────────────────────────────────────────
  async listar(tenantId: string, filtros: FiltrosManutencaoDto) {
    const qb = this.repo
      .createQueryBuilder('mn')
      .leftJoin('maquina', 'mq', 'mq.id = mn.maquina_id AND mq.tenant_id = mn.tenant_id')
      .addSelect(['mq.patrimonio', 'mq.situacao'])
      .where('mn.tenant_id = :tenantId', { tenantId });

    if (filtros.maquina_id) qb.andWhere('mn.maquina_id = :mid',  { mid: filtros.maquina_id });
    if (filtros.situacao)   qb.andWhere('mn.situacao = :sit',    { sit: filtros.situacao });
    if (filtros.tipo)       qb.andWhere('mn.tipo = :tipo',       { tipo: filtros.tipo });
    if (filtros.prioridade) qb.andWhere('mn.prioridade = :pri',  { pri: filtros.prioridade });
    if (filtros.data_inicio) qb.andWhere('mn.data_abertura >= :di', { di: filtros.data_inicio });
    if (filtros.data_fim)    qb.andWhere('mn.data_abertura <= :df', { df: filtros.data_fim });

    qb.orderBy('mn.data_abertura', 'DESC').addOrderBy('mn.prioridade', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      id:              r.mn_id,
      tenant_id:       r.mn_tenant_id,
      maquina_id:      r.mn_maquina_id,
      maquina_patrimonio: r.mq_patrimonio,
      maquina_situacao:   r.mq_situacao,
      titulo:          r.mn_titulo,
      descricao:       r.mn_descricao,
      tipo:            r.mn_tipo,
      situacao:        r.mn_situacao,
      prioridade:      r.mn_prioridade,
      data_abertura:   r.mn_data_abertura,
      data_inicio:     r.mn_data_inicio,
      data_conclusao:  r.mn_data_conclusao,
      tecnico:         r.mn_tecnico,
      fornecedor:      r.mn_fornecedor,
      custo_pecas:     Number(r.mn_custo_pecas   ?? 0),
      custo_mao_obra:  Number(r.mn_custo_mao_obra ?? 0),
      custo_total:     Number(r.mn_custo_pecas ?? 0) + Number(r.mn_custo_mao_obra ?? 0),
      nota_fiscal:     r.mn_nota_fiscal,
      observacao:      r.mn_observacao,
      usuario_id:      r.mn_usuario_id,
      criado_em:       r.mn_criado_em,
    }));
  }

  // ── Buscar ──────────────────────────────────────────────────
  async buscar(tenantId: string, id: string) {
    const m = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!m) throw new NotFoundException('Manutenção não encontrada.');

    // Dados enriquecidos com máquina
    const maquinaRow = await this.ds.query(
      'SELECT patrimonio, modelo_id, situacao, localizacao_atual FROM maquina WHERE id = ? AND tenant_id = ? LIMIT 1',
      [m.maquina_id, tenantId],
    );
    const maquina = maquinaRow[0] ?? null;

    return {
      ...m,
      custo_total:        Number(m.custo_pecas) + Number(m.custo_mao_obra),
      maquina_patrimonio: maquina?.patrimonio ?? null,
      maquina_situacao:   maquina?.situacao   ?? null,
    };
  }

  // ── KPIs ────────────────────────────────────────────────────
  async kpis(tenantId: string) {
    const [totais] = await this.ds.query(`
      SELECT
        COUNT(*) AS total,
        SUM(situacao = 'aberta')       AS abertas,
        SUM(situacao = 'em_andamento') AS em_andamento,
        SUM(situacao = 'concluida')    AS concluidas,
        SUM(situacao = 'cancelada')    AS canceladas,
        COALESCE(SUM(custo_pecas + custo_mao_obra), 0) AS custo_total,
        COALESCE(SUM(CASE WHEN situacao = 'concluida' THEN custo_pecas + custo_mao_obra END), 0) AS custo_concluidas,
        COUNT(DISTINCT maquina_id)     AS maquinas_envolvidas
      FROM manutencao
      WHERE tenant_id = ?
    `, [tenantId]);

    const porTipo = await this.ds.query(`
      SELECT tipo, COUNT(*) AS qtd,
             COALESCE(SUM(custo_pecas + custo_mao_obra),0) AS custo
      FROM manutencao
      WHERE tenant_id = ? AND situacao != 'cancelada'
      GROUP BY tipo
    `, [tenantId]);

    // Chamados por mês (últimos 6)
    const evolucao = await this.ds.query(`
      SELECT
        DATE_FORMAT(data_abertura, '%Y-%m')  AS mes,
        DATE_FORMAT(data_abertura, '%m/%Y')  AS mes_label,
        COUNT(*) AS chamados,
        COALESCE(SUM(custo_pecas + custo_mao_obra),0) AS custo
      FROM manutencao
      WHERE tenant_id = ?
        AND data_abertura >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(data_abertura,'%Y-%m')
      ORDER BY mes ASC
    `, [tenantId]);

    return {
      total:              Number(totais.total),
      abertas:            Number(totais.abertas),
      em_andamento:       Number(totais.em_andamento),
      concluidas:         Number(totais.concluidas),
      canceladas:         Number(totais.canceladas),
      custo_total:        Number(totais.custo_total),
      custo_concluidas:   Number(totais.custo_concluidas),
      maquinas_envolvidas: Number(totais.maquinas_envolvidas),
      por_tipo:           porTipo.map((r: any) => ({
        tipo:  r.tipo,
        qtd:   Number(r.qtd),
        custo: Number(r.custo),
      })),
      evolucao_mensal:    evolucao.map((r: any) => ({
        mes:       r.mes,
        mes_label: r.mes_label,
        chamados:  Number(r.chamados),
        custo:     Number(r.custo),
      })),
    };
  }

  // ── Criar ────────────────────────────────────────────────────
  async criar(tenantId: string, dto: CriarManutencaoDto, usuarioId: string): Promise<Manutencao> {
    // Verifica se máquina pertence ao tenant
    const maq = await this.ds.query(
      'SELECT id, situacao FROM maquina WHERE id = ? AND tenant_id = ? LIMIT 1',
      [dto.maquina_id, tenantId],
    );
    if (!maq.length) throw new NotFoundException('Máquina não encontrada.');

    const m = this.repo.create({
      id:            uuidv4(),
      tenant_id:     tenantId,
      maquina_id:    dto.maquina_id,
      titulo:        dto.titulo,
      descricao:     dto.descricao ?? null,
      tipo:          (dto.tipo ?? 'corretiva') as any,
      situacao:      'aberta',
      prioridade:    (dto.prioridade ?? 'media') as any,
      data_abertura: dto.data_abertura,
      data_inicio:   dto.data_inicio ?? null,
      data_conclusao: dto.data_conclusao ?? null,
      tecnico:       dto.tecnico     ?? null,
      fornecedor:    dto.fornecedor  ?? null,
      custo_pecas:   dto.custo_pecas    ?? 0,
      custo_mao_obra: dto.custo_mao_obra ?? 0,
      nota_fiscal:   dto.nota_fiscal ?? null,
      observacao:    dto.observacao  ?? null,
      usuario_id:    usuarioId,
    });

    const saved = await this.repo.save(m);

    // Atualiza situação da máquina para 'manutencao' se estava 'apta'
    if (maq[0].situacao === 'apta') {
      await this.ds.query(
        "UPDATE maquina SET situacao = 'manutencao', atualizado_em = NOW() WHERE id = ? AND tenant_id = ?",
        [dto.maquina_id, tenantId],
      );
    }

    return saved;
  }

  // ── Atualizar ────────────────────────────────────────────────
  async atualizar(tenantId: string, id: string, dto: AtualizarManutencaoDto): Promise<Manutencao> {
    const m = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!m) throw new NotFoundException('Manutenção não encontrada.');
    if (m.situacao === 'concluida' || m.situacao === 'cancelada') {
      throw new BadRequestException('Manutenção concluída ou cancelada não pode ser editada.');
    }
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  // ── Concluir ─────────────────────────────────────────────────
  async concluir(tenantId: string, id: string, dto: ConcluirManutencaoDto) {
    const m = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!m) throw new NotFoundException('Manutenção não encontrada.');
    if (m.situacao === 'cancelada') {
      throw new BadRequestException('Manutenção cancelada não pode ser concluída.');
    }

    // RN: data de conclusão não pode ser anterior à data de abertura
    if (dto.data_conclusao < m.data_abertura) {
      throw new BadRequestException('Data de conclusão não pode ser anterior à data de abertura.');
    }

    m.situacao        = 'concluida';
    m.data_conclusao  = dto.data_conclusao;
    if (dto.custo_pecas    !== undefined) m.custo_pecas    = dto.custo_pecas;
    if (dto.custo_mao_obra !== undefined) m.custo_mao_obra = dto.custo_mao_obra;
    if (dto.nota_fiscal)   m.nota_fiscal = dto.nota_fiscal;
    if (dto.observacao)    m.observacao  = dto.observacao;

    await this.repo.save(m);

    // Devolve máquina para 'apta' se ainda estiver em manutenção
    await this.ds.query(
      "UPDATE maquina SET situacao = 'apta', atualizado_em = NOW() WHERE id = ? AND tenant_id = ? AND situacao = 'manutencao'",
      [m.maquina_id, tenantId],
    );

    return this.buscar(tenantId, id);
  }

  // ── Cancelar ─────────────────────────────────────────────────
  async cancelar(tenantId: string, id: string) {
    const m = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!m) throw new NotFoundException('Manutenção não encontrada.');
    if (m.situacao === 'concluida') {
      throw new BadRequestException('Manutenção concluída não pode ser cancelada.');
    }

    m.situacao = 'cancelada';
    await this.repo.save(m);

    // Devolve máquina para 'apta' se ainda estava em manutenção
    await this.ds.query(
      "UPDATE maquina SET situacao = 'apta', atualizado_em = NOW() WHERE id = ? AND tenant_id = ? AND situacao = 'manutencao'",
      [m.maquina_id, tenantId],
    );

    return { ok: true, message: 'Manutenção cancelada.' };
  }

  // ── Iniciar (aberta → em_andamento) ──────────────────────────
  async iniciar(tenantId: string, id: string, dataInicio: string) {
    const m = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!m) throw new NotFoundException('Manutenção não encontrada.');
    if (m.situacao !== 'aberta') {
      throw new BadRequestException('Só é possível iniciar manutenções com situação "aberta".');
    }
    m.situacao    = 'em_andamento';
    m.data_inicio = dataInicio;
    return this.repo.save(m);
  }
}
