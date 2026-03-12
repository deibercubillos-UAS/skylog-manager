"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      // LOGICA DE INICIO DE SESIÓN
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else router.push('/dashboard')
    } else {
      // LOGICA DE REGISTRO
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
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
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <h1 className="text-2xl font-black text-[#1A202C] mb-2 text-center">
          SkyLog <span className="text-[#ec5b13]">Manager</span>
        </h1>
        <p className="text-slate-500 text-center mb-8 text-sm">
          {isLogin ? 'Ingresa a tu panel operativo' : 'Crea tu cuenta de operador'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" placeholder="Nombre Completo" required
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20"
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input 
            type="email" placeholder="Correo electrónico" required
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Contraseña" required
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#ec5b13]/20"
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button 
            type="submit" disabled={loading}
            className="w-full bg-[#ec5b13] text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-500 hover:text-[#ec5b13] font-medium"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra aquí'}
          </button>
        </div>
      </div>
    </div>
  )
}