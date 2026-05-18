import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider }        from 'react-query';
import { Loader2 }                                 from 'lucide-react';
import { Toaster }                                 from 'react-hot-toast';

import { AuthProvider, useAuth }      from './contexts/AuthContext';
import { TenantProvider }             from './contexts/TenantContext';
import Layout                         from './components/layout/Layout';

// ── Páginas públicas ──────────────────────────────────────────
import LandingPage          from './pages/LandingPage';
import LoginPage            from './pages/auth/LoginPage';
import CadastroPage         from './pages/onboarding/CadastroPage';
import VerificarEmailPage   from './pages/onboarding/VerificarEmailPage';
import ConfigurarTenantPage from './pages/onboarding/ConfigurarTenantPage';
import WizardPage           from './pages/onboarding/WizardPage';

// ── Páginas autenticadas ──────────────────────────────────────
import DashboardPage        from './pages/dashboard/DashboardPage';
import MachinesPage         from './pages/machines/MachinesPage';
import MachineDetailPage    from './pages/machines/MachineDetailPage';
import MachineNewPage       from './pages/machines/MachineNewPage';
import CatalogPage          from './pages/catalog/CatalogPage';
import ClientsPage          from './pages/clients/ClientsPage';
import ClientDetailPage     from './pages/clients/ClientDetailPage';
import ContractsPage        from './pages/contracts/ContractsPage';
import ContractDetailPage   from './pages/contracts/ContractDetailPage';
import InvoicesPage         from './pages/invoices/InvoicesPage';
import { StockPage }                 from './pages/stock/StockPage';
import { MovimentacoesPage }         from './pages/stock/MovimentacoesPage';
import { RelatorioEstoquePage }      from './pages/stock/RelatorioEstoquePage';
import { ProdutoDetailPage }         from './pages/stock/ProdutoDetailPage';
import { ReportsHubPage }            from './pages/reports/ReportsHubPage';
import { RelatorioFinanceiroPage }   from './pages/reports/RelatorioFinanceiroPage';
import { RelatorioContratosPage }    from './pages/reports/RelatorioContratosPage';
import { RelatorioMaquinasPage }     from './pages/reports/RelatorioMaquinasPage';
import UsuariosPage                  from './pages/users/UsuariosPage';
import AceitarConvitePage            from './pages/users/AceitarConvitePage';
import AuditoriaPage                 from './pages/audit/AuditoriaPage';
import SettingsPage                  from './pages/settings/SettingsPage';       // Sprint 11
import SuperAdminPage                from './pages/super-admin/SuperAdminPage';   // Sprint 11
import ImportPage                    from './pages/import/ImportPage';             // Sprint 12
import ActivitiesPage               from './pages/activities/ActivitiesPage';      // Sprint 14
import DosesPage                    from './pages/doses/DosesPage';                // Sprint 13
import GastosPage                   from './pages/gastos/GastosPage';              // Sprint 13
import ManutencaoPage               from './pages/manutencao/ManutencaoPage';       // Sprint 15
import ContratoEventoPdfPage        from './pages/contracts/ContratoEventoPdfPage'; // Sprint 15

// ── React Query ───────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:               1,
      refetchOnWindowFocus: false,
      staleTime:           30_000,
    },
  },
});

// ── Guards ────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { isAuth, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  return isAuth ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactElement }) {
  const { isAuth, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuth ? <Navigate to="/" replace /> : children;
}

// ── Rotas ─────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>

      {/* Públicas */}
      <Route path="/inicio"   element={<LandingPage />} />
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/cadastro" element={<PublicRoute><CadastroPage /></PublicRoute>} />

      {/* Pública: aceitar convite */}
      <Route path="/aceitar-convite" element={<AceitarConvitePage />} />

      {/* Onboarding */}
      <Route path="/verificar-email"    element={<VerificarEmailPage />} />
      <Route path="/configurar-tenant"  element={<ConfigurarTenantPage />} />
      <Route path="/wizard"             element={<WizardPage />} />

      {/* Autenticadas */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index                    element={<DashboardPage />} />
        <Route path="machines"          element={<MachinesPage />} />
        <Route path="machines/new"      element={<MachineNewPage />} />
        <Route path="machines/:id"      element={<MachineDetailPage />} />
        <Route path="catalog"           element={<CatalogPage />} />
        <Route path="clients"           element={<ClientsPage />} />
        <Route path="clients/:id"       element={<ClientDetailPage />} />
        <Route path="contracts"         element={<ContractsPage />} />
        <Route path="contracts/novo"    element={<ContractsPage />} />
        <Route path="contracts/:id"     element={<ContractDetailPage />} />
        <Route path="invoices"          element={<InvoicesPage />} />
        <Route path="stock"             element={<StockPage />} />
        <Route path="stock/movements"   element={<MovimentacoesPage />} />
        <Route path="stock/report"      element={<RelatorioEstoquePage />} />
        <Route path="stock/products/:id" element={<ProdutoDetailPage />} />
        <Route path="reports"           element={<ReportsHubPage />} />
        <Route path="reports/financeiro" element={<RelatorioFinanceiroPage />} />
        <Route path="reports/contratos"  element={<RelatorioContratosPage />} />
        <Route path="reports/maquinas"   element={<RelatorioMaquinasPage />} />
        <Route path="users"             element={<UsuariosPage />} />
        <Route path="audit"             element={<AuditoriaPage />} />
        <Route path="settings"          element={<SettingsPage />} />       {/* Sprint 11 */}
        <Route path="super-admin"       element={<SuperAdminPage />} />     {/* Sprint 11 */}
        <Route path="import"            element={<ImportPage />} />         {/* Sprint 12 */}
        <Route path="activities"       element={<ActivitiesPage />} />    {/* Sprint 14 */}
        <Route path="doses"            element={<DosesPage />} />          {/* Sprint 13 */}
        <Route path="gastos"           element={<GastosPage />} />         {/* Sprint 13 */}
        <Route path="manutencao"       element={<ManutencaoPage />} />     {/* Sprint 15 */}
        <Route path="contracts/evento/:id/pdf" element={<ContratoEventoPdfPage />} /> {/* Sprint 15 */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
                error:   { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
              }}
            />
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
