"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName } // Esto es vital para el Trigger
      }
    })

    if (error) {
      alert(error.message)
    } else {
      alert('¡Cuenta creada! Ya puedes entrar.')
      router.push('/dashboard') // Redirigir al dashboard
    }
    setLoading(false)
  }

  return (
    <div className="p-10 max-w-md mx-auto bg-white shadow-xl rounded-2xl mt-20">
      <h1 className="text-2xl font-bold mb-6 text-[#1A202C]">Registro SkyLog</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <input type="text" placeholder="Nombre Completo" className="w-full p-3 border rounded-lg" onChange={(e) => setFullName(e.target.value)} required />
        <input type="email" placeholder="Correo" className="w-full p-3 border rounded-lg" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" className="w-full p-3 border rounded-lg" onChange={(e) => setPassword(e.target.value)} required />
        <button className="bg-[#ec5b13] text-white w-full py-3 rounded-lg font-bold">
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
      <p className="mt-4 text-xs text-center text-slate-400">Si ya tienes cuenta, solo ingresa tus datos arriba.</p>
    </div>
  )
}