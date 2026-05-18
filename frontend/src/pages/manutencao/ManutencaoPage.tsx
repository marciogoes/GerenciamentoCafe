import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, Plus, Wrench, X, CheckCircle2, XCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { manutencaoApi, getErrorMessage } from '../../services/api';
import type { Manutencao, KpiManutencao } from '../../types';
import {
  TIPO_MANUTENCAO_LABEL, SITUACAO_MANUTENCAO_LABEL, SITUACAO_MANUTENCAO_COLOR,
  PRIORIDADE_MANUTENCAO_LABEL, PRIORIDADE_MANUTENCAO_COLOR,
} from '../../types';
import { formataMoeda, fmtDate } from '../../utils/format';
import clsx from 'clsx';

// ── Schemas ──────────────────────────────────────────────────
const schemaNovo = z.object({
  maquina_id:    z.string().min(1, 'Informe o ID do patrimônio'),
  titulo:        z.string().min(3, 'Título obrigatório'),
  descricao:     z.string().optional(),
  tipo:          z.enum(['preventiva','corretiva','instalacao','limpeza','outros']),
  prioridade:    z.enum(['baixa','media','alta','urgente']),
  data_abertura: z.string().min(1, 'Data obrigatória'),
  tecnico:       z.string().optional(),
  fornecedor:    z.string().optional(),
  observacao:    z.string().optional(),
});
type FormNovo = z.infer<typeof schemaNovo>;

const schemaConcluir = z.object({
  data_conclusao: z.string().min(1, 'Data de conclusão obrigatória'),
  custo_pecas:    z.coerce.number().min(0).optional(),
  custo_mao_obra: z.coerce.number().min(0).optional(),
  nota_fiscal:    z.string().optional(),
  observacao:     z.string().optional(),
});
type FormConcluir = z.infer<typeof schemaConcluir>;

