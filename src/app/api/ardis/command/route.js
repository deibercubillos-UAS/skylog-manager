import { NextResponse } from 'next/server';
import * as chrono from 'chrono-node';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { parseCommand } from '@/lib/ardis/parser';
import { findLearnedPhrase } from '@/lib/ardis/learnedPhrases';
import { interpretWithGemini } from '@/lib/ardis/gemini';
import { getConversationHistory } from '@/lib/ardis/conversation';

function resolveDueAtFromText(rawText) {
  const results = chrono.es.parse(rawText, new Date(), { forwardDate: true });
  return results.length ? results[0].start.date() : null;
}

// Interpreta texto/voz en una intención estructurada — NUNCA ejecuta la
// acción aquí. Orden: parser sin IA -> frase ya aprendida -> Gemini.
// El cliente debe confirmar en /api/ardis/confirm antes de que algo se
// escriba en la base de datos.
export async function POST(request) {
  const guard = guardArdisRoute();
  if (guard) return guard;

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
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      source = 'gemini';
    }

    // La fecha nunca se confía a la caché ni a Gemini: se resuelve aquí,
    // fresca, con chrono sobre el texto de ahora mismo.
    if (intent.type === 'create_task' || intent.type === 'postpone_task') {
      const resolved = resolveDueAtFromText(text);
      intent.dueAt = resolved ? resolved.toISOString() : null;
    }
  }

  return NextResponse.json({ intent, source, rawText: text });
}
