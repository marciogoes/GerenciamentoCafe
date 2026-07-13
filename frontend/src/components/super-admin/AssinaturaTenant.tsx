import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { CreditCard, Plus, Check, AlertTriangle } from 'lucide-react';
import { superAdminApi, getErrorMessage } from '../../services/api';
import { fmtBRL, fmtDate, fmtCompetencia } from '../../utils/format';
import toast from 'react-hot-toast';

interface Props {
  tenantId:   string;
  tenantNome: string;
}

const STATUS_COR: Record<string, string> = {
  ativo:        'bg-green-100 text-green-800',
  inadimplente: 'bg-red-100 text-red-800',
  cancelado:    'bg-gray-100 text-gray-500',
};

/**
 * ERR-24: assinatura do SaaS ao tenant, com cobranca MANUAL.
 * Sem gateway: o super admin gera a cobranca do mes e da baixa quando o dinheiro
 * entra. Antes disto nao havia registro nenhum de cobranca — o "MRR" era so
 * plano x status calculado em memoria, e nenhum tenant vencia nem devia.
 */
export function AssinaturaTenant({ tenantId, tenantNome }: Props) {
  const qc = useQueryClient();
  const [pagando, setPagando] = useState<string | null>(null);
  const [forma, setForma]     = useState('pix');

  const { data, isLoading } = useQuery(
    ['assinatura', tenantId],
    async () => (await superAdminApi.assinatura(tenantId)).data,
    { enabled: !!tenantId },
  );

  const invalidar = () => {
    qc.invalidateQueries(['assinatura', tenantId]);
    qc.invalidateQueries('tenants');
  };

  const criar = useMutation(
    () => superAdminApi.criarAssinatura(tenantId).then(r => r.data),
    {
      onSuccess: () => { invalidar(); toast.success('Assinatura criada.'); },
      onError:   (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );

  const gerar = useMutation(
    () => superAdminApi.gerarCobranca(tenantId).then(r => r.data),
    {
      onSuccess: () => { invalidar(); toast.success('Cobrança do mês gerada.'); },
      onError:   (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );

  const pagar = useMutation(
    ({ id, forma_pagamento }: { id: string; forma_pagamento: string }) =>
      superAdminApi.pagarCobranca(id, { forma_pagamento }).then(r => r.data),
    {
      onSuccess: () => { invalidar(); setPagando(null); toast.success('Pagamento registrado.'); },
      onError:   (e: any) => { toast.error(getErrorMessage(e)); },
    },
  );

  if (isLoading) {
    return <div className="card p-6"><div className="h-20 bg-gray-100 animate-pulse rounded-lg" /></div>;
  }

  // Tenant ainda sem assinatura
  if (!data) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-blue-600" /> Assinatura do SaaS
        </h3>
        <div className="text-center py-6">
          <CreditCard className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 mb-1">
            {tenantNome} não possui assinatura registrada.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Sem assinatura, este tenant nunca é cobrado e não entra no controle de inadimplência.
          </p>
          <button
            onClick={() => criar.mutate()}
            disabled={criar.isLoading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {criar.isLoading ? 'Criando…' : 'Criar assinatura'}
          </button>
        </div>
      </div>
    );
  }

  const { assinatura, cobrancas, valor_em_aberto, vencidas, total_pago, preco_cheio_plano } = data;
  const temDesconto = Number(assinatura.valor_mensal) < Number(preco_cheio_plano);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" /> Assinatura do SaaS
          <span className={`badge ${STATUS_COR[assinatura.status]}`}>{assinatura.status}</span>
        </h3>
        <button
          onClick={() => gerar.mutate()}
          disabled={gerar.isLoading || assinatura.status === 'cancelado'}
          className="btn-ghost text-sm flex items-center gap-1 text-blue-700 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Gerar cobrança do mês
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
        <div>
          <p className="text-xs text-gray-400">Valor mensal</p>
          <p className="font-bold text-blue-700">{fmtBRL(assinatura.valor_mensal)}</p>
          {temDesconto && (
            <p className="text-xs text-green-600">
              com desconto (cheio: {fmtBRL(preco_cheio_plano)})
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400">Próximo vencimento</p>
          <p className="font-medium">{fmtDate(assinatura.proximo_vencimento)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Em aberto</p>
          <p className={`font-medium ${valor_em_aberto > 0 ? 'text-orange-600' : ''}`}>
            {fmtBRL(valor_em_aberto)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total recebido</p>
          <p className="font-medium text-green-700">{fmtBRL(total_pago)}</p>
        </div>
      </div>

      {vencidas > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {vencidas} cobrança(s) vencida(s) e não paga(s).
        </div>
      )}

      {!cobrancas?.length ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhuma cobrança gerada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase">
              <tr>
                <th className="pb-2 text-left">Competência</th>
                <th className="pb-2 text-left">Vencimento</th>
                <th className="pb-2 text-right">Valor</th>
                <th className="pb-2 text-left">Situação</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cobrancas.map((c: any) => {
                const vencida = !c.data_pagamento && c.data_vencimento < hoje;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2.5">{fmtCompetencia(c.competencia)}</td>
                    <td className="py-2.5">{fmtDate(c.data_vencimento)}</td>
                    <td className="py-2.5 text-right font-medium">{fmtBRL(c.valor)}</td>
                    <td className="py-2.5">
                      {c.data_pagamento ? (
                        <span className="text-green-700 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          pago em {fmtDate(c.data_pagamento)}
                          {c.forma_pagamento && (
                            <span className="text-gray-400">· {c.forma_pagamento}</span>
                          )}
                        </span>
                      ) : vencida ? (
                        <span className="text-red-600 font-medium">vencida</span>
                      ) : (
                        <span className="text-gray-500">em aberto</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {!c.data_pagamento && (
                        pagando === c.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <select
                              value={forma}
                              onChange={e => setForma(e.target.value)}
                              className="input text-xs py-1 bg-white"
                            >
                              <option value="pix">PIX</option>
                              <option value="boleto">Boleto</option>
                              <option value="transferencia">Transferência</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                            <button
                              onClick={() => pagar.mutate({ id: c.id, forma_pagamento: forma })}
                              disabled={pagar.isLoading}
                              className="btn-primary text-xs py-1 px-2 disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setPagando(null)}
                              className="btn-ghost text-xs py-1 px-2"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPagando(c.id)}
                            className="btn-ghost text-xs text-green-700"
                          >
                            Dar baixa
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
