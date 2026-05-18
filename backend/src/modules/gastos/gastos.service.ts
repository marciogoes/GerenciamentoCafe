import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { v4 as uuidv4 }    from 'uuid';
import { Gasto }            from './entities/gasto.entity';
import {
  CriarGastoDto, AtualizarGastoDto, PagarGastoDto, FiltrosGastoDto,
} from './dto/gastos.dto';

@Injectable()
export class GastosService {
  constructor(
    @InjectRepository(Gasto)
    private gastoRepo: Repository<Gasto>,
  ) {}

  // ── Listar gastos ─────────────────────────────────────────────
  async listar(tenantId: string, filtros: FiltrosGastoDto) {
    const qb = this.gastoRepo
      .createQueryBuilder('g')
      .where('g.tenant_id = :tenantId', { tenantId });

    if (filtros.categoria)  qb.andWhere('g.categoria = :cat', { cat: filtros.categoria });
    if (filtros.situacao)   qb.andWhere('g.situacao = :sit',  { sit: filtros.situacao });
    if (filtros.competencia) {
      const comp = filtros.competencia.slice(0, 7) + '-01';
      qb.andWhere('g.competencia = :comp', { comp });
    }
    if (filtros.data_inicio) qb.andWhere('g.data_vencimento >= :di', { di: filtros.data_inicio });
    if (filtros.data_fim)    qb.andWhere('g.data_vencimento <= :df', { df: filtros.data_fim });
    if (filtros.busca) {
      qb.andWhere(
        '(g.descricao LIKE :b OR g.fornecedor LIKE :b)',
        { b: `%${filtros.busca}%` },
      );
    }

    return qb.orderBy('g.data_vencimento', 'ASC').addOrderBy('g.descricao', 'ASC').getMany();
  }

