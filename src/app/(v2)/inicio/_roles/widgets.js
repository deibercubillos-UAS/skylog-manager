'use client';

// Widgets compartidos de los dashboards por rol (plan 78-dashboards-por-rol.md).
// Lenguaje visual SOBRIO (minimal/swiss): superficies neutras, UN acento (primary),
// y color (emerald/amber/red) solo cuando comunica estado o urgencia — nunca como
// decoración. Esto evita el aspecto "muchos colores / hecho con IA" de mosaicos con
// degradados. Lo usan PilotoDashboard y PilotoIndependienteDashboard.

import { useState } from 'react';
import Link from 'next/link';

export const SERVICE_THRESHOLD_H = 8; // DUTY_LIMITS.shortServiceThresholdHours (umbral de descanso)

// Textura sutil de líneas de contorno (mapa/terreno) para el hero — un detalle
// "natural", temático de operación sobre terreno, en vez de una superficie plana.
// Muy tenue (currentColor a baja opacidad); decorativa, aria-hidden.
function ContourTexture() {
  const lines = Array.from({ length: 7 }, (_, i) => 24 + i * 26);
  return (
    <svg className="absolute right-0 top-0 h-full w-3/4 text-white/[0.05] pointer-events-none -z-0" viewBox="0 0 420 220" fill="none" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {lines.map((y, i) => (
        <path key={i} d={`M-20 ${y + 70} Q 110 ${y + 30} 230 ${y + 58} T 480 ${y + 34}`} stroke="currentColor" strokeWidth="1.25" />
      ))}
    </svg>
  );
}

