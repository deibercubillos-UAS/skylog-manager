"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({ drones: 0, pilots: 0, flights: 0 })
  const [recentFlights, setRecentFlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [drones, pilots, flights, recent] = await Promise.all([
        supabase.from('aircraft').select('*', { count: 'exact', head: true }),
        supabase.from('pilots').select('*', { count: 'exact', head: true }),
        supabase.from('flights').select('*', { count: 'exact', head: true }),
        supabase.from('flights').select('*, aircraft(model), pilots(name)').order('created_at', { ascending: false }).limit(5)
      ])
      
      setStats({ drones: drones.count || 0, pilots: pilots.count || 0, flights: flights.count || 0 })
      setRecentFlights(recent.data || [])
      setLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#1A202C]">Panel de Control</h1>
          <p className="text-slate-500">Resumen operativo de tu flota UAS</p>
        </div>
        <Link href="/dashboard/flights" className="bg-[#ec5b13] text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all text-sm">
          + REGISTRAR MISIÓN
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Aeronaves" value={stats.drones} icon="drone" color="text-orange-500 bg-orange-50" />
        <StatCard label="Pilotos" value={stats.pilots} icon="group" color="text-blue-500 bg-blue-50" />
        <StatCard label="Vuelos" value={stats.flights} icon="flight_takeoff" color="text-green-500 bg-green-50" />
        <StatCard label="Horas" value={`${(stats.flights * 0.8).toFixed(1)}h`} icon="timer" color="text-purple-500 bg-purple-50" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Últimos Registros</h3>
          <Link href="/dashboard/flights" className="text-xs font-bold text-[#ec5b13] hover:underline">Ver Bitácora Completa</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-50">
              {recentFlights.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-all">
                  <td className="p-6">
                    <p className="text-sm font-bold text-[#1A202C]">{f.aircraft?.model}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{new Date(f.flight_date).toLocaleDateString()}</p>
                  </td>
                  <td className="p-6 text-sm text-slate-600">{f.pilots?.name}</td>
                  <td className="p-6">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Completado</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-[#1A202C]">{value}</p>
    </div>
  )
}