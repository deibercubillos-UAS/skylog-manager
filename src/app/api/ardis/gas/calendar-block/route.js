import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createCalendarBlock } from '@/lib/ardis/gas';

// La "confirmación" que pide ARDIS.md §7 para crear bloques de calendario es
// esta misma llamada: solo se dispara si una sesión autenticada la hace a
// propósito (no hay ejecución automática de esto en ningún cron).
export async function POST(request) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { title, start, end } = body || {};
  if (!title || !start || !end) {
    return NextResponse.json({ error: 'title, start y end son requeridos' }, { status: 400 });
  }

  try {
    const data = await createCalendarBlock({ title, start, end });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
