-- Skylog V2.0 — declaración expresa de mercancías peligrosas (MAUT-5.0-12-174, ítem 7): TODO explotador, incluso
-- el que no transporta, debe declarar si lo hace o no, coherente con sus OpSpecs. Vive junto a la certificación
-- (CDO-U/OpSpecs) porque es parte del mismo expediente. Lo demás del módulo (clasificación, NOTOC…) no se construye.
alter table organization_certifications
  add column dangerous_goods_declaration text check (dangerous_goods_declaration is null or dangerous_goods_declaration in ('no_transporta', 'transporta')),
  add column dangerous_goods_declared_at timestamptz,
  add column dangerous_goods_declared_by uuid references people(id) on delete set null,
  add column dangerous_goods_notes text;
