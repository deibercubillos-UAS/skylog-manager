-- Proveedores: dirección, correo y teléfono (alimentan el Listado de Proveedores de Reportes).
-- Columnas nuevas y opcionales; RLS de la tabla no cambia.
alter table public.suppliers
  add column if not exists address text,
  add column if not exists email text,
  add column if not exists phone text;
