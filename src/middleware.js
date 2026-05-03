import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Patrones de bots que escanean vulnerabilidades de WordPress, etc.
// Cortamos en frío sin tocar Supabase para no malgastar invocaciones de función.
const BOT_PROBE_REGEX = /\.(php|asp|aspx|jsp|cgi|env|git|sql|bak|sh)$|wp-(admin|content|includes|login|config)|xmlrpc/i;

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Fast bypass: bots escaneando vulnerabilidades — devuelve 404 sin más cómputo
  if (BOT_PROBE_REGEX.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Guard: si faltan las variables de Supabase (ej. preview sin env vars),
  // dejamos pasar la request sin redirigir en lugar de crashear el middleware.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  // Solo corre middleware donde realmente importa: rutas protegidas + auth.
  // La landing, robots, sitemap, manifest, archivos estáticos NO pasan por aquí.
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/registro',
    '/admin/:path*',
  ],
}
