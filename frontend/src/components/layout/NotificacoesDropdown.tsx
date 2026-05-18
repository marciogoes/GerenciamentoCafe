import { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Package, Bot, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
import type { DashboardAlertas } from '../../types';
import clsx from 'clsx';

const moeda = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function NotificacoesDropdown() {
  const navigate         = useNavigate();
  const [aberto, setAberto]   = useState(false);
  const [alertas, setAlertas] = useState<DashboardAlertas | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Carrega alertas ao abrir ou a cada 3 minutos
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const { data } = await dashboardApi.alertas();
        setAlertas(data);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    carregar();
    const id = setInterval(carregar, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = alertas?.total ?? 0;

  const grupos = [
    {
      id:     'boletos',
      icone:  FileText,
      cor:    'text-red-500',
      bg:     'bg-red-50',
      titulo: 'Boletos vencidos',
      itens:  (alertas?.boletos_vencidos ?? []).slice(0, 4),
      rota:   '/contracts',
      render: (item: any) => (
        <div key={item.id} className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{item.cliente}</p>
            <p className="text-xs text-gray-400">{item.dias_atraso}d em atraso</p>
          </div>
          <span className="text-xs font-bold text-red-600 flex-shrink-0">{moeda(item.valor)}</span>
        </div>
      ),
    },
    {
      id:     'estoque',
      icone:  Package,
      cor:    'text-yellow-600',
      bg:     'bg-yellow-50',
      titulo: 'Estoque baixo',
      itens:  (alertas?.estoque_baixo ?? []).slice(0, 3),
      rota:   '/stock',
      render: (item: any) => (
        <div key={item.id} className="flex justify-between items-start gap-2">
          <p className="text-xs font-medium text-gray-800 truncate flex-1">{item.descricao}</p>
          <span className="text-xs font-bold text-yellow-700 flex-shrink-0">
            {Number(item.saldo_atual).toFixed(1)} {item.unidade}
          </span>
        </div>
      ),
    },
    {
      id:     'maquinas',
      icone:  Bot,
      cor:    'text-orange-500',
      bg:     'bg-orange-50',
      titulo: 'Máquinas sem retorno',
      itens:  (alertas?.maquinas_sem_retorno ?? []).slice(0, 3),
      rota:   '/machines',
      render: (item: any) => (
        <div key={item.id} className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800">Patrimônio {item.patrimonio}</p>
            <p className="text-xs text-gray-400 truncate">{item.destino}</p>
          </div>
          <span className="text-xs font-bold text-orange-600 flex-shrink-0">{item.dias_fora}d</span>
        </div>
      ),
    },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Sino */}
      <button
        onClick={() => setAberto(v => !v)}
        className={clsx(
          'relative p-1.5 rounded-lg transition-colors',
          aberto ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
        )}
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-sm text-gray-900">Notificações</span>
              {total > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {total}
                </span>
              )}
            </div>
            <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="max-h-96 overflow-y-auto">
            {loading && !alertas ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
              </div>
            ) : total === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-medium text-gray-700">Tudo em dia!</p>
                <p className="text-xs text-gray-400 mt-1">Nenhum alerta ativo.</p>
              </div>
            ) : (
              grupos.map(g => {
                if (g.itens.length === 0) return null;
                const Icone = g.icone;
                return (
                  <div key={g.id} className="border-b border-gray-50 last:border-0">
                    {/* Sub-cabeçalho */}
                    <div className={clsx('flex items-center gap-2 px-4 py-2', g.bg)}>
                      <Icone className={clsx('w-3.5 h-3.5', g.cor)} />
                      <span className={clsx('text-xs font-semibold', g.cor)}>
                        {g.titulo} ({g.itens.length})
                      </span>
                    </div>
                    {/* Itens */}
                    <div className="px-4 py-2 space-y-2">
                      {g.itens.map((item: any) => g.render(item))}
                    </div>
                    {/* Ver todos */}
                    <button
                      onClick={() => { navigate(g.rota); setAberto(false); }}
                      className={clsx(
                        'w-full flex items-center justify-end gap-1 px-4 py-2 text-xs font-medium transition-colors',
                        g.cor, 'hover:opacity-80',
                      )}
                    >
                      Ver todos <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          {total > 0 && (
            <div className="border-t border-gray-100 p-3">
              <button
                onClick={() => { navigate('/'); setAberto(false); }}
                className="w-full btn-primary py-2 text-xs"
              >
                Ver no Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
