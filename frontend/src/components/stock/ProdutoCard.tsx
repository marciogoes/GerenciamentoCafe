import { AlertTriangle, XCircle, Package } from 'lucide-react';
import type { Produto } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';

interface Props {
  produtos:  Produto[];
  onEntrada: (p: Produto) => void;
  onSaida:   (p: Produto) => void;
}

const CATEGORIA_LABELS: Record<string, string> = {
  cappuccino:  'Cappuccino',
  chocolate:   'Chocolate',
  cafe_graos:  'Café Grãos',
  cafe_leite:  'Café c/ Leite',
  descartavel: 'Descartável',
  outros:      'Outros',
};

const SITUACAO_BADGE: Record<string, string> = {
  normal: 'badge-success',
  baixo:  'badge-warning',
  zerado: 'badge-danger',
};

export default function ProdutoCard({ produto, onEntrada, onSaida }:
  { produto: Produto; onEntrada: (p: Produto) => void; onSaida: (p: Produto) => void }) {

  const saldoClass = produto.situacao === 'zerado'
    ? 'text-red-600 font-bold'
    : produto.situacao === 'baixo'
    ? 'text-amber-600 font-semibold'
    : 'text-emerald-700 font-semibold';

  return (
    <div className={`card p-4 hover:shadow-md transition-shadow ${
      produto.situacao === 'zerado' ? 'border-red-200' :
      produto.situacao === 'baixo'  ? 'border-amber-200' : ''
    }`}>
      {/* Topo */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">{produto.codigo}</p>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{produto.descricao}</p>
          </div>
        </div>
        <span className={`badge ${SITUACAO_BADGE[produto.situacao]}`}>
          {produto.situacao === 'zerado' ? 'Zerado' :
           produto.situacao === 'baixo'  ? 'Estoque Baixo' : 'Normal'}
        </span>
      </div>

      {/* Saldo */}
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className="text-xs text-gray-400">Saldo atual</p>
          <p className={`text-xl ${saldoClass}`}>
            {formatNumber(produto.saldo_atual, 3)} <span className="text-sm">{produto.unidade}</span>
          </p>
          {produto.estoque_minimo != null && (
            <p className="text-xs text-gray-400 mt-0.5">
              Mín: {formatNumber(produto.estoque_minimo, 3)} {produto.unidade}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Valor em estoque</p>
          <p className="text-sm font-semibold text-gray-700">
            {formatCurrency(produto.valor_em_estoque)}
          </p>
        </div>
      </div>

      {/* Alerta */}
      {produto.situacao !== 'normal' && (
        <div className={`flex items-center gap-1.5 text-xs mb-3 px-2 py-1.5 rounded-lg ${
          produto.situacao === 'zerado' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
        }`}>
          {produto.situacao === 'zerado'
            ? <XCircle className="w-3.5 h-3.5" />
            : <AlertTriangle className="w-3.5 h-3.5" />}
          {produto.situacao === 'zerado'
            ? 'Produto sem estoque — repor urgente'
            : 'Saldo abaixo do mínimo configurado'}
        </div>
      )}

      {/* Metadados */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="badge badge-neutral">{CATEGORIA_LABELS[produto.categoria]}</span>
        {produto.marca && <span className="text-xs text-gray-400">{produto.marca}</span>}
        <span className="text-xs text-gray-400 ml-auto">
          R$ {produto.valor_unitario.toFixed(4)}/{produto.unidade}
        </span>
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-2">
        <button
          onClick={() => onEntrada(produto)}
          className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
          + Entrada
        </button>
        <button
          onClick={() => onSaida(produto)}
          disabled={produto.saldo_atual <= 0}
          className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          − Saída
        </button>
      </div>
    </div>
  );
}

// ── Componente de lista ────────────────────────────────────────
export function ProdutoListaVazia() {
  return (
    <div className="col-span-full card p-12 flex flex-col items-center text-center">
      <Package className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
      <p className="text-gray-400 text-sm mt-1">Cadastre produtos para começar a controlar o estoque.</p>
    </div>
  );
}
