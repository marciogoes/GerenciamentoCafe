import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, getErrorMessage } from '../services/api';
import type { Usuario, LoginResponse } from '../types';

interface AuthContextType {
  user:      Usuario | null;
  isAuth:    boolean;
  isLoading: boolean;
  login:     (email: string, senha: string, tenantSlug: string) => Promise<LoginResponse>;
  verify2fa: (codigo: string, tokenTemp: string) => Promise<void>;
  logout:    () => void;
  hasRole:   (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura sessão ao carregar a página
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('access_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.clear(); }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string, senha: string, tenantSlug: string,
  ): Promise<LoginResponse> => {
    const { data } = await authApi.login(email, senha, tenantSlug);
    if (!data.requer2FA && data.access_token) {
      localStorage.setItem('access_token',  data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.usuario));
      setUser(data.usuario);
    }
    return data;
  };

  const verify2fa = async (codigo: string, tokenTemp: string): Promise<void> => {
    const { data } = await authApi.verify2fa(codigo, tokenTemp);
    localStorage.setItem('access_token',  data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    setUser(data.usuario);
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.clear();
    setUser(null);
  };

  const hasRole = (...roles: string[]) => !!user && roles.includes(user.perfil);

  return (
    <AuthContext.Provider value={{
      user, isAuth: !!user, isLoading,
      login, verify2fa, logout, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
};
