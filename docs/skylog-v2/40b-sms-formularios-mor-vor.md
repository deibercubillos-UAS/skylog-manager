# 40b — SMS · Formularios MOR/VOR configurables + enlaces por tipo

Plan por fases para personalizar, **de forma independiente**, el listado de campos del formulario **MOR** y del
**VOR**, y dar **un enlace público por cada tipo**. A pedido del usuario (2026-11-23): *"personalizar el listado
del formulario MOR y el formulario VOR (de forma independiente), y a partir de ahí dar los links"*.

Decisiones del usuario (AskUserQuestion, 2026-11-23):
- **Campos: ambas** — configurar los campos estándar (ocultar/obligatorio/orden/etiqueta) **y** agregar preguntas
  propias de la organización (texto, lista, fecha, número, sí/no), distinto para MOR y para VOR.
- **Enlaces: dos públicos (MOR y VOR)** — el enlace por el que entra define el tipo. Cambia la regla actual, en
  la que el tipo se derivaba por severidad + rol de quien reporta.

## Estado de partida (hoy en v2)

- Reporte = tabla `sms_reports`; los campos del formulario están **fijos en código** (evento, severidad, fecha,
  lugar, aeronave/vuelo, descripción, confidencial). No hay formularios configurables (`vor_mor_definitions` y
  `form_definitions` quedaron en el esquema `legacy_v1`, congeladas; no se usan).
- Ruta MOR/VOR/RAC 114 **derivada** en el servidor (`classifyReportRoute`, `smsReporting.js`): grave/accidente →
  `rac114`; reportado por el Gerente SMS → `mor` (exige análisis previo); cualquier otro → `vor`.
- **Un** enlace público por organización (`organizations.sms_public_token`, `/reportar/{token}`), que **siempre**
  crea un VOR (un tercero nunca radica un MOR, §2.1).

## Decisiones de diseño (puntos que la pregunta dejó abiertos — defaults a confirmar)

1. **Suceso grave por cualquier enlace** → sigue bifurcando a `rac114` (seguridad), aunque el enlace sea el de
   MOR o el de VOR. El enlace solo elige entre `mor` y `vor` cuando la severidad es `incidente`.
2. **MOR público conserva la compuerta de análisis**: un MOR que entra por el enlace MOR queda con
   `requires_manager_analysis = true` → el Gerente SMS debe analizarlo antes de radicarlo (no se salta §2.1).
3. **Quién configura y gestiona enlaces:** el Gerente SMS (y superadmin). Matriz: nuevos códigos
   **U11** (configurar el formulario) y **U12** (gestionar los enlaces públicos por tipo); `U9` (enlace público
   único) se reemplaza por U12. Niveles `SNNSNN` (solo GSMS + SA), salvo que se decida incluir al GG.
4. **La norma manda sobre la personalización:** los campos regulatorios mínimos (descripción, severidad, fecha
   de ocurrencia) no se pueden ocultar ni volver opcionales — se marcan como *bloqueados* en el configurador.

## Modelo de datos (Fase 0)

- `sms_report_form_fields` — definición del formulario por organización y tipo:
  `id, organization_id, report_type ('mor'|'vor'), kind ('standard'|'custom'), field_key (estándar) | null,
  label, input_type ('text'|'textarea'|'select'|'date'|'number'|'boolean'), options jsonb (para select),
  required bool, visible bool, locked bool (regulatorio, no editable), sort_order int, created_at, updated_at`.
  `unique (organization_id, report_type, field_key)` para los estándar; los propios usan `id`.
- `sms_reports.custom_fields jsonb not null default '{}'` — respuestas a las preguntas propias
  (`{ field_id: valor }`). Los campos estándar siguen en sus columnas actuales.
- Enlaces por tipo: tabla `sms_report_public_links` `(organization_id, report_type, token unique, enabled,
  created_at)` — reemplaza el `organizations.sms_public_token` único (se migra el token actual al de VOR).
- RLS: definición y enlaces los ve/edita solo el Gerente SMS (helper existente `v2_has_org_role`/rol nominal en
  la API); **cada tabla nueva con `organization_id` + RLS + permisiva v2 de escritura** (no repetir el fallo de
  `safety_indicators`, ver `[[rls-politicas-legacy-all]]`). Lectura del formulario para el endpoint público: con
  service role, nunca con RLS de usuario.
