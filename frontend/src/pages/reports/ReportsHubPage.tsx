import { Link } from 'react-router-dom';
import {
  BarChart3, FileText, Bot, Package,
  Download, TrendingUp, ChevronRight, CalendarClock,
} from 'lucide-react';
import {
  useExportarContratos,
  useExportarEstoque,
} from '../../hooks/useReports';

const RELATORIOS = [
  {
    to:    '/reports/financeiro',
    icon:  TrendingUp,
    cor:   'bg-blue-100 text-blue-600',
    borda: 'border-blue-200 hover:border-blue-400',
    titulo: 'Relatório Financeiro',
    desc:  'Receita mensal, inadimplência, ticket médio e top clientes',
    tag:   'RF-R01',
  },
  {
    to:    '/reports/contratos',
    icon:  FileText,
    cor:   'bg-emerald-100 text-emerald-600',
    borda: 'border-emerald-200 hover:border-emerald-400',
    titulo: 'Relatório de Contratos',
    desc:  'Contratos ativos, inativos e a vencer nos próximos 30 dias',
    tag:   'RF-R02',
  },
  {
    to:    '/reports/maquinas',
    icon:  Bot,
    cor:   'bg-purple-100 text-purple-600',
    borda: 'border-purple-200 hover:border-purple-400',
    titulo: 'Movimentação de Máquinas',
    desc:  'Saídas, retornos e máquinas sem retorno por período',
    tag:   'RF-R04',
  },
  {
    to:    '/reports/agendamentos',
    icon:  CalendarClock,
    cor:   'bg-amber-100 text-amber-600',
    borda: 'border-amber-200 hover:border-amber-400',
    titulo: 'Agendamento de Relatórios',
    desc:  'Envio automático por e-mail (diário, semanal ou mensal)',
    tag:   'RF-R06',
  },
];

export function ReportsHubPage() {
  const exportarContratos = useExportarContratos();
  const exportarEstoque   = useExportarEstoque();

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={26} />
          Relatórios e Exportações
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gere análises detalhadas e exporte dados em Excel
        </p>
      </div>

      {/* Relatórios navegáveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {RELATORIOS.map(r => (
          <Link
            key={r.to}
            to={r.to}
            className={`bg-white border-2 ${r.borda} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group`}
          >
            <div className={`w-12 h-12 rounded-xl ${r.cor} flex items-center justify-center mb-4`}>
              <r.icon size={22} />
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-800 text-base">{r.titulo}</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{r.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 mt-1 shrink-0" />
            </div>
            <span className="mt-4 inline-block text-xs font-mono text-gray-400">{r.tag}</span>
          </Link>
        ))}
      </div>

      {/* Exportações rápidas */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Download size={18} className="text-gray-500" />
          Exportações Rápidas (Excel)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Financeiro — botão que vai à tela de seleção de período */}
          <Link
            to="/reports/financeiro"
            className="flex items-center gap-3 p-4 border rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors group"
          >
            <div className="bg-blue-100 rounded-lg p-2">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Financeiro</p>
              <p className="text-xs text-gray-400">Escolher período</p>
            </div>
          </Link>

          {/* Contratos */}
          <button
            onClick={() => exportarContratos.mutate()}
            disabled={exportarContratos.isLoading}
            className="flex items-center gap-3 p-4 border rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left disabled:opacity-50"
          >
            <div className="bg-emerald-100 rounded-lg p-2">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Contratos</p>
              <p className="text-xs text-gray-400">
                {exportarContratos.isLoading ? 'Gerando...' : 'Exportar agora'}
              </p>
            </div>
          </button>

          {/* Máquinas — vai à tela */}
          <Link
            to="/reports/maquinas"
            className="flex items-center gap-3 p-4 border rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-colors group"
          >
            <div className="bg-purple-100 rounded-lg p-2">
              <Bot size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Máquinas</p>
              <p className="text-xs text-gray-400">Escolher período</p>
            </div>
          </Link>

          {/* Estoque */}
          <button
            onClick={() => exportarEstoque.mutate()}
            disabled={exportarEstoque.isLoading}
            className="flex items-center gap-3 p-4 border rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-colors text-left disabled:opacity-50"
          >
            <div className="bg-orange-100 rounded-lg p-2">
              <Package size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Estoque</p>
              <p className="text-xs text-gray-400">
                {exportarEstoque.isLoading ? 'Gerando...' : 'Exportar agora'}
              </p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
