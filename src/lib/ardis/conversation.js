import { createArdisAdminClient } from './admin.js';

const MAX_HISTORY = 4;

export async function getConversationHistory() {
  const supabase = createArdisAdminClient();
  const { data } = await supabase.from('conversation').select('last').eq('id', 1).maybeSingle();
  return Array.isArray(data?.last) ? data.last : [];
}

export async function pushConversationMessage(role, text) {
  const supabase = createArdisAdminClient();
  const history = await getConversationHistory();
  const next = [...history, { role, text, at: new Date().toISOString() }].slice(-MAX_HISTORY);
  await supabase.from('conversation').upsert({ id: 1, last: next });
  return next;
}
