import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin,
  FileText, AlertCircle, Plus,
} from 'lucide-react';
import { useCliente } from '../../hooks/useContracts';
import {
  TIPO_CONTRATO_LABEL, SITUACAO_CONTRATO_COLOR, SITUACAO_LANCAMENTO_COLOR,
  SITUACAO_LANCAMENTO_LABEL,
} from '../../types';
import { fmtBRL, fmtDate } from '../../utils/format';

// ── Utilitários de formatação embutidos ──────────────────────
function fmtCnpj(cnpj: string) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export default function ClientDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aba, setAba] = useState<'contratos' | 'cobrancas'>('contratos');

  const { data: cliente, isLoading } = useCliente(id);

  if (isLoading) {
    return (
      <div className="card p-10 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-400 mt-3">Carregando cliente...</p>
      </div>
    );
  }

  if (!cliente) return null;

  const lancamentosAbertos = cliente.lancamentos_abertos ?? [];
  const totalAberto = lancamentosAbertos
    .filter(l => l.situacao !== 'pago' && l.situacao !== 'cancelado')
    .reduce((acc, l) => acc + Number(l.valor), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{cliente.razao_social}</h1>
              <span className={`badge ${cliente.ativo ? 'badge-green' : 'badge-gray'}`}>
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">CNPJ {fmtCnpj(cliente.cnpj)}</p>
          </div>
        </div>

        {/* Detalhes de contato */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {cliente.contato_nome && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              {cliente.contato_nome}
            </div>
          )}
          {cliente.contato_email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              {cliente.contato_email}
            </div>
          )}
          {cliente.contato_telefone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              {cliente.contato_telefone}
            </div>
          )}
          {cliente.endereco && (
            <div className="flex items-center gap-2 text-gray-600 sm:col-span-3">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              {cliente.endereco}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{cliente.contratos?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Contratos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{lancamentosAbertos.length}</p>
          <p className="text-xs text-gray-500 mt-1">Em aberto</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${totalAberto > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {totalAberto > 0 ? fmtBRL(totalAberto) : 'R$ 0,00'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Saldo devedor</p>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['contratos', 'cobrancas'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              className={`py-2 border-b-2 text-sm font-medium transition-colors ${
                aba === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'contratos' ? 'Contratos' : 'Cobranças em Aberto'}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo da aba */}
      {aba === 'contratos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to={`/contracts/novo?cliente=${cliente.id}`} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Novo Contrato
            </Link>
          </div>
          {(cliente.contratos ?? []).length === 0 ? (
            <div className="card p-8 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhum contrato cadastrado para este cliente.</p>
            </div>
          ) : (
            (cliente.contratos ?? []).map(c => (
              <Link key={c.id} to={`/contracts/${c.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {TIPO_CONTRATO_LABEL[c.tipo]} — {c.maquina_patrimonio ?? 'Sem máquina'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Início: {fmtDate(c.data_inicio)} &nbsp;·&nbsp; Venc. dia {c.dia_vencimento}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{fmtBRL(c.valor_mensal)}<span className="text-xs text-gray-400">/mês</span></p>
                    <span className={`badge mt-1 ${SITUACAO_CONTRATO_COLOR[c.situacao]}`}>
                      {c.situacao}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {aba === 'cobrancas' && (
        <div className="space-y-2">
          {lancamentosAbertos.length === 0 ? (
            <div className="card p-8 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma cobrança em aberto.</p>
            </div>
          ) : (
            lancamentosAbertos.map(l => (
              <div
                key={l.id}
                className={`card p-4 ${l.alerta_vermelho ? 'border-red-200 bg-red-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      Competência {fmtDate(l.competencia, 'mes')}
                    </p>
                    <p className={`text-sm ${l.alerta_vermelho ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      Vencimento: {fmtDate(l.data_vencimento)}
                      {(l.dias_atraso ?? 0) > 0 && ` — ${l.dias_atraso} dias em atraso`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{fmtBRL(l.valor)}</p>
                    <span className={`badge mt-1 ${SITUACAO_LANCAMENTO_COLOR[l.situacao]}`}>
                      {SITUACAO_LANCAMENTO_LABEL[l.situacao]}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
