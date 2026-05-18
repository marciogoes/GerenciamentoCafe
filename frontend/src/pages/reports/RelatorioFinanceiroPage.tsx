import { useState } from 'react';
import { Link }     from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Download, DollarSign,
  AlertTriangle, CheckCircle, FileBarChart,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useRelatorioFinanceiro, useExportarFinanceiro } from '../../hooks/useReports';
import { formataMoeda } from '../../utils/format';

function anoInicio()     { return `${new Date().getFullYear()}-01-01`; }
function fimMesAtual()   {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

export function RelatorioFinanceiroPage() {
  const [di, setDi] = useState(anoInicio());
  const [df, setDf] = useState(fimMesAtual());

  const { data, isLoading } = useRelatorioFinanceiro(di, df);
  const exportar = useExportarFinanceiro();

  const totais  = data?.totais;
  const porMes  = data?.por_mes  ?? [];
  const topClientes = data?.top_clientes ?? [];

  const txAdimplencia = totais && totais.faturado > 0
    ? ((totais.recebido / totais.faturado) * 100).toFixed(1)
    : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Relatório Financeiro
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Receita, inadimplência e ticket médio</p>
        </div>
        <button
          onClick={() => exportar.mutate({ di, df })}
          disabled={exportar.isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={15} />
          {exportar.isLoading ? 'Gerando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* Filtros de período */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input type="date" value={di} onChange={e => setDi(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" value={df} onChange={e => setDf(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando relatório...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-500" />
                <p className="text-xs text-gray-500">Recebido</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formataMoeda(totais?.recebido)}</p>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileBarChart size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">Faturado</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formataMoeda(totais?.faturado)}</p>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="text-xs text-gray-500">Inadimplência</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{formataMoeda(totais?.inadimplente)}</p>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-purple-500" />
                <p className="text-xs text-gray-500">Taxa de Adimplência</p>
              </div>
              <p className="text-2xl font-bold text-purple-700">{txAdimplencia}%</p>
              <p className="text-xs text-gray-400 mt-1">
                Ticket médio: {formataMoeda(totais?.ticket_medio)}
              </p>
            </div>
          </div>

          {/* Gráfico de Receita */}
          {porMes.length > 0 && (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">Faturado vs Recebido por Mês</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porMes} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }}
                    tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: any, name: string) => [formataMoeda(v), name === 'faturado' ? 'Faturado' : name === 'recebido' ? 'Recebido' : 'Inadimplente']}
                  />
                  <Legend />
                  <Bar dataKey="faturado"    fill="#bfdbfe" radius={[4,4,0,0]} name="Faturado" />
                  <Bar dataKey="recebido"    fill="#34d399" radius={[4,4,0,0]} name="Recebido" />
                  <Bar dataKey="inadimplente" fill="#fca5a5" radius={[4,4,0,0]} name="Inadimplente" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico Área — tendência */}
          {porMes.length > 1 && (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">Tendência de Receita</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={porMes}>
                  <defs>
                    <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formataMoeda(v), 'Recebido']} />
                  <Area type="monotone" dataKey="recebido" stroke="#3b82f6" fill="url(#gradRec)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela por mês */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3">
              <h2 className="font-semibold text-gray-700">Detalhamento Mensal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-5 py-2 text-gray-500 font-medium">Mês</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Faturado</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Recebido</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Inadimplente</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Contratos</th>
                    <th className="text-center px-4 py-2 text-gray-500 font-medium">Pagos / Abertos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {porMes.map((r: any) => (
                    <tr key={r.mes} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{r.mes_label}</td>
                      <td className="px-4 py-3 text-right font-mono text-blue-700">{formataMoeda(r.faturado)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{formataMoeda(r.recebido)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formataMoeda(r.inadimplente)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.qtd_contratos}</td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        <span className="text-emerald-600 font-semibold">{r.pagos}</span>
                        {' / '}
                        <span className="text-red-500 font-semibold">{r.abertos}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de totais */}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-5 py-3 text-blue-800">TOTAL</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-800">{formataMoeda(totais?.faturado)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-800">{formataMoeda(totais?.recebido)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-700">{formataMoeda(totais?.inadimplente)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Clientes */}
          {topClientes.length > 0 && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-3">
                <h2 className="font-semibold text-gray-700">Top Clientes por Receita</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-5 py-2 text-gray-500 font-medium">#</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Cliente</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Contratos</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Receita Total</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Em Aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topClientes.map((c: any, i: number) => (
                    <tr key={c.razao_social} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.razao_social}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.contratos}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{formataMoeda(c.receita_total)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formataMoeda(c.em_aberto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
