'use client';

import { useState } from 'react';
import { useDemo } from '@/lib/demoStore';
import Icon from '@/components/Icon';

// Catálogo geográfico reducido (Colombia) + coordenadas aprox. del municipio.
const GEO = {
  'Cundinamarca': { 'Bogotá D.C.': [4.711, -74.072], 'Soacha': [4.579, -74.216], 'Zipaquirá': [5.027, -73.999], 'Facatativá': [4.812, -74.355] },
  'Antioquia':    { 'Medellín': [6.244, -75.581], 'Rionegro': [6.155, -75.374], 'Bello': [6.337, -75.557], 'Apartadó': [7.883, -76.625] },
  'Valle del Cauca': { 'Cali': [3.452, -76.532], 'Yumbo': [3.585, -76.495], 'Palmira': [3.540, -76.303], 'Buga': [3.901, -76.298] },
  'Boyacá':       { 'Tunja': [5.539, -73.367], 'Sogamoso': [5.714, -72.934], 'Duitama': [5.827, -73.034], 'Chiquinquirá': [5.617, -73.818] },
  'Tolima':       { 'Ibagué': [4.439, -75.232], 'Espinal': [4.150, -74.886], 'Melgar': [4.204, -74.641], 'Honda': [5.196, -74.737] },
  'Santander':    { 'Bucaramanga': [7.119, -73.122], 'Floridablanca': [7.063, -73.087], 'Girón': [7.069, -73.169], 'Barrancabermeja': [7.066, -73.855] },
};

const OP_TYPES = [
  'Inspección de infraestructura',
  'Topografía / Cartografía',
  'Agricultura de precisión',
  'Fotografía / Video',
  'Vigilancia / Seguridad',
];
const RAC_CATEGORIES = ['Abierta · A1', 'Abierta · A2', 'Abierta · A3', 'Específica (SORA/PDRA)'];
const GEO_TYPES = ['Polígono', 'Círculo', 'Punto'];

export default function ScheduleMissionModal({ open, onClose, onDone }) {
  const { pilots, addMission } = useDemo();
  const activos = pilots.filter((p) => p.status === 'activo');

  const [f, setF] = useState({
    name: '', pilotId: activos[0]?.id || '', opType: OP_TYPES[0], racCategory: RAC_CATEGORIES[0],
    departamento: 'Cundinamarca', municipio: 'Bogotá D.C.', date: '', takeoff: '08:00',
    geoType: 'Polígono', altitude: 120, notes: '',
  });
  const [err, setErr] = useState('');

  if (!open) return null;
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const municipios = Object.keys(GEO[f.departamento] || {});

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.pilotId || !f.date) { setErr('Completa nombre, piloto y fecha.'); return; }
    const center = GEO[f.departamento]?.[f.municipio] || null;
    const r = addMission({ ...f, center });
    if (r.ok) { onDone?.(f.name); onClose(); }
    else setErr('No se pudo programar la misión.');
  };

  const field = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)]';
  const lbl = 'text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <Icon name="event_available" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
          <h2 className="text-base font-black" style={{ color: 'var(--brand-navy)' }}>Programar misión</h2>
          <button onClick={onClose} className="ml-auto size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Operación */}
          <div>
            <label className={lbl}>Nombre de la operación *</label>
            <input className={field} value={f.name} onChange={(e) => set('name', e.target.value)}
                   placeholder="Inspección línea 230kV — Tramo B" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Piloto (PIC) *</label>
              <select className={field} value={f.pilotId} onChange={(e) => set('pilotId', e.target.value)}>
                {activos.length === 0 && <option value="">Sin pilotos activos</option>}
                {activos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Tipo de operación *</label>
              <select className={field} value={f.opType} onChange={(e) => set('opType', e.target.value)}>
                {OP_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Categoría RAC 100 *</label>
              <select className={field} value={f.racCategory} onChange={(e) => set('racCategory', e.target.value)}>
                {RAC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Tipo de zona</label>
              <select className={field} value={f.geoType} onChange={(e) => set('geoType', e.target.value)}>
                {GEO_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Ubicación */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Departamento *</label>
              <select className={field} value={f.departamento}
                      onChange={(e) => { const d = e.target.value; set('departamento', d); set('municipio', Object.keys(GEO[d])[0]); }}>
                {Object.keys(GEO).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Municipio *</label>
              <select className={field} value={f.municipio} onChange={(e) => set('municipio', e.target.value)}>
                {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha / hora / altitud */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Fecha *</label>
              <input type="date" className={field} value={f.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Hora despegue *</label>
              <input type="time" className={field} value={f.takeoff} onChange={(e) => set('takeoff', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Altitud máx (m AGL)</label>
              <input type="number" min="0" max="120" className={field} value={f.altitude}
                     onChange={(e) => set('altitude', Math.min(120, Number(e.target.value)))} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-1 flex items-center gap-1">
            <Icon name="info" className="text-xs" /> Límite RAC 100: 120 m sobre el nivel del terreno (AGL).
          </p>

          <div>
            <label className={lbl}>Notas / restricciones</label>
            <textarea rows={2} className={`${field} resize-none`} value={f.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      placeholder="NOTAM, zonas restringidas, coordinación con torre, etc." />
          </div>

          {err && <p className="text-xs font-bold text-red-500">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-black text-white" style={{ backgroundColor: 'var(--brand-accent)' }}>
              Programar y asignar
            </button>
          </div>
          <p className="text-[11px] text-amber-600 text-center">Simulación — la misión se asigna al piloto en el demo, sin envío real.</p>
        </form>
      </div>
    </div>
  );
}
