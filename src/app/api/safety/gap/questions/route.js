import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/safety/gap/questions — catálogo global (fijo, transcripción
// literal del Apéndice 1 - MAUT-5.0-22-017) de las 100 preguntas del GAP.
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user } = await getOrgContext(supabase);
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data, error } = await supabase
            .from('sms_gap_questions')
            .select('*')
            .order('order_index');

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
