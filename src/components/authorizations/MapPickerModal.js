'use client';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  haversine, polygonPerimeter, polygonAreaM2,
  polylineLength, fmtMetres, fmtArea,
} from '@/lib/kmlGenerator';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_HINTS = {
  polygon: 'Haga clic en el mapa para agregar vértices del polígono. Mínimo 3 puntos.',
  linear:  'Haga clic para agregar puntos del tramo lineal. Mínimo 2 puntos.',
  circle:  'Haga clic para fijar el centro. Ajuste el radio con el deslizador.',
};

// ─── MapController (captura clics, se monta dentro de MapContainer) ─────────
function MapController({ type, setTempPoints }) {
  useMapEvents({
    click(e) {
      setTempPoints(prev => {
        if (type === 'circle') return [e.latlng]; // solo 1 centro
        return [...prev, e.latlng];
      });
    },
  });
  return null;
}

// ─── FlyTo (escucha evento global) ────────────────────────────────────────────
function SearchFlyTo() {
  const map = useMap();
  useEffect(() => {
    const handler = e => map.flyTo(e.detail, 14, { animate: true, duration: 1 });
    window.addEventListener('map-fly-to', handler);
    return () => window.removeEventListener('map-fly-to', handler);
  }, [map]);
  return null;
}

// ─── UndoButton (se monta dentro del mapa para acceder a useMap si fuera necesario) ─
function GeoStats({ type, points, radius }) {
  if (points.length === 0) return null;

  let statLine = '';
  if (type === 'polygon' && points.length >= 3) {
    const area = polygonAreaM2(points);
    const perim = polygonPerimeter(points);
    statLine = `Área ≈ ${fmtArea(area)} · Perímetro ≈ ${fmtMetres(perim)}`;
  } else if (type === 'linear' && points.length >= 2) {
    const len = polylineLength(points);
    statLine = `Longitud ≈ ${fmtMetres(len)}`;
  } else if (type === 'circle' && points.length === 1) {
    const area = Math.PI * radius * radius;
    statLine = `Radio: ${fmtMetres(radius)} · Área ≈ ${fmtArea(area)}`;
  }

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[600] bg-emerald-900/90 text-emerald-300 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-emerald-700/40">
      {statLine}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function MapPickerModal({ type, points, onSave, onClose }) {
  const [tempPoints,   setTempPoints]   = useState(points || []);
  const [radius,       setRadius]       = useState(500);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [isSearching,  setIsSearching]  = useState(false);

  if (typeof window === 'undefined') return null;

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Try lat,lng format first
      const coordsRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
      if (coordsRegex.test(searchQuery.trim())) {
        const [lat, lng] = searchQuery.split(',').map(n => parseFloat(n.trim()));
        window.dispatchEvent(new CustomEvent('map-fly-to', { detail: [lat, lng] }));
        return;
      }
      // Nominatim geocoder
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

  const canConfirm =
    (type === 'polygon' && tempPoints.length >= 3) ||
    (type === 'linear'  && tempPoints.length >= 2) ||
    (type === 'circle'  && tempPoints.length === 1);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex flex-col font-display animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white px-4 py-3 md:px-8 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 shadow-xl">

        {/* Brand + search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="size-9 bg-orange-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-lg">explore</span>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar municipio o Lat, Lng..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin size-3 border-2 border-orange-500 border-b-transparent rounded-full" />
            )}
          </form>
        </div>

        {/* Type label */}
        <div className="flex-1 hidden md:block text-center">
          <span className="text-xs font-black uppercase text-slate-400 tracking-widest">
            {type === 'polygon' ? 'Polígono' : type === 'linear' ? 'Tramo Lineal' : 'Circunferencia'}
            {' · '}{tempPoints.length} punto{tempPoints.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {type === 'circle' && tempPoints.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
              <span className="text-xs font-black text-orange-600 uppercase">Radio:</span>
              <input
                type="range" min="50" max="10000" step="50"
                className="w-24 accent-orange-600"
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
            className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase disabled:opacity-30 hover:bg-slate-200 transition-colors"
          >
            Deshacer
          </button>
          <button
            onClick={() => setTempPoints([])}
            disabled={tempPoints.length === 0}
            className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase disabled:opacity-30 hover:bg-slate-200 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={() => canConfirm && onSave({ points: tempPoints, radius })}
            disabled={!canConfirm}
            className="px-5 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 transition-all active:scale-95"
          >
            Confirmar
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* ── Map ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[600] bg-slate-900/90 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/10 text-center max-w-sm">
          {tempPoints.length === 0
            ? TYPE_HINTS[type]
            : `${tempPoints.length} punto${tempPoints.length !== 1 ? 's' : ''} marcado${tempPoints.length !== 1 ? 's' : ''}${!canConfirm ? ` · Necesita ${type === 'polygon' ? 3 : 2} mínimo` : ' · Listo'}`}
        </div>

        {/* Geo stats */}
        <GeoStats type={type} points={tempPoints} radius={radius} />
      </div>
    </div>
  );
}
