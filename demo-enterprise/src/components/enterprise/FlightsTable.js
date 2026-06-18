'use client';

import { useDemo } from '@/lib/demoStore';
import { fmtDate, fmtDuration } from '@/lib/format';
import Icon from '@/components/Icon';

export default function FlightsTable() {
  const { flights, pilotById, missionById } = useDemo();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="table_rows" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
          Vuelos recibidos
        </h2>
        <span className="ml-auto text-xs text-slate-400">{flights.length} registros</span>
      </div>

      {flights.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Aún no hay vuelos cargados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Misión</th>
                <th className="py-2 pr-3">Piloto</th>
                <th className="py-2 pr-3">Aeronave</th>
                <th className="py-2 pr-3 text-right">Duración</th>
                <th className="py-2 pr-3 text-right">Alt. máx</th>
                <th className="py-2 pr-3 text-right">Distancia</th>
                <th className="py-2 text-right">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => {
                const pilot = pilotById(f.pilotId);
                const mission = missionById(f.missionId);
                return (
                  <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{fmtDate(f.date)}<span className="text-slate-300"> {f.takeoff}</span></td>
                    <td className="py-2.5 pr-3 text-slate-700 max-w-[160px] truncate">{mission?.name || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{pilot?.name || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{f.aircraft}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700 font-medium whitespace-nowrap">{fmtDuration(f.durationMin)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-500 whitespace-nowrap">{f.maxAlt} m</td>
                    <td className="py-2.5 pr-3 text-right text-slate-500 whitespace-nowrap">{f.distanceKm} km</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-orange-600">
                        <Icon name="toll" className="text-xs" /> -1
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3">
        En producción cada fila trae además GPS/replay completo, consumible por API.
      </p>
    </div>
  );
}
