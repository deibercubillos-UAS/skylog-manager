import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// ─── Cifrado AES-256-GCM ─────────────────────────────────────
const ALGO = 'aes-256-gcm';
// AEROCIVIL_SALT debe estar definido en variables de entorno de Vercel.
// El fallback 'bitafly-aerocivil-v1' mantiene compatibilidad con credenciales
// ya cifradas, pero debe reemplazarse con una variable de entorno real.
// TODO: una vez que AEROCIVIL_SALT esté en Vercel, remover el fallback y lanzar error.
if (!process.env.AEROCIVIL_SALT) {
  console.error('[SECURITY] AEROCIVIL_SALT no está definido en variables de entorno. Usando valor por defecto inseguro. Agregar a Vercel Dashboard → Settings → Environment Variables.');
}
const SALT = process.env.AEROCIVIL_SALT || 'bitafly-aerocivil-v1';

function getKey() {
  const secret = process.env.AEROCIVIL_ENCRYPTION_KEY;
  if (!secret) throw new Error('AEROCIVIL_ENCRYPTION_KEY no configurado en variables de entorno');
  return scryptSync(secret, SALT, 32);
}

export function encrypt(text) {
  const key = getKey();
  const iv  = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText) {
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Formato de credencial inválido');
  const [ivHex, tagHex, dataHex] = parts;
  const iv   = Buffer.from(ivHex,  'hex');
  const tag  = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex,'hex');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
}

// ─── Helpers ─────────────────────────────────────────────────
async function getOrgAndRole(supabaseUser) {
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return {};
  const { data: prof } = await supabaseUser
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();
  return { user, prof };
}

const ALLOWED_ROLES = PERMISSIONS.canManageAerocivil;

// ─── GET: estado de credenciales (sin exponer la contraseña) ──
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { prof } = await getOrgAndRole(supabase);
    if (!prof?.organization_id) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const { data, error } = await supabase
      .from('aerocivil_credentials')
      .select('id, username, solicitante, contact_name, verified, last_verified_at, updated_at')
      .eq('organization_id', prof.organization_id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data || null);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: guardar/actualizar credenciales ────────────────────
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { prof } = await getOrgAndRole(supabase);

    if (!prof?.organization_id) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(prof?.role))
      return NextResponse.json({ error: 'Sin permisos — requiere admin o jefe_pilotos' }, { status: 403 });

    const { username, password, solicitante, contact_name } = await request.json();

    if (!username?.trim() || !password?.trim())
      return NextResponse.json({ error: 'Usuario y contraseña son obligatorios' }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const password_enc = encrypt(password.trim());

    const { error } = await supabaseAdmin
      .from('aerocivil_credentials')
      .upsert({
        organization_id: prof.organization_id,
        username:        username.trim(),
        password_enc,
        solicitante:     solicitante?.trim() || null,
        contact_name:    contact_name?.trim() || null,
        verified:        false,   // se resetea al cambiar credenciales
        last_verified_at: null,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'organization_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: eliminar credenciales ───────────────────────────
export async function DELETE() {
  try {
    const supabase = await createClientSSR();
    const { prof } = await getOrgAndRole(supabase);

    if (!prof?.organization_id) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(prof?.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from('aerocivil_credentials')
      .delete()
      .eq('organization_id', prof.organization_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
