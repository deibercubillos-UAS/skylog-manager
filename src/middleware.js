import { updateSession } from '@/utils/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    // 1. Actualizamos la sesión primero (necesario para Supabase SSR)
    const response = await updateSession(request)
    
    // 2. Definimos qué rutas son protegidas
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isRoot = request.nextUrl.pathname === '/'
    
    // Obtenemos la sesión para decidir si redirigir
    // Nota: El usuario se obtiene de las cookies que updateSession ya procesó
    const authCookie = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')

    // Lógica Aeronáutica de Tráfico:
    // Si intenta entrar al dashboard y no hay rastro de sesión -> Al Login
    if (isDashboard && !authCookie) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si ya está logueado e intenta ir al login o a la raíz, 
    // podrías mandarlo al dashboard (opcional), pero por ahora dejemos la raíz libre.
    
    return response
}

export const config = {
  matcher: [
    /*
     * Permitir la Landing Page y archivos estáticos:
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}