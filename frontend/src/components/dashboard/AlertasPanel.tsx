import { useState } from 'react';
import { AlertTriangle, FileText, Package, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface Boleto   { id: string; cliente: string; valor: number; data_vencimento: string; dias_atraso: number; }
interface Estoque  { id: string; descricao: string; categoria: string; saldo_atual: number; estoque_minimo: number; unidade: string; }
interface Maquina  { id: string; patrimonio: string; destino: string; dias_fora: number; }

interface Props {
  boletosVencidos:     Boleto[];
  estoqueBaixo:        Estoque[];
  maquinasSemRetorno:  Maquina[];
  carregando?:         boolean;
}

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AlertasPanel({
  boletosVencidos, estoqueBaixo, maquinasSemRetorno, carregando,
}: Props) {

  const [aberto, setAberto] = useState<'boletos' | 'estoque' | 'maquinas' | null>('boletos');

  const total = boletosVencidos.length + estoqueBaixo.length + maquinasSemRetorno.length;

  if (carregando) {
    return (
      <div className="card p-5 animate-pulse space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">✅</span>
        </div>
        <p className="font-semibold text-gray-700">Nenhum alerta ativo</p>
        <p className="text-sm text-gray-400 mt-1">Tudo em dia por aqui!</p>
      </div>
    );
  }

  const Secao = ({
    id, titulo, icone, cor, itens, render,
  }: {
    id: 'boletos' | 'estoque' | 'maquinas';
    titulo: string;
    icone: React.ReactNode;
    cor: string;
    itens: any[];
    render: (item: any) => React.ReactNode;
  }) => (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(aberto === id ? null : id)}
        className={clsx(
          'w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors',
          itens.length > 0 ? cor : 'bg-gray-50 text-gray-400',
        )}
      >
        <div className="flex items-center gap-2">
          {icone}
          {titulo}
          <span className={clsx(
            'ml-1 text-xs font-bold px-2 py-0.5 rounded-full',
            itens.length > 0 ? 'bg-white/70' : 'bg-gray-200 text-gray-400',
          )}>
            {itens.length}
          </span>
        </div>
        {aberto === id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {aberto === id && itens.length > 0 && (
        <div className="divide-y divide-gray-50">
          {itens.map((item, i) => (
            <div key={i} className="px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
              {render(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-gray-900">Alertas Ativos</h3>
        </div>
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {total}
        </span>
      </div>

      <div className="space-y-2">
        {/* Boletos vencidos */}
        <Secao
          id="boletos"
          titulo="Boletos Vencidos"
          icone={<FileText className="w-4 h-4" />}
          cor="bg-red-50 text-red-700"
          itens={boletosVencidos}
          render={(b: Boleto) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{b.cliente}</p>
                <p className="text-xs text-gray-400">
                  Venceu em {new Date(b.data_vencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-red-600">{moeda(Number(b.valor))}</p>
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                  {b.dias_atraso}d atraso
                </span>
              </div>
            </div>
          )}
        />

        {/* Estoque baixo */}
        <Secao
          id="estoque"
          titulo="Estoque Baixo"
          icone={<Package className="w-4 h-4" />}
          cor="bg-yellow-50 text-yellow-700"
          itens={estoqueBaixo}
          render={(e: Estoque) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{e.descricao}</p>
                <p className="text-xs text-gray-400">Mínimo: {e.estoque_minimo} {e.unidade}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-yellow-700">
                  {Number(e.saldo_atual).toFixed(1)} {e.unidade}
                </p>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                  {Number(e.saldo_atual) <= 0 ? 'zerado' : 'baixo'}
                </span>
              </div>
            </div>
          )}
        />

        {/* Máquinas sem retorno */}
        <Secao
          id="maquinas"
          titulo="Máquinas Sem Retorno"
          icone={<Bot className="w-4 h-4" />}
          cor="bg-orange-50 text-orange-700"
          itens={maquinasSemRetorno}
          render={(m: Maquina) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">Patrimônio {m.patrimonio}</p>
                <p className="text-xs text-gray-400 truncate">{m.destino}</p>
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex-shrink-0">
                {m.dias_fora}d fora
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
