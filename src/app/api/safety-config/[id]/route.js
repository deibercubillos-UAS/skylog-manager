import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID de item inválido' }, { status: 400 });
    }

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verificar rol
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const allowedRoles = ['superadmin', 'admin', 'gerente_sms'];
    if (!allowedRoles.includes(profile?.role)) {
      return NextResponse.json({ error: 'Sin permisos para eliminar protocolos' }, { status: 403 });
    }

    // Verificar que el registro exista y pertenezca al org antes de eliminar
    const { data: existing } = await supabase
      .from('form_definitions')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('form_type', 'sora')
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Protocolo no encontrado o sin permisos' }, { status: 404 });
    }

    const { error } = await supabase
      .from('form_definitions')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('form_type', 'sora');

    if (error) throw error;
    return NextResponse.json({ message: 'Eliminado con éxito' });
  } catch (err) {
    console.error('Error en safety-config DELETE:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
