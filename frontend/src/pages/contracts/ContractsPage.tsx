import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search, ChevronRight } from 'lucide-react';
import { useContratos, useCriarContrato, useAtualizarContrato } from '../../hooks/useContracts';
import { useClientes } from '../../hooks/useContracts';
import ContratoFormModal from '../../components/contracts/ContratoFormModal';
import {
  TIPO_CONTRATO_LABEL, SITUACAO_CONTRATO_COLOR, SITUACAO_CONTRATO_LABEL,
  type Contrato,
} from '../../types';
import { fmtBRL, fmtDate } from '../../utils/format';

export default function ContractsPage() {
  const [searchParams]   = useSearchParams();
  const clienteInicial   = searchParams.get('cliente') ?? '';

  const [situacaoFiltro, setSituacaoFiltro] = useState('ativo');
  const [showModal,      setShowModal]      = useState(!!clienteInicial);
  const [editando,       setEditando]       = useState<Contrato | null>(null);

  const { data: contratos = [], isLoading } = useContratos(
    situacaoFiltro ? { situacao: situacaoFiltro } : {},
  );
  const { data: clientes = [] } = useClientes({ ativo: 'true' });

  const criar     = useCriarContrato();
  const atualizar = useAtualizarContrato();

  function abrirCriacao() { setEditando(null); setShowModal(true); }

  function salvar(dto: any) {
    if (editando) {
      atualizar.mutate({ id: editando.id, dto }, { onSuccess: () => setShowModal(false) });
    } else {
      criar.mutate(dto, { onSuccess: () => setShowModal(false) });
    }
  }

  // Totais rápidos
  const valorTotal  = contratos.reduce((s, c) => s + Number(c.valor_mensal), 0);
  const qtdAtivos   = contratos.filter(c => c.situacao === 'ativo').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" /> Contratos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{contratos.length} contrato{contratos.length !== 1 ? 's' : ''} encontrado{contratos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={abrirCriacao} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </div>

      {/* KPIs rápidos */}
      {situacaoFiltro === 'ativo' && contratos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{qtdAtivos}</p>
            <p className="text-xs text-gray-500 mt-1">Contratos ativos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{fmtBRL(valorTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">Receita mensal total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">
              {qtdAtivos > 0 ? fmtBRL(valorTotal / qtdAtivos) : 'R$ 0,00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ticket médio</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Search className="w-4 h-4" /> Situação:
        </div>
        {['ativo', 'suspenso', 'encerrado', ''].map(s => (
          <button
            key={s}
            onClick={() => setSituacaoFiltro(s)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              situacaoFiltro === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {s === '' ? 'Todos' : SITUACAO_CONTRATO_LABEL[s as keyof typeof SITUACAO_CONTRATO_LABEL]}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : contratos.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Máquina</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor/mês</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Início</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Situação</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contratos.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{c.cliente_nome ?? '—'}</p>
                    <p className="text-xs text-gray-400">{c.cliente_cnpj ? c.cliente_cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : ''}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    {c.maquina_patrimonio ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="badge badge-blue">{TIPO_CONTRATO_LABEL[c.tipo]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {fmtBRL(c.valor_mensal)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                    {fmtDate(c.data_inicio)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${SITUACAO_CONTRATO_COLOR[c.situacao]}`}>
                      {SITUACAO_CONTRATO_LABEL[c.situacao]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/contracts/${c.id}`} className="text-blue-600 hover:text-blue-700">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ContratoFormModal
          contrato={editando}
          clientes={clientes}
          clientePreSelecionado={clienteInicial || undefined}
          onClose={() => setShowModal(false)}
          onSave={salvar}
          loading={criar.isLoading || atualizar.isLoading}
        />
      )}
    </div>
  );
}
