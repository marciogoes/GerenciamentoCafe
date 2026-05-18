import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck, Coffee } from 'lucide-react';
import { useAuth }     from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';

const loginSchema = z.object({
  tenantSlug: z.string().min(2, 'Informe o identificador da empresa.'),
  email:      z.string().email('E-mail inválido.'),
  senha:      z.string().min(8, 'Mínimo 8 caracteres.'),
});

const twoFaSchema = z.object({
  codigo: z.string().length(6, 'O código deve ter 6 dígitos.').regex(/^\d+$/, 'Somente números.'),
});

type LoginForm = z.infer<typeof loginSchema>;
type TwoFaForm = z.infer<typeof twoFaSchema>;

export default function LoginPage() {
  const { login, verify2fa } = useAuth();
  const navigate = useNavigate();

  const [step,      setStep]      = useState<'login' | '2fa'>('login');
  const [tokenTemp, setTokenTemp] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState('');

  const loginForm = useForm<LoginForm>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { tenantSlug: '', email: '', senha: '' },
  });

  const twoFaForm = useForm<TwoFaForm>({
    resolver:      zodResolver(twoFaSchema),
    defaultValues: { codigo: '' },
  });

  const onLogin = async (data: LoginForm) => {
    setErro('');
    setLoading(true);
    try {
      const res = await login(data.email, data.senha, data.tenantSlug);
      if (res.requer2FA && res.tokenTemp) {
        setTokenTemp(res.tokenTemp);
        setStep('2fa');
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const on2Fa = async (data: TwoFaForm) => {
    setErro('');
    setLoading(true);
    try {
      await verify2fa(data.codigo, tokenTemp);
      navigate('/', { replace: true });
    } catch (e) {
      setErro(getErrorMessage(e));
      twoFaForm.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Vending Manager</h1>
          <p className="text-blue-200 mt-1 text-sm">Sistema de Gestão de Máquinas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Etapa 1: login */}
          {step === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h2>
              <p className="text-sm text-gray-500 mb-6">Acesse sua conta para continuar</p>

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <label className="label">Empresa (identificador)</label>
                  <input
                    {...loginForm.register('tenantSlug')}
                    className="input"
                    placeholder="ex: belcafe"
                    autoComplete="organization"
                    autoFocus
                  />
                  {loginForm.formState.errors.tenantSlug && (
                    <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.tenantSlug.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">E-mail</label>
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    className="input"
                    placeholder="seuemail@empresa.com.br"
                    autoComplete="email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input
                      {...loginForm.register('senha')}
                      type={showSenha ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.senha && (
                    <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.senha.message}</p>
                  )}
                </div>

                {erro && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{erro}</div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
                </button>
              </form>
            </>
          )}

          {/* Etapa 2: 2FA */}
          {step === '2fa' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Verificação em 2 Etapas</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Abra o Google Authenticator ou Authy e informe o código de 6 dígitos.
                </p>
              </div>

              <form onSubmit={twoFaForm.handleSubmit(on2Fa)} className="space-y-4">
                <div>
                  <label className="label">Código TOTP</label>
                  <input
                    {...twoFaForm.register('codigo')}
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                  />
                  {twoFaForm.formState.errors.codigo && (
                    <p className="mt-1 text-xs text-red-600 text-center">{twoFaForm.formState.errors.codigo.message}</p>
                  )}
                </div>

                {erro && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">{erro}</div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : 'Verificar e Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('login'); setErro(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
                >
                  ← Voltar ao login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          Vending Manager SaaS © 2026 · BelCafé Locação e Serviços
        </p>
      </div>
    </div>
  );
}
