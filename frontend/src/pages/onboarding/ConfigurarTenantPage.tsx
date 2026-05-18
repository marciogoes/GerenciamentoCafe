import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Coffee, Loader2, Check, X } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

const fusos = [
  { value: 'America/Belem',       label: 'Belém / Manaus  (UTC-4)' },
  { value: 'America/Sao_Paulo',   label: 'São Paulo / Rio  (UTC-3)' },
  { value: 'America/Fortaleza',   label: 'Fortaleza / Recife  (UTC-3)' },
  { value: 'America/Cuiaba',      label: 'Cuiabá / Campo Grande  (UTC-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho  (UTC-4)' },
  { value: 'America/Manaus',      label: 'Manaus  (UTC-4)' },
  { value: 'America/Noronha',     label: 'Fernando de Noronha  (UTC-2)' },
  { value: 'America/Rio_Branco',  label: 'Rio Branco  (UTC-5)' },
];

const schema = z.object({
  slug: z.string()
    .min(3, 'Mínimo 3 caracteres.')
    .max(60, 'Máximo 60 caracteres.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Apenas letras minúsculas, números e hífens. Não pode iniciar ou terminar com hífen.',
    }),
  nome_exibicao: z.string().min(2, 'Nome de exibição obrigatório.'),
  fuso_horario:  z.string(),
});

type Form = z.infer<typeof schema>;

type SlugStatus = 'idle' | 'checking' | 'disponivel' | 'indisponivel';

export default function ConfigurarTenantPage() {
  const location  = useLocation();
  const navigate  = useNavigate();

  const tenantId: string = (location.state as any)?.tenantId || '';

  const [loading,     setLoading]     = useState(false);
  const [erro,        setErro]        = useState('');
  const [slugStatus,  setSlugStatus]  = useState<SlugStatus>('idle');
  const [sugestoes,   setSugestoes]   = useState<string[]>([]);
  const [slugTimer,   setSlugTimer]   = useState<ReturnType<typeof setTimeout>>();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver:      zodResolver(schema),
    defaultValues: { fuso_horario: 'America/Belem' },
  });

  const slugWatch = watch('slug');

  // Verificação de slug com debounce de 600ms
  useEffect(() => {
    if (!slugWatch || slugWatch.length < 3) { setSlugStatus('idle'); return; }
    if (slugTimer) clearTimeout(slugTimer);
    const timer = setTimeout(async () => {
      setSlugStatus('checking');
      try {
        const { data } = await api.get(`/tenants/slug-disponivel?slug=${slugWatch}`);
        setSlugStatus(data.disponivel ? 'disponivel' : 'indisponivel');
        setSugestoes(data.sugestoes || []);
      } catch {
        setSlugStatus('idle');
      }
    }, 600);
    setSlugTimer(timer);
    return () => clearTimeout(timer);
  }, [slugWatch]);

  const onSubmit = async (data: Form) => {
    if (slugStatus === 'indisponivel') return;
    if (!tenantId) { setErro('Sessão inválida. Refaça o cadastro.'); return; }
    setErro('');
    setLoading(true);
    try {
      await api.patch('/tenants/configurar', {
        slug:          data.slug,
        nome_exibicao: data.nome_exibicao,
        fuso_horario:  data.fuso_horario,
      }, { headers: { 'X-Tenant-Id': tenantId } });
      navigate('/wizard', { state: { tenantId } });
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const iconSlug = () => {
    if (slugStatus === 'checking')     return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    if (slugStatus === 'disponivel')   return <Check className="w-4 h-4 text-green-500" />;
    if (slugStatus === 'indisponivel') return <X className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <Coffee className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">Vending Manager</span>
          </div>
          <p className="text-blue-200 text-sm mt-1">Passo 1 de 2 — Configure sua empresa</p>
        </div>

        {/* Barra de progresso */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-white" />
          <div className="flex-1 h-1.5 rounded-full bg-white/30" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Configure seu ambiente</h2>
          <p className="text-sm text-gray-500 mb-6">
            Defina o identificador único da sua empresa e as configurações regionais.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Slug / Subdomínio */}
            <div>
              <label className="label">Identificador da empresa (subdomínio)</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <div className="bg-gray-50 border-r border-gray-300 px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">
                  vendingmanager.com.br/
                </div>
                <div className="relative flex-1">
                  <input
                    {...register('slug')}
                    className="block w-full px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="belcafe"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">{iconSlug()}</div>
                </div>
              </div>
              {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
              {slugStatus === 'disponivel' && (
                <p className="mt-1 text-xs text-green-600">✅ Identificador disponível!</p>
              )}
              {slugStatus === 'indisponivel' && (
                <div className="mt-1">
                  <p className="text-xs text-red-600 mb-1">❌ Identificador já em uso. Sugestões:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sugestoes.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setValue('slug', s)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Use apenas letras minúsculas, números e hífens. Este identificador não pode ser alterado depois.
              </p>
            </div>

            {/* Nome de exibição */}
            <div>
              <label className="label">Nome de exibição no sistema</label>
              <input
                {...register('nome_exibicao')}
                className="input"
                placeholder="BelCafé"
              />
              {errors.nome_exibicao && (
                <p className="mt-1 text-xs text-red-600">{errors.nome_exibicao.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Aparece no topo do sistema e nos relatórios.
              </p>
            </div>

            {/* Fuso horário */}
            <div>
              <label className="label">Fuso horário</label>
              <select {...register('fuso_horario')} className="input">
                {fusos.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {erro && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{erro}</div>
            )}

            <button
              type="submit"
              disabled={loading || slugStatus === 'indisponivel' || slugStatus === 'checking'}
              className="btn-primary w-full"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : 'Continuar →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
