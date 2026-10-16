// Skylog V2.0 — tipo real de una imagen por sus primeros bytes (no por lo que diga el navegador). Para archivos que se
// publican en un bucket público: solo PNG, JPEG o WEBP. SVG queda fuera porque puede llevar scripts (auditoría 2026-10-16).
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export const imageExtension = (type) => EXT[type] || null;
