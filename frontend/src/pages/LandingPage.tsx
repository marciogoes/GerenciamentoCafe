import { Link } from 'react-router-dom';
import { Coffee, CheckCircle2, BarChart3, Bot, Package, FileText,
         Users, Shield, ArrowRight, Star } from 'lucide-react';

const recursos = [
  { icone: BarChart3, titulo: 'Dashboard em Tempo Real', desc: 'KPIs, gráficos de receita, inadimplência e alertas ativos numa única tela.' },
  { icone: Bot,       titulo: 'Gestão de Frota',         desc: 'Cadastro, movimentações, saída e retorno de cada máquina com histórico completo.' },
  { icone: FileText,  titulo: 'Contratos e Cobranças',   desc: 'Geração automática de lançamentos, controle de boletos e alerta de vencimento.' },
  { icone: Package,   titulo: 'Controle de Estoque',     desc: 'Entradas, saídas, saldo em tempo real e alerta de reposição por produto.' },
  { icone: Users,     titulo: 'Equipe com Perfis',       desc: 'Admin, Financeiro, Operacional e Consulta — cada um vê o que precisa.' },
  { icone: Shield,    titulo: 'Seguro e Confiável',      desc: 'Dados isolados por empresa, 2FA obrigatório para admins e logs de auditoria.' },
];

const planos = [
  {
    id:     'starter',
    nome:   'Starter',
    preco:  'R$ 97',
    periodo: '/mês',
    cor:    'border-gray-200',
    itens:  ['1 empresa', 'Até 5 usuários', 'Até 50 máquinas', 'Até 30 clientes', 'Exportação PDF/Excel', 'Suporte por e-mail'],
  },
  {
    id:     'pro',
    nome:   'Pro',
    preco:  'R$ 197',
    periodo: '/mês',
    destaque: true,
    cor:    'border-blue-600',
    itens:  ['1 empresa', 'Até 20 usuários', 'Até 200 máquinas', 'Clientes ilimitados', 'API REST', 'SSO Google/Microsoft', 'Suporte prioritário'],
  },
  {
    id:     'enterprise',
    nome:   'Enterprise',
    preco:  'Sob consulta',
    periodo: '',
    cor:    'border-gray-200',
    itens:  ['Multi-empresa', 'Usuários ilimitados', 'Máquinas ilimitadas', 'White-label', 'Domínio próprio', 'SLA dedicado', 'Backup contínuo'],
  },
];

const depoimentos = [
  {
    nome:    'Márcio Gomes',
    empresa: 'BelCafé — Belém/PA',
    texto:   'Antes usávamos planilhas espalhadas. O Vending Manager centralizou tudo: frota, contratos e estoque num só lugar.',
    nota:    5,
  },
  {
    nome:    'Fernanda Lima',
    empresa: 'CaféPoint — Manaus/AM',
    texto:   'O alerta automático de boleto vencido eliminou os esquecimentos. Nossa inadimplência caiu 40% em 3 meses.',
    nota:    5,
  },
  {
    nome:    'Ricardo Torres',
    empresa: 'VendMax — São Paulo/SP',
    texto:   'O trial de 14 dias foi suficiente para ver o valor. Migramos para o Pro sem pensar duas vezes.',
    nota:    5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Vending Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#planos" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Planos</a>
            <Link to="/login"   className="btn-secondary text-sm py-2">Entrar</Link>
            <Link to="/cadastro" className="btn-primary text-sm py-2">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-700/50 text-blue-100 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            ✨ SaaS Multi-Tenant · Trial grátis de 14 dias
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Gerencie sua frota de máquinas<br className="hidden sm:block" />
            <span className="text-blue-300"> com inteligência</span>
          </h1>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
            Controle de máquinas, contratos, estoque e indicadores financeiros — tudo numa plataforma segura e escalável para empresas de locação e comodato.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/cadastro" className="btn-primary text-base px-8 py-3">
              🚀 Criar conta grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-3 rounded-lg border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition">
              Já tenho conta
            </Link>
          </div>
          <p className="text-blue-300 text-xs mt-4">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* ── RECURSOS ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Tudo que sua operação precisa</h2>
            <p className="text-gray-500 mt-2">Desenvolvido a partir dos processos reais de empresas de locação de máquinas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recursos.map(r => (
              <div key={r.titulo} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <r.icone className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{r.titulo}</h3>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ─────────────────────────────────────────────── */}
      <section id="planos" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Planos e Preços</h2>
            <p className="text-gray-500 mt-2">Funcionalidades iguais em todos os planos. O que varia são os limites de uso.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {planos.map(p => (
              <div
                key={p.id}
                className={`card border-2 ${p.cor} p-6 relative ${p.destaque ? 'shadow-xl scale-105' : ''}`}
              >
                {p.destaque && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    ⭐ Mais popular
                  </div>
                )}
                <p className="font-bold text-lg text-gray-900">{p.nome}</p>
                <div className="flex items-end gap-1 mt-2 mb-4">
                  <span className={`text-3xl font-extrabold ${p.destaque ? 'text-blue-600' : 'text-gray-900'}`}>
                    {p.preco}
                  </span>
                  <span className="text-gray-400 text-sm mb-1">{p.periodo}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.itens.map(i => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cadastro"
                  className={p.destaque ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            Todos os planos incluem 14 dias de trial gratuito no plano Pro · Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* ── DEPOIMENTOS ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">O que dizem nossos clientes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {depoimentos.map(d => (
              <div key={d.nome} className="card p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: d.nota }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic mb-4">"{d.texto}"</p>
                <p className="font-semibold text-sm text-gray-900">{d.nome}</p>
                <p className="text-xs text-gray-400">{d.empresa}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-800 to-blue-600 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Pronto para digitalizar sua operação?
        </h2>
        <p className="text-blue-200 mb-8">Crie sua conta em menos de 5 minutos. Sem burocracia.</p>
        <Link to="/cadastro" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:bg-blue-50 transition">
          🚀 Criar conta grátis
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-blue-300 text-xs mt-4">14 dias grátis no plano Pro · Sem cartão de crédito</p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Coffee className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Vending Manager SaaS</span>
        </div>
        <p>Desenvolvido para BelCafé Locação e Serviços Ltda · Belém/PA · © 2026</p>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <a href="#" className="hover:text-white transition">Termos de Uso</a>
          <a href="#" className="hover:text-white transition">Política de Privacidade</a>
          <a href="#" className="hover:text-white transition">Suporte</a>
        </div>
      </footer>

    </div>
  );
}
