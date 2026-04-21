'use client';
import { useState } from 'react'; // Quitamos useEffect porque los datos ya vienen del servidor
import Link from 'next/link';

// Recibimos 'initialData' como prop
export default function DashboardClient({ initialData }) {
    // Usamos los datos que nos pasó el servidor
    const [data] = useState(initialData);

    // ELIMINAMOS EL FETCH Y EL LOADING (Ya no son necesarios, carga instantáneo)
    
    const counts = data?.chart?.map(m => m.count) || [0];
    const maxVal = Math.max(...counts, 1); 

    return (
        <div className="space-y-8 animate-in fade-in duration-700 text-left pb-10">
            {/* AQUÍ VA TODO TU DISEÑO TAL CUAL LO TIENES */}
            {/* Solo asegúrate de que Link esté importado arriba */}
            
            {/* ... resto de tu código ... */}
            <KPICard title="Horas de Vuelo" value={`${data?.stats?.hours || '0.0'}h`} icon="timer" color="text-slate-900" />
            {/* ... etc ... */}
        </div>
    );
}

// Manten tu función KPICard abajo igual...