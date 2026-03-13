"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [stats, setStats] = useState({ drones: 0, pilots: 0, flights: 0 })
  const [recentFlights, setRecentFlights] = useState([])
  const [userName, setUserName] = useState('Admin SkyLog')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile) setUserName(profile.full_name)

      // Consultas en paralelo para velocidad
      const [dronesRes, pilotsRes, flightsRes, recentRes] = await Promise.all([
        supabase.from('aircraft').select('id', { count: 'exact' }),
        supabase.from('pilots').select('id', { count: 'exact' }),
        supabase.from('flights').select('id', { count: 'exact' }),
        supabase.from('flights').select('*, aircraft(model), pilots(name)').order('created_at', { ascending: false }).limit(3)
      ])

      setStats({
        drones: dronesRes.count || 0,
        pilots: pilotsRes.count || 0,
        flights: flightsRes.count || 0
      })
      setRecentFlights(recentRes.data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/register')
  }

  return (
    <div className="bg-[#f8f6f6] text-slate-900 flex h-screen overflow-hidden font-sans">
      
      {/* --- SIDENAVBAR --- */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">flight_takeoff</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <NavItem href="/dashboard" icon="dashboard" label="Dashboard" active />
          <NavItem href="/dashboard/pilots" icon="person" label="Mis Pilotos" />
          <NavItem href="/dashboard/fleet" icon="precision_manufacturing" label="Mi Flota" />
          <NavItem href="/dashboard/flights" icon="menu_book" label="Bitácora de Vuelos" />
          <NavItem href="/dashboard/sora" icon="shield" label="Análisis SORA" />
          <NavItem href="/dashboard/checklist" icon="fact_check" label="Checklist" />
          <NavItem href="#" icon="build" label="Mantenimiento" />
          <NavItem href="#" icon="description" label="Reportes PDF" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="size-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
              <img alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuALiyQ6_Lcv2hN5plv5MWhwbVDWp8zzd5HVbRHBNfDy9rwvWVzfPEu152QlLKxLM2p6yOBOwi5qRfzjMqrW8MAbAzx4Ah_9EbX-gAGQVVGS0wnUw-AsWdGqI1-HyilMN6CvFK27d7ymu2OROlvrs2PTgMN09ZoEPAiiaP3JVkBq9odjyrz4wWp-9uWtp1MrMWXl30t_Ui2e7_9r3lLlIOJNeNyRcpXlSCRSVO5m5WsuRazLqLuE2munY_kB1mckgjMzdd8VEklROvY" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-slate-500 text-xs truncate">Operaciones</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 text-xs font-bold rounded-lg transition-colors uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13]">search</span>
              <input className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20 transition-all" placeholder="Buscar vuelo, drone o piloto..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/flights" className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition-all">
              <span className="material-symbols-outlined text-sm">add</span> NUEVO VUELO
            </Link>
            <div className="relative">
              <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Horas Totales" value={`${(stats.flights * 1.2).toFixed(1)}h`} sub="+5.2%" />
            <StatCard label="Flota Operativa" value={`${stats.drones}/${stats.drones + 2}`} />
            <StatCard label="Pilotos Certificados" value={stats.pilots} sub="Activos" />
            <StatCard label="Seguro Aeronave" value="15 Días" icon="warning" alert />
          </div>

          {/* Row 2: Charts Mockup */}
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Actividad Mensual</h3>
                <span className="text-[10px] font-bold text-slate-400">Últimos 6 meses</span>
              </div>
              <div className="h-48 w-full flex items-end gap-2 px-2">
                <div className="flex-1 bg-orange-100 rounded-t-sm" style={{height: '40%'}}></div>
                <div className="flex-1 bg-orange-200 rounded-t-sm" style={{height: '60%'}}></div>
                <div className="flex-1 bg-orange-100 rounded-t-sm" style={{height: '55%'}}></div>
                <div className="flex-1 bg-[#ec5b13] rounded-t-sm" style={{height: '85%'}}></div>
                <div className="flex-1 bg-orange-200 rounded-t-sm" style={{height: '70%'}}></div>
                <div className="flex-1 bg-[#ec5b13] rounded-t-sm" style={{height: '90%'}}></div>
              </div>
              <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-slate-400 uppercase">
                <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest mb-6">Tipos de Misión</h3>
              <div className="space-y-4">
                <MissionProgress label="Fotogrametría" percent={45} color="bg-[#ec5b13]" />
                <MissionProgress label="Inspección" percent={30} color="bg-[#1A202C]" />
                <MissionProgress label="Rescate" percent={15} color="bg-emerald-500" />
                <MissionProgress label="Mapeo" percent={10} color="bg-slate-400" />
              </div>
            </div>
          </div>

          {/* Row 3: Alerts & Compliance */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest">
                <span className="material-symbols-outlined text-[#ec5b13] text-lg">gavel</span> Alerts & Compliance
              </h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">3 Pending Actions</span>
            </div>
            <div className="divide-y divide-slate-100">
              <AlertItem title="DJI Matrice 300 RTK" desc="Mantenimiento preventivo requerido pronto" time="4.5h restantes" progress={90} />
              <AlertItem title="Carlos Rodriguez" desc="Certificado médico por expirar" time="12 Días" danger />
              <AlertItem title="HK-500 Fleet Policy" desc="Renovación de seguro anual" time="Warning" warning />
            </div>
          </div>

          {/* Row 4: Recent Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-xs uppercase tracking-widest">Actividad Reciente</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Piloto</th>
                    <th className="px-6 py-3">Drone</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentFlights.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm">{new Date(f.flight_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-medium">{f.pilots?.name}</td>
                      <td className="px-6 py-4 text-sm">{f.aircraft?.model}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                          <span className="size-1.5 rounded-full bg-emerald-500"></span> Completado
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-[#ec5b13]"><span className="material-symbols-outlined text-lg">visibility</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// --- COMPONENTES INTERNOS ---

function NavItem({ href, icon, label, active = false }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${active ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' : 'text-slate-300 hover:bg-slate-800'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

function StatCard({ label, value, sub, icon, alert }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${alert ? 'ring-2 ring-yellow-400/20' : ''}`}>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${alert ? 'text-yellow-600' : ''}`}>{value}</span>
        {sub && <span className="text-emerald-500 text-xs font-bold">{sub}</span>}
        {icon && <span className="material-symbols-outlined text-yellow-600 text-xl ml-auto">{icon}</span>}
      </div>
    </div>
  )
}

function MissionProgress({ label, percent, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase">
        <span className="text-slate-500">{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{width: `${percent}%`}}></div>
      </div>
    </div>
  )
}

function AlertItem({ title, desc, time, progress, danger, warning }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className={`size-10 rounded-lg flex items-center justify-center ${danger ? 'bg-red-100 text-red-600' : warning ? 'bg-yellow-100 text-yellow-600' : 'bg-orange-100 text-[#ec5b13]'}`}>
          <span className="material-symbols-outlined">{danger ? 'medical_information' : warning ? 'history_edu' : 'build'}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className={`text-xs ${danger ? 'text-red-500' : 'text-slate-500'}`}>{desc}</p>
          {progress && (
            <div className="w-full max-w-xs mt-2 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#ec5b13] h-full" style={{width: `${progress}%`}}></div>
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold ${danger ? 'text-red-600' : warning ? 'text-yellow-600' : 'text-[#ec5b13]'}`}>{time}</p>
        <button className="text-[10px] font-bold uppercase text-slate-400 hover:text-[#ec5b13] underline">Detalles</button>
      </div>
    </div>
  )
}