  // ── Buscar por ID ─────────────────────────────────────────────
  async buscar(tenantId: string, id: string): Promise<Gasto> {
    const g = await this.gastoRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!g) throw new NotFoundException('Gasto não encontrado.');
    return g;
  }

  // ── Criar gasto ───────────────────────────────────────────────
  async criar(tenantId: string, dto: CriarGastoDto, usuarioId: string): Promise<Gasto> {
    const comp = dto.competencia.slice(0, 7) + '-01';
    const g = this.gastoRepo.create({
      id:              uuidv4(),
      tenant_id:       tenantId,
      categoria:       dto.categoria as any,
      descricao:       dto.descricao,
      fornecedor:      dto.fornecedor      ?? null,
      valor:           dto.valor,
      competencia:     comp,
      data_vencimento: dto.data_vencimento ?? null,
      data_pagamento:  dto.data_pagamento  ?? null,
      situacao:        (dto.situacao as any) ?? 'pendente',
      nota_fiscal:     dto.nota_fiscal     ?? null,
      observacao:      dto.observacao      ?? null,
      recorrente:      dto.recorrente      ?? false,
      usuario_id:      usuarioId,
    });
    return this.gastoRepo.save(g);
  }

  // ── Atualizar gasto ───────────────────────────────────────────
  async atualizar(tenantId: string, id: string, dto: AtualizarGastoDto): Promise<Gasto> {
    const g = await this.buscar(tenantId, id);
    if (g.situacao === 'cancelado') {
      throw new BadRequestException('Gasto cancelado não pode ser editado.');
    }
    if (dto.competencia) dto.competencia = dto.competencia.slice(0, 7) + '-01';
    Object.assign(g, dto);
    return this.gastoRepo.save(g);
  }

  // ── Registrar pagamento ───────────────────────────────────────
  async pagar(tenantId: string, id: string, dto: PagarGastoDto): Promise<Gasto> {
    const g = await this.buscar(tenantId, id);
    if (g.situacao === 'pago') throw new BadRequestException('Gasto já está pago.');
    if (g.situacao === 'cancelado') throw new BadRequestException('Gasto cancelado não pode ser pago.');

    g.data_pagamento = dto.data_pagamento;
    g.situacao       = 'pago';
    if (dto.observacao) g.observacao = dto.observacao;
    return this.gastoRepo.save(g);
  }

  // ── Cancelar gasto ────────────────────────────────────────────
  async cancelar(tenantId: string, id: string): Promise<Gasto> {
    const g = await this.buscar(tenantId, id);
    if (g.situacao === 'pago') throw new BadRequestException('Gasto já pago não pode ser cancelado.');
    g.situacao = 'cancelado';
    return this.gastoRepo.save(g);
  }

  // ── Excluir gasto ─────────────────────────────────────────────
  async excluir(tenantId: string, id: string): Promise<void> {
    const g = await this.buscar(tenantId, id);
    await this.gastoRepo.remove(g);
  }

  // ── KPIs para dashboard ───────────────────────────────────────
  async kpiMes(tenantId: string, competencia?: string) {
    const comp = competencia
      ? competencia.slice(0, 7) + '-01'
      : new Date().toISOString().slice(0, 7) + '-01';

    const rows = await this.gastoRepo
      .createQueryBuilder('g')
      .select([
        'g.categoria                                          AS categoria',
        'SUM(g.valor)                                         AS total',
        'SUM(CASE WHEN g.situacao = "pago" THEN g.valor ELSE 0 END)    AS pago',
        'SUM(CASE WHEN g.situacao = "pendente" THEN g.valor ELSE 0 END) AS pendente',
        'COUNT(g.id)                                          AS qtd',
      ])
      .where('g.tenant_id = :tenantId', { tenantId })
      .andWhere('g.competencia = :comp', { comp })
      .andWhere('g.situacao != :sit', { sit: 'cancelado' })
      .groupBy('g.categoria')
      .getRawMany();

    const total_geral  = rows.reduce((s, r) => s + Number(r.total),    0);
    const total_pago   = rows.reduce((s, r) => s + Number(r.pago),     0);
    const total_pendente = rows.reduce((s, r) => s + Number(r.pendente), 0);

    return {
      competencia: comp,
      total_geral,
      total_pago,
      total_pendente,
      por_categoria: rows.map(r => ({
        categoria: r.categoria,
        total:     Number(r.total),
        pago:      Number(r.pago),
        pendente:  Number(r.pendente),
        qtd:       Number(r.qtd),
      })),
    };
  }

  // ── Evolução mensal de gastos (últimos N meses) ───────────────
  async evolucaoMensal(tenantId: string, meses = 6) {
    const rows = await this.gastoRepo
      .createQueryBuilder('g')
      .select([
        "DATE_FORMAT(g.competencia, '%Y-%m') AS mes",
        "DATE_FORMAT(g.competencia, '%b/%y') AS mes_label",
        'SUM(g.valor) AS total',
        'SUM(CASE WHEN g.situacao = "pago" THEN g.valor ELSE 0 END) AS pago',
      ])
      .where('g.tenant_id = :tenantId', { tenantId })
      .andWhere('g.situacao != :sit', { sit: 'cancelado' })
      .andWhere('g.competencia >= DATE_SUB(CURDATE(), INTERVAL :meses MONTH)', { meses })
      .groupBy("DATE_FORMAT(g.competencia, '%Y-%m')")
      .orderBy("DATE_FORMAT(g.competencia, '%Y-%m')", 'ASC')
      .getRawMany();

    return rows.map(r => ({
      mes:       r.mes,
      mes_label: r.mes_label,
      total:     Number(r.total),
      pago:      Number(r.pago),
    }));
  }

  // ── Gastos pendentes próximos ao vencimento ───────────────────
  async vencendoEm(tenantId: string, dias = 7) {
    const hoje = new Date();
    const limite = new Date(hoje.getTime() + dias * 86400000)
      .toISOString().split('T')[0];
    const hojeStr = hoje.toISOString().split('T')[0];

    return this.gastoRepo
      .createQueryBuilder('g')
      .where('g.tenant_id = :tenantId', { tenantId })
      .andWhere("g.situacao = 'pendente'")
      .andWhere('g.data_vencimento BETWEEN :hoje AND :limite', { hoje: hojeStr, limite })
      .orderBy('g.data_vencimento', 'ASC')
      .getMany();
  }

  // ── Duplicar gastos recorrentes para próximo mês ──────────────
  async duplicarRecorrentes(tenantId: string, competenciaAlvo: string, usuarioId: string) {
    const compAlvo = competenciaAlvo.slice(0, 7) + '-01';

    // Mês anterior
    const [ano, mes] = compAlvo.split('-').map(Number);
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anoAnt = mes === 1 ? ano - 1 : ano;
    const compAnt = `${anoAnt}-${String(mesAnt).padStart(2, '0')}-01`;

    // Busca recorrentes do mês anterior
    const recorrentes = await this.gastoRepo.find({
      where: { tenant_id: tenantId, competencia: compAnt, recorrente: true as any },
    });

    if (recorrentes.length === 0) return { duplicados: 0 };

    // Verifica quais já existem no mês alvo (por descricao + categoria)
    const existentes = await this.gastoRepo.find({
      where: { tenant_id: tenantId, competencia: compAlvo },
      select: ['descricao', 'categoria'],
    });
    const chaveExistentes = new Set(existentes.map(e => `${e.categoria}|${e.descricao}`));

    const novos: Gasto[] = [];
    for (const r of recorrentes) {
      const chave = `${r.categoria}|${r.descricao}`;
      if (chaveExistentes.has(chave)) continue;

      // Recalcula vencimento no mês alvo (mantém o mesmo dia)
      const diaVenc = r.data_vencimento ? Number(r.data_vencimento.split('-')[2]) : null;
      let novoVenc: string | null = null;
      if (diaVenc) {
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const dia = Math.min(diaVenc, ultimoDia);
        novoVenc = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      }

      novos.push(this.gastoRepo.create({
        id:              uuidv4(),
        tenant_id:       tenantId,
        categoria:       r.categoria,
        descricao:       r.descricao,
        fornecedor:      r.fornecedor,
        valor:           r.valor,
        competencia:     compAlvo,
        data_vencimento: novoVenc,
        data_pagamento:  null,
        situacao:        'pendente',
        nota_fiscal:     null,
        observacao:      null,
        recorrente:      true,
        usuario_id:      usuarioId,
      }));
    }

    await this.gastoRepo.save(novos);
    return { duplicados: novos.length, competencia: compAlvo };
  }
}
