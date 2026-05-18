import { useState, useEffect }      from 'react';
import { useForm }                  from 'react-hook-form';
import { zodResolver }              from '@hookform/resolvers/zod';
import { z }                        from 'zod';
import toast                        from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Building2, Settings, Shield, CreditCard,
  Save, Loader2, Check, Globe, Clock, Bell, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { settingsApi, getErrorMessage } from '../../services/api';
import { useTenant }                    from '../../contexts/TenantContext';

// ── Schemas ───────────────────────────────────────────────────
const schemaEmpresa = z.object({
  nome_exibicao: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  fuso_horario:  z.string().min(1, 'Obrigatório'),
});

const schemaOperacional = z.object({
  dias_alerta_maquina:   z.coerce.number().int().min(1).max(365),
  tempo_inatividade_min: z.coerce.number().int().min(5).max(480),
});

type EmpresaForm      = z.infer<typeof schemaEmpresa>;
type OperacionalForm  = z.infer<typeof schemaOperacional>;

// ── Abas ──────────────────────────────────────────────────────
const ABAS = [
  { id: 'empresa',     label: 'Empresa',      icon: Building2  },
  { id: 'operacional', label: 'Operacional',  icon: Settings   },
  { id: 'seguranca',   label: 'Segurança',    icon: Shield     },
  { id: 'plano',       label: 'Plano',        icon: CreditCard },
] as const;

type Aba = typeof ABAS[number]['id'];

// ── Mapa de fusos horários brasileiros ────────────────────────
const FUSOS = [
  { value: 'America/Belem',          label: 'Belém / Brasília (UTC-3)' },
  { value: 'America/Sao_Paulo',      label: 'São Paulo (UTC-3)'        },
  { value: 'America/Manaus',         label: 'Manaus (UTC-4)'           },
  { value: 'America/Rio_Branco',     label: 'Rio Branco (UTC-5)'       },
  { value: 'America/Noronha',        label: 'Fernando de Noronha (UTC-2)' },
];

// ── Planos ────────────────────────────────────────────────────
const INFO_PLANO: Record<string, { label: string; cor: string; descricao: string }> = {
  starter:    { label: 'Starter',    cor: 'bg-gray-500',    descricao: 'Até 5 usuários · 50 máquinas · 30 clientes' },
  pro:        { label: 'Pro',        cor: 'bg-blue-500',    descricao: 'Até 20 usuários · 200 máquinas · Clientes ilimitados · API REST' },
  enterprise: { label: 'Enterprise', cor: 'bg-purple-600',  descricao: 'Ilimitado · White-label · Domínio próprio · SLA dedicado' },
  trial:      { label: 'Trial',      cor: 'bg-amber-500',   descricao: 'Plano Pro por 14 dias gratuitos' },
};

// ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('empresa');
  const qc                      = useQueryClient();
  const { recarregar }          = useTenant();

  // ── Carrega dados do tenant ───────────────────────────────
  const { data: tenant, isLoading } = useQuery(
    'settings-tenant',
    () => settingsApi.obter().then(r => r.data),
    { staleTime: 30_000 },
  );

  // ── Forms ─────────────────────────────────────────────────
  const formEmpresa = useForm<EmpresaForm>({
    resolver: zodResolver(schemaEmpresa),
    defaultValues: { nome_exibicao: '', fuso_horario: 'America/Belem' },
  });

  const formOperacional = useForm<OperacionalForm>({
    resolver: zodResolver(schemaOperacional),
    defaultValues: { dias_alerta_maquina: 30, tempo_inatividade_min: 60 },
  });

  // Preenche forms quando o tenant carrega
  useEffect(() => {
    if (!tenant) return;
    formEmpresa.reset({
      nome_exibicao: tenant.nome_exibicao || tenant.razao_social || '',
      fuso_horario:  tenant.fuso_horario  || 'America/Belem',
    });
    formOperacional.reset({
      dias_alerta_maquina:   tenant.dias_alerta_maquina   ?? 30,
      tempo_inatividade_min: tenant.tempo_inatividade_min ?? 60,
    });
  }, [tenant]);

  // ── Mutations ─────────────────────────────────────────────
  const mutEmpresa = useMutation(
    (dto: EmpresaForm) => settingsApi.atualizar(dto),
    {
      onSuccess: () => {
        toast.success('Dados da empresa atualizados!');
        qc.invalidateQueries('settings-tenant');
        recarregar();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  const mutOperacional = useMutation(
    (dto: OperacionalForm) => settingsApi.atualizar(dto),
    {
      onSuccess: () => {
        toast.success('Configurações operacionais salvas!');
        qc.invalidateQueries('settings-tenant');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const planoInfo = INFO_PLANO[tenant?.status === 'trial' ? 'trial' : (tenant?.plano || 'starter')];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as configurações da sua empresa no Vending Manager.
        </p>
      </div>

      {/* Layout com abas laterais */}
      <div className="flex gap-6">

        {/* Sidebar de abas */}
        <nav className="flex flex-col gap-1 w-44 flex-shrink-0">
          {ABAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                abaAtiva === id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Conteúdo da aba */}
        <div className="flex-1 min-w-0">

          {/* ── ABA: EMPRESA ─────────────────────────────────── */}
          {abaAtiva === 'empresa' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Dados da Empresa</h2>
                  <p className="text-xs text-gray-500">Informações de exibição do seu tenant</p>
                </div>
              </div>

              {/* Info somente-leitura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Razão Social</p>
                  <p className="text-sm font-semibold text-gray-900">{tenant?.razao_social}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">CNPJ</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {tenant?.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Subdomínio</p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">
                    {tenant?.slug}.vendingmanager.com.br
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">E-mail admin</p>
                  <p className="text-sm font-semibold text-gray-900">{tenant?.email_admin}</p>
                </div>
              </div>

              {/* Form editável */}
              <form onSubmit={formEmpresa.handleSubmit(d => mutEmpresa.mutate(d))} className="space-y-4 pt-2">
                <div>
                  <label className="label">Nome de Exibição</label>
                  <input
                    {...formEmpresa.register('nome_exibicao')}
                    className="input"
                    placeholder="Ex.: BelCafé Locação"
                  />
                  {formEmpresa.formState.errors.nome_exibicao && (
                    <p className="text-xs text-red-500 mt-1">{formEmpresa.formState.errors.nome_exibicao.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Aparece no topo da sidebar e nos relatórios exportados.
                  </p>
                </div>

                <div>
                  <label className="label">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />
                    Fuso Horário
                  </label>
                  <select {...formEmpresa.register('fuso_horario')} className="input">
                    {FUSOS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={mutEmpresa.isLoading}
                    className="btn-primary gap-2"
                  >
                    {mutEmpresa.isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />}
                    Salvar alterações
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── ABA: OPERACIONAL ─────────────────────────────── */}
          {abaAtiva === 'operacional' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Configurações Operacionais</h2>
                  <p className="text-xs text-gray-500">Parâmetros de alertas e comportamento do sistema</p>
                </div>
              </div>

              <form onSubmit={formOperacional.handleSubmit(d => mutOperacional.mutate(d))} className="space-y-6">

                {/* Alerta de máquina */}
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Alerta de Máquina sem Retorno
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">
                        Após quantos dias fora da base o sistema deve alertar?
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          {...formOperacional.register('dias_alerta_maquina')}
                          className="input w-28 text-center"
                          min={1} max={365}
                        />
                        <span className="text-sm text-gray-600">dias sem retorno</span>
                      </div>
                      {formOperacional.formState.errors.dias_alerta_maquina && (
                        <p className="text-xs text-red-500 mt-1">
                          {formOperacional.formState.errors.dias_alerta_maquina.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logout automático */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Logout Automático por Inatividade
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">
                        Sessão encerrada automaticamente após inatividade.
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          {...formOperacional.register('tempo_inatividade_min')}
                          className="input w-28 text-center"
                          min={5} max={480}
                        />
                        <span className="text-sm text-gray-600">minutos</span>
                      </div>
                      {formOperacional.formState.errors.tempo_inatividade_min && (
                        <p className="text-xs text-red-500 mt-1">
                          {formOperacional.formState.errors.tempo_inatividade_min.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Mínimo: 5 min · Máximo: 480 min (8h)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={mutOperacional.isLoading}
                    className="btn-primary gap-2"
                  >
                    {mutOperacional.isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />}
                    Salvar configurações
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── ABA: SEGURANÇA ───────────────────────────────── */}
          {abaAtiva === 'seguranca' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Segurança</h2>
                  <p className="text-xs text-gray-500">Políticas de acesso e autenticação</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    titulo:   'Autenticação de dois fatores (2FA)',
                    descricao:'Obrigatório para todos os perfis Admin. Utiliza TOTP via app autenticador.',
                    ativo:    true,
                    fixo:     true,
                  },
                  {
                    titulo:   'Bloqueio por tentativas inválidas',
                    descricao:'Conta bloqueada por 15 min após 5 tentativas de login inválidas.',
                    ativo:    true,
                    fixo:     true,
                  },
                  {
                    titulo:   'Log de auditoria',
                    descricao:'Todas as operações de escrita são registradas com usuário, IP e timestamp.',
                    ativo:    true,
                    fixo:     true,
                  },
                  {
                    titulo:   'HTTPS / TLS 1.3',
                    descricao:'Todas as comunicações são criptografadas em trânsito.',
                    ativo:    true,
                    fixo:     true,
                  },
                ].map((item) => (
                  <div
                    key={item.titulo}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      item.ativo ? 'bg-green-100' : 'bg-gray-200',
                    )}>
                      <Check className={clsx('w-4 h-4', item.ativo ? 'text-green-600' : 'text-gray-400')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
                    </div>
                    {item.fixo && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">
                        Fixo
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700">
                  <strong>Gerenciamento de usuários:</strong> Para convidar, desativar ou alterar perfis,
                  acesse o módulo <strong>Usuários</strong> no menu lateral.
                </p>
              </div>
            </div>
          )}

          {/* ── ABA: PLANO ───────────────────────────────────── */}
          {abaAtiva === 'plano' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Plano de Assinatura</h2>
                  <p className="text-xs text-gray-500">Detalhes do seu plano atual</p>
                </div>
              </div>

              {/* Plano atual */}
              <div className="p-5 rounded-xl border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className={clsx('text-xs font-bold text-white px-3 py-1 rounded-full', planoInfo.cor)}>
                    {planoInfo.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">Plano atual</span>
                </div>
                <p className="text-sm text-gray-600">{planoInfo.descricao}</p>

                {tenant?.status === 'trial' && tenant?.trial_ate && (
                  <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-medium">
                      Trial expira em:{' '}
                      <strong>
                        {new Date(tenant.trial_ate).toLocaleDateString('pt-BR')}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Limites de uso */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Limites de uso</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Usuários',  valor: tenant?.max_usuarios  || 0 },
                    { label: 'Máquinas',  valor: tenant?.max_maquinas  || 0 },
                    { label: 'Contratos', valor: tenant?.max_contratos || 0 },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-2xl font-bold text-gray-900">
                        {item.valor === 0 ? '∞' : item.valor}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Precisa de mais recursos? Entre em contato com nossa equipe.
                </p>
                <a
                  href="mailto:contato@vendingmanager.com.br"
                  className="btn-primary inline-flex"
                >
                  Falar com vendas
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
