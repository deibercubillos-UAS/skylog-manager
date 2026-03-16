export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Horas" value="245.8h" trend="+5.2%" color="emerald" />
        <KPICard title="Flota Operativa" value="8/10" statusDots={[1,1,1,1,1,1,1,1,0,0]} />
        <KPICard title="Pilotos Certificados" value="12" subtitle="Activos" />
        <KPICard title="Seguro (Vencimiento)" value="15 Días" warning={true} />
      </div>

      {/* Gráficos Mockup */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
          <h3 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Actividad Mensual</h3>
          <div className="h-48 w-full flex items-end gap-2 px-2">
            {[40, 60, 55, 85, 70, 90, 50].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-[#ec5b13]/20 hover:bg-[#ec5b13] transition-all rounded-t-lg cursor-pointer"></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
          <h3 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Tipos de Misión</h3>
          <div className="space-y-4">
            <ProgressLine label="Fotogrametría" percent={45} color="bg-[#ec5b13]" />
            <ProgressLine label="Inspección" percent={30} color="bg-[#1A202C]" />
            <ProgressLine label="Rescate" percent={15} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Tabla de Actividad Reciente */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest text-left">Actividad Reciente</h3>
          <button className="text-[10px] font-bold text-[#ec5b13] hover:underline uppercase">Ver todo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Piloto</th>
                <th className="px-6 py-4">Aeronave</th>
                <th className="px-6 py-4">Duración</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <ActivityRow date="24 Oct, 14:20" pilot="Carlos R." drone="Matrice 300 #04" time="01h 45m" />
              <ActivityRow date="24 Oct, 11:05" pilot="Elena M." drone="Mavic 3 Ent." time="42m" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Componentes Internos para limpieza ---

function KPICard({ title, value, trend, subtitle, statusDots, warning }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left ${warning ? 'ring-2 ring-orange-500/20' : ''}`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-black ${warning ? 'text-orange-600' : 'text-slate-900'}`}>{value}</span>
        {trend && <span className="text-emerald-500 text-xs font-bold">{trend}</span>}
        {subtitle && <span className="text-slate-400 text-xs">{subtitle}</span>}
      </div>
      {statusDots && (
        <div className="flex gap-1 mt-2">
          {statusDots.map((d, i) => <span key={i} className={`size-1.5 rounded-full ${d ? 'bg-emerald-500' : 'bg-red-500'}`}></span>)}
        </div>
      )}
    </div>
  );
}

function ProgressLine({ label, percent, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
        <span className="text-slate-500">{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function ActivityRow({ date, pilot, drone, time }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 text-xs font-medium">{date}</td>
      <td className="px-6 py-4 text-xs font-bold text-slate-700">{pilot}</td>
      <td className="px-6 py-4 text-xs text-slate-500">{drone}</td>
      <td className="px-6 py-4 text-xs font-mono">{time}</td>
      <td className="px-6 py-4 text-right">
        <button className="material-symbols-outlined text-slate-400 hover:text-[#ec5b13] text-lg">visibility</button>
      </td>
    </tr>
  );
}