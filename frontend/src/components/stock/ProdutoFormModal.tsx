import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package } from 'lucide-react';
import { useCriarProduto, useAtualizarProduto } from '../../hooks/useStock';
import type { Produto, CategoriaProduto } from '../../types';

const schema = z.object({
  codigo:         z.string().min(1).max(10),
  descricao:      z.string().min(2).max(200),
  marca:          z.string().max(100).optional(),
  categoria:      z.enum(['cappuccino','chocolate','cafe_graos','cafe_leite','descartavel','outros']),
  unidade:        z.string().min(1).max(10),
  valor_unitario: z.coerce.number().min(0),
  validade:       z.string().optional(),
  estoque_minimo: z.coerce.number().min(0).optional(),
});
type Form = z.infer<typeof schema>;

const CATEGORIAS: { value: CategoriaProduto; label: string }[] = [
  { value: 'cappuccino',  label: 'Cappuccino' },
  { value: 'chocolate',   label: 'Chocolate' },
  { value: 'cafe_graos',  label: 'Café em Grãos' },
  { value: 'cafe_leite',  label: 'Café com Leite' },
  { value: 'descartavel', label: 'Descartável' },
  { value: 'outros',      label: 'Outros' },
];

interface Props {
  onClose: () => void;
  produto?: Produto;
}

export function ProdutoFormModal({ onClose, produto }: Props) {
  const isEdit = !!produto;
  const criar    = useCriarProduto();
  const atualizar = useAtualizarProduto();

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: produto ? {
      codigo:         produto.codigo,
      descricao:      produto.descricao,
      marca:          produto.marca ?? '',
      categoria:      produto.categoria,
      unidade:        produto.unidade,
      valor_unitario: produto.valor_unitario,
      validade:       produto.validade ?? '',
      estoque_minimo: produto.estoque_minimo ?? undefined,
    } : { categoria: 'cappuccino', unidade: 'KG' },
  });

  const onSubmit = async (data: Form) => {
    if (isEdit) {
      await atualizar.mutateAsync({ id: produto!.id, dto: data });
    } else {
      await criar.mutateAsync(data);
    }
    onClose();
  };

  const loading = criar.isLoading || atualizar.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="text-emerald-600" size={22} />
            <h2 className="text-lg font-bold text-gray-800">
              {isEdit ? 'Editar Produto' : 'Novo Produto'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input {...register('codigo')} disabled={isEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" />
              {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo.message}</p>}
            </div>
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select {...register('categoria')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <input {...register('descricao')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input {...register('marca')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
            {/* Unidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
              <select {...register('unidade')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                {['KG','UN','PCT','CX','LT','SC'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor unitário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário (R$) *</label>
              <input type="number" step="0.01" min="0" {...register('valor_unitario')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
              {errors.valor_unitario && <p className="text-red-500 text-xs mt-1">{errors.valor_unitario.message}</p>}
            </div>
            {/* Estoque mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input type="number" step="0.001" min="0" {...register('estoque_minimo')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="Para alerta automático" />
            </div>
          </div>

          {/* Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
            <input type="date" {...register('validade')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
