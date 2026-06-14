/**
 * Escapa caracteres HTML especiales en strings de usuario antes de
 * interpolarlos en templates de email. Previene XSS / email injection.
 *
 * @param {*} s — valor a escapar (se convierte a string si no lo es)
 * @returns {string}
 */
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL pública del logo de BitaFly (asset en /public/logo.png).
export function bitaflyLogoUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';
  return `${site.replace(/\/$/, '')}/logo.png`;
}

/**
 * Cabecera de correo con marca BitaFly y, opcionalmente, el logo del socio.
 * @param {object} [opts]
 * @param {string|null} [opts.partnerLogoUrl] — URL pública del logo del socio
 * @param {string|null} [opts.partnerName]    — nombre del socio (alt / fallback)
 * @returns {string} HTML de la fila <tr> de cabecera
 */
export function emailHeader({ partnerLogoUrl = null, partnerName = null } = {}) {
  const bitafly = bitaflyLogoUrl();
  const partnerImg = partnerLogoUrl
    ? `<img src="${escHtml(partnerLogoUrl)}" alt="${escHtml(partnerName || 'Socio')}" height="40" style="height:40px;max-width:160px;object-fit:contain;display:block;" />`
    : (partnerName ? `<span style="color:#fff;font-size:15px;font-weight:700;">${escHtml(partnerName)}</span>` : '');
  return `
    <tr><td style="background:#ec5b13;padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left" style="vertical-align:middle;">
          <img src="${bitafly}" alt="BitaFly" height="34" style="height:34px;display:block;" />
        </td>
        ${partnerImg ? `<td align="right" style="vertical-align:middle;background:rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;">${partnerImg}</td>` : ''}
      </tr></table>
    </td></tr>`;
}

// Pie de correo estándar.
export function emailFooter() {
  return `
    <tr><td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
      <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">BitaFly · bitafly.com</p>
    </td></tr>`;
}
