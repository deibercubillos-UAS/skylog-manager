'use client';

// Skylog V2.0 — tarjeta «Envío anual a la Aerocivil» del SPI: la vigencia que toca reportar, el plazo (30 de marzo) y la
// constancia de envío. Apaga el recordatorio del cron. La fecha límite sale de la misma regla del dominio que usa el cron.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@skylog/ui';

export default function AnnualSubmission({ organizationId, isManager }) {
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const year = Number(today.slice(0, 4));
  const reportYear = today.slice(5, 10) > '04-30' ? year : year - 1; // pasado abril, la próxima vigencia a reportar es la del año en curso
  const deadlineYear = reportYear + 1;
  const deadline = `${deadlineYear}-03-30`;
  const daysLeft = Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sms/indicators/submission?organizationId=${organizationId}`);
    const data = await res.json();
    if (res.ok) setSubmissions(data.submissions || []);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId, load]);

  const sent = submissions.find((s) => s.year === reportYear);

  const mark = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/indicators/submission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, year: reportYear }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const tone = sent ? 'text-emerald-700 bg-emerald-50' : daysLeft < 0 ? 'text-red-700 bg-red-50' : daysLeft <= 30 ? 'text-amber-700 bg-amber-50' : 'text-navy-500 bg-navy-50';
  return (
    <div className="rounded-2xl border border-navy-100 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-indigo-500 text-white">
            <span className="material-symbols-outlined text-xl">outbox</span>
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Envío anual a la Aerocivil — vigencia {reportYear}</p>
            <p className="text-xs text-navy-400">Plazo: antes del 30 de marzo de {deadlineYear}. Te avisamos por la campana y por correo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tone}`}>
            {sent ? `Enviado el ${new Date(sent.sent_at).toLocaleDateString('es-CO')}` : daysLeft < 0 ? `Vencido hace ${-daysLeft} día(s)` : `Faltan ${daysLeft} día(s)`}
          </span>
          {isManager && !sent && (
            <Button type="button" onClick={mark} disabled={busy} className="text-xs px-3 py-1.5">
              {busy ? 'Guardando…' : 'Marcar como enviado'}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="px-5 pb-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
