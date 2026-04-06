// src/lib/useEpayco.js

export const BITAFLY_PLANS = {
  escuadrilla_mensual: "plan_escuadrilla_mensual", 
  escuadrilla_anual:   "plan_escuadrilla_mensual", 
  flota_mensual:       "plan_escuadrilla_mensual", 
  flota_anual:         "plan_escuadrilla_mensual" 
};

// Esta función ahora solo inicializa la llave pública si es necesario
export const initEpayco = () => {
  if (typeof window !== 'undefined' && window.ePayco) {
    window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
    return true;
  }
  return false;
};