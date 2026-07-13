import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  Plus, Wallet, CheckCircle2, Clock, Ban, Edit2, Trash2,
  TrendingDown, AlertCircle, RefreshCcw, DollarSign, Filter,
} from 'lucide-react';
import { gastosApi } from '../../services/api';
import {
  Gasto, KpiGastos, EvolucaoGasto, CategoriaGasto, SituacaoGasto,
  CATEGORIA_GASTO_LABEL, CATEGORIA_GASTO_COLOR,
  SITUACAO_GASTO_LABEL, SITUACAO_GASTO_COLOR,
} from '../../types';
import toast from 'react-hot-toast';
import { fmtMoeda, fmtMes, fmtDataBR } from '../../utils/format';

// ── Constantes ─────────────────────────────────────────────────
const CATEGORIAS: CategoriaGasto[] = [
  'aluguel','energia','agua','contabilidade','folha','impostos',
  'combustivel','manutencao','fornecedor','telefone','software','outros',
];

// ── Schema ─────────────────────────────────────────────────────
const schema = z.object({
  categoria:       z.enum(['aluguel','energia','agua','contabilidade','folha','impostos',
                            'combustivel','manutencao','fornecedor','telefone','software','outros']),
  descricao:       z.string().min(2, 'Informe uma descrição'),
  fornecedor:      z.string().optional(),
  valor:           z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  competencia:     z.string().min(7, 'Selecione o mês'),
  data_vencimento: z.string().optional(),
  data_pagamento:  z.string().optional(),
  situacao:        z.enum(['pendente','pago','cancelado']).optional(),
  nota_fiscal:     z.string().optional(),
  observacao:      z.string().optional(),
  recorrente:      z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Badge situação ─────────────────────────────────────────────
function SituacaoBadge({ s }: { s: SituacaoGasto }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${SITUACAO_GASTO_COLOR[s]}`}>
      {s === 'pago'      && <CheckCircle2 className="w-3 h-3" />}
      {s === 'pendente'  && <Clock className="w-3 h-3" />}
      {s === 'cancelado' && <Ban className="w-3 h-3" />}
      {SITUACAO_GASTO_LABEL[s]}
    </span>
  );
}

// ── Badge categoria ────────────────────────────────────────────
function CategoriaBadge({ c }: { c: CategoriaGasto }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_GASTO_COLOR[c]}`}>
      {CATEGORIA_GASTO_LABEL[c]}
    </span>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function GastosPage() {
  const qc = useQueryClient();
  const [mes, setMes]                   = useState(mesAtual());
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSituacao, setFiltroSituacao]   = useState('');
  const [filtroBusca, setFiltroBusca]         = useState('');
  const [showForm, setShowForm]               = useState(false);
  const [editando, setEditando]               = useState<Gasto | null>(null);
  const [pagarId, setPagarId]                 = useState<string | null>(null);

  // Queries
  const { data: gastos = [], isLoading } = useQuery<Gasto[]>({
    queryKey: ['gastos', mes, filtroCategoria, filtroSituacao, filtroBusca],
    queryFn:  () => gastosApi.listar({
      competencia: mes + '-01',
      ...(filtroCategoria ? { categoria: filtroCategoria } : {}),
      ...(filtroSituacao  ? { situacao: filtroSituacao }   : {}),
      ...(filtroBusca     ? { busca: filtroBusca }         : {}),
    }),
  });

  const { data: kpi } = useQuery<KpiGastos>({
    queryKey: ['gastos-kpi', mes],
    queryFn:  () => gastosApi.kpi(mes + '-01'),
  });

  const { data: evolucao = [] } = useQuery<EvolucaoGasto[]>({
    queryKey: ['gastos-evolucao'],
    queryFn:  () => gastosApi.evolucao(6),
  });

  const { data: vencendo = [] } = useQuery<Gasto[]>({
    queryKey: ['gastos-vencendo'],
    queryFn:  () => gastosApi.vencendo(7),
  });

  // Mutations
  const mutCriar = useMutation({
    mutationFn: (dto: any) => gastosApi.criar(dto),
    onSuccess: () => {
      toast.success('Gasto registrado!');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
      qc.invalidateQueries({ queryKey: ['gastos-evolucao'] });
      fecharForm();
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => gastosApi.atualizar(id, dto),
    onSuccess: () => {
      toast.success('Gasto atualizado!');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
      fecharForm();
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  const mutPagar = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => gastosApi.pagar(id, dto),
    onSuccess: () => {
      toast.success('Pagamento registrado!');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
      setPagarId(null);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  const mutCancelar = useMutation({
    mutationFn: (id: string) => gastosApi.cancelar(id),
    onSuccess: () => {
      toast.success('Gasto cancelado.');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => gastosApi.excluir(id),
    onSuccess: () => {
      toast.success('Gasto excluído.');
      qc.invalidateQueries({ queryKey: ['gastos'] });
      qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  const mutDuplicar = useMutation({
    mutationFn: (competencia: string) => gastosApi.duplicarRecorrentes(competencia),
    onSuccess: (data: any) => {
      if (data.duplicados > 0) {
        toast.success(`${data.duplicados} gasto(s) recorrente(s) copiado(s) para ${fmtMes(data.competencia)}!`);
        qc.invalidateQueries({ queryKey: ['gastos'] });
        qc.invalidateQueries({ queryKey: ['gastos-kpi'] });
      } else {
        toast('Nenhum gasto recorrente do mês anterior para copiar.', { icon: 'ℹ️' });
      }
    },
    onError: (e: any) => { toast.error(e.response?.data?.message ?? 'Erro'); },
  });

  // Form
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { situacao: 'pendente', competencia: mes, recorrente: false },
  });

  const [pagarData, setPagarData] = useState('');

  function abrirEdicao(g: Gasto) {
    setEditando(g);
    setShowForm(true);
    reset({
      categoria:       g.categoria,
      descricao:       g.descricao,
      fornecedor:      g.fornecedor ?? '',
      valor:           g.valor,
      competencia:     g.competencia.slice(0, 7),
      data_vencimento: g.data_vencimento ?? '',
      data_pagamento:  g.data_pagamento  ?? '',
      situacao:        g.situacao,
      nota_fiscal:     g.nota_fiscal     ?? '',
      observacao:      g.observacao      ?? '',
      recorrente:      g.recorrente,
    });
  }

  function fecharForm() {
    setShowForm(false); setEditando(null); reset({
      situacao: 'pendente', competencia: mes, recorrente: false,
    });
  }

  function onSubmit(data: FormData) {
    const dto = { ...data, competencia: data.competencia + '-01' };
    if (editando) {
      mutAtualizar.mutate({ id: editando.id, dto });
    } else {
      mutCriar.mutate(dto);
    }
  }

  // Vencidos hoje ou antes
  const hoje = new Date().toISOString().split('T')[0];
  const gastosVencidos = gastos.filter(
    g => g.situacao === 'pendente' && g.data_vencimento && g.data_vencimento < hoje
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-red-500" />
            Gastos Operacionais
          </h1>
          <p className="text-sm text-gray-500 mt-1">Controle de despesas e contas a pagar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => mutDuplicar.mutate(mes + '-01')}
            disabled={mutDuplicar.isLoading}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Copia gastos recorrentes do mês anterior"
          >
            <RefreshCcw className="w-4 h-4" />
            Copiar Recorrentes
          </button>
          <button
            onClick={() => { fecharForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Gasto
          </button>
        </div>
      </div>

      {/* Alerta vencendo em 7 dias */}
      {vencendo.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {vencendo.length} conta{vencendo.length > 1 ? 's' : ''} a pagar nos próximos 7 dias
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {vencendo.slice(0, 3).map(g => `${g.descricao} (${fmtDataBR(g.data_vencimento!)})`).join(' · ')}
              {vencendo.length > 3 ? ` e mais ${vencendo.length - 3}...` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Alerta vencidos */}
      {gastosVencidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">
            {gastosVencidos.length} gasto{gastosVencidos.length > 1 ? 's' : ''} vencido{gastosVencidos.length > 1 ? 's' : ''} sem pagamento registrado
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total do Mês</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmtMoeda(kpi?.total_geral ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{fmtMes(mes + '-01')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pago</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmtMoeda(kpi?.total_pago ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {kpi?.total_geral ? Math.round((kpi.total_pago / kpi.total_geral) * 100) : 0}% do total
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pendente</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{fmtMoeda(kpi?.total_pendente ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">a pagar</p>
        </div>
      </div>

      {/* Gráfico + por categoria */}
      <div className="grid grid-cols-5 gap-4">
        {/* Evolução mensal */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolução de Gastos — 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={evolucao} barSize={20} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number, name: string) => [fmtMoeda(v), name === 'total' ? 'Total' : 'Pago']}
                labelStyle={{ fontWeight: 600, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'total' ? 'Total' : 'Pago'} />
              <Bar dataKey="total" fill="#fca5a5" radius={[4,4,0,0]} />
              <Bar dataKey="pago"  fill="#86efac" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por categoria */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 overflow-auto max-h-72">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Categoria — {fmtMes(mes + '-01')}</h3>
          {(!kpi || kpi.por_categoria.length === 0) ? (
            <p className="text-xs text-gray-400 text-center py-6">Sem gastos no mês</p>
          ) : (
            <div className="space-y-2">
              {kpi.por_categoria
                .sort((a, b) => b.total - a.total)
                .map(c => (
                  <div key={c.categoria} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700 truncate">{CATEGORIA_GASTO_LABEL[c.categoria]}</span>
                        <span className="font-medium text-gray-900 ml-2">{fmtMoeda(c.total)}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${Math.min(100, (c.total / (kpi.total_geral || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{CATEGORIA_GASTO_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Situação</label>
          <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Busca</label>
          <input type="text" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
            placeholder="Descrição ou fornecedor..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editando ? 'Editar Gasto' : 'Novo Gasto'}
              </h2>
              <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select {...register('categoria')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{CATEGORIA_GASTO_LABEL[c]}</option>
                    ))}
                  </select>
                  {errors.categoria && <p className="text-red-500 text-xs mt-1">{errors.categoria.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competência</label>
                  <input type="month" {...register('competencia')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  {errors.competencia && <p className="text-red-500 text-xs mt-1">{errors.competencia.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input {...register('descricao')} placeholder="Ex: Aluguel do galpão, IPTU..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                  <input {...register('fornecedor')} placeholder="Opcional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" min="0.01" {...register('valor', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                  <input type="date" {...register('data_vencimento')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                  <select {...register('situacao')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal</label>
                  <input {...register('nota_fiscal')} placeholder="Nº da NF"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" {...register('recorrente')} className="w-4 h-4 accent-red-500" />
                    Gasto recorrente (mensal)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea {...register('observacao')} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Opcional" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fecharForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={mutCriar.isLoading || mutAtualizar.isLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {editando ? 'Salvar Alterações' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar pagamento */}
      {pagarId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Pagamento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do pagamento</label>
                <input type="date" value={pagarData} onChange={e => setPagarData(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPagarId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!pagarData) { toast.error('Informe a data de pagamento'); return; }
                    mutPagar.mutate({ id: pagarId, dto: { data_pagamento: pagarData } });
                  }}
                  disabled={mutPagar.isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de gastos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando gastos...</div>
        ) : gastos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum gasto em {fmtMes(mes + '-01')}</p>
            <p className="text-sm mt-1">Clique em "Novo Gasto" ou use "Copiar Recorrentes".</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Situação</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.map(g => {
                const vencido = g.situacao === 'pendente' && g.data_vencimento && g.data_vencimento < hoje;
                return (
                  <tr key={g.id} className={`hover:bg-gray-50 transition-colors ${vencido ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{g.descricao}</p>
                          {g.fornecedor && <p className="text-xs text-gray-400">{g.fornecedor}</p>}
                          {g.recorrente && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 font-medium">
                              <RefreshCcw className="w-2.5 h-2.5" /> recorrente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CategoriaBadge c={g.categoria} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmtMoeda(g.valor)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.data_vencimento ? (
                        <span className={vencido ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {fmtDataBR(g.data_vencimento)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SituacaoBadge s={g.situacao} />
                      {g.data_pagamento && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDataBR(g.data_pagamento)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {g.situacao === 'pendente' && (
                          <button
                            onClick={() => { setPagarId(g.id); setPagarData(hoje); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Registrar pagamento"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {g.situacao !== 'cancelado' && (
                          <button onClick={() => abrirEdicao(g)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {g.situacao === 'pendente' && (
                          <button
                            onClick={() => { if (confirm('Cancelar este gasto?')) mutCancelar.mutate(g.id); }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Cancelar">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {g.situacao === 'cancelado' && (
                          <button
                            onClick={() => { if (confirm('Excluir definitivamente?')) mutExcluir.mutate(g.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {fmtMoeda(gastos.filter(g => g.situacao !== 'cancelado').reduce((s, g) => s + Number(g.valor), 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
