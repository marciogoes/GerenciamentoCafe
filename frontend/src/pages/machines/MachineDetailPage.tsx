import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaquina } from '../../hooks/useMachines';
import { SITUACAO_LABEL, SITUACAO_COLOR } from '../../types';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatCurrency(v: number | null) {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MachineDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMaquina(id ?? '');

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
      Carregando ficha da máquina…
    </div>
  );

  if (isError || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-500">
      <p>Máquina não encontrada.</p>
      <button onClick={() => navigate('/machines')} className="text-blue-600 hover:underline text-sm">
        Voltar para a lista
      </button>
    </div>
  );

  const badgeClass = SITUACAO_COLOR[data.situacao];
  const labelSit   = SITUACAO_LABEL[data.situacao];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* Navegação */}
      <button
        onClick={() => navigate('/machines')}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Voltar para Máquinas
      </button>

      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Patrimônio</p>
            <h1 className="text-3xl font-bold text-gray-800">{data.patrimonio}</h1>
            {data.modelo_nome && (
              <p className="text-gray-500 mt-1">{data.modelo_nome}</p>
            )}
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
            {labelSit}
          </span>
        </div>

        {data.localizacao_atual && (
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-1">
            <span>📍</span> {data.localizacao_atual}
          </p>
        )}
      </div>

      {/* Dados patrimoniais */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Dados Patrimoniais</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          {[
            ['Nº de Série',     data.numero_serie],
            ['Nota Fiscal',     data.nota_fiscal],
            ['Fornecedor',      data.fornecedor],
            ['Valor de Aquisição', formatCurrency(data.valor_aquisicao)],
            ['Data de Registro',   formatDate(data.data_registro)],
            ['Contrato Ativo',     data.contrato_ativo_id ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
              <dd className="font-medium text-gray-700 break-all">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        {data.observacao && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Observação</p>
            <p className="text-sm text-gray-700">{data.observacao}</p>
          </div>
        )}
      </div>

      {/* Modelo do catálogo */}
      {data.modelo && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Modelo — {data.modelo.nome}</h2>
          <div className="flex gap-4">
            {data.modelo.foto_url && (
              <img
                src={data.modelo.foto_url}
                alt={data.modelo.nome}
                className="w-24 h-24 object-cover rounded-xl border border-gray-200 shrink-0"
              />
            )}
            <div className="text-sm space-y-1 text-gray-600">
              {data.modelo.bebidas && <p><span className="font-medium text-gray-700">Bebidas:</span> {data.modelo.bebidas}</p>}
              {data.modelo.especificacoes && <p><span className="font-medium text-gray-700">Especificações:</span> {data.modelo.especificacoes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Movimentação atual */}
      {data.movimentacao_aberta && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-orange-700 mb-3">⚠️ Saída em Aberto</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Data de saída</p>
              <p className="font-medium">{formatDate(data.movimentacao_aberta.data_saida)}</p>
            </div>
            {data.movimentacao_aberta.local && (
              <div>
                <p className="text-xs text-gray-400">Local</p>
                <p className="font-medium">{data.movimentacao_aberta.local}</p>
              </div>
            )}
            {data.movimentacao_aberta.contrato_os && (
              <div>
                <p className="text-xs text-gray-400">Contrato/OS</p>
                <p className="font-medium">{data.movimentacao_aberta.contrato_os}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Histórico de movimentações */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Histórico de Movimentações</h2>
        {data.historico.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase">
                <tr>
                  <th className="pb-2 text-left">Saída</th>
                  <th className="pb-2 text-left">Local / Contrato</th>
                  <th className="pb-2 text-left">Retorno</th>
                  <th className="pb-2 text-center">Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.historico.map(mov => (
                  <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDate(mov.data_saida)}</td>
                    <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">
                      {mov.local ?? mov.contrato_os ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {mov.data_retorno
                        ? formatDate(mov.data_retorno)
                        : <span className="text-orange-600 font-medium">Em aberto</span>
                      }
                    </td>
                    <td className="py-3 text-center text-gray-500">
                      {mov.periodo_dias !== null ? `${mov.periodo_dias}d` : '—'}
                    </td>
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
