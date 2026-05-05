'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
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
  const [tab,        setTab]        = useState('assessments');
  const [showWizard, setShowWizard] = useState(false);

  const [assessments, setAssessments] = useState([]);
  const [loadingA,    setLoadingA]    = useState(true);

  const [templates, setTemplates] = useState([]);
  const [checked,   setChecked]   = useState({});
  const [loadingC,  setLoadingC]  = useState(false);

  const loadAssessments = async () => {
    setLoadingA(true);
    try {
      const res  = await fetch('/api/sora/assessments');
      const data = await res.json();
      setAssessments(Array.isArray(data) ? data : []);
    } catch { setAssessments([]); }
    finally  { setLoadingA(false); }
  };

  const loadChecklist = async () => {
    setLoadingC(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res  = await fetch(`/api/sora?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally  { setLoadingC(false); }
  };

  useEffect(() => { loadAssessments(); }, []);
  useEffect(() => {
    if (tab === 'checklist' && templates.length === 0) loadChecklist();
  }, [tab]);

  const grouped      = useMemo(() => templates.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {}), [templates]);
  const totalItems   = templates.length;
  const checkedItems = Object.values(checked).filter(Boolean).length;
  const progress     = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const TABS = [
    { key: 'assessments', label: 'Evaluaciones SORA', icon: 'shield_check' },
    { key: 'checklist',   label: 'Verificación',       icon: 'checklist'    },
  ];

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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/dashboard/safety-config"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              Barreras
            </Link>
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Nueva Evaluación
            </button>
          </div>
        </header>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-none sm:px-6 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                tab === t.key ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              <span className="hidden xs:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══ TAB: Assessments ══════════════════════════════════ */}
        {tab === 'assessments' && (
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
        )}

        {/* ══ TAB: Checklist ═══════════════════════════════════ */}
        {tab === 'checklist' && (
          <div className="space-y-8">
            {/* Progress monitor */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6 md:gap-8">
              <div className="size-24 rounded-full border-8 border-slate-100 flex items-center justify-center relative shrink-0">
                <svg className="size-full -rotate-90 absolute" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#ec5b13" strokeWidth="8"
                    strokeDasharray="251" strokeDashoffset={251 - (251 * progress) / 100}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="text-xl font-black text-slate-900">{progress}%</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Estado de Mitigaciones</h3>
                <p className="text-sm text-slate-500 font-medium">
                  {progress < 100
                    ? `Faltan ${totalItems - checkedItems} barreras por validar.`
                    : 'Todas las mitigaciones validadas exitosamente.'}
                </p>
              </div>
              {progress === 100 && (
                <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-500/20 animate-bounce shrink-0">
                  Operación Autorizada
                </div>
              )}
            </div>

            {loadingC ? (
              <div className="py-8 text-center text-slate-300 font-black text-xs uppercase animate-pulse">
                Cargando lista de verificación...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {Object.keys(grouped).map(cat => (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-orange-500 tracking-[0.3em] ml-2">{cat}</h4>
                    <div className="space-y-2">
                      {grouped[cat].map(item => (
                        <label key={item.id} className={`flex items-center justify-between p-4 bg-white border rounded-2xl transition-all cursor-pointer ${
                          checked[item.id]
                            ? 'border-emerald-500 ring-4 ring-emerald-500/5 bg-emerald-50/30'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}>
                          <div className="text-left pr-4">
                            <p className={`text-xs font-bold ${checked[item.id] ? 'text-emerald-700' : 'text-slate-700'}`}>{item.label}</p>
                            <p className="text-xs font-black text-slate-400 uppercase mt-0.5">Impacto: {item.score} pts</p>
                          </div>
                          <input
                            type="checkbox"
                            className="size-6 rounded-lg text-orange-500 border-slate-300 focus:ring-0 cursor-pointer shrink-0"
                            onChange={e => setChecked({ ...checked, [item.id]: e.target.checked })}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay barreras configuradas</p>
                    <Link href="/dashboard/safety-config"
                      className="text-orange-500 text-xs font-black underline mt-2 block uppercase">
                      Definir barreras ahora
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
