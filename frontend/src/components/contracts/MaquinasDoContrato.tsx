import { useState } from 'react';
import { Coffee, Plus, X } from 'lucide-react';
import {
  useMaquinasDoContrato, useVincularMaquina, useDesvincularMaquina,
} from '../../hooks/useContracts';
import { useMaquinas } from '../../hooks/useMachines';
import { fmtDate } from '../../utils/format';

interface Props {
  contratoId: string;
  /** Contratos encerrados nao aceitam vinculo novo */
  editavel: boolean;
}

/**
 * ERR-03: maquinas vinculadas ao contrato (tabela N:N contrato_maquinas).
 * Antes desta tela, o vinculo simplesmente nao existia: o backend gravava
 * em contrato.maquina_id (deprecated) e contrato_maquinas ficava sempre vazia,
 * entao o ciclo maquina -> contrato -> leitura de dose -> fatura nao fechava.
 */
export function MaquinasDoContrato({ contratoId, editavel }: Props) {
  const [adicionando, setAdicionando] = useState(false);
  const [selecionada, setSelecionada] = useState('');

  const { data: vinculadas, isLoading } = useMaquinasDoContrato(contratoId);
  const { data: todas }                 = useMaquinas();
  const vincular    = useVincularMaquina();
  const desvincular = useDesvincularMaquina();

  // So oferece maquinas que ainda nao estao neste contrato
  const jaVinculadas = new Set((vinculadas ?? []).map(m => m.maquina_id));
  const disponiveis  = (todas ?? []).filter(m => !jaVinculadas.has(m.id));

  function handleVincular() {
    if (!selecionada) return;
    vincular.mutate(
      { id: contratoId, maquina_id: selecionada },
      { onSuccess: () => { setSelecionada(''); setAdicionando(false); } },
    );
  }

  function handleDesvincular(maquinaId: string, patrimonio: string) {
    if (!confirm(`Desvincular a máquina ${patrimonio} deste contrato?`)) return;
    desvincular.mutate({ id: contratoId, maquinaId });
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
          <Coffee className="w-4 h-4 text-blue-600" />
          Máquinas do Contrato
          {vinculadas?.length ? (
            <span className="text-xs font-normal text-gray-400">({vinculadas.length})</span>
          ) : null}
        </h2>

        {editavel && !adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="btn-ghost text-sm flex items-center gap-1 text-blue-700"
          >
            <Plus className="w-4 h-4" /> Vincular máquina
          </button>
        )}
      </div>

      {/* Form de vinculo */}
      {adicionando && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 items-center flex-wrap">
          <select
            value={selecionada}
            onChange={e => setSelecionada(e.target.value)}
            className="input flex-1 min-w-[200px] bg-white"
          >
            <option value="">Selecione a máquina…</option>
            {disponiveis.map(m => (
              <option key={m.id} value={m.id}>
                {m.patrimonio}
                {m.numero_serie ? ` — série ${m.numero_serie}` : ''}
                {` (${m.situacao})`}
              </option>
            ))}
          </select>
          <button
            onClick={handleVincular}
            disabled={!selecionada || vincular.isLoading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {vincular.isLoading ? 'Vinculando…' : 'Vincular'}
          </button>
          <button
            onClick={() => { setAdicionando(false); setSelecionada(''); }}
            className="btn-ghost text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="h-16 bg-gray-100 animate-pulse rounded-lg" />
      ) : !vinculadas?.length ? (
        <div className="text-center py-6">
          <Coffee className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nenhuma máquina vinculada a este contrato.</p>
          <p className="text-xs text-gray-400 mt-1">
            Sem vínculo, as leituras de dose não têm como ser faturadas.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {vinculadas.map(m => (
            <div key={m.maquina_id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">
                  {m.patrimonio}
                  {m.modelo_nome && (
                    <span className="text-gray-400 font-normal"> · {m.modelo_nome}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {m.localizacao_atual ?? 'Sem localização registrada'}
                  {' · '}vinculada em {fmtDate(m.data_inclusao)}
                </p>
              </div>
              {editavel && (
                <button
                  onClick={() => handleDesvincular(m.maquina_id, m.patrimonio)}
                  disabled={desvincular.isLoading}
                  className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Desvincular máquina"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
