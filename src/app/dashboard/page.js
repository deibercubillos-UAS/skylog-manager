"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({ drones: 0, pilots: 0, flights: 0 })
  const [recentFlights, setRecentFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Operador')

  const fetchDashboardData = async () => {
    setLoading(true)
    
    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile) setUserName(profile.full_name)
    }

    // 2. Contar Drones, Pilotos y Vuelos en paralelo
    const [dronesRes, pilotsRes, flightsRes] = await Promise.all([
      supabase.from('aircraft').select('id', { count: 'exact' }),
      supabase.from('pilots').select('id', { count: 'exact' }),
      supabase.from('flights').select('id', { count: 'exact' })
    ])

    setStats({
      drones: dronesRes.count || 0,
      pilots: pilotsRes.count || 0,
      flights: flightsRes.count || 0
    })

    // 3. Obtener los últimos 5 vuelos con info del drone y piloto
    const { data: latest } = await supabase
      .from('flights')
      .select('*, aircraft(model), pilots(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentFlights(latest || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1A202C] text-white p-6 flex flex-col hidden md:flex">
        <div className="text-2xl font-black text-[#ec5b13] mb-10 flex items-center gap-2">
           <span className="material-symbols-outlined">flight_takeoff</span> SkyLog
        </div>
        <nav className="flex-1 space-y-2">
          <MenuLink href="/dashboard" icon="dashboard" label="Dashboard" active />
          <MenuLink href="/dashboard/flights" icon="description" label="Bitácora" />
          <MenuLink href="/dashboard/fleet" icon="precision_manufacturing" label="Mi Flota" />
          <MenuLink href="/dashboard/pilots" icon="person" label="Pilotos" />
          <MenuLink href="/dashboard/sora" icon="shield" label="SORA Risk" />
          <MenuLink href="/dashboard/checklist" icon="fact_check" label="Checklist" />
        </nav>
        <div className="pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Usuario</p>
            <p className="text-sm font-medium text-[#ec5b13]">{userName}</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#1A202C]">Panel Operativo</h1>
            <p className="text-slate-500">Bienvenido de nuevo, {userName.split(' ')[0]}</p>
          </div>
          <Link href="/dashboard/flights" className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-orange-500/20 hover:scale-105 transition-all">
            + NUEVO REGISTRO
          </Link>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <StatCard label="Aeronaves" value={stats.drones} icon="drone" color="orange" />
          <StatCard label="Pilotos" value={stats.pilots} icon="group" color="blue" />
          <StatCard label="Vuelos Totales" value={stats.flights} icon="potted_plant" color="green" />
          <StatCard label="Alertas" value="0" icon="warning" color="red" />
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-black text-[#1A202C] uppercase tracking-tight">Actividad Reciente</h2>
            <Link href="/dashboard/flights" className="text-xs font-bold text-[#ec5b13] hover:underline">VER TODO</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="p-6">Fecha</th>
                  <th className="p-6">Aeronave</th>
                  <th className="p-6">Piloto</th>
                  <th className="p-6">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFlights.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 text-sm font-medium">{new Date(f.flight_date).toLocaleDateString()}</td>
                    <td className="p-6 text-sm font-bold text-[#1A202C]">{f.aircraft?.model}</td>
                    <td className="p-6 text-sm text-slate-600">{f.pilots?.name}</td>
                    <td className="p-6">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Válido</span>
                    </td>
                  </tr>
                ))}
                {recentFlights.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400 italic text-sm">Aún no has registrado vuelos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// Sub-componentes para mantener el código limpio
function MenuLink({ href, icon, label, active = false }) {
  return (
    <Link href={href} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-[#ec5b13] text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    orange: 'text-orange-500 bg-orange-50',
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    red: 'text-red-500 bg-red-50'
  }
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-[#1A202C] mt-1">{value}</p>
    </div>
  )
}