import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Send, Trash2, Edit2, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, BarChart3, Droplets,
} from 'lucide-react';
import { dosesApi, contractsApi } from '../../services/api';
import { LeituraDoses } from '../../types';
import toast from 'react-hot-toast';
import { fmtMes } from '../../utils/format';

// ── Schema ───────────────────────────────────────────────────
const schema = z.object({
  contrato_id:    z.string().min(1, 'Selecione o contrato'),
  cliente_id:     z.string().min(1),
  maquina_id:     z.string().optional(),
  competencia:    z.string().min(7, 'Selecione o mês'),
  dose_inicial:   z.coerce.number().min(0),
  dose_final:     z.coerce.number().min(0),
  observacao:     z.string().optional(),
}).refine(d => d.dose_final >= d.dose_inicial, {
  message: 'Dose final não pode ser menor que dose inicial',
  path: ['dose_final'],
});
type FormData = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────
function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function compToInput(comp: string) {
  return comp?.slice(0, 7) ?? mesAtual();
}

// ── Componente ────────────────────────────────────────────────
export default function DosesPage() {
  const qc = useQueryClient();
  const [mes, setMes]                 = useState(mesAtual());
  const [filtroCliente, setFiltroCliente] = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editando, setEditando]       = useState<LeituraDoses | null>(null);
  const [expandResumo, setExpandResumo] = useState(false);

  // Queries
  const { data: leituras = [], isLoading } = useQuery({
    queryKey: ['doses', mes, filtroCliente],
    queryFn: () => dosesApi.listar({
      competencia: mes + '-01',
      ...(filtroCliente ? { cliente_id: filtroCliente } : {}),
    }),
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos-comodato'],
    queryFn: () => contractsApi.listar({ tipo: 'comodato', situacao: 'ativo' }).then((r: any) => r.data ?? r),
  });

  const { data: resumo = [] } = useQuery({
    queryKey: ['doses-resumo'],
    queryFn: () => dosesApi.resumo(6),
    enabled: expandResumo,
  });

  const { data: pendentes = [] } = useQuery({
    queryKey: ['doses-pendente-envio'],
    queryFn: () => dosesApi.pendenteEnvio(),
  });

  // Mutations
  const mutCriar = useMutation({
    mutationFn: (dto: any) => dosesApi.criar(dto),
    onSuccess: () => {
      toast.success('Leitura registrada com sucesso!');
      qc.invalidateQueries({ queryKey: ['doses'] });
      qc.invalidateQueries({ queryKey: ['doses-pendente-envio'] });
      setShowForm(false); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao registrar leitura'),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => dosesApi.atualizar(id, dto),
    onSuccess: () => {
      toast.success('Leitura atualizada!');
      qc.invalidateQueries({ queryKey: ['doses'] });
      setEditando(null); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar'),
  });

  const mutEnviar = useMutation({
    mutationFn: ({ id, data_envio }: { id: string; data_envio: string }) =>
      dosesApi.marcarEnvio(id, data_envio),
    onSuccess: () => {
      toast.success('Marcada como enviada ao contratante!');
      qc.invalidateQueries({ queryKey: ['doses'] });
      qc.invalidateQueries({ queryKey: ['doses-pendente-envio'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro'),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => dosesApi.excluir(id),
    onSuccess: () => {
      toast.success('Leitura excluída.');
      qc.invalidateQueries({ queryKey: ['doses'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao excluir'),
  });

  // Form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { competencia: mes, dose_inicial: 0, dose_final: 0 },
  });

  const contratoSelecionado = watch('contrato_id');
  const di = watch('dose_inicial') ?? 0;
  const df = watch('dose_final')   ?? 0;
  const totalPreview = Math.max(0, df - di);

  function abrirEdicao(l: LeituraDoses) {
    setEditando(l);
    setShowForm(true);
    reset({
      contrato_id:  l.contrato_id,
      cliente_id:   l.cliente_id,
      maquina_id:   l.maquina_id ?? '',
      competencia:  compToInput(l.competencia),
      dose_inicial: l.dose_inicial,
      dose_final:   l.dose_final,
      observacao:   l.observacao ?? '',
    });
  }

  function fecharForm() {
    setShowForm(false); setEditando(null); reset();
  }

  function onContratoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const contratoId = e.target.value;
    setValue('contrato_id', contratoId);
    const c = (contratos as any[]).find((x: any) => x.id === contratoId);
    if (c) {
      setValue('cliente_id', c.cliente_id);
      setValue('maquina_id', c.maquina_id ?? '');
    }
  }

  function onSubmit(data: FormData) {
    const dto = {
      ...data,
      competencia: data.competencia + '-01',
    };
    if (editando) {
      mutAtualizar.mutate({ id: editando.id, dto: { dose_inicial: dto.dose_inicial, dose_final: dto.dose_final, observacao: dto.observacao } });
    } else {
      mutCriar.mutate(dto);
    }
  }

  function handleEnviar(l: LeituraDoses) {
    const hoje = new Date().toISOString().split('T')[0];
    mutEnviar.mutate({ id: l.id, data_envio: hoje });
  }

  // KPI rápido do mês filtrado
  const totalDosesMes  = leituras.reduce((s: number, l: LeituraDoses) => s + l.total_doses, 0);
  const qtdEnviadas    = leituras.filter((l: LeituraDoses) => l.enviado_contratante).length;
  const qtdPendentes   = leituras.filter((l: LeituraDoses) => !l.enviado_contratante).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="w-7 h-7 text-blue-600" />
            Leituras de Doses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro mensal de doses para contratos de comodato
          </p>
        </div>
        <button
          onClick={() => { fecharForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Leitura
        </button>
      </div>

      {/* Alerta pendentes de envio */}
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {pendentes.length} leitura{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''} de envio ao contratante
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Leituras registradas que ainda não foram marcadas como enviadas.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total de Doses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalDosesMes.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400 mt-1">{fmtMes(mes + '-01')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Enviadas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{qtdEnviadas}</p>
          <p className="text-xs text-gray-400 mt-1">leituras confirmadas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pendentes</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{qtdPendentes}</p>
          <p className="text-xs text-gray-400 mt-1">aguardando envio</p>
        </div>
      </div>

      {/* Resumo histórico (colapsável) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setExpandResumo(v => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Histórico dos últimos 6 meses
          </span>
          {expandResumo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {expandResumo && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {(resumo as any[]).map(r => (
                <div key={r.mes} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">{r.mes_label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{r.total_doses.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-gray-400">{r.qtd_leituras} registros</p>
                  <p className="text-[11px] mt-1">
                    <span className={r.enviadas === r.qtd_leituras ? 'text-green-600' : 'text-amber-500'}>
                      {r.enviadas}/{r.qtd_leituras} enviadas
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mês de competência</label>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por contrato</label>
          <select
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os contratos</option>
            {(contratos as any[]).map((c: any) => (
              <option key={c.id} value={c.cliente_id}>{c.cliente_nome} — {c.maquina_patrimonio}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Formulário modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editando ? 'Editar Leitura' : 'Nova Leitura de Doses'}
              </h2>
              <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrato (Comodato)</label>
                  <select
                    {...register('contrato_id')}
                    onChange={onContratoChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Selecione um contrato</option>
                    {(contratos as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.cliente_nome} — {c.maquina_patrimonio ?? 'sem máq.'} — R$ {Number(c.valor_mensal).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {errors.contrato_id && <p className="text-red-500 text-xs mt-1">{errors.contrato_id.message}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
                <input
                  type="month"
                  {...register('competencia')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={!!editando}
                />
                {errors.competencia && <p className="text-red-500 text-xs mt-1">{errors.competencia.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dose Inicial (contador)</label>
                  <input
                    type="number" min="0"
                    {...register('dose_inicial', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.dose_inicial && <p className="text-red-500 text-xs mt-1">{errors.dose_inicial.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dose Final (contador)</label>
                  <input
                    type="number" min="0"
                    {...register('dose_final', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {errors.dose_final && <p className="text-red-500 text-xs mt-1">{errors.dose_final.message}</p>}
                </div>
              </div>

              {/* Preview total */}
              <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Total de doses no mês:</span>
                <span className="text-2xl font-bold text-blue-800">{totalPreview.toLocaleString('pt-BR')}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea
                  {...register('observacao')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Opcional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fecharForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={mutCriar.isPending || mutAtualizar.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {editando ? 'Salvar Alterações' : 'Registrar Leitura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando leituras...</div>
        ) : leituras.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma leitura em {fmtMes(mes + '-01')}</p>
            <p className="text-sm mt-1">Clique em "Nova Leitura" para registrar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente / Máquina</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dose Inicial</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dose Final</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Enviado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(leituras as LeituraDoses[]).map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{l.cliente_nome ?? l.cliente_id}</p>
                    {l.maquina_patrimonio && (
                      <p className="text-xs text-gray-400">Patrimônio: {l.maquina_patrimonio}</p>
                    )}
                    {l.observacao && (
                      <p className="text-xs text-gray-400 italic mt-0.5">{l.observacao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.dose_inicial.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.dose_final.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{l.total_doses.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-center">
                    {l.enviado_contratante ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        {l.data_envio ? new Date(l.data_envio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sim'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <Clock className="w-4 h-4" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!l.enviado_contratante && (
                        <>
                          <button
                            onClick={() => abrirEdicao(l)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEnviar(l)}
                            disabled={mutEnviar.isPending}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Marcar como enviada ao contratante"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir esta leitura?')) mutExcluir.mutate(l.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
