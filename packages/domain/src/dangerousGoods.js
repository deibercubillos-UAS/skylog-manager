// dangerousGoods — declaración expresa de mercancías peligrosas (MAUT-5.0-12-174, ítems 7 y 24). Todo explotador
// debe declarar si transporta o no, aunque no transporte, y capacitar a su personal en sus propias políticas.
// El resto del módulo (clasificación, marcas y etiquetas, NOTOC, diagramas) NO está construido: si la organización
// declara que transporta, la plataforma solo lo registra y lo avisa. Lógica pura, con tests (regla Q2).

export const DG_DECLARATIONS = [
  { key: 'no_transporta', label: 'No transporta mercancías peligrosas' },
  { key: 'transporta', label: 'Sí transporta mercancías peligrosas' },
];

export function validateDangerousGoodsDeclaration({ declaration, notes }) {
  const errors = [];
  if (!DG_DECLARATIONS.some((d) => d.key === declaration)) errors.push('Elige si la organización transporta o no mercancías peligrosas.');
  if (declaration === 'transporta' && !(notes || '').trim()) errors.push('Si transporta, describe qué se transporta y bajo qué procedimiento.');
  if ((notes || '').length > 1000) errors.push('Las observaciones son demasiado largas (máximo 1000 caracteres).');
  return { ok: errors.length === 0, errors };
}
