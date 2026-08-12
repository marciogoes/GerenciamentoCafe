import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { machinesApi, catalogApi, getErrorMessage } from '../services/api';
import type {
  Maquina, MaquinaCompleta, MaquinaForaDaBase,
  ModeloCatalogo, ResumoFrota,
} from '../types';

// ─────────────────────────────────────────────────────────────
//  CATÁLOGO DE MODELOS
// ─────────────────────────────────────────────────────────────

export function useCatalogo() {
  return useQuery<ModeloCatalogo[]>(
    ['catalogo'],
    async () => {
      const { data } = await catalogApi.listar();
      return data;
    },
    { staleTime: 60_000 },
  );
}

export function useCriarModelo() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => catalogApi.criar(dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('catalogo');
        toast.success('Modelo cadastrado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAtualizarModelo() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => catalogApi.atualizar(id, dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('catalogo');
        toast.success('Modelo atualizado!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useExcluirModelo() {
  const qc = useQueryClient();
  return useMutation(
    (id: string) => catalogApi.excluir(id).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('catalogo');
        toast.success('Modelo removido!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ─────────────────────────────────────────────────────────────
//  MÁQUINAS — LISTAGEM E FROTA
// ─────────────────────────────────────────────────────────────

export function useMaquinas(params?: Record<string, string>) {
  return useQuery<Maquina[]>(
    ['maquinas', params],
    async () => {
      const { data } = await machinesApi.listar(params);
      return data;
    },
    { staleTime: 30_000 },
  );
}

export function useResumoFrota() {
  return useQuery<ResumoFrota>(
    ['resumo-frota'],
    async () => {
      const { data } = await machinesApi.resumoFrota();
      return data;
    },
    { refetchInterval: 60_000 },
  );
}

export function useMaquinasNaBase() {
  return useQuery(
    ['maquinas-na-base'],
    async () => {
      const { data } = await machinesApi.naBase();
      return data;
    },
  );
}

export function useMaquinasForaDaBase() {
  return useQuery<MaquinaForaDaBase[]>(
    ['maquinas-fora-da-base'],
    async () => {
      const { data } = await machinesApi.foraDaBase();
      return data;
    },
    { refetchInterval: 60_000 },
  );
}

export function useMaquina(id: string) {
  return useQuery<MaquinaCompleta>(
    ['maquina', id],
    async () => {
      const { data } = await machinesApi.buscar(id);
      return data;
    },
    { enabled: !!id },
  );
}

// ─────────────────────────────────────────────────────────────
//  MÁQUINAS — MUTATIONS (CRUD + MOVIMENTAÇÕES)
// ─────────────────────────────────────────────────────────────

export function useCriarMaquina() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => machinesApi.criar(dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('maquinas');
        qc.invalidateQueries('resumo-frota');
        toast.success('Máquina cadastrada com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAtualizarMaquina() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => machinesApi.atualizar(id, dto).then(r => r.data),
    {
      onSuccess: (_d: any, { id }: { id: string }) => {
        qc.invalidateQueries(['maquina', id]);
        qc.invalidateQueries('maquinas');
        toast.success('Máquina atualizada!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useExcluirMaquina() {
  const qc = useQueryClient();
  return useMutation(
    (id: string) => machinesApi.excluir(id).then(r => r.data),
    {
      onSuccess: (r: any) => {
        qc.invalidateQueries('maquinas');
        qc.invalidateQueries('resumo-frota');
        toast.success(r?.mensagem ?? 'Máquina removida.');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useRegistrarSaida() {
  const qc = useQueryClient();
  return useMutation(
    ({ maquinaId, dto }: { maquinaId: string; dto: any }) =>
      machinesApi.saida(maquinaId, dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('maquinas');
        qc.invalidateQueries('resumo-frota');
        qc.invalidateQueries('maquinas-na-base');
        qc.invalidateQueries('maquinas-fora-da-base');
        toast.success('Saída registrada com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useRegistrarRetorno() {
  const qc = useQueryClient();
  return useMutation(
    ({ movId, dto }: { movId: string; dto: any }) =>
      machinesApi.retorno(movId, dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('maquina');
        qc.invalidateQueries('maquinas');
        qc.invalidateQueries('resumo-frota');
        qc.invalidateQueries('maquinas-na-base');
        qc.invalidateQueries('maquinas-fora-da-base');
        toast.success('Retorno registrado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}
