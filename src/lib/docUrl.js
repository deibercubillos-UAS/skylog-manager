// Resuelve el valor almacenado de un documento (path nuevo dentro del bucket
// privado `documents`, o URL pública/firmada legacy) a una ruta de apertura
// segura `/api/documents/open?path=...` que redirige a una signed URL fresca.

// Extrae el path dentro del bucket `documents` desde un valor almacenado.
// Acepta: path relativo (`{orgId}/crew/docs/x.pdf`) o URL completa
// (`.../object/public/documents/<path>` o `.../object/sign/documents/<path>?token=`).
export function docPath(stored) {
  if (!stored) return null;
  const s = String(stored).trim();
  if (!s) return null;
  const m = s.match(/\/object\/(?:public|sign)\/documents\/(.+?)(?:\?|$)/);
  if (m) return decodeURIComponent(m[1]);
  return s.replace(/^\/+/, '');
}

// Construye la URL de apertura segura para usar en href/src/links de PDF.
export function docOpenUrl(stored) {
  const p = docPath(stored);
  return p ? `/api/documents/open?path=${encodeURIComponent(p)}` : null;
}
