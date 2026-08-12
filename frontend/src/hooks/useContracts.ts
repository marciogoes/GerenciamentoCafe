import { useQuery, useMutation, useQueryClient } from 'react-query';
import { clientsApi, contractsApi, invoicesApi, getErrorMessage } from '../services/api';
import type {
  Cliente, Contrato, LancamentoMensal, ItemInadimplencia, MaquinaDoContrato,
} from '../types';
import toast from 'react-hot-toast';

// ── Clientes ─────────────────────────────────────────────────

export function useClientes(params?: Record<string, string>) {
  return useQuery<Cliente[]>(
    ['clientes', params],
    async () => {
      const { data } = await clientsApi.listar(params);
      return data;
    },
    { staleTime: 30_000 },
  );
}

export function useCliente(id: string | undefined) {
  return useQuery<Cliente>(
    ['cliente', id],
    async () => {
      const { data } = await clientsApi.buscar(id!);
      return data;
    },
    { enabled: !!id },
  );
}

export function useCriarCliente() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => clientsApi.criar(dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('clientes');
        toast.success('Cliente cadastrado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAtualizarCliente() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => clientsApi.atualizar(id, dto).then(r => r.data),
    {
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries('clientes');
        qc.invalidateQueries(['cliente', id]);
        toast.success('Cliente atualizado!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ── Contratos ────────────────────────────────────────────────

export function useContratos(params?: Record<string, string>) {
  return useQuery<Contrato[]>(
    ['contratos', params],
    async () => {
      const { data } = await contractsApi.listar(params);
      return data;
    },
    { staleTime: 30_000 },
  );
}

export function useContrato(id: string | undefined) {
  return useQuery<Contrato>(
    ['contrato', id],
    async () => {
      const { data } = await contractsApi.buscar(id!);
      return data;
    },
    { enabled: !!id },
  );
}

export function useCriarContrato() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => contractsApi.criar(dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('contratos');
        qc.invalidateQueries('clientes');
        toast.success('Contrato criado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAtualizarContrato() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => contractsApi.atualizar(id, dto).then(r => r.data),
    {
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries('contratos');
        qc.invalidateQueries(['contrato', id]);
        toast.success('Contrato atualizado!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useExcluirContrato() {
  const qc = useQueryClient();
  return useMutation(
    (id: string) => contractsApi.excluir(id).then(r => r.data),
    {
      onSuccess: (r: any) => {
        qc.invalidateQueries('contratos');
        qc.invalidateQueries('clientes');
        toast.success(r?.mensagem ?? 'Contrato removido.');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useAplicarReajuste() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => contractsApi.reajustar(id, dto).then(r => r.data),
    {
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries('contratos');
        qc.invalidateQueries(['contrato', id]);
        toast.success('Reajuste aplicado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ── Máquinas do contrato (ERR-03, relação N:N) ───────────────

export function useMaquinasDoContrato(contratoId: string | undefined) {
  return useQuery<MaquinaDoContrato[]>(
    ['contrato-maquinas', contratoId],
    async () => {
      const { data } = await contractsApi.maquinas(contratoId!);
      return data;
    },
    { enabled: !!contratoId, staleTime: 30_000 },
  );
}

export function useVincularMaquina() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, maquina_id }: { id: string; maquina_id: string }) =>
      contractsApi.vincular(id, maquina_id).then(r => r.data),
    {
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries(['contrato-maquinas', id]);
        qc.invalidateQueries(['contrato', id]);
        qc.invalidateQueries('contratos');
        qc.invalidateQueries('maquinas');
        toast.success('Máquina vinculada ao contrato.');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useDesvincularMaquina() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, maquinaId }: { id: string; maquinaId: string }) =>
      contractsApi.desvincular(id, maquinaId).then(r => r.data),
    {
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries(['contrato-maquinas', id]);
        qc.invalidateQueries(['contrato', id]);
        qc.invalidateQueries('contratos');
        qc.invalidateQueries('maquinas');
        toast.success('Máquina desvinculada.');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

// ── Lançamentos / Cobranças ──────────────────────────────────

export function useLancamentos(params?: Record<string, string>) {
  return useQuery<LancamentoMensal[]>(
    ['lancamentos', params],
    async () => {
      const { data } = await invoicesApi.listar(params);
      return data;
    },
    { staleTime: 20_000 },
  );
}

export function useGerarLancamentos() {
  const qc = useQueryClient();
  return useMutation(
    (dto: any) => invoicesApi.gerar(dto).then(r => r.data),
    {
      onSuccess: (data) => {
        qc.invalidateQueries('lancamentos');
        qc.invalidateQueries('dashboardKpis');
        toast.success(`${data.gerados} lançamento(s) gerados com sucesso!`);
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useRegistrarPagamento() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: any }) => invoicesApi.pagar(id, dto).then(r => r.data),
    {
      onSuccess: () => {
        qc.invalidateQueries('lancamentos');
        qc.invalidateQueries('inadimplencia');
        qc.invalidateQueries('dashboardKpis');
        qc.invalidateQueries('dashboardAlertas');
        toast.success('Pagamento registrado com sucesso!');
      },
      onError: (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );
}

export function useInadimplencia() {
  return useQuery<ItemInadimplencia[]>(
    'inadimplencia',
    async () => {
      const { data } = await invoicesApi.inadimplencia();
      return data;
    },
    { staleTime: 60_000 },
  );
}
