export default function DashboardMockup() {
  const bars = [
    { h: 30, label: 'NOV' },
    { h: 55, label: 'DIC' },
    { h: 40, label: 'ENE' },
    { h: 70, label: 'FEB' },
    { h: 50, label: 'MAR' },
    { h: 90, label: 'ABR' },
  ];

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none" aria-hidden="true">
      {/* Glow de fondo */}
      <div className="absolute -inset-4 bg-orange-400/10 rounded-[3rem] blur-3xl" />

      {/* Frame navegador */}
      <div className="relative rounded-[1.5rem] overflow-hidden shadow-2xl border border-slate-200 bg-white">
        {/* Barra del navegador */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex-1 mx-4 h-5 bg-slate-200 rounded-full flex items-center px-3">
            <span className="text-[8px] text-slate-400 font-mono">app.bitafly.com/dashboard</span>
          </div>
        </div>

        {/* Contenido del dashboard */}
        <div className="flex h-[340px]">
          {/* Sidebar */}
          <div className="w-14 bg-[#1A202C] flex flex-col items-center py-4 gap-4 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
            </div>
            {['M12 2L2 7l10 5 10-5-10-5z','M12 22V12','M5 12l7 3 7-3','M12 8v4','M8 16h8'].map((d, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? '#ec5b13' : '#64748b'} strokeWidth="2" strokeLinecap="round">
                  <path d={d}/>
                </svg>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 bg-[#f8f6f6] p-4 overflow-hidden flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Panel de Control</p>
                <p className="text-xs font-black text-[#1A202C]">Bienvenido, Operador</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-[7px] font-black text-white">A</span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Horas', value: '124.5h', color: '#1A202C' },
                { label: 'Flota', value: '6', color: '#ec5b13' },
                { label: 'Pilotos', value: '8', color: '#1A202C' },
                { label: 'Alertas', value: '1', color: '#ef4444' },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                  <p className="text-[6px] font-black text-slate-400 uppercase tracking-wider">{k.label}</p>
                  <p className="text-sm font-black mt-0.5" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Chart + Compliance */}
            <div className="flex gap-2 flex-1 min-h-0">
              {/* Bar chart */}
              <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-2">Actividad Mensual</p>
                <div className="flex-1 flex items-end gap-1.5 border-b border-slate-100 pb-1">
                  {bars.map((b) => (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                      <div
                        className="w-full rounded-t-sm bg-orange-500"
                        style={{ height: `${b.h}%` }}
                      />
                      <span className="text-[5px] font-black text-slate-400 uppercase">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance */}
              <div className="w-[90px] bg-[#1A202C] rounded-xl p-3 flex flex-col shrink-0">
                <p className="text-[6px] font-black text-orange-500 uppercase tracking-widest mb-2">Compliance</p>
                <div className="space-y-1.5">
                  <div className="bg-white/5 rounded-lg p-1.5 border border-white/10">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <p className="text-[5px] font-bold text-white leading-tight">Operación Segura</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1.5 border border-red-500/20">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <p className="text-[5px] font-bold text-white leading-tight">Médico vencido — López</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent table rows */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-50 flex justify-between items-center">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</p>
                <span className="text-[6px] font-black text-orange-500 uppercase">Ver todo →</span>
              </div>
              {[
                { ref: 'F-OPS-001-2024', pilot: 'A. García', uav: 'DJI M300' },
                { ref: 'F-OPS-002-2024', pilot: 'C. López', uav: 'DJI M30T' },
              ].map((r) => (
                <div key={r.ref} className="flex items-center px-3 py-1.5 border-b border-slate-50 last:border-0 gap-2">
                  <span className="text-[6px] font-black font-mono text-orange-600 w-24 shrink-0">{r.ref}</span>
                  <span className="text-[6px] font-bold text-slate-600 flex-1">{r.pilot}</span>
                  <span className="text-[6px] text-slate-400 flex-1">{r.uav}</span>
                  <span className="text-[5px] font-black uppercase bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100">Registrado</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-3 -right-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">RAC 100 · En cumplimiento</span>
      </div>
    </div>
  );
}
