import { NextResponse }  from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/template
 *
 * Descarga la plantilla Excel de configuración inicial (Onboarding Express),
 * pre-llenada con los datos actuales de la organización si ya existen.
 * Accesible para admin y superadmin de cualquier organización.
 */
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const orgId = ctx.orgId;
    const admin = createAdminClient();

    // ── Cargar datos actuales de la org para pre-llenar la plantilla ──────────
    const [orgRes, pilotsRes, aircraftRes, batteriesRes, policiesRes, contactsRes] =
      await Promise.all([
        admin.from('organizations').select('*').eq('id', orgId).maybeSingle(),
        admin.from('pilots').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
        admin.from('aircraft').select('*').eq('organization_id', orgId).order('serial_number'),
        admin.from('batteries').select('*').eq('organization_id', orgId).order('serial_number'),
        admin.from('insurance_policies').select('*').eq('organization_id', orgId).order('end_date', { ascending: false }),
        admin.from('emergency_contacts').select('*').eq('organization_id', orgId).order('name'),
      ]);

    // Mapa aircraft_id → serial para baterías y pólizas
    const acById = {};
    (aircraftRes.data || []).forEach(a => { acById[a.id] = a.serial_number; });

    const batteries = (batteriesRes.data || []).map(b => ({
      ...b, _aircraft_serial: b.aircraft_id ? (acById[b.aircraft_id] || '') : '',
    }));
    const policies = (policiesRes.data || []).map(p => ({
      ...p, _aircraft_serial: p.aircraft_id ? (acById[p.aircraft_id] || '') : 'FLOTA',
    }));

    const data = {
      org:        orgRes.data || null,
      pilots:     pilotsRes.data || [],
      aircraft:   aircraftRes.data || [],
      batteries,
      policies,
      contacts:   contactsRes.data || [],
    };

    const { generateOnboardingTemplate } = await import('@/lib/onboardingTemplate');
    const buffer = await generateOnboardingTemplate(data);

    const date = new Date().toISOString().split('T')[0];

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bitafly-Onboarding-${date}.xlsx"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[onboarding/template] Error:', err.message);
    return NextResponse.json({ error: 'Error generando la plantilla' }, { status: 500 });
  }
}
