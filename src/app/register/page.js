"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('¡Revisa tu correo para confirmar tu cuenta!')
    setLoading(false)
  }

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Registro SkyLog</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <input 
          type="email" 
          placeholder="Tu correo" 
          className="w-full p-2 border" 
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Tu contraseña" 
          className="w-full p-2 border" 
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-[#ec5b13] text-white w-full py-2">
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </form>
    </div>
  )
}