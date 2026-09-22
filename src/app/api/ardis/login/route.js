import { NextResponse } from 'next/server';
import { isArdisEnabled } from '@/lib/ardis/env';
import { verifyPassword } from '@/lib/ardis/password';
import {
  ARDIS_COOKIE_NAME,
  ARDIS_COOKIE_MAX_AGE,
  createSessionCookieValue,
} from '@/lib/ardis/session';

export async function POST(request) {
  // Los Route Handlers no heredan el guard del layout: cada uno se protege solo.
  if (!isArdisEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const password = body?.password;
  const storedHash = process.env.ARDIS_PASSWORD_HASH;

  if (!storedHash || !verifyPassword(password, storedHash)) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ARDIS_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ARDIS_COOKIE_MAX_AGE,
  });
  return response;
}
