'use client';

// Skylog V2.0 — Mi Perfil. Página propia de V2, a pedido explícito del
// usuario ("continuemos con la sección de mi perfil"). Corrige un enlace
// real: el footer del sidebar ("Mi Perfil") apuntaba a
// `/dashboard/settings/profile` — la página de v1, sobre `profiles`/
// `pilots`, no sobre `people`/`accounts` (el modelo de identidad de V2).
// Datos propios (autoservicio) sobre `people` — reutiliza
// `/api/flota/roster/[personId]` para guardar (ya soporta autoservicio),
// sin duplicar un endpoint de edición nuevo.
//
// Rediseño de formularios (a pedido: "se ve muy plano como sin sentido"):
// cada sección es una tarjeta con encabezado de ícono+color (mismo lenguaje
// que Proveedores/Listas de Chequeo) en vez de solo un título de texto, y
// cada campo lleva un ícono guía (`_IconField.js`) — nunca `Field` genérico
// suelto en una grilla vacía.
import PersonAdditions from '../_components/PersonAdditions';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionHero, StatCard, SectionCard } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import { supabase } from '@/lib/supabase';
import IconField from './_IconField';

const ROLE_LABELS = {
  admin: 'Gerente General',
  superadmin: 'Superadmin',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms: 'Gerente SMS',
  piloto: 'Piloto',
};

const ROLE_TILE = {
  admin: 'bg-primary text-white',
  superadmin: 'bg-navy text-white',
  jefe_pilotos: 'bg-blue-500 text-white',
  gerente_sms: 'bg-red-500 text-white',
  piloto: 'bg-emerald-500 text-white',
};

function medicalStatus(expiresAt) {
  if (!expiresAt) return { label: 'Sin certificado registrado', badge: 'bg-navy-50 text-navy-400' };
  const days = Math.ceil((new Date(`${expiresAt}T00:00:00`) - new Date()) / 86_400_000);
  if (days < 0) return { label: 'Vencido', badge: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: `Vence en ${days} día(s)`, badge: 'bg-amber-50 text-amber-700' };
  return { label: 'Vigente', badge: 'bg-emerald-50 text-emerald-700' };
}

