import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { Download }          from 'lucide-react';
import toast                 from 'react-hot-toast';
import { catalogExportApi, getErrorMessage } from '../../services/api';
import { useForm }          from 'react-hook-form';
import { zodResolver }      from '@hookform/resolvers/zod';
import { z }                from 'zod';
import {
  useCatalogo, useCriarModelo, useAtualizarModelo, useExcluirModelo,
} from '../../hooks/useMachines';
import type { ModeloCatalogo } from '../../types';

const CATEGORIAS = [
  { value: 'bebidas',  label: 'Bebidas' },
  { value: 'snacks',   label: 'Snacks' },
  { value: 'combinado',label: 'Combinado' },
  { value: 'outros',   label: 'Outros' },
];

const schema = z.object({
  nome:           z.string().min(2, 'Nome obrigatório').max(150),
  categoria:      z.enum(['bebidas', 'snacks', 'combinado', 'outros']),
  bebidas:        z.string().optional(),
  especificacoes: z.string().optional(),
  foto_url:       z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function CatalogPage() {
  const navigate     = useNavigate();
  const catalogoQ    = useCatalogo();
  const criarM       = useCriarModelo();
  const atualizarM   = useAtualizarModelo();
  const excluirM     = useExcluirModelo();

  const [modalAberto, setModalAberto]  = useState(false);
  const [editando, setEditando]        = useState<ModeloCatalogo | null>(null);
  const [erro, setErro]                = useState('');
  const [filtroCat, setFiltroCat]      = useState('');

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categoria: 'bebidas' },
  });

  const abrirNovo = () => {
    setEditando(null);
    reset({ nome: '', categoria: 'bebidas', bebidas: '', especificacoes: '', foto_url: '' });
    setModalAberto(true);
  };

  const abrirEditar = (modelo: ModeloCatalogo) => {
    setEditando(modelo);
    reset({
      nome:           modelo.nome,
      categoria:      modelo.categoria,
      bebidas:        modelo.bebidas ?? '',
      especificacoes: modelo.especificacoes ?? '',
      foto_url:       modelo.foto_url ?? '',
    });
    setModalAberto(true);
  };

  const onSubmit = async (values: FormData) => {
    setErro('');
    const dto = { ...values, foto_url: values.foto_url || undefined };
    try {
      if (editando) {
        await atualizarM.mutateAsync({ id: editando.id, dto });
      } else {
        await criarM.mutateAsync(dto);
      }
      setModalAberto(false);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  };

  const handleExcluir = async (modelo: ModeloCatalogo) => {
    if (!confirm(`Deseja excluir o modelo "${modelo.nome}"? Se houver máquinas vinculadas ele será desativado.`)) return;
    try {
      await excluirM.mutateAsync(modelo.id);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const modelos = (catalogoQ.data ?? []).filter(m =>
    !filtroCat || m.categoria === filtroCat,
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/machines')} className="text-sm text-blue-600 hover:underline mb-1 block">
            ← Máquinas
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Catálogo de Modelos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modelos de máquinas do seu portfólio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await catalogExportApi.exportarCatalogo();
                // backend retorna HTML imprimível (text/html) — abrir em nova aba (Ctrl+P → Salvar como PDF)
                const url = URL.createObjectURL(res.data);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
                toast.success('Catálogo aberto em nova aba — use Ctrl+P para salvar em PDF.');
              } catch (e) {
                toast.error(getErrorMessage(e));
              }
            }}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar catálogo
          </button>
          <button
            onClick={abrirNovo}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Novo modelo
          </button>
        </div>
      </div>

      {/* Filtro de categoria */}
      <div className="flex flex-wrap gap-2">
        {[{ value: '', label: 'Todos' }, ...CATEGORIAS].map(c => (
          <button
            key={c.value}
            onClick={() => setFiltroCat(c.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filtroCat === c.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grade de modelos */}
      {catalogoQ.isLoading && (
        <div className="text-center py-12 text-gray-400">Carregando catálogo…</div>
      )}
      {!catalogoQ.isLoading && modelos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum modelo cadastrado. Clique em "+ Novo modelo" para começar.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modelos.map(modelo => (
          <div
            key={modelo.id}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Foto */}
            {modelo.foto_url ? (
              <img
                src={modelo.foto_url}
                alt={modelo.nome}
                className="w-full h-36 object-cover"
              />
            ) : (
              <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-4xl">☕</div>
            )}

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-800 text-sm">{modelo.nome}</h3>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
                  {modelo.categoria}
                </span>
              </div>
              {modelo.bebidas && (
                <p className="text-xs text-gray-500 line-clamp-2">{modelo.bebidas}</p>
              )}
              {modelo.especificacoes && (
                <p className="text-xs text-gray-400 line-clamp-1">{modelo.especificacoes}</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => abrirEditar(modelo)}
                  className="flex-1 text-xs text-blue-600 hover:bg-blue-50 rounded px-2 py-1.5 transition-colors text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(modelo)}
                  className="flex-1 text-xs text-red-500 hover:bg-red-50 rounded px-2 py-1.5 transition-colors text-center"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de criação/edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {editando ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do modelo *</label>
                <input
                  type="text"
                  {...register('nome')}
                  placeholder="Ex: Necta Kikko Max"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select
                  {...register('categoria')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bebidas / Produtos</label>
                <input
                  type="text"
                  {...register('bebidas')}
                  placeholder="Ex: Café, Cappuccino, Chocolate, Leite"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Especificações técnicas</label>
                <textarea
                  {...register('especificacoes')}
                  rows={2}
                  placeholder="Ex: 220V / 1.800W / Capacidade 200 doses/dia"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL da foto</label>
                <input
                  type="url"
                  {...register('foto_url')}
                  placeholder="https://…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.foto_url && <p className="text-red-500 text-xs mt-1">{errors.foto_url.message}</p>}
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  {isSubmitting ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
