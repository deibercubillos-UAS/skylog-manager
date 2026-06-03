import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Roles que se pueden auto-asignar en el formulario de registro público.
// Nunca permitir: superadmin, gerente_sms, jefe_pilotos (se asignan por un admin después).
const ALLOWED_REGISTRATION_ROLES = ['piloto', 'admin'];

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, firstName, lastName, phone, city, type, role, orgCode, companyName, nit } = body;
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // ── Sanitizar rol: solo 'piloto' o 'admin' son válidos al registrarse ──
        let normalizedRole = ALLOWED_REGISTRATION_ROLES.includes(role) ? role : 'piloto';
        // Registro individual siempre es piloto sin org propia
        if (type === 'solo') normalizedRole = 'piloto';

        let targetOrgId = null;

        if (type === 'solo' || normalizedRole === 'admin') {
            // Admin con NIT: usar NIT como unique_code (código de acceso de la org)
            // Solo (piloto independiente): código aleatorio
            let uniqueCode;
            if (normalizedRole === 'admin' && nit) {
                // Normalizar NIT: sin espacios, sin puntos, uppercase
                uniqueCode = nit.replace(/\s|\./g, '').toUpperCase();
                // Verificar que no exista ya una org con ese NIT
                const { data: existing } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('unique_code', uniqueCode)
                    .maybeSingle();
                if (existing) throw new Error('Ya existe una organización registrada con ese NIT');
            } else {
                uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            }

            const orgInsert = {
                company_name: type === 'solo' ? `Piloto: ${firstName}` : companyName,
                unique_code: uniqueCode,
            };
            // Guardar NIT también en tax_id si es una empresa
            if (normalizedRole === 'admin' && nit) {
                orgInsert.tax_id = nit.replace(/\s|\./g, '');
            }

            const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([orgInsert]).select().single();
            if (orgErr) throw orgErr;
            targetOrgId = org.id;
        } else {
            // Quien se une a una org existente puede ingresar el NIT o un código
            const code = orgCode ? orgCode.replace(/\s|\./g, '').toUpperCase() : null;
            if (!code) {
                // Sin código: crear org propia pendiente de vinculación
                const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([{
                    company_name: `Piloto: ${firstName}`,
                    unique_code: fallbackCode,
                }]).select().single();
                if (orgErr) throw orgErr;
                targetOrgId = org.id;
            } else {
                const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').select('id').eq('unique_code', code).single();
                if (orgErr || !org) throw new Error('NIT / código de organización inválido');
                targetOrgId = org.id;
            }
        }

        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName, role: normalizedRole, organization_id: targetOrgId }
        });
        if (authErr) throw authErr;

        // Upsert: el trigger on_auth_user_created ya pudo haber insertado el perfil base,
        // así que actualizamos con los datos completos del formulario de registro.
        await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            role: normalizedRole,           // ← siempre el rol validado, nunca el del body
            organization_id: targetOrgId,
            phone,
            city,
            subscription_plan: 'piloto',
        }, { onConflict: 'id' });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
