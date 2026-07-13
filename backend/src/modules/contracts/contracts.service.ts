import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource }              from 'typeorm';
import { v4 as uuidv4 }                        from 'uuid';

import { Cliente }             from './entities/cliente.entity';
import { Contrato }            from './entities/contrato.entity';
import { ContratoMaquinas }    from './entities/contrato-maquinas.entity';
import { LancamentoMensal }    from './entities/lancamento-mensal.entity';
import { ReajusteContratual }  from './entities/reajuste-contratual.entity';
import {
  CriarClienteDto, AtualizarClienteDto, FiltrosClienteDto,
  CriarContratoDto, AtualizarContratoDto, FiltrosContratoDto,
  GerarLancamentosDto, AtualizarLancamentoDto, RegistrarPagamentoDto, FiltrosLancamentoDto,
  AplicarReajusteDto,
} from './dto/contracts.dto';

@Injectable()
export class ContractsService {

  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,

    @InjectRepository(Contrato)
    private contratoRepo: Repository<Contrato>,

    @InjectRepository(ContratoMaquinas)
    private contratoMaquinaRepo: Repository<ContratoMaquinas>,

    @InjectRepository(LancamentoMensal)
    private lancamentoRepo: Repository<LancamentoMensal>,

    @InjectRepository(ReajusteContratual)
    private reajusteRepo: Repository<ReajusteContratual>,

    @InjectDataSource()
    private ds: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  CLIENTES (RF-C01)
  // ══════════════════════════════════════════════════════════════

  async listarClientes(tenantId: string, filtros: FiltrosClienteDto): Promise<Cliente[]> {
    const qb = this.clienteRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (filtros.busca) {
      qb.andWhere(
        '(c.razao_social LIKE :busca OR c.cnpj LIKE :busca OR c.contato_email LIKE :busca)',
        { busca: `%${filtros.busca}%` },
      );
    }
    if (filtros.segmento) {
      qb.andWhere('c.segmento = :seg', { seg: filtros.segmento });
    }
    if (filtros.ativo !== undefined) {
      qb.andWhere('c.ativo = :ativo', { ativo: filtros.ativo === 'true' });
    }

    return qb.orderBy('c.razao_social', 'ASC').getMany();
  }

