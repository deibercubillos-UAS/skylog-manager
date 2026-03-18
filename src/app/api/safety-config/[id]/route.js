import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // checklist o sora
    const authHeader = request.headers.get('Authorization');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const table = type === 'checklist' ? 'checklist_templates' : 'sora_templates';

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: "Item eliminado" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}