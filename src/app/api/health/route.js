import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Mantiene despiertos la función y la base (sin arranque en frío). Lo llama un workflow programado de GitHub.
// Solo devuelve si la base respondió: sin datos de usuarios.
export async function GET() {
  const started = Date.now();
  try {
    const { error } = await createAdminClient().from('organizations').select('id').limit(1);
    return NextResponse.json({ ok: !error, ms: Date.now() - started }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ ok: false, ms: Date.now() - started }, { status: 503 });
  }
}
