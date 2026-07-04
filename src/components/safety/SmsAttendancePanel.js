'use client';
import { useState, useEffect, useMemo } from 'react';
import { toast } from '@/lib/toast';
import { fmtDateMed } from '@/lib/formatters';
import { nextOccurrence } from '@/lib/trainingCompliance';

export default function SmsAttendancePanel({ session, onClose, onSuccess }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetch('/api/safety/training/roster').then(r => r.json())
      .then(d => setRoster(Array.isArray(d) ? d : []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  const attendanceForDate = useMemo(
    () => (session.attendance || []).filter(a => a.attended_date === date),
    [session.attendance, date]
  );
  const attendedProfileIds = new Set(attendanceForDate.map(a => a.profile_id));

  const toggle = async (profileId) => {
    setTogglingId(profileId);
    try {
      const existing = attendanceForDate.find(a => a.profile_id === profileId);
      if (existing) {
        await fetch(`/api/safety/training/attendance/${existing.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/safety/training/attendance', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.id, profile_id: profileId, attended_date: date }),
        });
      }
      onSuccess();
    } catch (err) {
      toast.error('Error al actualizar la asistencia.');
    } finally {
      setTogglingId(null);
    }
  };

  const { date: nextDate } = nextOccurrence(session);
  const totalAttended = attendanceForDate.length;

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">{session.topic}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Fecha de la sesión</label>
            <input type="date" className="block bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 mt-1"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <p className="text-[10.5px] font-semibold text-slate-400">
            Próxima ocurrencia estimada: <span className="font-black text-slate-600">{fmtDateMed(nextDate)}</span>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">Marca quién asistió el {fmtDateMed(date)}</p>
          <span className="text-xs font-black text-emerald-600">{totalAttended}/{roster.length} asistieron</span>
        </div>

        {loadingRoster ? (
          <p className="text-center text-xs font-black text-slate-300 uppercase tracking-widest py-10 animate-pulse">Cargando personal...</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {roster.map(p => {
              const attended = attendedProfileIds.has(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)} disabled={togglingId === p.id}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{p.full_name || p.email}</p>
                    <p className="text-[10.5px] text-slate-400">{p.role}</p>
                  </div>
                  <span className={`size-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                    attended ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                  }`}>
                    {attended && <span className="material-symbols-outlined text-white text-base">check</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cerrar
        </button>
      </div>
    </aside>
  );
}
