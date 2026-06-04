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
