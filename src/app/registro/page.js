"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [isLogin, setIsLogin] = useState(false) // Iniciamos en modo Registro
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Estados del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [operatorType, setOperatorType] = useState('Piloto Independiente')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName,
            operator_type: operatorType 
          } 
        }
      })
      if (error) alert(error.message)
      else {
        alert('¡Cuenta creada con éxito!')
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      {/* SECCIÓN IZQUIERDA: PROPUESTA DE VALOR */}
      <section className="hidden lg:flex lg:w-5/12 bg-[#1A202C] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(236, 91, 19, 0.2) 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span className="material-symbols-outlined text-[#ec5b13] text-3xl">flight_takeoff</span>
            <span className="text-white text-2xl font-bold tracking-tight">SkyLog</span>
          </div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-8">
            Estás a un paso de volar con total tranquilidad legal.
          </h1>
          <ul className="space-y-6">
            <FeatureItem icon="verified" text="14 días de acceso total a funciones PRO" />
            <FeatureItem icon="picture_as_pdf" text="Generación de reportes PDF para la Aerocivil" />
            <FeatureItem icon="shield_with_heart" text="Análisis de riesgo SORA ilimitado" />
            <FeatureItem icon="credit_card_off" text="No se requiere tarjeta de crédito para iniciar" />
          </ul>
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-4 mb-3">
            <div className="size-12 rounded-full bg-slate-400 bg-cover bg-center border-2 border-[#ec5b13]" 
                 style={{backgroundImage: `url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200')`}}></div>
            <div>
              <p className="text-white font-bold text-sm">Capitán UAS</p>
              <p className="text-white/60 text-xs">Piloto Certificado RPAS</p>
            </div>
          </div>
          <p className="text-white/90 italic text-sm leading-relaxed">
            "La mejor herramienta para cumplir con la RAC 100 sin complicaciones."
          </p>
        </div>
      </section>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center bg-[#f8f6f6]">
        <div className="max-w-md w-full mx-auto">
          
          <div className="flex justify-end mb-8">
            <p className="text-sm text-slate-600">
              {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes una cuenta?"} 
              <button onClick={() => setIsLogin(!isLogin)} className="text-[#ec5b13] font-bold ml-1 hover:underline">
                {isLogin ? "Regístrate" : "Log in"}
              </button>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? "Ingresa a tu cuenta" : "Crea tu cuenta de operador"}
            </h2>
            <p className="text-slate-500">Comienza a gestionar tus operaciones de drones hoy mismo.</p>
          </div>

          {/* Botón Google Simulado */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 transition-all mb-6">
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="google" />
            Continuar con Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-[#f8f6f6] px-4 text-slate-500">O con tu correo</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                  <input 
                    type="text" required className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                    placeholder="Ej. Juan Pérez"
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input 
                  type="email" required className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                  placeholder="juan@empresa.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                <input 
                  type="password" required className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isLogin && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ec5b13] w-2/3"></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Seguridad: Media</p>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Operador</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#ec5b13]/20 appearance-none"
                  onChange={(e) => setOperatorType(e.target.value)}
                >
                  <option>Piloto Independiente</option>
                  <option>Empresa de Drones</option>
                  <option>Centro de Instrucción (CIAC)</option>
                </select>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#ec5b13] hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all transform active:scale-[0.98]"
            >
              {loading ? "Procesando..." : (isLogin ? "Iniciar Sesión" : "Iniciar mi prueba gratuita")}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm">lock</span>
            <p className="text-xs text-center">Tu privacidad es nuestra prioridad. Datos encriptados bajo estándares de seguridad.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function FeatureItem({ icon, text }) {
  return (
    <li className="flex items-center gap-4 text-white/90">
      <span className="material-symbols-outlined text-[#ec5b13] bg-[#ec5b13]/10 p-2 rounded-lg">{icon}</span>
      <span className="text-lg">{text}</span>
    </li>
  )
}