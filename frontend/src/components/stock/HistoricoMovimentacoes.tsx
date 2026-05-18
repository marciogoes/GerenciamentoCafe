import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Filter, X } from 'lucide-react';
import { useMovimentacoes } from '../../hooks/useStock';
import type { MovimentacaoEstoque } from '../../types';
import { formatNumber, formatDate } from '../../utils/format';

interface Props {
  produtoId?:    string;
  produtoNome?:  string;
}

const CATEGORIAS_LABEL: Record<string, string> = {
  cappuccino:'Cappuccino', chocolate:'Chocolate', cafe_graos:'Café Grãos',
  cafe_leite:'Café c/ Leite', descartavel:'Descartável', outros:'Outros',
};

export default function HistoricoMovimentacoes({ produtoId, produtoNome }: Props) {
  const [tipo, setTipo]           = useState('');
  const [dataInicio, setDi]       = useState('');
  const [dataFim, setDf]          = useState('');

  const params: Record<string, string> = {};
  if (produtoId) params.produto_id = produtoId;
  if (tipo)      params.tipo       = tipo;
  if (dataInicio) params.data_inicio = dataInicio;
  if (dataFim)    params.data_fim    = dataFim;

  const { data: movs = [], isLoading } = useMovimentacoes(
    Object.keys(params).length ? params : undefined,
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div>
          <label className="form-label text-xs">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="form-input py-1.5 text-sm">
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Data início</label>
          <input type="date" value={dataInicio} onChange={e => setDi(e.target.value)}
            className="form-input py-1.5 text-sm" />
        </div>
        <div>
          <label className="form-label text-xs">Data fim</label>
          <input type="date" value={dataFim} onChange={e => setDf(e.target.value)}
            className="form-input py-1.5 text-sm" />
        </div>
        {(tipo || dataInicio || dataFim) && (
          <button onClick={() => { setTipo(''); setDi(''); setDf(''); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{movs.length} registros</span>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : movs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma movimentação encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                {!produtoId && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Produto</th>}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qtd</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Origem / Destino</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">NF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movs.map((m: MovimentacaoEstoque) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{formatDate(m.data)}</td>
                  {!produtoId && (
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{m.produto_desc}</p>
                      <p className="text-xs text-gray-400">{CATEGORIAS_LABEL[m.categoria]}</p>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.tipo === 'entrada'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {m.tipo === 'entrada'
                        ? <ArrowDownCircle className="w-3 h-3" />
                        : <ArrowUpCircle   className="w-3 h-3" />}
                      {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={m.tipo === 'entrada' ? 'text-emerald-700' : 'text-red-600'}>
                      {m.tipo === 'entrada' ? '+' : '−'}{formatNumber(m.quantidade, 3)} {m.unidade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{m.origem ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.nota_fiscal ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{m.observacao ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
