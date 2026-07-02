'use client';
import { useState, useEffect } from 'react';
import PageHero from '@/components/PageHero';
import WeatherWidget from '@/components/WeatherWidget';

// Bogotá D.C. como ubicación por defecto si el usuario no comparte su ubicación.
const DEFAULT = { lat: 4.711, lon: -74.0721, label: 'Bogotá D.C.' };

export default function WeatherPage() {
  const [coords, setCoords] = useState(DEFAULT);
  const [geoState, setGeoState] = useState('idle'); // idle | locating | granted | denied

  const locate = () => {
    if (!navigator.geolocation) { setGeoState('denied'); return; }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Mi ubicación' });
        setGeoState('granted');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  // Intentar ubicar automáticamente al montar (sin bloquear si el usuario niega).
  useEffect(() => { locate(); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left animate-in fade-in duration-500 pb-20">
      <PageHero
        eyebrow="Operación"
        title="Meteorología"
        description="Condiciones en tiempo real para decidir ventanas de vuelo seguras."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-orange-500">location_on</span>
          {coords.label}
          {geoState === 'denied' && <span className="text-slate-300 normal-case font-medium">(ubicación no disponible — mostrando Bogotá)</span>}
        </p>
        <button
          onClick={locate}
          disabled={geoState === 'locating'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">{geoState === 'locating' ? 'hourglass_empty' : 'my_location'}</span>
          {geoState === 'locating' ? 'Ubicando...' : 'Usar mi ubicación'}
        </button>
      </div>

      <WeatherWidget lat={coords.lat} lon={coords.lon} label={coords.label} />
    </div>
  );
}
