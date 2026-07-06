'use client';
// Banner de invitaciones pendientes en el dashboard.
// Se alimenta de GET /api/invitations/pending y permite Aceptar/Rechazar.
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

const ROLE_LABEL = {
  admin: 'Gerente General', jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms: 'Gerente SMS', piloto: 'Piloto',
};

export default function InvitationsBanner() {
  const [invs, setInvs]       = useState([]);
  const [busy, setBusy]       = useState(null); // token en progreso

  useEffect(() => {
    let active = true;
    fetch('/api/invitations/pending')
      .then(r => { if (!r.ok) { console.warn('[fetch] /api/invitations/pending failed:', r.status); return { invitations: [] }; } return r.json(); })
      .then(d => { if (active) setInvs(d.invitations || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function act(inv, action) {
    setBusy(inv.token);
    try {
      const res = await fetch(`/api/invitations/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inv.token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setInvs(prev => prev.filter(i => i.token !== inv.token));
      if (action === 'accept') {
        toast.success(`Te uniste a ${inv.orgName}. Recargando...`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.success('Invitación rechazada.');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (!invs.length) return null;

  return (
    <div className="space-y-3">
      {invs.map(inv => (
        <div key={inv.token}
          className="flex flex-col sm:flex-row sm:items-center gap-4 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top-2 duration-500">
          <span className="material-symbols-outlined text-2xl text-orange-500 shrink-0" aria-hidden="true">mail</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-orange-900 uppercase tracking-tight">Invitación a una organización</p>
            <p className="text-xs text-orange-700 font-medium mt-0.5">
              Te invitaron a unirte a <strong>{inv.orgName}</strong> como <strong>{ROLE_LABEL[inv.role] || inv.role}</strong>.
              Al aceptar, se agrega esta organización a tu cuenta — tus datos actuales no se tocan ni se transfieren.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => act(inv, 'accept')}
              disabled={busy === inv.token}
              className="px-4 py-2 bg-[#ec5b13] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-all flex items-center gap-1.5">
              {busy === inv.token
                ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-sm">check</span>}
              Aceptar
            </button>
            <button
              onClick={() => act(inv, 'reject')}
              disabled={busy === inv.token}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-all">
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
