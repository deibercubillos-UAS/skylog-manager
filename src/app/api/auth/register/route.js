import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, firstName, lastName, phone, city, type, role, orgCode, companyName } = body;

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        let targetOrgId = null;

        // --- LÓGICA DE EMPRESA NUEVA (Gerente General o Piloto Solo) ---
        if (type === 'solo' || role === 'admin') {
            const finalCompanyName = type === 'solo' ? `Piloto: ${firstName} ${lastName}` : companyName;
            
            // 1. Crear Organización
            const { data: newOrg, error: orgErr } = await supabaseAdmin.from('organizations').insert([{
                company_name: finalCompanyName,
                unique_code: Math.random().toString(36).substring(2, 8).toUpperCase()
            }]).select().single();
            
            if (orgErr) throw new Error("Error creando empresa: " + orgErr.message);
            targetOrgId = newOrg.id;
        } 
        
        // --- LÓGICA DE UNIRSE A EMPRESA EXISTENTE ---
        else {
            const { data: org, error: orgErr } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('unique_code', orgCode.toUpperCase())
                .single();

            if (orgErr || !org) throw new Error("ID de Empresa no encontrado.");
            targetOrgId = org.id;

            // 2. Validar si el ROL ÚNICO ya existe (SMS y Jefe Pilotos)
            if (role === 'gerente_sms' || role === 'jefe_pilotos') {
                const { data: existingRole } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('organization_id', targetOrgId)
                    .eq('role', role)
                    .maybeSingle();
                
                if (existingRole) throw new Error(`La empresa ya cuenta con un ${role.replace('_', ' ').toUpperCase()}. No se permite duplicidad.`);
            }
        }

        // 3. Crear Usuario en Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    phone,
                    city,
                    role: role || 'admin',
                    organization_id: targetOrgId
                }
            }
        });

        if (authErr) throw authErr;

        return NextResponse.json({ success: true, user: authData.user });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
