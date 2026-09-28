import { createArdisAdminClient } from './admin.js';
import { normalizeForMatch } from './text.js';

// Aprendizaje simple por coincidencia exacta (frase normalizada -> acción).
// ARDIS.md sugiere generalizar patrones ("llamar a {persona} {fecha}"); por
// ahora se guarda la frase completa tal como se dijo. Sigue siendo útil para
// frases que el usuario repite igual seguido, y es una base simple sobre la
// que se puede generalizar más adelante sin cambiar el resto del sistema.
export async function findLearnedPhrase(rawText) {
  const supabase = createArdisAdminClient();
  const pattern = normalizeForMatch(rawText);
  const { data } = await supabase.from('learned_phrases').select('*').eq('pattern', pattern).maybeSingle();
  return data || null;
}

export async function learnPhrase(rawText, action) {
  const supabase = createArdisAdminClient();
  const pattern = normalizeForMatch(rawText);

  const { data: existing } = await supabase
    .from('learned_phrases')
    .select('hits')
    .eq('pattern', pattern)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('learned_phrases')
      .update({ action, hits: (existing.hits || 1) + 1 })
      .eq('pattern', pattern);
  } else {
    await supabase.from('learned_phrases').insert({ pattern, action, hits: 1 });
  }
}
