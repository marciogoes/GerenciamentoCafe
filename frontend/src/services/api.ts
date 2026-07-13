import axios, { AxiosError } from 'axios';

// ── Instância base ─────────────────────────────────────────────
export const api = axios.create({
  // Substitua pela URL real do seu backend GerenciamentoCafe no Railway:
  baseURL:
    import.meta.env.VITE_API_URL || 'https://gerenciamentocafe-production.up.railway.app/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Injeta Bearer token em toda requisição ────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Tratamento global de erros e refresh automático ──────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    if (status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !error.config?.url?.includes('/auth/refresh')) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.access_token}`;
            return api(error.config);
          }
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Extrai mensagem de erro amigável ──────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('. ');
    if (typeof msg === 'string') return msg;
    return error.response?.data?.error || 'Erro de comunicação com o servidor.';
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado. Tente novamente.';
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, senha: string, tenantSlug: string) =>
    api.post('/auth/login', { email, senha, tenantSlug }),
  verify2fa: (codigo: string, tokenTemp: string) =>
    api.post('/auth/2fa/verify', { codigo, tokenTemp }),
  setup2fa: () => api.post('/auth/2fa/setup'),
  refresh: (token: string) => api.post('/auth/refresh', { refreshToken: token }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Tenants ───────────────────────────────────────────────────
export const tenantsApi = {
  cadastrar: (dto: any) => api.post('/tenants/cadastro', dto),
  verificarEmail: (token: string) => api.get(`/tenants/verificar/${token}`),
  reenviarVerificacao: (email: string) => api.post('/tenants/reenviar-verificacao', { email }),
  verificarSlug: (slug: string) => api.get(`/tenants/slug-disponivel?slug=${slug}`),
  configurar: (dto: any) => api.patch('/tenants/configurar', dto),
  meuTenant: () => api.get('/tenants/meu'),
  atualizarWizard: (dto: any) => api.patch('/tenants/wizard', dto),
  listarTodos: () => api.get('/tenants'),
  atualizarStatus: (id: string, status: string) => api.patch(`/tenants/${id}/status`, { status }),
};

// ── Dashboard (Sprint 4) ──────────────────────────────────────
export const dashboardApi = {
  kpis: (periodo?: string) => api.get('/dashboard/kpis', { params: { periodo } }),
  graficoReceita: () => api.get('/dashboard/grafico-receita'),
  graficoMaquinas: () => api.get('/dashboard/grafico-maquinas'),
  alertas: () => api.get('/dashboard/alertas'),
  distribuicaoMaquinas: () => api.get('/dashboard/distribuicao-maquinas'),
  topClientes: () => api.get('/dashboard/top-clientes'),
  inadimplencia: () => api.get('/dashboard/inadimplencia'),
  // Sprint 14
  receitaPorTipo: () => api.get('/dashboard/receita-por-tipo'),
  graficoReceitaPorTipo: () => api.get('/dashboard/grafico-receita-por-tipo'),
  kpiAtividades: () => api.get('/dashboard/kpi-atividades'),
};

// ── Catálogo de Modelos (Sprint 5) ───────────────────────────
export const catalogApi = {
  listar: () => api.get('/catalog'),
  buscar: (id: string) => api.get(`/catalog/${id}`),
  criar: (dto: any) => api.post('/catalog', dto),
  atualizar: (id: string, dto: any) => api.patch(`/catalog/${id}`, dto),
  excluir: (id: string) => api.delete(`/catalog/${id}`),
};

// ── Máquinas (Sprint 5) ────────────────────────────────────────
export const machinesApi = {
  listar: (params?: Record<string, string>) => api.get('/machines', { params }),
  resumoFrota: () => api.get('/machines/resumo-frota'),
  naBase: () => api.get('/machines/na-base'),
  foraDaBase: () => api.get('/machines/fora-da-base'),
  buscar: (id: string) => api.get(`/machines/${id}`),
  criar: (dto: any) => api.post('/machines', dto),
  atualizar: (id: string, dto: any) => api.patch(`/machines/${id}`, dto),
  saida: (id: string, dto: any) => api.post(`/machines/${id}/departure`, dto),
  retorno: (movId: string, dto: any) => api.post(`/machines/movements/${movId}/return`, dto),
  historico: (id: string, params?: any) => api.get(`/machines/${id}/movements`, { params }),
};

// ── Estoque (Sprint 7) ───────────────────────────────────────
export const stockApi = {
  produtos: (params?: any) => api.get('/stock/products', { params }),
  produto: (id: string) => api.get(`/stock/products/${id}`),
  criarProduto: (dto: any) => api.post('/stock/products', dto),
  atualizarProduto: (id: string, dto: any) => api.patch(`/stock/products/${id}`, dto),
  historico: (params?: any) => api.get('/stock/movements', { params }),
  entrada: (dto: any) => api.post('/stock/entry', dto),
  saida: (dto: any) => api.post('/stock/exit', dto),
  alertas: () => api.get('/stock/alerts'),
  resumo: () => api.get('/stock/dashboard'),
  relatorio: (di?: string, df?: string) =>
    api.get('/stock/report', { params: { data_inicio: di, data_fim: df } }),
};

// ── Clientes (Sprint 6) ──────────────────────────────────────
export const clientsApi = {
  listar: (params?: any) => api.get('/clients', { params }),
  buscar: (id: string) => api.get(`/clients/${id}`),
  criar: (dto: any) => api.post('/clients', dto),
  atualizar: (id: string, dto: any) => api.patch(`/clients/${id}`, dto),
};

// ── Contratos (Sprint 6) ─────────────────────────────────────
export const contractsApi = {
  listar: (params?: any) => api.get('/contracts', { params }),
  buscar: (id: string) => api.get(`/contracts/${id}`),
  criar: (dto: any) => api.post('/contracts', dto),
  atualizar: (id: string, dto: any) => api.patch(`/contracts/${id}`, dto),
  reajustar: (id: string, dto: any) => api.post(`/contracts/${id}/reajuste`, dto),
  reajustes: (id: string) => api.get(`/contracts/${id}/reajustes`),
  // ERR-03: vinculo N:N contrato <-> maquina
  maquinas:    (id: string) => api.get(`/contracts/${id}/maquinas`),
  vincular:    (id: string, maquina_id: string) =>
    api.post(`/contracts/${id}/maquinas`, { maquina_id }),
  desvincular: (id: string, maquinaId: string) =>
    api.delete(`/contracts/${id}/maquinas/${maquinaId}`),
};

// ── Cobranças / Lançamentos (Sprint 6) ───────────────────────
export const invoicesApi = {
  listar: (params?: any) => api.get('/invoices', { params }),
  gerar: (dto: any) => api.post('/invoices/generate', dto),
  pagar: (id: string, dto: any) => api.post(`/invoices/${id}/pay`, dto),
  atualizar: (id: string, dto: any) => api.patch(`/invoices/${id}`, dto),
  inadimplencia: () => api.get('/invoices/overdue'),
};

// ── Usuários (Sprint 9) ───────────────────────────────────────
export const usersApi = {
  listar: () => api.get('/users'),
  convidar: (dto: { email: string; perfil: string }) => api.post('/users/invite', dto),
  reenviarConvite: (id: string) => api.post(`/users/${id}/resend-invite`),
  atualizar: (id: string, dto: any) => api.patch(`/users/${id}`, dto),
  toggleAtivo: (id: string, ativo: boolean) => api.patch(`/users/${id}/toggle`, { ativo }),
  aceitarConvite: (dto: { token: string; nome: string; senha: string }) =>
    api.post('/users/accept-invite', dto),
};

// ── Auditoria (Sprint 9) ─────────────────────────────────────
export const auditApi = {
  listar: (params?: Record<string, any>) => api.get('/audit', { params }),
  modulos: () => api.get('/audit/modulos'),
};

// ── Configurações do Tenant (Sprint 11) ──────────────────────
export const settingsApi = {
  obter: () => api.get('/tenants/meu'),
  atualizar: (dto: any) => api.patch('/tenants/configuracoes', dto),
  configurar: (dto: any) => api.patch('/tenants/configurar', dto),
};

// ── Super Admin (Sprint 16/17) ───────────────────────────────────
export const superAdminApi = {
  // Dashboard global
  dashboard: () => api.get('/super-admin/dashboard'),
  // Métricas globais consumidas pelo SuperAdminPage (shape achatado)
  metricas: () => api.get('/tenants/metricas'),
  // Tenants
  listarTenants: (params?: Record<string, string>) => api.get('/super-admin/tenants', { params }),
  detalharTenant: (id: string) => api.get(`/super-admin/tenants/${id}`),
  atualizarStatus: (id: string, status: string) =>
    api.patch(`/super-admin/tenants/${id}/status`, { status }),
  atualizarPlano: (id: string, plano: string) =>
    api.patch(`/super-admin/tenants/${id}/plano`, { plano }),
  estenderTrial: (id: string, trial_ate: string) =>
    api.patch(`/super-admin/tenants/${id}/trial`, { trial_ate }),
  aplicarDesconto: (id: string, dto: any) => api.post(`/super-admin/tenants/${id}/desconto`, dto),
  // Planos
  listarPlanos: () => api.get('/super-admin/planos'),
  // Logs
  logs: (limite?: number) => api.get('/super-admin/logs', { params: { limite } }),
  // Suporte assistido (impersonate)
  impersonate: (tenantId: string, motivo?: string) =>
    api.post(`/super-admin/impersonate/${tenantId}`, { motivo }),
  historicoImpersonations: (limite?: number) =>
    api.get('/super-admin/impersonations', { params: { limite } }),

  // ERR-24: assinatura do SaaS (cobranca manual)
  assinatura:        (tenantId: string) => api.get(`/super-admin/tenants/${tenantId}/assinatura`),
  criarAssinatura:   (tenantId: string, dto: any = {}) =>
    api.post(`/super-admin/tenants/${tenantId}/assinatura`, dto),
  gerarCobranca:     (tenantId: string, dto: any = {}) =>
    api.post(`/super-admin/tenants/${tenantId}/assinatura/cobrancas`, dto),
  pagarCobranca:     (cobrancaId: string, dto: any) =>
    api.patch(`/super-admin/assinaturas/cobrancas/${cobrancaId}/pagar`, dto),
  cancelarAssinatura: (tenantId: string) =>
    api.patch(`/super-admin/tenants/${tenantId}/assinatura/cancelar`),
  cobrancasEmAberto: () => api.get('/super-admin/assinaturas/em-aberto'),
};

// ── Relatórios (Sprint 8) ────────────────────────────────────
export const reportsApi = {
  financeiro: (di?: string, df?: string) =>
    api.get('/reports/financeiro', { params: { data_inicio: di, data_fim: df } }),
  financeiroExcel: (di?: string, df?: string) =>
    api.get('/reports/financeiro/excel', {
      params: { data_inicio: di, data_fim: df },
      responseType: 'blob' as const,
    }),
  contratos: () => api.get('/reports/contratos'),
  contratosExcel: () => api.get('/reports/contratos/excel', { responseType: 'blob' as const }),
  maquinas: (di?: string, df?: string) =>
    api.get('/reports/maquinas', { params: { data_inicio: di, data_fim: df } }),
  maquinasExcel: (di?: string, df?: string) =>
    api.get('/reports/maquinas/excel', {
      params: { data_inicio: di, data_fim: df },
      responseType: 'blob' as const,
    }),
  estoqueExcel: () => api.get('/reports/estoque/excel', { responseType: 'blob' as const }),
};

// ── Agendamento de relatórios (RF-R06 / Sprint 17) ────────────
export const reportSchedulesApi = {
  listar:    () => api.get('/reports/schedules'),
  buscar:    (id: string) => api.get(`/reports/schedules/${id}`),
  criar:     (dto: any) => api.post('/reports/schedules', dto),
  atualizar: (id: string, dto: any) => api.patch(`/reports/schedules/${id}`, dto),
  remover:   (id: string) => api.delete(`/reports/schedules/${id}`),
  executar:  (id: string) => api.post(`/reports/schedules/${id}/executar`),
};

// ── Atividades Mensais (Sprint 14) ───────────────────────────
// Modelos
export const activitiesApi = {
  // Modelos (configuração)
  listarModelos: () => api.get('/activities/modelos'),
  criarModelo: (dto: any) => api.post('/activities/modelos', dto),
  atualizarModelo: (id: string, dto: any) => api.patch(`/activities/modelos/${id}`, dto),
  excluirModelo: (id: string) => api.delete(`/activities/modelos/${id}`),

  // Execuções (checklist mensal)
  listar: (competencia?: string) => api.get('/activities', { params: { competencia } }),
  resumo: (competencia?: string) => api.get('/activities/resumo', { params: { competencia } }),
  gerar: (competencia: string) => api.post('/activities/gerar', { competencia }),
  baixar: (id: string, dto?: any) => api.post(`/activities/${id}/baixar`, dto ?? {}),
  naoAplicavel: (id: string) => api.post(`/activities/${id}/nao-aplicavel`),
  reabrir: (id: string) => api.post(`/activities/${id}/reabrir`),
};

// ── Dashboard Sprint 14 extras ────────────────────────────────
// (Adicionado ao dashboardApi abaixo)

// ── Importação (Sprint 12) ───────────────────────────────────────────
export const importApi = {
  template: async (tipo: string): Promise<Blob> => {
    const res = await api.get(`/import/template/${tipo}`, { responseType: 'blob' as const });
    return res.data;
  },
  validar: async (tipo: string, arquivo: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', arquivo);
    formData.append('tipo', tipo);
    const res = await api.post('/import/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  confirmar: (tipo: string, rows: any[]) =>
    api.post('/import/confirm', { tipo, rows }).then((r) => r.data),
  logs: () => api.get('/import/logs').then((r) => r.data),
};

// ── Catálogo Excel (Sprint 12) ───────────────────────────────────────
export const catalogExportApi = {
  exportarCatalogo: () => api.get('/catalog/export/pdf', { responseType: 'blob' as const }),
};

// ── Doses (Sprint 13) ───────────────────────────────────────
export const dosesApi = {
  listar: (params?: any) => api.get('/doses', { params }).then((r) => r.data),
  resumo: (meses = 6) => api.get('/doses/resumo', { params: { meses } }).then((r) => r.data),
  pendenteEnvio: () => api.get('/doses/pendente-envio').then((r) => r.data),
  buscar: (id: string) => api.get(`/doses/${id}`).then((r) => r.data),
  criar: (dto: any) => api.post('/doses', dto).then((r) => r.data),
  atualizar: (id: string, dto: any) => api.patch(`/doses/${id}`, dto).then((r) => r.data),
  marcarEnvio: (id: string, data_envio: string) =>
    api.post(`/doses/${id}/enviar`, { data_envio }).then((r) => r.data),
  excluir: (id: string) => api.delete(`/doses/${id}`).then((r) => r.data),
};

// ── Gastos (Sprint 13) ───────────────────────────────────────
export const gastosApi = {
  listar: (params?: any) => api.get('/gastos', { params }).then((r) => r.data),
  kpi: (competencia?: string) =>
    api.get('/gastos/kpi', { params: { competencia } }).then((r) => r.data),
  evolucao: (meses = 6) => api.get('/gastos/evolucao', { params: { meses } }).then((r) => r.data),
  vencendo: (dias = 7) => api.get('/gastos/vencendo', { params: { dias } }).then((r) => r.data),
  buscar: (id: string) => api.get(`/gastos/${id}`).then((r) => r.data),
  criar: (dto: any) => api.post('/gastos', dto).then((r) => r.data),
  atualizar: (id: string, dto: any) => api.patch(`/gastos/${id}`, dto).then((r) => r.data),
  pagar: (id: string, dto: any) => api.post(`/gastos/${id}/pagar`, dto).then((r) => r.data),
  cancelar: (id: string) => api.post(`/gastos/${id}/cancelar`).then((r) => r.data),
  excluir: (id: string) => api.delete(`/gastos/${id}`).then((r) => r.data),
  duplicarRecorrentes: (competencia: string) =>
    api.post('/gastos/duplicar-recorrentes', { competencia }).then((r) => r.data),
};

// ── Manutenção (Sprint 15) ──────────────────────────────────
export const manutencaoApi = {
  listar: (params?: any) => api.get('/manutencao', { params }).then((r) => r.data),
  kpis: () => api.get('/manutencao/kpis').then((r) => r.data),
  buscar: (id: string) => api.get(`/manutencao/${id}`).then((r) => r.data),
  criar: (dto: any) => api.post('/manutencao', dto).then((r) => r.data),
  atualizar: (id: string, dto: any) => api.patch(`/manutencao/${id}`, dto).then((r) => r.data),
  iniciar: (id: string, data?: string) =>
    api.post(`/manutencao/${id}/iniciar`, { data_inicio: data }).then((r) => r.data),
  concluir: (id: string, dto: any) =>
    api.post(`/manutencao/${id}/concluir`, dto).then((r) => r.data),
  cancelar: (id: string) => api.post(`/manutencao/${id}/cancelar`).then((r) => r.data),
};

// ── Contrato de Evento — dados para PDF (Sprint 15) ─────────────
export const contratoEventoApi = {
  dados: (id: string) => api.get(`/contracts/evento/${id}/dados`).then((r) => r.data),
};
