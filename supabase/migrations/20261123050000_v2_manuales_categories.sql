-- Skylog V2.0 — Manuales: un documento puede cumplir VARIAS categorías a la vez (operacional, SMS, MCM/
-- mantenimiento, organización, SOP…) a pedido del usuario. Aditivo: se agrega `categories text[]` y se mantiene
-- `category` como la categoría PRINCIPAL (primera de la lista) para compatibilidad con lo que ya lee esa columna.
alter table manuales add column categories text[] not null default '{}';

-- Backfill: cada manual existente cumple al menos su categoría actual.
update manuales set categories = array[category] where cardinality(categories) = 0;
