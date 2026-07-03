'use client';

import { useState, useEffect, useRef } from 'react';
import { fmtDateMed } from '@/lib/formatters';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { sailRoman, sailColor } from '@/lib/soraEngine';
import PageHero from '@/components/PageHero';

const SoraWizard = dynamic(() => import('@/components/sora/SoraWizard'), { ssr: false });

const fmtDate = fmtDateMed;

// ── Datos estáticos ──────────────────────────────────────────────────────────

const SAIL_INFO = [
  { roman: 'I',   level: 1, label: 'Riesgo mínimo',   desc: 'Operaciones básicas VLOS, zonas despobladas, UA pequeño.', color: 'emerald' },
  { roman: 'II',  level: 2, label: 'Riesgo bajo',     desc: 'VLOS con algo de exposición, mitigaciones simples.', color: 'teal' },
  { roman: 'III', level: 3, label: 'Riesgo moderado', desc: 'BVLOS o zona habitada; mitigaciones robustas requeridas.', color: 'amber' },
  { roman: 'IV',  level: 4, label: 'Riesgo elevado',  desc: 'Operaciones complejas, espacio aéreo activo.', color: 'orange' },
  { roman: 'V',   level: 5, label: 'Riesgo alto',     desc: 'Múltiples factores de riesgo concurrentes.', color: 'red' },
  { roman: 'VI',  level: 6, label: 'Riesgo máximo',   desc: 'Requiere autorización especial UAEAC / Aerocivil.', color: 'rose' },
];

const SAIL_COLOR_MAP = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500' },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
};

const ARC_INFO = {
  'ARC-a': { label: 'Muy bajo', color: 'emerald', desc: 'Espacio aéreo no controlado y sin tráfico esperado' },
  'ARC-b': { label: 'Bajo',     color: 'blue',    desc: 'Espacio aéreo clase G con densidad baja' },
  'ARC-c': { label: 'Medio',    color: 'amber',   desc: 'Espacio aéreo clase E, D o con tráfico moderado' },
  'ARC-d': { label: 'Alto',     color: 'red',     desc: 'Espacio aéreo clase C, B o zona de alta densidad' },
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    complete: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    draft:    'bg-amber-50   text-amber-600   border-amber-200',
    archived: 'bg-slate-50   text-slate-500   border-slate-200',
  };
  const label = status === 'complete' ? 'Completado' : status === 'draft' ? 'Borrador' : 'Archivado';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${map[status] || map.draft}`}>
      {label}
    </span>
  );
}

function GrcBadge({ value }) {
  const cls = value <= 3 ? 'bg-emerald-100 text-emerald-700' :
              value <= 5 ? 'bg-amber-100   text-amber-700'   :
                           'bg-red-100     text-red-700';
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${cls}`}>{value}</span>;
}

