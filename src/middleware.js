import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Patrones de bots que escanean vulnerabilidades de WordPress, etc.
// Cortamos en frío sin tocar Supabase para no malgastar invocaciones de función.
const BOT_PROBE_REGEX = /\.(php|asp|aspx|jsp|cgi|env|git|sql|bak|sh)$|wp-(admin|content|includes|login|config)|xmlrpc/i;

// Prefijos de las páginas de la aplicación (grupo de rutas (v2)). Todo lo demás —landing, legales, tutoriales,
// formularios públicos como /reportar o /invitacion— es público a propósito.
const APP_PREFIXES = [
  '/inicio', '/flota', '/operacion', '/organizacion', '/perfil', '/polizas', '/proveedores', '/reportes', '/retencion',
  '/sms', '/suscripcion', '/aerocivil', '/capacitacion', '/manuales', '/listas-de-chequeo', '/admin', '/verificacion',
];

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

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  // Rutas API sensibles que requieren sesión activa
  const isProtectedApi = pathname.startsWith('/api/admin') || pathname.startsWith('/api/user');

  const isAppPage = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // API routes: responder 401 JSON, nunca redirigir
  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Páginas de la aplicación: sin sesión nunca se sirven, se manda a iniciar sesión y, al entrar, se vuelve aquí.
  // (La seguridad real de los datos sigue en la API y la RLS; esto evita servir el cascarón a quien no tiene sesión.)
  if (isAppPage && !user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isAuthPage && user) {
    // develop-v2: /inicio es el dashboard real de V2 — esta rama no tiene
    // las tablas de v1 en su base de datos. NO cambiar en main.
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return response;
}

export const config = {
  // Solo corre middleware donde realmente importa: rutas protegidas + auth.
  // La landing, robots, sitemap, manifest, archivos estáticos NO pasan por aquí.
  matcher: [
    '/login',
    '/register',
    '/registro',
    // Next exige un matcher literal: si cambia APP_PREFIXES, cambiar también esta lista.
    '/(inicio|flota|operacion|organizacion|perfil|polizas|proveedores|reportes|retencion|sms|suscripcion|aerocivil|capacitacion|manuales|listas-de-chequeo|admin|verificacion)/:path*',
    '/(inicio|flota|operacion|organizacion|perfil|polizas|proveedores|reportes|retencion|sms|suscripcion|aerocivil|capacitacion|manuales|listas-de-chequeo|admin|verificacion)',
    '/api/admin/:path*',
    '/api/user/:path*',
  ],
}
