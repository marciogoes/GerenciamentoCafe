import { useState } from 'react';
import { useRelatorioEstoque } from '../../hooks/useStock';
import { useExportarEstoque }  from '../../hooks/useReports';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formataMoeda } from '../../utils/format';

function ExportarEstoqueBtn() {
  const exportar = useExportarEstoque();
  return (
    <button
      onClick={() => exportar.mutate()}
      disabled={exportar.isLoading}
      className="flex items-center gap-2 text-sm bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
    >
      <Download size={15} />
      {exportar.isLoading ? 'Gerando...' : 'Exportar Excel'}
    </button>
  );
}

const CATEGORIAS: Record<string, string> = {
  cappuccino:  'Cappuccino',
  chocolate:   'Chocolate',
  cafe_graos:  'Café em Grãos',
  cafe_leite:  'Café com Leite',
  descartavel: 'Descartável',
  outros:      'Outros',
};

export function RelatorioEstoquePage() {
  const hoje    = new Date();
  const defInicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const defFim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dataInicio, setDataInicio] = useState(defInicio);
  const [dataFim,    setDataFim]    = useState(defFim);

  const { data: relatorio, isLoading } = useRelatorioEstoque(dataInicio, dataFim);

  // Agrupa por categoria
  const porCategoria = relatorio?.itens.reduce<Record<string, typeof relatorio.itens>>((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = [];
    acc[p.categoria].push(p);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/stock" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-emerald-600" size={24} />
            Relatório de Estoque
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Saldo atual, entradas e saídas do período</p>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Período — De</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <ExportarEstoqueBtn />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Gerando relatório...</div>
      ) : relatorio ? (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs text-gray-500">Valor Total em Estoque</p>
              <p className="text-xl font-bold text-emerald-700">{formataMoeda(relatorio.total_valor)}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs text-gray-500">Produtos Ativos</p>
              <p className="text-xl font-bold text-gray-800">{relatorio.qtd_produtos}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-xs text-yellow-600">Em Alerta</p>
              <p className="text-xl font-bold text-yellow-700">{relatorio.em_alerta}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs text-gray-500">Período</p>
              <p className="text-sm font-semibold text-gray-700">
                {new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} –{' '}
                {new Date(dataFim    + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Tabela por categoria */}
          {porCategoria && Object.entries(porCategoria).map(([cat, itens]) => (
            <div key={cat} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">{CATEGORIAS[cat] ?? cat}</h3>
                <span className="text-xs text-gray-400">{itens.length} produto(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-5 py-2 text-gray-500 font-medium">Produto</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">Saldo Atual</th>
                      <th className="text-right px-4 py-2 text-blue-500 font-medium">Entradas</th>
                      <th className="text-right px-4 py-2 text-orange-500 font-medium">Saídas</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">Valor (R$)</th>
                      <th className="text-center px-4 py-2 text-gray-500 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itens.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800">{p.descricao}</div>
                          <div className="text-xs text-gray-400">{p.codigo}{p.marca ? ` · ${p.marca}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">
                          {p.saldo_atual.toFixed(3)} {p.unidade}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600">
                          +{p.entradas_periodo.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-orange-600">
                          -{p.saidas_periodo.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">
                          {formataMoeda(p.valor_em_estoque)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.situacao === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                            p.situacao === 'baixo'  ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.situacao === 'normal' ? 'Normal' : p.situacao === 'baixo' ? 'Baixo' : 'Zerado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal da categoria */}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-2 text-gray-600">Subtotal {CATEGORIAS[cat] ?? cat}</td>
                      <td colSpan={3} />
                      <td className="px-4 py-2 text-right text-gray-800">
                        {formataMoeda(itens.reduce((s, p) => s + p.valor_em_estoque, 0))}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
