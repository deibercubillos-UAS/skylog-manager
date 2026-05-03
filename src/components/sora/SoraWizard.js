'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  calcIntrinsicGRC, calcFinalGRC, calcInitialARC, calcFinalARC,
  calcSAIL, sailRoman, sailColor, getOSOsForSAIL,
  UA_DIMENSIONS, SCENARIO_LABELS, AIRSPACE_CLASSES, AIRSPACE_LABELS,
  ARC_DESCRIPTIONS, MITIGATION_LABELS, M1_DESCRIPTIONS, M2_DESCRIPTIONS,
  ROBUSTNESS_LABELS, ROBUSTNESS_COLORS, SAIL_TABLE_ROWS,
  getGRCMatrix,
} from '@/lib/soraEngine';

const STEPS = [
  { id: 1, label: 'Identificación'   },
  { id: 2, label: 'Riesgo Terrestre' },
  { id: 3, label: 'Mitigaciones'     },
  { id: 4, label: 'Riesgo Aéreo'     },
  { id: 5, label: 'Mitigaciones'     },
  { id: 6, label: 'SAIL + OSOs'      },
];

const ARC_COLS = ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'];
const SAIL_ROMANS = ['I','II','III','IV','V','VI'];

// ─── Helper: badge ─────────────────────────────────────────────────────────
function RobustnessTag({ code }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ROBUSTNESS_COLORS[code] || 'bg-slate-100 text-slate-400'}`}>
      {ROBUSTNESS_LABELS[code] || code}
    </span>
  );
}

// ─── GRC color ──────────────────────────────────────────────────────────────
function grcColor(v) {
  if (v <= 3) return 'bg-emerald-100 text-emerald-800';
  if (v <= 5) return 'bg-amber-100   text-amber-800';
  if (v <= 7) return 'bg-orange-100  text-orange-800';
  return 'bg-red-100 text-red-800';
}

export default function SoraWizard({ onClose, onSaved }) {
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [aircraft, setAircraft] = useState([]);
  const [pilots,   setPilots]   = useState([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Step 1
    operation_name: '',
    operation_date: new Date().toISOString().split('T')[0],
    aircraft_id:    '',
    pilot_id:       '',
    location_name:  '',
    notes:          '',
    // Step 2
    ua_dimension: '<1m',
    op_scenario:  'rural_vlos',
    // Step 3
    m1_population: 'none',
    m2_effect:     'none',
    m3_emergency:  false,
    // Step 4
    op_height_m:    30,
    airspace_class: 'G',
    // Step 5
    strategic_m1: false,
    strategic_m2: false,
    strategic_m3: false,
    // Step 6
    oso_checklist: {},
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Calculated values ─────────────────────────────────────────────────────
  const intrinsic_grc = useMemo(
    () => calcIntrinsicGRC(form.ua_dimension, form.op_scenario),
    [form.ua_dimension, form.op_scenario]
  );
  const final_grc = useMemo(
    () => calcFinalGRC(intrinsic_grc, form.m1_population, form.m2_effect, form.m3_emergency),
    [intrinsic_grc, form.m1_population, form.m2_effect, form.m3_emergency]
  );
  const initial_arc = useMemo(
    () => calcInitialARC(form.op_height_m, form.airspace_class),
    [form.op_height_m, form.airspace_class]
  );
  const final_arc = useMemo(
    () => calcFinalARC(initial_arc, form.strategic_m1, form.strategic_m2, form.strategic_m3),
    [initial_arc, form.strategic_m1, form.strategic_m2, form.strategic_m3]
  );
  const sail_level = useMemo(() => calcSAIL(final_grc, final_arc), [final_grc, final_arc]);
  const osos        = useMemo(() => getOSOsForSAIL(sail_level),    [sail_level]);
  const grcMatrix   = useMemo(() => getGRCMatrix(), []);

  // ── Load aircraft + pilots ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: ac }, { data: pi }] = await Promise.all([
        supabase.from('aircraft').select('id,model,serial_number').order('model'),
        supabase.from('pilots').select('id,name').order('name'),
      ]);
      setAircraft(ac || []);
      setPilots(pi   || []);
    }
    load();
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const canNext = () => step === 1 ? form.operation_name.trim().length > 0 : true;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sora/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          intrinsic_grc,
          final_grc,
          initial_arc,
          final_arc,
          sail_level,
          status: 'complete',
          sail_complete: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const InputLabel = ({ children, required }) => (
    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 block">
      {children} {required && <span className="text-orange-500">*</span>}
    </label>
  );

  const inputCls = 'w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all';
  const selectCls = inputCls + ' cursor-pointer';

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 1: Identificación ──────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <InputLabel required>Nombre de la operación</InputLabel>
              <input
                className={inputCls}
                placeholder="Ej: Inspección Línea Eléctrica Norte — Mayo 2025"
                value={form.operation_name}
                onChange={e => set('operation_name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <InputLabel>Fecha prevista</InputLabel>
                <input type="date" className={inputCls}
                  value={form.operation_date}
                  onChange={e => set('operation_date', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <InputLabel>Lugar</InputLabel>
                <input className={inputCls} placeholder="Municipio / zona"
                  value={form.location_name}
                  onChange={e => set('location_name', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <InputLabel>Aeronave UAS</InputLabel>
                <select className={selectCls} value={form.aircraft_id} onChange={e => set('aircraft_id', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {aircraft.map(a => (
                    <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <InputLabel>Piloto Remoto (PIC)</InputLabel>
                <select className={selectCls} value={form.pilot_id} onChange={e => set('pilot_id', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {pilots.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <InputLabel>Notas</InputLabel>
              <textarea rows={2} className={inputCls + ' resize-none'} placeholder="Descripción adicional de la operación..."
                value={form.notes} onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        );

      // ── Step 2: GRC Intrínseco ──────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6">
            {/* Dimension selector */}
            <div>
              <InputLabel required>Dimensión característica de la UA</InputLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {UA_DIMENSIONS.map(dim => (
                  <button key={dim} type="button"
                    onClick={() => set('ua_dimension', dim)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${
                      form.ua_dimension === dim
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >{dim}</button>
                ))}
              </div>
            </div>

            {/* Scenario selector */}
            <div>
              <InputLabel required>Escenario operacional</InputLabel>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {Object.entries(SCENARIO_LABELS).map(([key, lbl]) => (
                  <button key={key} type="button"
                    onClick={() => set('op_scenario', key)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-left text-sm font-bold transition-all ${
                      form.op_scenario === key
                        ? 'bg-orange-50 border-2 border-orange-500 text-orange-700'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>{lbl}</span>
                    {form.op_scenario === key && (
                      <span className="material-symbols-outlined text-orange-500 text-base">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* GRC Matrix */}
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Matriz GRC Intrínseco</p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-[9px] font-black text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-slate-400 uppercase">UA / Escenario</th>
                      {['Disp.VLOS','Disp.BVLOS','Pobl.VLOS','Pobl.BVLOS','Conc.VLOS','Conc.BVLOS'].map(h => (
                        <th key={h} className="px-2 py-2 text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {UA_DIMENSIONS.map((dim, ri) => (
                      <tr key={dim} className={form.ua_dimension === dim ? 'bg-orange-50' : 'hover:bg-slate-50'}>
                        <td className={`px-3 py-2 font-black text-left ${form.ua_dimension === dim ? 'text-orange-600' : 'text-slate-700'}`}>{dim}</td>
                        {grcMatrix[ri].map((val, ci) => {
                          const isSelected = form.ua_dimension === dim &&
                            Object.keys(SCENARIO_LABELS)[ci] === form.op_scenario;
                          return (
                            <td key={ci} className={`px-2 py-2 rounded transition-all ${
                              isSelected
                                ? 'bg-orange-500 text-white font-black text-sm'
                                : grcColor(val) + ' text-xs'
                            }`}>{val}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Result */}
            <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${grcColor(intrinsic_grc)} border-current/20`}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70">GRC Intrínseco calculado</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">Riesgo terrestre sin mitigaciones aplicadas</p>
              </div>
              <span className="text-3xl font-black">{intrinsic_grc}</span>
            </div>
          </div>
        );

      // ── Step 3: Mitigaciones Terrestres ────────────────────────────────
      case 3: {
        const MitRow = ({ field, title, desc, descs }) => (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-700">{title}</p>
              <p className="text-[9px] text-slate-400 font-medium">{desc}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(MITIGATION_LABELS).map(lvl => (
                <button key={lvl} type="button"
                  onClick={() => set(field, lvl)}
                  className={`p-3 rounded-2xl text-left transition-all border ${
                    form[field] === lvl
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase ${form[field] === lvl ? 'text-orange-600' : 'text-slate-700'}`}>
                    {MITIGATION_LABELS[lvl]}
                  </p>
                  <p className="text-[8px] text-slate-400 mt-1 leading-tight">{descs[lvl]}</p>
                </button>
              ))}
            </div>
          </div>
        );

        return (
          <div className="space-y-6">
            <MitRow
              field="m1_population"
              title="M1 — Control de densidad poblacional"
              desc="Medidas para reducir la exposición de personas en el área de operación"
              descs={M1_DESCRIPTIONS}
            />
            <MitRow
              field="m2_effect"
              title="M2 — Reducción del efecto del UA sobre personas"
              desc="Características del UA o equipamiento que reducen el daño potencial"
              descs={M2_DESCRIPTIONS}
            />

            <label className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
              form.m3_emergency ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-400'
            }`}>
              <input type="checkbox" className="mt-0.5 size-5 rounded text-orange-500 focus:ring-0 cursor-pointer"
                checked={form.m3_emergency}
                onChange={e => set('m3_emergency', e.target.checked)}
              />
              <div>
                <p className={`text-[10px] font-black uppercase ${form.m3_emergency ? 'text-orange-600' : 'text-slate-700'}`}>
                  M3 — Plan de Respuesta de Emergencia documentado
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                  Procedimientos de emergencia operacional definidos, documentados y conocidos por la tripulación (−1 al GRC)
                </p>
              </div>
            </label>

            {/* Result summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'GRC Intrínseco', val: intrinsic_grc, sub: 'Sin mitigaciones' },
                { label: 'Δ Mitigaciones', val: final_grc - intrinsic_grc, sub: 'M1 + M2 + M3', sign: true },
                { label: 'GRC Final', val: final_grc, sub: 'Con mitigaciones', big: true },
              ].map(({ label, val, sub, sign, big }) => (
                <div key={label} className={`p-4 rounded-2xl text-center border ${big ? grcColor(final_grc) + ' border-current/30' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[8px] font-black uppercase opacity-70">{label}</p>
                  <p className={`font-black ${big ? 'text-3xl' : 'text-xl'} mt-1`}>
                    {sign && val <= 0 ? val : val}
                  </p>
                  <p className="text-[8px] opacity-60 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── Step 4: ARC Inicial ─────────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <InputLabel required>Altura operacional (m AGL)</InputLabel>
                <input
                  type="number" min={0} max={5000} step={5}
                  className={inputCls}
                  value={form.op_height_m}
                  onChange={e => set('op_height_m', Number(e.target.value))}
                />
                <p className="text-[8px] text-slate-400 ml-1">Altura sobre el nivel del suelo (AGL) en metros</p>
              </div>
              <div className="space-y-1">
                <InputLabel required>Clase de espacio aéreo (ICAO)</InputLabel>
                <select className={selectCls}
                  value={form.airspace_class}
                  onChange={e => set('airspace_class', e.target.value)}
                >
                  {AIRSPACE_CLASSES.map(c => (
                    <option key={c} value={c}>{AIRSPACE_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ARC explanation cards */}
            <div className="grid grid-cols-2 gap-3">
              {ARC_COLS.map(arc => {
                const isSelected = arc === initial_arc;
                const colors = {
                  'ARC-a': 'emerald', 'ARC-b': 'blue',
                  'ARC-c': 'amber',   'ARC-d': 'red',
                };
                const c = colors[arc];
                return (
                  <div key={arc} className={`p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? `border-${c}-500 bg-${c}-50`
                      : 'border-slate-200 bg-white opacity-50'
                  }`}>
                    <p className={`text-[10px] font-black uppercase ${isSelected ? `text-${c}-700` : 'text-slate-500'}`}>{arc}</p>
                    <p className="text-[8px] text-slate-500 mt-1 leading-snug">{ARC_DESCRIPTIONS[arc]}</p>
                    {isSelected && (
                      <span className={`material-symbols-outlined text-${c}-500 text-sm mt-1 block`}>check_circle</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${
              initial_arc === 'ARC-a' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
              initial_arc === 'ARC-b' ? 'bg-blue-50    border-blue-300    text-blue-800'    :
              initial_arc === 'ARC-c' ? 'bg-amber-50   border-amber-300   text-amber-800'   :
                                        'bg-red-50     border-red-300     text-red-800'
            }`}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70">ARC Inicial calculado</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{ARC_DESCRIPTIONS[initial_arc]}</p>
              </div>
              <span className="text-2xl font-black">{initial_arc}</span>
            </div>
          </div>
        );

      // ── Step 5: Mitigaciones Estratégicas ──────────────────────────────
      case 5: {
        const StrategicCheck = ({ field, title, desc }) => (
          <label className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
            form[field] ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-400'
          }`}>
            <input type="checkbox"
              className="mt-0.5 size-5 rounded text-orange-500 focus:ring-0 cursor-pointer"
              checked={form[field]}
              onChange={e => set(field, e.target.checked)}
            />
            <div>
              <p className={`text-[10px] font-black uppercase ${form[field] ? 'text-orange-600' : 'text-slate-700'}`}>{title}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{desc}</p>
            </div>
          </label>
        );

        const arcLevel = arc => ARC_COLS.indexOf(arc);
        const reduction = arcLevel(initial_arc) - arcLevel(final_arc);

        return (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-3 mb-2">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                ARC inicial: <span className="text-slate-700">{initial_arc}</span>
                {' · '}Cada mitigación activa reduce el ARC en un nivel (máx. 2)
              </p>
            </div>

            <StrategicCheck
              field="strategic_m1"
              title="M1 — Geofencing / Restricción de espacio aéreo"
              desc="Operación en zona con espacio aéreo restringido o segregado de forma permanente o temporal (TFR, geofencing activo)"
            />
            <StrategicCheck
              field="strategic_m2"
              title="M2 — Capacidad de Detección y Evitación (DAA)"
              desc="El UA está equipado con sistema DAA certificado capaz de detectar y evitar aeronaves tripuladas"
            />
            <StrategicCheck
              field="strategic_m3"
              title="M3 — Espacio aéreo de baja densidad verificado"
              desc="Declaración formal de baja densidad de tráfico aéreo en el área y franja horaria específica de operación"
            />

            {/* ARC flow visual */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">ARC Inicial</p>
                <p className="text-xl font-black text-slate-700 mt-1">{initial_arc}</p>
              </div>
              <div className="flex-1 flex items-center justify-center gap-1">
                {reduction > 0 ? (
                  <>
                    <span className="text-emerald-500 font-black text-sm">−{reduction}</span>
                    <span className="material-symbols-outlined text-emerald-500">arrow_forward</span>
                  </>
                ) : (
                  <span className="text-slate-300 font-black">→</span>
                )}
              </div>
              <div className={`text-center p-3 rounded-xl border-2 ${
                final_arc === 'ARC-a' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                final_arc === 'ARC-b' ? 'bg-blue-50 border-blue-400 text-blue-800' :
                final_arc === 'ARC-c' ? 'bg-amber-50 border-amber-400 text-amber-800' :
                                        'bg-red-50 border-red-400 text-red-800'
              }`}>
                <p className="text-[8px] font-black uppercase opacity-70">ARC Final</p>
                <p className="text-xl font-black mt-1">{final_arc}</p>
              </div>
            </div>
          </div>
        );
      }

      // ── Step 6: SAIL + OSO Checklist ────────────────────────────────────
      case 6: {
        const sc = sailColor(sail_level);
        const grouped = osos.reduce((acc, oso) => {
          if (!acc[oso.category]) acc[oso.category] = [];
          acc[oso.category].push(oso);
          return acc;
        }, {});

        return (
          <div className="space-y-6">
            {/* SAIL Result */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`col-span-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 ${sc.bg} ${sc.border}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest ${sc.text} opacity-70`}>Nivel SAIL</p>
                <p className={`text-6xl font-black ${sc.text} mt-1`}>{sailRoman(sail_level)}</p>
                <p className={`text-[9px] font-black uppercase ${sc.text} opacity-60 mt-1`}>
                  {sail_level <= 2 ? 'Bajo' : sail_level <= 4 ? 'Moderado' : 'Elevado'}
                </p>
              </div>
              <div className="col-span-2 space-y-2 text-[10px] font-medium text-slate-600 flex flex-col justify-center">
                {[
                  ['GRC Final',  final_grc,  '', 'Riesgo terrestre con mitigaciones'],
                  ['ARC Final',  final_arc,  '', 'Riesgo aéreo con mitigaciones estratégicas'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-2">
                    <span className="font-black text-slate-500 uppercase text-[9px]">{k}</span>
                    <span className="font-black text-slate-800 text-base">{v}</span>
                  </div>
                ))}
                {/* Mini SAIL matrix */}
                <div className="mt-1 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-[8px] font-black text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-2 py-1.5 text-slate-400">GRC\ARC</th>
                        {ARC_COLS.map(a => (
                          <th key={a} className={`px-2 py-1.5 ${a === final_arc ? 'bg-orange-100 text-orange-600' : 'text-slate-500'}`}>{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SAIL_TABLE_ROWS.map(({ label, key }) => {
                        const grcMatch = (key === 2 && final_grc <= 2) || (key === 7 && final_grc >= 7) || key === final_grc;
                        return (
                          <tr key={key} className={grcMatch ? 'bg-orange-50' : ''}>
                            <td className={`px-2 py-1.5 text-left ${grcMatch ? 'text-orange-600 font-black' : 'text-slate-500'}`}>{label}</td>
                            {ARC_COLS.map((a, ci) => {
                              const sv = calcSAIL(key, a);
                              const highlight = grcMatch && a === final_arc;
                              return (
                                <td key={ci} className={`px-2 py-1.5 ${
                                  highlight
                                    ? 'bg-orange-500 text-white rounded font-black'
                                    : sailColor(sv).text + ' opacity-60'
                                }`}>{SAIL_ROMANS[sv - 1]}</td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* OSO Checklist */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
                OSOs requeridos para SAIL {sailRoman(sail_level)} — {osos.length} objetivos
              </p>
              <div className="space-y-6 max-h-80 overflow-y-auto pr-1">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {items.map(oso => (
                        <label key={oso.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          form.oso_checklist[oso.id]
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-slate-200 hover:border-slate-400'
                        }`}>
                          <input type="checkbox"
                            className="size-4 rounded text-emerald-500 focus:ring-0 flex-shrink-0 cursor-pointer"
                            checked={!!form.oso_checklist[oso.id]}
                            onChange={e => set('oso_checklist', { ...form.oso_checklist, [oso.id]: e.target.checked })}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[9px] font-black uppercase ${form.oso_checklist[oso.id] ? 'text-emerald-700 line-through opacity-60' : 'text-slate-700'}`}>
                              {oso.id} — {oso.label}
                            </p>
                          </div>
                          <RobustnessTag code={oso.robustness} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* OSO progress */}
              {osos.length > 0 && (() => {
                const checked  = osos.filter(o => form.oso_checklist[o.id]).length;
                const mandatory = osos.filter(o => !['O'].includes(o.robustness));
                const mandatoryChecked = mandatory.filter(o => form.oso_checklist[o.id]).length;
                return (
                  <div className="mt-3 flex items-center gap-4 bg-slate-50 rounded-xl p-3">
                    <div className="flex-1">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${(checked / osos.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">
                      {checked}/{osos.length} verificados · {mandatoryChecked}/{mandatory.length} obligatorios
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">shield_check</span>
              Evaluación SORA — JARUS v2.0
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Paso {step} de {STEPS.length} — {STEPS[step - 1].label}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* ── Step indicator ─────────────────────────────────── */}
        <div className="px-8 pt-4 pb-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`size-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-all ${
                  step === s.id
                    ? 'bg-orange-600 text-white ring-4 ring-orange-500/20'
                    : step > s.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.id
                    ? <span className="material-symbols-outlined text-[10px]">check</span>
                    : s.id}
                </div>
                <span className={`text-[8px] font-black uppercase truncate hidden md:block ${
                  step === s.id ? 'text-orange-600' : step > s.id ? 'text-emerald-600' : 'text-slate-300'
                }`}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded-full ${step > s.id ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {renderStep()}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose?.()}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => canNext() && setStep(s => s + 1)}
              disabled={!canNext()}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-900 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              Siguiente
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-60 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
