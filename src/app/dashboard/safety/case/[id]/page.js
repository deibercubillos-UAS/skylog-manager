'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtDateMed } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { computeCaseCompliance } from '@/lib/vorMorCompliance';

const SMS_STATUS_LABEL = { abierto: 'Abierto', en_analisis: 'En análisis', cerrado: 'Cerrado' };
const VORMOR_STATUS_LABEL = { recibido: 'Recibido', en_investigacion: 'En investigación', cerrado: 'Cerrado', archivado: 'Archivado' };
const SMS_SEVERITY_LABEL = { incidente: 'Incidente', incidente_grave: 'Incidente grave', accidente: 'Accidente' };
const SMS_SEVERITY_COLOR = { incidente: '#2563eb', incidente_grave: '#d97706', accidente: '#dc2626' };

export default function CaseTrackingPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const source = searchParams.get('source') === 'vormor' ? 'vormor' : 'sms';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [events, setEvents] = useState([]);
  const [closing, setClosing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [newAction, setNewAction] = useState({ label: '', owner: '', due_date: '' });
  const [addingAction, setAddingAction] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/safety/case?source=${source}&id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el caso.');
      setReport(data.report);
      setActions(data.actions || []);
      setEvents(data.events || []);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [source, id]);

  useEffect(() => { load(); }, [load]);

  const toggleAction = async (actionId, done) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, done } : a));
    try {
      const res = await fetch('/api/safety/case/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, done }),
      });
      if (!res.ok) throw new Error('Error al actualizar la acción.');
    } catch (err) {
      toast.error(err.message);
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, done: !done } : a));
    }
  };

  const addAction = async (e) => {
    e.preventDefault();
    if (!newAction.label.trim()) return;
    setAddingAction(true);
    try {
      const res = await fetch('/api/safety/case/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, id, ...newAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar la acción.');
      setActions(prev => [...prev, data]);
      setNewAction({ label: '', owner: '', due_date: '' });
      load(); // refresca línea de tiempo
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setAddingAction(false);
    }
  };

  const closeCase = async () => {
    setClosing(true);
    try {
      const res = await fetch('/api/safety/case', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, id, status: 'cerrado' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cerrar el caso.');
      toast.success('Caso marcado como cerrado.');
      load();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setClosing(false);
    }
  };

  const notifyAerocivil = async () => {
    setNotifying(true);
    try {
      const res = await fetch('/api/safety/case/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar la notificación.');
      toast.success('Notificación a AeroCivil registrada.');
      load();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setNotifying(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase text-xs tracking-widest">Cargando caso...</div>;
  if (!report) return (
    <div className="max-w-xl mx-auto mt-20 text-center space-y-3">
      <p className="text-sm font-black text-slate-600 uppercase">Caso no encontrado</p>
      <Link href="/dashboard/safety" className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase">← Volver a Seguridad SMS</Link>
    </div>
  );

  // El plazo de radicación en IRIS aplica a MOR (regulatorio, 5 días hábiles)
  // y a VOR (mismo mecanismo, plazo interno sugerido — ver Fase 6 de
  // docs/plan-mejora-sms-bitafly.md). Ambos usan aerocivil_notified_at.
  const isVorMor = source === 'vormor' && ['MOR', 'VOR'].includes(report.type);
  const statusMap = source === 'sms' ? SMS_STATUS_LABEL : VORMOR_STATUS_LABEL;
  const isClosed = ['cerrado', 'archivado'].includes(report.status);
  const title = source === 'sms' ? (report.narrative || 'Reporte SMS sin narrativa') : report.description;
  const reporter = source === 'sms'
    ? (report.owner?.full_name || 'Equipo SMS')
    : (report.is_anonymous ? 'Anónimo' : (report.reporter_name || 'Anónimo'));
  const date = fmtDateMed(report.occurrence_date || report.created_at);
  const caseType = source === 'sms' ? 'SMS' : report.type;
  const caseTypeColor = source === 'sms' ? '#4b5565' : (report.type === 'MOR' ? '#dc2626' : '#ec5b13');
  const severityLabel = source === 'sms'
    ? (SMS_SEVERITY_LABEL[report.severity] || 'Sin clasificar')
    : (SMS_SEVERITY_LABEL[report.severity] || 'Sin clasificar');
  const severityColor = SMS_SEVERITY_COLOR[report.severity] || '#94a3b8';

  const doneCount = actions.filter(a => a.done).length;
  const totalCount = actions.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left animate-in fade-in duration-500 pb-24">
      {/* Breadcrumb + close */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Link href="/dashboard/safety" className="hover:text-slate-600">Seguridad SMS</Link>
          <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          <span className="text-slate-900 font-black">Seguimiento de caso</span>
        </div>
        <button type="button" onClick={() => router.push('/dashboard/safety')}
          className="size-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Hero */}
      <div className="bg-[#1A202C] rounded-2xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento · SMS</span>
            <span className="text-[10px] font-black text-white px-2.5 py-0.5 rounded-full" style={{ background: caseTypeColor }}>{caseType}</span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full" style={{ color: severityColor, background: `${severityColor}22` }}>{severityLabel}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-2 truncate">{title}</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1.5">Reportado el {date} por {reporter}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{statusMap[report.status] || report.status}</span>
          {!isClosed && (
            <button type="button" onClick={closeCase} disabled={closing}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {closing ? 'Cerrando...' : 'Marcar como cerrado'}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Progreso del seguimiento</span>
          <span className="text-xs font-bold text-slate-600">{doneCount} de {totalCount} acciones completadas</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        {/* Corrective actions */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Acciones correctivas</p>
          </div>
          <div className="p-3 space-y-1">
            {actions.length === 0 && (
              <p className="py-6 text-center text-xs font-black text-slate-300 uppercase">Sin acciones registradas</p>
            )}
            {actions.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50">
                <button type="button" onClick={() => toggleAction(a.id, !a.done)} className="shrink-0 mt-0.5">
                  <span className={`material-symbols-outlined text-xl ${a.done ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {a.done ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${a.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{a.label}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {a.owner && <>Responsable: {a.owner}</>}{a.owner && a.due_date && ' · '}{a.due_date && <>Vence {fmtDateMed(a.due_date)}</>}
                  </p>
                </div>
              </div>
            ))}
            <form onSubmit={addAction} className="flex items-center gap-2 pt-2 px-1">
              <input value={newAction.label} onChange={e => setNewAction({ ...newAction, label: e.target.value })}
                placeholder="Agregar acción correctiva..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900" />
              <input value={newAction.owner} onChange={e => setNewAction({ ...newAction, owner: e.target.value })}
                placeholder="Responsable" className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900" />
              <input type="date" value={newAction.due_date} onChange={e => setNewAction({ ...newAction, due_date: e.target.value })}
                className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900" />
              <button type="submit" disabled={addingAction || !newAction.label.trim()}
                className="shrink-0 size-8 flex items-center justify-center rounded-lg text-orange-600 hover:bg-orange-50 disabled:opacity-40">
                <span className="material-symbols-outlined text-xl">add_circle</span>
              </button>
            </form>
          </div>
        </div>

        {/* Timeline + AeroCivil */}
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 mb-4">Línea de tiempo</p>
            {events.length === 0 ? (
              <p className="text-xs font-black text-slate-300 uppercase text-center py-6">Sin eventos registrados</p>
            ) : (
              <div className="space-y-4">
                {events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="size-2 rounded-full bg-slate-700 mt-1" />
                      {i < events.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-xs font-black text-slate-900">{ev.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {fmtDateMed(ev.created_at)}{ev.actor_name && ` · ${ev.actor_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isVorMor && (() => {
            const compliance = computeCaseCompliance(report);
            const isMorType = report.type === 'MOR';
            const boxCls = compliance?.status === 'vencido' ? 'bg-red-50 border-red-200'
              : compliance?.status === 'enviado' ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200';
            const iconColor = compliance?.status === 'vencido' ? '#dc2626' : compliance?.status === 'enviado' ? '#16a34a' : '#d97706';
            return (
              <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 border ${boxCls}`}>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-base" style={{ color: iconColor }}>gavel</span>
                  <div>
                    <span className="text-xs font-bold" style={{ color: iconColor }}>
                      {isMorType ? 'Radicación en IRIS (plazo regulatorio)' : 'Radicación en IRIS (plazo interno sugerido)'}
                    </span>
                    {compliance && !report.aerocivil_notified_at && (
                      <p className="text-[10px] font-semibold text-slate-500">
                        Plazo: {fmtDateMed(compliance.deadline)} ({compliance.status === 'vencido' ? `vencido hace ${Math.abs(compliance.daysLeft)}d` : `${compliance.daysLeft}d restantes`})
                      </p>
                    )}
                  </div>
                </div>
                {report.aerocivil_notified_at ? (
                  <span className="text-[10.5px] font-black text-emerald-600">Sí — {fmtDateMed(report.aerocivil_notified_at)}</span>
                ) : (
                  <button type="button" onClick={notifyAerocivil} disabled={notifying}
                    className="text-[10.5px] font-black text-orange-600 hover:text-orange-800 disabled:opacity-50">
                    {notifying ? 'Registrando...' : 'Marcar radicado'}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
