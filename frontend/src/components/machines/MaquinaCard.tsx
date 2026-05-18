import React from 'react';
import type { Maquina } from '../../types';
import { SITUACAO_LABEL, SITUACAO_COLOR } from '../../types';

interface Props {
  maquina:     Maquina;
  onVerDetalhes?: (id: string) => void;
  onRegistrarSaida?: (maquina: Maquina) => void;
}

export function MaquinaCard({ maquina, onVerDetalhes, onRegistrarSaida }: Props) {
  const badgeClass = SITUACAO_COLOR[maquina.situacao] ?? 'bg-gray-100 text-gray-600';
  const labelSit   = SITUACAO_LABEL[maquina.situacao] ?? maquina.situacao;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Patrimônio</p>
          <p className="text-lg font-bold text-gray-800">{maquina.patrimonio}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass} whitespace-nowrap`}>
          {labelSit}
        </span>
      </div>

      {/* Modelo */}
      <div>
        <p className="text-sm font-medium text-gray-700">
          {maquina.modelo_nome ?? <span className="text-gray-400 italic">Sem modelo</span>}
        </p>
        {maquina.modelo_categoria && (
          <p className="text-xs text-gray-400 capitalize">{maquina.modelo_categoria}</p>
        )}
      </div>

      {/* Localização quando fora */}
      {maquina.localizacao_atual && (
        <p className="text-xs text-gray-500 flex items-start gap-1">
          <span className="mt-0.5">📍</span>
          <span className="truncate">{maquina.localizacao_atual}</span>
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
        <button
          onClick={() => onVerDetalhes?.(maquina.id)}
          className="flex-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors text-center"
        >
          Ver ficha
        </button>
        {maquina.situacao === 'apta' && onRegistrarSaida && (
          <button
            onClick={() => onRegistrarSaida(maquina)}
            className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded px-2 py-1 transition-colors text-center"
          >
            Registrar saída
          </button>
        )}
      </div>
    </div>
  );
}
