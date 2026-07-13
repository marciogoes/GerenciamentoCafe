import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 }     from 'uuid';

import { Tenant }              from './entities/tenant.entity';
import { AssinaturaTenant }    from './entities/assinatura-tenant.entity';
import { PagamentoAssinatura } from './entities/pagamento-assinatura.entity';
import { mrrDoTenant, precoDoPlano } from '../../common/planos';

/**
 * ERR-24 — cobranca do SaaS ao tenant.
 *
 * Modelo de cobranca: MANUAL (gateway = 'manual'). Nao ha integracao com
 * gateway de pagamento. O super admin gera a cobranca do mes e da baixa quando
 * o dinheiro entra. Quando o numero de tenants justificar, troca-se o gateway
 * sem mudar este contrato: a entity ja tem gateway e gateway_subscription_id.
 */
@Injectable()
export class AssinaturasService {

  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,

    @InjectRepository(AssinaturaTenant)
    private assinaturaRepo: Repository<AssinaturaTenant>,

    @InjectRepository(PagamentoAssinatura)
    private pagamentoRepo: Repository<PagamentoAssinatura>,
  ) {}

  // ── Helpers de data ────────────────────────────────────────────
  private hoje(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private competenciaDe(data: string): string {
    return data.slice(0, 7) + '-01';
  }

  private somarUmMes(data: string): string {
    const d = new Date(data + 'T12:00:00');
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

  // ══════════════════════════════════════════════════════════════
  //  ASSINATURA
  // ══════════════════════════════════════════════════════════════

  async buscarPorTenant(tenantId: string): Promise<AssinaturaTenant | null> {
    return this.assinaturaRepo.findOne({ where: { tenant_id: tenantId } });
  }

  /**
   * Cria a assinatura do tenant. O valor sai de mrrDoTenant, ou seja, ja
   * considera o desconto comercial vigente.
   */
  async criar(
    tenantId: string,
    opcoes: { data_inicio?: string; dia_vencimento?: number } = {},
  ): Promise<AssinaturaTenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const existente = await this.buscarPorTenant(tenantId);
    if (existente && existente.status !== 'cancelado') {
      throw new ConflictException('Este tenant já possui assinatura ativa.');
    }

    const inicio = opcoes.data_inicio ?? this.hoje();
    const valor  = mrrDoTenant({ ...tenant, status: 'ativo' });  // preço já com desconto

    const assinatura = this.assinaturaRepo.create({
      id:                      uuidv4(),
      tenant_id:               tenantId,
      plano:                   tenant.plano,
      status:                  'ativo',
      gateway:                 'manual',
      gateway_subscription_id: null,
      valor_mensal:            valor,
      data_inicio:             inicio,
      proximo_vencimento:      this.somarUmMes(inicio),
      cancelado_em:            null,
    });

    return this.assinaturaRepo.save(assinatura);
  }

  /** Reflete mudanca de plano ou de desconto no valor da assinatura. */
  async sincronizarValor(tenantId: string): Promise<AssinaturaTenant | null> {
    const [tenant, assinatura] = await Promise.all([
      this.tenantRepo.findOne({ where: { id: tenantId } }),
      this.buscarPorTenant(tenantId),
    ]);
    if (!tenant || !assinatura || assinatura.status === 'cancelado') return assinatura;

    assinatura.plano        = tenant.plano;
    assinatura.valor_mensal = mrrDoTenant({ ...tenant, status: 'ativo' });
    return this.assinaturaRepo.save(assinatura);
  }

  async cancelar(tenantId: string): Promise<AssinaturaTenant> {
    const assinatura = await this.buscarPorTenant(tenantId);
    if (!assinatura) throw new NotFoundException('Assinatura não encontrada.');

    assinatura.status       = 'cancelado';
    assinatura.cancelado_em = this.hoje();
    return this.assinaturaRepo.save(assinatura);
  }

  // ══════════════════════════════════════════════════════════════
  //  COBRANCAS
  // ══════════════════════════════════════════════════════════════

  /**
   * Gera a cobranca de uma competencia. Idempotente: se ja existe cobranca
   * para o mes, devolve a existente em vez de duplicar.
   */
  async gerarCobranca(tenantId: string, competencia?: string): Promise<PagamentoAssinatura> {
    const assinatura = await this.buscarPorTenant(tenantId);
    if (!assinatura) throw new NotFoundException('Tenant não possui assinatura.');
    if (assinatura.status === 'cancelado') {
      throw new BadRequestException('Assinatura cancelada não gera cobrança.');
    }

    const comp = this.competenciaDe(competencia ?? this.hoje());

    const existente = await this.pagamentoRepo.findOne({
      where: { tenant_id: tenantId, competencia: comp },
    });
    if (existente) return existente;

    const cobranca = this.pagamentoRepo.create({
      id:              uuidv4(),
      tenant_id:       tenantId,
      assinatura_id:   assinatura.id,
      competencia:     comp,
      valor:           assinatura.valor_mensal,
      data_vencimento: assinatura.proximo_vencimento,
      data_pagamento:  null,
      forma_pagamento: null,
      observacao:      null,
      registrado_por:  null,
    });

    return this.pagamentoRepo.save(cobranca);
  }

  /** Baixa do pagamento. Avanca o vencimento e reativa se estava inadimplente. */
  async registrarPagamento(
    pagamentoId: string,
    dados: { data_pagamento?: string; forma_pagamento?: string; observacao?: string },
    adminId?: string,
  ): Promise<PagamentoAssinatura> {
    const pag = await this.pagamentoRepo.findOne({ where: { id: pagamentoId } });
    if (!pag) throw new NotFoundException('Cobrança não encontrada.');
    if (pag.data_pagamento) {
      throw new ConflictException('Esta cobrança já foi baixada.');
    }

    pag.data_pagamento  = dados.data_pagamento ?? this.hoje();
    pag.forma_pagamento = dados.forma_pagamento ?? null;
    pag.observacao      = dados.observacao ?? null;
    pag.registrado_por  = adminId ?? null;
    const salvo = await this.pagamentoRepo.save(pag);

    const assinatura = await this.assinaturaRepo.findOne({ where: { id: pag.assinatura_id } });
    if (assinatura) {
      assinatura.proximo_vencimento = this.somarUmMes(assinatura.proximo_vencimento);
      // Pagou: sai da inadimplencia. Cancelado nao volta sozinho.
      if (assinatura.status === 'inadimplente') assinatura.status = 'ativo';
      await this.assinaturaRepo.save(assinatura);
    }

    return salvo;
  }

  async listarCobrancas(tenantId: string): Promise<PagamentoAssinatura[]> {
    return this.pagamentoRepo.find({
      where: { tenant_id: tenantId },
      order: { competencia: 'DESC' },
    });
  }

  /** Cobrancas vencidas e ainda em aberto, de todos os tenants. */
  async emAberto(): Promise<any[]> {
    const hoje = this.hoje();
    return this.pagamentoRepo
      .createQueryBuilder('p')
      .innerJoin(Tenant, 't', 't.id = p.tenant_id')
      .select([
        'p.id           AS id',
        'p.tenant_id    AS tenant_id',
        't.razao_social AS tenant_nome',
        'p.competencia  AS competencia',
        'p.valor        AS valor',
        'p.data_vencimento AS data_vencimento',
        'DATEDIFF(:hoje, p.data_vencimento) AS dias_atraso',
      ])
      .where('p.data_pagamento IS NULL')
      .andWhere('p.data_vencimento < :hoje', { hoje })
      .orderBy('p.data_vencimento', 'ASC')
      .setParameter('hoje', hoje)
      .getRawMany();
  }

  /**
   * Marca como inadimplente quem tem cobranca vencida em aberto.
   * Chamado pelo cron — nao mexe em assinatura cancelada.
   */
  async atualizarInadimplencia(): Promise<{ marcados: number }> {
    const vencidas = await this.pagamentoRepo.find({
      where: { data_pagamento: IsNull() },
    });
    const hoje = this.hoje();

    const tenantsDevendo = new Set(
      vencidas.filter(p => p.data_vencimento < hoje).map(p => p.tenant_id),
    );
    if (!tenantsDevendo.size) return { marcados: 0 };

    let marcados = 0;
    for (const tenantId of tenantsDevendo) {
      const a = await this.buscarPorTenant(tenantId);
      if (a && a.status === 'ativo') {
        a.status = 'inadimplente';
        await this.assinaturaRepo.save(a);
        marcados++;
      }
    }
    return { marcados };
  }

  /** Visao consolidada para o painel do super admin. */
  async resumo(tenantId: string) {
    const assinatura = await this.buscarPorTenant(tenantId);
    if (!assinatura) return null;

    const cobrancas = await this.listarCobrancas(tenantId);
    const hoje      = this.hoje();
    const abertas   = cobrancas.filter(c => !c.data_pagamento);

    return {
      assinatura,
      preco_cheio_plano: precoDoPlano(assinatura.plano),
      total_pago:        cobrancas
        .filter(c => c.data_pagamento)
        .reduce((s, c) => s + Number(c.valor), 0),
      cobrancas_abertas: abertas.length,
      valor_em_aberto:   abertas.reduce((s, c) => s + Number(c.valor), 0),
      vencidas:          abertas.filter(c => c.data_vencimento < hoje).length,
      cobrancas,
    };
  }
}
