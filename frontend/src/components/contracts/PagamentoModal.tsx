import { useForm } from 'react-hook-form';
import { X, DollarSign } from 'lucide-react';
import type { LancamentoMensal } from '../../types';
import { fmtBRL, fmtDate, fmtCompetencia } from '../../utils/format';

interface Props {
  lancamento: LancamentoMensal;
  onClose:    () => void;
  onConfirm:  (dto: any) => void;
  loading:    boolean;
}

export default function PagamentoModal({ lancamento, onClose, onConfirm, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      valor_pago:     String(lancamento.valor),
      data_pagamento: new Date().toISOString().split('T')[0],
      data_credito:   '',
      observacao:     '',
    },
  });

  function onSubmit(data: any) {
    onConfirm({
      valor_pago:    parseFloat(data.valor_pago),
      data_pagamento: data.data_pagamento,
      data_credito:  data.data_credito || undefined,
      observacao:    data.observacao   || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Registrar Pagamento
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Resumo do lançamento */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Cliente</span>
            <span className="font-medium text-gray-900">{lancamento.cliente_nome ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Competência</span>
            <span className="text-gray-700">{fmtCompetencia(lancamento.competencia)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vencimento</span>
            <span className={lancamento.alerta_vermelho ? 'text-red-600 font-semibold' : 'text-gray-700'}>
              {fmtDate(lancamento.data_vencimento)}
              {(lancamento.dias_atraso ?? 0) > 0 && ` (${lancamento.dias_atraso}d atraso)`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Valor original</span>
            <span className="font-semibold text-gray-900">{fmtBRL(lancamento.valor)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-4">
          <div>
            <label className="form-label">Valor Pago (R$) *</label>
            <input
              {...register('valor_pago', { required: 'Obrigatório', min: { value: 0.01, message: 'Deve ser > 0' } })}
              type="number"
              step="0.01"
              className="input-field"
            />
            {errors.valor_pago && <p className="form-error">{String(errors.valor_pago.message)}</p>}
          </div>

          <div>
            <label className="form-label">Data do Pagamento *</label>
            <input
              {...register('data_pagamento', { required: 'Obrigatório' })}
              type="date"
              className="input-field"
            />
            {errors.data_pagamento && <p className="form-error">{String(errors.data_pagamento.message)}</p>}
          </div>

          <div>
            <label className="form-label">Data do Crédito <span className="text-gray-400">(opcional)</span></label>
            <input {...register('data_credito')} type="date" className="input-field" />
          </div>

          <div>
            <label className="form-label">Observação</label>
            <input {...register('observacao')} className="input-field" placeholder="Ex: PIX recebido" />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700">
              {loading ? 'Registrando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
