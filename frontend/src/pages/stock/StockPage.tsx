import { useState } from 'react';
import {
  Package, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, TrendingUp, DollarSign, Search,
  Plus, Edit, ChevronRight, BarChart3, Tag,
} from 'lucide-react';
import {
  useProdutos, useResumoEstoque, useAlertasEstoque, useCategorias,
} from '../../hooks/useStock';
import { ProdutoFormModal }   from '../../components/stock/ProdutoFormModal';
import { MovimentacaoModal }  from '../../components/stock/MovimentacaoModal';
import { CategoriasModal }    from '../../components/stock/CategoriasModal';
import type { Produto } from '../../types';
import { Link } from 'react-router-dom';
import { formataMoeda } from '../../utils/format';

// ERR-14: a lista fixa de categorias de cafe saiu daqui — agora vem do backend,
// configurada por tenant (tabela categoria_insumo).

const SITUACOES = [
  { value: '',      label: 'Todos' },
  { value: 'normal', label: 'Normal' },
  { value: 'baixo',  label: 'Estoque Baixo' },
  { value: 'zerado', label: 'Zerado' },
];

function SituacaoBadge({ situacao }: { situacao: Produto['situacao'] }) {
  const map = {
    normal: 'bg-emerald-100 text-emerald-700',
    baixo:  'bg-yellow-100 text-yellow-700',
    zerado: 'bg-red-100 text-red-700',
  };
  const labels = { normal: 'Normal', baixo: 'Baixo', zerado: 'Zerado' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[situacao]}`}>
      {labels[situacao]}
    </span>
  );
}

export function StockPage() {
  const [busca,      setBusca]      = useState('');
  const [categoria,  setCategoria]  = useState('');   // ERR-14: guarda o UUID da categoria
  const [situacao,   setSituacao]   = useState('');
  const [modalForm,  setModalForm]  = useState(false);
  const [modalCategorias, setModalCategorias] = useState(false);
  const [editProd,   setEditProd]   = useState<Produto | undefined>();
  const [modalMov,   setModalMov]   = useState<'entrada' | 'saida' | null>(null);
  const [prodMov,    setProdMov]    = useState<string | undefined>();

  const { data: categorias = [] } = useCategorias();

  const params: Record<string, string> = {};
  if (categoria) params.categoria_id = categoria;
  if (situacao)  params.situacao     = situacao;
  if (busca)     params.busca        = busca;

  const { data: produtos = [], isLoading } = useProdutos(params);
  const { data: resumo }                   = useResumoEstoque();
  const { data: alertas = [] }             = useAlertasEstoque();

  function abrirMovimentacao(tipo: 'entrada' | 'saida', prodId?: string) {
    setProdMov(prodId);
    setModalMov(tipo);
  }

  function abrirEditar(p: Produto) {
    setEditProd(p);
    setModalForm(true);
  }

  function fecharModal() {
    setModalForm(false);
    setEditProd(undefined);
    setModalMov(null);
    setProdMov(undefined);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-emerald-600" size={26} />
            Estoque de Insumos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Controle de entradas, saídas e saldos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => abrirMovimentacao('saida')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
            <ArrowUpCircle size={16} /> Saída
          </button>
          <button onClick={() => abrirMovimentacao('entrada')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <ArrowDownCircle size={16} /> Entrada
          </button>
          {/* ERR-14: categorias configuráveis por tenant */}
          <button onClick={() => setModalCategorias(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Tag size={16} /> Categorias
          </button>
          <button onClick={() => setModalForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-100 rounded-xl p-3">
            <DollarSign className="text-emerald-600" size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Valor em Estoque</p>
            <p className="text-xl font-bold text-gray-800">
              {resumo ? formataMoeda(resumo.valor_total) : '—'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-100 rounded-xl p-3">
            <Package className="text-blue-600" size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total de Produtos</p>
            <p className="text-xl font-bold text-gray-800">{resumo?.qtd_produtos ?? '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-yellow-100 rounded-xl p-3">
            <AlertTriangle className="text-yellow-600" size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Em Alerta</p>
            <p className="text-xl font-bold text-yellow-700">{resumo?.em_alerta ?? '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-red-100 rounded-xl p-3">
            <TrendingUp className="text-red-600" size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Zerados</p>
            <p className="text-xl font-bold text-red-700">{resumo?.zerados ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Banner alertas */}
      {alertas.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 mt-0.5 shrink-0" size={18} />
          <div className="text-sm text-yellow-800">
            <strong>{alertas.length} produto(s)</strong> com estoque abaixo do mínimo:&nbsp;
            {alertas.slice(0, 3).map((a, i) => (
              <span key={a.id}>{i > 0 && ', '}<strong>{a.descricao}</strong> ({a.saldo_atual.toFixed(2)} {a.unidade})</span>
            ))}
            {alertas.length > 3 && <span> e mais {alertas.length - 3}...</span>}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500" />
        </div>
        {/* ERR-14: as categorias vêm do tenant, não de um ENUM fixo de café */}
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 bg-white">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={situacao} onChange={e => setSituacao(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 bg-white">
          {SITUACOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Link to="/stock/movements"
          className="flex items-center gap-2 text-sm text-emerald-700 border border-emerald-300 rounded-lg px-3 py-2 hover:bg-emerald-50">
          <BarChart3 size={15} /> Histórico
        </Link>
        <Link to="/stock/report"
          className="flex items-center gap-2 text-sm text-gray-700 border rounded-lg px-3 py-2 hover:bg-gray-50">
          Relatório
        </Link>
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhum produto encontrado.</p>
            <button onClick={() => setModalForm(true)}
              className="mt-3 text-sm text-emerald-600 hover:underline">
              Cadastrar primeiro produto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Produto</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Categoria</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Saldo Atual</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Valor em Estoque</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Situação</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {produtos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{p.descricao}</div>
                      <div className="text-xs text-gray-400">{p.codigo}{p.marca ? ` · ${p.marca}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{(p.categoria ?? '—').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={p.situacao !== 'normal' ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {p.saldo_atual.toFixed(3)}
                      </span>
                      <span className="text-gray-400 ml-1">{p.unidade}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {formataMoeda(p.valor_em_estoque)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SituacaoBadge situacao={p.situacao} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => abrirMovimentacao('entrada', p.id)}
                          title="Entrada" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <ArrowDownCircle size={15} />
                        </button>
                        <button onClick={() => abrirMovimentacao('saida', p.id)}
                          title="Saída" className="p-1.5 text-orange-600 hover:bg-orange-50 rounded">
                          <ArrowUpCircle size={15} />
                        </button>
                        <button onClick={() => abrirEditar(p)}
                          title="Editar" className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                          <Edit size={15} />
                        </button>
                        <Link to={`/stock/products/${p.id}`}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalForm && (
        <ProdutoFormModal produto={editProd} onClose={fecharModal} />
      )}
      {modalMov && (
        <MovimentacaoModal tipo={modalMov} produtoIdInicial={prodMov} onClose={fecharModal} />
      )}
      {/* ERR-14 */}
      {modalCategorias && (
        <CategoriasModal onClose={() => setModalCategorias(false)} />
      )}
    </div>
  );
}
