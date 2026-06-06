/**
 * Contexto para el período de gracia de 30 días.
 * Un piloto dado de baja mantiene acceso de solo lectura a Dashboard y Bitácora.
 * El layout provee este contexto; las páginas lo consumen para ocultar acciones.
 */
import { createContext, useContext } from 'react';

export const GracePeriodContext = createContext({
  isGracePeriod: false,
  daysLeft: 0,
});

export function useGracePeriod() {
  return useContext(GracePeriodContext);
}
