import { useState, useMemo }           from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast                            from 'react-hot-toast';
import {
  CheckSquare, Clock, Minus, RotateCcw, ChevronLeft, ChevronRight,
  Plus, Settings, CheckCircle2, AlertCircle, Calendar,
} from 'lucide-react';
import clsx                             from 'clsx';
import { activitiesApi, getErrorMessage } from '../../services/api';

// ── Tipos ─────────────────────────────────────────────────────
type Situacao = 'pendente' | 'realizado' | 'nao_aplicavel';
type TipoAtiv = 'conta_fixa' | 'leitura_comodato' | 'atividade_interna';

interface Execucao {
  id: string;
  atividade_id: string;
  competencia: string;
  situacao: Situacao;
  data_realizacao: string | null;
  valor_realizado: number | null;
  observacao: string | null;
  modelo_descricao: string;
  modelo_tipo: TipoAtiv;
  modelo_dia_vencimento: number | null;
  modelo_valor_referencia: number | null;
}

// ── Helpers ───────────────────────────────────────────────────
function mesAnoAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function navMes(mesAno: string, delta: number): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMesAno(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const TIPO_LABEL: Record<TipoAtiv, string> = {
  conta_fixa:        'Contas a Pagar',
  leitura_comodato:  'Leituras Comodato',
  atividade_interna: 'Atividades Internas',
};

const TIPO_COLOR: Record<TipoAtiv, string> = {
  conta_fixa:        'bg-blue-50 border-blue-200',
  leitura_comodato:  'bg-green-50 border-green-200',
  atividade_interna: 'bg-purple-50 border-purple-200',
};

const TIPO_BADGE: Record<TipoAtiv, string> = {
  conta_fixa:        'bg-blue-100 text-blue-800',
  leitura_comodato:  'bg-green-100 text-green-800',
  atividade_interna: 'bg-purple-100 text-purple-800',
};

function br(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Modal de baixa ────────────────────────────────────────────
function ModalBaixa({
  execucao, onClose, onConfirm,
}: {
  execucao: Execucao;
  onClose: () => void;
  onConfirm: (data: { data_realizacao: string; valor_realizado?: number; observacao?: string }) => void;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [data, setData]   = useState(hoje);
  const [valor, setValor] = useState(
    execucao.modelo_valor_referencia ? String(execucao.modelo_valor_referencia) : '',
  );
  const [obs, setObs]     = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Registrar Realização</h2>
          <p className="text-sm text-gray-500 mt-1">{execucao.modelo_descricao}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de realização</label>
            <input
              type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor realizado
              {execucao.modelo_valor_referencia && (
                <span className="ml-1 text-gray-400 font-normal">
                  (referência: {br(execucao.modelo_valor_referencia)})
                </span>
              )}
            </label>
            <input
              type="number" step="0.01" value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
            <textarea
              value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({
              data_realizacao: data,
              valor_realizado: valor ? Number(valor) : undefined,
              observacao: obs || undefined,
            })}
            className="flex-1 py-2.5 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function ActivitiesPage() {
  const qc = useQueryClient();
  const [mesAno, setMesAno]           = useState(mesAnoAtual());
  const [modalBaixa, setModalBaixa]   = useState<Execucao | null>(null);
  const [filtroTipo, setFiltroTipo]   = useState<TipoAtiv | 'todos'>('todos');
  const [filtroSit,  setFiltroSit]    = useState<Situacao | 'todos'>('todos');
  const [modalModelos, setModalModelos] = useState(false);
  const competencia                   = mesAno + '-01';

  // Queries
  const { data: execucoes = [], isLoading } = useQuery(
    ['activities', competencia],
    () => activitiesApi.listar(competencia).then(r => r.data),
    { staleTime: 30_000 },
  );

  const { data: resumo } = useQuery(
    ['activities-resumo', competencia],
    () => activitiesApi.resumo(competencia).then(r => r.data),
    { staleTime: 30_000 },
  );

  // Mutations
  const invalidar = () => {
    qc.invalidateQueries(['activities', competencia]);
    qc.invalidateQueries(['activities-resumo', competencia]);
  };

  const mutBaixar = useMutation(
    ({ id, dto }: { id: string; dto: any }) => activitiesApi.baixar(id, dto),
    {
      onSuccess: () => { toast.success('Atividade registrada!'); invalidar(); setModalBaixa(null); },
      onError:   (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutNaoAplicavel = useMutation(
    (id: string) => activitiesApi.naoAplicavel(id),
    {
      onSuccess: () => { toast.success('Marcado como não aplicável'); invalidar(); },
      onError:   (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutReabrir = useMutation(
    (id: string) => activitiesApi.reabrir(id),
    {
      onSuccess: () => { toast.success('Atividade reaberta'); invalidar(); },
      onError:   (e) => toast.error(getErrorMessage(e)),
    },
  );

  const gerarMut = useMutation(
    (comp: string) => activitiesApi.gerar(comp).then(r => r.data),
    {
      onSuccess: (res: any) => {
        toast.success(
          res?.geradas > 0
            ? `${res.geradas} atividade(s) gerada(s) para o mês.`
            : 'Checklist já estava sincronizado para este mês.',
        );
        invalidar();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  // Filtragem
  const filtradas = useMemo(() => {
    return (execucoes as Execucao[]).filter(e => {
      if (filtroTipo !== 'todos' && e.modelo_tipo !== filtroTipo) return false;
      if (filtroSit  !== 'todos' && e.situacao    !== filtroSit)  return false;
      return true;
    });
  }, [execucoes, filtroTipo, filtroSit]);

  // Agrupa por tipo
  const porTipo = useMemo(() => {
    const grupos: Record<TipoAtiv, Execucao[]> = {
      conta_fixa: [], leitura_comodato: [], atividade_interna: [],
    };
    for (const e of filtradas) {
      grupos[e.modelo_tipo]?.push(e);
    }
    return grupos;
  }, [filtradas]);

  const pct = resumo?.total > 0
    ? Math.round((resumo.realizadas / resumo.total) * 100)
    : 0;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            Atividades Mensais
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Checklist de contas e atividades — {formatMesAno(mesAno)}
          </p>
        </div>

        {/* Ações + Navegação de mês */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalModelos(true)}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-3 py-2 rounded-lg"
          >
            <Settings className="w-4 h-4" /> Configurar modelos
          </button>
          <button
            onClick={() => gerarMut.mutate(competencia)}
            disabled={gerarMut.isLoading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> {gerarMut.isLoading ? 'Gerando…' : 'Gerar mês'}
          </button>
          <button onClick={() => setMesAno(m => navMes(m, -1))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[160px] text-center capitalize">
            {formatMesAno(mesAno)}
          </span>
          <button onClick={() => setMesAno(m => navMes(m, 1))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',       val: resumo?.total ?? 0,      color: 'text-gray-900', bg: 'bg-gray-50'   },
          { label: 'Realizadas',  val: resumo?.realizadas ?? 0,  color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Pendentes',   val: resumo?.pendentes ?? 0,   color: 'text-red-700',   bg: 'bg-red-50'   },
          { label: 'N/A',         val: resumo?.nao_aplicavel ?? 0, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-gray-200`}>
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Barra de progresso */}
      {(resumo?.total ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso do mês</span>
            <span className="text-sm font-bold text-gray-900">{pct}% concluído</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {resumo?.realizadas} de {resumo?.total} atividades realizadas
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os tipos</option>
          <option value="conta_fixa">Contas a Pagar</option>
          <option value="leitura_comodato">Leituras Comodato</option>
          <option value="atividade_interna">Atividades Internas</option>
        </select>

        <select
          value={filtroSit}
          onChange={e => setFiltroSit(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas as situações</option>
          <option value="pendente">Pendente</option>
          <option value="realizado">Realizado</option>
          <option value="nao_aplicavel">Não aplicável</option>
        </select>
      </div>

      {/* Lista por tipo */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (execucoes as Execucao[]).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma atividade cadastrada para este mês.</p>
        </div>
      ) : (
        (['conta_fixa', 'leitura_comodato', 'atividade_interna'] as TipoAtiv[]).map(tipo => {
          const grupo = porTipo[tipo];
          if (grupo.length === 0) return null;
          return (
            <div key={tipo} className={`rounded-xl border ${TIPO_COLOR[tipo]}`}>
              <div className="px-5 py-3 border-b border-gray-200/70 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{TIPO_LABEL[tipo]}</h3>
                <span className="text-xs text-gray-500">
                  {grupo.filter(e => e.situacao === 'realizado').length}/{grupo.length} realizadas
                </span>
              </div>

              <div className="divide-y divide-gray-200/50">
                {grupo.map(exec => (
                  <div key={exec.id} className="px-5 py-3.5 flex items-center gap-4">

                    {/* Ícone de situação */}
                    <div className="flex-shrink-0">
                      {exec.situacao === 'realizado' && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      {exec.situacao === 'pendente' && (
                        <Clock className="w-5 h-5 text-amber-500" />
                      )}
                      {exec.situacao === 'nao_aplicavel' && (
                        <Minus className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Descrição */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm font-medium',
                        exec.situacao === 'realizado' ? 'text-gray-500 line-through' : 'text-gray-900',
                      )}>
                        {exec.modelo_descricao}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {exec.modelo_dia_vencimento && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Vence dia {exec.modelo_dia_vencimento}
                          </span>
                        )}
                        {exec.situacao === 'realizado' && exec.data_realizacao && (
                          <span className="text-xs text-green-600">
                            Realizado em {new Date(exec.data_realizacao).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {exec.valor_realizado != null && (
                          <span className="text-xs text-gray-600 font-medium">
                            {br(Number(exec.valor_realizado))}
                          </span>
                        )}
                        {exec.observacao && (
                          <span className="text-xs text-gray-400 italic truncate max-w-[200px]">
                            {exec.observacao}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {exec.situacao === 'pendente' && (
                        <>
                          <button
                            onClick={() => setModalBaixa(exec)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 flex items-center gap-1"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Realizar
                          </button>
                          <button
                            onClick={() => mutNaoAplicavel.mutate(exec.id)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-500 text-xs rounded-lg hover:bg-gray-50"
                          >
                            N/A
                          </button>
                        </>
                      )}
                      {exec.situacao !== 'pendente' && (
                        <button
                          onClick={() => mutReabrir.mutate(exec.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white"
                          title="Reabrir"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal de baixa */}
      {modalBaixa && (
        <ModalBaixa
          execucao={modalBaixa}
          onClose={() => setModalBaixa(null)}
          onConfirm={(dto) => mutBaixar.mutate({ id: modalBaixa.id, dto })}
        />
      )}

      {/* Modal de configuração de modelos */}
      {modalModelos && (
        <ModalModelos onClose={() => setModalModelos(false)} onChanged={invalidar} />
      )}
    </div>
  );
}

// ── Modal de configuração de modelos de atividade ─────────────
const TIPOS_MODELO: { value: TipoAtiv; label: string }[] = [
  { value: 'conta_fixa',        label: 'Contas a Pagar'      },
  { value: 'leitura_comodato',  label: 'Leituras Comodato'   },
  { value: 'atividade_interna', label: 'Atividades Internas' },
];

interface ModeloCfg {
  id: string;
  tipo: TipoAtiv;
  descricao: string;
  dia_vencimento: number | null;
  valor_referencia: number | null;
  recorrente: boolean;
  ordem: number;
}

function ModalModelos({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [editId, setEditId]         = useState<string | null>(null);
  const [tipo, setTipo]             = useState<TipoAtiv>('conta_fixa');
  const [descricao, setDescricao]   = useState('');
  const [diaVenc, setDiaVenc]       = useState('');
  const [valorRef, setValorRef]     = useState('');
  const [recorrente, setRecorrente] = useState(true);

  const { data: modelos = [], isLoading } = useQuery(
    ['activity-modelos'],
    () => activitiesApi.listarModelos().then(r => r.data),
  );

  const invalidarModelos = () => qc.invalidateQueries(['activity-modelos']);

  function resetForm() {
    setEditId(null); setTipo('conta_fixa'); setDescricao('');
    setDiaVenc(''); setValorRef(''); setRecorrente(true);
  }

  const mutSalvar = useMutation(
    (payload: any) =>
      editId
        ? activitiesApi.atualizarModelo(editId, payload)
        : activitiesApi.criarModelo(payload),
    {
      onSuccess: () => {
        toast.success(editId ? 'Modelo atualizado!' : 'Modelo cadastrado!');
        invalidarModelos(); onChanged(); resetForm();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutExcluir = useMutation(
    (id: string) => activitiesApi.excluirModelo(id),
    {
      onSuccess: () => { toast.success('Modelo removido.'); invalidarModelos(); onChanged(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  function editar(m: ModeloCfg) {
    setEditId(m.id);
    setTipo(m.tipo);
    setDescricao(m.descricao);
    setDiaVenc(m.dia_vencimento != null ? String(m.dia_vencimento) : '');
    setValorRef(m.valor_referencia != null ? String(m.valor_referencia) : '');
    setRecorrente(!!m.recorrente);
  }

  function salvar() {
    if (descricao.trim().length < 2) { toast.error('Informe a descrição.'); return; }
    mutSalvar.mutate({
      tipo,
      descricao: descricao.trim(),
      recorrente,
      dia_vencimento:   diaVenc  ? Number(diaVenc)  : undefined,
      valor_referencia: valorRef ? Number(valorRef) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Modelos de Atividade</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Formulário novo/editar */}
        <div className="p-5 border-b bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">{editId ? 'Editar modelo' : 'Novo modelo'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoAtiv)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {TIPOS_MODELO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Ex.: Aluguel do galpão"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dia de vencimento (opcional)</label>
              <input type="number" min={1} max={31} value={diaVenc} onChange={e => setDiaVenc(e.target.value)}
                placeholder="1–31"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor de referência (opcional)</label>
              <input type="number" step="0.01" min={0} value={valorRef} onChange={e => setValorRef(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-3 cursor-pointer">
            <input type="checkbox" checked={recorrente} onChange={e => setRecorrente(e.target.checked)}
              className="w-4 h-4 accent-blue-600" />
            Recorrente (entra no checklist todo mês)
          </label>
          <div className="flex gap-2 mt-4">
            {editId && (
              <button onClick={resetForm}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-100">
                Cancelar edição
              </button>
            )}
            <button onClick={salvar} disabled={mutSalvar.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
              {mutSalvar.isLoading ? 'Salvando…' : editId ? 'Salvar alterações' : 'Adicionar modelo'}
            </button>
          </div>
        </div>

        {/* Lista de modelos */}
        <div className="p-5">
          {isLoading ? (
            <p className="text-center text-gray-400 py-6">Carregando…</p>
          ) : (modelos as ModeloCfg[]).length === 0 ? (
            <p className="text-center text-gray-400 py-6">Nenhum modelo cadastrado. Adicione o primeiro acima.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(modelos as ModeloCfg[]).map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', TIPO_BADGE[m.tipo])}>
                    {TIPO_LABEL[m.tipo]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{m.descricao}</p>
                    <p className="text-xs text-gray-400">
                      {m.dia_vencimento ? `Vence dia ${m.dia_vencimento}` : 'Sem vencimento fixo'}
                      {m.valor_referencia != null ? ` · ${br(Number(m.valor_referencia))}` : ''}
                      {!m.recorrente ? ' · não recorrente' : ''}
                    </p>
                  </div>
                  <button onClick={() => editar(m)}
                    className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Editar</button>
                  <button onClick={() => { if (confirm(`Remover "${m.descricao}"?`)) mutExcluir.mutate(m.id); }}
                    className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">Excluir</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-5 py-2 rounded-lg">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
