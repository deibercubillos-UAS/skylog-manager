/**
 * toast.js — Sistema de notificaciones global (sin React context)
 * Uso: import { toast } from '@/lib/toast'
 *      toast.success('Guardado') | toast.error('Error') | toast.warn('Aviso') | toast.info('Info')
 */

const TYPES = {
  success: { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a', icon: 'check_circle' },
  error:   { bg: '#fef2f2', border: '#fca5a5', accent: '#dc2626', icon: 'error' },
  warn:    { bg: '#fffbeb', border: '#fcd34d', accent: '#d97706', icon: 'warning' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb', icon: 'info' },
};

// Limpia emojis de cabecera que se usaban con alert() nativo
const strip = (msg) =>
  String(msg)
    .replace(/^[✅⚠️🚀🚫❌ℹ️✓✕⚠]+\s*/u, '')
    .replace(/^✅|⚠️|\u{1F680}|\u{1F6AB}|❌/u, '')
    .trim() || String(msg);

function getContainer() {
  if (typeof window === 'undefined') return null;
  let el = document.getElementById('__toasts');
  if (!el) {
    el = document.createElement('div');
    el.id = '__toasts';
    // Mobile: sobre la barra inferior (pb-20); Desktop: esquina inferior derecha
    el.style.cssText = [
      'position:fixed',
      'bottom:5.5rem',       // Por encima del bottom nav mobile
      'right:1rem',
      'left:1rem',
      'display:flex',
      'flex-direction:column-reverse',
      'align-items:flex-end',
      'gap:.5rem',
      'z-index:9999',
      'pointer-events:none',
    ].join(';');

    // En pantallas ≥ 640px: ancho fijo, pegado a la derecha
    const s = document.createElement('style');
    s.textContent = '@media(min-width:640px){#__toasts{left:auto;width:360px;bottom:1.5rem;}}';
    document.head.appendChild(s);
    document.body.appendChild(el);
  }
  return el;
}

function show(message, type = 'info', duration = 4200) {
  const container = getContainer();
  if (!container) return;
  const t = TYPES[type] || TYPES.info;

  const el = document.createElement('div');
  el.style.cssText = [
    'display:flex', 'align-items:flex-start', 'gap:.625rem',
    `background:${t.bg}`,
    `border:1.5px solid ${t.border}`,
    `border-left:4px solid ${t.accent}`,
    'padding:.75rem 1rem',
    'border-radius:.875rem',
    'box-shadow:0 4px 24px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06)',
    'font-family:inherit', 'font-size:.75rem', 'font-weight:700',
    'color:#1a202c', 'line-height:1.45',
    'width:100%', 'pointer-events:auto',
    'opacity:0', 'transform:translateX(12px)',
    'transition:opacity .22s ease,transform .22s ease',
  ].join(';');

  // Ícono Material Symbol (la fuente ya está cargada globalmente)
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.style.cssText = `font-size:1.1rem;color:${t.accent};flex-shrink:0;margin-top:1px;`;
  icon.textContent = t.icon;

  const text = document.createElement('span');
  text.style.flex = '1';
  text.textContent = strip(message);

  const btn = document.createElement('button');
  btn.style.cssText = [
    'background:none', 'border:none', 'cursor:pointer',
    `color:${t.accent}`, 'opacity:.5', 'padding:0',
    'font-size:.7rem', 'font-weight:900', 'line-height:1',
    'flex-shrink:0', 'margin-top:2px', 'pointer-events:auto',
  ].join(';');
  btn.textContent = '✕';
  btn.onclick = () => dismiss(el);

  el.appendChild(icon);
  el.appendChild(text);
  el.appendChild(btn);
  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  el._timer = setTimeout(() => dismiss(el), duration);
}

function dismiss(el) {
  if (!el) return;
  clearTimeout(el._timer);
  el.style.opacity = '0';
  el.style.transform = 'translateX(8px)';
  setTimeout(() => el?.remove(), 230);
}

export const toast = {
  success: (m, d) => show(m, 'success', d),
  error:   (m, d) => show(m, 'error',   d),
  warn:    (m, d) => show(m, 'warn',    d),
  info:    (m, d) => show(m, 'info',    d),
};
