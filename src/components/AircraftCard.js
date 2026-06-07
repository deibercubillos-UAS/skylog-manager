'use client';
import { useState, useRef, useEffect } from 'react';

export default function AircraftCard({ aircraft, onEdit, onBaja, onTransfer, canManage = true, canManageStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!aircraft) return null;

  const hours = parseFloat(aircraft.total_hours || 0);
  const lastMaintHours = parseFloat(aircraft.last_maintenance_hours || 0);
  const diffHours = Math.max(0, hours - lastMaintHours);
  const hourProgress = Math.min(100, (diffHours / 200) * 100);

  const creationDate = aircraft.created_at ? new Date(aircraft.created_at) : new Date();
  const lastDate = aircraft.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : creationDate;
  const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
  const timeProgress = Math.min(100, (daysSince / 182) * 100);

  const finalProgress = Math.max(hourProgress, timeProgress);
  let barColor = finalProgress >= 90 ? "bg-red-600" : finalProgress >= 75 ? "bg-orange-500" : "bg-emerald-500";

  const isBaja = aircraft.status === 'Baja';
  const isTransferred = aircraft.status === 'Transferido';
  const inactive = isBaja || isTransferred;

  return (
    <div className={`bg-white rounded-[2rem] border shadow-sm flex flex-col sm:flex-row group hover:shadow-md transition-all text-left ${inactive ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
      <div className="w-full sm:w-40 h-40 sm:h-auto bg-slate-100 shrink-0 relative overflow-hidden rounded-t-[2rem] sm:rounded-l-[2rem] sm:rounded-tr-none">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${aircraft.image_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400'})` }}></div>
        {inactive && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isBaja ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              {isBaja ? 'BAJA' : 'TRANSFERIDO'}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
        <div className="flex justify-between items-start">
          <div className="truncate pr-2">
            <h3 className="font-black text-slate-900 text-base md:text-lg uppercase leading-tight truncate">{aircraft.model || 'UAS'}</h3>
            <p className="text-orange-600 text-xs font-black font-mono tracking-widest mt-1">RUAS: {aircraft.ruas || '---'}</p>
            {isBaja && aircraft.baja_reason && (
              <p className="text-red-500 text-[10px] font-bold mt-1 truncate">Baja: {aircraft.baja_reason}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 relative" ref={menuRef}>
            {/* Botón Editar — solo si puede gestionar la flota y no está en baja/transferido */}
            {canManage && !inactive && (
              <button onClick={() => onEdit(aircraft)}
                className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors active:scale-95">
                <span className="material-symbols-outlined text-lg">edit_square</span>
              </button>
            )}

            {/* Menú de opciones adicionales */}
            {canManage && !inactive && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 min-w-[200px]">
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(aircraft); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-slate-400">edit_square</span>
                      Editar aeronave
                    </button>

                    {canManageStatus && (
                      <>
                        <div className="h-px bg-slate-100 mx-3 my-1" />
                        <button
                          onClick={() => { setMenuOpen(false); onBaja(aircraft); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">archive</span>
                          Dar de baja
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); onTransfer(aircraft); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">swap_horiz</span>
                          Transferir a otra organización
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-end">
            <p className="text-xs font-bold text-slate-700">{hours.toFixed(2)}h <span className="text-xs text-slate-400 uppercase">T.T</span></p>
            <p className="text-xs font-black text-slate-400 uppercase">Salud Técnica</p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${inactive ? 'bg-slate-300' : barColor} transition-all duration-1000`} style={{ width: `${finalProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
