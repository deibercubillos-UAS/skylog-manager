import { NextResponse } from 'next/server';
import { isArdisEnabled } from '@/lib/ardis/env';
import { ARDIS_COOKIE_NAME } from '@/lib/ardis/session';

export async function POST() {
  if (!isArdisEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ARDIS_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}
