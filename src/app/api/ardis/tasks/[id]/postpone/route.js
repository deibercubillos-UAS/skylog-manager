import { NextResponse } from 'next/server';
import * as chrono from 'chrono-node';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';

export async function POST(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const dateInput = body?.date;
  if (!dateInput) {
    return NextResponse.json({ error: 'date es requerido' }, { status: 400 });
  }

  // Acepta ISO directo o texto en español ("el viernes", "mañana") vía chrono.
  let dueAt = new Date(dateInput);
  if (Number.isNaN(dueAt.getTime())) {
    const results = chrono.es.parse(String(dateInput), new Date(), { forwardDate: true });
    if (!results.length) {
      return NextResponse.json({ error: 'No se pudo interpretar la fecha' }, { status: 400 });
    }
    dueAt = results[0].start.date();
  }

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({ due_at: dueAt.toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
