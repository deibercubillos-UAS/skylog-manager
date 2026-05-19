'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { generateKML, downloadKMZ, fmtMetres, fmtArea, polygonAreaM2, polygonPerimeter, polylineLength } from '@/lib/kmlGenerator';

const MapPickerModal = dynamic(() => import('@/components/authorizations/MapPickerModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center">
      <div className="text-white text-xs font-black uppercase animate-pulse">Cargando mapa…</div>
    </div>
  ),
});

const GEO_TYPES = [
  { key: 'polygon', label: 'Polígono',        icon: 'pentagon',     hint: 'Área de vuelo delimitada por vértices' },
  { key: 'linear',  label: 'Tramo Lineal',    icon: 'route',        hint: 'Ruta de inspección o transecto' },
  { key: 'circle',  label: 'Circunferencia',  icon: 'circle',       hint: 'Zona circular con radio definido' },
];

function getSummary(geoType, points, radius) {
  if (!points || points.length === 0) return null;
  if (geoType === 'polygon' && points.length >= 3) {
    const area  = polygonAreaM2(points);
    const perim = polygonPerimeter(points);
    return [
      { label: 'Vértices',   value: points.length },
      { label: 'Área',       value: fmtArea(area) },
      { label: 'Perímetro',  value: fmtMetres(perim) },
    ];
  }
  if (geoType === 'linear' && points.length >= 2) {
    return [
      { label: 'Puntos',    value: points.length },
      { label: 'Longitud',  value: fmtMetres(polylineLength(points)) },
    ];
  }
  if (geoType === 'circle' && points.length === 1) {
    return [
      { label: 'Centro',  value: `${points[0].lat.toFixed(5)}, ${points[0].lng.toFixed(5)}` },
      { label: 'Radio',   value: fmtMetres(radius) },
      { label: 'Área',    value: fmtArea(Math.PI * radius * radius) },
    ];
  }
  return null;
}

export default function PlanVueloPage() {
  const [geoType,     setGeoType]     = useState('polygon');
  const [opName,      setOpName]      = useState('');
  const [altitude,    setAltitude]    = useState(120);
  const [mapOpen,     setMapOpen]     = useState(false);
  const [zone,        setZone]        = useState(null); // { points, radius }
  const [downloading, setDownloading] = useState(false);

  const handleMapSave = useCallback(({ points, radius }) => {
    setZone({ points, radius });
    setMapOpen(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!zone?.points) return;
    const name = opName.trim() || 'Operación UAS';
    const kml  = generateKML(geoType, zone.points, zone.radius, name, altitude);
    if (!kml) return;
    setDownloading(true);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await downloadKMZ(kml, `${slug}.kmz`);
    setDownloading(false);
  }, [zone, opName, geoType, altitude]);

  const summary = zone ? getSummary(geoType, zone.points, zone.radius) : null;
  const canDownload = !!summary;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── ENCABEZADO ─────────────────────────────────────────────────────── */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">map</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-navy uppercase tracking-tighter leading-none">
              Planear Vuelo
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">
              Define la zona y descarga el KMZ para AeroCivil
            </p>
          </div>
        </div>
      </header>

      {/* ── FORMULARIO ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-6">

        {/* Nombre de la operación */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Nombre de la operación
          </label>
          <input
            type="text"
            placeholder="Ej: Inspección eléctrica – Vereda El Roble"
            value={opName}
            onChange={e => setOpName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Tipo de geometría */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Tipo de zona
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GEO_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => { setGeoType(t.key); setZone(null); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                  geoType === t.key
                    ? 'border-orange-400 bg-orange-50 text-orange-600'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                <span className="text-xs font-black uppercase leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 font-bold">
            {GEO_TYPES.find(t => t.key === geoType)?.hint}
          </p>
        </div>

        {/* Altitud máxima */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Altitud máxima AGL
          </label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
            <input
              type="range"
              min="10"
              max="400"
              step="10"
              value={altitude}
              onChange={e => setAltitude(Number(e.target.value))}
              className="flex-1 accent-orange-600"
            />
            <span className="text-sm font-black text-navy w-16 text-right shrink-0">
              {altitude} m
            </span>
          </div>
          {altitude > 120 && (
            <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Sobre 120 m AGL requiere autorización especial (RAC 100.32)
            </p>
          )}
        </div>

        {/* Botón abrir mapa */}
        <button
          onClick={() => setMapOpen(true)}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_location_alt</span>
          {zone ? 'Editar zona en el mapa' : 'Definir zona en el mapa'}
        </button>
      </div>

      {/* ── RESUMEN DE ZONA ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
            <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Zona definida</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summary.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-3 border border-emerald-100">
                <p className="text-xs font-black text-slate-400 uppercase">{s.label}</p>
                <p className="text-sm font-black text-navy mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DESCARGA KMZ ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-500 text-lg">download</span>
          </div>
          <div>
            <p className="text-sm font-black text-navy">Archivo KMZ</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              El archivo KMZ es compatible con Google Earth y el portal de AeroCivil (Apéndice 13 RAC 100).
              Define primero la zona en el mapa para habilitar la descarga.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!canDownload || downloading}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
            canDownload && !downloading
              ? 'bg-navy text-white hover:bg-slate-800 shadow-slate-900/20'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
          }`}
        >
          {downloading ? (
            <>
              <span className="size-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
              Generando KMZ…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">download</span>
              Descargar KMZ
            </>
          )}
        </button>
      </div>

      {/* ── NOTA INFORMATIVA ───────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 flex gap-3">
        <span className="material-symbols-outlined text-blue-400 text-xl shrink-0 mt-0.5">info</span>
        <div className="space-y-1">
          <p className="text-xs font-black text-blue-700 uppercase tracking-wide">¿Para qué sirve el KMZ?</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            AeroCivil solicita el archivo KMZ para delimitar la zona de operación en solicitudes de vuelo (RAC 100, Apéndice 13).
            También puedes abrirlo en Google Earth para verificar el área antes de la operación.
          </p>
        </div>
      </div>

      {/* ── MODAL DEL MAPA ─────────────────────────────────────────────────── */}
      {mapOpen && (
        <MapPickerModal
          type={geoType}
          points={zone?.points || []}
          onSave={handleMapSave}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}
