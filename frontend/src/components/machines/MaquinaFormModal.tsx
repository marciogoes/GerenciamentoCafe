import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Pencil } from 'lucide-react';
import { useAtualizarMaquina, useCatalogo } from '../../hooks/useMachines';
import type { MaquinaCompleta } from '../../types';

// Campos alinhados ao AtualizarMaquinaDto do backend. O onSubmit remove
// opcionais vazios antes de enviar (forbidNonWhitelisted + @IsUUID nao aceitam '').
const schema = z.object({
  patrimonio:        z.string().min(1, 'Patrimônio obrigatório'),
  modelo_id:         z.string().uuid('Selecione um modelo válido').optional().or(z.literal('')),
  numero_serie:      z.string().optional(),
  nota_fiscal:       z.string().optional(),
  fornecedor:        z.string().optional(),
  valor_aquisicao:   z.coerce.number().min(0).optional(),
  data_registro:     z.string().optional(),
  situacao:          z.enum(['apta','em_locacao','manutencao','evento','nao_localizada','desativada']),
  localizacao_atual: z.string().optional(),
  observacao:        z.string().optional(),
});
type Form = z.infer<typeof schema>;

const SITUACOES = [
  { value: 'apta',           label: 'Apta' },
  { value: 'em_locacao',     label: 'Em Locação' },
  { value: 'manutencao',     label: 'Em Manutenção' },
  { value: 'evento',         label: 'Em Evento' },
  { value: 'nao_localizada', label: 'Não Localizada' },
  { value: 'desativada',     label: 'Desativada' },
];

interface Props {
  maquina: MaquinaCompleta;
  onClose: () => void;
}

export function MaquinaFormModal({ maquina, onClose }: Props) {
  const atualizar = useAtualizarMaquina();
  const { data: catalogo } = useCatalogo();

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      patrimonio:        maquina.patrimonio,
      modelo_id:         maquina.modelo_id ?? '',
      numero_serie:      maquina.numero_serie ?? '',
      nota_fiscal:       maquina.nota_fiscal ?? '',
      fornecedor:        maquina.fornecedor ?? '',
      valor_aquisicao:   maquina.valor_aquisicao ?? undefined,
      data_registro:     maquina.data_registro ? maquina.data_registro.slice(0, 10) : '',
      situacao:          maquina.situacao,
      localizacao_atual: maquina.localizacao_atual ?? '',
      observacao:        maquina.observacao ?? '',
    },
  });

  const onSubmit = async (data: Form) => {
    const dto = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );
    await atualizar.mutateAsync({ id: maquina.id, dto });
    onClose();
  };

  const loading = atualizar.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Pencil className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Editar Máquina</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patrimônio *</label>
              <input {...register('patrimonio')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.patrimonio && <p className="text-red-500 text-xs mt-1">{errors.patrimonio.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <select {...register('modelo_id')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">— sem modelo —</option>
                {(catalogo ?? []).map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
              {errors.modelo_id && <p className="text-red-500 text-xs mt-1">{errors.modelo_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Série</label>
              <input {...register('numero_serie')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
              <select {...register('situacao')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                {SITUACOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal</label>
              <input {...register('nota_fiscal')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <input {...register('fornecedor')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Aquisição (R$)</label>
              <input type="number" step="0.01" min="0" {...register('valor_aquisicao')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Registro</label>
              <input type="date" {...register('data_registro')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localização Atual</label>
            <input {...register('localizacao_atual')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea {...register('observacao')} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
