import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protección de rutas DASHBOARD y ADMIN
  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protección específica para SuperAdmin (Master Panel)
  if (user && request.nextUrl.pathname.startsWith('/admin/master')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/registro'],
}
