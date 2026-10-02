'use client';

// Skylog V2.0 — SMS / Capacitación: panel de asistencia de una sesión del
// cronograma. Roster = cualquier persona con membresía activa (no solo
// pilotos, a diferencia de Capacitación de pilotos) — mismo criterio que
// ya valida la API (`api/sms/training/attendance`).
import { useCallback, useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

export default function AttendancePanel({ open, onClose, session, roster }) {
  const [attendance, setAttendance] = useState([]);
  const [occurrenceDate, setOccurrenceDate] = useState(session?.nextOccurrence || new Date().toISOString().slice(0, 10));
  const [personId, setPersonId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const personById = new Map(roster.map((m) => [m.person.id, m.person]));

  const load = useCallback(async () => {
    if (!session?.id) return;
    const res = await fetch(`/api/sms/training/attendance?sessionId=${session.id}`);
    const data = await res.json();
    if (res.ok) setAttendance(data.attendance || []);
  }, [session?.id]);

  useEffect(() => {
    if (open) {
      load();
      setOccurrenceDate(session?.nextOccurrence || new Date().toISOString().slice(0, 10));
      setPersonId('');
      setError(null);
    }
  }, [open, load, session?.nextOccurrence]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!personId) {
      setError('Elige un asistente');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/training/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, personId, occurrenceDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la asistencia');
      setPersonId('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const attendedIds = new Set(attendance.filter((a) => a.occurrence_date === occurrenceDate).map((a) => a.person_id));
  const availableRoster = roster.filter((m) => !attendedIds.has(m.person.id));
  const byDate = attendance.reduce((acc, a) => {
    (acc[a.occurrence_date] = acc[a.occurrence_date] || []).push(a);
    return acc;
  }, {});

  return (
    <Panel open={open} onClose={onClose} title={session ? `Asistencia — ${session.topic}` : 'Asistencia'}>
      {session && (
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3 bg-navy-50/60 rounded-2xl p-4">
            <p className="text-xs font-semibold text-navy-500">Registrar asistencia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Fecha de la sesión</label>
                <input
                  type="date"
                  value={occurrenceDate}
                  onChange={(e) => setOccurrenceDate(e.target.value)}
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Asistente</label>
                <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2">
                  <option value="">Elige a quién marcar</option>
                  {availableRoster.map((m) => (
                    <option key={m.person.id} value={m.person.id}>
                      {m.person.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full justify-center">
              {busy ? 'Guardando…' : 'Marcar asistencia'}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-navy-500">Asistencia registrada ({attendance.length})</p>
            {Object.keys(byDate).length === 0 ? (
              <p className="text-xs text-navy-300">Sin asistencia registrada todavía.</p>
            ) : (
              Object.entries(byDate)
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([date, rows]) => (
                  <div key={date} className="border border-navy-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-navy mb-1.5">{new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map((a) => (
                        <span key={a.id} className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          {personById.get(a.person_id)?.full_name || 'Sin nombre'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
