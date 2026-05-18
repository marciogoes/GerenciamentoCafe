/** Formata valor em BRL: ex. 1234.50 → "R$ 1.234,50" */
export function formataMoeda(valor: number | string | null | undefined): string {
  const num = Number(valor ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** @deprecated use formataMoeda */
export function fmtBRL(valor: number | string | null | undefined): string {
  const num = Number(valor ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata data ISO: ex. '2026-03-10' → '10/03/2026' */
export function fmtDate(
  data: string | null | undefined,
  formato: 'completo' | 'mes' = 'completo',
): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  if (formato === 'mes') {
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${nomes[parseInt(mes) - 1]}/${ano}`;
  }
  return `${dia}/${mes}/${ano}`;
}

// ── Aliases para compatibilidade ────────────────────────────
export const formatCurrency = fmtBRL;
export const formatDate     = fmtDate;

/** Formata número com casas decimais: ex. 5.000 → '5,000' */
export function formatNumber(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Formata CNPJ */
export function fmtCnpj(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** Mês da competência: '2026-03-01' → 'Março/2026' */
export function fmtCompetencia(data: string | null | undefined): string {
  if (!data) return '—';
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  const [ano, mes] = data.split('-');
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}

/** Alias para fmtDate (compatibilidade com páginas Sprint 13) */
export const fmtBR     = fmtDate;
export const fmtDataBR = fmtDate;

/** Alias para formataMoeda (compatibilidade com páginas Sprint 13) */
export const fmtMoeda = formataMoeda;

/** Alias para fmtCompetencia (compatibilidade com páginas Sprint 13) */
export const mesCompetencia = fmtCompetencia;
export const fmtMes = fmtCompetencia;
