// Skylog V2.0 — enlace de confirmación del correo del registro (ver `lib/v2/signupVerification.js`). Canjea el token
// por la sesión (esto confirma el correo) y lleva a definir la contraseña. Un enlace vencido o usado va al registro
// con aviso: desde ahí se puede pedir otro.
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const fail = () => NextResponse.redirect(new URL('/registro?confirmar=vencido', url.origin));
  if (!tokenHash || tokenHash.length > 200) return fail();

  const supabase = await createClientSSR();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error || !data?.user) return fail();
  return NextResponse.redirect(new URL('/registro/clave', url.origin));
}
