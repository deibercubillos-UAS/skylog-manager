import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { executeIntent } from '@/lib/ardis/actions';
import { learnPhrase } from '@/lib/ardis/learnedPhrases';
import { pushConversationMessage } from '@/lib/ardis/conversation';

function summarize(intent, result) {
  if (result?.error) return result.error;

  switch (intent.type) {
    case 'create_task':
      return `Tarea creada: ${result.task?.title}`;
    case 'complete_task':
      return `Tarea completada: ${result.task?.title}`;
    case 'postpone_task':
      return `Tarea pospuesta: ${result.task?.title}`;
    case 'progress_update':
      return `Avance de ${result.project?.name}: ${result.project?.progress}%`;
    case 'next_task':
      return result.task ? `Siguiente: ${result.task.title}` : 'No hay tareas pendientes';
    case 'daily_summary':
      return `${result.dueToday?.length || 0} tareas para hoy, ${result.totalOpen || 0} abiertas en total`;
    case 'day_close':
      return `Hoy completaste ${result.completedToday?.length || 0}, quedan ${result.remaining || 0}`;
    default:
      return 'Listo';
  }
}

// Ejecuta una intención ya confirmada por el usuario. Solo aquí se escribe
// en la base de datos. Si vino de Gemini y el usuario NO la editó, se
// aprende el patrón (ARDIS.md §6) para resolverla sin IA la próxima vez.
export async function POST(request) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { intent, rawText, source, edited } = body || {};
  if (!intent?.type) {
    return NextResponse.json({ error: 'intent es requerido' }, { status: 400 });
  }

  let result;
  try {
    result = await executeIntent(intent);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const reply = summarize(intent, result);

  if (rawText) {
    await pushConversationMessage('user', rawText);
  }
  await pushConversationMessage('ardis', reply);

  if (source === 'gemini' && !edited && rawText) {
    const learnable = { ...intent };
    delete learnable.dueAt; // no se cachea una fecha resuelta; se recalcula al reusar el patrón
    await learnPhrase(rawText, learnable);
  }

  return NextResponse.json({ result, reply });
}