function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function PerfilPage() {
  const router = useRouter();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [person, setPerson] = useState(null);
  const [authEmail, setAuthEmail] = useState(null);
  const [lastSignInAt, setLastSignInAt] = useState(null);
  const [form, setForm] = useState({ fullName: '', documentType: '', documentNumber: '', phone: '', licenseNumber: '', medicalCertExpiry: '' });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ctxRes, perfilRes] = await Promise.all([fetch('/api/duty/context'), fetch('/api/perfil')]);
      const ctxData = await ctxRes.json();
      const perfilData = await perfilRes.json();
      if (!ctxRes.ok) throw new Error(ctxData.error || 'Error cargando contexto');
      if (!perfilRes.ok) throw new Error(perfilData.error || 'Error cargando el perfil');

      setContext(ctxData);
      setPerson(perfilData.person);
      setAuthEmail(perfilData.authEmail);
      setLastSignInAt(perfilData.lastSignInAt);
      setForm({
        fullName: perfilData.person?.full_name || '',
        documentType: perfilData.person?.document_type || '',
        documentNumber: perfilData.person?.document_number || '',
        phone: perfilData.person?.phone || '',
        licenseNumber: perfilData.person?.license_number || '',
        medicalCertExpiry: perfilData.person?.medical_cert_expiry || '',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/flota/roster/${context.personId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando los datos');
      setPerson(data.person);
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!authEmail) return;
    setResetBusy(true);
    setResetMessage(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(authEmail);
      if (resetError) throw resetError;
      setResetMessage({ ok: true, text: `Enviamos un enlace para restablecer tu contraseña a ${authEmail}.` });
    } catch (e) {
      setResetMessage({ ok: false, text: e.message });
    } finally {
      setResetBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Cuenta" title="Mi Perfil" description="Datos personales, licencia y seguridad de la cuenta." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const status = medicalStatus(person?.medical_cert_expiry);
  const primaryRole = context.organizations?.[0]?.role;

  return (
    <div className="space-y-6">
      {/* Cabecera de identidad — avatar con iniciales + nombre + rol,
          en vez de solo texto dentro del SectionHero. */}
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white p-6 md:p-7 shadow-lg shadow-navy-900/20">
        <div className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-primary/30 blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-2xl font-black shrink-0">
            {initialsOf(person?.full_name || context.fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Cuenta</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white truncate">{person?.full_name || context.fullName || 'Mi Perfil'}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              {primaryRole && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_TILE[primaryRole] || 'bg-white/10 text-white'}`}>
                  <span className="material-symbols-outlined text-sm">badge</span>
                  {ROLE_LABELS[primaryRole] || primaryRole}
                </span>
              )}
              <span className="text-xs text-navy-300">{authEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="badge" color="primary" label="Licencia" value={person?.license_number || '—'} />
        <StatCard icon="health_and_safety" color={status.badge.includes('red') ? 'red' : status.badge.includes('amber') ? 'amber' : status.badge.includes('emerald') ? 'emerald' : 'navy'} label="Certificado médico" value={status.label} />
        <StatCard icon="history" color="blue" label="Último acceso" value={lastSignInAt ? new Date(lastSignInAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
      </div>

      {/* 2 columnas en pantallas grandes — a pedido explícito del usuario
          ("se veria mejor si manejaramos dos columnas... y no una sola que
          llena la pantalla"). Columna izquierda: datos que se editan.
          Columna derecha: datos de solo lectura/acciones de cuenta. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* Datos personales */}
          <SectionCard icon="person" tile="bg-blue-500 text-white" wash="from-blue-50 to-white" title="Datos personales" description={`Correo de acceso: ${authEmail || '—'} (no se edita aquí)`}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <IconField icon="badge" label="Nombre completo" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="sm:col-span-2" required />
              <IconField icon="fingerprint" label="Tipo de documento" value={form.documentType} onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))} placeholder="Ej. CC, CE, Pasaporte" />
              <IconField icon="credit_card" label="Número de documento" value={form.documentNumber} onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} />
              <IconField icon="call" label="Teléfono" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="sm:col-span-2" />
              {saveError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{saveError}</p>}
              {saved && !saveError && <p className="text-sm text-emerald-600 sm:col-span-2 mb-2">Guardado.</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar datos'}
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Licencia RPAS */}
          <SectionCard
            icon="workspace_premium"
            tile="bg-primary text-white"
            wash="from-primary-50 to-white"
            title="Licencia RPAS"
            description="N.º de licencia y vigencia del certificado médico"
            badge={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.badge}`}>{status.label}</span>}
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <IconField icon="workspace_premium" label="N.º de licencia / CIPU" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
              <IconField icon="event" label="Vencimiento certificado médico" type="date" value={form.medicalCertExpiry} onChange={(e) => setForm((f) => ({ ...f, medicalCertExpiry: e.target.value }))} />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar licencia'}
                </Button>
              </div>
            </form>
            <PersonAdditions />
          </SectionCard>
        </div>

        <div className="space-y-6">
          {/* Organizaciones */}
          <SectionCard icon="apartment" tile="bg-violet-500 text-white" wash="from-violet-50 to-white" title="Organizaciones" description={`${context.organizations?.length || 0} membresía(s) activa(s)`}>
            <div className="space-y-1.5">
              {(context.organizations || []).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2.5 text-sm border border-navy-50">
                  <span className="font-medium text-navy">{o.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_TILE[o.role] || 'bg-navy-50 text-navy-400'}`}>{ROLE_LABELS[o.role] || o.role}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Seguridad de la cuenta */}
          <SectionCard icon="lock" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Seguridad de la cuenta" description="Contraseña y sesión activa">
            <div className="flex items-center justify-between gap-3 py-2 border-b border-navy-100">
              <div>
                <p className="text-sm text-navy font-medium">Contraseña</p>
                <p className="text-xs text-navy-400">Te enviamos un enlace de restablecimiento a tu correo.</p>
              </div>
              <Button type="button" variant="ghost" onClick={handleResetPassword} disabled={resetBusy} className="text-xs px-3 py-1.5 shrink-0">
                {resetBusy ? 'Enviando…' : 'Cambiar contraseña'}
              </Button>
            </div>
            {resetMessage && <p className={`text-xs mt-2 ${resetMessage.ok ? 'text-emerald-600' : 'text-red-600'}`}>{resetMessage.text}</p>}

            <div className="flex items-center justify-between gap-3 pt-3">
              <div>
                <p className="text-sm text-navy font-medium">Sesión</p>
                <p className="text-xs text-navy-400">Cierra tu sesión en este dispositivo.</p>
              </div>
              <Button type="button" variant="ghost" onClick={handleLogout} className="text-xs px-3 py-1.5 shrink-0 text-red-600">
                Cerrar sesión
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
