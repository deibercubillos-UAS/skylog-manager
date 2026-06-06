// POST /api/invitations/reject  { token }
// El usuario rechaza una invitación. Marca la invitación como 'rejected'.
// El piloto destino queda con invitation_status='rejected' para que el admin lo vea.
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { token } = await request.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: inv } = await admin
      .from('invitations')
      .select('id, email, status, pilot_id')
      .eq('token', token)
      .maybeSingle();

    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    const myEmail  = (user.email || '').trim().toLowerCase();
    const invEmail = (inv.email || '').trim().toLowerCase();
    if (myEmail !== invEmail) {
      return NextResponse.json({ error: 'Esta invitación pertenece a otro correo.' }, { status: 403 });
    }

    await admin.from('invitations').update({ status: 'rejected' }).eq('id', inv.id);
    if (inv.pilot_id) {
      await admin.from('pilots').update({ invitation_status: 'rejected' }).eq('id', inv.pilot_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[invitations/reject]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
