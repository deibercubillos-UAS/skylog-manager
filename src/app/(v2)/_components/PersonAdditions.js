'use client';

// Skylog V2.0 — adiciones de la licencia (CIPU) de una persona, con vigencia opcional.
// Sin `personId` edita las propias; con `personId` un gestor edita las de otra persona (la RLS decide).
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@skylog/ui';

export default function PersonAdditions({ personId = null, readOnly = false }) {
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [pick, setPick] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const qs = personId ? `?personId=${personId}` : '';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/personal/additions${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.additions);
      setCatalog(data.catalog);
    } catch (e) {
      setError(e.message);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/personal/additions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, addition: pick, validUntil: validUntil || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPick('');
      setValidUntil('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/personal/additions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const taken = new Set(rows.map((r) => r.addition));

  return (
    <div className="mt-4 pt-4 border-t border-navy-100">
      <p className="text-sm font-semibold text-navy mb-2">Adiciones de la licencia</p>
      {rows.length === 0 ? (
        <p className="text-xs text-navy-400 mb-3">Sin adiciones registradas.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {rows.map((r) => {
            const expired = r.valid_until && r.valid_until < today;
            return (
              <span key={r.id} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${expired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {r.addition}
                {r.valid_until && <span className="font-medium opacity-80">· {expired ? 'venció' : 'hasta'} {r.valid_until}</span>}
                {!readOnly && (
                  <button type="button" disabled={busy} onClick={() => remove(r.id)} aria-label={`Quitar ${r.addition}`} className="opacity-60 hover:opacity-100">
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-end">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="text-xs border border-navy-200 rounded-lg px-2 py-2 bg-white max-w-[260px]">
            <option value="">Agregar adición…</option>
            {catalog.filter((c) => !taken.has(c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="text-[11px] text-navy-400">
            Vigencia (opcional)
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="block text-xs border border-navy-200 rounded-lg px-2 py-1.5 bg-white" />
          </label>
          <Button type="button" className="text-xs px-3 py-2" disabled={busy || !pick} onClick={add}>
            Agregar
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
