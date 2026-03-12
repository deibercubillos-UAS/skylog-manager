"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ChecklistPage() {
  const router = useRouter()
  const [drones, setDrones] = useState([])
  const [selectedDrone, setSelectedDrone] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Lista de items de seguridad (Basado en estándares aeronáuticos)
  const [items, setItems] = useState({
    propellers: false,
    motors: false,
    battery: false,
    gps: false,
    area_clear: false,
    sd_card: false
  })

  useEffect(() => {
    const fetchDrones = async () => {
      const { data } = await supabase.from('aircraft').select('id, model')
      setDrones(data || [])
    }
    fetchDrones()
  }, [])

  // Calcular progreso
  const totalItems = Object.keys(items).length
  const checkedItems = Object.values(items).filter(val => val).length
  const progress = Math.round((checkedItems / totalItems) * 100)
  const isComplete = checkedItems === totalItems

  const handleToggle = (key) => {
    setItems({ ...items, [key]: !items[key] })
  }

  const saveChecklist = async () => {
    if (!selectedDrone) return alert("Selecciona una aeronave primero")
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('preflight_checks').insert([{
      owner_id: user.id,
      aircraft_id: selectedDrone,
      details: items,
      status: 'passed'
    }])

    if (error) alert(error.message)
    else {
      alert("✅ Verificación completada. ¡Buen vuelo!")
      router.push('/dashboard/flights') // Ir a registrar el vuelo después del checklist
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Cabecera Técnica */}
        <div className="flex items-center justify-between bg-[#161b26] p-4 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-xl font-black text-[#ec5b13]">CHECKLIST PRE-VUELO</h1>
            <p className="text-xs text-slate-400">Protocolo de Seguridad v2.4</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#ec5b13]">{progress}%</span>
          </div>
        </div>

        {/* Selección de Drone */}
        <select 
          className="w-full p-4 bg-[#161b26] border border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-[#ec5b13]"
          onChange={(e) => setSelectedDrone(e.target.value)}
        >
          <option value="">SELECCIONAR AERONAVE...</option>
          {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
        </select>

        {/* Items del Checklist */}
        <div className="space-y-3">
          <CheckItem label="Hélices sin fisuras y ajustadas" active={items.propellers} onToggle={() => handleToggle('propellers')} icon="build" />
          <CheckItem label="Motores giran libremente" active={items.motors} onToggle={() => handleToggle('motors')} icon="settings" />
          <CheckItem label="Batería superior al 90%" active={items.battery} onToggle={() => handleToggle('battery')} icon="battery_charging_full" />
          <CheckItem label="Mínimo 12 Satélites GPS" active={items.gps} onToggle={() => handleToggle('gps')} icon="gps_fixed" />
          <CheckItem label="Área de despegue despejada" active={items.area_clear} onToggle={() => handleToggle('area_clear')} icon="grid_view" />
          <CheckItem label="Tarjeta SD con espacio" active={items.sd_card} onToggle={() => handleToggle('sd_card')} icon="sd_card" />
        </div>

        {/* Botón de Acción Final */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a0d14]/80 backdrop-blur-md border-t border-slate-800">
          <button 
            onClick={saveChecklist}
            disabled={!isComplete || loading}
            className={`w-full py-4 rounded-2xl font-black text-lg tracking-widest transition-all ${
              isComplete ? 'bg-[#ec5b13] text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'GUARDANDO...' : 'AUTORIZAR DESPEGUE'}
          </button>
        </div>

      </div>
    </div>
  )
}

// Componente pequeño para cada fila del checklist
function CheckItem({ label, active, onToggle, icon }) {
  return (
    <button 
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
        active ? 'bg-[#ec5b13]/10 border-[#ec5b13]' : 'bg-[#161b26] border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined ${active ? 'text-[#ec5b13]' : 'text-slate-500'}`}>{icon}</span>
        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
      </div>
      <span className={`material-symbols-outlined ${active ? 'text-[#ec5b13]' : 'text-slate-700'}`}>
        {active ? 'check_circle' : 'radio_button_unchecked'}
      </span>
    </button>
  )
}