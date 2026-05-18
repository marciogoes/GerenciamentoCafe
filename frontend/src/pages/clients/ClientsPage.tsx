import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Phone, Mail, Building2 } from 'lucide-react';
import { useClientes, useCriarCliente, useAtualizarCliente } from '../../hooks/useContracts';
import ClienteFormModal from '../../components/contracts/ClienteFormModal';
import type { Cliente } from '../../types';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [busca,      setBusca]      = useState('');
  const [apenasAtivos, setApenasAtivos] = useState<string>('true');
  const [showModal,  setShowModal]  = useState(false);
  const [editando,   setEditando]   = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useClientes({
    ...(busca        ? { busca }        : {}),
    ...(apenasAtivos ? { ativo: apenasAtivos } : {}),
  });

  const criar     = useCriarCliente();
  const atualizar = useAtualizarCliente();

  function abrirCriacao() {
    setEditando(null);
    setShowModal(true);
  }
  function abrirEdicao(c: Cliente, e: React.MouseEvent) {
    e.stopPropagation();
    setEditando(c);
    setShowModal(true);
  }

  function salvar(dto: any) {
    if (editando) {
      atualizar.mutate({ id: editando.id, dto }, { onSuccess: () => setShowModal(false) });
    } else {
      criar.mutate(dto, { onSuccess: () => setShowModal(false) });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirCriacao}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field flex-1"
          />
        </div>
        <select
          value={apenasAtivos}
          onChange={e => setApenasAtivos(e.target.value)}
          className="input-field w-40"
        >
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-3">Carregando clientes...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="card p-10 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Cadastre o primeiro cliente clicando em &quot;Novo Cliente&quot;</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {clientes.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/clients/${c.id}`)}
              className="card p-4 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info principal */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.razao_social}</p>
                    <p className="text-sm text-gray-500">
                      CNPJ {c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                    </p>
                    {c.segmento && (
                      <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {c.segmento}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contato */}
                <div className="hidden sm:flex flex-col gap-1 text-sm text-gray-500 shrink-0">
                  {c.contato_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {c.contato_email}
                    </span>
                  )}
                  {c.contato_telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.contato_telefone}
                    </span>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${c.ativo ? 'badge-green' : 'badge-gray'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    onClick={e => abrirEdicao(c, e)}
                    className="btn-ghost text-sm px-2 py-1"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ClienteFormModal
          cliente={editando}
          onClose={() => setShowModal(false)}
          onSave={salvar}
          loading={criar.isLoading || atualizar.isLoading}
        />
      )}
    </div>
  );
}
