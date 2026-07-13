import { useState } from 'react';
import { X, Tag, Plus, Trash2, Wand2 } from 'lucide-react';
import {
  useCategorias, useCriarCategoria, useRemoverCategoria, useImportarCategoriasLegado,
} from '../../hooks/useStock';

interface Props {
  onClose: () => void;
}

/**
 * ERR-14: categorias de insumo por tenant.
 * O sistema vinha com um ENUM fixo de cafe (cappuccino, chocolate, cafe_graos...)
 * cravado no codigo. Um tenant que vendesse snacks nao tinha como cadastrar.
 * Agora cada tenant define as suas.
 */
export function CategoriasModal({ onClose }: Props) {
  const [nome, setNome] = useState('');

  const { data: categorias, isLoading } = useCategorias();
  const criar     = useCriarCategoria();
  const remover   = useRemoverCategoria();
  const importar  = useImportarCategoriasLegado();

  function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    criar.mutate({ nome: nome.trim() }, { onSuccess: () => setNome('') });
  }

  function handleRemover(id: string, nomeCat: string, produtos: number) {
    const aviso = produtos > 0
      ? `${nomeCat} é usada por ${produtos} produto(s). Ela será desativada, não excluída. Continuar?`
      : `Remover a categoria ${nomeCat}?`;
    if (!confirm(aviso)) return;
    remover.mutate(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Tag className="text-emerald-600" size={22} />
            <h2 className="text-lg font-bold text-gray-800">Categorias de Insumo</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nova categoria */}
          <form onSubmit={handleCriar} className="flex gap-2">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Snacks, Bebida Fria, Descartáveis…"
              maxLength={100}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!nome.trim() || criar.isLoading}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> Criar
            </button>
          </form>

          {/* Lista */}
          {isLoading ? (
            <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
          ) : !categorias?.length ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <Tag className="w-9 h-9 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 mb-1">Nenhuma categoria cadastrada.</p>
              <p className="text-xs text-gray-400 mb-4 px-4">
                Seus produtos ainda usam as categorias fixas de café do sistema antigo.
                Importe-as para começar.
              </p>
              <button
                onClick={() => importar.mutate()}
                disabled={importar.isLoading}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
              >
                <Wand2 size={15} />
                {importar.isLoading ? 'Importando…' : 'Importar categorias existentes'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border rounded-lg">
              {categorias.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {c.nome}
                      {!c.ativo && (
                        <span className="ml-2 text-xs text-gray-400">(inativa)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.produtos ?? 0} produto(s)
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemover(c.id, c.nome, c.produtos ?? 0)}
                    disabled={remover.isLoading}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title={
                      (c.produtos ?? 0) > 0
                        ? 'Desativar (há produtos usando)'
                        : 'Remover categoria'
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Importar legado — também disponível quando já há categorias */}
          {!!categorias?.length && (
            <button
              onClick={() => importar.mutate()}
              disabled={importar.isLoading}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-500 border border-dashed rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Cria categorias para produtos que ainda usam o ENUM antigo"
            >
              <Wand2 size={14} />
              {importar.isLoading ? 'Importando…' : 'Importar categorias do sistema antigo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
