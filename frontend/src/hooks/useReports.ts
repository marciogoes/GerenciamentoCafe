import { useQuery, useMutation } from 'react-query';
import { reportsApi }           from '../services/api';
import { toast }                from 'react-hot-toast';

// Utilitário: salva Blob como arquivo no browser
function baixarArquivo(blob: Blob, nomeArquivo: string) {
  const url = window.URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ── RF-R01: Relatório Financeiro ───────────────────────────────
export function useRelatorioFinanceiro(dataInicio?: string, dataFim?: string) {
  return useQuery(
    ['reports', 'financeiro', dataInicio, dataFim],
    () => reportsApi.financeiro(dataInicio, dataFim).then(r => r.data),
    { staleTime: 60_000, keepPreviousData: true },
  );
}

export function useExportarFinanceiro() {
  return useMutation(
    ({ di, df }: { di: string; df: string }) =>
      reportsApi.financeiroExcel(di, df).then(r => r.data as Blob),
    {
      onSuccess: (blob, { di, df }) => {
        baixarArquivo(blob, `relatorio-financeiro-${di}-${df}.xlsx`);
        toast.success('Relatório financeiro exportado!');
      },
      onError: () => { toast.error('Erro ao exportar relatório financeiro.'); },
    },
  );
}

// ── RF-R02: Relatório de Contratos ────────────────────────────
export function useRelatorioContratos() {
  return useQuery(
    ['reports', 'contratos'],
    () => reportsApi.contratos().then(r => r.data),
    { staleTime: 60_000 },
  );
}

export function useExportarContratos() {
  return useMutation(
    () => reportsApi.contratosExcel().then(r => r.data as Blob),
    {
      onSuccess: blob => {
        baixarArquivo(blob, 'relatorio-contratos.xlsx');
        toast.success('Relatório de contratos exportado!');
      },
      onError: () => { toast.error('Erro ao exportar contratos.'); },
    },
  );
}

// ── RF-R04: Relatório de Máquinas ────────────────────────────
export function useRelatorioMaquinas(dataInicio?: string, dataFim?: string) {
  return useQuery(
    ['reports', 'maquinas', dataInicio, dataFim],
    () => reportsApi.maquinas(dataInicio, dataFim).then(r => r.data),
    { staleTime: 60_000, keepPreviousData: true },
  );
}

export function useExportarMaquinas() {
  return useMutation(
    ({ di, df }: { di: string; df: string }) =>
      reportsApi.maquinasExcel(di, df).then(r => r.data as Blob),
    {
      onSuccess: (blob, { di, df }) => {
        baixarArquivo(blob, `relatorio-maquinas-${di}-${df}.xlsx`);
        toast.success('Relatório de máquinas exportado!');
      },
      onError: () => { toast.error('Erro ao exportar máquinas.'); },
    },
  );
}

// ── RF-R05: Exportar Estoque ──────────────────────────────────
export function useExportarEstoque() {
  return useMutation(
    () => reportsApi.estoqueExcel().then(r => r.data as Blob),
    {
      onSuccess: blob => {
        baixarArquivo(blob, 'relatorio-estoque.xlsx');
        toast.success('Relatório de estoque exportado!');
      },
      onError: () => { toast.error('Erro ao exportar estoque.'); },
    },
  );
}
