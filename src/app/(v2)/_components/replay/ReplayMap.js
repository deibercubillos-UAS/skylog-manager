'use client';

// Mapa del replay (Leaflet): capa satelital o de calles, ruta pendiente y recorrida, punto de origen, despegue/aterrizaje,
// marcadores de alertas y el dron que se mueve y gira. API imperativa (`onReady`) para actualizar a 60 fps sin pasar por React.
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DRONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 44 44"><g stroke="#EC5B13" stroke-width="3" stroke-linecap="round"><line x1="22" y1="22" x2="8" y2="8"/><line x1="22" y1="22" x2="36" y2="8"/><line x1="22" y1="22" x2="8" y2="36"/><line x1="22" y1="22" x2="36" y2="36"/></g><g fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"><circle cx="8" cy="8" r="5"/><circle cx="36" cy="8" r="5"/><circle cx="8" cy="36" r="5"/><circle cx="36" cy="36" r="5"/></g><circle cx="22" cy="22" r="4" fill="#EC5B13"/><polygon points="22,6 19,15 25,15" fill="#fff"/></svg>`;
const SEVERITY_COLOR = ['#38bdf8', '#f59e0b', '#ef4444'];

const dot = (color, size, glyph = '') => L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.55)}px;line-height:1">${glyph}</div>` });

const MAX_ZOOM = 25; // más allá de la cobertura real de las imágenes (≈19) se amplía el último mosaico: se ve borroso pero permite acercarse al detalle

// Cuando Esri no tiene imagen a un nivel de zoom en esa zona, no da error: devuelve un mosaico gris plano con el texto «Map data not yet
// available». Se detecta ese mosaico (gris casi uniforme y claro) y se baja el nivel nativo de la capa un paso; desde ahí hacia arriba se
// amplía el mosaico real más cercano. Si el navegador no deja leer los píxeles (CORS), se limita a 18 como medida segura.
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function looksLikeNoData(img) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - d[i + 1]) > 8 || Math.abs(d[i + 1] - d[i + 2]) > 8) return false; // con color: es imagen real
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    sum += l;
    sum2 += l * l;
    n += 1;
  }
  const mean = sum / n;
  return mean > 180 && mean < 252 && sum2 / n - mean * mean < 60;
}

