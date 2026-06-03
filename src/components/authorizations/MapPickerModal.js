'use client';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  haversine, polygonPerimeter, polygonAreaM2,
  polylineLength, fmtMetres, fmtArea,
} from '@/lib/kmlGenerator';

// URL del visor oficial de restricciones UAS — Aerocivil Colombia
const AEROCIVIL_VIEWER = (lat = 4.5, lng = -74.1, level = 10) =>
  `https://aerocivil.maps.arcgis.com/apps/instant/media/index.html?appid=b4be4d501c8d4bcabd0c35297521c16e&center=${lng};${lat}&level=${level}`;

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_HINTS = {
  polygon: 'Toca el mapa para agregar vértices. Mínimo 3.',
  linear:  'Toca el mapa para agregar puntos. Mínimo 2.',
  circle:  'Toca el mapa para fijar el centro.',
};

const TYPE_LABEL = {
  polygon: 'Polígono',
  linear:  'Tramo Lineal',
  circle:  'Circunferencia',
};

// ─── MapCenterTracker — emite evento con centro actual del mapa ───────────────
function MapCenterTracker({ onMove }) {
  const map = useMap();
  useEffect(() => {
    const update = () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng, map.getZoom());
    };
    map.on('moveend', update);
    return () => map.off('moveend', update);
  }, [map, onMove]);
  return null;
}

// ─── MapController ────────────────────────────────────────────────────────────
function MapController({ type, setTempPoints }) {
  useMapEvents({
    click(e) {
      setTempPoints(prev => {
        if (type === 'circle') return [e.latlng];
        return [...prev, e.latlng];
      });
    },
  });
  return null;
}

// ─── FlyTo ────────────────────────────────────────────────────────────────────
function SearchFlyTo() {
  const map = useMap();
  useEffect(() => {
    const handler = e => map.flyTo(e.detail, 14, { animate: true, duration: 1 });
    window.addEventListener('map-fly-to', handler);
    return () => window.removeEventListener('map-fly-to', handler);
  }, [map]);
  return null;
}

