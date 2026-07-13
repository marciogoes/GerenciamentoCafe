import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Maquina } from '../../types';
import { TIPO_CONTRATO_LABEL } from '../../types';
import { useRegistrarSaida } from '../../hooks/useMachines';
import { useContratos } from '../../hooks/useContracts';
import { getErrorMessage } from '../../services/api';

// ERR-11: contrato_os foi dividido em contrato_id (UUID) + os_referencia (texto livre).
// O DTO do backend usa forbidNonWhitelisted, entao enviar contrato_os retorna 400.
const schema = z.object({
  data_saida:    z.string().min(1, 'Data obrigatória'),
  hora_saida:    z.string().optional(),
  tipo_saida:    z.enum(['locacao', 'comodato', 'evento']),
  local:         z.string().optional(),
  contrato_id:   z.string().uuid('Contrato inválido').optional().or(z.literal('')),
  os_referencia: z.string().max(50, 'Máximo 50 caracteres').optional(),
  ocorrencia:    z.string().optional(),
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

  // Contratos ativos, para vincular a saida a um contrato interno (opcional)
  const { data: contratos } = useContratos({ situacao: 'ativo' });

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_saida: new Date().toISOString().split('T')[0],
      hora_saida: new Date().toTimeString().slice(0, 5),
      tipo_saida: 'locacao',
    },
  });

  const onSubmit = async (values: FormData) => {
    setErro('');
    try {
      // forbidNonWhitelisted + @IsUUID: string vazia quebra a validacao.
      // Remove campos vazios antes de enviar.
      const dto = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== '' && v !== undefined && v !== null),
      );
      await mutation.mutateAsync({ maquinaId: maquina.id, dto });
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

          {/* Tipo de saída — define a situação da máquina (em_locacao / evento) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de saída *</label>
            <select
              {...register('tipo_saida')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="locacao">Locação</option>
              <option value="comodato">Comodato</option>
              <option value="evento">Evento</option>
            </select>
            {errors.tipo_saida && (
              <p className="text-red-500 text-xs mt-1">{errors.tipo_saida.message}</p>
            )}
          </div>

          {/* Contrato interno (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contrato</label>
            <select
              {...register('contrato_id')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— sem contrato vinculado —</option>
              {contratos?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.cliente_nome ?? 'Cliente'} — {TIPO_CONTRATO_LABEL[c.tipo]}
                  {c.maquina_patrimonio ? ` (${c.maquina_patrimonio})` : ''}
                </option>
              ))}
            </select>
            {errors.contrato_id && (
              <p className="text-red-500 text-xs mt-1">{errors.contrato_id.message}</p>
            )}
          </div>

          {/* OS externa — texto livre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OS / Referência</label>
            <input
              type="text"
              {...register('os_referencia')}
              maxLength={50}
              placeholder="Ex: OS-2026-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.os_referencia && (
              <p className="text-red-500 text-xs mt-1">{errors.os_referencia.message}</p>
            )}
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
