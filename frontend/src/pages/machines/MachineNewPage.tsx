import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCriarMaquina } from '../../hooks/useMachines';
import { useCatalogo } from '../../hooks/useMachines';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const schema = z.object({
  patrimonio:       z.string().min(1, 'Patrimônio obrigatório'),
  modelo_id:        z.string().uuid('Selecione um modelo'),
  numero_serie:     z.string().min(1, 'Número de série obrigatório'),
  nota_fiscal:      z.string().optional(),
  fornecedor:       z.string().optional(),
  valor_aquisicao:  z.coerce.number().min(0).optional(),
  data_registro:    z.string().optional(),
  situacao:         z.enum(['apta','em_locacao','manutencao','evento','nao_localizada','desativada']),
  localizacao_atual: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const SITUACOES = [
  { value: 'apta',          label: 'Apta' },
  { value: 'manutencao',    label: 'Em Manutenção' },
  { value: 'nao_localizada',label: 'Não Localizada' },
  { value: 'desativada',    label: 'Desativada' },
];

export default function MachineNewPage() {
  const navigate  = useNavigate();
  const criarMut  = useCriarMaquina();
  const catalogoQ = useCatalogo();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { situacao: 'apta' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Record<string, any> = { ...data };
      // backend define situacao='apta' no cadastro e não aceita
      // localizacao_atual na criação — remover para não cair em 400
      delete payload.situacao;
      delete payload.localizacao_atual;
      // remove opcionais vazios/nulos
      Object.keys(payload).forEach(
        k => (payload[k] === '' || payload[k] == null) && delete payload[k],
      );

      await criarMut.mutateAsync(payload);
      navigate('/machines');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">

      {/* Navegação */}
      <button
        onClick={() => navigate('/machines')}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Voltar para Máquinas
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nova Máquina</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cadastre uma nova máquina na frota</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Patrimônio + Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patrimônio <span className="text-red-500">*</span>
            </label>
            <input
              {...register('patrimonio')}
              placeholder="ex: BC160"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.patrimonio && <p className="text-red-500 text-xs mt-1">{errors.patrimonio.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo <span className="text-red-500">*</span>
            </label>
            <select
              {...register('modelo_id')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um modelo…</option>
              {(catalogoQ.data ?? []).map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
            {errors.modelo_id && <p className="text-red-500 text-xs mt-1">{errors.modelo_id.message}</p>}
          </div>
        </div>

        {/* Número de série + Situação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Série <span className="text-red-500">*</span>
            </label>
            <input
              {...register('numero_serie')}
              placeholder="ex: SN123456789"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.numero_serie && <p className="text-red-500 text-xs mt-1">{errors.numero_serie.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situação inicial</label>
            <select
              {...register('situacao')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SITUACOES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nota fiscal + Fornecedor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal</label>
            <input
              {...register('nota_fiscal')}
              placeholder="ex: NF-00123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
            <input
              {...register('fornecedor')}
              placeholder="ex: Distribuidor XYZ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Valor de aquisição + Data de registro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Aquisição (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('valor_aquisicao')}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Registro</label>
            <input
              type="date"
              {...register('data_registro')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Localização */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Localização Atual</label>
          <input
            {...register('localizacao_atual')}
            placeholder="ex: Base / Galpão principal"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/machines')}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-5 py-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || criarMut.isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors"
          >
            {criarMut.isLoading ? 'Salvando…' : 'Cadastrar Máquina'}
          </button>
        </div>
      </form>
    </div>
  );
}
