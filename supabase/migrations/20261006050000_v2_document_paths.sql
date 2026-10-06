-- Skylog V2.0 — adjuntos que faltaban: acta y hoja de vida de una designación (RAC 100 §100.535(14)(15)(16),
-- MAUT-5.0-22-011) y autorización de la ANE de un modelo de UAS (banda licenciada, Apéndice 1 Parte B).
-- Mismo patrón que pólizas/propiedad: la ruta del archivo en la propia fila (bucket privado `documents`).
alter table designations add column act_document_path text, add column resume_document_path text;
alter table aircraft_models add column ane_authorization_path text;
