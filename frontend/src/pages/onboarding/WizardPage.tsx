import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, SkipForward, Coffee,
         BookOpen, Bot, FileText, Package, Users } from 'lucide-react';
import { api } from '../../services/api';
import clsx    from 'clsx';

interface Passo {
  num:     number;
  icone:   React.ElementType;
  titulo:  string;
  descricao: string;
  dica:    string;
  rota:    string;
}

const passos: Passo[] = [
  {
    num:      1,
    icone:    BookOpen,
    titulo:   'Cadastrar modelos de máquinas',
    descricao: 'Crie o catálogo com os modelos disponíveis na sua frota (ex.: Café Express 220, Vending Snack 4000).',
    dica:     'Cada modelo terá suas bebidas, especificações e foto.',
    rota:     '/catalog',
  },
  {
    num:      2,
    icone:    Bot,
    titulo:   'Registrar as máquinas da frota',
    descricao: 'Cadastre cada máquina individualmente com número de patrimônio, série e dados patrimoniais.',
    dica:     'As máquinas precisam estar cadastradas para registrar saídas e locações.',
    rota:     '/machines/new',
  },
  {
    num:      3,
    icone:    FileText,
    titulo:   'Cadastrar clientes e contratos',
    descricao: 'Adicione seus clientes corporativos e os contratos de locação ou comodato ativos.',
    dica:     'Os lançamentos mensais serão gerados automaticamente a partir dos contratos.',
    rota:     '/contracts/new',
  },
  {
    num:      4,
    icone:    Package,
    titulo:   'Configurar estoque inicial',
    descricao: 'Registre os insumos disponíveis (café, cappuccino, chocolate, descartáveis) com saldos iniciais.',
    dica:     'O sistema alertará automaticamente quando o estoque atingir o mínimo configurado.',
    rota:     '/stock',
  },
  {
    num:      5,
    icone:    Users,
    titulo:   'Convidar usuários da equipe',
    descricao: 'Convide outros colaboradores e defina os perfis: Financeiro, Operacional ou Consulta.',
    dica:     'Cada perfil tem acesso restrito ao que precisa para trabalhar.',
    rota:     '/users',
  },
];

export default function WizardPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const tenantId: string = (location.state as any)?.tenantId || '';

  const [concluidos, setConcluidos] = useState<Record<number, boolean>>({});
  const [salvando,   setSalvando]   = useState<number | null>(null);

  const marcarConcluido = async (num: number, valor: boolean) => {
    setSalvando(num);
    try {
      await api.patch('/tenants/wizard', { passo: num, concluido: valor });
      setConcluidos(prev => ({ ...prev, [num]: valor }));
    } catch { /* silencioso */ }
    finally { setSalvando(null); }
  };

  const totalConcluidos = Object.values(concluidos).filter(Boolean).length;
  const todosFeitos     = totalConcluidos === passos.length;

  const irParaSistema = () => navigate('/', { replace: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <Coffee className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">Vending Manager</span>
          </div>
          <p className="text-blue-200 text-sm mt-1">Configuração inicial — Passo 2 de 2</p>
        </div>

        {/* Barra de progresso */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-white" />
          <div className="flex-1 h-1.5 rounded-full bg-white" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Cabeçalho */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  🎉 Conta criada com sucesso!
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Siga os passos abaixo para configurar o sistema. Cada passo pode ser pulado e retomado depois.
                </p>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="w-14 h-14 rounded-full border-4 border-blue-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">
                    {totalConcluidos}/{passos.length}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">concluídos</p>
              </div>
            </div>

            {/* Barra de progresso dos passos */}
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(totalConcluidos / passos.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Passos */}
          <div className="divide-y divide-gray-100">
            {passos.map(p => {
              const Icone      = p.icone;
              const feito      = concluidos[p.num] === true;
              const carregando = salvando === p.num;

              return (
                <div
                  key={p.num}
                  className={clsx(
                    'p-5 transition-colors',
                    feito ? 'bg-green-50' : 'hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Ícone de status */}
                    <div className="flex-shrink-0 mt-0.5">
                      {feito
                        ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                        : <Circle className="w-7 h-7 text-gray-300" />
                      }
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icone className={clsx('w-4 h-4', feito ? 'text-green-500' : 'text-blue-600')} />
                        <p className={clsx('font-semibold text-sm', feito ? 'text-green-700 line-through' : 'text-gray-900')}>
                          Passo {p.num}: {p.titulo}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">{p.descricao}</p>
                      {!feito && (
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-600">💡 {p.dica}</p>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                      {!feito && (
                        <button
                          onClick={() => navigate(p.rota)}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Fazer agora
                        </button>
                      )}
                      <button
                        onClick={() => marcarConcluido(p.num, !feito)}
                        disabled={carregando}
                        className={clsx(
                          'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                          feito
                            ? 'border-green-300 bg-green-100 text-green-700 hover:bg-green-200'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50',
                        )}
                      >
                        {carregando
                          ? '...'
                          : feito ? '↩ Desfazer' : '✓ Marcar feito'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">
            {todosFeitos ? (
              <button onClick={irParaSistema} className="btn-primary flex-1">
                🚀 Ir para o Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={irParaSistema}
                  className="btn-secondary flex-1"
                >
                  <SkipForward className="w-4 h-4" />
                  Pular e ir para o sistema
                </button>
                {totalConcluidos > 0 && (
                  <button onClick={irParaSistema} className="btn-primary flex-1">
                    Continuar depois →
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Nota trial */}
        <div className="mt-4 bg-blue-800/50 backdrop-blur rounded-xl p-4 text-center">
          <p className="text-blue-100 text-sm">
            ⏱️ Você está no <strong>Trial Gratuito de 14 dias</strong> — plano Pro completo.
            Sem necessidade de cartão de crédito.
          </p>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4">
          Vending Manager SaaS © 2026 · BelCafé Locação e Serviços
        </p>
      </div>
    </div>
  );
}
