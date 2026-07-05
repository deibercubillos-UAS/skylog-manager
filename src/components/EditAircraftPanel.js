'use client';
import { useState } from 'react';
import FleetImageUpload from './FleetImageUpload';
import { toast } from '@/lib/toast';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    brand:         aircraft?.brand         || '',
    model:         aircraft?.model         || '',
    serial_number: aircraft?.serial_number || '',
    ruas:          aircraft?.ruas          || '',
    image_url:     aircraft?.image_url     || '',
    total_hours:   aircraft?.total_hours   || 0,
    // Mantenimiento configurable
    maintenance_interval_hours: aircraft?.maintenance_interval_hours ?? 200,
    maintenance_interval_days:  aircraft?.maintenance_interval_days  ?? 180,
    operational_status:         aircraft?.operational_status         || 'disponible',
    // Mantenimiento menor (checklist periódico del piloto) — 0 = deshabilitado
    minor_maintenance_interval_hours: aircraft?.minor_maintenance_interval_hours ?? 0,
    minor_maintenance_interval_days:  aircraft?.minor_maintenance_interval_days  ?? 0,
  });

  // Horas y días desde el último mantenimiento (solo lectura, informativo)
  const hours       = parseFloat(aircraft?.total_hours || 0);
  const lastH       = parseFloat(aircraft?.last_maintenance_hours || 0);
  const diffH       = Math.max(0, hours - lastH).toFixed(1);
  const lastDate    = aircraft?.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : null;
  const daysSince   = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / 86400000)
    : null;
  const intH        = parseInt(form.maintenance_interval_hours || 0, 10);
  const intD        = parseInt(form.maintenance_interval_days  || 0, 10);
  const hRemain     = intH > 0 ? Math.max(0, intH - parseFloat(diffH)) : null;
  const dRemain     = (intD > 0 && daysSince !== null) ? Math.max(0, intD - daysSince) : null;

  // Mantenimiento menor — mismo cálculo informativo, con sus propios contadores
  const lastMinorH     = parseFloat(aircraft?.last_minor_maintenance_hours || 0);
  const diffMinorH     = Math.max(0, hours - lastMinorH).toFixed(1);
  const lastMinorDate  = aircraft?.last_minor_maintenance_date ? new Date(aircraft.last_minor_maintenance_date) : null;
  const daysSinceMinor = lastMinorDate ? Math.floor((Date.now() - lastMinorDate.getTime()) / 86400000) : null;
  const intMinorH      = parseInt(form.minor_maintenance_interval_hours || 0, 10);
  const intMinorD      = parseInt(form.minor_maintenance_interval_days  || 0, 10);
  const hMinorRemain   = intMinorH > 0 ? Math.max(0, intMinorH - parseFloat(diffMinorH)) : null;
  const dMinorRemain   = (intMinorD > 0 && daysSinceMinor !== null) ? Math.max(0, intMinorD - daysSinceMinor) : null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/fleet/${aircraft.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          updateData: {
            brand:         form.brand,
            model:         form.model,
            serial_number: form.serial_number,
            ruas:          form.ruas,
            image_url:     form.image_url,
            total_hours:   parseFloat(form.total_hours || 0),
            maintenance_interval_hours: parseInt(form.maintenance_interval_hours || 0, 10),
            maintenance_interval_days:  parseInt(form.maintenance_interval_days  || 0, 10),
            operational_status:         form.operational_status,
            minor_maintenance_interval_hours: parseInt(form.minor_maintenance_interval_hours || 0, 10),
            minor_maintenance_interval_days:  parseInt(form.minor_maintenance_interval_days  || 0, 10),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      toast.success('Aeronave actualizada correctamente.');
      onSuccess();
    } catch (err) {
      setSaveError(err.message);
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Ficha de Aeronave</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form id="edit-aircraft-form" onSubmit={handleUpdate} className="space-y-5">
          <FleetImageUpload onUploadSuccess={(url) => setForm({...form, image_url: url})} />

          <div className="space-y-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-400">Identidad</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" value={form.ruas} onChange={e => setForm({...form, ruas: e.target.value})} placeholder="Registro RUAS" />
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-2 uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400">Control de Horas (T.T)</label>
              <input type="number" step="0.01" className="w-full p-3 bg-white border-2 border-orange-100 rounded-xl font-black text-xl text-orange-600 mt-1" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} />
              <p className="text-xs text-slate-400 mt-1 uppercase ml-1">Ajuste manual de tiempo acumulado</p>
            </div>
          </div>

          {/* ── Sección mantenimiento ─────────────────────────────────── */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-base text-slate-400">build</span>
              <label className="text-xs font-black uppercase text-slate-500 tracking-wide">Configuración de Mantenimiento</label>
            </div>

            {/* Intervalo */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cada N horas</label>
                <input
                  type="number" min="0" step="1"
                  className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm mt-1"
                  value={form.maintenance_interval_hours}
                  onChange={e => setForm({...form, maintenance_interval_hours: e.target.value})}
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cada N días</label>
                <input
                  type="number" min="0" step="1"
                  className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm mt-1"
                  value={form.maintenance_interval_days}
                  onChange={e => setForm({...form, maintenance_interval_days: e.target.value})}
                  placeholder="180"
                />
              </div>
            </div>

            {/* Indicador progreso */}
            {(hRemain !== null || dRemain !== null) && (
              <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-1.5 text-xs font-bold text-slate-500">
                {hRemain !== null && (
                  <p>
                    <span className="text-slate-400">Horas desde último mant.:</span>
                    {' '}<span className={parseFloat(diffH) >= intH ? 'text-red-600' : 'text-slate-700'}>{diffH}h</span>
                    {' · '}
                    <span className={hRemain === 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {hRemain === 0 ? '¡Umbral alcanzado!' : `Faltan ${hRemain}h`}
                    </span>
                  </p>
                )}
                {dRemain !== null && (
                  <p>
                    <span className="text-slate-400">Días desde último mant.:</span>
                    {' '}<span className={daysSince >= intD ? 'text-red-600' : 'text-slate-700'}>{daysSince}d</span>
                    {' · '}
                    <span className={dRemain === 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {dRemain === 0 ? '¡Umbral alcanzado!' : `Faltan ${dRemain}d`}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Toggle estado operacional */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1.5">Estado operacional</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, operational_status: 'disponible'})}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all border-2
                    ${form.operational_status === 'disponible'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}
                >
                  <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
                  Disponible
                </button>
                <button
                  type="button"
                  onClick={() => setForm({...form, operational_status: 'en_mantenimiento'})}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all border-2
                    ${form.operational_status === 'en_mantenimiento'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-amber-300'}`}
                >
                  <span className="material-symbols-outlined text-sm align-middle mr-1">build_circle</span>
                  En mantenimiento
                </button>
              </div>
            </div>
            {/* ── Mantenimiento menor (checklist del piloto) ────────────── */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base text-slate-400">fact_check</span>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wide">Mantenimiento Menor (piloto)</label>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mb-3">
                Chequeo periódico ligero que diligencia el piloto — 0 = deshabilitado para esta aeronave.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cada N horas</label>
                  <input
                    type="number" min="0" step="1"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm mt-1"
                    value={form.minor_maintenance_interval_hours}
                    onChange={e => setForm({...form, minor_maintenance_interval_hours: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cada N días</label>
                  <input
                    type="number" min="0" step="1"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm mt-1"
                    value={form.minor_maintenance_interval_days}
                    onChange={e => setForm({...form, minor_maintenance_interval_days: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              {(hMinorRemain !== null || dMinorRemain !== null) && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs font-bold text-slate-500">
                  {hMinorRemain !== null && (
                    <p>
                      <span className="text-slate-400">Horas desde el último:</span>
                      {' '}<span className={parseFloat(diffMinorH) >= intMinorH ? 'text-red-600' : 'text-slate-700'}>{diffMinorH}h</span>
                      {' · '}
                      <span className={hMinorRemain === 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {hMinorRemain === 0 ? '¡Umbral alcanzado!' : `Faltan ${hMinorRemain}h`}
                      </span>
                    </p>
                  )}
                  {dMinorRemain !== null && (
                    <p>
                      <span className="text-slate-400">Días desde el último:</span>
                      {' '}<span className={daysSinceMinor >= intMinorD ? 'text-red-600' : 'text-slate-700'}>{daysSinceMinor}d</span>
                      {' · '}
                      <span className={dMinorRemain === 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {dMinorRemain === 0 ? '¡Umbral alcanzado!' : `Faltan ${dMinorRemain}d`}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {aircraft?.minor_maintenance_due && (
                <p className="text-[10.5px] font-black text-red-600 uppercase mt-2">
                  ⚠ Pendiente — bloquea el despacho hasta diligenciarlo en Mantenimiento Menor.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white space-y-3">
        {saveError && (
          <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-red-400 text-sm shrink-0">error</span>
            <p className="text-xs text-red-600 font-bold">{saveError}</p>
          </div>
        )}
        <button form="edit-aircraft-form" type="submit" disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg disabled:opacity-60 active:scale-95 transition-all">
          {loading ? 'Actualizando...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>
    </aside>
  );
}
