'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para iconos de marcadores
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { fixLeafletIcons(); }, []);

  // --- COMPONENTE INTERNO PARA CONTROLAR EL MOVIMIENTO DEL MAPA ---
  function MapController() {
    const map = useMap();
    
    // Captura de clics para poner puntos
    useMapEvents({
      click(e) {
        if (type === 'circle' && tempPoints.length >= 1) {
            setTempPoints([e.latlng]);
        } else {
            setTempPoints(prev => [...prev, e.latlng]);
        }
      },
    });

    return null;
  }

  // --- LÓGICA DE BÚSQUEDA GEOGRÁFICA ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);

    try {
        // 1. Verificar si son coordenadas (Lat, Lng)
        const coordsRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
        
        if (coordsRegex.test(searchQuery)) {
            const [lat, lng] = searchQuery.split(',').map(n => parseFloat(n.trim()));
            // Como no podemos usar 'useMap' fuera del container, forzamos un re-render
            // enviando un punto temporal que el mapa centrará (se maneja con estado si fuera necesario)
            // Para simplicidad en este modal, el usuario solo debe buscar.
            alert(`Coordenadas detectadas. Buscando: ${lat}, ${lng}`);
            // Nota: En la implementación de abajo usamos una técnica de "FlyTo"
        }

        // 2. Búsqueda por Nombre vía Nominatim (OpenStreetMap)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            // Evento personalizado para que el mapa se mueva
            const event = new CustomEvent('map-fly-to', { detail: [parseFloat(lat), parseFloat(lon)] });
            window.dispatchEvent(event);
        } else {
            alert("No se encontró el lugar solicitado.");
        }
    } catch (err) {
        alert("Error en el servicio de búsqueda.");
    } finally {
        setIsSearching(false);
    }
  };

  // Sub-componente para escuchar el evento de "Volar a"
  function SearchFlyTo() {
    const map = useMap();
    useEffect(() => {
        const handler = (e) => {
            map.flyTo(e.detail, 16, { animate: true });
        };
        window.addEventListener('map-fly-to', handler);
        return () => window.removeEventListener('map-fly-to', handler);
    }, [map]);
    return null;
  }

  if (typeof window === 'undefined') return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex flex-col font-display animate-in fade-in duration-300">
      
      {/* CABECERA CON BUSCADOR INTEGRADO */}
      <header className="bg-white p-4 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-outlined">explore</span>
            </div>
            <form onSubmit={handleSearch} className="relative w-full md:w-80">
                <input 
                    type="text"
                    placeholder="Buscar lugar o Lat, Lng..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin size-3 border-2 border-orange-500 border-b-transparent rounded-full"></div>}
            </form>
        </div>

        {/* CONTROLES DE RADIO Y ACCIÓN */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
            {type === 'circle' && tempPoints.length > 0 && (
                <div className="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                    <span className="text-[9px] font-black text-orange-600 uppercase">Radio:</span>
                    <input type="range" min="50" max="5000" step="50" className="w-20 accent-orange-600" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} />
                    <span className="text-xs font-black text-orange-700 w-10">{radius}m</span>
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={() => setTempPoints([])} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase">Limpiar</button>
                <button onClick={() => onSave({ points: tempPoints, radius })} className="px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
                <button onClick={onClose} className="material-symbols-outlined text-slate-300">close</button>
            </div>
        </div>
      </header>

      {/* MAPA */}
      <div className="flex-1 relative">
        <MapContainer center={[4.5709, -74.2973]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController />
          <SearchFlyTo />
          
          {tempPoints.map((p, i) => <Marker key={i} position={p} />)}
          
          {type === 'polygon' && tempPoints.length >= 3 && (
            <Polygon positions={tempPoints} pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.3 }} />
          )}
          {type === 'linear' && tempPoints.length >= 2 && (
            <Polyline positions={tempPoints} pathOptions={{ color: '#ec5b13', weight: 4 }} />
          )}
          {type === 'circle' && tempPoints.length === 1 && (
            <Circle center={tempPoints[0]} radius={radius} pathOptions={{ color: '#ec5b13', fillColor: '#ec5b13', fillOpacity: 0.3 }} />
          )}
        </MapContainer>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[600] bg-slate-900/90 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">
            {tempPoints.length === 0 ? 'Busque un lugar o haga clic para marcar' : `${tempPoints.length} Puntos registrados`}
        </div>
      </div>
    </div>
  );
}