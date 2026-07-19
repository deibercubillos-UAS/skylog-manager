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
    const [orgRes, pilotsRes, aircraftRes, batteriesRes, techRes, policiesRes, contactsRes, battLogsRes] =
      await Promise.all([
        admin.from('organizations').select('*').eq('id', orgId).maybeSingle(),
        admin.from('pilots').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
        admin.from('aircraft').select('*').eq('organization_id', orgId).order('serial_number'),
        admin.from('batteries').select('*').eq('organization_id', orgId).order('serial_number'),
        admin.from('inventory_items').select('*').eq('organization_id', orgId).order('serial_number'),
        admin.from('insurance_policies').select('*').eq('organization_id', orgId).order('end_date', { ascending: false }),
        admin.from('emergency_contacts').select('*').eq('organization_id', orgId).order('name'),
        // Última aeronave usada por cada batería — `batteries` no tiene columna
        // aircraft_id (son intercambiables por diseño), el vínculo real vive en
        // battery_logs. Mismo criterio que dashboard/batteries/page.js.
        admin.from('battery_logs').select('battery_sn, aircraft_id, created_at')
          .eq('organization_id', orgId).order('created_at', { ascending: false }),
      ]);

    // Mapa aircraft_id → serial para pólizas
    const acById = {};
    (aircraftRes.data || []).forEach(a => { acById[a.id] = a.serial_number; });

    // Mapa battery_sn → aircraft_id más reciente (primera ocurrencia = más reciente, ya viene ordenado)
    const lastAircraftByBattery = {};
    (battLogsRes.data || []).forEach(l => {
      if (!lastAircraftByBattery[l.battery_sn]) lastAircraftByBattery[l.battery_sn] = l.aircraft_id;
    });

    const batteries = (batteriesRes.data || []).map(b => {
      const lastAcId = lastAircraftByBattery[b.serial_number];
      return { ...b, _aircraft_serial: lastAcId ? (acById[lastAcId] || '') : '' };
    });
    const policies = (policiesRes.data || []).map(p => ({
      ...p, _aircraft_serial: p.aircraft_id ? (acById[p.aircraft_id] || '') : 'FLOTA',
    }));

    const data = {
      org:        orgRes.data || null,
      pilots:     pilotsRes.data || [],
      aircraft:   aircraftRes.data || [],
      batteries,
      techItems:  techRes.data || [],
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
