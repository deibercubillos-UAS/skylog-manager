'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const ROLE_OPTIONS = [
  { key: 'admin',        label: 'Gerente General' },
  { key: 'gerente_sms',  label: 'Gerente SMS' },
  { key: 'jefe_pilotos', label: 'Jefe de Pilotos' },
  { key: 'piloto',       label: 'Piloto' },
];
const ALL_KEYS = ROLE_OPTIONS.map(r => r.key);

export default function AnnouncementComposer({ onClose, onSent }) {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [roles, setRoles]   = useState(new Set(ALL_KEYS)); // por defecto, todos
  const [sending, setSending] = useState(false);

  const toggle = (key) => setRoles(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const allSelected = roles.size === ALL_KEYS.length;
  const toggleAll = () => setRoles(allSelected ? new Set() : new Set(ALL_KEYS));

  const submit = async () => {
    if (!title.trim()) return toast.error('El título es obligatorio.');
    if (roles.size === 0) return toast.error('Selecciona al menos un rol destinatario.');
    setSending(true);
    try {
      const res = await fetch('/api/notifications/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), roles: [...roles] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo publicar');
      toast.success(`Anuncio enviado a ${data.sent} ${data.sent === 1 ? 'persona' : 'personas'}.`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400';

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-orange-50 border-b border-orange-100 px-6 py-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500 text-2xl">campaign</span>
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Nuevo anuncio</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Aparece en la campana de los destinatarios</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="Ej: Reunión de seguridad el viernes" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Mensaje</label>
            <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={1000}
              placeholder="Detalle del anuncio…" className={inputCls + ' resize-none'} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Destinatarios</label>
              <button type="button" onClick={toggleAll} className="text-[11px] font-black text-orange-600 hover:underline uppercase tracking-wide">
                {allSelected ? 'Ninguno' : 'Todos'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(r => {
                const on = roles.has(r.key);
                return (
                  <button type="button" key={r.key} onClick={() => toggle(r.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      on ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{on ? 'check_box' : 'check_box_outline_blank'}</span>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={sending}
              className="flex-1 py-3 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:border-slate-400 transition-all">
              Cancelar
            </button>
            <button onClick={submit} disabled={sending}
              className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {sending
                ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>Enviando...</>
                : <><span className="material-symbols-outlined text-sm">send</span>Publicar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
