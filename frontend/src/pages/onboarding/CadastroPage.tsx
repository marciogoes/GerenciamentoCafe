import { useState } from 'react';
import { Link, useNavigate }  from 'react-router-dom';
import { useForm }            from 'react-hook-form';
import { zodResolver }        from '@hookform/resolvers/zod';
import { z }                  from 'zod';
import { Coffee, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

// ── Validação CNPJ (dígitos verificadores) ─────────────────────
function validarCnpj(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (s: string, t: number) => {
    let soma = 0, pos = t - 7;
    for (let i = t; i >= 1; i--) { soma += +s[t - i] * pos--; if (pos < 2) pos = 9; }
    return soma % 11 < 2 ? 0 : 11 - (soma % 11);
  };
  return calc(c, 12) === +c[12] && calc(c, 13) === +c[13];
}

const schema = z.object({
  razao_social: z.string().min(3, 'Razão social obrigatória.'),
  cnpj: z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 14, 'CNPJ deve ter 14 dígitos.')
    .refine(v => validarCnpj(v), 'CNPJ inválido. Verifique os dígitos.'),
  email_admin:  z.string().email('E-mail inválido.'),
  telefone:     z.string().optional(),
  plano:        z.enum(['starter', 'pro', 'enterprise']),
  senha:        z.string().min(8, 'Mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Precisa de letra maiúscula.')
    .regex(/[0-9]/, 'Precisa de número.')
    .regex(/[^A-Za-z0-9]/, 'Precisa de símbolo especial.'),
  confirmar_senha: z.string(),
}).refine(d => d.senha === d.confirmar_senha, {
  message: 'As senhas não coincidem.',
  path:    ['confirmar_senha'],
});

type Form = z.infer<typeof schema>;

const planos = [
  {
    id:    'starter',
    nome:  'Starter',
    preco: 'R$ 97/mês',
    itens: ['1 empresa', 'Até 5 usuários', 'Até 50 máquinas', 'Suporte por e-mail'],
  },
  {
    id:    'pro',
    nome:  'Pro',
    preco: 'R$ 197/mês',
    destaque: true,
    itens: ['1 empresa', 'Até 20 usuários', 'Até 200 máquinas', 'API REST', 'Suporte prioritário'],
  },
  {
    id:    'enterprise',
    nome:  'Enterprise',
    preco: 'Sob consulta',
    itens: ['Ilimitado', 'White-label', 'Domínio próprio', 'SLA dedicado'],
  },
];

export default function CadastroPage() {
  const navigate    = useNavigate();
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver:      zodResolver(schema),
    defaultValues: { plano: 'pro' },
  });

  const planoSel = watch('plano');

  // Formata CNPJ enquanto digita
  const formatarCnpj = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 14);
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const onSubmit = async (data: Form) => {
    setErro('');
    setLoading(true);
    try {
      await api.post('/tenants/cadastro', {
        razao_social: data.razao_social,
        cnpj:         data.cnpj,
        email_admin:  data.email_admin,
        telefone:     data.telefone,
        plano:        data.plano,
        senha:        data.senha,
      });
      navigate('/verificar-email', { state: { email: data.email_admin } });
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Vending Manager</span>
          </div>
          <p className="text-blue-200 mt-2">Comece grátis — 14 dias de trial no plano Pro</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">Fazer login</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Escolha do plano */}
            <div>
              <label className="label">Escolha seu plano</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {planos.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setValue('plano', p.id as any)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                      planoSel === p.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {p.destaque && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                        Mais popular
                      </span>
                    )}
                    <p className="font-semibold text-gray-900">{p.nome}</p>
                    <p className="text-blue-600 font-bold text-sm mt-0.5">{p.preco}</p>
                    <ul className="mt-2 space-y-1">
                      {p.itens.map(i => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {i}
                        </li>
                      ))}
                    </ul>
                    {planoSel === p.id && (
                      <div className="absolute top-3 right-3 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dados da empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Razão Social</label>
                <input {...register('razao_social')} className="input" placeholder="BelCafé Locação e Serviços Ltda" />
                {errors.razao_social && <p className="mt-1 text-xs text-red-600">{errors.razao_social.message}</p>}
              </div>

              <div>
                <label className="label">CNPJ</label>
                <input
                  {...register('cnpj')}
                  className="input"
                  placeholder="00.000.000/0000-00"
                  onChange={e => {
                    e.target.value = formatarCnpj(e.target.value);
                    register('cnpj').onChange(e);
                  }}
                />
                {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
              </div>

              <div>
                <label className="label">Telefone / WhatsApp</label>
                <input {...register('telefone')} className="input" placeholder="(91) 99999-9999" />
              </div>
            </div>

            {/* Acesso */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Dados de acesso do administrador</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">E-mail</label>
                  <input {...register('email_admin')} type="email" className="input" placeholder="admin@empresa.com.br" />
                  {errors.email_admin && <p className="mt-1 text-xs text-red-600">{errors.email_admin.message}</p>}
                </div>

                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input {...register('senha')} type={showSenha ? 'text' : 'password'} className="input pr-10" placeholder="Mín. 8 chars + maiúscula + número + símbolo" />
                    <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
                </div>

                <div>
                  <label className="label">Confirmar senha</label>
                  <div className="relative">
                    <input {...register('confirmar_senha')} type={showConf ? 'text' : 'password'} className="input pr-10" placeholder="Repita a senha" />
                    <button type="button" onClick={() => setShowConf(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmar_senha && <p className="mt-1 text-xs text-red-600">{errors.confirmar_senha.message}</p>}
                </div>
              </div>
            </div>

            {erro && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{erro}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando sua conta...</>
                : '🚀 Criar conta grátis'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Ao criar a conta você concorda com os{' '}
              <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e a{' '}
              <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
