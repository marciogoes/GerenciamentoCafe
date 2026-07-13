import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 }    from 'uuid';

import { Produto }              from './entities/produto.entity';
import { MovimentacaoEstoque }  from './entities/movimentacao-estoque.entity';
import {
  CriarProdutoDto, AtualizarProdutoDto,
  EntradaEstoqueDto, SaidaEstoqueDto,
  FiltrosProdutoDto, FiltrosMovimentacaoDto,
} from './dto/stock.dto';

@Injectable()
export class StockService {

  constructor(
    @InjectRepository(Produto)
    private produtoRepo: Repository<Produto>,

    @InjectRepository(MovimentacaoEstoque)
    private movRepo: Repository<MovimentacaoEstoque>,

    private dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  PRODUTOS (RF-E01)
  // ══════════════════════════════════════════════════════════════

  async listarProdutos(tenantId: string, filtros: FiltrosProdutoDto) {
    const produtos = await this.produtosComSaldo(tenantId);

    return produtos.filter(p => {
      // ERR-14: filtra por categoria_id (novo) ou pelo nome (compat com o filtro antigo)
      if (filtros.categoria_id && p.categoria_id !== filtros.categoria_id) return false;
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (filtros.busca) {
        const b = filtros.busca.toLowerCase();
        if (!p.descricao.toLowerCase().includes(b) && !p.codigo.toLowerCase().includes(b)) return false;
      }
      if (filtros.situacao) {
        if (filtros.situacao === 'zerado' && p.saldo_atual > 0) return false;
        if (filtros.situacao === 'baixo'  && (p.saldo_atual <= 0 || !p.estoque_minimo || p.saldo_atual > p.estoque_minimo)) return false;
        if (filtros.situacao === 'normal' && p.estoque_minimo && p.saldo_atual <= p.estoque_minimo) return false;
      }
      return true;
    });
  }

  async buscarProduto(tenantId: string, id: string) {
    const produtos = await this.produtosComSaldo(tenantId, id);
    if (!produtos.length) throw new NotFoundException('Produto não encontrado.');
    return produtos[0];
  }

  async criarProduto(tenantId: string, dto: CriarProdutoDto, usuarioId: string): Promise<Produto> {
    // Código único por tenant
    const existe = await this.produtoRepo.findOne({
      where: { codigo: dto.codigo, tenant_id: tenantId },
    });
    if (existe) throw new ConflictException(`Código ${dto.codigo} já cadastrado neste tenant.`);

    const p = this.produtoRepo.create({
      id:              uuidv4(),
      tenant_id:       tenantId,
      codigo:          dto.codigo,
      descricao:       dto.descricao,
      marca:           dto.marca ?? null,
      // ERR-14: antes gravava sempre null aqui, entao categoria_id nunca era
      // preenchida e a tabela categoria_insumo ficava vazia para todo mundo.
      categoria_id:     dto.categoria_id ?? null,
      categoria_legado: dto.categoria ?? null,   // compatibilidade com o ENUM antigo
      unidade:         dto.unidade,
      valor_unitario:  dto.valor_unitario,
      validade:        dto.validade ?? null,
      estoque_minimo:  dto.estoque_minimo ?? null,
      ativo:           true,
    });
    return this.produtoRepo.save(p);
  }

  async atualizarProduto(tenantId: string, id: string, dto: AtualizarProdutoDto): Promise<Produto> {
    const p = await this.produtoRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    Object.assign(p, dto);
    return this.produtoRepo.save(p);
  }

  // ══════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÕES — ENTRADA (UC-06)
  // ══════════════════════════════════════════════════════════════

  async registrarEntrada(tenantId: string, dto: EntradaEstoqueDto, usuarioId: string) {
    // RN-E01: quantidade > 0 (validado pelo DTO com @IsPositive)
    const produto = await this.produtoRepo.findOne({
      where: { id: dto.produto_id, tenant_id: tenantId },
    });
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    if (!produto.ativo) throw new BadRequestException('Produto inativo. Reative-o antes de movimentar.');

    const mov = this.movRepo.create({
      id:          uuidv4(),
      tenant_id:   tenantId,
      produto_id:  dto.produto_id,
      data:        dto.data,
      tipo:        'entrada',
      quantidade:  dto.quantidade,
      origem:      dto.origem ?? null,
      nota_fiscal: dto.nota_fiscal ?? null,
      usuario_id:  usuarioId,
      observacao:  dto.observacao ?? null,
    });
    await this.movRepo.save(mov);

    // Retorna saldo atualizado
    const saldoNovo = await this.calcularSaldo(tenantId, dto.produto_id);
    return { movimentacao: mov, saldo_atual: saldoNovo, valor_em_estoque: saldoNovo * Number(produto.valor_unitario) };
  }

  // ══════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÕES — SAÍDA (UC-07)
  // ══════════════════════════════════════════════════════════════

  /**
   * BUG-10 FIX — registrarSaida usa transação com SELECT FOR UPDATE
   * para evitar race condition em requisições simultâneas.
   * Sem isso, duas saídas concorrentes podem verificar o mesmo saldo
   * e ambas passarem, resultando em saldo negativo.
   */
  async registrarSaida(tenantId: string, dto: SaidaEstoqueDto, usuarioId: string) {
    return this.dataSource.transaction(async (manager) => {
      // SELECT FOR UPDATE — bloqueia a linha do produto durante a transação
      const produto = await manager
        .createQueryBuilder(Produto, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id AND p.tenant_id = :tenantId', { id: dto.produto_id, tenantId })
        .getOne();

      if (!produto) throw new NotFoundException('Produto não encontrado.');
      if (!produto.ativo) throw new BadRequestException('Produto inativo.');

      // RN-E02: saldo calculado DENTRO da transação com lock
      const result = await manager
        .createQueryBuilder(MovimentacaoEstoque, 'm')
        .select(`
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'saida'  THEN m.quantidade ELSE 0 END), 0)
        `, 'saldo')
        .where('m.tenant_id = :tenantId', { tenantId })
        .andWhere('m.produto_id = :produtoId', { produtoId: dto.produto_id })
        .getRawOne();

      const saldoAtual = Number(result?.saldo ?? 0);

      if (dto.quantidade > saldoAtual) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponível: ${saldoAtual.toFixed(3)} ${produto.unidade}`,
        );
      }

      const mov = manager.create(MovimentacaoEstoque, {
        id:         uuidv4(),
        tenant_id:  tenantId,
        produto_id: dto.produto_id,
        data:       dto.data,
        tipo:       'saida',
        quantidade: dto.quantidade,
        origem:     dto.origem ?? null,
        usuario_id: usuarioId,
        observacao: dto.observacao ?? null,
      });
      await manager.save(mov);

      const saldoNovo       = saldoAtual - dto.quantidade;
      const alertaEstoque   = produto.estoque_minimo != null && saldoNovo <= Number(produto.estoque_minimo);

      return {
        movimentacao:     mov,
        saldo_anterior:   saldoAtual,
        saldo_atual:      saldoNovo,
        valor_em_estoque: saldoNovo * Number(produto.valor_unitario),
        alerta_estoque:   alertaEstoque,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  HISTÓRICO DE MOVIMENTAÇÕES (RF-E08)
  // ══════════════════════════════════════════════════════════════

  async listarMovimentacoes(tenantId: string, filtros: FiltrosMovimentacaoDto) {
    const qb = this.movRepo
      .createQueryBuilder('m')
      .innerJoin('produto', 'p', 'p.id = m.produto_id AND p.tenant_id = m.tenant_id')
      .addSelect(['p.descricao', 'p.codigo', 'p.unidade', 'p.categoria', 'p.categoria_legado'])
      .where('m.tenant_id = :tenantId', { tenantId });

    if (filtros.produto_id) qb.andWhere('m.produto_id = :pid',  { pid: filtros.produto_id });
    if (filtros.tipo)        qb.andWhere('m.tipo = :tipo',       { tipo: filtros.tipo });
    if (filtros.data_inicio) qb.andWhere('m.data >= :di',        { di: filtros.data_inicio });
    if (filtros.data_fim)    qb.andWhere('m.data <= :df',        { df: filtros.data_fim });

    qb.orderBy('m.data', 'DESC').addOrderBy('m.criado_em', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      id:           r.m_id,
      tenant_id:    r.m_tenant_id,
      produto_id:   r.m_produto_id,
      produto_desc: r.p_descricao,
      produto_cod:  r.p_codigo,
      unidade:      r.p_unidade,
      categoria:    r.p_categoria_legado ?? r.p_categoria,
      data:         r.m_data,
      tipo:         r.m_tipo,
      quantidade:   Number(r.m_quantidade),
      origem:       r.m_origem,
      nota_fiscal:  r.m_nota_fiscal,
      usuario_id:   r.m_usuario_id,
      observacao:   r.m_observacao,
      criado_em:    r.m_criado_em,
    }));
  }

  // ══════════════════════════════════════════════════════════════
  //  RELATÓRIO CONSOLIDADO (RF-E06)
  // ══════════════════════════════════════════════════════════════

  async relatorioEstoque(tenantId: string, dataInicio?: string, dataFim?: string) {
    const produtos = await this.produtosComSaldo(tenantId);

    // Movimentações do período para calcular entradas/saídas no período
    const qb = this.movRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId });

    if (dataInicio) qb.andWhere('m.data >= :di', { di: dataInicio });
    if (dataFim)    qb.andWhere('m.data <= :df', { df: dataFim });

    const movs = await qb.getMany();

    // Agrega por produto
    const porProduto = new Map<string, { entradas: number; saidas: number }>();
    for (const m of movs) {
      if (!porProduto.has(m.produto_id)) porProduto.set(m.produto_id, { entradas: 0, saidas: 0 });
      const agg = porProduto.get(m.produto_id)!;
      if (m.tipo === 'entrada') agg.entradas += Number(m.quantidade);
      else                      agg.saidas   += Number(m.quantidade);
    }

    const itens = produtos.map(p => ({
      ...p,
      entradas_periodo: porProduto.get(p.id)?.entradas ?? 0,
      saidas_periodo:   porProduto.get(p.id)?.saidas   ?? 0,
    }));

    return {
      data_inicio: dataInicio ?? null,
      data_fim:    dataFim    ?? null,
      total_valor: itens.reduce((s, p) => s + p.valor_em_estoque, 0),
      qtd_produtos: itens.length,
      em_alerta:   itens.filter(p => p.situacao === 'baixo' || p.situacao === 'zerado').length,
      itens,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  ALERTAS (para o cron e dashboard)
  // ══════════════════════════════════════════════════════════════

  async produtosEmAlerta(tenantId: string) {
    const produtos = await this.produtosComSaldo(tenantId);
    return produtos.filter(p => p.situacao === 'baixo' || p.situacao === 'zerado');
  }

  // ── Resumo para o dashboard ────────────────────────────────────
  async resumoDashboard(tenantId: string) {
    const produtos = await this.produtosComSaldo(tenantId);
    return {
      valor_total:  produtos.reduce((s, p) => s + p.valor_em_estoque, 0),
      qtd_produtos: produtos.length,
      em_alerta:    produtos.filter(p => p.situacao === 'baixo').length,
      zerados:      produtos.filter(p => p.situacao === 'zerado').length,
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ══════════════════════════════════════════════════════════════

  /** Calcula saldo numérico de um produto */
  async calcularSaldo(tenantId: string, produtoId: string): Promise<number> {
    const result = await this.movRepo
      .createQueryBuilder('m')
      .select(`
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN m.tipo = 'saida'  THEN m.quantidade ELSE 0 END), 0)
      `, 'saldo')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.produto_id = :produtoId', { produtoId })
      .getRawOne();

    return Number(result?.saldo ?? 0);
  }

  /** Lista produtos com saldo calculado, valor em estoque e situação */
  private async produtosComSaldo(tenantId: string, id?: string) {
    const qb = this.produtoRepo
      .createQueryBuilder('p')
      .leftJoin(
        qb2 => qb2
          .select('mv.produto_id', 'produto_id')
          .addSelect(`
            COALESCE(SUM(CASE WHEN mv.tipo = 'entrada' THEN mv.quantidade ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN mv.tipo = 'saida'  THEN mv.quantidade ELSE 0 END), 0)
          `, 'saldo')
          .from('movimentacao_estoque', 'mv')
          .where('mv.tenant_id = :tenantId', { tenantId })
          .groupBy('mv.produto_id'),
        'sld',
        'sld.produto_id = p.id',
      )
      .addSelect('COALESCE(sld.saldo, 0)', 'saldo_atual')
      // ERR-14: traz o nome da categoria configuravel (categoria_insumo)
      .leftJoin(
        'categoria_insumo', 'ci',
        'ci.id = p.categoria_id AND ci.tenant_id = p.tenant_id',
      )
      .addSelect('ci.nome', 'categoria_nome')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.ativo = 1');

    if (id) qb.andWhere('p.id = :id', { id });

    qb.orderBy('COALESCE(ci.nome, p.categoria_legado)', 'ASC').addOrderBy('p.descricao', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map(r => {
      const saldo    = Number(r.saldo_atual ?? 0);
      const minimo   = r.p_estoque_minimo != null ? Number(r.p_estoque_minimo) : null;
      const situacao = saldo <= 0
        ? 'zerado'
        : minimo != null && saldo <= minimo
          ? 'baixo'
          : 'normal';

      return {
        id:               r.p_id,
        tenant_id:        r.p_tenant_id,
        codigo:           r.p_codigo,
        descricao:        r.p_descricao,
        marca:            r.p_marca,
        // ERR-14: categoria_id/categoria_nome sao a fonte nova; `categoria`
        // continua saindo (nome da categoria, com fallback no legado) para nao
        // quebrar as telas que ainda leem esse campo.
        categoria_id:     r.p_categoria_id ?? null,
        categoria_nome:   r.categoria_nome ?? null,
        categoria:        r.categoria_nome ?? r.p_categoria_legado ?? null,
        unidade:          r.p_unidade,
        valor_unitario:   Number(r.p_valor_unitario),
        validade:         r.p_validade,
        estoque_minimo:   minimo,
        ativo:            !!r.p_ativo,
        criado_em:        r.p_criado_em,
        saldo_atual:      saldo,
        valor_em_estoque: saldo * Number(r.p_valor_unitario),
        situacao,
      };
    });
  }
}
