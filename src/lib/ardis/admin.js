import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Cliente admin confinado al schema "ardis". Usa su propia copia de la
// service_role (ARDIS_SUPABASE_SERVICE_KEY) — nunca la SUPABASE_SERVICE_ROLE_KEY
// de Bitafly — y fuerza db.schema para que sea imposible tocar "public" o "auth"
// desde este cliente, aunque el código que lo llame se equivoque de tabla.
export function createArdisAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.ARDIS_SUPABASE_SERVICE_KEY,
    { db: { schema: 'ardis' } }
  );
}
