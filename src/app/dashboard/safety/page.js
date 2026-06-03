'use client';
import Link from 'next/link';

const SAFETY_MODULES = [
  {
    href:  '/dashboard/sora',
    icon:  'radar',
    title: 'Análisis SORA',
    desc:  'Evaluación de riesgos operacionales — Metodología JARUS v2.0',
    color: 'bg-orange-50 border-orange-200 text-orange-600',
    available: true,
  },
  {
    href:  '/dashboard/safety-config',
    icon:  'settings_input_component',
    title: 'Formato SORA / Barreras',
    desc:  'Configura plantillas de evaluación, barreras de seguridad y categorías de riesgo',
    color: 'bg-blue-50 border-blue-200 text-blue-600',
    available: true,
  },
  {
    href:  '/dashboard/sms',
    icon:  'report_problem',
    title: 'Reportes SMS',
    desc:  'Sistema de gestión de seguridad operacional — reporte de incidentes',
    color: 'bg-amber-50 border-amber-200 text-amber-600',
    available: true,
  },
  {
    href:  '/dashboard/vor-mor',
    icon:  'volunteer_activism',
    title: 'VOR / MOR',
    desc:  'Reportes Voluntarios y Obligatorios de Ocurrencia — formulario público con QR',
    color: 'bg-sky-50 border-sky-200 text-sky-600',
    available: true,
  },
  {
    href:  '#',
    icon:  'map',
    title: 'Mapas de Restricción',
    desc:  'Zonas de exclusión aérea, TFRs y espacio aéreo controlado',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    available: false,
  },
];

export default function SafetyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 text-left pb-20">

      {/* Header */}
      <header className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">
          Seguridad Operacional
        </h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
          SMS Aeronáutico · RAC 100 · JARUS v2.0
        </p>
      </header>

      {/* Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SAFETY_MODULES.map(m => (
          m.available ? (
            <Link key={m.href} href={m.href}
              className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-[2rem] hover:border-orange-300 hover:shadow-md transition-all group active:scale-[0.99]">
              <div className={`size-12 rounded-2xl flex items-center justify-center border shrink-0 ${m.color} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-xl">{m.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">{m.title}</p>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">{m.desc}</p>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-400 transition-colors text-xl shrink-0 mt-0.5">chevron_right</span>
            </Link>
          ) : (
            <div key={m.title}
              className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] opacity-50 cursor-not-allowed">
              <div className={`size-12 rounded-2xl flex items-center justify-center border shrink-0 ${m.color}`}>
                <span className="material-symbols-outlined text-xl">{m.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{m.title}</p>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full text-xs font-black uppercase">Pronto</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">{m.desc}</p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
