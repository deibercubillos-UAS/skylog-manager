import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { uniqueSlug } from '@/lib/slugify';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { PLAN_CONFIG } from '@/lib/planLimits';

// Roles que se pueden auto-asignar en el formulario de registro público.
// Nunca permitir: superadmin (se asigna manualmente en BD).
const ALLOWED_REGISTRATION_ROLES = ['piloto', 'admin'];
// Roles disponibles para el flujo de "unirse a organización"
const JOIN_ALLOWED_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms'];
// Roles únicos por org (solo puede haber 1)
const UNIQUE_ROLES = ['jefe_pilotos', 'gerente_sms'];

export async function POST(request) {
    try {
        // Rate limiting: máx 5 registros por IP por hora (previene creación masiva de cuentas)
        const ip = getClientIp(request);
        const { allowed } = checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 3_600_000 });
        if (!allowed) {
            return NextResponse.json({ error: 'Demasiados registros desde esta dirección. Intenta más tarde.' }, { status: 429 });
        }

        const body = await request.json();
        const { email, password, firstName, lastName, phone, city, type, role, orgCode, companyName, nit, joinMode } = body;
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // ── FLUJO JOIN: Unirse a organización existente (gratis, sin crear org) ──
        if (joinMode === true) {
            if (!JOIN_ALLOWED_ROLES.includes(role)) {
                return NextResponse.json({ error: 'Rol no permitido para unirse a una organización.' }, { status: 400 });
            }
            if (!orgCode) {
                return NextResponse.json({ error: 'NIT de la organización requerido.' }, { status: 400 });
            }

            const nit = orgCode.replace(/[\s\-.]/g, '').toUpperCase();
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select('id, company_name')
                .eq('unique_code', nit)
                .maybeSingle();

            if (!org) throw new Error('NIT inválido. La organización no existe en Bitafly.');

            const targetOrgId = org.id;

            // Verificar disponibilidad del rol
            if (UNIQUE_ROLES.includes(role)) {
                const { count } = await supabaseAdmin
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', targetOrgId)
                    .eq('role', role);
                if ((count ?? 0) > 0) {
                    const labels = { jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS' };
                    throw new Error(`El rol "${labels[role] || role}" ya está ocupado en ${org.company_name}.`);
                }
            }

            if (role === 'piloto') {
                const { data: adminProf } = await supabaseAdmin
                    .from('profiles')
                    .select('subscription_plan')
                    .eq('organization_id', targetOrgId)
                    .eq('role', 'admin')
                    .maybeSingle();
                const planKey    = adminProf?.subscription_plan || 'piloto';
                const maxPilots  = PLAN_CONFIG[planKey]?.maxPilots;
                if (maxPilots !== null && maxPilots !== undefined) {
                    const { count } = await supabaseAdmin
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .eq('organization_id', targetOrgId)
                        .eq('role', 'piloto');
                    if ((count ?? 0) >= maxPilots) {
                        throw new Error(`Límite de pilotos alcanzado (${maxPilots}) para el plan de ${org.company_name}.`);
                    }
                }
            }

            // Crear auth user
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                email, password, email_confirm: true,
                user_metadata: { first_name: firstName, last_name: lastName, role, organization_id: targetOrgId },
            });
            if (authErr) throw authErr;

            // Crear perfil (plan piloto — el plan lo paga el admin de la org)
            await supabaseAdmin.from('profiles').upsert({
                id:               authData.user.id,
                email,
                first_name:       firstName,
                last_name:        lastName,
                full_name:        `${firstName} ${lastName}`.trim(),
                role,
                organization_id:  targetOrgId,
                phone:            phone || null,
                city:             city  || null,
                subscription_plan: 'piloto',
            }, { onConflict: 'id' });

            // Auto-crear piloto
            await supabaseAdmin.from('pilots').insert([{
                organization_id: targetOrgId,
                owner_id:        authData.user.id,
                name:            `${firstName} ${lastName}`.trim(),
                email,
                phone:           phone || null,
                city:            city  || null,
                pilot_role:      'Piloto',
                is_active:       true,
            }]).catch(() => {});

            return NextResponse.json({ success: true });
        }

        // ── Sanitizar rol: solo 'piloto' o 'admin' son válidos al registrarse ──
        let normalizedRole = ALLOWED_REGISTRATION_ROLES.includes(role) ? role : 'piloto';
        // Piloto independiente (type='solo') = admin de su propia org.
        // role='admin' + plan='piloto' → "Piloto Independiente" en el layout.
        // Esto le da permisos RLS completos sobre su flota y mantenimiento.
        if (type === 'solo') normalizedRole = 'admin';

        let targetOrgId = null;
        let createdNewOrg = false; // ← true cuando se inserta una org nueva en este request

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

            const orgName   = type === 'solo' ? `Piloto: ${firstName}` : companyName;
            const orgSlug   = await uniqueSlug(orgName, async (candidate) => {
                const { data } = await supabaseAdmin
                    .from('organizations').select('id').eq('slug', candidate).maybeSingle();
                return !!data;
            });
            const orgInsert = {
                company_name: orgName,
                unique_code:  uniqueCode,
                slug:         orgSlug,
            };
            // Guardar NIT también en tax_id si es una empresa
            if (normalizedRole === 'admin' && nit) {
                orgInsert.tax_id = nit.replace(/\s|\./g, '');
            }

            const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([orgInsert]).select().single();
            if (orgErr) throw orgErr;
            targetOrgId = org.id;
            createdNewOrg = true;
        } else {
            // Quien se une a una org existente puede ingresar el NIT o un código
            const code = orgCode ? orgCode.replace(/\s|\./g, '').toUpperCase() : null;
            if (!code) {
                // Sin código: crear org propia pendiente de vinculación
                const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const soloName    = `Piloto: ${firstName}`;
                const soloSlug    = await uniqueSlug(soloName, async (c) => {
                    const { data } = await supabaseAdmin.from('organizations').select('id').eq('slug', c).maybeSingle();
                    return !!data;
                });
                const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert([{
                    company_name: soloName,
                    unique_code:  fallbackCode,
                    slug:         soloSlug,
                }]).select().single();
                if (orgErr) throw orgErr;
                targetOrgId = org.id;
                createdNewOrg = true;
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

        if (authErr) {
            // Si createUser falla, limpiar la org recién creada para evitar org huérfana.
            // Solo aplica a orgs creadas en ESTE request (targetOrgId no nulo).
            if (targetOrgId) {
                await supabaseAdmin.from('organizations').delete().eq('id', targetOrgId);
            }
            throw authErr;
        }

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

        // Auto-crear registro de piloto cuando el usuario crea su propia org
        // (piloto independiente o admin de empresa nueva).
        // La org es nueva en este request → no puede haber pilotos previos.
        if (createdNewOrg && targetOrgId) {
            await supabaseAdmin.from('pilots').insert([{
                organization_id: targetOrgId,
                owner_id:        authData.user.id,
                name:            `${firstName} ${lastName}`.trim(),
                email:           email,
                phone:           phone || null,
                city:            city  || null,
                pilot_role:      'Piloto',
                is_active:       true,
            }]);
            // Error no-crítico: si falla, el usuario igual puede crear el piloto
            // manualmente desde Tripulación. No propagamos el error.
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
