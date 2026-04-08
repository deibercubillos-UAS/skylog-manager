import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, firstName, lastName, phone, city, type, role, orgCode, companyName } = body;
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        let targetOrgId = null;

        if (type === 'solo' || role === 'admin') {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([{
                company_name: type === 'solo' ? `Piloto: ${firstName}` : companyName,
                unique_code: code
            }]).select().single();
            if (orgErr) throw orgErr;
            targetOrgId = org.id;
        } else {
            const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').select('id').eq('unique_code', orgCode.toUpperCase()).single();
            if (orgErr || !org) throw new Error("Código de Empresa Inválido");
            targetOrgId = org.id;
        }

        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName, role, organization_id: targetOrgId }
        });
        if (authErr) throw authErr;

        await supabaseAdmin.from('profiles').insert([{
            id: authData.user.id, email, first_name: firstName, last_name: lastName,
            full_name: `${firstName} ${lastName}`, role, organization_id: targetOrgId,
            phone, city, subscription_plan: 'piloto'
        }]);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
