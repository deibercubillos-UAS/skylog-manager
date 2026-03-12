"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FleetPage() {
  const [drones, setDrones] = useState([])
  const [model, setModel] = useState('')
  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. Función para cargar los drones de la base de datos
  const fetchDrones = async () => {
    const { data, error } = await supabase.from('aircraft').select('*')
    if (error) console.log('Error cargando drones:', error)
    else setDrones(data)
  }

  useEffect(() => {
    fetchDrones()
  }, [])

  // 2. Función para guardar un nuevo dron
  const addDrone = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Nota: Por ahora usamos un ID fijo de prueba hasta que completes el Login real
    // En el futuro, 'owner_id' será el ID del usuario logueado
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        alert("Debes estar registrado para añadir drones. Ve a /register primero.")
        setLoading(false)
        return
    }

    const { error } = await supabase
      .from('aircraft')
      .insert([
        { 
          model: model, 
          serial_number: serial, 
          owner_id: user.id 
        }
      ])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('¡Dron registrado con éxito!')
      setModel('')
      setSerial('')
      fetchDrones() // Recargar la lista
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-[#1A202C]">Gestión de Flota</h1>

      {/* Formulario de Registro */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-10">
        <h2 className="text-lg font-bold mb-4">Registrar Nueva Aeronave</h2>
        <form onSubmit={addDrone} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            placeholder="Modelo (ej: DJI Mavic 3)" 
            className="p-3 border rounded-lg"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Número de Serie (S/N)" 
            className="p-3 border rounded-lg"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-[#ec5b13] text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
          >
            {loading ? 'Guardando...' : 'Añadir a la Flota'}
          </button>
        </form>
      </div>

      {/* Lista de Drones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drones.map((drone) => (
          <div key={drone.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg text-[#ec5b13]">
              <span className="material-symbols-outlined">drone</span>
            </div>
            <div>
              <p className="font-bold text-slate-900">{drone.model}</p>
              <p className="text-xs text-slate-500">S/N: {drone.serial_number}</p>
              <p className="text-[10px] mt-1 font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                {drone.status}
              </p>
            </div>
          </div>
        ))}
        {drones.length === 0 && <p className="text-slate-400">No hay drones registrados aún.</p>}
      </div>
    </div>
  )
}