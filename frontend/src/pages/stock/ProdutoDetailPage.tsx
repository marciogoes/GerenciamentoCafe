import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduto, useMovimentacoes } from '../../hooks/useStock';
import { MovimentacaoModal }   from '../../components/stock/MovimentacaoModal';
import { ProdutoFormModal }    from '../../components/stock/ProdutoFormModal';
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle,
  Edit, AlertTriangle, Package,
} from 'lucide-react';
import { formataMoeda } from '../../utils/format';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export function ProdutoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: produto, isLoading } = useProduto(id);
  const { data: movs = [] } = useMovimentacoes({ produto_id: id! });

  const [modalMov,  setModalMov]  = useState<'entrada' | 'saida' | null>(null);
  const [modalEdit, setModalEdit] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">Carregando...</div>;
  }
  if (!produto) {
    return <div className="flex items-center justify-center py-24 text-gray-400">Produto não encontrado.</div>;
  }

  // Constrói histórico de saldo para o gráfico (mais antigo → mais recente)
  const movsOrdenados = [...movs].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );
  let saldoCorrido = 0;
  const dadosGrafico = movsOrdenados.map(m => {
    saldoCorrido += m.tipo === 'entrada' ? m.quantidade : -m.quantidade;
    return {
      data: new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR'),
      saldo: parseFloat(saldoCorrido.toFixed(3)),
      tipo: m.tipo,
    };
  });

  const corSituacao = produto.situacao === 'normal'
    ? 'bg-emerald-100 text-emerald-700'
    : produto.situacao === 'baixo'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link to="/stock" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{produto.descricao}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Código: <strong>{produto.codigo}</strong>
            {produto.marca && <> · {produto.marca}</>}
            {' · '}{produto.categoria ?? 'Sem categoria'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalMov('entrada')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <ArrowDownCircle size={15} /> Entrada
          </button>
          <button onClick={() => setModalMov('saida')}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
            <ArrowUpCircle size={15} /> Saída
          </button>
          <button onClick={() => setModalEdit(true)}
            className="flex items-center gap-2 px-3 py-2 border text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            <Edit size={15} /> Editar
          </button>
        </div>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Saldo Atual</p>
          <p className={`text-2xl font-bold ${produto.situacao !== 'normal' ? 'text-red-600' : 'text-gray-800'}`}>
            {produto.saldo_atual.toFixed(3)}
          </p>
          <p className="text-sm text-gray-400">{produto.unidade}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Valor em Estoque</p>
          <p className="text-2xl font-bold text-emerald-700">{formataMoeda(produto.valor_em_estoque)}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Custo Unitário</p>
          <p className="text-2xl font-bold text-gray-800">{formataMoeda(produto.valor_unitario)}</p>
          <p className="text-xs text-gray-400">por {produto.unidade}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-gray-500">Situação</p>
          <span className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold ${corSituacao} self-start`}>
            {produto.situacao === 'normal' ? 'Normal' : produto.situacao === 'baixo' ? 'Estoque Baixo' : 'Zerado'}
          </span>
          {produto.estoque_minimo != null && (
            <p className="text-xs text-gray-400 mt-1">Mín: {produto.estoque_minimo.toFixed(3)} {produto.unidade}</p>
          )}
        </div>
      </div>

      {/* Alerta */}
      {produto.situacao !== 'normal' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-yellow-600" size={18} />
          <p className="text-sm text-yellow-800">
            {produto.situacao === 'zerado'
              ? 'Produto zerado! Registre uma entrada para repor o estoque.'
              : `Estoque abaixo do mínimo (${produto.estoque_minimo?.toFixed(3)} ${produto.unidade}). Considere fazer um novo pedido.`}
          </p>
        </div>
      )}

      {/* Gráfico de evolução de saldo */}
      {dadosGrafico.length > 1 && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Evolução do Saldo</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dadosGrafico}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`${Number(v).toFixed(3)} ${produto.unidade}`, 'Saldo']} />
              <Area type="monotone" dataKey="saldo" stroke="#10b981" fill="url(#gradSaldo)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico de movimentações */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Histórico de Movimentações</h2>
          <span className="text-xs text-gray-400">{movs.length} registro(s)</span>
        </div>
        {movs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Nenhuma movimentação registrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-5 py-2 text-gray-500 font-medium">Data</th>
                  <th className="text-center px-4 py-2 text-gray-500 font-medium">Tipo</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium">Quantidade</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Origem / Destino</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">NF</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movs.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.tipo === 'entrada'
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"><ArrowDownCircle size={11} /> Entrada</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold"><ArrowUpCircle size={11} /> Saída</span>
                      }
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${m.tipo === 'entrada' ? 'text-blue-600' : 'text-orange-600'}`}>
                      {m.tipo === 'saida' ? '-' : '+'}{m.quantidade.toFixed(3)} {produto.unidade}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.origem ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.nota_fiscal ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{m.observacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalMov && (
        <MovimentacaoModal tipo={modalMov} produtoIdInicial={produto.id} onClose={() => setModalMov(null)} />
      )}
      {modalEdit && (
        <ProdutoFormModal produto={produto} onClose={() => setModalEdit(false)} />
      )}
    </div>
  );
}
