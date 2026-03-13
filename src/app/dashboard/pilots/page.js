"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PilotsPage() {
  const [pilots, setPilots] = useState([])
  const [name, setName] = useState('')
  const [license, setLicense] = useState('')

  const fetchPilots = async () => {
    const { data } = await supabase.from('pilots').select('*')
    setPilots(data || [])
  }

  useEffect(() => { fetchPilots() }, [])

  const addPilot = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('pilots').insert([{ name, license_number: license, owner_id: user.id }])
    if (error) alert(error.message)
    else { setName(''); setLicense(''); fetchPilots() }
  }

  return (
    <div className="p-8 overflow-y-auto">
      <h1 className="text-3xl font-black mb-8">Mis Pilotos</h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10 max-w-2xl">
        <form onSubmit={addPilot} className="space-y-4">
          <input type="text" placeholder="Nombre completo" className="w-full p-3 bg-slate-50 rounded-xl border-none" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="text" placeholder="Licencia RPAS" className="w-full p-3 bg-slate-50 rounded-xl border-none" value={license} onChange={(e) => setLicense(e.target.value)} required />
          <button className="w-full bg-[#ec5b13] text-white py-3 rounded-xl font-bold">REGISTRAR PILOTO</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pilots.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
            <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-3 rounded-xl">person</span>
            <div><p className="font-bold">{p.name}</p><p className="text-xs text-slate-400">ID: {p.license_number}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
