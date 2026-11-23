'use client';

// Skylog V2.0 — Salida de zona (Bitácora). Diálogo donde el piloto registra los MOTIVOS por los que
// su vuelo salió de la zona de operación. Al enviar, el servidor crea el reporte SMS automático y
// avisa al Gerente SMS (POST /api/flights/[id]/zone-report). Ver 40-sms.md, regla S.
import { useState } from 'react';
import { Button } from '@skylog/ui';

export default function ZoneReportDialog({ flight, excursion, onClose, onDone }) {
  const [motivos, setMotivos] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ex = excursion || flight?.zone_excursion || null;

  async function submit() {
    if (motivos.trim().length < 5) {
      setError('Describe los motivos (mínimo 5 caracteres).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flight.id}/zone-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivos: motivos.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el reporte');
      onDone?.(flight.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[450] bg-navy/60 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Reporte de salida de zona">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-100 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500">wrong_location</span>
          <div className="min-w-0">
            <h3 className="font-black text-navy text-sm">El vuelo salió de la zona de operación</h3>
            <p className="text-xs text-navy-400 mt-0.5">Registra los motivos. Se enviará un reporte de seguridad operacional al Gerente SMS para su verificación y seguimiento del caso.</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {ex?.outside && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Hasta <b>{ex.maxExceedM} m</b> fuera del perímetro{ex.segments?.length ? ` · ${ex.segments.length} tramo(s) fuera` : ''}.
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-navy-500 uppercase tracking-wide">Motivos de la salida</span>
            <textarea
              value={motivos}
              onChange={(e) => setMotivos(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Explica por qué el dron salió de la zona (viento, evasión de obstáculo, pérdida de referencia visual, etc.)"
              className="mt-1 w-full rounded-xl border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-navy-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Ahora no</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Enviando…' : 'Enviar reporte'}</Button>
        </div>
      </div>
    </div>
  );
}
