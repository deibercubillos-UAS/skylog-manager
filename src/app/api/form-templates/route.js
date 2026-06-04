import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INITIAL_FORMATS = [
    {
        identifier: 'vuelo_diario', name: 'Formato de Vuelo Diario', form_code: 'F-OPS-001', version: '2.0',
        schema: [
            { label: 'Marca UAS', type: 'auto_brand' },
            { label: 'Modelo UAS', type: 'auto_model' },
            { label: 'SN UAS', type: 'auto_sn' },
            { label: 'CIPU Piloto', type: 'auto_cipu' },
            { label: 'Hora Despegue', type: 'time' },
            { label: 'Hora Aterrizaje', type: 'time' },
            { label: 'Condición Visual', type: 'select', options: 'VMC, IMC' }
        ]
    },
    {
        identifier: 'registro_baterias', name: 'Registro Operacional Baterías', form_code: 'F-MNT-003', version: '1.0',
        schema: [
            { label: 'SN Aeronave', type: 'auto_sn' },
            { label: 'Modelo Batería', type: 'text' },
            { label: 'Número de Ciclo', type: 'number' }
        ]
    }
];

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let { data: templates } = await supabase
        .from('form_templates')
        .select('*')
        .eq('owner_id', user.id);

    // Si es un usuario nuevo, instalamos los formatos básicos
    if (!templates || templates.length === 0) {
        const toInstall = INITIAL_FORMATS.map(f => ({ ...f, owner_id: user.id }));
        const { data: installed } = await supabase.from('form_templates').insert(toInstall).select();
        return NextResponse.json(installed || []);
    }

    return NextResponse.json(templates);
}

export async function POST(request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    // Allowlist explícita — evita mass-assignment (ej: inyectar id para pisar template ajeno)
    const { data, error } = await supabase.from('form_templates').upsert({
        identifier: body.identifier,
        name:       body.name,
        form_code:  body.form_code,
        version:    body.version,
        schema:     body.schema,
        owner_id:   user.id,
        updated_at: new Date().toISOString(),
    }).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data[0]);
}
