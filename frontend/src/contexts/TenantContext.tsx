import {
  createContext, useContext, useEffect, useState,
  useCallback, ReactNode,
} from 'react';
import { tenantsApi }    from '../services/api';
import { useAuth }       from './AuthContext';
import type { Tenant }   from '../types';

interface TenantContextType {
  tenant:        Tenant | null;
  isLoading:     boolean;
  recarregar:    () => Promise<void>;
  nomeTenant:    string;          // nome_exibicao ?? razao_social ?? slug
  logoUrl:       string | null;
  diasTrialRestantes: number | null;
}

const TenantContext = createContext<TenantContextType>({} as TenantContextType);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isAuth } = useAuth();
  const [tenant,    setTenant]    = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!isAuth) { setTenant(null); return; }
    setIsLoading(true);
    try {
      const { data } = await tenantsApi.meuTenant();
      setTenant(data);
    } catch {
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuth]);

  useEffect(() => { carregar(); }, [carregar]);

  const nomeTenant = tenant?.nome_exibicao || tenant?.razao_social || tenant?.slug || 'Minha Empresa';
  const logoUrl    = tenant?.logo_url ?? null;

  // Calcula dias restantes do trial
  let diasTrialRestantes: number | null = null;
  if (tenant?.status === 'trial' && tenant.trial_ate) {
    const diff = Math.ceil(
      (new Date(tenant.trial_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    diasTrialRestantes = Math.max(0, diff);
  }

  return (
    <TenantContext.Provider value={{
      tenant,
      isLoading,
      recarregar:         carregar,
      nomeTenant,
      logoUrl,
      diasTrialRestantes,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant deve ser usado dentro de <TenantProvider>');
  return ctx;
};
