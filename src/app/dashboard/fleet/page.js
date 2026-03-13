"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FleetPage() {
  const [drones, setDrones] = useState([])
  const [model, setModel] = useState('')
  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchDrones = async () => {
    const { data } = await supabase.from('aircraft').select('*')
    setDrones(data || [])
  }

  useEffect(() => { fetchDrones() }, [])

  const addDrone = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('aircraft').insert([{ model, serial_number: serial, owner_id: user.id }])
    if (error) alert(error.message)
    else { setModel(''); setSerial(''); fetchDrones() }
    setLoading(false)
  }

  return (
    <div className="p-8 overflow-y-auto">
      <h1 className="text-3xl font-black mb-8">Gestión de Flota</h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10 max-w-2xl">
        <h2 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-400">Registrar Aeronave</h2>
        <form onSubmit={addDrone} className="space-y-4">
          <input type="text" placeholder="Modelo" className="w-full p-3 bg-slate-50 rounded-xl border-none" value={model} onChange={(e) => setModel(e.target.value)} required />
          <input type="text" placeholder="S/N" className="w-full p-3 bg-slate-50 rounded-xl border-none" value={serial} onChange={(e) => setSerial(e.target.value)} required />
          <button className="w-full bg-[#ec5b13] text-white py-3 rounded-xl font-bold shadow-lg">AÑADIR DRONE</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drones.map(d => (
          <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
            <span className="material-symbols-outlined text-[#ec5b13] bg-orange-50 p-3 rounded-xl">drone</span>
            <div><p className="font-bold">{d.model}</p><p className="text-xs text-slate-400">S/N: {d.serial_number}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
