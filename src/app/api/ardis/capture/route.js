import { NextResponse } from 'next/server';
import * as chrono from 'chrono-node';
import { isArdisEnabled } from '@/lib/ardis/env';
import { parseCommand } from '@/lib/ardis/parser';
import { findLearnedPhrase } from '@/lib/ardis/learnedPhrases';
import { interpretWithGemini } from '@/lib/ardis/gemini';
import { executeIntent } from '@/lib/ardis/actions';
import { getConversationHistory, pushConversationMessage } from '@/lib/ardis/conversation';
import { createArdisAdminClient } from '@/lib/ardis/admin';

function resolveDueAtFromText(rawText) {
  const results = chrono.es.parse(rawText, new Date(), { forwardDate: true });
  return results.length ? results[0].start.date() : null;
}

async function captureToInbox(title) {
  const supabase = createArdisAdminClient();
  const { data, error } = await supabase.from('tasks').insert({ title, status: 'inbox' }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Atajo de Siri ("Anota en ARDIS"): dicta -> POST aquí -> "Anotado". No hay
 * pantalla ni vuelta de audio para confirmar una interpretación de Gemini,
 * así que la política de confianza es:
 *
 *  - parser sin IA o frase ya aprendida -> alta confianza, se ejecuta directo
 *    (el parser exige patrones explícitos; una frase aprendida ya fue
 *    confirmada una vez por el usuario en /ardis/hablar).
 *  - Gemini + create_task -> se ejecuta, pero SIEMPRE a inbox, sin
 *    recurrencia/dependencia automáticas: captura segura y reversible
 *    (filosofía GTD: "captura todo, procesa después" — para eso existe el
 *    inbox), el usuario la ajusta luego a mano.
 *  - Gemini con cualquier otro tipo, o "unknown" -> no se ejecuta ninguna
 *    acción (completar/posponer una tarea equivocada sí sería dañino sin
 *    confirmación); se anota el texto crudo en el inbox para no perderlo.
 */
export async function POST(request) {
  if (!isArdisEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const token = request.headers.get('x-ardis-capture-token') || url.searchParams.get('token');
  if (!process.env.ARDIS_CAPTURE_TOKEN || token !== process.env.ARDIS_CAPTURE_TOKEN) {
    return new NextResponse(null, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'text es requerido' }, { status: 400 });
  }

  let intent = parseCommand(text);
  let source = 'parser';

  if (intent.type === 'unknown') {
    const learned = await findLearnedPhrase(text);
    if (learned) {
      intent = { ...learned.action };
      source = 'learned';
    } else {
      try {
        const history = await getConversationHistory();
        intent = await interpretWithGemini(text, { history });
      } catch {
        intent = { type: 'unknown' };
      }
      source = 'gemini';
    }

    if (intent.type === 'create_task' || intent.type === 'postpone_task') {
      const resolved = resolveDueAtFromText(text);
      intent.dueAt = resolved ? resolved.toISOString() : null;
    }
  }

  let result;
  let mode;

  try {
    if (source === 'parser' || source === 'learned') {
      result = await executeIntent(intent);
      mode = 'executed';
    } else if (intent.type === 'create_task') {
      result = { task: await captureToInbox(intent.title) };
      mode = 'captured_inbox';
    } else {
      result = { task: await captureToInbox(text) };
      mode = 'captured_inbox_raw';
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  await pushConversationMessage('user', text);
  await pushConversationMessage('ardis', 'Anotado');

  return NextResponse.json({ ok: true, reply: 'Anotado', mode, source, intent, result });
}
