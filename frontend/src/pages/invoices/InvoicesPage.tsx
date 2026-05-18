import { useState } from 'react';
import {
  DollarSign, AlertTriangle, Play, CheckCircle2, TrendingDown,
} from 'lucide-react';
import {
  useLancamentos, useGerarLancamentos, useRegistrarPagamento, useInadimplencia,
} from '../../hooks/useContracts';
import PagamentoModal     from '../../components/contracts/PagamentoModal';
import InadimplenciaPanel from '../../components/contracts/InadimplenciaPanel';
import {
  SITUACAO_LANCAMENTO_COLOR, SITUACAO_LANCAMENTO_LABEL,
  TIPO_RECEITA_COLOR, TIPO_RECEITA_LABEL,
  type LancamentoMensal, type TipoReceita,
} from '../../types';
import { fmtBRL, fmtDate, fmtCompetencia } from '../../utils/format';

type Aba = 'abertos' | 'inadimplencia' | 'historico';

export default function InvoicesPage() {
  const [aba, setAba]                = useState<Aba>('abertos');
  const [selecionado, setSelecionado] = useState<LancamentoMensal | null>(null);
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [filtroTipo, setFiltroTipo]         = useState<TipoReceita | ''>('');

  // Mês para geração
  const hoje = new Date();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

  // Queries
  const { data: lancamentosAbertos = [], isLoading: loadingAbertos } = useLancamentos({
    situacao: 'pendente',
  });
  const { data: lancamentosVencidos = [] } = useLancamentos({ situacao: 'vencido' });
  const { data: historicoRaw = [], isLoading: loadingHist } = useLancamentos(
    filtroSituacao ? { situacao: filtroSituacao } : {},
  );
  const historico = filtroTipo
    ? historicoRaw.filter(l => l.tipo_receita === filtroTipo)
    : historicoRaw;
  const { data: inadimplencia = [] } = useInadimplencia();

  // Mutations
  const gerar  = useGerarLancamentos();
  const pagar  = useRegistrarPagamento();

  // KPIs
  const totalAberto  = [...lancamentosAbertos, ...lancamentosVencidos]
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalVencido = lancamentosVencidos.reduce((s, l) => s + Number(l.valor), 0);

  function handleGerar() {
    if (!confirm(`Gerar lançamentos para ${fmtCompetencia(competencia)}?`)) return;
    gerar.mutate({ competencia });
  }

  function handlePagar(dto: any) {
    if (!selecionado) return;
    pagar.mutate({ id: selecionado.id, dto }, { onSuccess: () => setSelecionado(null) });
  }

  const lancamentosAba = aba === 'abertos'
    ? [...lancamentosVencidos, ...lancamentosAbertos]
    : historico;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-blue-600" /> Cobranças
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de lançamentos e inadimplência</p>
        </div>
        <button
          onClick={handleGerar}
          disabled={gerar.isLoading}
          className="btn-primary flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {gerar.isLoading ? 'Gerando...' : `Gerar ${fmtCompetencia(competencia)}`}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Em aberto</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{fmtBRL(totalAberto)}</p>
          <p className="text-xs text-gray-400">{lancamentosAbertos.length + lancamentosVencidos.length} boleto(s)</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Vencidos</p>
          <p className="text-xl font-bold text-red-600 mt-1">{fmtBRL(totalVencido)}</p>
          <p className="text-xs text-gray-400">{lancamentosVencidos.length} boleto(s)</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Clientes inadimplentes</p>
          <p className="text-xl font-bold text-red-700 mt-1">{inadimplencia.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total inadimplência</p>
          <p className="text-xl font-bold text-red-700 mt-1">
            {fmtBRL(inadimplencia.reduce((s, i) => s + i.valor_total, 0))}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([
            { key: 'abertos',       label: 'Em Aberto',       icon: AlertTriangle },
            { key: 'inadimplencia', label: 'Inadimplência',   icon: TrendingDown  },
            { key: 'historico',     label: 'Histórico',        icon: CheckCircle2  },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`flex items-center gap-1.5 py-2 border-b-2 text-sm font-medium transition-colors ${
                aba === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Aba Inadimplência */}
      {aba === 'inadimplencia' && <InadimplenciaPanel itens={inadimplencia} />}

      {/* Aba Em Aberto / Histórico */}
      {aba !== 'inadimplencia' && (
        <>
          {aba === 'historico' && (
            <div className="space-y-2">
              {/* Filtro situação */}
              <div className="flex gap-2 flex-wrap">
                {['', 'pendente', 'pago', 'vencido', 'cancelado'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFiltroSituacao(s)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filtroSituacao === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {s === '' ? 'Todos' : SITUACAO_LANCAMENTO_LABEL[s as keyof typeof SITUACAO_LANCAMENTO_LABEL]}
                  </button>
                ))}
              </div>
              {/* Filtro tipo de receita */}
              <div className="flex gap-2 flex-wrap">
                {(['', 'locacao', 'doses', 'servico', 'insumos', 'evento'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filtroTipo === t
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {t === '' ? 'Todos os tipos' : TIPO_RECEITA_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(loadingAbertos || loadingHist) ? (
            <div className="card p-10 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : lancamentosAba.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Competência</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Situação</th>
                    {aba === 'abertos' && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lancamentosAba.map(l => (
                    <tr
                      key={l.id}
                      className={`hover:bg-gray-50 transition-colors ${l.alerta_vermelho ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">
                          {l.cliente_nome ?? '—'}
                        </p>
                        {l.maquina_patrimonio && (
                          <p className="text-xs text-gray-400">{l.maquina_patrimonio}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                        {fmtCompetencia(l.competencia)}
                      </td>
                      <td className={`px-4 py-3 hidden md:table-cell ${l.alerta_vermelho ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {fmtDate(l.data_vencimento)}
                        {(l.dias_atraso ?? 0) > 0 && (
                          <span className="ml-1 text-xs text-red-500">({l.dias_atraso}d)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fmtBRL(l.valor)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {l.tipo_receita ? (
                          <span className={`badge ${TIPO_RECEITA_COLOR[l.tipo_receita]}`}>
                            {TIPO_RECEITA_LABEL[l.tipo_receita]}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${SITUACAO_LANCAMENTO_COLOR[l.situacao]}`}>
                          {SITUACAO_LANCAMENTO_LABEL[l.situacao]}
                        </span>
                      </td>
                      {aba === 'abertos' && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelecionado(l)}
                            className="btn-ghost text-sm text-green-700 hover:bg-green-50 px-2 py-1"
                          >
                            Registrar Pgto.
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de pagamento */}
      {selecionado && (
        <PagamentoModal
          lancamento={selecionado}
          onClose={() => setSelecionado(null)}
          onConfirm={handlePagar}
          loading={pagar.isLoading}
        />
      )}
    </div>
  );
}
