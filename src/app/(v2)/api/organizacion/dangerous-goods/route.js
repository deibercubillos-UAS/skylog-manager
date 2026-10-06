// Skylog V2.0 — declaración expresa de mercancías peligrosas (MAUT-5.0-12-174, ítem 7). La firma la autoridad de
// la organización (Gerente General, Gerente SMS o superadmin): es una declaración, no un dato operativo. Queda
// quién y cuándo. La fila de `organization_certifications` puede no existir todavía (upsert); se escribe con
// service role como el resto de esa tabla, después de validar el permiso aquí.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { validateDangerousGoodsDeclaration } from '@skylog/domain';

const AUTHORITY_ROLES = ['admin', 'gerente_sms', 'superadmin'];

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, declaration, notes } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!(memberships || []).some((m) => m.organization_id === organizationId && AUTHORITY_ROLES.includes(m.role))) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS pueden firmar esta declaración' }, { status: 403 });
  }

  const check = validateDangerousGoodsDeclaration({ declaration, notes });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organization_certifications')
    .upsert(
      {
        organization_id: organizationId,
        dangerous_goods_declaration: declaration,
        dangerous_goods_notes: (notes || '').trim() || null,
        dangerous_goods_declared_at: new Date().toISOString(),
        dangerous_goods_declared_by: personId,
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ certification: data });
}
