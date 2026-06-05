'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import {
  generateKML, downloadKMZ,
  fmtMetres, fmtArea,
  polygonAreaM2, polygonPerimeter, polylineLength,
} from '@/lib/kmlGenerator';

const MapPickerModal = dynamic(() => import('@/components/authorizations/MapPickerModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center">
      <div className="text-white text-xs font-black uppercase animate-pulse">Cargando mapa…</div>
    </div>
  ),
});

const GEO_TYPES = [
  { key: 'polygon', label: 'Polígono',       icon: 'pentagon', hint: 'Área delimitada por vértices' },
  { key: 'linear',  label: 'Tramo Lineal',   icon: 'route',    hint: 'Ruta de inspección o transecto' },
  { key: 'circle',  label: 'Circunferencia', icon: 'circle',   hint: 'Zona circular con radio definido' },
];

function getSummary(geoType, points, radius) {
  if (!points?.length) return null;
  if (geoType === 'polygon' && points.length >= 3) return [
    { label: 'Vértices',  value: points.length },
    { label: 'Área',      value: fmtArea(polygonAreaM2(points)) },
    { label: 'Perímetro', value: fmtMetres(polygonPerimeter(points)) },
  ];
  if (geoType === 'linear' && points.length >= 2) return [
    { label: 'Puntos',   value: points.length },
    { label: 'Longitud', value: fmtMetres(polylineLength(points)) },
  ];
  if (geoType === 'circle' && points.length === 1) return [
    { label: 'Centro', value: `${points[0].lat.toFixed(5)}, ${points[0].lng.toFixed(5)}` },
    { label: 'Radio',  value: fmtMetres(radius) },
    { label: 'Área',   value: fmtArea(Math.PI * radius * radius) },
  ];
  return null;
}

