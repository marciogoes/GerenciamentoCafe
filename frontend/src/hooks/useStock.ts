import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { stockApi, getErrorMessage } from '../services/api';
import type { Produto, MovimentacaoEstoque, ResumoEstoque, RelatorioEstoque } from '../types';

// ─────────────────────────────────────────────────────────────
//  PRODUTOS
// ─────────────────────────────────────────────────────────────

export function useProdutos(params?: Record<string, string>) {
  return useQuery<Produto[]>(
    ['produtos', params],
    async () => {
      const { data } = await stockApi.produtos(params);
      return data;
    },
    { staleTime: 30_000 },
  );
}

export function useProduto(id: string | undefined) {
  return useQuery<Produto>(
    ['produto', id],
    async () => {
      const { data } = await stockApi.produto(id!);
      return data;
    },
    { enabled: !!id },
  );
}

export function useCriarProduto() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => stockApi.criarProduto(dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('produtos');
        qc.invalidateQueries('resumo-estoque');
        toast.success('Produto cadastrado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAtualizarProduto() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => stockApi.atualizarProduto(id, dto).then(r => r.data),
    {
      onSuccess: (_d: any, { id }: { id: string }) => {
        qc.invalidateQueries(['produto', id]);
        qc.invalidateQueries('produtos');
        toast.success('Produto atualizado!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ─────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES
// ─────────────────────────────────────────────────────────────

export function useMovimentacoes(params?: Record<string, string>) {
  return useQuery<MovimentacaoEstoque[]>(
    ['movimentacoes-estoque', params],
    async () => {
      const { data } = await stockApi.historico(params);
      return data;
    },
    { staleTime: 30_000 },
  );
}

export function useRegistrarEntrada() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => stockApi.entrada(dto).then(r => r.data),
    {
      onSuccess: (result: any) => {
        qc.invalidateQueries('produtos');
        qc.invalidateQueries('movimentacoes-estoque');
        qc.invalidateQueries('resumo-estoque');
        qc.invalidateQueries('alertas-estoque');
        const msg = `Entrada registrada! Novo saldo: ${Number(result.saldo_atual).toFixed(3)}`;
        toast.success(msg);
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useRegistrarSaida() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => stockApi.saida(dto).then(r => r.data),
    {
      onSuccess: (result: any) => {
        qc.invalidateQueries('produtos');
        qc.invalidateQueries('movimentacoes-estoque');
        qc.invalidateQueries('resumo-estoque');
        qc.invalidateQueries('alertas-estoque');
        const alerta = result.alerta_estoque ? ' ⚠️ Estoque abaixo do mínimo!' : '';
        toast.success(`Saída registrada! Novo saldo: ${Number(result.saldo_atual).toFixed(3)}${alerta}`);
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ─────────────────────────────────────────────────────────────
//  ALERTAS E RESUMO
// ─────────────────────────────────────────────────────────────

export function useAlertasEstoque() {
  return useQuery<Produto[]>(
    ['alertas-estoque'],
    async () => {
      const { data } = await stockApi.alertas();
      return data;
    },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
}

export function useResumoEstoque() {
  return useQuery<ResumoEstoque>(
    ['resumo-estoque'],
    async () => {
      const { data } = await stockApi.resumo();
      return data;
    },
    { staleTime: 30_000, refetchInterval: 60_000 },
  );
}

export function useRelatorioEstoque(dataInicio?: string, dataFim?: string) {
  return useQuery<RelatorioEstoque>(
    ['relatorio-estoque', dataInicio, dataFim],
    async () => {
      const { data } = await stockApi.relatorio(dataInicio, dataFim);
      return data;
    },
    { staleTime: 5 * 60_000, enabled: true },
  );
}
