import { ReactNode } from 'react';
import clsx from 'clsx';

interface KpiCardProps {
  titulo:     string;
  valor:      string | number;
  subtitulo?: string;
  icone:      ReactNode;
  cor?:       'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  tendencia?: { valor: number; label: string };
  carregando?: boolean;
}

const cores = {
  blue:   { bg: 'bg-blue-50',   icone: 'bg-blue-100 text-blue-600',   valor: 'text-blue-700' },
  green:  { bg: 'bg-green-50',  icone: 'bg-green-100 text-green-600', valor: 'text-green-700' },
  red:    { bg: 'bg-red-50',    icone: 'bg-red-100 text-red-600',     valor: 'text-red-700' },
  yellow: { bg: 'bg-yellow-50', icone: 'bg-yellow-100 text-yellow-600', valor: 'text-yellow-700' },
  purple: { bg: 'bg-purple-50', icone: 'bg-purple-100 text-purple-600', valor: 'text-purple-700' },
  gray:   { bg: 'bg-gray-50',   icone: 'bg-gray-100 text-gray-600',   valor: 'text-gray-700' },
};

export default function KpiCard({
  titulo, valor, subtitulo, icone, cor = 'blue', tendencia, carregando,
}: KpiCardProps) {
  const c = cores[cor];

  if (carregando) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className={clsx('card p-5 border-0 shadow-sm', c.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{titulo}</p>
          <p className={clsx('text-2xl font-extrabold mt-1 leading-none', c.valor)}>{valor}</p>
          {subtitulo && <p className="text-xs text-gray-400 mt-1.5">{subtitulo}</p>}
          {tendencia && (
            <div className={clsx(
              'inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full',
              tendencia.valor >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700',
            )}>
              {tendencia.valor >= 0 ? '↑' : '↓'} {Math.abs(tendencia.valor)}% {tendencia.label}
            </div>
          )}
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', c.icone)}>
          {icone}
        </div>
      </div>
    </div>
  );
}
