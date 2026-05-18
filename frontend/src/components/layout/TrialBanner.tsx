import { useState } from 'react';
import { X, AlertTriangle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

export default function TrialBanner() {
  const { tenant, diasTrialRestantes } = useTenant();
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;
  if (!tenant) return null;
  if (tenant.status !== 'trial') return null;
  if (diasTrialRestantes === null || diasTrialRestantes > 7) return null;

  const critico = diasTrialRestantes <= 3;

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-sm ${
      critico ? 'bg-red-600' : 'bg-amber-500'
    } text-white`}>
      <div className="flex items-center gap-2">
        {critico
          ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          : <Zap className="w-4 h-4 flex-shrink-0" />}
        {/* FIX #7 — usar JSX em vez de string com tags HTML (que eram renderizadas como texto literal) */}
        <span>
          {diasTrialRestantes === 0 ? (
            <>Seu período de trial <strong>expira hoje</strong>! Assine um plano para não perder acesso.</>
          ) : (
            <>Seu trial gratuito expira em <strong>{diasTrialRestantes} dia{diasTrialRestantes > 1 ? 's' : ''}</strong>. Assine um plano e continue usando.</>
          )}
        </span>
        <Link
          to="/planos"
          className="ml-2 underline font-bold hover:opacity-80 whitespace-nowrap"
        >
          Ver planos →
        </Link>
      </div>
      <button onClick={() => setFechado(true)} className="ml-4 hover:opacity-80 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
