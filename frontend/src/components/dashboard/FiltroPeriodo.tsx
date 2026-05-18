import { useState } from 'react';
import clsx from 'clsx';

type Periodo = 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado';

interface Props {
  valor:    string;
  onChange: (v: string) => void;
}

const opcoes: { id: Periodo; label: string }[] = [
  { id: 'semana',        label: 'Semana' },
  { id: 'mes',           label: 'Mês atual' },
  { id: 'trimestre',     label: 'Trimestre' },
  { id: 'ano',           label: 'Ano' },
  { id: 'personalizado', label: 'Personalizado' },
];

export default function FiltroPeriodo({ valor, onChange }: Props) {
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');

  // FIX #8 — estado local para controlar se "Personalizado" está selecionado
  // Antes: clicar em "Personalizado" não mostrava os inputs porque não chamava onChange
  const [modoPersonalizado, setModoPersonalizado] = useState(
    // Inicia em personalizado se o valor já for uma data custom (ex: "2026-01-01,2026-03-31")
    !opcoes.some(o => o.id === valor && o.id !== 'personalizado'),
  );

  const periodoAtivo = (id: Periodo): boolean => {
    if (id === 'personalizado') return modoPersonalizado;
    return !modoPersonalizado && valor === id;
  };

  const handleOpcao = (id: Periodo) => {
    if (id === 'personalizado') {
      setModoPersonalizado(true);
      // Não chama onChange ainda — aguarda o usuário preencher as datas
    } else {
      setModoPersonalizado(false);
      onChange(id);
    }
  };

  const aplicarPersonalizado = () => {
    if (dataIni && dataFim) onChange(`${dataIni},${dataFim}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {opcoes.map(op => (
        <button
          key={op.id}
          onClick={() => handleOpcao(op.id)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            periodoAtivo(op.id)
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600',
          )}
        >
          {op.label}
        </button>
      ))}

      {modoPersonalizado && (
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <input
            type="date"
            value={dataIni}
            onChange={e => setDataIni(e.target.value)}
            className="input py-1.5 text-sm w-36"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="input py-1.5 text-sm w-36"
          />
          <button
            onClick={aplicarPersonalizado}
            disabled={!dataIni || !dataFim}
            className="btn-primary py-1.5 text-sm"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