- Catálogo de campos estándar por defecto (dominio): se siembra la definición de un tipo la primera vez que se
  abre su configurador (o al vuelo si no existe fila), con `locked` en los mínimos regulatorios.

## Fases (cada una con su puerta de verificación)

- **F0 — Esquema.** Migraciones de las 3 piezas (tablas + `custom_fields` + enlaces por tipo), RLS y políticas,
  migrar el token público actual a `report_type='vor'`. Verif.: `list_tables`, políticas, `get_advisors`.
- **F1 — Dominio.** Catálogo de campos estándar (clave, etiqueta, tipo, `locked`), `defaultFormFields(type)`,
  `validateSubmission(definition, payload)` (visible/obligatorio/tipos/opciones), reglas de ruta con tipo por
  enlace (grave→rac114; MOR→análisis). Pruebas (`test:domain`).
- **F2 — API + UI de configuración de campos (GSMS/GG).** `GET/PUT /api/sms/report-forms?type=` (definición por
  tipo: reordenar, ocultar, obligatorio, etiqueta, agregar/quitar preguntas propias) y pantalla en
  `/sms/reportes`: dos pestañas (MOR/VOR) con el configurador. **Hecho.** La gestión de enlaces se movió a la
  F4 (un enlace sin su página pública no sirve; partirlo dejaría un enlace MOR muerto). Escritura ampliada a
  `admin` (GG) además de `gerente_sms`/`superadmin` para no quitarle al GG lo que ya hacía con el enlace VOR.
  Verif.: lint/build; 8 políticas confirmadas.
- **F3 — Formulario interno dinámico. Hecho.** `_ReportForm` carga la definición del tipo (mor si quien reporta
  es el Gerente SMS, vor en otro caso; en edición, el tipo del reporte), oculta los campos no visibles, usa sus
  etiquetas, marca los obligatorios y renderiza las preguntas propias. `POST`/`PATCH /api/sms/reports` validan
  contra la definición (`validateReportFormSubmission`) y guardan `custom_fields`. Compatible hacia atrás: sin
  filas de definición se usa el catálogo estándar. El orden nativo del formulario interno se conserva (el orden
  configurable lo honra el formulario público genérico en F4). Verif.: lint, build, test:domain 717/717.
- **F4 — Enlaces por tipo + formularios públicos. Hecho.** API `/api/sms/public-links` por tipo
  (activar/regenerar/desactivar) y su sección `_PublicLinks` en `/sms/reportes`; `/reportar/{token}` resuelve el
  tipo por el token (tabla `sms_report_public_links`), renderiza la definición de ese tipo en orden (estándar
  visibles + propias, sin aeronave/vuelo) y envía con ese tipo; `routeForPublicLink`: grave→RAC 114 por
  cualquier enlace, MOR público conserva la compuerta de análisis (`requires_manager_analysis`). Se retiró el
  enlace único: borrados `_PublicLink.js` y `/api/sms/public-link`; el endpoint público ya no lee
  `organizations.sms_public_token` (la columna queda, sin uso; los 3 tokens VOR ya estaban migrados, 0 sin
  migrar). Verif.: lint, build, test:domain 717/717; migración de tokens confirmada.
  QR: pendiente (el enlace se copia; generar la imagen QR requeriría una dependencia).
- **F5 — Docs + despliegue.** Matriz (U11/U12, reemplazo de U9), `70`, `00-INDICE`, bitácora; `lint`+`build`+
  `test:domain`; `git push origin main`; verificación en vivo.

## Riesgos / notas

- Cambiar a "el enlace define el tipo" **abre la vía a un MOR reportado por un tercero**, que la norma reserva a
  la organización. Se mitiga con la compuerta de análisis (punto 2), pero conviene que el usuario lo tenga claro.
- Reportes ya existentes: `custom_fields` por defecto `{}`; la definición no afecta lo ya guardado.
- Los PDFs/listados de reportes deben tolerar `custom_fields` (mostrarlos si existen, sin romper lo viejo).
