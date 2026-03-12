export default function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f8f6f6]">
      {/* Sidebar Simple */}
      <aside className="w-64 bg-[#1A202C] text-white p-6 flex flex-col">
        <div className="text-2xl font-bold text-[#ec5b13] mb-10 flex items-center gap-2">
           <span className="material-symbols-outlined">flight_takeoff</span> SkyLog
        </div>
        <nav className="flex-1 space-y-4">
          <a href="#" className="flex items-center gap-3 text-[#ec5b13] bg-white/10 p-2 rounded-lg"><span className="material-symbols-outlined">dashboard</span> Dashboard</a>
          <a href="#" className="flex items-center gap-3 text-slate-400 p-2"><span className="material-symbols-outlined">description</span> Bitácora</a>
          <a href="#" className="flex items-center gap-3 text-slate-400 p-2"><span className="material-symbols-outlined">precision_manufacturing</span> Flota</a>
          <a href="#" className="flex items-center gap-3 text-slate-400 p-2"><span className="material-symbols-outlined">shield</span> SORA</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black">Panel de Operaciones</h2>
          <button className="bg-[#ec5b13] text-white px-6 py-2 rounded-xl font-bold shadow-lg">+ NUEVO VUELO</button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">Horas Totales</p>
            <p className="text-3xl font-black text-[#1A202C]">245.8h</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">Flota Activa</p>
            <p className="text-3xl font-black text-[#1A202C]">8/10</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">Pilotos</p>
            <p className="text-3xl font-black text-[#1A202C]">12</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-red-100">
            <p className="text-xs font-bold text-red-400 uppercase">Vencimientos</p>
            <p className="text-3xl font-black text-red-600">3 Alertas</p>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b font-bold">Vuelos Recientes</div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Piloto</th>
                <th className="p-4">Drone</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-4">24 Oct, 14:20</td>
                <td className="p-4">Carlos Ruiz</td>
                <td className="p-4">Mavic 3E</td>
                <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold">COMPLETADO</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}