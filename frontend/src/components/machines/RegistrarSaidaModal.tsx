import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Maquina } from '../../types';
import { useRegistrarSaida } from '../../hooks/useMachines';
import { getErrorMessage } from '../../services/api';

const schema = z.object({
  data_saida:  z.string().min(1, 'Data obrigatória'),
  hora_saida:  z.string().optional(),
  local:       z.string().optional(),
  contrato_os: z.string().optional(),
  ocorrencia:  z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  maquina:    Maquina;
  onClose:    () => void;
  onSuccess?: () => void;
}

export function RegistrarSaidaModal({ maquina, onClose, onSuccess }: Props) {
  const [erro, setErro] = useState('');
  const mutation        = useRegistrarSaida();

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_saida: new Date().toISOString().split('T')[0],
      hora_saida: new Date().toTimeString().slice(0, 5),
    },
  });

  const onSubmit = async (values: FormData) => {
    setErro('');
    try {
      await mutation.mutateAsync({ maquinaId: maquina.id, dto: values });
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
            <h2 className="text-lg font-bold text-gray-800">Registrar Saída</h2>
            <p className="text-sm text-gray-500">Patrimônio: <strong>{maquina.patrimonio}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de saída *</label>
              <input
                type="date"
                {...register('data_saida')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.data_saida && (
                <p className="text-red-500 text-xs mt-1">{errors.data_saida.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de saída</label>
              <input
                type="time"
                {...register('hora_saida')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Local / Endereço de destino</label>
            <input
              type="text"
              {...register('local')}
              placeholder="Ex: Av. Almirante Barroso, 1234 — Belém/PA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contrato / OS */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contrato / OS</label>
            <input
              type="text"
              {...register('contrato_os')}
              placeholder="Ex: CONT-2026-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Ocorrência */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ocorrência / Observação</label>
            <textarea
              {...register('ocorrencia')}
              rows={2}
              placeholder="Ex: Máquina com pequeno arranhão na lataria"
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
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Registrando…' : 'Confirmar Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
