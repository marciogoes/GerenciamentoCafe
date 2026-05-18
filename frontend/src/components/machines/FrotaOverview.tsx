import React from 'react';
import type { ResumoFrota } from '../../types';

interface Props {
  resumo: ResumoFrota;
  onFiltrar?: (situacao: string | null) => void;
  situacaoAtiva?: string | null;
}

const CARDS = [
  { key: 'apta',           label: 'Aptas',            bg: 'bg-green-50',  borda: 'border-green-400',  texto: 'text-green-700',  icone: '✅' },
  { key: 'em_locacao',     label: 'Em Locação',        bg: 'bg-blue-50',   borda: 'border-blue-400',   texto: 'text-blue-700',   icone: '📦' },
  { key: 'manutencao',     label: 'Em Manutenção',     bg: 'bg-yellow-50', borda: 'border-yellow-400', texto: 'text-yellow-700', icone: '🔧' },
  { key: 'evento',         label: 'Em Evento',         bg: 'bg-purple-50', borda: 'border-purple-400', texto: 'text-purple-700', icone: '🎯' },
  { key: 'nao_localizada', label: 'Não Localizada',    bg: 'bg-red-50',    borda: 'border-red-400',    texto: 'text-red-700',    icone: '❓' },
  { key: 'desativada',     label: 'Desativadas',       bg: 'bg-gray-50',   borda: 'border-gray-300',   texto: 'text-gray-500',   icone: '⛔' },
] as const;

export function FrotaOverview({ resumo, onFiltrar, situacaoAtiva }: Props) {
  const total = Object.values(resumo).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">
          Visão Geral da Frota
          <span className="ml-2 text-sm font-normal text-gray-400">— {total} máquina{total !== 1 ? 's' : ''} no total</span>
        </h2>
        {situacaoAtiva && (
          <button
            onClick={() => onFiltrar?.(null)}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CARDS.map(({ key, label, bg, borda, texto, icone }) => {
          const qty      = resumo[key] ?? 0;
          const ativo    = situacaoAtiva === key;
          const cursor   = onFiltrar ? 'cursor-pointer' : '';
          const ring     = ativo ? 'ring-2 ring-offset-1 ring-blue-500' : '';
          return (
            <div
              key={key}
              onClick={() => onFiltrar?.(ativo ? null : key)}
              className={`
                ${bg} ${cursor} ${ring}
                border-l-4 ${borda} rounded-lg p-3
                hover:shadow-md transition-shadow
              `}
            >
              <div className="text-xl mb-1">{icone}</div>
              <div className={`text-2xl font-bold ${texto}`}>{qty}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
