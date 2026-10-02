'use client';

// Skylog V2.0 — F2 Comando y Control. Página H5 que DJI Pilot 2 carga en su
// WebView (portal "Open Platforms" → Cloud Service → URL http/https), ver
// 42-comando-control.md §4.2.
//
// ⚠️ ESTADO REAL (2026-10-01): esta página nunca se ha abierto dentro de
// Pilot 2 real — no hubo hardware DJI disponible para probarla. La llamada
// exacta a `window.djiBridge.platformVerifyLicense(...)` (argumentos,
// síncrona/async, nombre de callback) se escribió sobre la mejor
// información disponible en ese momento, PERO debe verificarse contra el
// repositorio oficial `dji-sdk/Cloud-API-Doc` (una sesión anterior lo clonó
// y leyó para el análisis de 42-comando-control.md, pero el código exacto
// de esta página no se contrastó línea por línea contra él) antes de
// confiar en que esta integración funciona tal cual está escrita aquí. No
// reportar esto como "funcionando" hasta esa verificación + una prueba real
// con un RC.
//
// Fuera de este WebView, `window.djiBridge` no existe — la página lo
// detecta y lo dice, en vez de fallar en silencio o fingir una conexión.
import { useEffect, useState } from 'react';

const DJI_APP_ID = process.env.NEXT_PUBLIC_DJI_APP_ID;
const DJI_APP_KEY = process.env.NEXT_PUBLIC_DJI_APP_KEY;
const DJI_APP_LICENSE = process.env.NEXT_PUBLIC_DJI_APP_LICENSE;
// URL pública del c2-gateway (TCP proxy de Railway/Fly), NO la URL HTTP del
// health check — ver c2-gateway/README.md paso 3.
const C2_MQTT_HOST = process.env.NEXT_PUBLIC_C2_MQTT_HOST;
const C2_MQTT_PORT = process.env.NEXT_PUBLIC_C2_MQTT_PORT;

export default function Pilot2BridgePage() {
  const [status, setStatus] = useState('checking'); // checking | no-bridge | verifying | verified | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.djiBridge) {
      setStatus('no-bridge');
      return;
    }

    if (!DJI_APP_ID || !DJI_APP_KEY || !DJI_APP_LICENSE) {
      setStatus('error');
      setError('Faltan NEXT_PUBLIC_DJI_APP_ID/KEY/LICENSE en el entorno de despliegue.');
      return;
    }
    if (!C2_MQTT_HOST || !C2_MQTT_PORT) {
      setStatus('error');
      setError('Falta NEXT_PUBLIC_C2_MQTT_HOST/PORT — la URL pública de c2-gateway (ver c2-gateway/README.md).');
      return;
    }

    setStatus('verifying');
    try {
      // Firma por verificar contra Cloud-API-Doc (ver nota de cabecera) —
      // el patrón documentado públicamente por DJI es
      // `platformVerifyLicense(appId, appKey, license)` devolviendo un
      // string JSON `{ code, message, data }`.
      const result = window.djiBridge.platformVerifyLicense(DJI_APP_ID, DJI_APP_KEY, DJI_APP_LICENSE);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (parsed?.code === 0) {
        setStatus('verified');
        // Carga del módulo Cloud — conecta el SDK al broker MQTT de
        // c2-gateway. Firma también por verificar contra el doc oficial.
        window.djiBridge.platformLoadComponent?.(
          'cloud',
          JSON.stringify({ host: C2_MQTT_HOST, port: Number(C2_MQTT_PORT) })
        );
      } else {
        setStatus('error');
        setError(parsed?.message || 'platformVerifyLicense devolvió un código distinto de 0.');
      }
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1420] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-300">BitaFly · Comando y Control</p>

        {status === 'checking' && <p className="text-sm text-white/60">Verificando entorno…</p>}

        {status === 'no-bridge' && (
          <>
            <span className="material-symbols-outlined text-4xl text-amber-400">warning</span>
            <p className="text-sm font-bold">Esta página debe abrirse dentro de DJI Pilot 2</p>
            <p className="text-xs text-white/50">
              No se detectó <code className="bg-white/10 px-1 rounded">window.djiBridge</code> — ábrela desde Pilot 2 → Open
              Platforms → Cloud Service, no en un navegador normal.
            </p>
          </>
        )}

        {status === 'verifying' && <p className="text-sm text-white/60">Verificando licencia DJI Cloud API…</p>}

        {status === 'verified' && (
          <>
            <span className="material-symbols-outlined text-4xl text-emerald-400">check_circle</span>
            <p className="text-sm font-bold">Licencia verificada — enlazando con BitaFly</p>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="material-symbols-outlined text-4xl text-red-400">error</span>
            <p className="text-sm font-bold">No se pudo conectar</p>
            <p className="text-xs text-white/50">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
