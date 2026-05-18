import { useState }              from 'react';
import { useQuery }              from 'react-query';
import {
  ShieldCheck, Filter, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import clsx                      from 'clsx';
import { auditApi, getErrorMessage } from '../../services/api';
import type { PaginacaoAuditoria }   from '../../types';
import { MODULO_LABEL, MODULO_COLOR } from '../../types';

// ── Ações com label legível ───────────────────────────────────
const ACAO_LABEL: Record<string, string> = {
  LOGIN:              'Login',
  LOGIN_BLOQUEADO:    'Login bloqueado',
  USUARIO_CONVIDADO:  'Usuário convidado',
  CONVITE_ACEITO:     'Convite aceito',
  CONVITE_REENVIADO:  'Convite reenviado',
  USUARIO_ATUALIZADO: 'Usuário atualizado',
  USUARIO_ATIVADO:    'Usuário ativado',
  USUARIO_DESATIVADO: 'Usuário desativado',
};

const ACAO_COLOR: Record<string, string> = {
  LOGIN:              'bg-green-50 text-green-700',
  LOGIN_BLOQUEADO:    'bg-red-50 text-red-700',
  USUARIO_CONVIDADO:  'bg-blue-50 text-blue-700',
  CONVITE_ACEITO:     'bg-teal-50 text-teal-700',
  CONVITE_REENVIADO:  'bg-amber-50 text-amber-700',
  USUARIO_ATUALIZADO: 'bg-violet-50 text-violet-700',
  USUARIO_ATIVADO:    'bg-green-50 text-green-700',
  USUARIO_DESATIVADO: 'bg-gray-100 text-gray-600',
};

export function AuditoriaPage() {
  const [pagina,     setPagina]     = useState(1);
  const [modulo,     setModulo]     = useState('');
  const [acao,       setAcao]       = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim,    setDataFim]    = useState('');
  const porPagina = 25;

  const params = {
    pagina,
    por_pagina: porPagina,
    ...(modulo     && { modulo }),
    ...(acao       && { acao }),
    ...(dataInicio && { data_inicio: dataInicio }),
    ...(dataFim    && { data_fim: dataFim }),
  };

  const { data, isLoading, error } = useQuery<PaginacaoAuditoria>(
    ['audit', params],
    async () => {
      const { data } = await auditApi.listar(params);
      return data as PaginacaoAuditoria;
    },
    { keepPreviousData: true },
  );

  const { data: modulosDisponiveis = [] } = useQuery<string[]>(
    'audit-modulos',
    async () => {
      const { data } = await auditApi.modulos();
      return data as string[];
    },
  );

  const limparFiltros = () => {
    setModulo(''); setAcao('');
    setDataInicio(''); setDataFim('');
    setPagina(1);
  };

  const formatDt = (dt: string) =>
    new Date(dt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-blue-600" /> Log de Auditoria
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registro imutável de todas as ações realizadas no sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Módulo</label>
            <select
              className="input w-full text-sm"
              value={modulo}
              onChange={e => { setModulo(e.target.value); setPagina(1); }}
            >
              <option value="">Todos</option>
              {modulosDisponiveis.map(m => (
                <option key={m} value={m}>{MODULO_LABEL[m] ?? m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Buscar ação</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: LOGIN"
                className="input w-full pl-8 text-sm"
                value={acao}
                onChange={e => { setAcao(e.target.value.toUpperCase()); setPagina(1); }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Data início</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setPagina(1); }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Data fim</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={dataFim}
              onChange={e => { setDataFim(e.target.value); setPagina(1); }}
            />
          </div>
        </div>

        {(modulo || acao || dataInicio || dataFim) && (
          <button
            onClick={limparFiltros}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isLoading ? 'Carregando...' : `${data?.total ?? 0} registros encontrados`}
          </p>
          {data && data.totalPaginas > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-600">{pagina} / {data.totalPaginas}</span>
              <button
                onClick={() => setPagina(p => Math.min(data.totalPaginas, p + 1))}
                disabled={pagina >= data.totalPaginas}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className="p-10 text-center text-red-500 text-sm">
            {getErrorMessage(error)}
          </div>
        ) : isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando registros...</div>
        ) : !data?.itens?.length ? (
          <div className="p-10 text-center text-gray-400">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.itens.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {formatDt(log.criado_em)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">{log.usuario_nome ?? '—'}</p>
                      {log.usuario_id && (
                        <p className="text-gray-400 text-[10px] font-mono">{log.usuario_id.slice(0, 8)}…</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-block text-xs font-semibold px-2 py-0.5 rounded-md',
                        ACAO_COLOR[log.acao] ?? 'bg-gray-100 text-gray-700',
                      )}>
                        {ACAO_LABEL[log.acao] ?? log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-block text-xs font-medium px-2 py-0.5 rounded-md',
                        MODULO_COLOR[log.modulo] ?? 'bg-gray-100 text-gray-600',
                      )}>
                        {MODULO_LABEL[log.modulo] ?? log.modulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={log.descricao ?? ''}>
                      {log.descricao ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {log.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação inferior */}
        {data && data.totalPaginas > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Exibindo {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, data.total)} de {data.total}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPaginas) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={clsx(
                      'w-7 h-7 rounded text-xs font-medium transition-colors',
                      p === pagina
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-600',
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              {data.totalPaginas > 5 && <span className="px-1">…</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditoriaPage;