// ── Helpers de fecha/hora ─────────────────────────────────────────────────────
export function greetingForHour(h) {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
export function hoursSince(iso) { return (Date.now() - new Date(iso).getTime()) / 3_600_000; }
export function fmtTime(iso) { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
export function isToday(iso) { return new Date(iso).toDateString() === new Date().toDateString(); }
export function whenLabel(iso) {
  const d = new Date(iso);
  if (isToday(iso)) return `Hoy · ${fmtTime(iso)}`;
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(iso)}`;
}
export function daysUntil(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}
export function shortDate(iso) { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); }

// Color de estado (texto/borde) — el ÚNICO lugar donde entra color además del acento.
const TONE = {
  ok: { dot: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-l-emerald-500' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-600', border: 'border-l-amber-500' },
  danger: { dot: 'bg-red-500', text: 'text-red-600', border: 'border-l-red-500' },
};

// ── Hero ──────────────────────────────────────────────────────────────────────
// `serviceStartedAt`: para roles operativos (pilotos) muestra el servicio propio.
// `highlight` ({ label, value, sub }): para roles de gestión muestra una métrica de
// operación en su lugar. Si no se pasa ninguno, cae en "Sin servicio activo".
export function Hero({ fullName, roleLabel, orgName, serviceStartedAt, highlight }) {
  const now = new Date();
  const serviceH = serviceStartedAt ? Math.max(0, hoursSince(serviceStartedAt)) : null;
  const pct = serviceH != null ? Math.min(100, Math.round((serviceH / SERVICE_THRESHOLD_H) * 100)) : 0;
  const over = serviceH != null && serviceH >= SERVICE_THRESHOLD_H;
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-navy text-white px-5 py-5 sm:px-8 sm:py-6">
      <ContourTexture />
      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-navy-300">{greetingForHour(now.getHours())}</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 text-white truncate">{fullName || 'Piloto'}</h1>
          <span className="block h-[3px] w-10 rounded-full bg-primary mt-2.5" />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-3 text-xs text-navy-300">
            <span className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-white font-semibold px-2.5 py-1 rounded-md">
              <span className="material-symbols-outlined text-[15px] text-primary-300">flight_takeoff</span>
              {roleLabel}
            </span>
            {/* La fecha completa se oculta en móvil para aligerar el encabezado. */}
            <span className="hidden sm:inline capitalize">{now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {orgName && <span className="hidden sm:inline text-navy-400">· {orgName}</span>}
          </div>
        </div>
        <div className="w-full sm:w-auto rounded-xl bg-white/[0.07] border border-white/10 px-4 py-3 shrink-0 sm:min-w-[180px]">
          {highlight ? (
            <div className="flex items-center justify-between gap-4 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-300">{highlight.label}</p>
              <div className="text-right sm:text-left">
                <p className="text-2xl font-black mt-0.5 leading-none tabular-nums">{highlight.value}</p>
                {highlight.sub && <p className="text-[10px] text-navy-400 mt-1">{highlight.sub}</p>}
              </div>
            </div>
          ) : serviceStartedAt ? (
            <div className="flex items-center justify-between gap-4 sm:block">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-300">Mi servicio hoy</p>
                <p className="text-2xl font-black mt-0.5 leading-none tabular-nums">{serviceH.toFixed(1)}<span className="text-base font-bold text-navy-300"> h</span></p>
              </div>
              <div className="flex-1 sm:flex-none sm:mt-2">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${over ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-navy-400 mt-1.5">umbral {SERVICE_THRESHOLD_H} h · descanso</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-300">Mi servicio hoy</p>
              <p className="text-sm font-semibold mt-1 text-navy-200">Sin servicio activo</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Título de sección ─────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-baseline justify-between mb-2.5">
      <h2 className="text-[11px] font-bold text-navy-400 uppercase tracking-[0.12em]">{children}</h2>
      {action && <Link href={action.href} prefetch={false} className="group inline-flex items-center gap-0.5 text-[11px] font-bold text-primary-600 uppercase tracking-wide hover:text-primary-700">{action.label}<span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">chevron_right</span></Link>}
    </div>
  );
}

// ── KPI (tarjeta de INFORMACIÓN, estática — sin relieve de botón). El chip del
// ícono lleva el color de marca (naranja) por defecto, o el del estado si lo hay. ─
const CHIP = {
  ok: 'bg-emerald-50 text-emerald-600',
  warn: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  brand: 'bg-primary-50 text-primary-600',
};
export function StatCard({ icon, label, value, sub, tone }) {
  const t = tone ? TONE[tone] : null;
  return (
    <div className="bg-white border border-navy-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 truncate">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${CHIP[tone] || CHIP.brand}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <p className="text-2xl font-black text-navy mt-2.5 leading-none tracking-tight tabular-nums">{value}</p>
      {sub && (
        <p className="text-xs text-navy-400 mt-1.5 flex items-center gap-1.5 truncate">
          {t && <span className={`inline-block size-1.5 rounded-full shrink-0 ${t.dot}`} />}
          <span className="truncate">{sub}</span>
        </p>
      )}
    </div>
  );
}

// ── Lista de alertas accionables (neutra + borde-acento por severidad) ────────
// En móvil se muestran como máximo MOBILE_MAX alertas; el resto se revela con un
// botón (progressive disclosure). En pantallas sm+ se muestran todas siempre.
const MOBILE_MAX = 3;
export function AlertList({ alerts }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-navy-100 border-l-[3px] border-l-emerald-500">
        <span className="material-symbols-outlined text-xl text-emerald-600">task_alt</span>
        <p className="text-sm font-medium text-navy-700">Todo al día. Sin pendientes que requieran tu atención.</p>
      </div>
    );
  }
  const hidden = alerts.length - MOBILE_MAX;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const t = TONE[a.sev === 'red' ? 'danger' : 'warn'];
        const hideOnMobile = i >= MOBILE_MAX && !expanded;
        return (
          <Link key={i} href={a.href} prefetch={false} className={`group cursor-pointer ${hideOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-3 p-3.5 rounded-xl bg-white border border-navy-100 border-l-[3px] ${t.border} hover:border-navy-200 hover:shadow-sm hover:bg-navy-50/40 transition-all`}>
            <span className={`material-symbols-outlined text-xl shrink-0 ${t.text}`}>{a.icon}</span>
            <span className="min-w-0 flex-1 text-sm font-medium text-navy-700 leading-snug">{a.text}</span>
            {/* CTA en naranja de marca + flecha que se desplaza: señal clara de que lleva a una acción. */}
            <span className="hidden sm:flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-600 shrink-0">
              {a.cta}<span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-0.5">chevron_right</span>
            </span>
            <span className="sm:hidden material-symbols-outlined text-primary-500">chevron_right</span>
          </Link>
        );
      })}
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="sm:hidden w-full py-2 text-xs font-bold uppercase tracking-wide text-navy-500 hover:text-navy-700">
          {expanded ? 'Ver menos' : `Ver ${hidden} más`}
        </button>
      )}
    </div>
  );
}

// ── Acciones rápidas (uniformes, neutras; acento solo en hover) ───────────────
export function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {actions.map((q) => (
        <Link
          key={q.label}
          href={q.href}
          prefetch={false}
          className="group relative flex flex-col items-center justify-center gap-2.5 px-3 py-5 rounded-xl bg-gradient-to-b from-white to-primary-50/40 border border-navy-100 hover:border-primary-300 hover:shadow-md hover:shadow-primary-500/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-center"
        >
          <span className="material-symbols-outlined absolute top-2 right-2 text-[16px] text-navy-200 group-hover:text-primary-400 transition-colors">arrow_outward</span>
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary group-hover:text-white group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-[24px]">{q.icon}</span>
          </span>
          <span className="text-xs font-bold text-navy leading-tight">{q.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Panel (lista) ─────────────────────────────────────────────────────────────
export function Panel({ title, action, empty, children, isEmpty }) {
  return (
    <section className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy-100">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wide">{title}</h3>
        {action && <Link href={action.href} prefetch={false} className="group inline-flex items-center gap-0.5 text-[11px] font-bold text-primary-600 uppercase tracking-wide hover:text-primary-700">{action.label}<span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">chevron_right</span></Link>}
      </div>
      {isEmpty ? <p className="px-5 py-8 text-center text-sm text-navy-300">{empty}</p> : children}
    </section>
  );
}