// Accordion con animación CSS
function Accordion({ title, icon, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[#ec5b13] text-xl" aria-hidden="true">{icon}</span>
          <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{title}</span>
          {badge && (
            <span className="text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-slate-400 text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true">expand_more</span>
      </button>
      <div ref={bodyRef}
           className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}

// Fila expandible de la tabla
function AssessmentRow({ a, fmtDate }) {
  const [expanded, setExpanded] = useState(false);
  const sc = sailColor(a.sail_level);
  const sailInfo = SAIL_INFO.find(s => s.level === a.sail_level) || SAIL_INFO[0];
  const arcInfo  = ARC_INFO[a.final_arc] || {};
  const arcC     = SAIL_COLOR_MAP[arcInfo.color] || SAIL_COLOR_MAP.emerald;

  return (
    <>
      {/* Main row */}
      <tr
        className={`transition-colors text-xs font-medium text-slate-700 cursor-pointer select-none
          ${expanded ? 'bg-orange-50/60' : 'hover:bg-orange-50/30'}`}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-sm transition-transform duration-200 text-slate-300 ${expanded ? 'rotate-90' : ''}`}
                  aria-hidden="true">chevron_right</span>
            <div>
              <p className="font-black text-slate-900 text-sm leading-tight">{a.operation_name}</p>
              {a.location_name && <p className="text-xs text-slate-400 mt-0.5">{a.location_name}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-slate-500">{fmtDate(a.operation_date)}</td>
        <td className="px-4 py-4">
          {a.aircraft
            ? <><span className="font-black text-slate-900">{a.aircraft.model}</span><br />
                <span className="text-xs text-slate-400 font-mono">{a.aircraft.serial_number}</span></>
            : <span className="text-slate-300">—</span>}
        </td>
        <td className="px-4 py-4"><GrcBadge value={a.final_grc} /></td>
        <td className="px-4 py-4">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${arcC.bg} ${arcC.text} ${arcC.border}`}>
            {a.final_arc}
          </span>
        </td>
        <td className="px-4 py-4">
          <span className={`px-3 py-1.5 rounded-xl text-sm font-black border ${sc.bg} ${sc.text} ${sc.border}`}>
            {sailRoman(a.sail_level)}
          </span>
        </td>
        <td className="px-4 py-4"><StatusChip status={a.status} /></td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-orange-50/40">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* SAIL detail */}
              <div className={`p-3.5 rounded-xl border ${sc.bg} ${sc.border}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${sc.text} opacity-70`}>Nivel SAIL</p>
                <p className={`text-2xl font-black ${sc.text} mt-0.5`}>{sailRoman(a.sail_level)}</p>
                <p className={`text-xs font-bold ${sc.text} opacity-80 mt-1`}>{sailInfo.label}</p>
                <p className={`text-xs ${sc.text} opacity-60 mt-0.5 leading-snug`}>{sailInfo.desc}</p>
              </div>

              {/* ARC detail */}
              <div className={`p-3.5 rounded-xl border ${arcC.bg} ${arcC.border}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${arcC.text} opacity-70`}>ARC Final</p>
                <p className={`text-2xl font-black ${arcC.text} mt-0.5`}>{a.final_arc}</p>
                <p className={`text-xs font-bold ${arcC.text} opacity-80 mt-1`}>{arcInfo.label}</p>
                <p className={`text-xs ${arcC.text} opacity-60 mt-0.5 leading-snug`}>{arcInfo.desc}</p>
              </div>

              {/* GRC detail */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">GRC Final</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{a.final_grc}</p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {a.final_grc <= 3 ? 'Riesgo terrestre aceptable sin OSOs adicionales.'
                   : a.final_grc <= 5 ? 'Mitigaciones terrestres aplicadas con éxito.'
                   : 'Riesgo terrestre elevado — revisa mitigaciones M1/M2/M3.'}
                </p>
              </div>

              {/* Pilot / notes */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evaluación</p>
                <p className="text-xs font-black text-slate-700 mt-1">{fmtDate(a.operation_date)}</p>
                {a.notes && <p className="text-xs text-slate-400 mt-1.5 leading-snug line-clamp-3">{a.notes}</p>}
                <StatusChip status={a.status} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Tarjeta mobile expandible
function AssessmentCard({ a, fmtDate }) {
  const [expanded, setExpanded] = useState(false);
  const sc = sailColor(a.sail_level);
  const sailInfo = SAIL_INFO.find(s => s.level === a.sail_level) || SAIL_INFO[0];
  const arcInfo  = ARC_INFO[a.final_arc] || {};
  const arcC     = SAIL_COLOR_MAP[arcInfo.color] || SAIL_COLOR_MAP.emerald;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Summary row */}
      <button
        className="w-full text-left p-4 space-y-2"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 uppercase truncate">{a.operation_name}</p>
            {a.location_name && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.location_name}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-xl text-sm font-black border ${sc.bg} ${sc.text} ${sc.border}`}>
              {sailRoman(a.sail_level)}
            </span>
            <span className={`material-symbols-outlined text-slate-300 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  aria-hidden="true">expand_more</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GrcBadge value={a.final_grc} />
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${arcC.bg} ${arcC.text} ${arcC.border}`}>
            {a.final_arc}
          </span>
          <StatusChip status={a.status} />
        </div>
        <p className="text-xs text-slate-400">
          {fmtDate(a.operation_date)}
          {a.aircraft && <span> · {a.aircraft.model}</span>}
        </p>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-orange-50/40 border-t border-orange-100 space-y-2.5">
          <div className={`p-3 rounded-xl border ${sc.bg} ${sc.border}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${sc.text} opacity-70`}>SAIL {sailRoman(a.sail_level)} — {sailInfo.label}</p>
            <p className={`text-xs ${sc.text} opacity-80 mt-1 leading-snug`}>{sailInfo.desc}</p>
          </div>
          <div className={`p-3 rounded-xl border ${arcC.bg} ${arcC.border}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${arcC.text} opacity-70`}>{a.final_arc} — {arcInfo.label}</p>
            <p className={`text-xs ${arcC.text} opacity-80 mt-1 leading-snug`}>{arcInfo.desc}</p>
          </div>
          {a.notes && (
            <p className="text-xs text-slate-500 bg-white rounded-xl p-3 border border-slate-100 leading-relaxed">
              {a.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function SoraPage() {
  const [showWizard,   setShowWizard]   = useState(false);
  const [assessments,  setAssessments]  = useState([]);
  const [loadingA,     setLoadingA]     = useState(true);

  const loadAssessments = async () => {
    setLoadingA(true);
    try {
      const res  = await fetch('/api/sora/assessments');
      const data = await res.json();
      setAssessments(Array.isArray(data) ? data : []);
    } catch { setAssessments([]); }
    finally  { setLoadingA(false); }
  };

  useEffect(() => { loadAssessments(); }, []);

  // KPIs
  const kpis = assessments.length > 0 ? (() => {
    const completed = assessments.filter(a => a.status === 'complete').length;
    const avgSail   = Math.round(assessments.reduce((s, a) => s + (a.sail_level || 1), 0) / assessments.length);
    const maxGrc    = Math.max(...assessments.map(a => a.final_grc || 0));
    return { total: assessments.length, completed, avgSail, maxGrc };
  })() : null;

  return (
    <>
      {showWizard && (
        <SoraWizard
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); loadAssessments(); }}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-5 text-left animate-in fade-in duration-500 pb-24">

        {/* Regreso */}
        <Link href="/dashboard/safety"
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Seguridad Operacional
        </Link>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <PageHero
          eyebrow="Cumplimiento"
          title="Análisis SORA"
          description="Metodología JARUS v2.0 · Cumplimiento RAC 100"
        />

        <div className="flex justify-end">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Nueva Evaluación
          </button>
        </div>

        {/* ── KPIs (solo si hay evaluaciones) ─────────────────────────────── */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Evaluaciones', value: kpis.total,      icon: 'assignment',      color: 'slate' },
              { label: 'Completadas',  value: kpis.completed,  icon: 'task_alt',        color: 'emerald' },
              { label: 'SAIL promedio',value: SAIL_INFO[kpis.avgSail - 1]?.roman || '—', icon: 'analytics', color: 'orange' },
              { label: 'GRC máximo',   value: kpis.maxGrc,     icon: 'warning',         color: kpis.maxGrc <= 3 ? 'emerald' : kpis.maxGrc <= 5 ? 'amber' : 'red' },
            ].map(k => {
              const colorMap = {
                slate:   'bg-slate-50   border-slate-200   text-slate-700',
                emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                orange:  'bg-orange-50  border-orange-200  text-orange-700',
                amber:   'bg-amber-50   border-amber-200   text-amber-700',
                red:     'bg-red-50     border-red-200     text-red-700',
              };
              const cls = colorMap[k.color] || colorMap.slate;
              return (
                <div key={k.label} className={`border rounded-2xl p-4 flex items-center gap-3 ${cls}`}>
                  <span className="material-symbols-outlined text-2xl opacity-60" aria-hidden="true">{k.icon}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{k.label}</p>
                    <p className="text-2xl font-black leading-none mt-0.5">{k.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Leyenda SAIL (siempre visible, compacta) ────────────────────── */}
        <Accordion title="Escala SAIL — ¿Qué significa mi nivel?" icon="legend_toggle" badge="referencia">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
            {SAIL_INFO.map(s => {
              const c = SAIL_COLOR_MAP[s.color];
              return (
                <div key={s.level} className={`p-3 rounded-xl border ${c.bg} ${c.border} text-center`}>
                  <div className={`size-7 rounded-full flex items-center justify-center text-sm font-black text-white mx-auto mb-2 ${c.dot}`}>
                    {s.roman}
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-wide ${c.text}`}>{s.label}</p>
                  <p className={`text-[10px] ${c.text} opacity-70 mt-1 leading-snug`}>{s.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(ARC_INFO).map(([key, info]) => {
              const c = SAIL_COLOR_MAP[info.color] || SAIL_COLOR_MAP.emerald;
              return (
                <div key={key} className={`p-2.5 rounded-xl border flex items-start gap-2 ${c.bg} ${c.border}`}>
                  <span className={`text-xs font-black shrink-0 ${c.text}`}>{key}</span>
                  <p className={`text-[10px] ${c.text} opacity-70 leading-snug`}>{info.desc}</p>
                </div>
              );
            })}
          </div>
        </Accordion>

        {/* ── Qué es SORA (accordion) ──────────────────────────────────────── */}
        <Accordion title="¿Qué es la metodología SORA?" icon="help_outline">
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">SORA</strong> (Specific Operations Risk Assessment) es el método de evaluación de
              riesgo definido por JARUS (Joint Authorities for Rulemaking on Unmanned Systems)
              y adoptado por la Aerocivil Colombia bajo la RAC 100 para operaciones UAS en
              categoría Específica.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  step: '01',
                  title: 'Riesgo Terrestre (GRC)',
                  icon: 'landscape',
                  desc: 'Evalúa la probabilidad de causar daño a personas en tierra. Depende del tamaño de la aeronave, el escenario (rural/urbano/BVLOS) y las mitigaciones aplicadas (M1, M2, M3).',
                  color: 'amber',
                },
                {
                  step: '02',
                  title: 'Riesgo Aéreo (ARC)',
                  icon: 'flight',
                  desc: 'Evalúa la probabilidad de colisión con aeronaves tripuladas. Depende de la clase de espacio aéreo (ICAO A–G) y la altura de operación. Se reduce con mitigaciones estratégicas.',
                  color: 'blue',
                },
                {
                  step: '03',
                  title: 'Nivel SAIL',
                  icon: 'analytics',
                  desc: 'El resultado final: combina GRC y ARC en un número del I al VI. Determina qué Objetivos de Seguridad Operacional (OSOs) debes demostrar ante la Aerocivil.',
                  color: 'orange',
                },
              ].map(item => {
                const col = { amber: 'bg-amber-50 border-amber-200 text-amber-700', blue: 'bg-blue-50 border-blue-200 text-blue-700', orange: 'bg-orange-50 border-orange-200 text-orange-700' }[item.color];
                return (
                  <div key={item.step} className={`p-4 rounded-2xl border ${col}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">{item.icon}</span>
                      <span className="text-xs font-black uppercase tracking-widest opacity-60">Paso {item.step}</span>
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-tight mb-1.5">{item.title}</h4>
                    <p className="text-xs leading-relaxed opacity-80">{item.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-slate-400 text-base mt-0.5" aria-hidden="true">info</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                BitaFly implementa el motor SORA JARUS v2.0. El resultado de esta herramienta
                es orientativo — la aprobación final corresponde a la UAEAC / Aerocivil Colombia.
                Guarda siempre el PDF de la evaluación con tu expediente de certificación.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Lista de evaluaciones ────────────────────────────────────────── */}
        <section aria-label="Evaluaciones SORA registradas">
          {loadingA ? (
            <div className="py-16 text-center" role="status" aria-label="Cargando evaluaciones">
              <span className="material-symbols-outlined animate-spin text-4xl text-slate-200">progress_activity</span>
              <p className="text-slate-300 font-black uppercase text-xs tracking-widest mt-3">Cargando evaluaciones...</p>
            </div>
          ) : assessments.length === 0 ? (
            /* ── Empty state con "cómo funciona" ─────────────────────────── */
            <div className="py-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] px-6 md:px-10">
              <div className="max-w-lg mx-auto text-center space-y-6">
                <div>
                  <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3" aria-hidden="true">verified_user</span>
                  <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No hay evaluaciones SORA</p>
                  <p className="text-slate-400 text-sm font-medium mt-1">
                    Crea la primera para obtener tu nivel SAIL y los OSOs requeridos.
                  </p>
                </div>

                {/* Mini "how it works" */}
                <ol className="space-y-3 text-left" aria-label="Pasos del análisis SORA">
                  {[
                    { n: '1', icon: 'edit_note',     label: 'Describe la operación', desc: 'Nombre, fecha, aeronave y piloto.' },
                    { n: '2', icon: 'landscape',     label: 'Calcula el GRC',        desc: 'Dimensión del UA, escenario, mitigaciones.' },
                    { n: '3', icon: 'flight',        label: 'Evalúa el ARC',         desc: 'Altura y clase de espacio aéreo.' },
                    { n: '4', icon: 'analytics',     label: 'Obtén tu SAIL',         desc: 'I a VI con los OSOs obligatorios.' },
                  ].map(s => (
                    <li key={s.n} className="flex items-start gap-3">
                      <div className="size-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                        {s.n}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{s.label}</p>
                        <p className="text-xs text-slate-400">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <button
                  onClick={() => setShowWizard(true)}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-slate-900 transition-all active:scale-95"
                >
                  Iniciar mi primera evaluación
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {assessments.map(a => (
                  <AssessmentCard key={a.id} a={a} fmtDate={fmtDate} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <caption className="sr-only">Evaluaciones SORA de la organización</caption>
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                      <th scope="col" className="px-5 py-4">Operación</th>
                      <th scope="col" className="px-4 py-4">Fecha</th>
                      <th scope="col" className="px-4 py-4">Aeronave</th>
                      <th scope="col" className="px-4 py-4">GRC</th>
                      <th scope="col" className="px-4 py-4">ARC</th>
                      <th scope="col" className="px-4 py-4">SAIL</th>
                      <th scope="col" className="px-4 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assessments.map(a => (
                      <AssessmentRow key={a.id} a={a} fmtDate={fmtDate} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </div>
    </>
  );
}
