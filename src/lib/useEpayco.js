// src/lib/useEpayco.js

// 1. DICCIONARIO DE IDS (Exportado explícitamente para evitar ReferenceError)
export const BITAFLY_PLANS = {
  escuadrilla_mensual: "9be072c0f069fb47008f626", 
  escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
  flota_mensual:       "9be0e7df6630f6a394f7096", 
  flota_anual:         "9be0e81b6727c738608e137" 
};

export const initEpayco = () => {
  if (typeof window !== 'undefined' && window.ePayco) {
    window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
    return true;
  }
  return false;
};