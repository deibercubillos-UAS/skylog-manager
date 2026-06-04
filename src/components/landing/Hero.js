import Link from 'next/link';
import Image from 'next/image';

const TRUST_BADGES = [
  { icon: 'verified_user', label: 'RAC 100 / 2024' },
  { icon: 'gavel',         label: 'AeroCivil · UAEAC' },
  { icon: 'lock',          label: 'Datos en Colombia' },
  { icon: 'flight_takeoff',label: 'DJI RC Sync' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left column — stagger entrance ────────────────────────── */}
          <div className="flex flex-col gap-7">

            {/* Compliance badge */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500"
                 style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ec5b13]/10 border border-[#ec5b13]/20 w-fit">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec5b13] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ec5b13]"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-[#ec5b13]">RAC 2024 Compliance</span>
              </div>
            </div>

            {/* H1 — Lexend */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-600"
                 style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
              <h1 className="font-lexend text-5xl md:text-6xl lg:text-7xl font-black text-[#1A202C] leading-[1.08] tracking-tight">
                La Bitácora Digital de{' '}
                <span className="text-[#ec5b13] relative">
                  Alto Nivel.
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-600"
                 style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
              <p className="text-lg text-slate-600 max-w-xl font-medium leading-relaxed">
                Gestión integral de flota, tripulaciones y análisis de riesgos SORA.
                Diseñado para operadores que no comprometen la seguridad.
              </p>
            </div>

            {/* CTA */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-600"
                 style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
              <Link
                href="/registro"
                className="group relative inline-flex items-center gap-3 bg-[#ec5b13] text-white px-10 py-4 rounded-2xl text-lg font-black shadow-xl shadow-orange-500/30 overflow-hidden transition-all hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                {/* shimmer overlay on hover */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" aria-hidden="true" />
                <span className="material-symbols-outlined text-2xl relative z-10" aria-hidden="true">rocket_launch</span>
                <span className="relative z-10">Iniciar Prueba Gratis</span>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="animate-in fade-in duration-700"
                 style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <ul className="flex flex-wrap gap-3" aria-label="Certificaciones y características">
                {TRUST_BADGES.map(b => (
                  <li key={b.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-600">
                    <span className="material-symbols-outlined text-sm text-[#ec5b13]" aria-hidden="true">{b.icon}</span>
                    {b.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Right column — floating image ─────────────────────────── */}
          <div className="relative animate-in fade-in slide-in-from-right-6 duration-700"
               style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="animate-float">
              <Image
                src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800"
                alt="Operador de drones gestionando flota con Bitafly"
                width={800}
                height={534}
                priority
                className="rounded-[3rem] shadow-2xl border-8 border-white"
              />
            </div>
            {/* Glow halo detrás de la imagen */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-[3rem] bg-[#ec5b13] scale-90 animate-float"
                 aria-hidden="true" style={{ animationDelay: '500ms' }} />
          </div>

        </div>
      </div>
    </section>
  );
}
