import { useState } from 'react';
import { useMovimentacoes } from '../../hooks/useStock';
import { useProdutos }      from '../../hooks/useStock';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CategoriaProduto } from '../../types';
import { fmtDate } from '../../utils/format';

function TipoBadge({ tipo }: { tipo: 'entrada' | 'saida' }) {
  return tipo === 'entrada'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        <ArrowDownCircle size={11} /> Entrada
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
        <ArrowUpCircle size={11} /> Saída
      </span>;
}

export function MovimentacoesPage() {
  const hoje = new Date();
  const primeiroDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const ultimoDia   = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString().split('T')[0];

  const [filtros, setFiltros] = useState<Record<string, string>>({
    data_inicio: primeiroDia,
    data_fim:    ultimoDia,
  });
  const [buscaOrigem, setBuscaOrigem] = useState('');

  const { data: produtos = [] } = useProdutos();
  const { data: movsRaw = [], isLoading } = useMovimentacoes(filtros);

  // Filtro Origem/Destino no frontend (o campo é texto livre)
  const movs = buscaOrigem
    ? movsRaw.filter(m => (m.origem ?? '').toLowerCase().includes(buscaOrigem.toLowerCase()))
    : movsRaw;

  const totalEntradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0);
  const totalSaidas   = movs.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0);

  function atualizar(campo: string, valor: string) {
    setFiltros(prev => ({ ...prev, [campo]: valor || undefined! }));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/stock" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Movimentações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todas as entradas e saídas de insumos</p>
        </div>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total de Movimentações</p>
          <p className="text-2xl font-bold text-gray-800">{movs.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 mb-1">Total Entradas</p>
          <p className="text-2xl font-bold text-blue-700">{totalEntradas.toFixed(3)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-xs text-orange-600 mb-1">Total Saídas</p>
          <p className="text-2xl font-bold text-orange-700">{totalSaidas.toFixed(3)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <Filter size={16} className="text-gray-400 mt-5" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Produto</label>
          <select onChange={e => atualizar('produto_id', e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos os produtos</option>
            {produtos.map(p => <option key={p.id} value={p.id}>[{p.codigo}] {p.descricao}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select onChange={e => atualizar('tipo', e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Origem / Destino</label>
          <input
            type="text"
            value={buscaOrigem}
            onChange={e => setBuscaOrigem(e.target.value)}
            placeholder="Ex.: SEFA, SERPRO…"
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input type="date" defaultValue={primeiroDia}
            onChange={e => atualizar('data_inicio', e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input type="date" defaultValue={ultimoDia}
            onChange={e => atualizar('data_fim', e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : movs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nenhuma movimentação encontrada no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Data</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Produto</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Tipo</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Quantidade</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Origem / Destino</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">NF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movs.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDate(m.data)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{m.produto_desc}</div>
                      <div className="text-xs text-gray-400">{m.produto_cod}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TipoBadge tipo={m.tipo} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={m.tipo === 'entrada' ? 'text-blue-600' : 'text-orange-600'}>
                        {m.tipo === 'saida' ? '-' : '+'}{m.quantidade.toFixed(3)}
                      </span>
                      <span className="text-gray-400 ml-1">{m.unidade}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.origem ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.nota_fiscal ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
