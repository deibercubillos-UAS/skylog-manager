# Resultados de las pruebas completas (plan `72-plan-pruebas-completas.md`) — 2026-10-16

Ejecutor: Playwright con Chrome real contra `https://bitafly.com` (producción), cuentas QA, inicio de sesión por la pantalla de login.
Escritorio 1366×768 · celular Pixel 7 emulado (412×915, táctil) y barrido en 360 / 390 / 430. Leyenda: ✅ pasa · ❌ falla · ⬜ pendiente · ➖ no aplica.

## 1 · Hallazgos y su estado
| # | Sev. | Dónde | Qué pasaba | Estado |
|---|---|---|---|---|
| F-001 | Media | Pie de las páginas públicas | No enlazaba Aviso Legal, Privacidad, Cookies ni Términos | ✅ corregido `53fd1fa1` |
| F-002 | Media | `/api/duty/context` | Un 500 aislado (coincidió con un despliegue); no se reprodujo en 50 llamadas | ➖ vigilar |
| F-003 | **Alta** | Supabase (instancia; reiniciada y respondiendo 2026-10-16) | Latencia muy variable bajo carga ligera (login 0,4–45 s, 504/522; persona 0,2–17 s) y, al cierre de la prueba, **la base de datos no aceptaba conexiones** (`/api/health` > 60 s, login 522) con el estado público «operativo». Compatible con instancia sin holgura de CPU. | ⬜ decisión del usuario (tamaño de la instancia; plan vence 31-oct) |
| F-004 | Baja | `/sms/mapas` | Excepción del visor ArcGIS y 404 de una fuente | ⬜ |
| F-006 | Info | Mantenimiento | Tras «Registrar mantenimiento» no hay confirmación ni historial visible de los eventos | ⬜ mejora |
| F-007 | **Alta** | Selector de organización del encabezado | Cambiaba el título pero las 39 pantallas seguían cargando y **escribiendo en la primera organización** | ✅ `84217a0b` |
| F-008 | **Alta** | Programación de misiones | La hora escrita se guardaba como UTC: 09:30 quedaba 04:30 | ✅ `a8c9c1a1` (+ prueba de integración) |
| F-009 | Media | Reportes «Tiempos de servicio» y «Programación» | 500 (embeds sobre relaciones sin llave foránea) | ✅ `4289cc1e` (+ prueba) |
| F-010 | Media | Piloto independiente | Las pantallas sin permiso de ver se abrían con contenido si se escribía la dirección (solo se ocultaba el menú) | ✅ `9eb51be3` |
| F-011 | Baja | Bitácora, Organización | Textos internos «todavía no está construida en V2» | ✅ `2f74fc78` |
| F-012 | Baja | Capacitación | «Presentar examen» aparece aunque la evaluación no tenga preguntas (el mensaje es correcto) | ⬜ mejora |
| F-013 | **Alta** | Rendimiento de la API | (a) mi marca de «piloto independiente» añadió 2 consultas a cada petición (persona 110→500 ms); (b) `getUser()` llamaba al servidor de Auth en cada petición (`auth;dur=6328`) | ✅ `3af1b51d` y `55efab1e` |
| F-014 | Baja | Celular | Objetivos táctiles < 32 px: Baterías (21), Asistente SMS (21), Tripulación (20), Gobernanza (10), Perfil (9) | ⬜ mejora |
| F-015 | Baja | `/api/sms/*`, varias | Los listados devuelven 400 sin parámetros opcionales (esperado); sin 5xx en 88 rutas GET | ➖ |

## 2 · Fase A — Visitante ✅
28 páginas públicas + 9 de acceso/invitación/404 sin errores en 3 tamaños de celular y escritorio; cookies (aceptar/rechazar, sin terceros antes de aceptar); enlaces internos; login con contraseña errónea; registro sin enviar; 7 rutas protegidas → `/login?next=`; `/api/health`; 404 propia.

