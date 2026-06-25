-- Fase C — Documento PDF de recibo / puesta en servicio (opcional, en Cloudflare R2)
--
-- Campo dedicado, separado del `attachment_path` genérico. Solo guarda el PATH del
-- objeto en el bucket privado R2 `maintenance-docs`; nunca URL pública.
ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS return_doc_path text;
