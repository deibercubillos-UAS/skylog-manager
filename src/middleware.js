import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    // 1. Actualizar la sesión (Mantiene las cookies frescas)
    let response = await updateSession(request)

    // 2. Crear un cliente temporal para verificar el usuario en el middleware
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

    const { data: { user } } = await supabase.auth.getUser()

    // LÓGICA DE RUTAS:
    const url = request.nextUrl.clone()
    const isDashboard = url.pathname.startsWith('/dashboard')
    const isLogin = url.pathname.startsWith('/login')

    // Regla A: Si intenta ir al Dashboard y NO está logueado -> Al Login
    if (isDashboard && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Regla B: Si ya está logueado e intenta ir al Login -> Al Dashboard
    if (isLogin && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Regla C: La raíz (/) siempre es pública ahora. 
    // No agregamos ninguna condición para '/', así que Next.js servirá tu Landing Page.

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (svg, png, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}