// ── Componente KPI Card ──────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', color ?? 'text-gray-800')}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function ManutencaoPage() {
  const qc = useQueryClient();
  const hoje = new Date().toISOString().split('T')[0];

  // Estado de modais e filtros
  const [modalNovo, setModalNovo]       = useState(false);
  const [modalConcluir, setModalConcluir] = useState<Manutencao | null>(null);
  const [detalhe, setDetalhe]           = useState<Manutencao | null>(null);
  const [filtroSit, setFiltroSit]       = useState<string>('');
  const [filtroTipo, setFiltroTipo]     = useState<string>('');

  // Queries
  const kpiQ  = useQuery<KpiManutencao>(['manutencao-kpis'],  () => manutencaoApi.kpis());
  const listaQ = useQuery<Manutencao[]>(
    ['manutencao', filtroSit, filtroTipo],
    () => manutencaoApi.listar({ situacao: filtroSit || undefined, tipo: filtroTipo || undefined }),
  );

  // Mutations
  const criarMut = useMutation(
    (dto: any) => manutencaoApi.criar(dto),
    {
      onSuccess: () => {
        toast.success('Chamado aberto com sucesso!');
        qc.invalidateQueries('manutencao');
        qc.invalidateQueries('manutencao-kpis');
        qc.invalidateQueries('maquinas');
        setModalNovo(false);
        formNovo.reset();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const iniciarMut = useMutation(
    (id: string) => manutencaoApi.iniciar(id),
    {
      onSuccess: () => {
        toast.success('Manutenção iniciada!');
        qc.invalidateQueries('manutencao');
        qc.invalidateQueries('manutencao-kpis');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const cancelarMut = useMutation(
    (id: string) => manutencaoApi.cancelar(id),
    {
      onSuccess: () => {
        toast.success('Chamado cancelado.');
        qc.invalidateQueries('manutencao');
        qc.invalidateQueries('manutencao-kpis');
        qc.invalidateQueries('maquinas');
        setDetalhe(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const concluirMut = useMutation(
    ({ id, dto }: { id: string; dto: any }) => manutencaoApi.concluir(id, dto),
    {
      onSuccess: () => {
        toast.success('Manutenção concluída! Máquina devolvida à frota.');
        qc.invalidateQueries('manutencao');
        qc.invalidateQueries('manutencao-kpis');
        qc.invalidateQueries('maquinas');
        qc.invalidateQueries('resumo-frota');
        setModalConcluir(null);
        formConcluir.reset();
        setDetalhe(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  // Forms
  const formNovo = useForm<FormNovo>({
    resolver: zodResolver(schemaNovo),
    defaultValues: { tipo: 'corretiva', prioridade: 'media', data_abertura: hoje },
  });

  const formConcluir = useForm<FormConcluir>({
    resolver: zodResolver(schemaConcluir),
    defaultValues: { data_conclusao: hoje, custo_pecas: 0, custo_mao_obra: 0 },
  });

  const kpi = kpiQ.data;
  const lista = listaQ.data ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manutenção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de chamados e custos de manutenção da frota</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Chamado
        </button>
      </div>

      {/* KPIs */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          <KpiCard label="Chamados Abertos"    value={kpi.abertas}             color="text-blue-700" />
          <KpiCard label="Em Andamento"        value={kpi.em_andamento}        color="text-yellow-600" />
          <KpiCard label="Concluídos"          value={kpi.concluidas}          color="text-green-700" />
          <KpiCard
            label="Custo Total (concluídos)"
            value={formataMoeda(kpi.custo_concluidas)}
            sub={`${kpi.maquinas_envolvidas} máq. envolvidas`}
            color="text-orange-700"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtroSit}
          onChange={e => setFiltroSit(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as situações</option>
          <option value="aberta">Aberta</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value="preventiva">Preventiva</option>
          <option value="corretiva">Corretiva</option>
          <option value="instalacao">Instalação</option>
          <option value="limpeza">Limpeza</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      {/* Tabela */}
      {listaQ.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum chamado de manutenção encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Máquina</th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Prioridade</th>
                  <th className="px-4 py-3 text-left">Situação</th>
                  <th className="px-4 py-3 text-left">Abertura</th>
                  <th className="px-4 py-3 text-right">Custo Total</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lista.map(m => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setDetalhe(m)}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-blue-700">
                      {m.maquina_patrimonio ?? m.maquina_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-[200px] truncate">{m.titulo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{TIPO_MANUTENCAO_LABEL[m.tipo]}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', PRIORIDADE_MANUTENCAO_COLOR[m.prioridade])}>
                        {PRIORIDADE_MANUTENCAO_LABEL[m.prioridade]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', SITUACAO_MANUTENCAO_COLOR[m.situacao])}>
                        {SITUACAO_MANUTENCAO_LABEL[m.situacao]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(m.data_abertura)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {m.custo_total > 0 ? formataMoeda(m.custo_total) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {m.situacao === 'aberta' && (
                          <button
                            title="Iniciar"
                            onClick={() => iniciarMut.mutate(m.id)}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(m.situacao === 'aberta' || m.situacao === 'em_andamento') && (
                          <>
                            <button
                              title="Concluir"
                              onClick={() => { setModalConcluir(m); formConcluir.setValue('data_conclusao', hoje); }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Cancelar"
                              onClick={() => { if (confirm('Cancelar este chamado?')) cancelarMut.mutate(m.id); }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal — Novo Chamado */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Abrir Chamado de Manutenção</h2>
              <button onClick={() => setModalNovo(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={formNovo.handleSubmit(dto => criarMut.mutate(dto))} className="p-6 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Patrimônio da Máquina *</label>
                  <input
                    {...formNovo.register('maquina_id')}
                    placeholder="ex: bc160-uuid"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formNovo.formState.errors.maquina_id && (
                    <p className="text-red-500 text-xs mt-1">{formNovo.formState.errors.maquina_id.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de Abertura *</label>
                  <input
                    type="date"
                    {...formNovo.register('data_abertura')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input
                  {...formNovo.register('titulo')}
                  placeholder="ex: Substituição da bomba d'água"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formNovo.formState.errors.titulo && (
                  <p className="text-red-500 text-xs mt-1">{formNovo.formState.errors.titulo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  {...formNovo.register('descricao')}
                  rows={3}
                  placeholder="Detalhes do problema..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    {...formNovo.register('tipo')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="corretiva">Corretiva</option>
                    <option value="preventiva">Preventiva</option>
                    <option value="instalacao">Instalação</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    {...formNovo.register('prioridade')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Técnico</label>
                  <input
                    {...formNovo.register('tecnico')}
                    placeholder="Nome do técnico"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor / Empresa</label>
                  <input
                    {...formNovo.register('fornecedor')}
                    placeholder="Empresa prestadora"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  {...formNovo.register('observacao')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarMut.isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg"
                >
                  {criarMut.isLoading ? 'Abrindo...' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Concluir Manutenção */}
      {modalConcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Concluir Manutenção</h2>
              <button onClick={() => setModalConcluir(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={formConcluir.handleSubmit(dto =>
                concluirMut.mutate({ id: modalConcluir.id, dto })
              )}
              className="p-6 space-y-4"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  Ao concluir, a máquina <strong>{modalConcluir.maquina_patrimonio}</strong> será
                  automaticamente devolvida para a frota (situação: Apta).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data de Conclusão *</label>
                <input
                  type="date"
                  {...formConcluir.register('data_conclusao')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custo de Peças (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...formConcluir.register('custo_pecas')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mão de Obra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...formConcluir.register('custo_mao_obra')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota Fiscal</label>
                <input
                  {...formConcluir.register('nota_fiscal')}
                  placeholder="ex: NF-00456"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações finais</label>
                <textarea
                  {...formConcluir.register('observacao')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConcluir(null)}
                  className="border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={concluirMut.isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg"
                >
                  {concluirMut.isLoading ? 'Salvando...' : 'Confirmar Conclusão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer de detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-bold text-gray-800">{detalhe.titulo}</h2>
              <button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', SITUACAO_MANUTENCAO_COLOR[detalhe.situacao])}>
                  {SITUACAO_MANUTENCAO_LABEL[detalhe.situacao]}
                </span>
                <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', PRIORIDADE_MANUTENCAO_COLOR[detalhe.prioridade])}>
                  {PRIORIDADE_MANUTENCAO_LABEL[detalhe.prioridade]}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {TIPO_MANUTENCAO_LABEL[detalhe.tipo]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Máquina:</span> <strong>{detalhe.maquina_patrimonio ?? '—'}</strong></div>
                <div><span className="text-gray-500">Abertura:</span> {fmtDate(detalhe.data_abertura)}</div>
                {detalhe.data_inicio    && <div><span className="text-gray-500">Início:</span> {fmtDate(detalhe.data_inicio)}</div>}
                {detalhe.data_conclusao && <div><span className="text-gray-500">Conclusão:</span> {fmtDate(detalhe.data_conclusao)}</div>}
                {detalhe.tecnico       && <div><span className="text-gray-500">Técnico:</span> {detalhe.tecnico}</div>}
                {detalhe.fornecedor    && <div><span className="text-gray-500">Fornecedor:</span> {detalhe.fornecedor}</div>}
                {detalhe.nota_fiscal   && <div><span className="text-gray-500">NF:</span> {detalhe.nota_fiscal}</div>}
              </div>

              {detalhe.descricao && (
                <div>
                  <p className="text-gray-500 mb-1">Descrição:</p>
                  <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{detalhe.descricao}</p>
                </div>
              )}

              {(detalhe.custo_pecas > 0 || detalhe.custo_mao_obra > 0) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 grid grid-cols-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Peças</p>
                    <p className="font-semibold text-orange-700">{formataMoeda(detalhe.custo_pecas)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mão de Obra</p>
                    <p className="font-semibold text-orange-700">{formataMoeda(detalhe.custo_mao_obra)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-orange-800">{formataMoeda(detalhe.custo_total)}</p>
                  </div>
                </div>
              )}

              {detalhe.observacao && (
                <div>
                  <p className="text-gray-500 mb-1">Observações:</p>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{detalhe.observacao}</p>
                </div>
              )}

              {/* Ações no detalhe */}
              {(detalhe.situacao === 'aberta' || detalhe.situacao === 'em_andamento') && (
                <div className="flex gap-3 pt-2 border-t">
                  {detalhe.situacao === 'aberta' && (
                    <button
                      onClick={() => { iniciarMut.mutate(detalhe.id); setDetalhe(null); }}
                      className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      <PlayCircle className="w-4 h-4" /> Iniciar
                    </button>
                  )}
                  <button
                    onClick={() => { setModalConcluir(detalhe); setDetalhe(null); }}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Concluir
                  </button>
                  <button
                    onClick={() => { if (confirm('Cancelar este chamado?')) { cancelarMut.mutate(detalhe.id); } }}
                    className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm px-4 py-2 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
