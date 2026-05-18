import { useState }                    from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast                             from 'react-hot-toast';
import {
  Building2, Users, Bot, DollarSign, TrendingUp,
  Loader2, Search, ChevronDown, RefreshCw, CheckCircle2,
  PauseCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { superAdminApi, getErrorMessage } from '../../services/api';
import { useAuth }                        from '../../contexts/AuthContext';
import { Navigate }                       from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: any }> = {
  ativo:      { label: 'Ativo',      cor: 'text-green-700  bg-green-50  border-green-200',  icon: CheckCircle2 },
  trial:      { label: 'Trial',      cor: 'text-amber-700  bg-amber-50  border-amber-200',  icon: Clock        },
  suspenso:   { label: 'Suspenso',   cor: 'text-red-700    bg-red-50    border-red-200',    icon: PauseCircle  },
  cancelado:  { label: 'Cancelado',  cor: 'text-gray-600   bg-gray-100  border-gray-200',   icon: XCircle      },
};

const PLANO_CONFIG: Record<string, { label: string; cor: string }> = {
  starter:    { label: 'Starter',    cor: 'bg-gray-500'   },
  pro:        { label: 'Pro',        cor: 'bg-blue-500'   },
  enterprise: { label: 'Enterprise', cor: 'bg-purple-600' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ativo;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.cor)}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PlanoBadge({ plano }: { plano: string }) {
  const cfg = PLANO_CONFIG[plano] || PLANO_CONFIG.starter;
  return (
    <span className={clsx('text-xs font-bold text-white px-2 py-0.5 rounded-full', cfg.cor)}>
      {cfg.label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function SuperAdminPage() {
  const { user } = useAuth();
  const qc       = useQueryClient();
  const [busca,  setBusca]  = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Guard: só super_admin
  if (user?.perfil !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  // ── Queries ───────────────────────────────────────────────
  const { data: metricas, isLoading: loadMetricas } = useQuery(
    'super-admin-metricas',
    () => superAdminApi.metricas().then(r => r.data),
    { staleTime: 60_000 },
  );

  const { data: tenants = [], isLoading: loadTenants, refetch } = useQuery(
    'super-admin-tenants',
    () => superAdminApi.listarTenants().then(r => r.data),
    { staleTime: 30_000 },
  );

  // ── Mutations ─────────────────────────────────────────────
  const mutStatus = useMutation(
    ({ id, status }: { id: string; status: string }) =>
      superAdminApi.atualizarStatus(id, status),
    {
      onSuccess: () => {
        toast.success('Status atualizado!');
        qc.invalidateQueries('super-admin-tenants');
        qc.invalidateQueries('super-admin-metricas');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutPlano = useMutation(
    ({ id, plano }: { id: string; plano: string }) =>
      superAdminApi.atualizarPlano(id, plano),
    {
      onSuccess: () => {
        toast.success('Plano atualizado!');
        qc.invalidateQueries('super-admin-tenants');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  // ── Filtro local ──────────────────────────────────────────
  const tenantsFiltrados = tenants.filter((t: any) => {
    const matchBusca = !busca || [t.razao_social, t.slug, t.cnpj, t.email_admin]
      .some(v => v?.toLowerCase().includes(busca.toLowerCase()));
    const matchStatus = !filtroStatus || t.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const mrr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(metricas?.mrr_estimado || 0);

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Super Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão global de todos os tenants do Vending Manager SaaS.
          </p>
        </div>
        <button
          onClick={() => { qc.invalidateQueries('super-admin-tenants'); refetch(); }}
          className="btn-secondary gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      {loadMetricas ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Tenants', valor: metricas?.total       ?? 0, icon: Building2,  cor: 'bg-blue-50   text-blue-600'   },
            { label: 'Ativos',        valor: metricas?.ativos      ?? 0, icon: CheckCircle2,cor:'bg-green-50  text-green-600'  },
            { label: 'Em Trial',      valor: metricas?.trials      ?? 0, icon: Clock,       cor: 'bg-amber-50  text-amber-600'  },
            { label: 'Suspensos',     valor: metricas?.suspensos   ?? 0, icon: PauseCircle, cor: 'bg-red-50    text-red-600'    },
            { label: 'Cancelados',    valor: metricas?.cancelados  ?? 0, icon: XCircle,     cor: 'bg-gray-50   text-gray-500'   },
            { label: 'MRR Estimado',  valor: mrr,                        icon: TrendingUp,  cor: 'bg-purple-50 text-purple-600', grande: true },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-2', k.cor)}>
                <k.icon className="w-4 h-4" />
              </div>
              <p className={clsx('font-bold text-gray-900', k.grande ? 'text-base' : 'text-2xl')}>
                {k.valor}
              </p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Distribuição por plano */}
      {metricas && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por plano</h3>
          <div className="flex gap-4">
            {Object.entries(metricas.por_plano || {}).map(([plano, qtd]: [string, any]) => (
              <div key={plano} className="flex items-center gap-2">
                <PlanoBadge plano={plano} />
                <span className="text-sm font-semibold text-gray-900">{qtd}</span>
                <span className="text-xs text-gray-400">tenant{qtd !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por empresa, slug, CNPJ ou e-mail..."
              className="input pl-9"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="input w-full sm:w-44"
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="trial">Trial</option>
            <option value="suspenso">Suspenso</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabela de tenants */}
      <div className="card overflow-hidden">
        {loadTenants ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : tenantsFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum tenant encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Slug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Criado em</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenantsFiltrados.map((t: any) => (
                  <TenantRow
                    key={t.id}
                    tenant={t}
                    onStatus={(status) => mutStatus.mutate({ id: t.id, status })}
                    onPlano={(plano)  => mutPlano.mutate({ id: t.id, plano  })}
                    loading={mutStatus.isLoading || mutPlano.isLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com contagem */}
        {!loadTenants && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {tenantsFiltrados.length} tenant{tenantsFiltrados.length !== 1 ? 's' : ''} exibido{tenantsFiltrados.length !== 1 ? 's' : ''}
            {tenants.length !== tenantsFiltrados.length && ` de ${tenants.length}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Linha de tenant com dropdowns ────────────────────────────
function TenantRow({
  tenant, onStatus, onPlano, loading,
}: {
  tenant: any;
  onStatus: (s: string) => void;
  onPlano:  (p: string) => void;
  loading:  boolean;
}) {
  const [openStatus, setOpenStatus] = useState(false);
  const [openPlano,  setOpenPlano]  = useState(false);

  const dataCriacao = tenant.criado_em
    ? new Date(tenant.criado_em).toLocaleDateString('pt-BR')
    : '—';

  return (
    <tr className="hover:bg-gray-50 transition-colors">

      {/* Empresa */}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900 truncate max-w-[200px]">{tenant.razao_social}</p>
          <p className="text-xs text-gray-400">{tenant.email_admin}</p>
        </div>
      </td>

      {/* Slug */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          {tenant.slug}
        </span>
      </td>

      {/* Status com dropdown */}
      <td className="px-4 py-3 relative">
        <button
          onClick={() => setOpenStatus(v => !v)}
          disabled={loading}
          className="flex items-center gap-1 focus:outline-none"
        >
          <StatusBadge status={tenant.status} />
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        {openStatus && (
          <div className="absolute z-20 left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {['ativo', 'suspenso', 'cancelado'].map(s => (
              <button
                key={s}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 capitalize"
                onClick={() => { onStatus(s); setOpenStatus(false); }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Plano com dropdown */}
      <td className="px-4 py-3 relative">
        <button
          onClick={() => setOpenPlano(v => !v)}
          disabled={loading}
          className="flex items-center gap-1 focus:outline-none"
        >
          <PlanoBadge plano={tenant.plano} />
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        {openPlano && (
          <div className="absolute z-20 left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {['starter', 'pro', 'enterprise'].map(p => (
              <button
                key={p}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => { onPlano(p); setOpenPlano(false); }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Data */}
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
        {dataCriacao}
      </td>

      {/* Trial badge extra */}
      <td className="px-4 py-3">
        {tenant.status === 'trial' && tenant.trial_ate && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>
              {new Date(tenant.trial_ate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
