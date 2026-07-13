import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { dashboardApi } from '../services/api';
import type {
  DashboardKpis, GraficoPonto, DashboardAlertas,
} from '../types';

interface DistribuicaoItem { situacao: string; total: number; }
interface TopCliente   { razao_social: string; receita_total: number; contratos: number; }
interface Inadimplente { cliente: string; valor_aberto: number; maior_atraso: number; qtd_boletos: number; }

// ─────────────────────────────────────────────────────────────
//  HOOKS INDIVIDUAIS (podem ser usados em outros componentes)
// ─────────────────────────────────────────────────────────────

export function useDashboardKpis(periodo: string) {
  return useQuery<DashboardKpis>(
    ['dashboard-kpis', periodo],
    async () => {
      const { data } = await dashboardApi.kpis(periodo);
      return data;
    },
    {
      staleTime:      30_000,   // 30s — recarrega ao mudar período
      refetchInterval: 60_000,  // atualiza a cada 1 min em background
      retry: 1,
    },
  );
}

export function useDashboardGraficos() {
  return useQuery(
    ['dashboard-graficos'],
    async () => {
      const [rec, maq, dist, top, inad] = await Promise.allSettled([
        dashboardApi.graficoReceita(),
        dashboardApi.graficoMaquinas(),
        dashboardApi.distribuicaoMaquinas(),
        dashboardApi.topClientes(),
        dashboardApi.inadimplencia(),
      ]);

      // O cast precisa envolver a expressao inteira: axios devolve `any`, entao
      // aplicar `as T[]` so no [] do else deixava o resultado como `any`.
      return {
        graficoReceita: (rec.status  === 'fulfilled' ? (rec.value.data  ?? []) : []) as GraficoPonto[],
        graficoMaq:     (maq.status  === 'fulfilled' ? (maq.value.data  ?? []) : []) as GraficoPonto[],
        distribuicao:   (dist.status === 'fulfilled' ? (dist.value.data ?? []) : []) as DistribuicaoItem[],
        topClientes:    (top.status  === 'fulfilled' ? (top.value.data  ?? []) : []) as TopCliente[],
        inadimplencia:  (inad.status === 'fulfilled' ? (inad.value.data ?? []) : []) as Inadimplente[],
      };
    },
    {
      staleTime:       5 * 60_000,  // 5 min — gráficos mudam menos
      refetchInterval: 5 * 60_000,
      retry: 1,
    },
  );
}

// Sprint 14 — receita por tipo e KPI atividades
export function useDashboardSprint14() {
  return useQuery(
    ['dashboard-sprint14'],
    async () => {
      const [recTipo, grafTipo, kpiAtiv] = await Promise.allSettled([
        dashboardApi.receitaPorTipo(),
        dashboardApi.graficoReceitaPorTipo(),
        dashboardApi.kpiAtividades(),
      ]);
      return {
        receitaPorTipo:      recTipo.status  === 'fulfilled' ? (recTipo.value.data  ?? []) : [],
        graficoReceitaTipo:  grafTipo.status === 'fulfilled' ? (grafTipo.value.data ?? []) : [],
        kpiAtividades:       kpiAtiv.status  === 'fulfilled' ? (kpiAtiv.value.data  ?? null) : null,
      };
    },
    { staleTime: 60_000, refetchInterval: 60_000, retry: 1 },
  );
}

export function useDashboardAlertas() {
  return useQuery<DashboardAlertas>(
    ['dashboard-alertas'],
    async () => {
      const { data } = await dashboardApi.alertas();
      return data;
    },
    {
      staleTime:       60_000,
      refetchInterval: 60_000,
      retry: 1,
    },
  );
}

// ─────────────────────────────────────────────────────────────
//  HOOK COMBINADO — mantém interface igual ao hook original
//  para não exigir alterações nos componentes existentes
// ─────────────────────────────────────────────────────────────

export function useDashboard() {
  const [periodo, setPeriodo] = useState('mes');
  const qc = useQueryClient();

  const kpisQuery    = useDashboardKpis(periodo);
  const grafQuery    = useDashboardGraficos();
  const alertasQuery = useDashboardAlertas();

  const atualizar = () => {
    qc.invalidateQueries(['dashboard-kpis', periodo]);
    qc.invalidateQueries('dashboard-graficos');
    qc.invalidateQueries('dashboard-alertas');
  };

  const grafData = grafQuery.data;

  return {
    // dados
    kpis:           kpisQuery.data    ?? null,
    graficoReceita: grafData?.graficoReceita ?? [],
    graficoMaq:     grafData?.graficoMaq     ?? [],
    alertas:        alertasQuery.data ?? null,
    distribuicao:   grafData?.distribuicao   ?? [],
    topClientes:    grafData?.topClientes    ?? [],
    inadimplencia:  grafData?.inadimplencia  ?? [],

    // estados de carregamento
    loadingKpis:   kpisQuery.isLoading,
    loadingCharts: grafQuery.isLoading,

    // última atualização (timestamp dos dados do React Query)
    atualizadoEm: kpisQuery.dataUpdatedAt
      ? new Date(kpisQuery.dataUpdatedAt)
      : null,

    // controles
    atualizar,
    setPeriodo,
    periodo,
  };
}
