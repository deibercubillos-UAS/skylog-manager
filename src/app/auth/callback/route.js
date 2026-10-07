// Skylog V2.0 — retorno del inicio de sesión con Google (Etapa D). Intercambia el código por la sesión y decide a
// dónde ir: quien ya tiene cuenta de BitaFly entra a su panel (o a `next`); quien viene de Google por primera vez
// no tiene persona ni organización todavía y pasa a completar su registro.
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { safeNextPath } from '@/lib/v2/safeNext';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));
  const fail = () => NextResponse.redirect(new URL('/login?error=google', url.origin));
  if (!code) return fail();

  const supabase = await createClientSSR();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) return fail();

  const { data: account } = await createAdminClient().from('accounts').select('id').eq('auth_user_id', data.user.id).maybeSingle();
  const target = account ? next || '/inicio' : `/registro/completar${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return NextResponse.redirect(new URL(target, url.origin));
}
