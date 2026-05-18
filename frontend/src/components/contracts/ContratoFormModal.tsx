import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Contrato, Cliente } from '../../types';

interface Props {
  contrato?:             Contrato | null;
  clientes:              Cliente[];
  clientePreSelecionado?: string;
  onClose:  () => void;
  onSave:   (dto: any) => void;
  loading:  boolean;
}

export default function ContratoFormModal({ contrato, clientes, clientePreSelecionado, onClose, onSave, loading }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      cliente_id:      clientePreSelecionado ?? '',
      tipo:            'locacao',
      valor_mensal:    '',
      data_assinatura: '',
      data_inicio:     '',
      data_fim:        '',
      dia_vencimento:  '10',
      indice_reajuste: '',
      observacao:      '',
    },
  });

  useEffect(() => {
    if (contrato) reset({
      cliente_id:      contrato.cliente_id,
      tipo:            contrato.tipo,
      valor_mensal:    String(contrato.valor_mensal),
      data_assinatura: contrato.data_assinatura,
      data_inicio:     contrato.data_inicio,
      data_fim:        contrato.data_fim ?? '',
      dia_vencimento:  String(contrato.dia_vencimento),
      indice_reajuste: contrato.indice_reajuste ?? '',
      observacao:      contrato.observacao ?? '',
    });
  }, [contrato, reset]);

  function onSubmit(data: any) {
    onSave({
      ...data,
      valor_mensal:   parseFloat(data.valor_mensal),
      dia_vencimento: parseInt(data.dia_vencimento),
      data_fim:       data.data_fim || undefined,
      indice_reajuste: data.indice_reajuste || undefined,
      observacao:     data.observacao || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-gray-900">
            {contrato ? 'Editar Contrato' : 'Novo Contrato'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="sm:col-span-2">
              <label className="form-label">Cliente *</label>
              <select
                {...register('cliente_id', { required: 'Selecione um cliente' })}
                className="input-field"
                disabled={!!contrato}
              >
                <option value="">— Selecione —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
              </select>
              {errors.cliente_id && <p className="form-error">{String(errors.cliente_id.message)}</p>}
            </div>

            {/* Tipo */}
            <div>
              <label className="form-label">Tipo *</label>
              <select {...register('tipo')} className="input-field">
                <option value="locacao">Locação</option>
                <option value="comodato">Comodato</option>
                <option value="evento">Evento</option>
              </select>
            </div>

            {/* Valor */}
            <div>
              <label className="form-label">Valor Mensal (R$) *</label>
              <input
                {...register('valor_mensal', {
                  required: 'Obrigatório',
                  min: { value: 0.01, message: 'Deve ser maior que zero' },
                })}
                type="number"
                step="0.01"
                placeholder="350.00"
                className="input-field"
              />
              {errors.valor_mensal && <p className="form-error">{String(errors.valor_mensal.message)}</p>}
            </div>

            {/* Datas */}
            <div>
              <label className="form-label">Data Assinatura *</label>
              <input {...register('data_assinatura', { required: 'Obrigatório' })} type="date" className="input-field" />
              {errors.data_assinatura && <p className="form-error">{String(errors.data_assinatura.message)}</p>}
            </div>
            <div>
              <label className="form-label">Início da Vigência *</label>
              <input {...register('data_inicio', { required: 'Obrigatório' })} type="date" className="input-field" />
              {errors.data_inicio && <p className="form-error">{String(errors.data_inicio.message)}</p>}
            </div>
            <div>
              <label className="form-label">Fim da Vigência <span className="text-gray-400">(deixe em branco = indeterminado)</span></label>
              <input {...register('data_fim')} type="date" className="input-field" />
            </div>

            {/* Vencimento */}
            <div>
              <label className="form-label">Dia de Vencimento (1–28) *</label>
              <input
                {...register('dia_vencimento', {
                  required: 'Obrigatório',
                  min: { value: 1, message: 'Min 1' },
                  max: { value: 28, message: 'Max 28' },
                })}
                type="number"
                min="1" max="28"
                className="input-field"
              />
              {errors.dia_vencimento && <p className="form-error">{String(errors.dia_vencimento.message)}</p>}
            </div>

            {/* Índice */}
            <div>
              <label className="form-label">Índice de Reajuste</label>
              <select {...register('indice_reajuste')} className="input-field">
                <option value="">— Não definido —</option>
                <option value="IPCA">IPCA</option>
                <option value="IGP-M">IGP-M</option>
                <option value="fixo">Percentual fixo</option>
              </select>
            </div>

            {/* Observação */}
            <div className="sm:col-span-2">
              <label className="form-label">Observações</label>
              <textarea {...register('observacao')} rows={2} className="input-field resize-none" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
