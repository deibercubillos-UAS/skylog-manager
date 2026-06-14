import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── DELETE: el propio usuario borra su cuenta ───────────────────────────────
// Desvincula sus membresías de socio y elimina su perfil + usuario de auth.
// No borra el socio (partner) ni sus datos comerciales — solo la persona.
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Confirmación explícita por correo (debe coincidir con el del usuario).
    const { confirmEmail } = await request.json().catch(() => ({}));
    if (!confirmEmail || String(confirmEmail).trim().toLowerCase() !== String(user.email).toLowerCase()) {
      return NextResponse.json({ error: 'Escribe tu correo exactamente para confirmar.' }, { status: 400 });
    }

    // Debe ser socio (este endpoint vive bajo /socio)
    const { data: memberships } = await admin
      .from('partner_members').select('id, role, partner_id').eq('profile_id', user.id);
    if (!memberships?.length) return NextResponse.json({ error: 'No es socio' }, { status: 403 });

    // Si es el único owner de una escuela con asesores activos, bloquear.
    for (const m of memberships.filter(x => x.role === 'owner')) {
      const { data: others } = await admin
        .from('partner_members')
        .select('id').eq('partner_id', m.partner_id).eq('role', 'owner').neq('profile_id', user.id);
      if (!others?.length) {
        const { data: children } = await admin
          .from('partners').select('id').eq('parent_partner_id', m.partner_id).eq('status', 'activo');
        if (children?.length) {
          return NextResponse.json({
            error: 'Eres el único administrador y aún tienes asesores activos. Transfiere o desactívalos antes de borrar tu cuenta.',
          }, { status: 409 });
        }
      }
    }

    // Desvincular membresías
    await admin.from('partner_members').delete().eq('profile_id', user.id);

    // Borrar perfil + usuario de auth
    await admin.from('profiles').delete().eq('id', user.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
