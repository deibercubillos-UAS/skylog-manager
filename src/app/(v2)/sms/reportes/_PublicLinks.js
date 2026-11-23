'use client';

// Skylog V2.0 — enlaces públicos de reporte POR TIPO (40b). Un enlace para VOR (terceros, socios, contratistas)
// y otro para MOR. El enlace por el que entra define el tipo del reporte. Los ven el Gerente SMS y el GG.
import { useCallback, useEffect, useState } from 'react';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

const TYPE_META = {
  vor: { title: 'Enlace VOR (reporte voluntario)', hint: 'Para contratistas, socios y terceros. Lo que entra por aquí es un VOR.' },
  mor: { title: 'Enlace MOR', hint: 'Lo que entra por aquí es un MOR y queda pendiente del análisis del Gerente SMS antes de radicarse.' },
};

function LinkRow({ organizationId, type, token, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/reportar/${token}` : '';

  async function act(action) {
    if (action === 'regenerate' && !confirm('El enlace actual dejará de funcionar para quienes ya lo tienen. ¿Generar uno nuevo?')) return;
    if (action === 'disable' && !confirm('Nadie podrá reportar con el enlace actual. ¿Desactivarlo?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/public-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, type, action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      onChange(data.token ? { token: data.token } : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar: selecciona el enlace y cópialo a mano.');
    }
  }

  const meta = TYPE_META[type];
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <p className="text-sm font-bold text-navy">{meta.title}</p>
      <p className="text-[11px] text-navy-400 mt-0.5 mb-2">{meta.hint}</p>
      {token ? (
        <div className="space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-[240px] min-h-[44px] md:min-h-0 text-base md:text-xs font-mono border border-navy-200 rounded-lg px-3 py-2 bg-navy-50/50" />
            <Button className="text-xs px-3 py-2" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar'}</Button>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => act('regenerate')} className="text-xs font-semibold text-navy-500 hover:text-navy">Generar uno nuevo</button>
            <button type="button" disabled={busy} onClick={() => act('disable')} className="text-xs font-semibold text-red-600 hover:underline">Desactivar</button>
          </div>
        </div>
      ) : (
        <Button className="text-xs px-4 py-2" disabled={busy} onClick={() => act('enable')}>Activar enlace</Button>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function PublicLinks({ organizationId }) {
  const [links, setLinks] = useState(undefined); // undefined = cargando
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms/public-links?organizationId=${organizationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLinks(data.links);
    } catch (e) {
      setError(e.message);
      setLinks({ vor: null, mor: null });
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SectionCard icon="qr_code_2" tile="bg-sky-500 text-white" wash="from-sky-50 to-white" title="Enlaces públicos de reporte" description="Para que terceros reporten sin tener cuenta — uno por tipo (VOR y MOR)">
      {links === undefined ? (
        <div className="h-24 rounded-xl bg-navy-50 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {['vor', 'mor'].map((t) => (
            <LinkRow key={t} organizationId={organizationId} type={t} token={links[t]?.token || null} onChange={(next) => setLinks((l) => ({ ...l, [t]: next }))} />
          ))}
          <p className="text-[11px] text-navy-400">Quien usa un enlace no puede leer nada del sistema. Un suceso grave entra por cualquier enlace como RAC 114.</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </SectionCard>
  );
}
