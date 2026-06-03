/**
 * POST /api/public/upload/[orgCode]
 * Sube imágenes/PDFs al bucket vor-mor-attachments/{orgId}/{uuid}.{ext}
 * Retorna la ruta almacenada (sin URL pública — se sirve via API autenticada).
 *
 * Límites: 10 MB por archivo, tipos: jpg/png/webp/heic/pdf
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request, { params }) {
    try {
        const { orgCode } = await params;

        // Resolver org
        const code = orgCode.replace(/\s|\./g, '').toUpperCase();
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('unique_code', code)
            .maybeSingle();
        if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_SIZE) {
            return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 });
        }

        // Generar path único: orgId/timestamp-random.ext
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const storagePath = `${org.id}/${timestamp}-${rand}.${ext}`;

        const { error: uploadErr } = await supabaseAdmin.storage
            .from('vor-mor-attachments')
            .upload(storagePath, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadErr) throw uploadErr;

        return NextResponse.json({ path: storagePath });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
