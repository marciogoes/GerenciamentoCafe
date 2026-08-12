import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Maquina, MaquinaForaDaBase } from '../../types';
import { SITUACAO_LABEL, SITUACAO_COLOR } from '../../types';
import {
  useMaquinas, useResumoFrota,
  useMaquinasNaBase, useMaquinasForaDaBase,
} from '../../hooks/useMachines';
import { FrotaOverview }          from '../../components/machines/FrotaOverview';
import { MaquinaCard }            from '../../components/machines/MaquinaCard';
import { RegistrarSaidaModal }    from '../../components/machines/RegistrarSaidaModal';
import { RegistrarRetornoModal }  from '../../components/machines/RegistrarRetornoModal';

type Aba = 'frota' | 'fora' | 'base';

export default function MachinesPage() {
  const navigate       = useNavigate();
  const [aba, setAba]             = useState<Aba>('frota');
  const [filtrSituacao, setFilt]  = useState<string | null>(null);
  const [busca, setBusca]         = useState('');

  // Modal de saída
  const [maquinaSaida, setMaquinaSaida] = useState<Maquina | null>(null);
  // Modal de retorno
  const [movRetorno, setMovRetorno]     = useState<MaquinaForaDaBase | null>(null);

  const resumoQ      = useResumoFrota();
  const maquinasQ    = useMaquinas(filtrSituacao ? { situacao: filtrSituacao } : undefined);
  const foraDaBaseQ  = useMaquinasForaDaBase();
  const naBaseQ      = useMaquinasNaBase();

  // Busca no frontend por patrimônio, cliente/local atual ou modelo (rápido)
  const maquinasFiltradas = (maquinasQ.data ?? []).filter(m => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      m.patrimonio.toLowerCase().includes(q) ||
      (m.localizacao_atual ?? '').toLowerCase().includes(q) ||
      (m.modelo_nome ?? '').toLowerCase().includes(q)
    );
  });

  const abas = [
    { id: 'frota',  label: 'Toda a Frota' },
    { id: 'fora',   label: `Fora da Base (${foraDaBaseQ.data?.length ?? 0})` },
    { id: 'base',   label: `Na Base (${naBaseQ.data?.length ?? 0})` },
  ] as const;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Título + botão cadastrar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Máquinas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie sua frota, movimentações e catálogo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/catalog')}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            📋 Catálogo
          </button>
          <button
            onClick={() => navigate('/machines/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Nova máquina
          </button>
        </div>
      </div>

      {/* Cards de resumo de frota */}
      {resumoQ.data && (
        <FrotaOverview
          resumo={resumoQ.data}
          onFiltrar={(s) => { setFilt(s); setAba('frota'); }}
          situacaoAtiva={filtrSituacao}
        />
      )}

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Abas">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                ${aba === a.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}
              `}
            >
              {a.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── ABA: Toda a Frota ─────────────────────────────── */}
      {aba === 'frota' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Buscar por patrimônio, cliente/local (ex.: SEFA, MPF) ou modelo…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {maquinasQ.isLoading && (
            <div className="text-center py-12 text-gray-400">Carregando frota…</div>
          )}

          {!maquinasQ.isLoading && maquinasFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {busca ? 'Nenhuma máquina encontrada para essa busca.' : 'Nenhuma máquina cadastrada ainda.'}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {maquinasFiltradas.map(m => (
              <MaquinaCard
                key={m.id}
                maquina={m}
                onVerDetalhes={id => navigate(`/machines/${id}`)}
                onRegistrarSaida={setMaquinaSaida}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── ABA: Fora da Base ─────────────────────────────── */}
      {aba === 'fora' && (
        <div className="space-y-3">
          {foraDaBaseQ.isLoading && (
            <div className="text-center py-12 text-gray-400">Carregando…</div>
          )}
          {!foraDaBaseQ.isLoading && (foraDaBaseQ.data ?? []).length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhuma máquina fora da base no momento.</div>
          )}
          {(foraDaBaseQ.data ?? []).map(mov => (
            <div
              key={mov.movimentacao_id}
              className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 ${mov.alerta ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div>
                  <p className="font-bold text-gray-800">{mov.patrimonio}</p>
                  <p className="text-xs text-gray-500">
                    Saiu em {new Date(mov.data_saida).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {mov.localizacao && (
                  <p className="text-sm text-gray-600 truncate hidden sm:block">
                    📍 {mov.localizacao}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-semibold ${mov.alerta ? 'text-red-600' : 'text-gray-700'}`}>
                  {mov.dias_fora}d
                </span>
                <button
                  onClick={() => setMovRetorno(mov)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Registrar retorno
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ABA: Na Base ──────────────────────────────────── */}
      {aba === 'base' && (
        <div className="space-y-3">
          {naBaseQ.isLoading && (
            <div className="text-center py-12 text-gray-400">Carregando…</div>
          )}
          {!naBaseQ.isLoading && (naBaseQ.data ?? []).length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhuma máquina na base no momento.</div>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Patrimônio</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-center">Dias na base</th>
                  <th className="px-4 py-3 text-center">Situação</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(naBaseQ.data ?? []).map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.patrimonio}</td>
                    <td className="px-4 py-3 text-gray-600">{m.modelo_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {m.dias_na_base !== null ? `${m.dias_na_base}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SITUACAO_COLOR[m.situacao as keyof typeof SITUACAO_COLOR] ?? ''}`}>
                        {SITUACAO_LABEL[m.situacao as keyof typeof SITUACAO_LABEL] ?? m.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/machines/${m.id}`)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modais ──────────────────────────────────────── */}
      {maquinaSaida && (
        <RegistrarSaidaModal
          maquina={maquinaSaida}
          onClose={() => setMaquinaSaida(null)}
        />
      )}
      {movRetorno && (
        <RegistrarRetornoModal
          movimentacao={movRetorno}
          onClose={() => setMovRetorno(null)}
        />
      )}
    </div>
  );
}
