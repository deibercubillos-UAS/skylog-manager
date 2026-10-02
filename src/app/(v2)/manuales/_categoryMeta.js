// Skylog V2.0 — Manuales: metadata visual por categoría, compartida entre
// page.js y los 2 paneles — un ícono/color por categoría en vez del chip de
// texto plano que tenía la primera versión (pedido del usuario: "se ve
// plana y poco UX/UI").
export const CATEGORIES = [
  { value: 'MO', label: 'Manual de Operaciones (MO)', icon: 'menu_book', tile: 'bg-primary text-white', wash: 'from-primary-50 to-white', dot: 'bg-primary' },
  { value: 'SMS', label: 'SMS', icon: 'health_and_safety', tile: 'bg-red-500 text-white', wash: 'from-red-50 to-white', dot: 'bg-red-500' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', icon: 'build', tile: 'bg-amber-500 text-white', wash: 'from-amber-50 to-white', dot: 'bg-amber-500' },
  { value: 'ORGANIZACION', label: 'Organización', icon: 'apartment', tile: 'bg-violet-500 text-white', wash: 'from-violet-50 to-white', dot: 'bg-violet-500' },
  { value: 'SOP', label: 'SOP', icon: 'checklist', tile: 'bg-blue-500 text-white', wash: 'from-blue-50 to-white', dot: 'bg-blue-500' },
  { value: 'OTRO', label: 'Otro', icon: 'folder', tile: 'bg-navy text-white', wash: 'from-navy-50 to-white', dot: 'bg-navy-400' },
];

export const CATEGORY_META = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
