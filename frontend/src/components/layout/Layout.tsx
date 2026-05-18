import { useState }        from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth }         from '../../contexts/AuthContext';
import { useTenant }       from '../../contexts/TenantContext';
import NotificacoesDropdown from './NotificacoesDropdown';
import TrialBanner          from './TrialBanner';
import {
  LayoutDashboard, Bot, FileText, Package,
  Users, Settings, LogOut, ChevronLeft, ChevronRight, Coffee,
  Building2, DollarSign, BarChart3, ShieldCheck, Crown, Upload, CheckSquare,
  Droplets, Receipt, Wrench,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   roles: ['super_admin','admin','financeiro','operacional','consulta'] },
  { to: '/machines',    icon: Bot,             label: 'Máquinas',    roles: ['super_admin','admin','operacional'] },
  { to: '/clients',     icon: Building2,       label: 'Clientes',    roles: ['super_admin','admin','financeiro'] },
  { to: '/contracts',   icon: FileText,        label: 'Contratos',   roles: ['super_admin','admin','financeiro'] },
  { to: '/invoices',    icon: DollarSign,      label: 'Cobranças',   roles: ['super_admin','admin','financeiro'] },
  { to: '/stock',       icon: Package,         label: 'Estoque',     roles: ['super_admin','admin','operacional'] },
  { to: '/reports',     icon: BarChart3,       label: 'Relatórios',  roles: ['super_admin','admin','financeiro'] },
  { to: '/users',       icon: Users,           label: 'Usuários',    roles: ['super_admin','admin'] },
  { to: '/audit',       icon: ShieldCheck,     label: 'Auditoria',   roles: ['super_admin','admin'] },
  { to: '/settings',    icon: Settings,        label: 'Config.',     roles: ['super_admin','admin'] },
  { to: '/activities',  icon: CheckSquare,     label: 'Atividades',  roles: ['super_admin','admin','financeiro','operacional'] },  // Sprint 14
  { to: '/doses',       icon: Droplets,        label: 'Doses',       roles: ['super_admin','admin','financeiro','operacional'] },  // Sprint 13
  { to: '/gastos',      icon: Receipt,         label: 'Gastos',      roles: ['super_admin','admin','financeiro'] },               // Sprint 13
  { to: '/manutencao',  icon: Wrench,          label: 'Manutenção',  roles: ['super_admin','admin','operacional'] },              // Sprint 15
  { to: '/import',      icon: Upload,          label: 'Importar',    roles: ['super_admin','admin','financeiro','operacional'] },  // Sprint 12
  { to: '/super-admin', icon: Crown,           label: 'Super Admin', roles: ['super_admin'] },  // Sprint 11
];

const PLANO_BADGE: Record<string, { label: string; cor: string }> = {
  starter:    { label: 'Starter',    cor: 'bg-gray-500' },
  pro:        { label: 'Pro',        cor: 'bg-blue-500' },
  enterprise: { label: 'Enterprise', cor: 'bg-purple-600' },
  trial:      { label: 'Trial',      cor: 'bg-amber-500' },
};

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const { nomeTenant, logoUrl, tenant } = useTenant();
  const [collapsed, setCollapsed] = useState(false);

  const plano = tenant?.status === 'trial' ? 'trial' : (tenant?.plano ?? 'starter');
  const badge = PLANO_BADGE[plano] ?? PLANO_BADGE.starter;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      <TrialBanner />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={clsx(
          'flex flex-col bg-blue-900 text-white transition-all duration-300 ease-in-out flex-shrink-0',
          collapsed ? 'w-16' : 'w-60',
        )}>

          {/* Logo */}
          <div className="flex items-center h-16 px-3 border-b border-blue-800 flex-shrink-0 gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-700 rounded-xl flex-shrink-0 overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                : <Coffee className="w-5 h-5 text-white" />
              }
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-white truncate leading-tight">{nomeTenant}</p>
                <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded text-white', badge.cor)}>
                  {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
            {navItems
              .filter(item => hasRole(...item.roles))
              .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white',
                  collapsed && 'justify-center px-2',
                  // Destaque especial para Super Admin
                  to === '/super-admin' && 'mt-2 border-t border-blue-800 pt-4',
                )}
              >
                <Icon className={clsx('w-5 h-5 flex-shrink-0', to === '/super-admin' && 'text-yellow-300')} />
                {!collapsed && (
                  <span className={clsx('truncate', to === '/super-admin' && 'text-yellow-200')}>
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Usuário + Logout */}
          <div className="border-t border-blue-800 p-3 flex-shrink-0">
            {!collapsed && (
              <div className="mb-2 px-2">
                <p className="text-xs font-semibold text-white truncate">{user?.nome}</p>
                <p className="text-xs text-blue-300 capitalize">
                  {user?.perfil?.replace('_', ' ')}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className={clsx(
                'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-blue-200',
                'hover:bg-blue-800 hover:text-white transition-colors',
                collapsed && 'justify-center',
              )}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* ── Área principal ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Topbar */}
          <header className="flex items-center h-16 px-5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
            <button
              onClick={() => setCollapsed(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 mr-4"
            >
              {collapsed
                ? <ChevronRight className="w-5 h-5" />
                : <ChevronLeft  className="w-5 h-5" />}
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <NotificacoesDropdown />
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {user?.nome?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-sm font-semibold text-gray-900 leading-none">{user?.nome}</p>
                  <p className="text-xs text-gray-500 capitalize mt-0.5">
                    {user?.perfil?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>

      </div>
    </div>
  );
}