  async buscarCliente(tenantId: string, id: string): Promise<Cliente> {
    const c = await this.clienteRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!c) throw new NotFoundException('Cliente não encontrado.');
    return c;
  }

  async buscarClienteCompleto(tenantId: string, id: string) {
    const cliente = await this.buscarCliente(tenantId, id);
    const contratos = await this.contratoRepo.find({
      where: { cliente_id: id, tenant_id: tenantId },
      order: { data_inicio: 'DESC' },
    });

    // Lançamentos em aberto do cliente
    const lancamentosAbertos = await this.lancamentoRepo
      .createQueryBuilder('lm')
      .innerJoin('contrato', 'co', 'co.id = lm.contrato_id AND co.tenant_id = lm.tenant_id')
      .where('co.cliente_id = :clienteId', { clienteId: id })
      .andWhere('lm.tenant_id = :tenantId', { tenantId })
      .andWhere("lm.situacao IN ('pendente','vencido')")
      .orderBy('lm.data_vencimento', 'ASC')
      .getMany();

    return { ...cliente, contratos, lancamentos_abertos: lancamentosAbertos };
  }

  async criarCliente(tenantId: string, dto: CriarClienteDto): Promise<Cliente> {
    const cnpjLimpo = dto.cnpj.replace(/\D/g, '');
    const existe = await this.clienteRepo.findOne({
      where: { cnpj: cnpjLimpo, tenant_id: tenantId },
    });
    if (existe) throw new ConflictException('CNPJ já cadastrado neste tenant.');

    const c = this.clienteRepo.create({
      id:                uuidv4(),
      tenant_id:         tenantId,
      razao_social:      dto.razao_social,
      cnpj:              cnpjLimpo,
      endereco:          dto.endereco ?? null,
      segmento:          dto.segmento ?? null,
      contato_nome:      dto.contato_nome ?? null,
      contato_email:     dto.contato_email ?? null,
      contato_telefone:  dto.contato_telefone ?? null,
      ativo:             true,
    });
    return this.clienteRepo.save(c);
  }

  async atualizarCliente(tenantId: string, id: string, dto: AtualizarClienteDto): Promise<Cliente> {
    const c = await this.buscarCliente(tenantId, id);
    if (dto.cnpj) dto.cnpj = dto.cnpj.replace(/\D/g, '');
    Object.assign(c, dto);
    return this.clienteRepo.save(c);
  }

  // ══════════════════════════════════════════════════════════════
  //  CONTRATOS (RF-C02)
  // ══════════════════════════════════════════════════════════════

  async listarContratos(tenantId: string, filtros: FiltrosContratoDto) {
    const qb = this.contratoRepo
      .createQueryBuilder('co')
      .leftJoin('cliente', 'cl', 'cl.id = co.cliente_id AND cl.tenant_id = co.tenant_id')
      .addSelect(['cl.razao_social', 'cl.cnpj'])
      .leftJoin('maquina', 'm', 'm.id = co.maquina_id AND m.tenant_id = co.tenant_id')
      .addSelect(['m.patrimonio'])
      .where('co.tenant_id = :tenantId', { tenantId });

    if (filtros.situacao) qb.andWhere('co.situacao = :sit', { sit: filtros.situacao });
    if (filtros.cliente_id) qb.andWhere('co.cliente_id = :cid', { cid: filtros.cliente_id });
    if (filtros.tipo) qb.andWhere('co.tipo = :tipo', { tipo: filtros.tipo });

    qb.orderBy('co.data_inicio', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      id:               r.co_id,
      tenant_id:        r.co_tenant_id,
      cliente_id:       r.co_cliente_id,
      cliente_nome:     r.cl_razao_social,
      cliente_cnpj:     r.cl_cnpj,
      maquina_id:       r.co_maquina_id,
      maquina_patrimonio: r.m_patrimonio,
      tipo:             r.co_tipo,
      valor_mensal:     r.co_valor_mensal,
      data_assinatura:  r.co_data_assinatura,
      data_inicio:      r.co_data_inicio,
      data_fim:         r.co_data_fim,
      situacao:         r.co_situacao,
      dia_vencimento:   r.co_dia_vencimento,
      indice_reajuste:  r.co_indice_reajuste,
      ultimo_reajuste_em: r.co_ultimo_reajuste_em,
      observacao:       r.co_observacao,
      criado_em:        r.co_criado_em,
    }));
  }

  async buscarContrato(tenantId: string, id: string): Promise<Contrato> {
    const c = await this.contratoRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!c) throw new NotFoundException('Contrato não encontrado.');
    return c;
  }

  async buscarContratoCompleto(tenantId: string, id: string) {
    const contrato  = await this.buscarContrato(tenantId, id);
    const cliente   = await this.clienteRepo.findOne({ where: { id: contrato.cliente_id, tenant_id: tenantId } });
    const reajustes = await this.reajusteRepo.find({
      where: { contrato_id: id, tenant_id: tenantId },
      order: { criado_em: 'DESC' },
    });
    const lancamentos = await this.lancamentoRepo.find({
      where: { contrato_id: id, tenant_id: tenantId },
      order: { competencia: 'DESC' },
    });
    // ERR-03: maquinas vinculadas vem da tabela N:N, nao do campo deprecated
    const maquinas = await this.listarMaquinasDoContrato(tenantId, id);

    return { ...contrato, cliente, maquinas, reajustes, lancamentos };
  }

  async criarContrato(tenantId: string, dto: CriarContratoDto): Promise<Contrato> {
    await this.buscarCliente(tenantId, dto.cliente_id);

    // ERR-13 CORRIGIDO: RN-F14 / RN-M11 — contratos do tipo 'evento' exigem data_fim
    if (dto.tipo === 'evento' && !dto.data_fim) {
      throw new BadRequestException(
        "Contratos do tipo 'evento' exigem a data de fim (data_fim) preenchida.",
      );
    }

    const c = this.contratoRepo.create({
      id:               uuidv4(),
      tenant_id:        tenantId,
      cliente_id:       dto.cliente_id,
      maquina_id:       dto.maquina_id ?? null,
      tipo:             dto.tipo as any,
      valor_mensal:     dto.valor_mensal,
      data_assinatura:  dto.data_assinatura,
      data_inicio:      dto.data_inicio,
      data_fim:         dto.data_fim ?? null,
      situacao:         'ativo',
      dia_vencimento:   dto.dia_vencimento,
      indice_reajuste:  dto.indice_reajuste ?? null,
      observacao:       dto.observacao ?? null,
    });
    const salvo = await this.contratoRepo.save(c);

    // ERR-03: a fonte de verdade do vinculo maquina<->contrato e a tabela N:N.
    // O service antes gravava so em contrato.maquina_id (deprecated), e por isso
    // contrato_maquinas ficava sempre vazia e o ciclo de faturamento nao fechava.
    if (dto.maquina_id) {
      await this.vincularMaquina(tenantId, salvo.id, dto.maquina_id);
    }
    return salvo;
  }

  async atualizarContrato(tenantId: string, id: string, dto: AtualizarContratoDto): Promise<Contrato> {
    const c = await this.buscarContrato(tenantId, id);
    const maquinaAnterior = c.maquina_id;

    Object.assign(c, dto);
    const salvo = await this.contratoRepo.save(c);

    // ERR-03: mantem contrato_maquinas em sincronia quando a maquina principal muda
    if (dto.maquina_id !== undefined && dto.maquina_id !== maquinaAnterior) {
      if (maquinaAnterior) await this.desvincularMaquina(tenantId, id, maquinaAnterior);
      if (dto.maquina_id)  await this.vincularMaquina(tenantId, id, dto.maquina_id);
    }
    return salvo;
  }

  // ══════════════════════════════════════════════════════════════
  //  MAQUINAS DO CONTRATO — ERR-03 (RF-C02, relacao N:N)
  // ══════════════════════════════════════════════════════════════

  /** Maquinas atualmente vinculadas ao contrato, com dados da maquina. */
  async listarMaquinasDoContrato(tenantId: string, contratoId: string) {
    await this.buscarContrato(tenantId, contratoId);
    return this.ds.query(
      `SELECT cm.maquina_id, cm.data_inclusao, cm.ativo,
              m.patrimonio, m.numero_serie, m.situacao, m.localizacao_atual,
              mc.nome AS modelo_nome
         FROM contrato_maquinas cm
         JOIN maquina m           ON m.id  = cm.maquina_id AND m.tenant_id = cm.tenant_id
         LEFT JOIN modelo_catalogo mc ON mc.id = m.modelo_id
        WHERE cm.contrato_id = ? AND cm.tenant_id = ? AND cm.ativo = 1
        ORDER BY cm.data_inclusao`,
      [contratoId, tenantId],
    );
  }

  /** Vincula uma maquina ao contrato. Idempotente: revincula se estava inativa. */
  async vincularMaquina(tenantId: string, contratoId: string, maquinaId: string) {
    await this.buscarContrato(tenantId, contratoId);

    const [maquina] = await this.ds.query(
      'SELECT id FROM maquina WHERE id = ? AND tenant_id = ? LIMIT 1',
      [maquinaId, tenantId],
    );
    if (!maquina) throw new NotFoundException('Máquina não encontrada.');

    // A mesma maquina nao pode estar em dois contratos ativos ao mesmo tempo
    const [conflito] = await this.ds.query(
      `SELECT cm.contrato_id
         FROM contrato_maquinas cm
         JOIN contrato co ON co.id = cm.contrato_id AND co.tenant_id = cm.tenant_id
        WHERE cm.maquina_id  = ?
          AND cm.tenant_id   = ?
          AND cm.ativo       = 1
          AND cm.contrato_id <> ?
          AND co.situacao    = 'ativo'
        LIMIT 1`,
      [maquinaId, tenantId, contratoId],
    );
    if (conflito) {
      throw new ConflictException(
        'Esta máquina já está vinculada a outro contrato ativo. Desvincule-a antes.',
      );
    }

    const existente = await this.contratoMaquinaRepo.findOne({
      where: { contrato_id: contratoId, maquina_id: maquinaId, tenant_id: tenantId },
    });

    if (existente) {
      existente.ativo = true;
      await this.contratoMaquinaRepo.save(existente);
    } else {
      await this.contratoMaquinaRepo.save(this.contratoMaquinaRepo.create({
        contrato_id:   contratoId,
        maquina_id:    maquinaId,
        tenant_id:     tenantId,
        data_inclusao: new Date().toISOString().slice(0, 10),
        ativo:         true,
      }));
    }

    // Compatibilidade: contrato.maquina_id continua apontando para a maquina
    // principal (a primeira vinculada), porque telas e relatorios ainda o leem.
    const vinculadas = await this.listarMaquinasDoContrato(tenantId, contratoId);
    await this.contratoRepo.update(
      { id: contratoId, tenant_id: tenantId },
      { maquina_id: vinculadas[0]?.maquina_id ?? null },
    );

    return this.listarMaquinasDoContrato(tenantId, contratoId);
  }

  /** Desvincula (ativo = false) — preserva o historico, nao deleta a linha. */
  async desvincularMaquina(tenantId: string, contratoId: string, maquinaId: string) {
    const vinculo = await this.contratoMaquinaRepo.findOne({
      where: { contrato_id: contratoId, maquina_id: maquinaId, tenant_id: tenantId },
    });
    if (!vinculo) throw new NotFoundException('Vínculo não encontrado.');

    vinculo.ativo = false;
    await this.contratoMaquinaRepo.save(vinculo);

    const restantes = await this.listarMaquinasDoContrato(tenantId, contratoId);
    await this.contratoRepo.update(
      { id: contratoId, tenant_id: tenantId },
      { maquina_id: restantes[0]?.maquina_id ?? null },
    );

    return restantes;
  }

  // ══════════════════════════════════════════════════════════════
  //  LANÇAMENTOS MENSAIS (RF-C03, UC-04)
  // ══════════════════════════════════════════════════════════════

  /** Calcula o dia de vencimento respeitando RN-F02 (último dia se não existir) */
  private calcVencimento(competencia: string, diaVencimento: number): string {
    const [ano, mes] = competencia.split('-').map(Number);
    const ultimoDia  = new Date(ano, mes, 0).getDate();
    const dia        = Math.min(diaVencimento, ultimoDia);
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  async gerarLancamentos(tenantId: string, dto: GerarLancamentosDto, origem: 'automatico' | 'manual' = 'manual') {
    // Normaliza competência para o 1º dia do mês
    const comp = dto.competencia.slice(0, 7) + '-01';

    // Busca contratos ativos (RN-F04: suspensos não geram)
    const contratos = await this.contratoRepo.find({
      where: { tenant_id: tenantId, situacao: 'ativo' },
    });

    const hoje = new Date().toISOString().split('T')[0];
    const lancamentos: LancamentoMensal[] = [];
    const pulados: string[] = [];  // contratos que já tinham lançamento e !forcar

    // FIX #7 — busca todos os lançamentos da competência de uma vez (evita N+1)
    const existentes = await this.lancamentoRepo.find({
      where: { tenant_id: tenantId, competencia: comp },
      select: ['id', 'contrato_id', 'situacao'],
    });
    const mapaExistentes = new Map(existentes.map(l => [l.contrato_id, l]));

    for (const c of contratos) {
      // RN-F01: só um lançamento por CONTRATO por competência
      const jaExiste = mapaExistentes.get(c.id);

      if (jaExiste) {
        if (!dto.forcar) {
          // Pula este contrato silenciosamente (pode ter sido gerado após lançamento do mês)
          pulados.push(c.id);
          continue;
        }
        // forcar=true: cancela apenas o lançamento pendente DESTE contrato
        if (jaExiste.situacao === 'pendente') {
          await this.lancamentoRepo.update(jaExiste.id, { situacao: 'cancelado' });
        } else {
          // Já pago/cancelado — não regera
          pulados.push(c.id);
          continue;
        }
      }

      const vencimento = this.calcVencimento(comp, c.dia_vencimento);
      // Sprint 14: define tipo_receita baseado no tipo do contrato
      const tipoReceita =
        c.tipo === 'comodato' ? 'doses' :
        c.tipo === 'evento'   ? 'evento' : 'locacao';

      const l = this.lancamentoRepo.create({
        id:              uuidv4(),
        tenant_id:       tenantId,
        contrato_id:     c.id,
        competencia:     comp,
        tipo_receita:    tipoReceita as any,
        valor:           c.valor_mensal,
        data_emissao:    hoje,
        data_vencimento: vencimento,
        situacao:        'pendente',
        origem,
      });
      lancamentos.push(l);
    }

    await this.lancamentoRepo.save(lancamentos);
    return {
      gerados:      lancamentos.length,
      pulados:      pulados.length,
      competencia:  comp,
      valor_total:  lancamentos.reduce((s, l) => s + Number(l.valor), 0),
      lancamentos,
    };
  }

  async listarLancamentos(tenantId: string, filtros: FiltrosLancamentoDto) {
    const qb = this.lancamentoRepo
      .createQueryBuilder('lm')
      .innerJoin('contrato', 'co', 'co.id = lm.contrato_id AND co.tenant_id = lm.tenant_id')
      .addSelect(['co.cliente_id', 'co.maquina_id', 'co.tipo'])
      .leftJoin('cliente', 'cl', 'cl.id = co.cliente_id AND cl.tenant_id = co.tenant_id')
      .addSelect(['cl.razao_social', 'cl.contato_email'])
      .leftJoin('maquina', 'm', 'm.id = co.maquina_id AND m.tenant_id = co.tenant_id')
      .addSelect(['m.patrimonio'])
      .where('lm.tenant_id = :tenantId', { tenantId });

    if (filtros.situacao)    qb.andWhere('lm.situacao = :sit',     { sit: filtros.situacao });
    if (filtros.contrato_id) qb.andWhere('lm.contrato_id = :cid', { cid: filtros.contrato_id });
    if (filtros.cliente_id)  qb.andWhere('co.cliente_id = :clid', { clid: filtros.cliente_id });
    if (filtros.data_inicio) qb.andWhere('lm.data_vencimento >= :di', { di: filtros.data_inicio });
    if (filtros.data_fim)    qb.andWhere('lm.data_vencimento <= :df', { df: filtros.data_fim });
    if (filtros.vencidos === 'true') {
      const hoje = new Date().toISOString().split('T')[0];
      qb.andWhere("lm.situacao IN ('pendente','vencido')")
        .andWhere('lm.data_vencimento < :hoje', { hoje });
    }

    qb.orderBy('lm.data_vencimento', 'ASC').addOrderBy('cl.razao_social', 'ASC');

    const rows = await qb.getRawMany();
    const hoje = new Date().toISOString().split('T')[0];

    return rows.map(r => {
      const diasAtraso = r.lm_data_vencimento < hoje && r.lm_situacao !== 'pago'
        ? Math.round((new Date(hoje).getTime() - new Date(r.lm_data_vencimento).getTime()) / 86400000)
        : 0;
      return {
        id:                r.lm_id,
        tenant_id:         r.lm_tenant_id,
        contrato_id:       r.lm_contrato_id,
        competencia:       r.lm_competencia,
        valor:             r.lm_valor,
        data_emissao:      r.lm_data_emissao,
        data_vencimento:   r.lm_data_vencimento,
        nf_locacao:        r.lm_nf_locacao,
        nf_insumos:        r.lm_nf_insumos,
        boleto_codigo:     r.lm_boleto_codigo,
        valor_pago:        r.lm_valor_pago,
        data_pagamento:    r.lm_data_pagamento,
        data_credito:      r.lm_data_credito,
        situacao:          r.lm_situacao,
        origem:            r.lm_origem,
        observacao:        r.lm_observacao,
        criado_em:         r.lm_criado_em,
        // Campos enriquecidos
        cliente_id:        r.co_cliente_id,
        cliente_nome:      r.cl_razao_social,
        cliente_email:     r.cl_contato_email,
        maquina_patrimonio: r.m_patrimonio,
        tipo_contrato:     r.co_tipo,
        dias_atraso:       diasAtraso,
        alerta_vermelho:   diasAtraso >= 3,
      };
    });
  }

  async atualizarLancamento(tenantId: string, id: string, dto: AtualizarLancamentoDto) {
    const l = await this.lancamentoRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!l) throw new NotFoundException('Lançamento não encontrado.');
    Object.assign(l, dto);
    return this.lancamentoRepo.save(l);
  }

  // ══════════════════════════════════════════════════════════════
  //  BAIXA DE PAGAMENTO (UC-05)
  // ══════════════════════════════════════════════════════════════

  async registrarPagamento(tenantId: string, id: string, dto: RegistrarPagamentoDto, usuarioId: string) {
    const l = await this.lancamentoRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!l) throw new NotFoundException('Lançamento não encontrado.');
    if (l.situacao === 'pago') throw new BadRequestException('Lançamento já está pago.');
    if (l.situacao === 'cancelado') throw new BadRequestException('Lançamento cancelado não pode ser baixado.');

    // RN-F06: data de pagamento não pode ser anterior à data de emissão
    if (dto.data_pagamento < l.data_emissao) {
      throw new BadRequestException(
        `Data de pagamento (${dto.data_pagamento}) não pode ser anterior à data de emissão (${l.data_emissao}).`,
      );
    }

    l.valor_pago      = dto.valor_pago;
    l.data_pagamento  = dto.data_pagamento;
    l.data_credito    = dto.data_credito ?? null;
    l.situacao        = 'pago';
    l.observacao      = dto.observacao ? (l.observacao ? `${l.observacao} | ${dto.observacao}` : dto.observacao) : l.observacao;

    return this.lancamentoRepo.save(l);
  }

  // ══════════════════════════════════════════════════════════════
  //  REAJUSTE CONTRATUAL (UC-09)
  // ══════════════════════════════════════════════════════════════

  async aplicarReajuste(tenantId: string, contratoId: string, dto: AplicarReajusteDto, usuarioId: string) {
    const contrato = await this.buscarContrato(tenantId, contratoId);
    const hoje     = new Date().toISOString().split('T')[0];

    // RN-F13: data de vigência >= hoje
    if (dto.data_vigencia < hoje) {
      throw new BadRequestException('A data de vigência deve ser igual ou posterior a hoje.');
    }

    const valorAnterior = Number(contrato.valor_mensal);
    const valorNovo     = +(valorAnterior * (1 + dto.percentual / 100)).toFixed(2);

    if (valorNovo <= 0) {
      throw new BadRequestException('O reajuste resultaria em valor zero ou negativo. Operação cancelada.');
    }

    // Registra histórico imutável (RN-F11)
    const reajuste = this.reajusteRepo.create({
      id:             uuidv4(),
      tenant_id:      tenantId,
      contrato_id:    contratoId,
      indice:         dto.indice,
      percentual:     dto.percentual,
      valor_anterior: valorAnterior,
      valor_novo:     valorNovo,
      data_vigencia:  dto.data_vigencia,
      usuario_id:     usuarioId,
    });
    await this.reajusteRepo.save(reajuste);

    // Atualiza contrato
    await this.contratoRepo.update(contratoId, {
      valor_mensal:       valorNovo,
      ultimo_reajuste_em: dto.data_vigencia,
      indice_reajuste:    dto.indice,
    });

    return {
      valor_anterior:  valorAnterior,
      valor_novo:      valorNovo,
      diferenca:       +(valorNovo - valorAnterior).toFixed(2),
      percentual:      dto.percentual,
      data_vigencia:   dto.data_vigencia,
      historico_id:    reajuste.id,
    };
  }

  async listarReajustes(tenantId: string, contratoId: string) {
    await this.buscarContrato(tenantId, contratoId);
    return this.reajusteRepo.find({
      where: { contrato_id: contratoId, tenant_id: tenantId },
      order: { criado_em: 'DESC' },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  INADIMPLÊNCIA (RF-C11)
  // ══════════════════════════════════════════════════════════════

  async relatorioInadimplencia(tenantId: string) {
    const hoje = new Date().toISOString().split('T')[0];

    const rows = await this.lancamentoRepo
      .createQueryBuilder('lm')
      .innerJoin('contrato', 'co', 'co.id = lm.contrato_id AND co.tenant_id = lm.tenant_id')
      .innerJoin('cliente',  'cl', 'cl.id = co.cliente_id  AND cl.tenant_id = co.tenant_id')
      .select([
        'cl.id           AS cliente_id',
        'cl.razao_social AS cliente_nome',
        'cl.contato_email AS cliente_email',
        'cl.contato_telefone AS cliente_telefone',
        'COUNT(lm.id)    AS qtd_boletos',
        'SUM(lm.valor)   AS valor_total',
        'MIN(lm.data_vencimento) AS vencimento_mais_antigo',
        'DATEDIFF(CURDATE(), MIN(lm.data_vencimento)) AS maior_atraso_dias',
      ])
      .where('lm.tenant_id = :tenantId', { tenantId })
      .andWhere("lm.situacao IN ('pendente','vencido')")
      .andWhere('lm.data_vencimento < :hoje', { hoje })
      .groupBy('cl.id, cl.razao_social, cl.contato_email, cl.contato_telefone')
      .orderBy('SUM(lm.valor)', 'DESC')
      .getRawMany();

    // Aging buckets
    return rows.map(r => {
      const dias = Number(r.maior_atraso_dias);
      return {
        cliente_id:            r.cliente_id,
        cliente_nome:          r.cliente_nome,
        cliente_email:         r.cliente_email,
        cliente_telefone:      r.cliente_telefone,
        qtd_boletos:           Number(r.qtd_boletos),
        valor_total:           Number(r.valor_total),
        vencimento_mais_antigo: r.vencimento_mais_antigo,
        maior_atraso_dias:     dias,
        aging: dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : '60+',
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  PDF CONTRATO DE EVENTO (Sprint 15)
  // ══════════════════════════════════════════════════════════════

  async getDadosContratoEvento(tenantId: string, contratoId: string) {
    const contrato = await this.buscarContrato(tenantId, contratoId);
    if (contrato.tipo !== 'evento') {
      throw new BadRequestException('Este contrato não é do tipo Evento.');
    }

    const cliente = await this.clienteRepo.findOne({
      where: { id: contrato.cliente_id, tenant_id: tenantId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    // Dados da máquina
    let maquina: any = null;
    if (contrato.maquina_id) {
      const [row] = await this.ds.query(
        `SELECT m.patrimonio, m.numero_serie, mc.nome AS modelo_nome
         FROM maquina m
         LEFT JOIN modelo_catalogo mc ON mc.id = m.modelo_id
         WHERE m.id = ? AND m.tenant_id = ? LIMIT 1`,
        [contrato.maquina_id, tenantId],
      );
      maquina = row ?? null;
    }

    // Dados do tenant (locadora)
    const [tenant] = await this.ds.query(
      'SELECT razao_social, cnpj, logo_url FROM tenant WHERE id = ? LIMIT 1',
      [tenantId],
    );

    return {
      contrato: {
        id:                   contrato.id,
        tipo:                 contrato.tipo,
        valor_mensal:         contrato.valor_mensal,
        data_assinatura:      contrato.data_assinatura,
        data_inicio:          contrato.data_inicio,
        data_fim:             contrato.data_fim,
        situacao:             contrato.situacao,
        observacao:           contrato.observacao,
        nome_evento:          (contrato as any).nome_evento          ?? null,
        local_evento:         (contrato as any).local_evento         ?? null,
        condicoes_comerciais: (contrato as any).condicoes_comerciais ?? null,
        responsavel_contrato: (contrato as any).responsavel_contrato ?? null,
      },
      locadora: {
        razao_social: tenant?.razao_social ?? 'BEL CAFÉ Locação, Serviços e Comércio Ltda',
        cnpj:         tenant?.cnpj         ?? '',
        logo_url:     tenant?.logo_url     ?? null,
      },
      locatario: {
        razao_social:     cliente.razao_social,
        cnpj:             cliente.cnpj,
        endereco:         cliente.endereco,
        contato_nome:     cliente.contato_nome,
        contato_email:    cliente.contato_email,
        contato_telefone: cliente.contato_telefone,
      },
      maquina,
      gerado_em: new Date().toISOString(),
    };
  }

  /** Lançamentos vencidos para o cron de alertas */
  async lancamentosVencidosParaAlerta(tenantId: string, diasAtraso: number) {
    const hoje = new Date();
    const alvo = new Date(hoje.getTime() - diasAtraso * 86400000)
      .toISOString().split('T')[0];

    return this.lancamentoRepo
      .createQueryBuilder('lm')
      .innerJoin('contrato', 'co', 'co.id = lm.contrato_id AND co.tenant_id = lm.tenant_id')
      .innerJoin('cliente',  'cl', 'cl.id = co.cliente_id')
      .addSelect(['cl.razao_social', 'cl.contato_email'])
      .where('lm.tenant_id = :tenantId', { tenantId })
      .andWhere("lm.situacao IN ('pendente','vencido')")
      .andWhere('lm.data_vencimento = :alvo', { alvo })
      .getMany();
  }

  /** Atualiza situação de pendentes vencidos para 'vencido' (chamado pelo cron) */
  async atualizarSituacaoVencidos(tenantId: string): Promise<number> {
    const hoje = new Date().toISOString().split('T')[0];
    const result = await this.lancamentoRepo
      .createQueryBuilder()
      .update(LancamentoMensal)
      .set({ situacao: 'vencido' })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('situacao = :sit', { sit: 'pendente' })
      .andWhere('data_vencimento < :hoje', { hoje })
      .execute();
    return result.affected ?? 0;
  }
}
