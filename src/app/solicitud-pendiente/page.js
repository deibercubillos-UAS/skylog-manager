'use client';

// Skylog V2.0 — pantalla de espera: la cuenta no tiene organización activa porque pidió unirse por NIT y un gestor
// aún no aprueba la solicitud (o no pertenece a ninguna). Desde aquí puede enviar otra solicitud o cerrar sesión.
import { useCallback, useEffect, useState } from 'react';
import { JOIN_ROLE_LABELS } from '@skylog/domain';
import { supabase } from '@/lib/supabase';
import JoinOrganization from '@/app/(v2)/perfil/_JoinOrganization';

export default function SolicitudPendientePage() {
  const [requests, setRequests] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const ctx = await fetch('/api/duty/context');
      if (ctx.status === 401) { window.location.href = '/login?next=/solicitud-pendiente'; return; }
      const data = await ctx.json().catch(() => null);
      // Ya aprobada (o ya pertenece a una organización): al panel.
      if (data && (data.organizations || []).length > 0) { window.location.href = '/inicio'; return; }
      const res = await fetch('/api/solicitudes-ingreso');
      const body = await res.json().catch(() => ({}));
      setRequests(res.ok ? body.requests || [] : []);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <main className="min-h-screen bg-[#f8f6f6] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">{requests && requests.length > 0 ? 'Solicitud pendiente de aprobación' : 'Aún no perteneces a una organización'}</h1>
        {requests === null && <p className="mt-4 text-sm text-slate-500">Cargando…</p>}
        {requests && requests.length > 0 && (
          <>
            <p className="mt-2 text-sm text-slate-600">Un gestor de la organización debe aprobar tu solicitud antes de que puedas entrar. Te avisaremos por correo.</p>
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {requests.map((r) => (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-900">{r.organizationName || 'Organización'}</span>
                  <span className="text-slate-500"> · {JOIN_ROLE_LABELS[r.role] || r.role}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {requests && requests.length === 0 && <p className="mt-2 text-sm text-slate-600">Pide unirte con el NIT de tu empresa: un gestor aprobará tu solicitud.</p>}
        {requests && <JoinOrganization onJoined={load} />}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={load} disabled={checking} className="text-xs font-semibold text-primary-700 hover:underline min-h-[44px] disabled:opacity-50">{checking ? 'Revisando…' : 'Revisar de nuevo'}</button>
          <button type="button" onClick={signOut} className="text-xs font-semibold text-slate-500 hover:underline min-h-[44px]">Cerrar sesión</button>
        </div>
      </div>
    </main>
  );
}
