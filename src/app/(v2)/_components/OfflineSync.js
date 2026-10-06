'use client';

// Skylog V2.0 — sincroniza los cierres de vuelo guardados sin conexión. Se monta en el layout de V2: al abrir la
// app, al volver la señal (`online`) y cada 30 s reintenta lo pendiente de ESTE usuario. El servidor es idempotente
// (un despacho ya cerrado responde 409 → se descarta sin error). Lo que el servidor rechaza (hora inválida, otro
// usuario…) NO se reintenta solo: queda a la vista para corregirlo.
import { useCallback, useEffect, useRef, useState } from 'react';
import { applySyncResult, classifySyncResult, dueItems, pruneQueue } from '@skylog/domain';
import { ENQUEUED_EVENT, QUEUE_EVENT, readQueue, writeQueue, isNetworkError } from '@/lib/v2/offlineStore';

export default function OfflineSync() {
  const [queue, setQueue] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const running = useRef(false);

  const refresh = useCallback(() => setQueue(pruneQueue(readQueue(), Date.now())), []);

  const flush = useCallback(async () => {
    if (running.current || !ownerId) return;
    let current = pruneQueue(readQueue(), Date.now());
    const items = dueItems(current, ownerId);
    if (items.length === 0) return;
    running.current = true;
    setSyncing(true);
    let sentLabel = null;
    for (const item of items) {
      let outcome;
      let message;
      try {
        const res = await fetch(`/api/despacho/${item.dispatchId}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) });
        const data = await res.json().catch(() => ({}));
        outcome = classifySyncResult({ status: res.status });
        message = data.error;
      } catch (e) {
        outcome = isNetworkError(e) ? 'retry' : 'attention';
        message = e.message;
        if (outcome === 'retry') break; // sin señal: no tiene sentido seguir con el resto
      }
      current = applySyncResult(current, item.key, outcome, message);
      if (outcome === 'sent') sentLabel = item.missionName;
    }
    writeQueue(current);
    running.current = false;
    setSyncing(false);
    if (sentLabel) setLastSynced(sentLabel);
  }, [ownerId]);

  useEffect(() => {
    refresh();
    window.addEventListener(QUEUE_EVENT, refresh);
    return () => window.removeEventListener(QUEUE_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (res.ok) setOwnerId(data.personId || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!ownerId) return;
    flush();
    window.addEventListener('online', flush);
    window.addEventListener(ENQUEUED_EVENT, flush);
    const timer = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener(ENQUEUED_EVENT, flush);
      clearInterval(timer);
    };
  }, [ownerId, flush]);

  const mine = queue.filter((q) => !q.ownerId || q.ownerId === ownerId);
  const waiting = mine.filter((q) => q.status !== 'atencion');
  const attention = mine.filter((q) => q.status === 'atencion');

  if (lastSynced && waiting.length === 0 && attention.length === 0) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 text-emerald-800 px-4 py-2.5 text-sm" role="status">
        <span>✓ Cierre de «{lastSynced}» sincronizado: el vuelo quedó registrado.</span>
        <button type="button" onClick={() => setLastSynced(null)} className="text-xs font-semibold underline min-h-[36px]">Cerrar</button>
      </div>
    );
  }
  if (mine.length === 0) return null;

  return (
    <div className="mb-4 space-y-2" role="status">
      {waiting.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 text-amber-900 px-4 py-2.5 text-sm">
          <span>
            {syncing ? 'Sincronizando… ' : ''}
            {waiting.length} cierre{waiting.length === 1 ? '' : 's'} de vuelo guardado{waiting.length === 1 ? '' : 's'} en este dispositivo, pendiente{waiting.length === 1 ? '' : 's'} de enviar ({waiting.map((w) => w.missionName).join(', ')}).
          </span>
          <button type="button" onClick={flush} disabled={syncing} className="text-xs font-semibold underline min-h-[36px] shrink-0 disabled:opacity-40">Enviar ahora</button>
        </div>
      )}
      {attention.map((a) => (
        <div key={a.key} className="rounded-xl bg-red-50 text-red-800 px-4 py-2.5 text-sm">
          El cierre de «{a.missionName}» no se pudo registrar: {a.lastError}. Revísalo en <a href="/operacion/despacho" className="underline font-semibold">Despacho</a>.
        </div>
      ))}
    </div>
  );
}
