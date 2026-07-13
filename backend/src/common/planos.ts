/**
 * Fonte unica de verdade da precificacao do SaaS.
 *
 * Antes, os precos (97 / 197 / 500) estavam escritos a mao em tres lugares:
 * tenants.service.metricas(), super-admin PRECOS_PLANO e super-admin.listarPlanos().
 * Mudar o preco em um deles e esquecer os outros deixava o MRR errado.
 *
 * E, mais grave: nenhum desses calculos aplicava tenant.desconto_percentual.
 * O super-admin dava desconto e o MRR continuava reportando o preco cheio,
 * ou seja, o MRR do SaaS estava inflado.
 */

export type PlanoSaaS = 'starter' | 'pro' | 'enterprise';

export interface DefinicaoPlano {
  plano:        PlanoSaaS;
  preco_mensal: number;
  max_usuarios: number;   // -1 = ilimitado
  max_maquinas: number;   // -1 = ilimitado
}

export const PLANOS: Record<PlanoSaaS, DefinicaoPlano> = {
  starter: {
    plano: 'starter', preco_mensal: 97,
    max_usuarios: 5,  max_maquinas: 50,
  },
  pro: {
    plano: 'pro', preco_mensal: 197,
    max_usuarios: 20, max_maquinas: 200,
  },
  enterprise: {
    plano: 'enterprise', preco_mensal: 500,
    max_usuarios: -1, max_maquinas: -1,
  },
};

export function precoDoPlano(plano: string): number {
  return PLANOS[plano as PlanoSaaS]?.preco_mensal ?? 0;
}

/** Tenant, no minimo que este calculo precisa enxergar. */
interface TenantCobravel {
  plano:                string;
  status:               string;
  desconto_percentual?: number | string | null;
  desconto_expira_em?:  string | Date | null;
}

/** O desconto so vale enquanto nao expirar. Sem data = sem prazo. */
export function descontoVigente(t: TenantCobravel, hoje = new Date()): number {
  const pct = Number(t.desconto_percentual ?? 0);
  if (!pct || pct <= 0) return 0;

  if (t.desconto_expira_em) {
    const expira = new Date(t.desconto_expira_em);
    if (!Number.isNaN(expira.getTime()) && expira < hoje) return 0;   // expirado
  }
  return Math.min(pct, 100);
}

/**
 * Receita mensal real do tenant: preco do plano menos o desconto vigente.
 * Somente tenants ativos entram no MRR — trial, suspenso e cancelado nao pagam.
 */
export function mrrDoTenant(t: TenantCobravel, hoje = new Date()): number {
  if (t.status !== 'ativo') return 0;

  const preco    = precoDoPlano(t.plano);
  const desconto = descontoVigente(t, hoje);
  const valor    = preco * (1 - desconto / 100);

  return Math.round(valor * 100) / 100;
}

/** MRR consolidado de uma carteira de tenants. */
export function mrrTotal(tenants: TenantCobravel[], hoje = new Date()): number {
  const total = tenants.reduce((s, t) => s + mrrDoTenant(t, hoje), 0);
  return Math.round(total * 100) / 100;
}
