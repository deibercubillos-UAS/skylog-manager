'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- ARREGLO DE ICONOS PARA NEXT.JS ---
// Leaflet tiene un bug conocido con los paths de imágenes en entornos empaquetados.
// Esta lógica reasigna los iconos oficiales desde un CDN para asegurar que se vean.
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

export default function MapPickerModal({ type, points, onSave, onClose }) {
  const [tempPoints, setTempPoints] = useState(points || []);
  const [radius, setRadius] = useState(500);

  // Ejecutamos el fix de iconos solo una vez al montar
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Sub-componente interno para capturar los clics del usuario en el mapa
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (type === 'circle' && tempPoints.length >= 1) {
            // En modo círculo, solo permitimos un punto (el centro)
            setTempPoints([e.latlng]);
        } else {
            // En polígono o tramo lineal, acumulamos los vértices
            setTempPoints(prev => [...prev, e.latlng]);
        }
      },
    });
    return null;
  }

  // Si el entorno no es el navegador (SSR), no renderizamos nada para evitar el crash
  if (typeof window === 'undefined') return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex flex-col font-display animate-in fade-in duration-300">
      
      {/* CABECERA DEL RADAR */}
      <header className="h-20 bg-white flex justify-between items-center px-6 md:px-10 shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
            <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <span className="material-symbols-outlined">explore</span>
            </div>
            <div className="text-left">
                <h3 className="text-sm md:text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Captura de Coordenadas</h3>
                <p className="text-[9px] font-bold text-orange-600 uppercase mt-1 tracking-widest">Geometría: {type}</p>
            </div>
        </div>

        {/* CONTROL DE RADIO DINÁMICO (Solo para círculos) */}
        {type === 'circle' && tempPoints.length > 0 && (
            <div className="flex items-center gap-6 px-6 border-l border-r border-slate-100 animate-in slide-in-from-top duration-300">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Radio de Operación</span>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" min="50" max="5000" step="50"
                            className="w-32 accent-orange-600 cursor-pointer"
                            value={radius}
                            onChange={(e) => setRadius(parseInt(e.target.value))}
                        />
                        <span className="text-sm font-black text-orange-600 font-mono w-16">{radius}m</span>
                    </div>
                </div>
                <div className="hidden md:block">
                    <input 
                        type="number" 
                        className="w-20 p-2 bg-slate-50 rounded-lg text-xs font-black text-center outline-none focus:ring-2 focus:ring-orange-500"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setTempPoints([])} 
            className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
          >
            Reiniciar
          </button>
          <button 
                onClick={() => onSave({ points: tempPoints, radius: radius })} 
                className="px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/30 hover:bg-slate-900 transition-all active:scale-95"
            >
                Confirmar Área
            </button>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* MAPA INTERACTIVO */}
      <div className="flex-1 relative">
        <MapContainer 
            center={[4.5709, -74.2973]} // Centro de Colombia por defecto
            zoom={6} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
        >
          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          
          <MapClickHandler />
          
          {/* Renderizado de Marcadores */}
          {tempPoints.map((p, i) => (
            <Marker key={i} position={p} />
          ))}
          
          {/* Renderizado Dinámico de Geometría */}
          {type === 'polygon' && tempPoints.length >= 3 && (
            <Polygon positions={tempPoints} pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.3 }} />
          )}
          
          {type === 'linear' && tempPoints.length >= 2 && (
            <Polyline positions={tempPoints} pathOptions={{ color: '#ec5b13', weight: 4 }} />
          )}
          
          {/* Renderizado de Círculo con Radio Dinámico */}
            {type === 'circle' && tempPoints.length === 1 && (
                <Circle 
                    center={tempPoints[0]} 
                    radius={radius} // <--- AHORA USA EL ESTADO DINÁMICO
                    pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.2 }} 
                />
            )}
        </MapContainer>
        
        {/* INSTRUCCIÓN FLOTANTE */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[600] pointer-events-none w-full max-w-xs md:max-w-md px-4">
            <div className="bg-slate-900/90 text-white p-4 rounded-2xl shadow-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {tempPoints.length === 0 
                        ? 'Haga clic en el mapa para iniciar la captura' 
                        : type === 'circle' 
                            ? 'Punto central capturado' 
                            : `${tempPoints.length} vértices registrados`}
                </p>
                <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold italic">
                    Referencia Geográfica WGS-84
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}