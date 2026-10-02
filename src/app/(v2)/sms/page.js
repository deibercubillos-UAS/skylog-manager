'use client';

// Inicio de la sección SMS — landing de la sección (mismo patrón que
// src/app/(v2)/operacion/page.js), distinto del dashboard principal de la
// cuenta (/inicio). Los 4 módulos ya están construidos (F3) — esta pasada
// solo le da el lenguaje visual moderno que ya tiene Operación y Flota &
// Equipo (SectionHero + tarjetas de color), sin tocar la lógica de F3.

import { SectionHero } from '../_components/SectionHero';

const CARDS = [
  {
    key: 'gobernanza',
    href: '/sms/gobernanza',
    icon: 'gavel',
    title: 'Gobernanza',
    description: 'Política y objetivos de seguridad operacional + designación del Gerente de Seguridad Operacional (Fase 1, MAUT-5.0-22-017).',
    color: { wash: 'from-primary-50 to-white', tile: 'bg-primary text-white' },
  },
  {
    key: 'objetivos',
    href: '/sms/objetivos',
    icon: 'flag',
    title: 'Objetivos SMS',
    description: 'Balanced Scorecard — objetivos declarados en la política, vinculados a los indicadores SPI que los miden.',
    color: { wash: 'from-sky-50 to-white', tile: 'bg-sky-500 text-white' },
  },
  {
    key: 'riesgos',
    href: '/sms/riesgos',
    icon: 'warning',
    title: 'Evaluación de Riesgo',
    description: 'Matriz de riesgo interna, barreras/controles y catálogo de peligros con su evaluación.',
    color: { wash: 'from-red-50 to-white', tile: 'bg-red-500 text-white' },
  },
  {
    key: 'indicadores',
    href: '/sms/indicadores',
    icon: 'monitoring',
    title: 'Indicadores (SPI)',
    description: 'Indicadores de Desempeño en Seguridad Operacional, ciclos de vuelo, líneas de alerta y planes de acción.',
    color: { wash: 'from-blue-50 to-white', tile: 'bg-blue-500 text-white' },
  },
  {
    key: 'reportes',
    href: '/sms/reportes',
    icon: 'report',
    title: 'Reportes y casos',
    description: 'Reportes MOR/VOR y seguimiento de casos de seguridad operacional.',
    color: { wash: 'from-violet-50 to-white', tile: 'bg-violet-500 text-white' },
  },
  {
    key: 'mejora-continua',
    href: '/sms/mejora-continua',
    icon: 'fact_check',
    title: 'Mejora Continua',
    description: 'Autoevaluación GAP del Apéndice 1 (100 preguntas oficiales, personalizable) con comparativo entre evaluaciones.',
    color: { wash: 'from-emerald-50 to-white', tile: 'bg-emerald-500 text-white' },
  },
  {
    key: 'capacitacion',
    href: '/sms/capacitacion',
    icon: 'event_repeat',
    title: 'Capacitación SMS',
    description: 'Cronograma recurrente y asistencia real del personal — sin examen, a diferencia de Capacitación de pilotos.',
    color: { wash: 'from-amber-50 to-white', tile: 'bg-amber-500 text-white' },
  },
  {
    key: 'reporte-mensual',
    href: '/sms/reporte-mensual',
    icon: 'summarize',
    title: 'Reporte Mensual SMS',
    description: 'Paquete único de estadística + SPI + MOR del mes, con acuse de envío (RAC 100 §100.535(a)(26)).',
    color: { wash: 'from-indigo-50 to-white', tile: 'bg-indigo-500 text-white' },
  },
  {
    key: 'msms',
    href: '/sms/msms',
    icon: 'description',
    title: 'MSMS',
    description: 'Manual del Sistema de Gestión de Seguridad Operacional, generado desde la configuración vigente y publicado en Manuales.',
    color: { wash: 'from-violet-50 to-white', tile: 'bg-violet-500 text-white' },
  },
  {
    key: 'asistente',
    href: '/sms/asistente',
    icon: 'checklist',
    title: 'Asistente de implantación',
    description: 'Panorama del progreso del SMS por fases (política, riesgo, aseguramiento, promoción).',
    color: { wash: 'from-emerald-50 to-white', tile: 'bg-emerald-500 text-white' },
  },
];

export default function SmsInicio() {
  return (
    <div className="space-y-6">
      <SectionHero eyebrow="SMS" title="SMS" description="Sistema de Gestión de la Seguridad Operacional — accesos rápidos a cada módulo." />

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
