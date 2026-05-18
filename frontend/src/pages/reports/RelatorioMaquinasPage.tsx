import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { ArrowLeft, Bot, Download, AlertTriangle } from 'lucide-react';
import { useRelatorioMaquinas, useExportarMaquinas } from '../../hooks/useReports';

function anoInicio()   { return `${new Date().getFullYear()}-01-01`; }
function fimMesAtual() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

export function RelatorioMaquinasPage() {
  const [di, setDi] = useState(anoInicio());
  const [df, setDf] = useState(fimMesAtual());

  const { data, isLoading } = useRelatorioMaquinas(di, df);
  const exportar = useExportarMaquinas();

  const itens = data?.itens ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="text-purple-600" size={24} />
            Movimentação de Máquinas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Saídas, retornos e máquinas sem retorno</p>
        </div>
        <button
          onClick={() => exportar.mutate({ di, df })}
          disabled={exportar.isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <Download size={15} />
          {exportar.isLoading ? 'Gerando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input type="date" value={di} onChange={e => setDi(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" value={df} onChange={e => setDf(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total de Saídas</p>
              <p className="text-3xl font-bold text-gray-800">{data.total_saidas}</p>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Máquinas Distintas</p>
              <p className="text-3xl font-bold text-purple-700">{data.maquinas_distintas}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-xs text-red-600 mb-1">Sem Retorno</p>
              <p className="text-3xl font-bold text-red-700">{data.sem_retorno}</p>
            </div>
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Média de Dias Fora</p>
              <p className="text-3xl font-bold text-gray-800">{data.media_periodo}</p>
              <p className="text-xs text-gray-400 mt-0.5">dias por saída</p>
            </div>
          </div>

          {/* Alerta */}
          {data.sem_retorno > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-orange-600 shrink-0" size={18} />
              <p className="text-sm text-orange-800">
                <strong>{data.sem_retorno} máquina(s)</strong> ainda não retornaram à base.
              </p>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-600 font-semibold">Patrimônio</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Modelo</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Destino</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Saída</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Retorno</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">Dias</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Resp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itens.map((i: any) => (
                    <tr key={i.id} className={`hover:bg-gray-50 ${i.sem_retorno ? 'bg-orange-50' : ''}`}>
                      <td className="px-5 py-3 font-mono font-semibold text-gray-800">{i.patrimonio}</td>
                      <td className="px-4 py-3 text-gray-600">{i.modelo}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{i.destino}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(i.data_saida + 'T12:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {i.data_retorno
                          ? new Date(i.data_retorno + 'T12:00').toLocaleDateString('pt-BR')
                          : <span className="text-orange-600 font-semibold text-xs">SEM RETORNO</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={i.sem_retorno ? 'text-orange-600 font-bold' : 'text-gray-700'}>
                          {i.dias_fora}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{i.responsavel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
