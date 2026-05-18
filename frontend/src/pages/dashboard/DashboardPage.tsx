import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Bot, TrendingUp, AlertCircle, Package,
  FileText, Users, RefreshCw, LayoutDashboard, Download,
  CheckSquare, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useDashboard, useDashboardSprint14 }  from '../../hooks/useDashboard';
import KpiCard           from '../../components/dashboard/KpiCard';
import AlertasPanel      from '../../components/dashboard/AlertasPanel';
import FiltroPeriodo     from '../../components/dashboard/FiltroPeriodo';
import { useAuth }       from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────
const moeda = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR');

const CORES_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

const SITUACAO_LABEL: Record<string, string> = {
  apta:           'Aptas',
  em_locacao:     'Em Locação',
  manutencao:     'Manutenção',
  evento:         'Evento',
  nao_localizada: 'Não Localizada',
  desativada:     'Desativada',
};

// ── Tooltips ──────────────────────────────────────────────────
const TooltipReceita = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name === 'receita' ? 'Recebido' : 'Faturado'}:</span>
          <strong>{moeda(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

const TooltipMaquinas = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name === 'em_locacao' ? 'Em locação' : 'Disponível'}:</span>
          <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Exportar como PDF (impressão) ──────────────────────────────
function exportarPDF() {
  window.print();
}

// ═══════════════════════════════════════════════════════════════
const CORES_RECEITA: Record<string, string> = {
  locacao: '#3b82f6',
  doses:   '#10b981',
  servico: '#f59e0b',
  insumos: '#f97316',
  evento:  '#8b5cf6',
};
const TIPO_LABEL: Record<string, string> = {
  locacao: 'Locação',
  doses:   'Doses',
  servico: 'Serviço',
  insumos: 'Insumos',
  evento:  'Evento',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    kpis, graficoReceita, graficoMaq, alertas,
    distribuicao, topClientes, inadimplencia,
    loadingKpis, loadingCharts, atualizadoEm,
    atualizar, setPeriodo, periodo,
  } = useDashboard();
  const { data: s14, isLoading: loadingS14 } = useDashboardSprint14();

  const percInad = kpis && kpis.receita.faturado > 0
    ? ((kpis.inadimplencia.valor_total / kpis.receita.faturado) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-5 print:space-y-4">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Bem-vindo, <strong>{user?.nome}</strong>
            {atualizadoEm && (
              <span className="text-gray-400 ml-2">
                · Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarPDF} className="btn-secondary gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button onClick={atualizar} className="btn-secondary gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Filtro de período ──────────────────────────────────── */}
      <div className="card p-3 print:hidden">
        <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
      </div>

      {/* ── KPIs — linha 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Máquinas Alugadas"
          valor={num(kpis?.maquinas?.em_locacao ?? 0)}
          subtitulo={`de ${num(kpis?.maquinas?.total ?? 0)} na frota`}
          icone={<Bot className="w-5 h-5" />}
          cor="blue"
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Receita do Período"
          valor={moeda(kpis?.receita?.recebido ?? 0)}
          subtitulo={`Faturado: ${moeda(kpis?.receita?.faturado ?? 0)}`}
          icone={<TrendingUp className="w-5 h-5" />}
          cor="green"
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Inadimplência"
          valor={moeda(kpis?.inadimplencia?.valor_total ?? 0)}
          subtitulo={`${kpis?.inadimplencia?.qtd_boletos ?? 0} boleto(s) · ${percInad}% do faturado`}
          icone={<AlertCircle className="w-5 h-5" />}
          cor={(kpis?.inadimplencia?.valor_total ?? 0) > 0 ? 'red' : 'green'}
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Valor em Estoque"
          valor={moeda(kpis?.estoque?.valor_total ?? 0)}
          subtitulo={
            (kpis?.estoque?.produtos_alerta ?? 0) > 0
              ? `⚠️ ${kpis!.estoque.produtos_alerta} produto(s) em alerta`
              : `${num(kpis?.estoque?.total_produtos ?? 0)} produtos`
          }
          icone={<Package className="w-5 h-5" />}
          cor={(kpis?.estoque?.produtos_alerta ?? 0) > 0 ? 'yellow' : 'purple'}
          carregando={loadingKpis}
        />
      </div>

      {/* ── KPIs — linha 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Contratos Ativos"
          valor={num(kpis?.contratos?.ativos ?? 0)}
          subtitulo={`${num(kpis?.contratos?.total ?? 0)} no total`}
          icone={<FileText className="w-5 h-5" />}
          cor="blue"
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Ticket Médio"
          valor={moeda(kpis?.receita?.ticket_medio ?? 0)}
          subtitulo="por lançamento no período"
          icone={<TrendingUp className="w-5 h-5" />}
          cor="gray"
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Máquinas Aptas"
          valor={num(kpis?.maquinas?.aptas ?? 0)}
          subtitulo="disponíveis para locação"
          icone={<Bot className="w-5 h-5" />}
          cor="green"
          carregando={loadingKpis}
        />
        <KpiCard
          titulo="Em Manutenção"
          valor={num(kpis?.maquinas?.em_manutencao ?? 0)}
          subtitulo={`+ ${num(kpis?.maquinas?.em_evento ?? 0)} em evento`}
          icone={<Users className="w-5 h-5" />}
          cor={(kpis?.maquinas?.em_manutencao ?? 0) > 0 ? 'yellow' : 'gray'}
          carregando={loadingKpis}
        />
      </div>

      {/* ── Gráfico de linha + Alertas ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Receita dos Últimos 12 Meses
          </h3>
          {loadingCharts ? (
            <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={graficoReceita} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<TooltipReceita />} />
                <Legend wrapperStyle={{ fontSize: '12px' }}
                  formatter={v => v === 'receita' ? 'Recebido' : 'Faturado'} />
                <Line type="monotone" dataKey="faturado"
                  stroke="#e5e7eb" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="receita"
                  stroke="#3b82f6" strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-1">
          <AlertasPanel
            boletosVencidos={alertas?.boletos_vencidos ?? []}
            estoqueBaixo={alertas?.estoque_baixo ?? []}
            maquinasSemRetorno={alertas?.maquinas_sem_retorno ?? []}
            carregando={loadingCharts}
          />
        </div>
      </div>

      {/* ── Gráfico de barras + Donut ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            Máquinas Alugadas vs Disponíveis
          </h3>
          {loadingCharts ? (
            <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={graficoMaq} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipMaquinas />} />
                <Legend wrapperStyle={{ fontSize: '12px' }}
                  formatter={v => v === 'em_locacao' ? 'Em Locação' : 'Disponível'} />
                <Bar dataKey="em_locacao" name="em_locacao" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disponivel" name="disponivel" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Situação da frota — donut */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            Situação da Frota
          </h3>
          {loadingCharts ? (
            <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
          ) : distribuicao.length === 0 || distribuicao.every(d => d.total === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
              <Bot className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma máquina cadastrada</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={distribuicao.filter(d => d.total > 0)}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="total" nameKey="situacao" paddingAngle={2}
                  >
                    {distribuicao.filter(d => d.total > 0).map((_, i) => (
                      <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, SITUACAO_LABEL[n as string] ?? n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {distribuicao.filter(d => d.total > 0).map((d, i) => (
                  <div key={d.situacao} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                           style={{ backgroundColor: CORES_PIE[i % CORES_PIE.length] }} />
                      <span className="text-gray-600">{SITUACAO_LABEL[d.situacao] ?? d.situacao}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top Clientes + Inadimplência ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top 5 */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Top 5 Clientes · Últimos 12 Meses
          </h3>
          {loadingCharts ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : topClientes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum dado disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topClientes.map((c: any, i: number) => {
                const max  = topClientes[0]?.receita_total ?? 1;
                const perc = Math.round((c.receita_total / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 truncate pr-2">{c.razao_social}</span>
                      <span className="font-bold text-blue-700 flex-shrink-0">{moeda(c.receita_total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-700"
                           style={{ width: `${perc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inadimplência */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Inadimplência por Cliente
          </h3>
          {loadingCharts ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : inadimplencia.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm font-medium text-gray-600">Nenhuma inadimplência</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium text-right pr-1">Atraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inadimplencia.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 font-medium text-gray-800 truncate max-w-[130px]">
                        {c.cliente}
                      </td>
                      <td className="py-2.5 text-right font-bold text-red-600 whitespace-nowrap">
                        {moeda(c.valor_aberto)}
                      </td>
                      <td className="py-2.5 text-right pr-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          c.maior_atraso > 60 ? 'bg-red-100 text-red-700'
                          : c.maior_atraso > 30 ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.maior_atraso}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Sprint 14: Receita por Tipo + Atividades Mensais ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Gráfico stacked bar: receita por tipo últimos 6 meses */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Receita por Tipo · Últimos 6 Meses
          </h3>
          {loadingS14 ? (
            <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
          ) : !s14?.graficoReceitaTipo?.length ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sem dados suficientes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s14.graficoReceitaTipo} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `R${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: any, n: any) => [moeda(Number(v)), TIPO_LABEL[n] ?? n]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} formatter={n => TIPO_LABEL[n] ?? n} />
                {['locacao', 'doses', 'servico', 'insumos', 'evento'].map(tipo => (
                  <Bar key={tipo} dataKey={tipo} stackId="a" fill={CORES_RECEITA[tipo]} radius={[0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Mini breakdown por tipo (totais) */}
          {(s14?.receitaPorTipo?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
              {s14!.receitaPorTipo.map((r: any) => (
                <div key={r.tipo_receita} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full"
                       style={{ backgroundColor: CORES_RECEITA[r.tipo_receita] ?? '#999' }} />
                  <span className="text-gray-500">{TIPO_LABEL[r.tipo_receita] ?? r.tipo_receita}:</span>
                  <span className="font-semibold text-gray-800">{moeda(r.recebido)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card de Atividades Mensais */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Atividades do Mês
            </h3>
            <button
              onClick={() => navigate('/activities')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loadingS14 ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : !s14?.kpiAtividades ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhuma atividade cadastrada.
            </div>
          ) : (
            <>
              {/* Barra de progresso */}
              {(() => {
                const kpAT = s14.kpiAtividades;
                const pct = kpAT.total > 0
                  ? Math.round((kpAT.realizadas / kpAT.total) * 100)
                  : 0;
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{pct}% concluído</span>
                      <span className="text-xs text-gray-400">{kpAT.realizadas}/{kpAT.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Realizadas',  val: kpAT.realizadas,   bg: 'bg-green-50',  text: 'text-green-700'  },
                        { label: 'Pendentes',   val: kpAT.pendentes,    bg: 'bg-amber-50',  text: 'text-amber-700'  },
                        { label: 'N/A',         val: kpAT.nao_aplicavel, bg: 'bg-gray-50',  text: 'text-gray-500'  },
                      ].map(item => (
                        <div key={item.label}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg ${item.bg}`}>
                          <span className={`text-sm font-medium ${item.text}`}>{item.label}</span>
                          <span className={`text-sm font-bold ${item.text}`}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                    {kpAT.pendentes > 0 && (
                      <button
                        onClick={() => navigate('/activities')}
                        className="mt-4 w-full py-2 border border-blue-200 rounded-lg text-sm text-blue-600
                          font-medium hover:bg-blue-50 transition-colors"
                      >
                        {kpAT.pendentes} atividade(s) pendente(s) →
                      </button>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
