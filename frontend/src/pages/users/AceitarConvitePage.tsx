import { useEffect, useState }  from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm }                      from 'react-hook-form';
import { zodResolver }                  from '@hookform/resolvers/zod';
import { z }                            from 'zod';
import { Coffee, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import toast                            from 'react-hot-toast';
import { usersApi, getErrorMessage }    from '../../services/api';

const schema = z.object({
  nome:     z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  senha:    z.string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(/[A-Z]/,       'Inclua pelo menos 1 maiúscula.')
    .regex(/[0-9]/,       'Inclua pelo menos 1 número.')
    .regex(/[^A-Za-z0-9]/, 'Inclua pelo menos 1 símbolo especial.'),
  confirmar: z.string(),
}).refine(d => d.senha === d.confirmar, {
  message:  'As senhas não conferem.',
  path:     ['confirmar'],
});

type Form = z.infer<typeof schema>;

export function AceitarConvitePage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token') || '';

  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [tokenErr,  setTokenErr]  = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) setTokenErr('Link de convite inválido ou ausente.');
  }, [token]);

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await usersApi.aceitarConvite({ token, nome: data.nome, senha: data.senha });
      setSuccess(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Tela de token inválido ────────────────────────────────────
  if (tokenErr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Convite inválido</h1>
          <p className="text-gray-500 text-sm mb-6">{tokenErr}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Tela de sucesso ───────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conta criada!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Sua conta foi ativada com sucesso. Faça login para começar a usar o sistema.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vending Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Complete seu cadastro para acessar o sistema.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
            <input
              type="text"
              placeholder="Maria Silva"
              autoComplete="name"
              className="input w-full"
              {...register('nome')}
            />
            {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Defina sua senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="input w-full pr-10"
                {...register('senha')}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha.message}</p>}
            <p className="text-xs text-gray-400 mt-1">
              8+ chars · 1 maiúscula · 1 número · 1 símbolo
            </p>
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirme a senha</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="input w-full pr-10"
                {...register('confirmar')}
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmar && <p className="text-xs text-red-500 mt-1">{errors.confirmar.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AceitarConvitePage;