## 3 · Fase B — Gerente General
| Módulo | Resultado |
|---|---|
| Inicio, menú (4 grupos, 31 enlaces sin 404), buscador Ctrl+K, campana, menú de cuenta | ✅ |
| Bitácora: lista, filtro por piloto, Libro de vuelo, panel de importar, archivo inválido («No se pudo leer este log»), carga manual | ✅ |
| Programación: calendario, crear y cancelar misión | ✅ (tras F-008) |
| Despacho: asistente de punta a punta con el Piloto + cierre de vuelo + bitácora | ✅ |
| Aeronaves (editar), ficha técnica de modelo (34 campos), Baterías (crear/baja), Componentes (instalar/retirar), Mantenimiento (registrar), Existencias y ETA (crear → editar → eliminar) | ✅ (F-006) |
| Tripulación: agregar, editar, dar de baja, invitar por correo («Invitación enviada…») | ✅ |
| Pólizas, Proveedores, Manuales (PDF, acuse, seguimiento, eliminar), Listas de chequeo (crear/ver pasos/eliminar) | ✅ |
| SMS: objetivos, riesgos (peligro), cambios, GAP (abrir), asistente, reporte mensual; reporte de suceso del Piloto → caso del Gerente SMS (análisis, acción correctiva, en análisis) | ✅ |
| Capacitación: evaluación + pregunta + examen del Piloto + cumplimiento en Auditoría | ✅ |
| Retención/custodia (abrir), Organización (contacto, datos), Importar (plantilla + informe), Registro de acciones (filtro + CSV) | ✅ |
| Perfil, Suscripción (sin pagar), Reportes: 10 descargas PDF | ✅ tras F-009 (los dos fallidos ya generan) |

## 4 · Fase C — Roles (matriz `70-matriz-de-permisos.md`, por interfaz, 23 pantallas × rol)
| Rol | Discrepancias |
|---|---|
| Gerente General | 0 |
| Jefe de Pilotos | 0 (SMS y Organización solo lectura; sin «Abrir caso») |
| Gerente SMS | 0 |
| Piloto | 0 |
| Piloto independiente | 0 (tras F-007 y F-010) |
| Socio | ✅ panel `/socio` carga |
| Superadmin | ✅ el Gerente es redirigido fuera de `/admin` (el 2º factor no se prueba) |

## 5 · Fase D — Transversales
| Prueba | Resultado |
|---|---|
| Aislamiento: 17 endpoints con `organizationId` ajeno → sin fugas; crear en otra organización → 403 | ✅ |
| Sin conexión: pantalla de respaldo y caché `bitafly-pages-v3` | ✅ |
| Velocidad | ❌→⬜ ver F-003 (depende de la instancia, no del código) |

## 6 · Fase E — Celular
| Prueba | Resultado |
|---|---|
| E1 · Barrido de 39 páginas públicas × 360/390/430 y 44 pantallas del panel × 360/390/430 (+ Piloto en 390) | ✅ **0 desbordes horizontales, 0 excepciones** |
| E2 · Flujos de crear/editar/borrar en Pixel 7 (base recuperada tras reinicio) | ✅ Existencias y ETA, tripulación, pólizas, proveedores, manuales, listas, SMS (objetivos, riesgos, cambios), retención, organización, capacitación, bitácora, aeronaves, 10 reportes PDF, aislamiento y sin conexión pasan, sin respuestas ≥ 400 inesperadas. En celular el avatar abre `/perfil` (ahí está «Cerrar sesión») y la campana abre su panel. Las marcas ❌ del script (acciones del manual) eran selectores ambiguos, no de la app: el flujo equivalente pasa. |
| E3 · iPhone real (Appium) | ⬜ pendiente |
| E4 · Orientación horizontal | ⬜ pendiente |

## 7 · Datos de prueba que quedan en la organización QA
Mantenimiento: 4 eventos (no se pueden borrar: retención 5 años) · 2 vuelos y 1 despacho · 1 custodia legal sin liberar · 2 reportes SMS y 1 caso · 1 evaluación con 1 pregunta · 2 misiones (1 cancelada, 1 cerrada) · 1 batería de baja · 1 peligro · 1 acción correctiva. Todo con prefijo `PRUEBA-20261016`.

## 8 · Segunda pasada completa por perfil (2026-10-16, base ya recuperada)
Rastreo de 44 pantallas × 6 perfiles (Gerente, Jefe de Pilotos, Gerente SMS, Piloto, Piloto independiente, Socio) × escritorio y Pixel 7; matriz de permisos (23 pantallas por rol) y barrido de API.
| Prueba | Resultado |
|---|---|
| Carga de las 44 pantallas por perfil y dispositivo (12 combinaciones) | ✅ ninguna con 5xx; desbordes horizontales: **0** |
| Matriz de permisos (Gerente, Jefe, SMS, Piloto, Independiente) | ✅ 0 discrepancias de 23 en cada rol (una primera corrida mostró 1–2 por tiempos de carga y no se repitió) |
| Barrido de API (88 GET) | ✅ 0 respuestas 5xx, 0 lentas > 5 s |
| `/admin/*` para roles de organización | ✅ redirige a `/inicio` |

