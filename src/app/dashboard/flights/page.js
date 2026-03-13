"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FlightLogPage() {
  const [flights, setFlights] = useState([])
  const [drones, setDrones] = useState([])
  const [pilots, setPilots] = useState([])
  const [formData, setFormData] = useState({ pilot_id: '', aircraft_id: '', location: '', mission_type: 'Inspección' })

  const fetchData = async () => {
    const { data: flightsData } = await supabase.from('flights').select('*, pilots(name), aircraft(model)').order('created_at', { ascending: false })
    const { data: dronesData } = await supabase.from('aircraft').select('id, model')
    const { data: pilotsData } = await supabase.from('pilots').select('id, name')
    setFlights(flightsData || []); setDrones(dronesData || []); setPilots(pilotsData || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('flights').insert([{ ...formData, owner_id: user.id }])
    if (error) alert(error.message)
    else { alert('Vuelo registrado'); fetchData() }
  }

  return (
    <div className="p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h1 className="text-2xl font-black mb-6">Nuevo Vuelo</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <select className="w-full p-3 bg-slate-50 rounded-xl border-none" onChange={(e) => setFormData({...formData, pilot_id: e.target.value})} required>
            <option value="">Piloto</option>
            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="w-full p-3 bg-slate-50 rounded-xl border-none" onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})} required>
            <option value="">Aeronave</option>
            {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
          </select>
          <input type="text" placeholder="Ubicación" className="w-full p-3 bg-slate-50 rounded-xl border-none" onChange={(e) => setFormData({...formData, location: e.target.value})} required />
          <button className="w-full bg-[#ec5b13] text-white py-4 rounded-xl font-black shadow-lg shadow-orange-500/20">REGISTRAR</button>
        </form>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold mb-6">Historial Operativo</h2>
        <div className="space-y-3">
          {flights.map(f => (
            <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div><p className="font-bold">{f.aircraft?.model}</p><p className="text-xs text-slate-400">{f.pilots?.name} | {f.location}</p></div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Válido</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
