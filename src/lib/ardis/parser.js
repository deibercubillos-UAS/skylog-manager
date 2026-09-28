import * as chrono from 'chrono-node';
import { stripAccents, collapseSpaces, normalizeForMatch } from './text.js';

// Parser de comandos sin IA (ARDIS.md §6). Puro: no toca la base de datos,
// solo texto -> intención estructurada. La ejecución contra Supabase vive en
// las rutas API; la conexión voz/Gemini -> este parser -> acción llega en la
// Fase 3 (confirmación + aprendizaje de frases).

const DAY_NAME_TO_CODE = {
  lunes: 'MO',
  martes: 'TU',
  miercoles: 'WE',
  jueves: 'TH',
  viernes: 'FR',
  sabado: 'SA',
  domingo: 'SU',
};

function extractArea(body) {
  const match = body.match(/\b(sky|was|bit|per)\b\s*$/i);
  if (!match) return { body, area: null };
  return { body: collapseSpaces(body.slice(0, match.index)), area: match[1].toUpperCase() };
}

function extractRecurrence(body) {
  let match = body.match(/\bcada\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)\b/i);
  if (match) {
    const code = DAY_NAME_TO_CODE[stripAccents(match[1].toLowerCase())];
    return { body: collapseSpaces(body.replace(match[0], '')), recurrence: `weekly:${code}` };
  }

  match = body.match(/\bcada\s+semana\b/i);
  if (match) {
    return { body: collapseSpaces(body.replace(match[0], '')), recurrence: 'weekly:MO' };
  }

  match = body.match(/\bcada\s+mes(?:\s+d[ií]a\s+(\d{1,2}))?\b/i);
  if (match) {
    const day = match[1] ? Number(match[1]) : 1;
    return { body: collapseSpaces(body.replace(match[0], '')), recurrence: `monthly:${day}` };
  }

  return { body, recurrence: null };
}

function extractWaitingFor(body) {
  const match = body.match(/\b(?:delegad[oa]\s+a|esperando\s+a)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
  if (!match) return { body, waitingFor: null };
  return { body: collapseSpaces(body.replace(match[0], '')), waitingFor: collapseSpaces(match[1]) };
}

function extractDependsOn(body) {
  const match = body.match(/\bdepende\s+de\s+(.+)$/i);
  if (!match) return { body, dependsOnTitle: null };
  return { body: collapseSpaces(body.slice(0, match.index)), dependsOnTitle: collapseSpaces(match[1]) };
}

function extractDate(body, refDate) {
  const results = chrono.es.parse(body, refDate, { forwardDate: true });
  if (!results.length) return { body, date: null };

  const r = results[0];
  const cleaned = collapseSpaces(body.slice(0, r.index) + ' ' + body.slice(r.index + r.text.length));
  return { body: cleaned, date: r.start.date() };
}

export function parseCommand(rawText, refDate = new Date()) {
  const text = collapseSpaces(rawText || '');
  if (!text) return { type: 'unknown', raw: rawText ?? '' };

  const normalized = normalizeForMatch(text);

  if (normalized === 'buenos dias' || normalized === 'buen dia') {
    return { type: 'daily_summary', raw: text };
  }
  if (normalized === 'que sigue') {
    return { type: 'next_task', raw: text };
  }
  if (normalized === 'cierre') {
    return { type: 'day_close', raw: text };
  }

  let match = text.match(/^(?:nueva\s+)?tarea\s+(.+)$/i);
  if (match) {
    let body = match[1];
    let area;
    let recurrence;
    let waitingFor;
    let dependsOnTitle;
    let date;

    ({ body, area } = extractArea(body));
    ({ body, recurrence } = extractRecurrence(body));
    ({ body, waitingFor } = extractWaitingFor(body));
    ({ body, dependsOnTitle } = extractDependsOn(body));
    ({ body, date } = extractDate(body, refDate));

    const title = collapseSpaces(body);
    if (!title) return { type: 'unknown', raw: text };

    return {
      type: 'create_task',
      raw: text,
      title,
      area,
      dueAt: date,
      recurrence,
      waitingFor,
      dependsOnTitle,
    };
  }

  match = text.match(/^listo\s+(.+)$/i);
  if (match) {
    return { type: 'complete_task', raw: text, title: collapseSpaces(match[1]) };
  }

  match = text.match(/^(?:pospón|pospon|posponer|aplaza|aplazar)\s+(.+?)\s+(?:al|a|para)\s+(.+)$/i);
  if (match) {
    const title = collapseSpaces(match[1]);
    const results = chrono.es.parse(match[2], refDate, { forwardDate: true });
    if (!results.length) return { type: 'unknown', raw: text };
    return { type: 'postpone_task', raw: text, title, dueAt: results[0].start.date() };
  }

  match = text.match(/^avance\s+(.+?)\s+(\d{1,3})\s*%$/i);
  if (match) {
    return {
      type: 'progress_update',
      raw: text,
      target: collapseSpaces(match[1]),
      percent: Math.min(100, Number(match[2])),
    };
  }

  return { type: 'unknown', raw: text };
}
