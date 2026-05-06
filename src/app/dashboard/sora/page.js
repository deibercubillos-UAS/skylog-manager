'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { sailRoman, sailColor } from '@/lib/soraEngine';

const SoraWizard = dynamic(() => import('@/components/sora/SoraWizard'), { ssr: false });

const ARC_COLORS = {
  'ARC-a': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'ARC-b': 'bg-blue-100    text-blue-700    border-blue-200',
  'ARC-c': 'bg-amber-100   text-amber-700   border-amber-200',
  'ARC-d': 'bg-red-100     text-red-700     border-red-200',
};

// ── Chips fuera del render para evitar recreación en cada ciclo ──────────────
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

export default function SoraPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [loadingA,    setLoadingA]    = useState(true);

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

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      {showWizard && (
        <SoraWizard
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); loadAssessments(); }}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6 text-left animate-in fade-in duration-500 pb-20">

        {/* ── Page header ─────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Análisis SORA</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Metodología JARUS v2.0 · Cumplimiento RAC 100
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Nueva Evaluación
          </button>
        </header>

        {/* ══ Evaluaciones SORA ════════════════════════════════ */}
        <div className="space-y-4">
            {loadingA ? (
              <div className="py-16 text-center text-slate-300 font-black text-xs uppercase animate-pulse tracking-widest">
                Cargando evaluaciones...
              </div>
            ) : assessments.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">shield_check</span>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                  No hay evaluaciones SORA registradas
                </p>
                <p className="text-slate-300 text-xs font-medium mt-1 mb-5">
                  Crea la primera evaluación para obtener tu nivel SAIL
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 hover:bg-slate-900 transition-all active:scale-95"
                >
                  Iniciar Evaluación
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {assessments.map(a => {
                    const sc = sailColor(a.sail_level);
                    return (
                      <div key={a.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 uppercase truncate">{a.operation_name}</p>
                            {a.location_name && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.location_name}</p>}
                          </div>
                          <span className={`shrink-0 px-3 py-1 rounded-xl text-sm font-black border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {sailRoman(a.sail_level)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <GrcBadge value={a.final_grc} />
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${ARC_COLORS[a.final_arc] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {a.final_arc}
                          </span>
                          <StatusChip status={a.status} />
                        </div>
                        <p className="text-xs text-slate-400">
                          {fmtDate(a.operation_date)}
                          {a.aircraft && <span> · {a.aircraft.model}</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                        <th className="px-5 py-4">Operación</th>
                        <th className="px-4 py-4">Fecha</th>
                        <th className="px-4 py-4">Aeronave</th>
                        <th className="px-4 py-4">GRC</th>
                        <th className="px-4 py-4">ARC</th>
                        <th className="px-4 py-4">SAIL</th>
                        <th className="px-4 py-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assessments.map(a => {
                        const sc = sailColor(a.sail_level);
                        return (
                          <tr key={a.id} className="hover:bg-orange-50/30 transition-all text-xs font-medium text-slate-700">
                            <td className="px-5 py-4">
                              <p className="font-black text-slate-900 text-sm">{a.operation_name}</p>
                              {a.location_name && <p className="text-xs text-slate-400 mt-0.5">{a.location_name}</p>}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-slate-500">{fmtDate(a.operation_date)}</td>
                            <td className="px-4 py-4">
                              {a.aircraft
                                ? <><span className="font-black text-slate-900">{a.aircraft.model}</span><br/><span className="text-xs text-slate-400 font-mono">{a.aircraft.serial_number}</span></>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-4"><GrcBadge value={a.final_grc} /></td>
                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${ARC_COLORS[a.final_arc] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

      </div>
    </>
  );
}
