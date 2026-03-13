export const dynamic = 'force-dynamic';
"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FlightLogPage() {
  const [flights, setFlights] = useState([])
  const [drones, setDrones] = useState([])
  const [pilots, setPilots] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pilot_id: '',
    aircraft_id: '',
    location: '',
    mission_type: 'Inspección',
    takeoff_time: '',
    landing_time: '',
    incidents: false
  })

  // 1. Cargar datos iniciales (Vuelos, Drones y Pilotos)
  const fetchData = async () => {
    const { data: flightsData } = await supabase.from('flights').select('*, pilots(name), aircraft(model)').order('flight_date', { ascending: false })
    const { data: dronesData } = await supabase.from('aircraft').select('id, model')
    const { data: pilotsData } = await supabase.from('pilots').select('id, name')
    
    setFlights(flightsData || [])
    setDrones(dronesData || [])
    setPilots(pilotsData || [])
  }

  useEffect(() => { fetchData() }, [])

  // 2. Guardar el vuelo
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('flights').insert([{ 
      ...formData, 
      owner_id: user.id 
    }])

    if (error) alert(error.message)
    else {
      alert('¡Vuelo registrado con éxito!')
      fetchData() // Recargar lista
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-[#1A202C]">Bitácora de Vuelo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE REGISTRO */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 h-fit">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ec5b13]">add_circle</span>
            Nuevo Registro
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Piloto al Mando</label>
              <select 
                className="w-full p-3 bg-slate-50 border-none rounded-xl mt-1"
                onChange={(e) => setFormData({...formData, pilot_id: e.target.value})}
                required
              >
                <option value="">Seleccionar Piloto</option>
                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Aeronave</label>
              <select 
                className="w-full p-3 bg-slate-50 border-none rounded-xl mt-1"
                onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})}
                required
              >
                <option value="">Seleccionar Drone</option>
                {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
              </select>
            </div>

            <input 
              type="text" placeholder="Ubicación (GPS o Ciudad)"
              className="w-full p-3 bg-slate-50 border-none rounded-xl"
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400">DESPEGUE</label>
                <input type="time" className="w-full p-2 bg-slate-50 border-none rounded-lg" 
                onChange={(e) => setFormData({...formData, takeoff_time: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400">ATERRIZAJE</label>
                <input type="time" className="w-full p-2 bg-slate-50 border-none rounded-lg"
                onChange={(e) => setFormData({...formData, landing_time: e.target.value})}/>
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-[#ec5b13] text-white py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20"
            >
              {loading ? 'Procesando...' : 'REGISTRAR VUELO'}
            </button>
          </form>
        </div>

        {/* LISTADO DE VUELOS HISTÓRICOS */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold mb-4">Historial de Operaciones</h2>
          {flights.map((f) => (
            <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
              <div className="flex gap-4 items-center">
                <div className="bg-slate-100 p-3 rounded-xl text-slate-500">
                   <span className="material-symbols-outlined">flight_takeoff</span>
                </div>
                <div>
                  <p className="font-bold text-[#1A202C]">{f.aircraft?.model || 'Drone desconocido'}</p>
                  <p className="text-xs text-slate-500">Piloto: {f.pilots?.name || 'N/A'} | {f.location}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{f.takeoff_time} - {f.landing_time}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  Completado
                </span>
              </div>
            </div>
          ))}
          {flights.length === 0 && <p className="text-slate-400 italic">No hay vuelos registrados en la bitácora.</p>}
        </div>
      </div>
    </div>
  )
}