Observaciones nuevas (todas de baja gravedad):
| # | Dónde | Qué pasa | Estado |
|---|---|---|---|
| F-016 | Piloto e Independiente | Pantallas que sí pueden ver (Baterías, Asistente SMS, Gobernanza, Capacitación SMS, Organización) piden datos que su rol no puede leer (`/api/flota/components`, `/api/flota/roster`, `/api/organizacion*`) y reciben 403 en consola. No se ve en pantalla, pero son peticiones inútiles | ⬜ mejora: no pedirlos si el permiso es «ninguno» |
| F-017 | `/perfil`, `/suscripcion`, `/sms` | Cargas ocasionales de 9–18 s (Jefe de Pilotos, Piloto, Independiente); compatible con la latencia de la instancia (F-003) | ⬜ vigilar tras decidir el tamaño de la instancia |
| F-004 | `/sms/mapas` | Sigue la excepción del visor ArcGIS y el 404 de una fuente de letras (`static.arcgis.com`); en celular interrumpe la navegación del rastreo | ⬜ |

## 9 · Recorrido funcional cronometrado por perfil (2026-10-16, un perfil a la vez)
Escritorio 1366×768, Chrome real, login por pantalla. «Tiempo» = hasta que la pantalla termina de cargar datos (red en reposo y sin «Cargando»). Guía de uso: [`74-guia-paso-a-paso.md`](74-guia-paso-a-paso.md).
| Perfil | Pantallas | Mediana | Máx. | Redirigidas | Con errores ≥400 | Desborde |
|---|---|---|---|---|---|---|
| Gerente General | 37 | 1,5 s | 4,6 s (`/retencion`) | 0 | 0 | 0 |
| Jefe de Pilotos | 37 | 1,5 s | 15,6 s (`/perfil`) | 0 | 0 | 0 |
| Gerente SMS | 37 | 1,4 s | 3,8 s | 0 | 0 | 0 |
| Piloto | 37 | 1,4 s | 7,7 s (`/perfil`) | 0 | 5 (403 conocidos, F-016) | 0 |
| Piloto independiente | 37 | 1,5 s | 3,6 s | 0 | 5 (403 conocidos, F-016) | 0 |
| Socio | `/socio` | 4,5 s | — | 0 | 0 | 0 |

Botones principales verificados por pantalla en el Gerente (Nueva misión, Nueva aeronave, Agregar tripulante, Registrar mantenimiento, Nuevo objetivo, Evaluar, Marcar como enviado, Presentar examen, Cargar manual, Nueva custodia, Guardar datos, Pagar ahora…): todos presentes.

| # | Hallazgo | Estado |
|---|---|---|
| F-018 | ~~Primer inicio de sesión se cuelga > 45 s~~ **Corregido / era artefacto de la prueba:** el clic llegaba antes de que la página terminara de activarse y se perdía (el servicio de Auth respondía en 0,15–0,65 s). Ahora el botón queda deshabilitado hasta estar listo, el formulario nunca viaja por URL y el login tiene tiempo límite de 12 s con 3 reintentos. Login medido después: 1,8–4,6 s en los 6 perfiles, sin intentos fallidos. | ✅ `c445be57`, fix `82e4737f` en `main` |
| F-017 | `/perfil` 7,7–15,6 s en dos perfiles (el resto < 4,6 s) | ⬜ vigilar |
Con la instancia en reposo `/api/health` responde en 0,3–0,5 s.

### 9.1 · Segunda medición tras el despliegue (`main` 82e4737f)
| Perfil | Login | Mediana (antes → después) | `/perfil` (antes → después) |
|---|---|---|---|
| Gerente General | 1,8 s | 1,5 → 3,8 s | 2,1 → 4,5 s |
| Jefe de Pilotos | 4,0 s | 1,5 → 2,7 s | **15,6 → 1,6 s** |
| Gerente SMS | 4,6 s | 1,4 → 1,5 s | 2,0 → 2,2 s |
| Piloto | 2,1 s | 1,4 → 2,1 s | **7,7 → 5,3 s** |
| Piloto independiente | 3,4 s | 1,5 → 3,6 s | 2,1 → 10,5 s |
| Socio | 2,6 s | 4,5 → 2,9 s | — |
Lectura: el login quedó resuelto. Las pantallas muestran **variación fuerte entre corridas** (la misma pantalla pasa de 1,3 s a 8–24 s con `/api/health` sano a 0,5 s), lo que apunta a la instancia de Supabase (F-003), no al código; con esa variación no se puede atribuir mejora ni empeoramiento a `/api/perfil`. Se necesita decidir el tamaño de la instancia y volver a medir.
