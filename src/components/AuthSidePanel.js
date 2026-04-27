'use client';
import Link from 'next/link';
import Image from 'next/image';

const BENEFITS = [
  { icon: 'menu_book',          text: 'Bitácora digital RAC 100 desde el primer vuelo' },
  { icon: 'build',              text: 'Mantenimiento y alertas automáticas de aeronaves' },
  { icon: 'battery_charging_full', text: 'Control de ciclos de baterías LiPo' },
  { icon: 'health_and_safety', text: 'SMS aeronáutico con trazabilidad de incidentes' },
  { icon: 'assessment',         text: 'Reportes oficiales PDF listos para AeroCivil' },
];

export default function AuthSidePanel({ mode = 'login' }) {
  const headline = mode === 'login'
    ? 'Tu flota, bajo control.'
    : 'Cumplimiento RAC 100 desde el primer vuelo.';

  const sub = mode === 'login'
    ? 'Todo lo que necesitas para operar con seguridad y cumplir la normativa aeronáutica colombiana.'
    : 'Únete a los operadores UAS que ya confían en Bitafly para gestionar su operación y cumplir con la AeroCivil.';

  return (
    <aside className="hidden lg:flex lg:w-[42%] bg-[#1A202C] p-12 flex-col justify-between relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #ec5b13 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-14 group w-fit">
          <div className="size-9 relative">
            <Image src="/logo.png" alt="Bitafly" fill className="object-contain" />
          </div>
          <span className="text-white text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">
            Bitafly
          </span>
        </Link>

        {/* Headline */}
        <h2 className="text-white text-4xl font-black leading-[1.1] uppercase tracking-tighter mb-4">
          {headline}
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xs">
          {sub}
        </p>

        {/* Benefits */}
        <ul className="space-y-4 flex-1">
          {BENEFITS.map((b) => (
            <li key={b.icon} className="flex items-center gap-4">
              <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">{b.icon}</span>
              </div>
              <span className="text-slate-300 text-sm font-medium">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* Testimonial */}
        <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-primary text-sm">★</span>
            ))}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed italic">
            &ldquo;Bitafly nos permitió pasar la auditoría de AeroCivil sin contratiempos. Los reportes PDF son exactamente lo que piden los inspectores.&rdquo;
          </p>
          <p className="text-slate-500 text-xs font-bold uppercase mt-3">
            Carlos M. · Gerente de Operaciones, Bogotá
          </p>
        </div>

        {/* RAC badge */}
        <div className="mt-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">verified</span>
          <span className="text-slate-500 text-xs font-black uppercase tracking-wider">
            Cumplimiento RAC 100 · Colombia
          </span>
        </div>
      </div>
    </aside>
  );
}
