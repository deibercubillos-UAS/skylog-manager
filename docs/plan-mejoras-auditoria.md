# Plan de mejoras — Auditoría 2026-06-12

Resultado de la auditoría completa de código, funcionamiento y base de datos (Supabase).
Lo ya corregido está en `supabase/migrations/20260612_audit_fixes.sql` y en el commit
`fix(auditoría)` de esta rama. Este documento prioriza lo que queda.

---

## P0 — Crítico (privacidad / habeas data)

### 1. Bucket `documents` público con datos personales sensibles — ✅ RESUELTO (Fase G, 2026-06-12)

**Implementado**: bucket `documents` ahora privado. Acceso vía `GET /api/documents/open?path=`
(valida que el path pertenezca a la org → 302 a signed URL 1h). `FileUpload.js` guarda el
*path* del objeto; `lib/docUrl.js` (`docPath`/`docOpenUrl`) resuelve tanto paths nuevos como
URLs públicas legacy. Consumidores migrados: avatares (header, perfil, usuarios — de
`next/image` a `<img>`), links de documentos (EditPilotPanel, settings/profile) y el link
"VER DOCUMENTO" del PDF de expediente (reportGenerators, URL absoluta al endpoint). URLs
públicas en BD convertidas a paths y bucket marcado privado
(`supabase/migrations/20260612_documents_private.sql`). Verificado en prod: URL pública →
400 (origen), endpoint sin sesión → 401. ⚠️ Residual: el CDN puede servir copias cacheadas
de URLs exactas ya accedidas hasta que expira el TTL (~1h).

<details><summary>Plan original (referencia)</summary>

**Problema**: el bucket `documents` es público (31 archivos hoy: cédulas, certificados
médicos aeronáuticos, diplomas UAS en `{orgId}/crew/docs/*.pdf`). Cualquiera con la URL
descarga el documento sin autenticación. Las URLs públicas quedan persistidas en
`pilots.id_doc_url`, `medical_cert_url`, `pilot_course_url`, `theoretical_exam_url`,
`profiles.avatar_url`, etc. Expone datos personales sensibles (Ley 1581 / habeas data).

**Plan** (mismo patrón ya probado en `maintenance-docs` y `company-manuals`):
1. `FileUpload.js`: devolver el **path** del objeto en vez de `getPublicUrl()`.
2. Nuevo endpoint `GET /api/documents/signed-url?path=` con `getOrgContext()` +
   validación de que el path empieza por `{orgId}/` → signed URL 1h.
   (Los avatares pueden quedarse públicos en un bucket/carpeta aparte si se prefiere.)
3. Script de migración de datos: convertir las URLs públicas guardadas en `pilots`/
   `profiles` a paths (`.../object/public/documents/<path>` → `<path>`).
4. Actualizar consumidores (EditPilotPanel, settings/profile, reports dossier) para
   pedir la signed URL al abrir/descargar.
5. Marcar el bucket como privado (`update storage.buckets set public=false`) **al final**,
   cuando ya nada dependa de URLs públicas.

**Esfuerzo**: ~1 día. **Riesgo**: medio (tocar todos los consumidores); mitigable haciendo
el switch a privado como último paso reversible.

</details>

---

## P1 — Operación / configuración

2. **Habilitar `auth_leaked_password_protection`** en Supabase (único advisor de
   seguridad pendiente). 5 minutos, sin impacto en código.
3. **Env vars en Vercel**: `DJI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `AEROCIVIL_SALT`
   (el fallback ya fue removido; sin la variable el endpoint de credenciales falla).
4. **Limpieza de datos**: 1 perfil con `subscription_expires_at` vencido sin degradar,
   2 `pending_subscriptions` huérfanas y 1 `pending_registration` expirada — revisar
   desde `/admin/master`.

---

## P2 — Calidad de código

5. **Centralizar helpers duplicados** en `lib/formatters.js`:
   `fmtDate` (4 implementaciones: `manualActaPdf.js`, `manualGenerators.js`,
   `manual-operaciones/page.js`, `flightPlanDocs.js`), `fmtCOP` (3: `landing/Pricing.js`,
   `precios/PreciosClient.js`, `select-plan/page.js`) y el header PDF repetido
   (`reportGenerators.js` ×2, `manualActaPdf.js`, `flightPlanDocs.js`).
6. **Eliminar componentes huérfanos** (verificar que nadie los importa y borrar):
   `PilotCard`, `AddManualPilotPanel`, `EditAuthorizationPanel`, `EpaycoCheckout`,
   `InvitePilotPanel`, `LogbookImportPanel`, `MaintenanceDroneCard`, `Navbar`.
   ⚠️ CLAUDE.md aún referencia `AddManualPilotPanel` — actualizar al limpiar.
7. **Dependencias sin uso** en `package.json`: `@next/font` (deprecada, 0 imports),
   `zod` y `@hookform/resolvers` (0 imports — confirmar que no son para features en curso).
8. **Dividir archivos >800 líneas** (oportunista, al tocarlos): `AerocivilForm.js` (1495),
   `DjiRcSync.js` (1398), `vor-mor/page.js` (949), `subscription/page.js` (944),
   `admin/master/dev/page.js` (904), `admin/master/page.js` (832), `SoraWizard.js` (808),
   `registro/page.js` (801).
9. **Warnings ESLint** (6): deps faltantes en `useEffect`/`useCallback` en
   `dashboard/layout.js:179`, `logbook/page.js:107`, `FormSettingsClient.js:64`,
   `registro/page.js:99,121` y export anónimo en `landing/Illustrations.js:545`.
10. **Logs de producción**: 14 `console.log` en routes de ePayco/admin — son de
    auditoría legítima, pero conviene prefijo consistente (`[epayco]`, `[master]`) o
    un helper `lib/log.js` para filtrarlos en Vercel.

## P3 — Base de datos (observación, sin acción inmediata)

11. **Índices sin uso** (~70 avisos INFO del linter): normal con el tráfico actual;
    re-evaluar con tráfico real en 2-3 meses antes de borrar ninguno.
12. **Errores silenciados en callers** del patrón `r.ok ? r.json() : []`: ocultaron el
    bug de columnas inexistentes durante días. Considerar log en consola (o toast) en el
    `else` para no perder errores 500 de los GET internos.
