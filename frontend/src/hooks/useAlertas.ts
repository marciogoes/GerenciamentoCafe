import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../services/api';
import { useAuth }      from '../contexts/AuthContext';

interface AlertaSummary {
  total:             number;
  boletos_vencidos:  number;
  estoque_baixo:     number;
  maquinas_sem_retorno: number;
}

/**
 * Busca a contagem de alertas ativos a cada 5 minutos.
 * Usado pelo Layout para exibir o badge no sino.
 */
export function useAlertas() {
  const { isAuth } = useAuth();
  const [alertas,    setAlertas]    = useState<AlertaSummary>({ total: 0, boletos_vencidos: 0, estoque_baixo: 0, maquinas_sem_retorno: 0 });
  const [carregando, setCarregando] = useState(false);

  const buscar = useCallback(async () => {
    if (!isAuth) return;
    setCarregando(true);
    try {
      const { data } = await dashboardApi.alertas();
      setAlertas({
        total:                data.total ?? 0,
        boletos_vencidos:     data.boletos_vencidos?.length  ?? 0,
        estoque_baixo:        data.estoque_baixo?.length     ?? 0,
        maquinas_sem_retorno: data.maquinas_sem_retorno?.length ?? 0,
      });
    } catch {
      // silencioso — não quebra a UI se o backend estiver indisponível
    } finally {
      setCarregando(false);
    }
  }, [isAuth]);

  useEffect(() => {
    buscar();
    const interval = setInterval(buscar, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, [buscar]);

  return { alertas, carregando, refetch: buscar };
}
