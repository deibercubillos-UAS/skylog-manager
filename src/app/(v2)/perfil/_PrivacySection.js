'use client';

// Skylog V2.0 — «Privacidad y datos» (Ley 1581): descargar mis datos y eliminar mi cuenta. El servidor hace todo
// (`/api/perfil/exportar`, `/api/perfil/cuenta`); aquí solo se muestra el impacto antes de confirmar.
import { useState } from 'react';
import { Button } from '@skylog/ui';
import { supabase } from '@/lib/supabase';

export default function PrivacySection({ authEmail }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const openPanel = async () => {
    setOpen(true);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/perfil/cuenta');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo revisar tu cuenta');
      setPlan(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/perfil/cuenta', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar la cuenta');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const emailOk = confirmEmail.trim().toLowerCase() === String(authEmail || '').toLowerCase();

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-2 border-b border-navy-100">
        <div>
          <p className="text-sm text-navy font-medium">Descargar mis datos</p>
          <p className="text-xs text-navy-400">Un archivo con tus datos personales, vuelos, tiempos de servicio y registros propios.</p>
        </div>
        <a href="/api/perfil/exportar" download className="text-xs font-semibold px-3 py-1.5 shrink-0 rounded-lg border border-navy-200 text-navy hover:bg-navy-50">
          Descargar
        </a>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3">
        <div>
          <p className="text-sm text-navy font-medium">Eliminar mi cuenta</p>
          <p className="text-xs text-navy-400">Borra tu acceso. Los registros con retención obligatoria se conservan anonimizados.</p>
        </div>
        {!open && (
          <Button type="button" variant="ghost" onClick={openPanel} className="text-xs px-3 py-1.5 shrink-0 text-red-600">
            Eliminar cuenta
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
          {loading && <p className="text-sm text-navy-400">Revisando qué pasaría…</p>}
          {plan && (
            <>
              {plan.orgsToDelete?.length > 0 && (
                <p className="text-sm text-navy">
                  <b>Se eliminarán con tu cuenta</b> (eres la única persona en ellas): {plan.orgsToDelete.map((o) => `«${o.name}»`).join(', ')}, con su flota, vuelos y registros.
                </p>
              )}
              {plan.orgsToLeave?.length > 0 && (
                <p className="text-sm text-navy">Saldrás de: {plan.orgsToLeave.map((o) => `«${o.name}»`).join(', ')}. Esas organizaciones siguen con sus demás integrantes.</p>
              )}
              {plan.blockers?.map((b) => (
                <p key={b.code + (b.organization_id || '')} className="text-sm text-red-700 font-medium">{b.message}</p>
              ))}
              {plan.canDelete && (
                <>
                  <p className="text-xs text-navy-500">Esta acción no se puede deshacer. Si necesitas tus datos, descárgalos antes. Escribe tu correo ({authEmail}) para confirmar:</p>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={authEmail || 'tu correo'}
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                    autoComplete="off"
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={doDelete} disabled={!emailOk || busy} className="text-xs px-3 py-1.5 bg-red-600">
                      {busy ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setOpen(false); setConfirmEmail(''); }} className="text-xs px-3 py-1.5">
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
              {!plan.canDelete && (
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-xs px-3 py-1.5">Entendido</Button>
              )}
            </>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
