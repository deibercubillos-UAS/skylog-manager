"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SoraWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    drone_size: 'small', // small, medium, large
    scenario: 'rural',   // rural, populated, assembly
    airspace: 'uncontrolled' // uncontrolled, controlled
  })

  // Lógica simple de cálculo SAIL para el MVP
  const calculateSAIL = () => {
    if (data.scenario === 'assembly') return 'SAIL IV (Riesgo Alto)'
    if (data.scenario === 'populated' || data.drone_size === 'large') return 'SAIL II (Riesgo Moderado)'
    return 'SAIL I (Riesgo Bajo)'
  }

  const saveSora = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('sora_reports').insert([{
      owner_id: user.id,
      grc_level: data.scenario === 'rural' ? 1 : 3,
      arc_level: data.airspace === 'uncontrolled' ? 'ARC-a' : 'ARC-b',
      sail_score: calculateSAIL()
    }])

    if (error) alert(error.message)
    else {
      alert("✅ Análisis SORA guardado y certificado.")
      setStep(4)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-white min-h-screen shadow-2xl my-10 rounded-3xl border border-slate-100">
      
      {/* Stepper (Indicador de pasos) */}
      <div className="flex items-center justify-between mb-12">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex flex-col items-center flex-1 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 transition-all ${step >= num ? 'bg-[#ec5b13] text-white' : 'bg-slate-100 text-slate-400'}`}>
              {num}
            </div>
            <div className={`absolute top-5 left-1/2 w-full h-1 ${step > num ? 'bg-[#ec5b13]' : 'bg-slate-100'}`} style={{display: num === 3 ? 'none' : 'block'}}></div>
          </div>
        ))}
      </div>

      {/* PASO 1: RIESGO EN TIERRA */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <h2 className="text-2xl font-black text-[#1A202C]">1. Escenario Operacional</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OptionCard 
              active={data.scenario === 'rural'} 
              icon="landscape" title="Rural" desc="Áreas deshabitadas" 
              onClick={() => setData({...data, scenario: 'rural'})} 
            />
            <OptionCard 
              active={data.scenario === 'populated'} 
              icon="location_city" title="Poblada" desc="Entornos urbanos" 
              onClick={() => setData({...data, scenario: 'populated'})} 
            />
            <OptionCard 
              active={data.scenario === 'assembly'} 
              icon="groups" title="Eventos" desc="Reunión de personas" 
              onClick={() => setData({...data, scenario: 'assembly'})} 
            />
          </div>
          <button onClick={() => setStep(2)} className="w-full py-4 bg-[#1A202C] text-white rounded-xl font-bold">Siguiente Paso</button>
        </div>
      )}

      {/* PASO 2: DIMENSIONES */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <h2 className="text-2xl font-black text-[#1A202C]">2. Tamaño de la Aeronave</h2>
          <select 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg"
            onChange={(e) => setData({...data, drone_size: e.target.value})}
          >
            <option value="small">Menor a 1 metro (DJI Mavic / Phantom)</option>
            <option value="medium">Entre 1 y 3 metros (DJI Matrice / Inspire)</option>
            <option value="large">Mayor a 3 metros (Drones de Aspersión / Carga)</option>
          </select>
          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 rounded-xl font-bold">Atrás</button>
            <button onClick={() => setStep(3)} className="flex-1 py-4 bg-[#1A202C] text-white rounded-xl font-bold">Calcular Riesgo</button>
          </div>
        </div>
      )}

      {/* PASO 3: RESULTADO Y GUARDADO */}
      {step === 3 && (
        <div className="space-y-8 animate-in zoom-in duration-500">
          <div className="bg-[#1A202C] text-white p-10 rounded-3xl text-center">
            <span className="text-[#ec5b13] font-bold uppercase tracking-widest text-sm">Resultado del Análisis</span>
            <h3 className="text-5xl font-black mt-2 mb-4">{calculateSAIL()}</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">Basado en la metodología SORA 2.0. Este análisis es válido para operaciones en territorio nacional bajo RAC 100.</p>
          </div>
          <button 
            onClick={saveSora} 
            disabled={loading}
            className="w-full py-4 bg-[#ec5b13] text-white rounded-xl font-black text-lg shadow-xl shadow-orange-500/20"
          >
            {loading ? 'PROCESANDO...' : 'VINCULAR Y CERTIFICAR ANÁLISIS'}
          </button>
        </div>
      )}

      {/* PASO 4: ÉXITO */}
      {step === 4 && (
        <div className="text-center py-20 space-y-6">
          <span className="material-symbols-outlined text-7xl text-green-500">verified</span>
          <h2 className="text-3xl font-black">¡Análisis Certificado!</h2>
          <p className="text-slate-500">El reporte ha sido guardado en tu base de datos y está listo para ser incluido en tu bitácora.</p>
          <button onClick={() => setStep(1)} className="px-8 py-3 bg-[#1A202C] text-white rounded-xl font-bold">Nuevo Análisis</button>
        </div>
      )}
    </div>
  )
}

function OptionCard({ title, desc, icon, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 border-2 rounded-2xl text-center transition-all ${active ? 'border-[#ec5b13] bg-orange-50' : 'border-slate-100 hover:border-slate-300'}`}
    >
      <span className={`material-symbols-outlined text-4xl ${active ? 'text-[#ec5b13]' : 'text-slate-300'}`}>{icon}</span>
      <p className={`font-bold mt-2 ${active ? 'text-[#ec5b13]' : 'text-slate-600'}`}>{title}</p>
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter mt-1">{desc}</p>
    </button>
  )
}