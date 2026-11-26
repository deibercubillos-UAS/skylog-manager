import Link from 'next/link';
// El wordmark usa la tipografía de marca global `font-brand` (Exo 2 italic),
// registrada en layout.js / tailwind.config.mjs.

// Pantalla de bienvenida de la APP (no la web). Entrada al abrir la app sin
// sesión: foto real de héroe + accesos a iniciar sesión / crear cuenta. Clara,
// editorial y liviana (no es el home completo de bitafly.com). Con sesión, el
// redireccionador de la home (AppLaunchRedirect) manda directo a /inicio y
// nunca se llega aquí. Se despliega por web → aplica a apps ya instaladas.

export const metadata = {
  title: 'BitaFly — Operación de drones',
  robots: { index: false, follow: false }, // pantalla interna de la app, no para buscadores
};

const BENEFITS = [
  { icon: 'menu_book', text: 'Bitácora de vuelos conforme al RAC 100' },
  { icon: 'rocket_launch', text: 'Despacho y reportes SMS (MOR/VOR) — RAC 219' },
  { icon: 'partly_cloudy_day', text: 'Flota, baterías y meteorología por zona' },
];

export default function BienvenidaPage() {
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col font-sans">
      {/* ── HERO: foto real ───────────────────────────────────────────── */}
      <div className="relative h-[50vh] min-h-[300px] w-full shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/screenshots/marketing/hero-clima-cielo.jpg"
          alt="Dron en vuelo al atardecer"
          className="absolute inset-0 size-full object-cover object-center"
        />
        {/* Degradado superior (legibilidad del logo) e inferior (fundido a la tarjeta blanca) */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />

        {/* Marca — logo en blanco (sin placa) + nombre en Exo 2 italic */}
        <div className="absolute top-0 inset-x-0 px-6 pt-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BitaFly" className="size-12 object-contain brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <span className="font-brand italic text-white text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">BitaFly</span>
        </div>

        {/* Etiqueta */}
        <div className="absolute left-6 bottom-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-white uppercase tracking-wide shadow-lg shadow-primary-900/30">
            <span className="material-symbols-outlined text-sm">flight</span>
            Operación de drones · Colombia
          </span>
        </div>
      </div>

      {/* ── CONTENIDO ─────────────────────────────────────────────────── */}
      <div className="relative -mt-8 flex-1 rounded-t-[32px] bg-white px-6 pt-7 pb-8 flex flex-col max-w-md w-full mx-auto">
        <h1 className="text-[26px] leading-[1.15] font-black font-lexend text-navy">
          Tu operación de drones, <span className="text-primary">bajo control.</span>
        </h1>
        <p className="mt-3 text-sm text-navy-500 leading-relaxed">
          Bitácora, despacho, flota y seguridad operacional en una sola app, lista para presentar ante la Aerocivil.
        </p>

        {/* Beneficios (lista editorial, no rejilla) */}
        <ul className="mt-6 space-y-3.5">
          {BENEFITS.map((b) => (
            <li key={b.text} className="flex items-center gap-3">
              <span className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary shrink-0">
                <span className="material-symbols-outlined text-xl">{b.icon}</span>
              </span>
              <span className="text-sm font-semibold text-navy-700 leading-snug">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* Acciones */}
        <div className="mt-auto pt-8 space-y-3">
          <Link
            href="/login"
            className="group relative flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gradient-to-br from-primary-400 via-primary to-primary-600 text-white text-[17px] font-black shadow-xl shadow-primary-500/40 ring-1 ring-primary-400/40 active:scale-[0.97] transition-all overflow-hidden"
          >
            {/* brillo sutil en la parte superior del botón */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
            <span className="relative">Iniciar sesión</span>
            <span className="material-symbols-outlined relative transition-transform group-active:translate-x-0.5">arrow_forward</span>
          </Link>
          <Link
            href="/registro"
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-navy text-white text-[17px] font-black shadow-lg shadow-navy-900/25 active:scale-[0.97] transition-all"
          >
            Crear cuenta
          </Link>
          <p className="text-center text-[11px] font-semibold text-navy-300 pt-1.5 uppercase tracking-wide">
            Aerocivil · RAC 100 / RAC 219 SMS
          </p>
        </div>
      </div>
    </div>
  );
}
