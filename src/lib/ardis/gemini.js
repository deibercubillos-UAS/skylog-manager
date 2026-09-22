import 'server-only';

// Llama a la API REST de Gemini directamente con fetch — sin SDK, así no se
// necesita agregar una dependencia nueva (ARDIS.md solo pre-aprueba
// chrono-node y web-push). ARDIS_GEMINI_MODEL se verifica en AI Studio, no
// se asume un nombre fijo de modelo.
const DEFAULT_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `Eres el intérprete de comandos de ARDIS, un asistente personal de tareas y proyectos. Tu única función es convertir una frase en español a un objeto JSON con una de estas formas EXACTAS. No inventes campos. No calcules fechas (eso lo hace otro sistema). Si la frase no encaja en ninguna, responde exactamente {"type":"unknown"}.

1. Crear tarea:
{"type":"create_task","title":"...","area":"SKY"|"WAS"|"BIT"|"PER"|null,"recurrence":"weekly:MO"|"weekly:TU"|"weekly:WE"|"weekly:TH"|"weekly:FR"|"weekly:SA"|"weekly:SU"|"monthly:N"|null,"waitingFor":"..."|null,"dependsOnTitle":"..."|null}

2. Completar tarea:
{"type":"complete_task","title":"..."}

3. Posponer tarea:
{"type":"postpone_task","title":"..."}

4. Reportar avance de un proyecto:
{"type":"progress_update","target":"...","percent":0}

5. Resumen del día:
{"type":"daily_summary"}

6. Cuál sigue:
{"type":"next_task"}

7. Cierre del día:
{"type":"day_close"}

Responde SOLO el JSON, sin explicación, sin markdown, sin comillas triples.`;

export async function interpretWithGemini(text, { history = [] } = {}) {
  const apiKey = process.env.ARDIS_GEMINI_KEY;
  const model = process.env.ARDIS_GEMINI_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    throw new Error('ARDIS_GEMINI_KEY no está configurada');
  }

  const contents = [
    ...history.map((h) => ({
      role: h.role === 'ardis' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
    { role: 'user', parts: [{ text }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini respondió ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    return { type: 'unknown' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: 'unknown' };
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.type) {
    return { type: 'unknown' };
  }

  return parsed;
}
