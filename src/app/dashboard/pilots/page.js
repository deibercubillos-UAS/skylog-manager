"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PilotsPage() {
  const [pilots, setPilots] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estado para el formulario
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    medical_expiry: '',
    pilot_role: 'PIC',
    email: '',
    phone: '',
    dni: ''
  })

  useEffect(() => {
    fetchPilots()
  }, [])

  const fetchPilots = async () => {
    const { data, error } = await supabase.from('pilots').select('*').order('created_at', { ascending: false })
    if (error) console.log(error)
    else setPilots(data || [])
  }

  const handleAddPilot = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('pilots').insert([{
      ...formData,
      owner_id: user.id
    }])

    if (error) alert(error.message)
    else {
      setShowModal(false)
      setFormData({ name: '', license_number: '', medical_expiry: '', pilot_role: 'PIC', email: '', phone: '', dni: '' })
      fetchPilots()
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#f8f6f6]">
      
      {/* --- HEADER --- */}
      <header className="p-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[#1A202C]">Gestión de Personal</h2>
            <p className="text-slate-500 mt-1">Directorio activo de pilotos y personal técnico</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">person_add</span>
            Registrar Nuevo Piloto
          </button>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div className="mt-8 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Buscar piloto..." type="text"/>
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none">
              <option>Rol: Todos</option>
              <option>Instructor</option>
              <option>PIC</option>
              <option>Observador</option>
            </select>
          </div>
        </div>
      </header>

      {/* --- TABLA DE DIRECTORIO --- */}
      <section className="flex-1 p-8 overflow-y-auto pt-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Piloto</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Licencia</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rol</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Cumplimiento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#ec5b13] font-bold">
                        {pilot.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-[#1A202C]">{pilot.name}</p>
                        <p className="text-xs text-slate-500">{pilot.email || 'sin-correo@skylog.com'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-mono text-slate-700">{pilot.license_number}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Multirotor</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                      {pilot.pilot_role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${new Date(pilot.medical_expiry) > new Date() ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                      <span className="text-xs font-medium text-slate-700">
                        {new Date(pilot.medical_expiry) > new Date() ? 'Vigente' : 'Expirado'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button className="p-2 hover:bg-slate-100 rounded-lg hover:text-[#ec5b13] transition-colors"><span className="material-symbols-outlined text-xl">edit</span></button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg hover:text-red-600 transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- PANEL LATERAL (SLIDE-OVER MODAL) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#1A202C]">Perfil del Piloto</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Registro de Credenciales</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body Modal */}
            <form onSubmit={handleAddPilot} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Grupo 1: Info Básica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#ec5b13]">
                  <span className="material-symbols-outlined text-sm">person</span>
                  <h4 className="text-[10px] font-black uppercase tracking-[2px]">Información Básica</h4>
                </div>
                <input 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                  placeholder="Nombre Completo" type="text" required
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                  placeholder="Correo Electrónico" type="email"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {/* Grupo 2: Aeronáuticos */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#ec5b13]">
                  <span className="material-symbols-outlined text-sm">airplanemode_active</span>
                  <h4 className="text-[10px] font-black uppercase tracking-[2px]">Datos Aeronáuticos</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none" 
                    placeholder="Licencia RPAS" type="text" required
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Médico vence</label>
                    <input 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm outline-none" 
                      type="date" required
                      onChange={(e) => setFormData({...formData, medical_expiry: e.target.value})}
                    />
                  </div>
                </div>
                <select 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none"
                  onChange={(e) => setFormData({...formData, pilot_role: e.target.value})}
                >
                  <option value="PIC">PIC (Piloto al Mando)</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Observador">Observador</option>
                </select>
              </div>

              {/* Footer Modal */}
              <div className="pt-6 flex gap-3 border-t border-slate-100">
                <button 
                  type="submit" disabled={loading}
                  className="flex-1 bg-[#ec5b13] text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
                >
                  {loading ? 'GUARDANDO...' : 'GUARDAR PILOTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}