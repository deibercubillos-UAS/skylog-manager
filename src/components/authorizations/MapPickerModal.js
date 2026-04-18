'use client';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de Leaflet en Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function MapPickerModal({ type, points, onSave, onClose }) {
  const [tempPoints, setTempPoints] = useState(points || []);

  function MapEvents() {
    useMapEvents({
      click(e) {
        if (type === 'circle' && tempPoints.length >= 1) return; // Solo un centro para círculo
        setTempPoints([...tempPoints, e.latlng]);
      },
    });
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex flex-col">
      <header className="p-6 bg-white flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black uppercase">Selector Geográfico</h3>
          <p className="text-[10px] font-bold text-orange-600 uppercase">Modo: {type}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setTempPoints([])} className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase">Limpiar</button>
          <button onClick={() => onSave(tempPoints)} className="px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Confirmar Coordenadas</button>
          <button onClick={onClose} className="material-symbols-outlined text-slate-400">close</button>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer center={[4.5709, -74.2973]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents />
          
          {tempPoints.map((p, i) => <Marker key={i} position={p} />)}
          
          {type === 'polygon' && tempPoints.length > 2 && <Polygon positions={tempPoints} color="orange" />}
          {type === 'linear' && tempPoints.length > 1 && <Polyline positions={tempPoints} color="orange" />}
          {type === 'circle' && tempPoints.length === 1 && <Circle center={tempPoints[0]} radius={1000} color="orange" />}
        </MapContainer>
        
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[600] bg-white/90 p-4 rounded-2xl shadow-2xl border border-orange-200">
            <p className="text-[10px] font-black text-slate-900 uppercase">Instrucción: Haga clic en el mapa para marcar los vértices.</p>
        </div>
      </div>
    </div>
  );
}