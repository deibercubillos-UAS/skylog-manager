// DELETE /api/socio/account — la persona borra su propia cuenta desde el panel de socio (V2, Etapa E3). Confirma
// escribiendo su correo. Solo aplica a una cuenta que es ÚNICAMENTE de socio: si también pertenece a organizaciones, se
// rechaza (sus datos operativos tienen retención obligatoria y se gestionan desde Mi Perfil / Organización).
import { socioContext } from '@/lib/v2/socioContext';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  const c = await socioContext();
  if (c.error) return c.error;
  const { admin, user, personId, memberships } = c;

  const { confirmEmail } = await request.json().catch(() => ({}));
  if (!confirmEmail || String(confirmEmail).trim().toLowerCase() !== String(user.email).toLowerCase()) {
    return Response.json({ error: 'Escribe tu correo exactamente para confirmar.' }, { status: 400 });
  }

  const { data: orgMemberships } = await admin.from('memberships').select('id').eq('person_id', personId).eq('status', 'activa').limit(1);
  if (orgMemberships?.length) {
    return Response.json({ error: 'Tu cuenta también pertenece a una organización. Para conservar sus registros, no se puede borrar desde el panel de socio.' }, { status: 409 });
  }

  // Único dueño de una escuela con asesores activos: se bloquea.
  for (const m of memberships.filter((x) => x.role === 'owner')) {
    const { data: others } = await admin.from('partner_members').select('id').eq('partner_id', m.partner_id).eq('role', 'owner').neq('person_id', personId);
    if (!others?.length) {
      const { data: children } = await admin.from('partners').select('id').eq('parent_partner_id', m.partner_id).eq('status', 'activo');
      if (children?.length) {
        return Response.json({ error: 'Eres el único administrador y aún tienes asesores activos. Desactívalos antes de borrar tu cuenta.' }, { status: 409 });
      }
    }
  }

  await admin.from('partner_members').delete().eq('person_id', personId);
  const { error } = await admin.auth.admin.deleteUser(user.id); // la cuenta (accounts) cae en cascada
  if (error) return Response.json({ error: 'No se pudo borrar la cuenta. Intenta de nuevo.' }, { status: 500 });
  await admin.from('people').delete().eq('id', personId); // si la retención lo impide, la persona queda sin cuenta
  return Response.json({ success: true });
}
