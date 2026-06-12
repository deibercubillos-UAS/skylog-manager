import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { createNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Roles destinatarios válidos para un anuncio (los 4 públicos)
const ANNOUNCE_ROLES = ['admin', 'gerente_sms', 'jefe_pilotos', 'piloto'];

// POST /api/notifications/announce
// Body: { title, body?, roles? } — managers publican un anuncio a la org.
// roles: subconjunto de ANNOUNCE_ROLES; si se omite, va a todos.
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canSendAnnouncements')) {
      return NextResponse.json({ error: 'Sin permiso para publicar anuncios.' }, { status: 403 });
    }

    const data = await request.json().catch(() => ({}));
    const title = String(data.title || '').trim();
    const body  = String(data.body || '').trim();
    if (!title) return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });

    const requested = Array.isArray(data.roles)
      ? data.roles.filter(r => ANNOUNCE_ROLES.includes(r))
      : [];
    const targetRoles = requested.length ? requested : ANNOUNCE_ROLES;

    const sent = await createNotifications({
      orgId,
      roles: targetRoles,
      type: 'announcement',
      title: title.slice(0, 200),
      body: body ? body.slice(0, 1000) : null,
      link: null,                 // los anuncios no navegan a ningún lado
      actorId: user.id,           // se excluye al autor
      metadata: { announcement: true },
    });

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error('[notifications/announce POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
