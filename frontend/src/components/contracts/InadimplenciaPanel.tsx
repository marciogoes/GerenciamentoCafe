import { TrendingDown, Phone, Mail } from 'lucide-react';
import type { ItemInadimplencia } from '../../types';
import { fmtBRL, fmtDate } from '../../utils/format';

interface Props {
  itens: ItemInadimplencia[];
}

const AGING_COLOR: Record<string, string> = {
  '0-30': 'bg-yellow-100 text-yellow-800',
  '31-60': 'bg-orange-100 text-orange-800',
  '60+':   'bg-red-100 text-red-800',
};

export default function InadimplenciaPanel({ itens }: Props) {
  if (itens.length === 0) {
    return (
      <div className="card p-10 text-center">
        <TrendingDown className="w-12 h-12 text-green-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Nenhuma inadimplência</p>
        <p className="text-sm text-gray-400 mt-1">Todos os boletos em dia!</p>
      </div>
    );
  }

  const totalGeral = itens.reduce((s, i) => s + i.valor_total, 0);

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="card p-4 bg-red-50 border border-red-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700">
          <TrendingDown className="w-5 h-5" />
          <span className="font-semibold">{itens.length} cliente(s) inadimplente(s)</span>
        </div>
        <span className="text-xl font-bold text-red-700">{fmtBRL(totalGeral)}</span>
      </div>

      {/* Legenda aging */}
      <div className="flex gap-3 text-xs flex-wrap">
        {(['0-30', '31-60', '60+'] as const).map(bucket => (
          <span key={bucket} className={`badge ${AGING_COLOR[bucket]}`}>
            {bucket === '0-30' ? '0–30 dias' : bucket === '31-60' ? '31–60 dias' : '60+ dias'}
          </span>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {itens.map(item => (
          <div key={item.cliente_id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{item.cliente_nome}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                  {item.cliente_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {item.cliente_email}
                    </span>
                  )}
                  {item.cliente_telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {item.cliente_telefone}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Desde {fmtDate(item.vencimento_mais_antigo)} · {item.qtd_boletos} boleto(s)
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-red-700">{fmtBRL(item.valor_total)}</p>
                <span className={`badge mt-1 ${AGING_COLOR[item.aging]}`}>
                  {item.maior_atraso_dias} dias
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