// ─── GeoStats (overlay inside map) ───────────────────────────────────────────
function GeoStats({ type, points, radius }) {
  if (points.length === 0) return null;

  let statLine = '';
  if (type === 'polygon' && points.length >= 3) {
    const area = polygonAreaM2(points);
    const perim = polygonPerimeter(points);
    statLine = `Área ≈ ${fmtArea(area)} · Perímetro ≈ ${fmtMetres(perim)}`;
  } else if (type === 'linear' && points.length >= 2) {
    statLine = `Longitud ≈ ${fmtMetres(polylineLength(points))}`;
  } else if (type === 'circle' && points.length === 1) {
    statLine = `Radio: ${fmtMetres(radius)} · Área ≈ ${fmtArea(Math.PI * radius * radius)}`;
  }

  if (!statLine) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-[600]
                    bottom-[6rem] md:bottom-16
                    bg-emerald-900/90 text-emerald-300 px-5 py-2 rounded-xl
                    text-xs font-black uppercase tracking-widest
                    backdrop-blur-sm border border-emerald-700/40 whitespace-nowrap">
      {statLine}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function MapPickerModal({ type, points, onSave, onClose }) {
  const [tempPoints,       setTempPoints]       = useState(points || []);
  const [radius,           setRadius]           = useState(500);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isSearching,      setIsSearching]      = useState(false);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [mapCenter,        setMapCenter]        = useState({ lat: 4.5, lng: -74.1, zoom: 6 });
  const iframeRef = useRef(null);

  // Reconstruye URL del iframe cada vez que el mapa se mueve (sincroniza Aerocivil con Leaflet)
  const aerocivilUrl = AEROCIVIL_VIEWER(mapCenter.lat, mapCenter.lng, mapCenter.zoom);

  if (typeof window === 'undefined') return null;

  const canConfirm =
    (type === 'polygon' && tempPoints.length >= 3) ||
    (type === 'linear'  && tempPoints.length >= 2) ||
    (type === 'circle'  && tempPoints.length === 1);

  // ── Geocoder ──────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const coordsRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
      if (coordsRegex.test(searchQuery.trim())) {
        const [lat, lng] = searchQuery.split(',').map(n => parseFloat(n.trim()));
        window.dispatchEvent(new CustomEvent('map-fly-to', { detail: [lat, lng] }));
        return;
      }
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=co`
      );
      const data = await resp.json();
      if (data?.length > 0) {
        window.dispatchEvent(new CustomEvent('map-fly-to', { detail: [parseFloat(data[0].lat), parseFloat(data[0].lon)] }));
      } else {
        alert('No se encontró el lugar. Intente con coordenadas Lat, Lng.');
      }
    } catch {
      alert('Error en el servicio de búsqueda.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex flex-col font-display animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white shrink-0 shadow-xl">

        {/* Row 1 — always visible: brand icon + search + close */}
        <div className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3">
          <div className="size-9 bg-orange-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-lg">explore</span>
          </div>

          <form onSubmit={handleSearch} className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar municipio o Lat, Lng..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin size-3 border-2 border-orange-500 border-b-transparent rounded-full" />
            )}
          </form>

          {/* Restricciones UAS — toggle panel (desktop) / open tab (mobile) */}
          <button
            onClick={() => setShowRestrictions(v => !v)}
            title="Ver restricciones Aerocivil"
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 shrink-0 ${
              showRestrictions
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-base">layers</span>
            Restricciones
          </button>
          <a
            href={AEROCIVIL_VIEWER(mapCenter.lat, mapCenter.lng, mapCenter.zoom)}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver restricciones Aerocivil"
            className="md:hidden size-11 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">layers</span>
          </a>

          {/* Close — always size-11 touch target */}
          <button
            onClick={onClose}
            className="size-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Row 2 — desktop only: type label + point count + controls */}
        <div className="hidden md:flex items-center gap-3 px-6 pb-3 border-t border-slate-100 pt-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-widest flex-1">
            {TYPE_LABEL[type]}
            {' · '}{tempPoints.length} punto{tempPoints.length !== 1 ? 's' : ''}
          </span>

          {type === 'circle' && tempPoints.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
              <span className="text-xs font-black text-orange-600 uppercase">Radio:</span>
              <input
                type="range" min="50" max="10000" step="50"
                className="w-28 accent-orange-600"
                value={radius}
                onChange={e => setRadius(parseInt(e.target.value))}
              />
              <span className="text-xs font-black text-orange-700 w-14 text-right">
                {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
              </span>
            </div>
          )}

          <button
            onClick={() => setTempPoints(prev => prev.slice(0, -1))}
            disabled={tempPoints.length === 0}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase disabled:opacity-30 hover:bg-slate-200 transition-colors active:scale-95"
          >
            Deshacer
          </button>
          <button
            onClick={() => setTempPoints([])}
            disabled={tempPoints.length === 0}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase disabled:opacity-30 hover:bg-slate-200 transition-colors active:scale-95"
          >
            Limpiar
          </button>
          <button
            onClick={() => canConfirm && onSave({ points: tempPoints, radius })}
            disabled={!canConfirm}
            className="px-6 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 transition-all active:scale-95"
          >
            Confirmar zona
          </button>
        </div>
      </header>

      {/* ── Map + optional restrictions panel ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Leaflet drawing map */}
        <div className={`relative transition-all duration-300 ${showRestrictions ? 'w-1/2' : 'w-full'}`}>
          <MapContainer
            center={[4.5709, -74.2973]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController type={type} setTempPoints={setTempPoints} />
            <SearchFlyTo />
            <MapCenterTracker onMove={(lat, lng, zoom) => setMapCenter({ lat, lng, zoom })} />

            {tempPoints.map((p, i) => <Marker key={i} position={p} />)}

            {type === 'polygon' && tempPoints.length >= 3 && (
              <Polygon
                positions={tempPoints}
                pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.25, weight: 2 }}
              />
            )}
            {type === 'linear' && tempPoints.length >= 2 && (
              <Polyline
                positions={tempPoints}
                pathOptions={{ color: '#ec5b13', weight: 4, dashArray: '6 3' }}
              />
            )}
            {type === 'circle' && tempPoints.length === 1 && (
              <Circle
                center={tempPoints[0]}
                radius={radius}
                pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.25, weight: 2 }}
              />
            )}
          </MapContainer>

          {/* Status bar */}
          <div className="absolute left-1/2 -translate-x-1/2 z-[600]
                          bottom-[5.5rem] md:bottom-4
                          bg-slate-900/90 text-white px-5 py-2.5 rounded-2xl
                          text-xs font-black uppercase tracking-widest
                          backdrop-blur-sm border border-white/10
                          text-center max-w-[calc(100vw-2rem)] md:max-w-sm whitespace-nowrap">
            {tempPoints.length === 0
              ? TYPE_HINTS[type]
              : `${tempPoints.length} punto${tempPoints.length !== 1 ? 's' : ''} marcado${tempPoints.length !== 1 ? 's' : ''}${!canConfirm ? ` · Faltan ${type === 'polygon' ? 3 - tempPoints.length : 2 - tempPoints.length} más` : ' ✓ Listo'}`}
          </div>

          {/* Geo stats */}
          <GeoStats type={type} points={tempPoints} radius={radius} />
        </div>

        {/* ── ArcGIS Aerocivil restrictions panel (desktop only) ─────────────── */}
        {showRestrictions && (
          <div className="w-1/2 flex flex-col border-l border-slate-700 bg-slate-900">
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
              <span className="material-symbols-outlined text-emerald-400 text-base">layers</span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-300 flex-1">
                Restricciones UAS — Aerocivil
              </span>
              <span className="text-xs text-slate-500 font-medium">Se sincroniza al mover</span>
              <a
                href={aerocivilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="size-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                title="Abrir en nueva pestaña"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
              <button
                onClick={() => setShowRestrictions(false)}
                className="size-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            {/* iframe Aerocivil */}
            <iframe
              ref={iframeRef}
              key={aerocivilUrl}
              src={aerocivilUrl}
              title="Restricciones espacio aéreo Aerocivil Colombia"
              className="flex-1 border-0 w-full"
              loading="lazy"
              allow="geolocation"
            />
          </div>
        )}
      </div>

      {/* ── Mobile bottom action bar ─────────────────────────────────────────── */}
      <div
        className="md:hidden bg-white border-t border-slate-100 shrink-0 px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      >
        {/* Radius slider — only when type=circle and center is set */}
        {type === 'circle' && tempPoints.length > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 rounded-2xl px-4 py-3 mb-3 border border-orange-100">
            <span className="text-xs font-black text-orange-600 uppercase shrink-0">Radio:</span>
            <input
              type="range" min="50" max="10000" step="50"
              className="flex-1 accent-orange-600"
              value={radius}
              onChange={e => setRadius(parseInt(e.target.value))}
            />
            <span className="text-xs font-black text-orange-700 w-16 text-right shrink-0">
              {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setTempPoints(prev => prev.slice(0, -1))}
            disabled={tempPoints.length === 0}
            className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase disabled:opacity-30 active:scale-95 transition-all"
          >
            Deshacer
          </button>
          <button
            onClick={() => setTempPoints([])}
            disabled={tempPoints.length === 0}
            className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase disabled:opacity-30 active:scale-95 transition-all"
          >
            Limpiar
          </button>
          <button
            onClick={() => canConfirm && onSave({ points: tempPoints, radius })}
            disabled={!canConfirm}
            className="flex-[2] py-3.5 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
