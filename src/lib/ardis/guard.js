import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isArdisEnabled } from './env';
import { ARDIS_COOKIE_NAME, verifySessionCookieValue } from './session';

// Los Route Handlers no heredan el guard de src/app/ardis/(app)/layout.js —
// cada ruta protegida de /api/ardis/* debe llamar esto primero y devolver
// la respuesta si no es null.
export function guardArdisRoute() {
  if (!isArdisEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const cookieStore = cookies();
  const sessionValue = cookieStore.get(ARDIS_COOKIE_NAME)?.value;
  if (!verifySessionCookieValue(sessionValue)) {
    return new NextResponse(null, { status: 404 });
  }

  return null;
}
