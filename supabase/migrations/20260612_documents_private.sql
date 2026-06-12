-- Fase G — Bucket `documents` privado (cierra el P0 de habeas data)
-- El bucket contenía cédulas/certificados médicos/diplomas accesibles
-- públicamente sin autenticación. Se convierte a privado y los valores
-- almacenados (URLs públicas) se normalizan a paths del objeto.
-- El acceso pasa por GET /api/documents/open?path= → signed URL 1h.
--
-- NOTA: el código en producción (lib/docUrl.js + consumidores) ya resuelve
-- tanto paths nuevos como URLs públicas legacy, así que esta migración debe
-- aplicarse DESPUÉS de desplegar el frontend para evitar romper el render.

-- URLs públicas guardadas → paths del objeto dentro del bucket documents
UPDATE public.pilots SET
  id_doc_url           = regexp_replace(id_doc_url,           '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  medical_cert_url     = regexp_replace(medical_cert_url,     '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  pilot_course_url     = regexp_replace(pilot_course_url,     '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  theoretical_exam_url = regexp_replace(theoretical_exam_url, '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  certificate_url      = regexp_replace(certificate_url,      '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  medical_url          = regexp_replace(medical_url,          '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1'),
  avatar_url           = regexp_replace(avatar_url,           '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1')
WHERE id_doc_url LIKE 'http%' OR medical_cert_url LIKE 'http%' OR pilot_course_url LIKE 'http%'
   OR theoretical_exam_url LIKE 'http%' OR certificate_url LIKE 'http%' OR medical_url LIKE 'http%' OR avatar_url LIKE 'http%';

UPDATE public.profiles SET
  avatar_url = regexp_replace(avatar_url, '^.*/object/(?:public|sign)/documents/([^?]+).*$', '\1')
WHERE avatar_url LIKE 'http%';

-- Hacer privado el bucket (el acceso ahora es solo vía signed URL)
UPDATE storage.buckets SET public = false WHERE id = 'documents';
