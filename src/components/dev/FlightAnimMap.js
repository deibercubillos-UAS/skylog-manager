'use client';
/**
 * FlightAnimMap — Leaflet map con dron animado.
 * Expone una API imperativa vía onReady(api) para actualizaciones a 60fps
 * sin pasar por React state.
 *
 * api.updateDrone(frame)        — mueve + rota el marcador del dron
 * api.updatePlayedPath(idx)     — actualiza el tramo recorrido vs pendiente
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Ícono SVG del dron (vista top, rotable) ──────────────────────
// Tamaño reducido (28×28) para no tapar el mapa satelital.
// Forma: cruz de brazos + rotores pequeños + cuerpo mínimo + indicador frontal.
const DRONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 44 44">
  <!-- Brazos diagonales -->
  <line x1="22" y1="22" x2="8"  y2="8"  stroke="#EC5B13" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="22" x2="36" y2="8"  stroke="#EC5B13" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="22" x2="8"  y2="36" stroke="#EC5B13" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="22" x2="36" y2="36" stroke="#EC5B13" stroke-width="3" stroke-linecap="round"/>
  <!-- Rotores (más pequeños) -->
  <circle cx="8"  cy="8"  r="5" fill="none" stroke="white" stroke-width="1.5" opacity="0.9"/>
  <circle cx="36" cy="8"  r="5" fill="none" stroke="white" stroke-width="1.5" opacity="0.9"/>
  <circle cx="8"  cy="36" r="5" fill="none" stroke="white" stroke-width="1.5" opacity="0.9"/>
  <circle cx="36" cy="36" r="5" fill="none" stroke="white" stroke-width="1.5" opacity="0.9"/>
  <!-- Cuerpo central mínimo -->
  <circle cx="22" cy="22" r="4" fill="#EC5B13"/>
  <!-- Indicador frontal -->
  <polygon points="22,8 20,15 24,15" fill="#fff" opacity="0.95"/>
</svg>`;

function createDroneIcon(yaw = 0) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px; height:28px;
      transform: rotate(${yaw}deg);
      transform-origin: center;
      filter: drop-shadow(0 1px 4px rgba(0,0,0,.8));
      transition: transform 0.1s linear;
    ">${DRONE_SVG}</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  });
}

// ── Inner component con acceso al map instance ───────────────────
function MapController({ path, telemetry, onReady }) {
  const map          = useMap();
  const markerRef    = useRef(null);
  const playedRef    = useRef(null);   // L.Polyline del tramo recorrido
  const remainRef    = useRef(null);   // L.Polyline del tramo pendiente
  const currentYaw   = useRef(0);

  useEffect(() => {
    if (!map || !path.length) return;

    const latlngs = path.map(p => [p.lat, p.lng]);

    // ── Polylines estáticas ──────────────────────────────────────
    // Tramo pendiente (gris) — toda la ruta al inicio
    remainRef.current = L.polyline(latlngs, {
      color: '#475569', weight: 2.5, opacity: 0.6,
    }).addTo(map);

    // Tramo recorrido (naranja) — vacío al inicio
    playedRef.current = L.polyline([], {
      color: '#EC5B13', weight: 3.5, opacity: 0.9,
    }).addTo(map);

    // Marcador de inicio
    L.marker(latlngs[0], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:10px">🛫</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      }),
    }).bindTooltip('Despegue', { permanent: true, direction: 'top', offset: [0, -6],
        className: 'text-xs font-bold' }).addTo(map);

    // Marcador de fin
    L.marker(latlngs[latlngs.length - 1], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:10px">🛬</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      }),
    }).bindTooltip('Aterrizaje', { permanent: true, direction: 'top', offset: [0, -6],
        className: 'text-xs font-bold' }).addTo(map);

    // ── Dron marker (posición inicial) ───────────────────────────
    const firstFrame = telemetry.find(f => f.hasGps) ?? telemetry[0];
    const startLatLng = firstFrame
      ? [firstFrame.lat, firstFrame.lng]
      : latlngs[0];

    markerRef.current = L.marker(startLatLng, {
      icon: createDroneIcon(0),
      zIndexOffset: 1000,
    }).addTo(map);

    // Fit bounds
    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 18 });

    // ── API imperativa para el padre ─────────────────────────────
    onReady({
      updateDrone(frame) {
        if (!frame?.hasGps) return;
        const ll = [frame.lat, frame.lng];

        // Mover marcador
        markerRef.current?.setLatLng(ll);

        // Rotar ícono (sin recrear el marcador completo)
        const el = markerRef.current?.getElement();
        if (el) {
          const inner = el.querySelector('div');
          if (inner) inner.style.transform = `rotate(${frame.yaw ?? 0}deg)`;
        }
        currentYaw.current = frame.yaw ?? 0;

        // Suavemente centrar el mapa en el dron si está fuera del viewport
        if (!map.getBounds().contains(ll)) {
          map.panTo(ll, { animate: true, duration: 0.5 });
        }
      },

      updatePlayedPath(telemetryIdx) {
        if (!playedRef.current || !remainRef.current) return;
        // Usar solo frames con GPS válido hasta el índice actual
        const played  = [];
        const remain  = [];
        let reachedIdx = false;

        for (let i = 0; i < path.length; i++) {
          // Aproximar: comparar t del path con t del telemetry[telemetryIdx]
          const pt = path[i];
          const ft = telemetry[telemetryIdx]?.t ?? 0;
          if (pt.t <= ft) {
            played.push([pt.lat, pt.lng]);
          } else {
            remain.push([pt.lat, pt.lng]);
          }
        }

        // Para que remain conecte con el último punto played
        if (played.length > 0 && remain.length > 0) {
          remain.unshift(played[played.length - 1]);
        }

        playedRef.current.setLatLngs(played);
        remainRef.current.setLatLngs(remain);
      },
    });

    return () => {
      markerRef.current?.remove();
      playedRef.current?.remove();
      remainRef.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// ── Componente público ───────────────────────────────────────────
export default function FlightAnimMap({ path, telemetry, meta, onReady }) {
  if (!path.length) return null;

  const center = path[Math.floor(path.length / 2)];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      {/* Satelital ESRI — maxZoom (22) es hasta dónde se puede acercar en la UI;
          maxNativeZoom (19, la cobertura real de Esri en la mayoría de Colombia)
          es hasta dónde existen tiles reales. Por encima de eso, Leaflet amplía
          el último tile real disponible en vez de pedir uno inexistente — así se
          evita el tile gris de "imagen no disponible" al hacer zoom máximo. */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles © Esri"
        maxZoom={22}
        maxNativeZoom={19}
      />
      {/* Labels */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        attribution=""
        maxZoom={22}
        maxNativeZoom={19}
        opacity={0.65}
      />
      <MapController path={path} telemetry={telemetry} onReady={onReady} />
    </MapContainer>
  );
}
