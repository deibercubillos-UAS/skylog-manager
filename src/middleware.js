import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Verificar si el usuario está logueado
  const { data: { user } } = await supabase.auth.getUser()

  // 2. PROTECCIÓN: Si intenta entrar a /dashboard y NO hay usuario, mandarlo a /login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. PROTECCIÓN EXTRA: Si ya está logueado e intenta ir a /login, mandarlo al dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Configuración para que el portero solo vigile estas rutas
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/fleet/:path*',
    '/login',
    '/registro'
  ],
}