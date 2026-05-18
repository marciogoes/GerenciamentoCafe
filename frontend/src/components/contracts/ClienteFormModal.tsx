import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Cliente } from '../../types';

interface Props {
  cliente?: Cliente | null;
  onClose: () => void;
  onSave:  (dto: any) => void;
  loading: boolean;
}

export default function ClienteFormModal({ cliente, onClose, onSave, loading }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      razao_social:     '',
      cnpj:             '',
      endereco:         '',
      segmento:         '',
      contato_nome:     '',
      contato_email:    '',
      contato_telefone: '',
    },
  });

  useEffect(() => {
    if (cliente) reset({
      razao_social:     cliente.razao_social,
      cnpj:             cliente.cnpj,
      endereco:         cliente.endereco ?? '',
      segmento:         cliente.segmento ?? '',
      contato_nome:     cliente.contato_nome ?? '',
      contato_email:    cliente.contato_email ?? '',
      contato_telefone: cliente.contato_telefone ?? '',
    });
  }, [cliente, reset]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-gray-900">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="modal-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Razão Social *</label>
              <input {...register('razao_social', { required: 'Obrigatório' })} className="input-field" />
              {errors.razao_social && <p className="form-error">{errors.razao_social.message}</p>}
            </div>

            <div>
              <label className="form-label">CNPJ * (só dígitos)</label>
              <input
                {...register('cnpj', {
                  required: 'Obrigatório',
                  minLength: { value: 14, message: 'CNPJ deve ter 14 dígitos' },
                  maxLength: { value: 14, message: 'CNPJ deve ter 14 dígitos' },
                })}
                placeholder="00000000000000"
                className="input-field"
              />
              {errors.cnpj && <p className="form-error">{errors.cnpj.message}</p>}
            </div>

            <div>
              <label className="form-label">Segmento</label>
              <input {...register('segmento')} placeholder="Ex: Saúde, Educação..." className="input-field" />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Endereço</label>
              <input {...register('endereco')} className="input-field" />
            </div>

            <div>
              <label className="form-label">Contato (Nome)</label>
              <input {...register('contato_nome')} className="input-field" />
            </div>
            <div>
              <label className="form-label">Telefone / WhatsApp</label>
              <input {...register('contato_telefone')} placeholder="91999999999" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">E-mail de contato</label>
              <input {...register('contato_email')} type="email" className="input-field" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
