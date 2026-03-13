"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const [userName, setUserName] = useState('Cargando...')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/register') // Protegemos la ruta: si no hay login, al registro.
      } else {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setUserName(profile?.full_name || 'Operador')
      }
    }
    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/register')
  }

  return (
    <div className="bg-[#f8f6f6] text-slate-900 flex h-screen overflow-hidden font-sans">
      {/* --- MENU LATERAL (SIDEBAR) --- */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">flight_takeoff</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <NavItem href="/dashboard" icon="dashboard" label="Dashboard" active={pathname === '/dashboard'} />
          <NavItem href="/dashboard/pilots" icon="person" label="Mis Pilotos" active={pathname === '/dashboard/pilots'} />
          <NavItem href="/dashboard/fleet" icon="precision_manufacturing" label="Mi Flota" active={pathname === '/dashboard/fleet'} />
          <NavItem href="/dashboard/flights" icon="menu_book" label="Bitácora de Vuelos" active={pathname === '/dashboard/flights'} />
          <NavItem href="/dashboard/sora" icon="shield" label="Análisis SORA" active={pathname === '/dashboard/sora'} />
          <NavItem href="/dashboard/checklist" icon="fact_check" label="Checklist" active={pathname === '/dashboard/checklist'} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="size-9 rounded-full bg-[#ec5b13]/20 flex items-center justify-center border border-[#ec5b13]/30">
              <span className="text-[#ec5b13] font-bold text-xs">{userName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Operaciones</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, icon, label, active }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  )
}