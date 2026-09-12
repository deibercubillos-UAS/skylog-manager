'use client';
import Link from 'next/link';
import Image from 'next/image';

// Antes 5 ítems + un screenshot grande + un badge — demasiada información
// lateral compitiendo por atención (feedback del usuario: "siento que
// abruma tanta información lateral"). Se recortó a las 3 más decisivas para
// la decisión de registrarse, mismo criterio que ya usa el hero de
// /preview-bitafly con sus "razones reales" (nunca más de 3 en una tarjeta).
const BENEFITS = [
  { icon: 'menu_book',         text: 'Bitácora digital RAC 100 desde el primer vuelo' },
  { icon: 'health_and_safety', text: 'SMS aeronáutico con trazabilidad de incidentes' },
  { icon: 'assessment',        text: 'Reportes RAC 100 en PDF listos para AeroCivil' },
];

// Fotos reales de fondo, una por modo — mismo patrón (foto a pantalla
// completa + degradado navy), pedido explícito del usuario para que la
// sección "En acción" y el registro luzcan igual de llamativos que el
// rediseño de /login (drone en vuelo). Ambas ya verificadas y en uso en
// esta misma sesión — regla V1, nunca un mockup.
const HERO_PHOTO = {
  login:    '/screenshots/marketing/hero-drone.jpg',
  register: '/screenshots/marketing/hero-bitacora-dji.jpg',
};

export default function AuthSidePanel({ mode = 'login' }) {
  const headline = mode === 'login'
    ? 'Tu flota, bajo control.'
    : 'Cumplimiento RAC 100 desde el primer vuelo.';

  const sub = mode === 'login'
    ? 'Todo lo que necesitas para operar con seguridad y cumplir la normativa aeronáutica colombiana.'
    : 'Únete a los operadores UAS que ya confían en Bitafly para gestionar su operación y cumplir con la AeroCivil.';

  // Un solo layout para ambos modos (antes login tenía foto+glass-card y
  // register tenía navy sólido+dot-grid+screenshot grande+badge — dos
  // estilos distintos conviviendo). Unificado: foto real de fondo +
  // degradado + tarjeta "glass" con 3 beneficios, mismo criterio de
  // simplicidad en los dos casos.
  return (
    <aside className="hidden lg:flex lg:w-[42%] p-12 flex-col justify-between relative isolate overflow-hidden">
      <Image
        src={HERO_PHOTO[mode] ?? HERO_PHOTO.login}
        alt=""
        fill
        sizes="42vw"
        priority
        className="object-cover -z-20"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/55 -z-10" />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none -z-10"
        style={{ backgroundImage: 'radial-gradient(circle, #ec5b13 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-auto group w-fit">
          <div className="size-9 relative">
            <Image src="/logo.png" alt="Bitafly" fill className="object-contain" />
          </div>
          <span className="text-white text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">
            Bitafly
          </span>
        </Link>

        <div>
          {/* Headline — llamativo, sobre la foto real */}
          <h2 className="text-white text-5xl font-black leading-[1.05] uppercase tracking-tighter mb-4 drop-shadow-lg">
            {headline}
          </h2>
          <p className="text-slate-200 text-sm leading-relaxed mb-8 max-w-xs">
            {sub}
          </p>

          {/* Beneficios — solo 3, en una tarjeta "glass" sobre la foto */}
          <ul className="space-y-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl p-5">
            {BENEFITS.map((b) => (
              <li key={b.icon} className="flex items-center gap-4">
                <div className="size-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-300 text-lg">{b.icon}</span>
                </div>
                <span className="text-slate-200 text-sm font-medium">{b.text}</span>
              </li>
            ))}
          </ul>

          {/* RAC badge */}
          <div className="mt-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">verified</span>
            <span className="text-slate-300 text-xs font-black uppercase tracking-wider">
              Cumplimiento RAC 100 · Colombia
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
