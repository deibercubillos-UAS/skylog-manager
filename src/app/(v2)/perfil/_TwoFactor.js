'use client';

// Skylog V2.0 — segundo factor (TOTP) opcional, autoservicio desde el perfil. Cualquier rol puede activarlo:
// escanea el QR en su app autenticadora y confirma con el primer código (eso deja el factor «verificado» y eleva la
// sesión a aal2). Una vez activo, el shell exige el código en cada inicio de sesión (`mfaRequired` del contexto).
// Desactivar quita el factor (requiere sesión aal2, que ya se tiene al llegar aquí). Si pierde el autenticador, el
// Gerente General se lo quita desde Organización → Miembros. Toda la mecánica es de Supabase Auth (cliente).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@skylog/ui';
import { invalidateDutyContext } from '@/lib/v2/dutyContextClient';

// Mantiene al día la bandera `accounts.mfa_enabled` que usa el contexto de sesión (mejor esfuerzo; no bloquea la UI).
async function setMfaFlag(enabled) {
  try {
    await fetch('/api/perfil/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    invalidateDutyContext();
  } catch { /* la verdad vive en Auth; el contexto se auto-corrige con listFactors */ }
}

export default function TwoFactor() {
  const [state, setState] = useState('loading'); // loading | off | enrolling | on
  const [factorId, setFactorId] = useState(null);
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const { data, error: e } = await supabase.auth.mfa.listFactors();
    if (e) { setError(e.message); setState('off'); return; }
    const verified = (data?.totp || []).find((f) => f.status === 'verified');
    if (verified) { setFactorId(verified.id); setState('on'); }
    else { setState('off'); }
  }

  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setBusy(true);
    setError('');
    try {
      // Descarta cualquier alta a medias previa (factor sin verificar), que impediría crear el nuevo.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all || []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'BitaFly' });
      if (e) throw e;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode('');
      setState('enrolling');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(ev) {
    ev.preventDefault();
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    if (e) {
      setError(e.message.toLowerCase().includes('invalid') ? 'Código incorrecto o vencido. Intenta con el siguiente.' : e.message);
      setBusy(false);
      return;
    }
    await setMfaFlag(true);
    setBusy(false);
    await refresh();
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.mfa.unenroll({ factorId });
    if (e) {
      setError(e.message.toLowerCase().includes('aal2') || e.message.toLowerCase().includes('assurance')
        ? 'Para desactivarlo, primero verifica tu código (cierra sesión y vuelve a entrar).'
        : e.message);
      setBusy(false);
      return;
    }
    await setMfaFlag(false);
    setFactorId(null);
    setQr(null);
    setSecret('');
    setCode('');
    setBusy(false);
    setState('off');
  }

  return (
    <div className="pt-3 border-t border-navy-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-navy font-medium flex items-center gap-2">
            Verificación en dos pasos
            {state === 'on' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Activada</span>}
          </p>
          <p className="text-xs text-navy-400">
            {state === 'on'
              ? 'Pedimos un código de tu app autenticadora en cada inicio de sesión.'
              : 'Protege tu cuenta con una app autenticadora (Google Authenticator, Authy, 1Password…).'}
          </p>
        </div>
        {state === 'off' && (
          <Button type="button" variant="ghost" onClick={startEnroll} disabled={busy} className="text-xs px-3 py-1.5 shrink-0">
            {busy ? 'Un momento…' : 'Activar'}
          </Button>
        )}
        {state === 'on' && (
          <Button type="button" variant="ghost" onClick={disable} disabled={busy} className="text-xs px-3 py-1.5 shrink-0 text-red-600">
            {busy ? 'Quitando…' : 'Desactivar'}
          </Button>
        )}
      </div>

      {state === 'enrolling' && (
        <div className="mt-3 rounded-xl bg-navy-50/60 border border-navy-100 p-4">
          <p className="text-xs text-navy-500">Escanea el código con tu app autenticadora y escribe el código de 6 dígitos para confirmar.</p>
          <div className="mt-3 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt="Código QR para tu app autenticadora" className="w-40 h-40" />}
            <p className="text-[11px] text-navy-400 text-center">¿No puedes escanear? Escribe esta clave en la app:</p>
            <code className="text-xs bg-white border border-navy-100 rounded px-2 py-1 break-all select-all">{secret}</code>
          </div>
          <form onSubmit={confirmEnroll} className="mt-3 flex flex-col items-center gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-40 text-center text-xl tracking-[0.3em] rounded-xl border border-navy-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Código de verificación"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={busy || code.replace(/\s/g, '').length < 6} className="text-xs px-4 py-2">
                {busy ? 'Verificando…' : 'Confirmar y activar'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setState('off'); setError(''); }} disabled={busy} className="text-xs px-3 py-2">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
