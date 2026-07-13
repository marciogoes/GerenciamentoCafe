import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MaquinaForaDaBase } from '../../types';
import { useRegistrarRetorno } from '../../hooks/useMachines';
import { getErrorMessage } from '../../services/api';

const schema = z.object({
  data_retorno:       z.string().min(1, 'Data obrigatória'),
  hora_retorno:       z.string().optional(),
  situacao_retorno:   z.enum(['apta', 'manutencao']).default('apta'),
  ocorrencia_retorno: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  movimentacao: MaquinaForaDaBase;
  onClose:      () => void;
  onSuccess?:   () => void;
}

export function RegistrarRetornoModal({ movimentacao, onClose, onSuccess }: Props) {
  const [erro, setErro] = useState('');
  const mutation        = useRegistrarRetorno();

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_retorno:     new Date().toISOString().split('T')[0],
      hora_retorno:     new Date().toTimeString().slice(0, 5),
      situacao_retorno: 'apta',
    },
  });

  const onSubmit = async (values: FormData) => {
    setErro('');
    try {
      await mutation.mutateAsync({ movId: movimentacao.movimentacao_id, dto: values });
      onSuccess?.();
      onClose();
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Registrar Retorno</h2>
            <p className="text-sm text-gray-500">
              Patrimônio: <strong>{movimentacao.patrimonio}</strong>
              {' · '}
              <span className={movimentacao.alerta ? 'text-red-600 font-medium' : 'text-gray-500'}>
                {movimentacao.dias_fora} dias fora
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Resumo da saída */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 text-sm text-gray-600 space-y-1">
          <p><span className="font-medium">Saiu em:</span> {new Date(movimentacao.data_saida).toLocaleDateString('pt-BR')}</p>
          {movimentacao.localizacao && (
            <p><span className="font-medium">Local:</span> {movimentacao.localizacao}</p>
          )}
          {/* ERR-11: contrato_os virou contrato_id + os_referencia */}
          {movimentacao.os_referencia && (
            <p><span className="font-medium">OS:</span> {movimentacao.os_referencia}</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de retorno *</label>
              <input
                type="date"
                {...register('data_retorno')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.data_retorno && (
                <p className="text-red-500 text-xs mt-1">{errors.data_retorno.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de retorno</label>
              <input
                type="time"
                {...register('hora_retorno')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Situação após retorno */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Situação após retorno *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'apta',       label: '✅ Apta',          ring: 'ring-green-500' },
                { value: 'manutencao', label: '🔧 Manutenção',    ring: 'ring-yellow-500' },
              ].map(({ value, label, ring }) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" {...register('situacao_retorno')} value={value} className="sr-only peer" />
                  <div className={`border-2 border-gray-200 peer-checked:border-blue-500 peer-checked:${ring} peer-checked:ring-2 rounded-lg px-3 py-2 text-sm text-center select-none transition-all`}>
                    {label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Ocorrência */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ocorrência / Observação</label>
            <textarea
              {...register('ocorrencia_retorno')}
              rows={2}
              placeholder="Ex: Placa de controle com defeito"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Registrando…' : 'Confirmar Retorno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
