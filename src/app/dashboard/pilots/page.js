export const dynamic = 'force-dynamic';
"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PilotsPage() {
  const [pilots, setPilots] = useState([])
  const [name, setName] = useState('')
  const [license, setLicense] = useState('')
  const [expiry, setExpiry] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. Cargar pilotos de Supabase
  const fetchPilots = async () => {
    const { data, error } = await supabase.from('pilots').select('*')
    if (error) console.log('Error:', error)
    else setPilots(data)
  }

  useEffect(() => {
    fetchPilots()
  }, [])

  // 2. Guardar nuevo piloto
  const addPilot = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        alert("Sesión no encontrada")
        setLoading(false)
        return
    }

    const { error } = await supabase
      .from('pilots')
      .insert([
        { 
          name, 
          license_number: license, 
          medical_expiry: expiry,
          owner_id: user.id 
        }
      ])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('¡Piloto registrado!');
      setName(''); setLicense(''); setExpiry('');
      fetchPilots()
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-[#1A202C]">Gestión de Pilotos</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-10">
        <h2 className="text-lg font-bold mb-4">Registrar Nuevo Piloto</h2>
        <form onSubmit={addPilot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" placeholder="Nombre completo" 
            className="p-3 border rounded-lg" value={name}
            onChange={(e) => setName(e.target.value)} required
          />
          <input 
            type="text" placeholder="N° Licencia (RPAS)" 
            className="p-3 border rounded-lg" value={license}
            onChange={(e) => setLicense(e.target.value)} required
          />
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-400 ml-1">Vencimiento Examen Médico</label>
            <input 
              type="date" className="p-3 border rounded-lg" value={expiry}
              onChange={(e) => setExpiry(e.target.value)} required
            />
          </div>
          <button 
            type="submit" disabled={loading}
            className="md:col-span-2 bg-[#ec5b13] text-white py-3 rounded-lg font-bold hover:bg-orange-600"
          >
            {loading ? 'Guardando...' : 'Registrar Piloto'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pilots.map((pilot) => (
          <div key={pilot.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <p className="font-bold text-slate-900">{pilot.name}</p>
              <p className="text-xs text-slate-500 font-mono">Licencia: {pilot.license_number}</p>
              <p className="text-[10px] mt-1 text-slate-400">Médico vence: {pilot.medical_expiry}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}