function SatelliteLayers({ onCoverage }) {
  const map = useMap();
  useEffect(() => {
    let cap = 19;
    let loaded = 0;
    let errors = 0;
    let imagery;
    let labels;
    const flat = {};
    const make = (cors) => {
      const o = { maxZoom: MAX_ZOOM, maxNativeZoom: cap, ...(cors ? { crossOrigin: true } : {}) };
      imagery = L.tileLayer(ESRI_IMAGERY, { ...o, attribution: 'Tiles © Esri' }).addTo(map);
      labels = L.tileLayer(ESRI_LABELS, { ...o, opacity: 0.6 }).addTo(map);
      return imagery;
    };
    const lower = (z) => {
      if (z <= 15 || z - 1 >= cap) return;
      cap = z - 1;
      imagery.options.maxNativeZoom = cap;
      labels.options.maxNativeZoom = cap;
      imagery.redraw();
      labels.redraw();
      onCoverage?.(cap);
    };
    const attach = (cors) => {
      const layer = make(cors);
      layer.on('tileload', (e) => {
        loaded += 1;
        if (!cors || e.coords.z < cap) return;
        let flatTile = false;
        try { flatTile = looksLikeNoData(e.tile); } catch { if (e.coords.z >= 19) lower(e.coords.z); return; }
        if (flatTile) { flat[e.coords.z] = (flat[e.coords.z] || 0) + 1; if (flat[e.coords.z] >= 2) lower(e.coords.z); }
      });
      layer.on('tileerror', () => {
        errors += 1;
        // Si el servidor no permite CORS ninguna imagen carga: se rehace la capa sin esa opción y con el tope seguro de 18.
        if (cors && loaded === 0 && errors >= 3) { imagery.remove(); labels.remove(); cap = 18; onCoverage?.(18); attach(false); }
      });
    };
    attach(true);
    return () => { imagery.remove(); labels.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function Controller({ points, events, home, onReady, follow, onZoom }) {
  const map = useMap();
  const followRef = useRef(follow);
  followRef.current = follow;

  useEffect(() => {
    if (!map || !points.length) return undefined;
    const all = points.map((p) => [p.lat, p.lng]);
    const layers = [];
    const add = (l) => { l.addTo(map); layers.push(l); return l; };

    add(L.polyline(all, { color: '#e2e8f0', weight: 2.5, opacity: 0.55, dashArray: '4 6' }));
    const played = add(L.polyline([], { color: '#EC5B13', weight: 4, opacity: 0.95 }));
    const tail = add(L.polyline([], { color: '#EC5B13', weight: 4, opacity: 0.95 })); // del último punto guardado a la posición exacta del dron
    add(L.marker(all[0], { icon: dot('#22c55e', 22, '▲') }).bindTooltip('Despegue', { direction: 'top', offset: [0, -8] }));
    add(L.marker(all[all.length - 1], { icon: dot('#ef4444', 22, '■') }).bindTooltip('Aterrizaje', { direction: 'top', offset: [0, -8] }));
    if (home) add(L.marker([home.lat, home.lng], { icon: dot('#3b82f6', 24, '⌂') }).bindTooltip('Punto de origen (casa)', { direction: 'top', offset: [0, -8] }));

    // Alertas sobre la ruta: aparecen en el lugar donde ocurrieron.
    const byT = (t) => { let lo = 0; let hi = points.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (points[m].t < t) lo = m + 1; else hi = m; } return points[lo]; };
    const eventMarkers = (events || []).filter((e) => e.s >= 1).map((e) => {
      const p = byT(e.t);
      const mk = L.circleMarker([p.lat, p.lng], { radius: 6, color: '#fff', weight: 2, fillColor: SEVERITY_COLOR[e.s] || '#f59e0b', fillOpacity: 1 });
      mk.addTo(map);
      layers.push(mk);
      return { e, mk };
    });

    const drone = L.marker(all[0], { icon: L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div data-drone style="width:34px;height:34px;filter:drop-shadow(0 2px 5px rgba(0,0,0,.8))">${DRONE_SVG}</div>` }), zIndexOffset: 1000 }).addTo(map);
    layers.push(drone);
    map.fitBounds(L.latLngBounds(all), { padding: [50, 50], maxZoom: 18 });

    const reportZoom = () => onZoom?.(Math.round(map.getZoom() * 10) / 10);
    map.on('zoomend', reportZoom);
    reportZoom();
    let lastIndex = -1;
    onReady({
      update(sample) {
        if (!sample) return;
        const ll = [sample.lat, sample.lng];
        drone.setLatLng(ll);
        const inner = drone.getElement()?.querySelector('[data-drone]');
        if (inner) inner.style.transform = `rotate(${sample.yaw ?? 0}deg)`;
        if (sample.index !== lastIndex) {
          lastIndex = sample.index;
          played.setLatLngs(all.slice(0, sample.index + 1));
        }
        tail.setLatLngs([all[sample.index], ll]);
        if (followRef.current) map.panTo(ll, { animate: false });
        else if (!map.getBounds().pad(-0.1).contains(ll)) map.panTo(ll, { animate: true, duration: 0.4 });
      },
      fit() { map.fitBounds(L.latLngBounds(all), { padding: [50, 50], maxZoom: 18 }); },
      zoomIn() { map.zoomIn(1); },
      zoomOut() { map.zoomOut(1); },
      zoomToDrone(level = 21) { const ll = drone.getLatLng(); map.setView(ll, Math.max(map.getZoom(), level), { animate: true }); },
      pulse(t) { for (const { e, mk } of eventMarkers) mk.setRadius(Math.abs(e.t - t) < 3 ? 10 : 6); },
    });
    return () => { map.off('zoomend', reportZoom); layers.forEach((l) => l.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points, events, home]);
  return null;
}

export default function ReplayMap({ points, events, home, layer, follow, onReady, onZoom, onCoverage }) {
  const c = points[Math.floor(points.length / 2)];
  return (
    <MapContainer center={[c.lat, c.lng]} zoom={16} maxZoom={MAX_ZOOM} zoomSnap={0.5} zoomDelta={1} wheelPxPerZoomLevel={80} style={{ height: '100%', width: '100%', background: '#0f1420' }} zoomControl={false} attributionControl>
      {layer === 'calle' ? (
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" maxZoom={MAX_ZOOM} maxNativeZoom={19} />
      ) : (
        <SatelliteLayers onCoverage={onCoverage} />
      )}
      <Controller points={points} events={events} home={home} onReady={onReady} follow={follow} onZoom={onZoom} />
    </MapContainer>
  );
}
