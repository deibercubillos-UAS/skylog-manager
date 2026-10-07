// Skylog V2.0 — publicación de versiones del APK (actualización OTA). Lógica compartida por la ruta con llave de
// administración (`/api/app/releases`) y por la pantalla del superadmin (`/api/admin/releases`).
export async function listReleases(admin) {
  const { data, error } = await admin.from('app_releases').select('*').order('version_code', { ascending: false });
  if (error) return { status: 500, json: { error: error.message } };
  return { status: 200, json: { releases: data || [] } };
}

/** Publica una versión y la deja como vigente. La app compara `version_code`: una menor o igual nunca se ofrecería. */
export async function publishRelease(admin, { versionName, versionCode, apkUrl, releaseNotes, forceUpdate }) {
  const code = Number(versionCode);
  if (!String(versionName || '').trim() || !Number.isInteger(code) || code <= 0 || !String(apkUrl || '').trim()) {
    return { status: 400, json: { error: 'versionName, versionCode (entero positivo) y apkUrl son requeridos' } };
  }
  if (!/^https:\/\//.test(String(apkUrl).trim())) return { status: 400, json: { error: 'apkUrl debe ser una URL https' } };

  const { data: current } = await admin.from('app_releases').select('version_code').eq('is_current', true).order('version_code', { ascending: false }).limit(1).maybeSingle();
  if (current && code <= current.version_code) {
    return { status: 409, json: { error: `versionCode debe ser mayor que el vigente (${current.version_code})` } };
  }
  await admin.from('app_releases').update({ is_current: false }).eq('is_current', true);
  const { data, error } = await admin
    .from('app_releases')
    .insert({ version_name: String(versionName).trim(), version_code: code, apk_url: String(apkUrl).trim(), release_notes: String(releaseNotes || '').trim() || null, force_update: !!forceUpdate, is_current: true })
    .select()
    .single();
  if (error) return { status: 500, json: { error: error.message } };
  return { status: 200, json: { release: data } };
}
