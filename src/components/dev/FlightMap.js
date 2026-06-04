'use client';
/**
 * FlightMap — visualizador de traza de vuelo DJI sobre Leaflet.
 * Solo se monta en el cliente (no SSR).
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons en Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Íconos especiales para inicio y fin
const iconStart = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#22c55e;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;
    font-size:13px;
  ">🛫</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

const iconEnd = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#ef4444;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;
    font-size:13px;
  ">🛬</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

// ─── FitBounds ────────────────────────────────────────────────────────────────
function FitBounds({ latlngs }) {
  const map = useMap();
  useEffect(() => {
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 18 });
    }
  }, [latlngs, map]);
  return null;
}

// ─── Color de segmento por altitud ────────────────────────────────────────────
function altColor(alt, maxAlt) {
  if (!maxAlt || maxAlt === 0) return '#EC5B13';
  const ratio = Math.min(alt / maxAlt, 1);
  // Gradiente naranja → azul cielo
  const r = Math.round(236 + (30  - 236) * ratio);
  const g = Math.round(91  + (144 - 91)  * ratio);
  const b = Math.round(19  + (255 - 19)  * ratio);
  return `rgb(${r},${g},${b})`;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FlightMap({ path, meta, colorMode }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const latlngs = useMemo(() => path.map(p => [p.lat, p.lng]), [path]);

  // Segmentos coloreados por altitud
  const segments = useMemo(() => {
    if (colorMode !== 'altitude') return null;
    const segs = [];
    for (let i = 0; i < path.length - 1; i++) {
      segs.push({
        pts:   [[path[i].lat, path[i].lng], [path[i+1].lat, path[i+1].lng]],
        color: altColor(path[i].alt, meta.altMax || 1),
      });
    }
    return segs;
  }, [path, meta.altMax, colorMode]);

  const center = latlngs.length > 0 ? latlngs[Math.floor(latlngs.length / 2)] : [-4.7, -74.1];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
        zoomControl={true}
      >
        {/* Tile layer satelital */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
          maxZoom={20}
        />
        {/* Tile layer labels (nombres de lugares) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          maxZoom={20}
          opacity={0.7}
        />

        <FitBounds latlngs={latlngs} />

        {/* Traza principal */}
        {colorMode === 'altitude' && segments
          ? segments.map((seg, i) => (
              <Polyline
                key={i}
                positions={seg.pts}
                pathOptions={{ color: seg.color, weight: 3, opacity: 0.9 }}
              />
            ))
          : (
            <Polyline
              positions={latlngs}
              pathOptions={{ color: '#EC5B13', weight: 3, opacity: 0.85 }}
            />
          )
        }

        {/* Sombra/contorno para destacar */}
        <Polyline
          positions={latlngs}
          pathOptions={{ color: '#000', weight: 5, opacity: 0.15 }}
        />

        {/* Marcador inicio */}
        {latlngs.length > 0 && (
          <Marker position={latlngs[0]} icon={iconStart}>
            <Tooltip permanent direction="top" offset={[0, -8]}>
              <span className="text-xs font-bold">Despegue</span>
            </Tooltip>
          </Marker>
        )}

        {/* Marcador fin */}
        {latlngs.length > 1 && (
          <Marker position={latlngs[latlngs.length - 1]} icon={iconEnd}>
            <Tooltip permanent direction="top" offset={[0, -8]}>
              <span className="text-xs font-bold">Aterrizaje</span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Leyenda de altitud */}
      {colorMode === 'altitude' && meta.altMax && (
        <div className="absolute bottom-8 right-3 z-[9999] bg-slate-900/90 rounded-xl p-3 text-xs pointer-events-none">
          <p className="font-black text-white mb-1.5 text-center">Altitud</p>
          <div className="flex items-center gap-2">
            <div style={{
              width: 12, height: 80,
              background: 'linear-gradient(to top, rgb(236,91,19), rgb(30,144,255))',
              borderRadius: 4,
            }} />
            <div className="flex flex-col justify-between h-20 text-[10px] text-slate-300">
              <span>{meta.altMax.toFixed(0)} m</span>
              <span>{(meta.altMax / 2).toFixed(0)} m</span>
              <span>0 m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
