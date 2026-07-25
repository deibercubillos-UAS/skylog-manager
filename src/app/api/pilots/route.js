import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource, crewCountsForLimit } from '@/lib/planLimits';
import { getOrgAddonCounts } from '@/lib/addons';
import { logAudit } from '@/lib/auditLog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/pilots — Lista pilotos de la organización
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('pilots')
      .select('id,name,email,phone,id_number,license_number,medical_expiry,pilot_role,is_active,id_doc_url,medical_cert_url,pilot_course_url,avatar_url,aerocivil_additions,emergency_contact_name,emergency_contact_phone,created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const res = NextResponse.json(data || []);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pilots — Crea un nuevo piloto
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, subscription_plan, fullName } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { pilotData } = body;

    if (!pilotData?.name) {
      return NextResponse.json({ error: 'El nombre del piloto es obligatorio' }, { status: 400 });
    }

    // ── Verificar límite de tripulantes según plan ────────────────────────
    // Gerente General y Gerente SMS NO cuentan contra el límite.
    const newRole = pilotData.pilot_role || pilotData.position || 'Piloto';
    if (crewCountsForLimit(newRole)) {
      const { data: activePilots } = await supabase
        .from('pilots')
        .select('pilot_role')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      const count = (activePilots || []).filter(p => crewCountsForLimit(p.pilot_role)).length;

      const { pilot: extraPilots } = await getOrgAddonCounts(supabase, orgId);
      if (!canAddResource(subscription_plan, count, 'pilot', extraPilots)) {
        return NextResponse.json(
          { error: `Tu plan ${subscription_plan.toUpperCase()} ha llegado al límite de tripulantes. Puedes agregar un piloto adicional desde Suscripción.` },
          { status: 403 }
        );
      }
    }

    // Campos explícitos — nunca insertar el body completo (mass-assignment)
    const ALLOWED_FIELDS = [
      'name', 'email', 'phone', 'id_type', 'id_number', 'position',
      'license_number', 'license_category', 'cipu_number', 'medical_expiry',
      'pilot_role', 'notes', 'avatar_url', 'aerocivil_additions',
      'id_doc_url', 'medical_cert_url', 'pilot_course_url', 'theoretical_exam_url',
      'emergency_contact_name', 'emergency_contact_phone',
    ];
    const cleanData = {};
    for (const f of ALLOWED_FIELDS) {
      if (pilotData[f] !== undefined) cleanData[f] = pilotData[f];
    }

    const { data, error } = await supabase
      .from('pilots')
      .insert([{ ...cleanData, owner_id: user.id, organization_id: orgId, is_active: true }])
      .select()
      .single();

    if (error) throw error;

    logAudit({
      orgId, actorId: user.id, actorName: fullName || user.email, action: 'create', module: 'pilots',
      entityLabel: data.name || 'Piloto', metadata: { pilot_id: data.id },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
