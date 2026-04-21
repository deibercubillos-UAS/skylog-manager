import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    // 1. Refrescar sesión (Paso 6)
    let response = await updateSession(request)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                },
            },
        }
    )

    // Obtenemos el usuario de forma segura
    const { data: { user } } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    
    // PROTECCIÓN DE RUTA: DASHBOARD
    // Si intenta entrar a cualquier subruta de /dashboard y NO hay usuario
    if (url.pathname.startsWith('/dashboard') && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // SI YA ESTÁ LOGUEADO: No dejarlo volver al login
    if (url.pathname === '/login' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Aplicar a todas las rutas excepto archivos estáticos e imágenes
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}