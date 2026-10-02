'use client';

// Skylog V2.0 — SMS / Capacitación: cronograma recurrente + asistencia —
// Fase 4 oficial de MAUT-5.0-22-017 (Promoción/Garantía). La API ya existía
// (`api/sms/training/sessions|attendance`); esta es la pantalla real que le
// faltaba (40-sms.md §5.8/§5.9, sub-frente SMS-B). Distinta a propósito de
// la Capacitación de pilotos (con examen calificado, bloquea despacho) —
// aquí el roster es cualquier persona con membresía activa, solo cronograma
// + asistencia registrada, sin examen.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import AttendancePanel from './_AttendancePanel';

const RECURRENCE_LABEL = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', personalizado: 'Personalizada' };

export default function SmsCapacitacionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ topic: '', recurrence: 'mensual', recurrenceDays: 30, startDate: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAll = useCallback(async (orgId) => {
    if (!orgId) return;
    const [sessionsRes, rosterRes] = await Promise.all([
      fetch(`/api/sms/training/sessions?organizationId=${orgId}`),
      fetch(`/api/flota/roster?organizationId=${orgId}`),
    ]);
    const [sessionsData, rosterData] = await Promise.all([sessionsRes.json(), rosterRes.json()]);
    if (sessionsRes.ok) {
      setSessions(sessionsData.sessions || []);
      const counts = {};
      await Promise.all(
        (sessionsData.sessions || []).map(async (s) => {
          const r = await fetch(`/api/sms/training/attendance?sessionId=${s.id}`);
          const d = await r.json();
          counts[s.id] = r.ok ? (d.attendance || []).length : 0;
        })
      );
      setAttendanceCount(counts);
    }
    if (rosterRes.ok) setRoster(rosterData.roster || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId) loadAll(organizationId);
  }, [organizationId, loadAll]);

  async function handleCreateSession(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch('/api/sms/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando la sesión');
      setForm({ topic: '', recurrence: 'mensual', recurrenceDays: 30, startDate: new Date().toISOString().slice(0, 10) });
      setShowNewForm(false);
      await loadAll(organizationId);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Capacitación SMS" description="Cronograma recurrente y asistencia del personal." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const totalAttendance = Object.values(attendanceCount).reduce((n, c) => n + c, 0);

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Capacitación SMS"
        description="Cronograma recurrente y asistencia real del personal — Fase 4 de MAUT-5.0-22-017 (Promoción)."
        cta={
          isManager && (
            <Button onClick={() => setShowNewForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showNewForm ? 'close' : 'add'}</span>
              {showNewForm ? 'Cerrar' : 'Nueva sesión'}
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="event_repeat" color="primary" label="Sesiones en cronograma" value={sessions.length} />
        <StatCard icon="fact_check" color="emerald" label="Asistencias registradas" value={totalAttendance} />
        <StatCard icon="groups" color="blue" label="Personal en la organización" value={roster.length} />
      </div>

      {showNewForm && (
        <form onSubmit={handleCreateSession} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-navy">Nueva sesión del cronograma</p>
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Tema</label>
            <input
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="Ej. Cultura Justa y reporte voluntario"
              required
              className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-navy-400 block mb-1">Recurrencia</label>
              <select value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2">
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="personalizado">Personalizada</option>
              </select>
            </div>
            {form.recurrence === 'personalizado' && (
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Cada N días</label>
                <input
                  type="number"
                  min={1}
                  value={form.recurrenceDays}
                  onChange={(e) => setForm((f) => ({ ...f, recurrenceDays: Number(e.target.value) }))}
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-navy-400 block mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear sesión'}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
              <span className="material-symbols-outlined text-2xl">event_repeat</span>
            </span>
            <p className="text-sm font-semibold text-navy">Sin cronograma de capacitación SMS todavía</p>
            {isManager && <p className="text-xs text-navy-400">Crea la primera sesión recurrente — p. ej. "Cultura Justa", mensual.</p>}
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-navy-100 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 shadow-sm bg-primary text-white">
                  <span className="material-symbols-outlined text-xl">event_repeat</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{s.topic}</p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {RECURRENCE_LABEL[s.recurrence]} · próxima ocurrencia {s.nextOccurrence ? new Date(`${s.nextOccurrence}T00:00:00`).toLocaleDateString('es-CO') : '—'} ·{' '}
                    {attendanceCount[s.id] || 0} asistencia(s) registrada(s)
                  </p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedSession(s)}>
                <span className="material-symbols-outlined text-base align-middle mr-1">fact_check</span>
                Asistencia
              </Button>
            </div>
          ))
        )}
      </div>

      <AttendancePanel open={!!selectedSession} onClose={() => setSelectedSession(null)} session={selectedSession} roster={roster} />
    </div>
  );
}
