import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useRegistrarEntrada, useRegistrarSaida, useProdutos } from '../../hooks/useStock';

const entradaSchema = z.object({
  produto_id:  z.string().min(1, 'Selecione um produto'),
  data:        z.string().min(1),
  quantidade:  z.coerce.number().positive('Deve ser maior que 0'),
  origem:      z.string().optional(),
  nota_fiscal: z.string().optional(),
  observacao:  z.string().optional(),
});

const saidaSchema = z.object({
  produto_id: z.string().min(1, 'Selecione um produto'),
  data:       z.string().min(1),
  quantidade: z.coerce.number().positive('Deve ser maior que 0'),
  origem:     z.string().optional(),
  observacao: z.string().optional(),
});

type EntradaForm = z.infer<typeof entradaSchema>;
type SaidaForm   = z.infer<typeof saidaSchema>;

interface Props {
  tipo: 'entrada' | 'saida';
  produtoIdInicial?: string;
  onClose: () => void;
}

export function MovimentacaoModal({ tipo, produtoIdInicial, onClose }: Props) {
  // 'ativo' nao existe em FiltrosProdutoDto; com forbidNonWhitelisted o GET
  // quebrava com 400 e a lista voltava vazia. Buscamos sem filtro e filtramos
  // os ativos aqui no cliente (o backend ja bloqueia movimentar produto inativo).
  const { data: produtosRaw = [] } = useProdutos();
  const produtos = produtosRaw.filter(p => p.ativo !== false);
  const registrarEntrada = useRegistrarEntrada();
  const registrarSaida   = useRegistrarSaida();

  const schema = tipo === 'entrada' ? entradaSchema : saidaSchema;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EntradaForm | SaidaForm>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      produto_id: produtoIdInicial ?? '',
      data: new Date().toISOString().split('T')[0],
    },
  });

  const produtoId = watch('produto_id');
  const produto   = produtos.find(p => p.id === produtoId);

  const onSubmit = async (data: any) => {
    if (tipo === 'entrada') {
      await registrarEntrada.mutateAsync(data);
    } else {
      await registrarSaida.mutateAsync(data);
    }
    onClose();
  };

  const loading = registrarEntrada.isLoading || registrarSaida.isLoading;
  const isEntrada = tipo === 'entrada';
  const cor = isEntrada ? 'blue' : 'orange';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b bg-${cor}-50 rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            {isEntrada
              ? <ArrowDownCircle className="text-blue-600" size={22} />
              : <ArrowUpCircle   className="text-orange-600" size={22} />
            }
            <h2 className={`text-lg font-bold text-${cor}-800`}>
              {isEntrada ? 'Registrar Entrada' : 'Registrar Saída'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
            <select {...register('produto_id')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione...</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.codigo}] {p.descricao}
                </option>
              ))}
            </select>
            {errors.produto_id && <p className="text-red-500 text-xs mt-1">{errors.produto_id.message}</p>}
          </div>

          {/* Saldo atual */}
          {produto && (
            <div className={`text-sm rounded-lg px-3 py-2 ${
              produto.situacao === 'zerado' ? 'bg-red-50 text-red-700' :
              produto.situacao === 'baixo'  ? 'bg-yellow-50 text-yellow-700' :
              'bg-green-50 text-green-700'
            }`}>
              Saldo atual: <strong>{produto.saldo_atual.toFixed(3)} {produto.unidade}</strong>
              {produto.estoque_minimo && (
                <span className="ml-2 text-gray-500">· Mín: {produto.estoque_minimo.toFixed(3)}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" {...register('data')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade ({produto?.unidade ?? '—'}) *
              </label>
              <input type="number" step="0.001" min="0.001" {...register('quantidade')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
              {errors.quantidade && <p className="text-red-500 text-xs mt-1">{errors.quantidade.message}</p>}
            </div>
          </div>

          {/* Origem / Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEntrada ? 'Fornecedor' : 'Destino (cliente ou uso interno)'}
            </label>
            <input {...register('origem')} placeholder={isEntrada ? 'Ex.: Distribuidora ABC' : 'Ex.: Hospital João Barros Barreto'}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* NF — apenas entrada */}
          {isEntrada && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal</label>
              <input {...register('nota_fiscal')} placeholder="Ex.: NF-001234"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea {...register('observacao')} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className={`px-5 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                isEntrada ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}>
              {loading ? 'Registrando...' : isEntrada ? 'Confirmar Entrada' : 'Confirmar Saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
