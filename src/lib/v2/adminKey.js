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

// Almacenamiento (Cloudflare R2): mismo problema que la llave de servicio — `vercel env pull` NO baja las
// variables sensibles, así que en local las credenciales de R2 faltan y TODA subida de archivos falla
// (pólizas, evidencias de reportes, documentos). Devuelve un mensaje accionable o null.
export function storageProblem() {
  const missing = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter((k) => !process.env[k] || /sensitive/i.test(process.env[k]));
  if (missing.length === 0) return null;
  return `Falta configurar el almacenamiento de archivos (${missing.join(', ')}). Agrégalas a .env.development.local con las credenciales de Cloudflare R2 y reinicia el servidor.`;
}
