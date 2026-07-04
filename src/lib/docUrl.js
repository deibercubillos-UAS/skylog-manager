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

// Resuelve un logo guardado (path del bucket privado `documents`) a un data URL
// base64 embebible en PDFs generados client-side. jsPDF.addImage() no puede
// tomar una URL remota/ruta de storage directamente — necesita los bytes ya
// cargados — así que se descarga vía /api/documents/open y se convierte.
// Devuelve null si no hay logo o si la descarga/lectura falla (nunca lanza).
export async function fetchLogoDataUrl(stored) {
  const url = docOpenUrl(stored);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer el logo'));
      reader.readAsDataURL(blob);
    });
    const format = blob.type.includes('png')
      ? 'PNG'
      : (blob.type.includes('jpeg') || blob.type.includes('jpg')) ? 'JPEG' : 'PNG';
    // Dimensiones naturales del archivo — necesarias para dibujarlo en el PDF
    // sin deformar (jsPDF.addImage estira a los w/h exactos que se le pasen).
    const { width, height } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, format, width, height };
  } catch {
    return null;
  }
}
