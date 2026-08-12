import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, BarChart2, History, ChevronDown, ChevronUp, Printer, Pencil, Trash2 } from 'lucide-react';
import { useContrato, useAtualizarContrato, useAplicarReajuste, useClientes, useExcluirContrato } from '../../hooks/useContracts';
import { MaquinasDoContrato } from '../../components/contracts/MaquinasDoContrato';
import ContratoFormModal from '../../components/contracts/ContratoFormModal';
import {
  TIPO_CONTRATO_LABEL, SITUACAO_CONTRATO_COLOR, SITUACAO_LANCAMENTO_COLOR, SITUACAO_LANCAMENTO_LABEL,
} from '../../types';
import { fmtBRL, fmtDate, fmtCompetencia } from '../../utils/format';

export default function ContractDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aba, setAba] = useState<'lancamentos' | 'reajustes'>('lancamentos');
  const [showReajusteForm, setShowReajusteForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [reajusteForm, setReajusteForm] = useState({ indice: 'IPCA', percentual: '', data_vigencia: '' });

  const { data: contrato, isLoading } = useContrato(id);
  const { data: clientes = [] } = useClientes();
  const atualizar   = useAtualizarContrato();
  const aplicarReaj = useAplicarReajuste();
  const excluir     = useExcluirContrato();

  function handleExcluir() {
    if (!contrato) return;
    if (!confirm('Excluir este contrato? Se houver pagamentos registrados, ele será apenas encerrado (histórico preservado).')) return;
    excluir.mutate(contrato.id, { onSuccess: () => navigate('/contracts') });
  }

  if (isLoading) return (
    <div className="card p-10 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
    </div>
  );
  if (!contrato) return null;

  function alterarSituacao(situacao: string) {
    if (!confirm(`Confirmar alteração da situação para "${situacao}"?`)) return;
    atualizar.mutate({ id: contrato!.id, dto: { situacao } });
  }

  function handleEditSave(data: any) {
    // AtualizarContratoDto so aceita estes campos (cliente/tipo/assinatura/inicio
    // sao fixos apos criar). Enviar outros quebra com forbidNonWhitelisted.
    const dto: Record<string, any> = {
      valor_mensal:    data.valor_mensal,
      data_fim:        data.data_fim,
      dia_vencimento:  data.dia_vencimento,
      indice_reajuste: data.indice_reajuste,
      observacao:      data.observacao,
    };
    Object.keys(dto).forEach(k => dto[k] === undefined && delete dto[k]);
    atualizar.mutate(
      { id: contrato!.id, dto },
      { onSuccess: () => setShowEdit(false) },
    );
  }

  function handleReajuste(e: React.FormEvent) {
    e.preventDefault();
    if (!reajusteForm.percentual || !reajusteForm.data_vigencia) return;
    aplicarReaj.mutate(
      { id: contrato!.id, dto: {
        indice:        reajusteForm.indice,
        percentual:    parseFloat(reajusteForm.percentual),
        data_vigencia: reajusteForm.data_vigencia,
      }},
      { onSuccess: () => setShowReajusteForm(false) },
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/contracts')} className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
      </button>

      {/* Header do contrato */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {TIPO_CONTRATO_LABEL[contrato.tipo]} — {contrato.cliente_nome ?? 'Cliente'}
              </h1>
              <span className={`badge ${SITUACAO_CONTRATO_COLOR[contrato.situacao]}`}>
                {contrato.situacao}
              </span>
            </div>
            {contrato.maquina_patrimonio && (
              <p className="text-sm text-gray-500 mt-1">Máquina: {contrato.maquina_patrimonio}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-700">{fmtBRL(contrato.valor_mensal)}</p>
            <p className="text-xs text-gray-400">por mês · vence dia {contrato.dia_vencimento}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Assinatura</p>
            <p className="font-medium">{fmtDate(contrato.data_assinatura)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Início</p>
            <p className="font-medium">{fmtDate(contrato.data_inicio)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Fim</p>
            <p className="font-medium">{contrato.data_fim ? fmtDate(contrato.data_fim) : 'Indeterminado'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Último reajuste</p>
            <p className="font-medium">{contrato.ultimo_reajuste_em ? fmtDate(contrato.ultimo_reajuste_em) : '—'}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {contrato.situacao !== 'encerrado' && (
            <button
              onClick={() => setShowEdit(true)}
              className="btn-ghost text-sm flex items-center gap-1 text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
          )}
          <button
            onClick={handleExcluir}
            disabled={excluir.isLoading}
            className="btn-ghost text-sm flex items-center gap-1 text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>

          {/* Botão PDF — somente para contratos de evento */}
          {contrato.tipo === 'evento' && (
            <button
              onClick={() => navigate(`/contracts/evento/${contrato.id}/pdf`)}
              className="btn-ghost text-sm flex items-center gap-1 text-blue-700 border border-blue-300 hover:bg-blue-50"
            >
              <Printer className="w-4 h-4" /> Gerar Contrato PDF
            </button>
          )}

          {contrato.situacao === 'ativo' && (
            <>
              <button
                onClick={() => { setShowReajusteForm(v => !v); }}
                className="btn-ghost text-sm flex items-center gap-1"
              >
                <BarChart2 className="w-4 h-4" /> Aplicar Reajuste
                {showReajusteForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button onClick={() => alterarSituacao('suspenso')} className="btn-ghost text-sm text-yellow-700">
                Suspender
              </button>
              <button onClick={() => alterarSituacao('encerrado')} className="btn-ghost text-sm text-red-700">
                Encerrar
              </button>
            </>
          )}
          {contrato.situacao === 'suspenso' && (
            <button onClick={() => alterarSituacao('ativo')} className="btn-ghost text-sm text-green-700">
              Reativar
            </button>
          )}
        </div>

        {/* Formulário de reajuste inline */}
        {showReajusteForm && (
          <form onSubmit={handleReajuste} className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="form-label text-xs">Índice</label>
              <select
                value={reajusteForm.indice}
                onChange={e => setReajusteForm(f => ({ ...f, indice: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="IPCA">IPCA</option>
                <option value="IGP-M">IGP-M</option>
                <option value="fixo">Fixo</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Percentual (%)</label>
              <input
                type="number" step="0.01"
                value={reajusteForm.percentual}
                onChange={e => setReajusteForm(f => ({ ...f, percentual: e.target.value }))}
                placeholder="5.76"
                required
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="form-label text-xs">Vigência (a partir de)</label>
              <input
                type="date"
                value={reajusteForm.data_vigencia}
                onChange={e => setReajusteForm(f => ({ ...f, data_vigencia: e.target.value }))}
                required
                className="input-field text-sm"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={aplicarReaj.isLoading} className="btn-primary text-sm w-full">
                {aplicarReaj.isLoading ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
            {reajusteForm.percentual && contrato.valor_mensal && (
              <div className="col-span-full text-sm text-blue-700 bg-blue-100 rounded p-2">
                Novo valor: {fmtBRL(Number(contrato.valor_mensal) * (1 + Number(reajusteForm.percentual) / 100))}
                {' '}(era {fmtBRL(contrato.valor_mensal)})
              </div>
            )}
          </form>
        )}
      </div>

      {/* ERR-03: máquinas vinculadas (tabela N:N contrato_maquinas) */}
      <MaquinasDoContrato
        contratoId={contrato.id}
        editavel={contrato.situacao !== 'encerrado'}
      />

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([
            { key: 'lancamentos', label: 'Lançamentos', icon: FileText },
            { key: 'reajustes',   label: 'Histórico de Reajustes', icon: History },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`flex items-center gap-1.5 py-2 border-b-2 text-sm font-medium transition-colors ${
                aba === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Lançamentos */}
      {aba === 'lancamentos' && (
        <div className="space-y-2">
          {(contrato.lancamentos ?? []).length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              Nenhum lançamento gerado ainda
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Competência</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Pago</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(contrato.lancamentos ?? []).map(l => (
                    <tr key={l.id} className={l.alerta_vermelho ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">{fmtCompetencia(l.competencia)}</td>
                      <td className={`px-4 py-3 hidden sm:table-cell ${l.alerta_vermelho ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {fmtDate(l.data_vencimento)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtBRL(l.valor)}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-gray-500">
                        {l.valor_pago ? fmtBRL(l.valor_pago) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${SITUACAO_LANCAMENTO_COLOR[l.situacao]}`}>
                          {SITUACAO_LANCAMENTO_LABEL[l.situacao]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reajustes */}
      {aba === 'reajustes' && (
        <div className="space-y-3">
          {(contrato.reajustes ?? []).length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              Nenhum reajuste registrado
            </div>
          ) : (
            (contrato.reajustes ?? []).map(r => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {r.indice} · +{r.percentual}%
                    </p>
                    <p className="text-sm text-gray-500">
                      Vigência: {fmtDate(r.data_vigencia)} · Aplicado em {fmtDate(r.criado_em)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 line-through">{fmtBRL(r.valor_anterior)}</p>
                    <p className="font-bold text-green-700">{fmtBRL(r.valor_novo)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de edição do contrato */}
      {showEdit && (
        <ContratoFormModal
          contrato={contrato}
          clientes={clientes}
          loading={atualizar.isLoading}
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
