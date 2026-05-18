import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRelatorioContratos, useExportarContratos } from '../../hooks/useReports';
import { formataMoeda } from '../../utils/format';

function SituacaoBadge({ situacao }: { situacao: string }) {
  const map: Record<string, string> = {
    ativo:      'bg-emerald-100 text-emerald-700',
    encerrado:  'bg-gray-100 text-gray-600',
    suspenso:   'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    ativo: 'Ativo', encerrado: 'Encerrado', suspenso: 'Suspenso',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[situacao] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[situacao] ?? situacao}
    </span>
  );
}

export function RelatorioContratosPage() {
  const { data, isLoading } = useRelatorioContratos();
  const exportar = useExportarContratos();

  const stats = data
    ? [
        { label: 'Ativos',        value: data.ativos,      icon: CheckCircle, cor: 'text-emerald-600' },
        { label: 'Encerrados',    value: data.inativos,    icon: XCircle,     cor: 'text-gray-500'    },
        { label: 'Suspensos',     value: data.suspensos,   icon: AlertCircle, cor: 'text-red-500'     },
        { label: 'Venc. em 30d',  value: data.a_vencer_30, icon: Clock,       cor: 'text-orange-500'  },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-emerald-600" size={24} />
            Relatório de Contratos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão completa de todos os contratos</p>
        </div>
        <button
          onClick={() => exportar.mutate()}
          disabled={exportar.isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={15} />
          {exportar.isLoading ? 'Gerando...' : 'Exportar Excel'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={16} className={s.cor} />
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-3xl font-bold ${s.cor}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Carteira */}
          <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 rounded-xl p-3">
              <FileText className="text-blue-600" size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor da Carteira Ativa (mensal)</p>
              <p className="text-2xl font-bold text-blue-700">{formataMoeda(data.valor_carteira)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{data.total} contratos no total</p>
            </div>
          </div>

          {/* Alerta contratos a vencer */}
          {data.a_vencer_30 > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <Clock className="text-orange-600 shrink-0" size={18} />
              <p className="text-sm text-orange-800">
                <strong>{data.a_vencer_30} contrato(s)</strong> vence(m) nos próximos 30 dias.
                Verifique a necessidade de renovação.
              </p>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-600 font-semibold">Cliente</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tipo</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-semibold">Situação</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">Valor/Mês</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Início</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Fim</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Máquina</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.itens.map((i: any) => (
                    <tr key={i.id} className={`hover:bg-gray-50 ${i.a_vencer_30dias ? 'bg-orange-50' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{i.cliente_nome}</p>
                        {i.segmento && <p className="text-xs text-gray-400">{i.segmento}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{i.tipo}</td>
                      <td className="px-4 py-3 text-center"><SituacaoBadge situacao={i.situacao} /></td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{formataMoeda(i.valor_mensal)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(i.data_inicio + 'T12:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {i.data_fim
                          ? <span className={i.a_vencer_30dias ? 'text-orange-600 font-semibold' : ''}>
                              {new Date(i.data_fim + 'T12:00').toLocaleDateString('pt-BR')}
                              {i.a_vencer_30dias && ` (${i.dias_para_vencer}d)`}
                            </span>
                          : <span className="text-gray-400">Indeterminado</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i.patrimonio ?? '—'}</td>
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
