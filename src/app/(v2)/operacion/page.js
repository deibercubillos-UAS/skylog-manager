'use client';

// Inicio de la sección Operación — landing de la sección, distinto del
// dashboard principal de la cuenta (/inicio). Restyle 2026-10-01 (cierre de
// F1 — Documentación ya tiene el lenguaje visual moderno en sus 11 páginas
// SMS; esta era la última página del árbol usando el PageHero/KPIStrip
// plano de @skylog/ui en vez de SectionHero) — mismo patrón que
// src/app/(v2)/sms/page.js. Los 4 módulos ya están construidos (F5 +
// Operación), no se fabrica ningún "próximamente".
import { SectionHero } from '../_components/SectionHero';

const CARDS = [
  {
    key: 'bitacora',
    href: '/operacion/bitacora',
    icon: 'menu_book',
    title: 'Bitácora',
    description: 'Registro de vuelos y horas de operación.',
    color: { wash: 'from-primary-50 to-white', tile: 'bg-primary text-white' },
  },
  {
    key: 'programacion',
    href: '/operacion/programacion',
    icon: 'event_available',
    title: 'Programación',
    description: 'Calendario de misiones planeadas.',
    color: { wash: 'from-sky-50 to-white', tile: 'bg-sky-500 text-white' },
  },
  {
    key: 'meteorologia',
    href: '/operacion/meteorologia',
    icon: 'partly_cloudy_day',
    title: 'Meteorología',
    description: 'Condiciones de vuelo por zona de operación.',
    color: { wash: 'from-blue-50 to-white', tile: 'bg-blue-500 text-white' },
  },
  {
    key: 'duty',
    href: '/operacion/duty',
    icon: 'schedule',
    title: 'Tiempo de servicio',
    description: 'Panorama de cumplimiento de tiempos de servicio (RAC 100 §100.540).',
    color: { wash: 'from-amber-50 to-white', tile: 'bg-amber-500 text-white' },
  },
];

export default function OperacionInicio() {
  return (
    <div className="space-y-6">
      <SectionHero eyebrow="Operación" title="Inicio" description="Accesos rápidos a los módulos de Operación." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            className={`flex items-start gap-3 rounded-[2rem] border border-navy-100 bg-gradient-to-br ${c.color.wash} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
          >
            <span className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 shadow-sm ${c.color.tile}`}>
              <span className="material-symbols-outlined text-2xl">{c.icon}</span>
            </span>
            <div>
              <p className="text-sm font-bold text-navy">{c.title}</p>
              <p className="text-xs text-navy-400 mt-1">{c.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
