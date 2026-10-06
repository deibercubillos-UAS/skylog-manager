// Skylog V2.0 — diagnóstico de la llave de servicio (service role).
// El Despacho escribe su constancia con service role (ver api/despacho/route.js): sin una llave
// REAL falla, y el síntoma —un 500 genérico— no dice por qué. Caso típico: `vercel env pull` NO
// descarga las variables marcadas como sensibles y deja en su lugar el texto "[SENSITIVE]" en
// .env.local; el servidor local arranca "bien" pero toda escritura con service role es rechazada
// ("Invalid API key"). Aquí se detecta ese caso y se devuelve un mensaje accionable.
//
// Nunca devuelve ni registra la llave: solo si falta, es un marcador o no parece una llave.
export function adminKeyProblem() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return 'Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor. Agrégala (service_role key del proyecto Supabase de la rama) y reinicia.';
  }
  if (key.length < 30 || /^\[?\s*sensitive\s*\]?$/i.test(key.trim())) {
    return 'SUPABASE_SERVICE_ROLE_KEY es un marcador (p. ej. "[SENSITIVE]" que deja `vercel env pull`), no una llave real. Copia la service_role key del proyecto Supabase de la rama develop-v2 en .env.local y reinicia el servidor.';
  }
  return null;
}
