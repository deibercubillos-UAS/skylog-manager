'use client';

// Skylog V2.0 — administración del enlace público de reporte. Activar, copiar, regenerar (el anterior deja
// de funcionar) o desactivar. Lo ven el Gerente SMS y el Gerente General.
import { useCallback, useEffect, useState } from 'react';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

export default function PublicLink({ organizationId }) {
  const [token, setToken] = useState(undefined); // undefined = cargando · null = desactivado
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms/public-link?organizationId=${organizationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
    } catch (e) {
      setError(e.message);
      setToken(null);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action) {
    if (action === 'regenerate' && !confirm('El enlace actual dejará de funcionar para quienes ya lo tienen. ¿Generar uno nuevo?')) return;
    if (action === 'disable' && !confirm('Nadie podrá reportar con el enlace actual. ¿Desactivarlo?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/public-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setToken(data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/reportar/${token}` : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar: selecciona el enlace y cópialo a mano.');
    }
  }

  return (
    <SectionCard icon="qr_code_2" tile="bg-sky-500 text-white" wash="from-sky-50 to-white" title="Enlace público de reporte" description="Para que contratistas, socios y terceros reporten sin tener cuenta">
      {token === undefined ? (
        <div className="h-10 rounded-lg bg-navy-50 animate-pulse" />
      ) : token ? (
        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-[240px] text-xs font-mono border border-navy-200 rounded-lg px-3 py-2 bg-navy-50/50" />
            <Button className="text-xs px-3 py-2" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar enlace'}</Button>
          </div>
          <p className="text-[11px] text-navy-400">
            Los reportes recibidos por este enlace entran siempre como VOR (nunca como MOR) y aparecen en la bandeja. Quien lo usa no puede leer nada del sistema.
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => act('regenerate')} className="text-xs font-semibold text-navy-500 hover:text-navy">Generar uno nuevo</button>
            <button type="button" disabled={busy} onClick={() => act('disable')} className="text-xs font-semibold text-red-600 hover:underline">Desactivar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-navy-500">El enlace público está desactivado. Actívalo para recibir reportes sin que quien reporta tenga cuenta.</p>
          <Button className="text-xs px-4 py-2" disabled={busy} onClick={() => act('enable')}>Activar enlace público</Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </SectionCard>
  );
}