// Fecha de hoy en formato YYYY-MM-DD
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlanVueloPage() {
  const [geoType,     setGeoType]     = useState('polygon');
  const [opName,      setOpName]      = useState('');
  const [flightDate,  setFlightDate]  = useState('');   // vacío en SSR; se llena en el cliente
  const [takeoffTime, setTakeoffTime] = useState('08:00');

  // Inicializar la fecha en el cliente para evitar hydration mismatch UTC vs. zona local
  useEffect(() => { setFlightDate(todayISO()); }, []);
  const [notes,       setNotes]       = useState('');
  const [altitude,    setAltitude]    = useState(120);
  const [mapOpen,     setMapOpen]     = useState(false);
  const [zone,        setZone]        = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Datos del piloto para el encabezado del PDF
  const [pilotInfo, setPilotInfo] = useState(null);
  useEffect(() => {
    async function loadPilot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, first_name, email, role, organization_id')
        .eq('id', user.id)
        .single();
      if (!prof) return;
      const { data: org } = await supabase
        .from('organizations')
        .select('company_name, tax_id')
        .eq('id', prof.organization_id)
        .maybeSingle();
      setPilotInfo({ ...prof, orgName: org?.company_name || '', orgNit: org?.tax_id || '' });
    }
    loadPilot();
  }, []);

  const handleMapSave = useCallback(({ points, radius }) => {
    setZone({ points, radius });
    setMapOpen(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!zone?.points) return;
    const name = opName.trim() || 'Operación UAS';

    // Descripción embebida en el KMZ
    const desc = [
      `Fecha de vuelo: ${flightDate}`,
      `Hora de despegue: ${takeoffTime}`,
      `Altitud máxima AGL: ${altitude} m`,
      notes.trim() ? `Observaciones: ${notes.trim()}` : null,
    ].filter(Boolean).join('\n');

    const kml = generateKML(geoType, zone?.points ?? null, zone?.radius ?? 500, name, altitude, desc);
    if (!kml) return;
    setDownloading(true);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await downloadKMZ(kml, `${slug}.kmz`);
    setDownloading(false);
  }, [zone, opName, geoType, altitude, flightDate, takeoffTime, notes]);

  const summary    = zone ? getSummary(geoType, zone.points, zone.radius) : null;
  // Se puede descargar con solo el nombre de la operación; la zona es opcional pero enriquece el KMZ
  const canDownload = !!opName.trim();

  const handleDownloadPdf = useCallback(async () => {
    if (!canDownload) return;
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const M = 18;

      // ── Encabezado ─────────────────────────────────────────
      doc.setFillColor(26, 32, 44);
      doc.rect(0, 0, W, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PLAN DE VUELO — BITAFLY', M, 13);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Plataforma de gestión de operaciones UAS · bitafly.com', M, 20);

      let y = 38;

      // ── Datos del piloto ────────────────────────────────────
      doc.setFillColor(248, 246, 246);
      doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F');
      doc.setTextColor(26, 32, 44);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ELABORADO POR', M + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      const pilotName = pilotInfo?.full_name || pilotInfo?.first_name || 'Piloto';
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(pilotName, M + 4, y + 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const orgLine = pilotInfo?.orgName ? `${pilotInfo.orgName}${pilotInfo.orgNit ? ' · NIT ' + pilotInfo.orgNit : ''}` : '';
      if (orgLine) doc.text(orgLine, M + 4, y + 20);
      doc.text(`Correo: ${pilotInfo?.email || ''}`, M + 4, y + 26);
      // Fecha de generación en la esquina
      const genDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setTextColor(100, 116, 139);
      doc.text(`Generado: ${genDate}`, W - M - 50, y + 6, { align: 'left' });

      y += 36;

      // ── Datos de la operación ───────────────────────────────
      doc.setTextColor(26, 32, 44);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE LA OPERACIÓN', M, y);
      doc.setDrawColor(234, 88, 12);
      doc.setLineWidth(0.6);
      doc.line(M, y + 2, W - M, y + 2);
      y += 8;

      const fields = [
        ['Nombre de la operación', opName || '—'],
        ['Fecha de vuelo', flightDate ? new Date(flightDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
        ['Hora de despegue', takeoffTime || '—'],
        ['Altitud máxima AGL', `${altitude} m${altitude > 120 ? '  ⚠ Requiere autorización RAC 100.32' : ''}`],
      ];
      doc.setFontSize(9);
      for (const [label, value] of fields) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label + ':', M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 32, 44);
        doc.text(value, M + 55, y);
        y += 7;
      }

      if (notes.trim()) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('Observaciones:', M, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 32, 44);
        const lines = doc.splitTextToSize(notes.trim(), W - M * 2);
        doc.text(lines, M, y);
        y += lines.length * 5 + 4;
      }

      // ── Zona de vuelo ───────────────────────────────────────
      if (summary) {
        y += 4;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 32, 44);
        doc.text('ZONA DE VUELO', M, y);
        doc.setDrawColor(234, 88, 12);
        doc.setLineWidth(0.6);
        doc.line(M, y + 2, W - M, y + 2);
        y += 8;

        const geoLabel = GEO_TYPES.find(t => t.key === geoType)?.label || geoType;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('Tipo de zona:', M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 32, 44);
        doc.text(geoLabel, M + 55, y);
        y += 7;

        for (const s of summary) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text(s.label + ':', M, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(26, 32, 44);
          doc.text(String(s.value), M + 55, y);
          y += 7;
        }

        // Coordenadas
        if (zone?.points?.length) {
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text('Coordenadas:', M, y);
          y += 6;
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(26, 32, 44);
          zone.points.slice(0, 20).forEach((pt, i) => {
            doc.text(`  ${i + 1}. Lat ${pt.lat.toFixed(6)}, Lng ${pt.lng.toFixed(6)}`, M, y);
            y += 5;
          });
          if (zone.points.length > 20) {
            doc.setTextColor(100, 116, 139);
            doc.text(`  … y ${zone.points.length - 20} punto(s) adicional(es)`, M, y);
            y += 5;
          }
        }
      }

      // ── Pie de página ───────────────────────────────────────
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Este documento es de uso interno. Verifique el espacio aéreo en Aerocivil antes de operar.', M, 285);
      doc.text('BitaFly · bitafly.com', W - M, 285, { align: 'right' });

      const slug = (opName || 'plan-vuelo').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      doc.save(`${slug}-plan-vuelo.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setGeneratingPdf(false);
    }
  }, [canDownload, opName, flightDate, takeoffTime, altitude, notes, zone, summary, geoType, pilotInfo]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ENCABEZADO */}
      <header className="flex items-center gap-3">
        <div className="size-10 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">map</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-navy uppercase tracking-tighter leading-none">
            Planear Vuelo
          </h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">
            Define la operación y descarga el KMZ para AeroCivil
          </p>
        </div>
      </header>

      {/* BANNER — verificar restricciones antes de operar */}
      <a
        href="/dashboard/safety/mapas"
        className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 hover:border-amber-300 transition-all group"
      >
        <span className="material-symbols-outlined text-amber-500 text-xl shrink-0">warning</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Verifica restricciones del espacio aéreo antes de operar
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Zonas prohibidas, CTR, TFR y espacio controlado Colombia · Aerocivil
          </p>
        </div>
        <span className="material-symbols-outlined text-amber-400 group-hover:text-amber-600 text-base shrink-0 transition-colors">
          arrow_forward
        </span>
      </a>

      {/* DATOS DE LA OPERACIÓN */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Datos de la operación</p>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Nombre de la operación <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Ej: Inspección eléctrica – Vereda El Roble"
            value={opName}
            onChange={e => setOpName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Fecha de vuelo
            </label>
            <input
              type="date"
              value={flightDate}
              onChange={e => setFlightDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Hora de despegue
            </label>
            <input
              type="time"
              value={takeoffTime}
              onChange={e => setTakeoffTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Observaciones de la misión
          </label>
          <textarea
            rows={3}
            placeholder="Ej: Condición de viento favorable, zona rural sin restricciones, punto de despegue coordenadas GPS marcadas."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* ZONA DE VUELO */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Zona de vuelo</p>

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
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
            <input
              type="range"
              min="10" max="400" step="10"
              value={altitude}
              onChange={e => setAltitude(Number(e.target.value))}
              className="flex-1 accent-orange-600"
            />
            <span className="text-sm font-black text-navy w-16 text-right shrink-0">{altitude} m</span>
          </div>
          {altitude > 120 && (
            <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Sobre 120 m AGL requiere autorización especial (RAC 100.32)
            </p>
          )}
        </div>

        {/* Botón mapa */}
        <button
          onClick={() => setMapOpen(true)}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_location_alt</span>
          {zone ? 'Editar zona en el mapa' : 'Definir zona en el mapa'}
        </button>
      </div>

      {/* RESUMEN DE ZONA */}
      {summary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
              <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Zona definida</p>
            </div>
            <button
              onClick={() => setMapOpen(true)}
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              Editar
            </button>
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

      {/* RESUMEN COMPLETO ANTES DE DESCARGAR */}
      {summary && (
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Resumen del KMZ</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-black text-slate-500 uppercase">Operación</span>
              <p className="font-bold text-slate-800 mt-0.5">{opName || '—'}</p>
            </div>
            <div>
              <span className="font-black text-slate-500 uppercase">Altitud</span>
              <p className="font-bold text-slate-800 mt-0.5">{altitude} m AGL</p>
            </div>
            <div>
              <span className="font-black text-slate-500 uppercase">Fecha</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {flightDate ? new Date(flightDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <span className="font-black text-slate-500 uppercase">Despegue</span>
              <p className="font-bold text-slate-800 mt-0.5">{takeoffTime || '—'}</p>
            </div>
            {notes.trim() && (
              <div className="col-span-2">
                <span className="font-black text-slate-500 uppercase">Observaciones</span>
                <p className="font-bold text-slate-800 mt-0.5 leading-relaxed">{notes.trim()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DESCARGAS */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-500 text-lg">download</span>
          </div>
          <div>
            <p className="text-sm font-black text-navy">Descargar plan de vuelo</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {!canDownload && 'Ingresa el nombre de la operación para habilitar las descargas.'}
              {canDownload && !zone && 'Define la zona en el mapa para incluir geometría en el KMZ.'}
              {canDownload && zone && 'KMZ para AeroCivil (Apéndice 13 · RAC 100) o PDF con encabezado del piloto.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* KMZ */}
          <button
            onClick={handleDownload}
            disabled={!canDownload || downloading}
            className={`py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
              canDownload && !downloading
                ? 'bg-[#1A202C] text-white hover:bg-slate-800 shadow-slate-900/20'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            {downloading ? (
              <>
                <span className="size-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">download</span>
                Descargar KMZ
              </>
            )}
          </button>

          {/* PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={!canDownload || generatingPdf}
            className={`py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
              canDownload && !generatingPdf
                ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-900/20'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            {generatingPdf ? (
              <>
                <span className="size-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                Generando PDF…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTA INFORMATIVA */}
      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 flex gap-3">
        <span className="material-symbols-outlined text-blue-400 text-xl shrink-0 mt-0.5">info</span>
        <div className="space-y-1">
          <p className="text-xs font-black text-blue-700 uppercase tracking-wide">¿Para qué sirve el KMZ?</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            AeroCivil solicita el archivo KMZ para delimitar la zona de operación en solicitudes de vuelo
            (RAC 100, Apéndice 13). También puedes abrirlo en Google Earth para verificar el área antes de volar.
          </p>
        </div>
      </div>

      {/* MODAL DEL MAPA */}
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
