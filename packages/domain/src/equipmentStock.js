// equipmentStock — existencias de equipo de operación (chalecos, botiquín, extintor…): una fila por TIPO con su cantidad.
// Lógica pura de validación para que API y pruebas compartan la misma regla.

export const STOCK_CATEGORIES = ['Seguridad', 'Señalización', 'Comunicaciones', 'Energía', 'Herramientas', 'Otro'];

/** @returns {{ ok: boolean, errors: string[], clean: { name: string, category: string|null, quantity: number, notes: string|null } }} */
export function validateStockItem(input) {
  const errors = [];
  const name = String(input?.name ?? '').trim();
  const category = String(input?.category ?? '').trim();
  const notes = String(input?.notes ?? '').trim();
  const q = Number(input?.quantity ?? 0);
  if (!name) errors.push('Escribe el nombre del equipo.');
  if (name.length > 120) errors.push('El nombre es demasiado largo (máximo 120 caracteres).');
  if (!Number.isInteger(q) || q < 0) errors.push('La cantidad debe ser un número entero de 0 en adelante.');
  if (q > 1_000_000) errors.push('La cantidad es demasiado grande.');
  if (category && category.length > 60) errors.push('La categoría es demasiado larga.');
  return { ok: errors.length === 0, errors, clean: { name, category: category || null, quantity: Number.isInteger(q) ? q : 0, notes: notes.slice(0, 500) || null } };
}
