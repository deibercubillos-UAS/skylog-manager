# Resultados de las pruebas completas (plan `72-plan-pruebas-completas.md`) — 2026-10-16

Ejecutor: Playwright con Chrome real contra `https://bitafly.com` (producción), cuentas QA, inicio de sesión por la pantalla de login.
Escritorio 1366×768 · celular Pixel 7 emulado (412×915, táctil) y barrido en 360 / 390 / 430. Leyenda: ✅ pasa · ❌ falla · ⬜ pendiente · ➖ no aplica.

## 1 · Hallazgos y su estado
| # | Sev. | Dónde | Qué pasaba | Estado |
|---|---|---|---|---|
| F-001 | Media | Pie de las páginas públicas | No enlazaba Aviso Legal, Privacidad, Cookies ni Términos | ✅ corregido `53fd1fa1` |
| F-002 | Media | `/api/duty/context` | Un 500 aislado (coincidió con un despliegue); no se reprodujo en 50 llamadas | ➖ vigilar |
| F-003 | **Alta** | Supabase (instancia) | Latencia muy variable bajo carga ligera (login 0,4–45 s, 504/522; persona 0,2–17 s) y, al cierre de la prueba, **la base de datos no aceptaba conexiones** (`/api/health` > 60 s, login 522) con el estado público «operativo». Compatible con instancia sin holgura de CPU. | ⬜ decisión del usuario (tamaño de la instancia; plan vence 31-oct) |
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
| E2 · Flujos de crear/editar/borrar en Pixel 7 | ⬜ **interrumpida**: la sesión caducó y el inicio de sesión dejó de responder (F-003); hay que repetirla cuando la base vuelva |
| E3 · iPhone real (Appium) | ⬜ pendiente |
| E4 · Orientación horizontal | ⬜ pendiente |

## 7 · Datos de prueba que quedan en la organización QA
Mantenimiento: 4 eventos (no se pueden borrar: retención 5 años) · 2 vuelos y 1 despacho · 1 custodia legal sin liberar · 2 reportes SMS y 1 caso · 1 evaluación con 1 pregunta · 2 misiones (1 cancelada, 1 cerrada) · 1 batería de baja · 1 peligro · 1 acción correctiva. Todo con prefijo `PRUEBA-20261016`.
