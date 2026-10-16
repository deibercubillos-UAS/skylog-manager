# Resultados de las pruebas completas (plan `72-plan-pruebas-completas.md`) — en curso, 2026-10-15

Ejecutor: Playwright con Chrome real contra `https://bitafly.com`, cuentas QA, inicio de sesión por la pantalla de login.

## Hallazgos (orden de aparición)
| # | Sev. | Dónde | Qué pasa | Estado |
|---|---|---|---|---|
| F-001 | Media | Pie de las páginas públicas (`PublicFooter`) | No enlazaba Aviso Legal, Privacidad, Cookies ni Términos (solo el aviso de cookies enlazaba Cookies) | ✅ corregido (`53fd1fa1`) |
| F-002 | Media | `/api/duty/context` | 1 respuesta 500 en ~45 cargas (coincidió con un despliegue); no se reprodujo en 50 llamadas seguidas | ➖ no reproducible, vigilar |
| F-003 | **Alta** | Supabase Auth y API en producción | La latencia es muy variable bajo carga ligera (≈3 peticiones/s): el inicio de sesión tarda 0,4 s a 28 s y una vez respondió 504 tras 45 s; en pantallas, las llamadas de datos quedaron sin respuesta >10 s y la pantalla se queda en «Cargando…» (cabecera «Individual», sin nombre). Compatible con una instancia pequeña sin holgura de CPU. | ⬜ decisión del usuario (tamaño de instancia, vence el plan el 31-oct) |
| F-004 | Baja | `/sms/mapas` | Excepción de página `view:goto-interrupted` del visor ArcGIS y 404 de una fuente (`tahoma-regular`) | ⬜ |
| F-005 | Info | `/api/socio/me` | 403 para quien no es socio (esperado); el menú no lo enlaza | ➖ |

## Fase A — Visitante
| Prueba | Resultado |
|---|---|
| A1 · 28 páginas públicas + 9 de acceso/invitación/404 | ✅ todas 200 sin errores de consola (404 y tokens falsos con su error esperado); artículo de blog y caso cargan |
| A2 · cookies | ✅ aparece, Rechazar y Aceptar guardan la elección; sin aceptar no hay terceros (0), al aceptar se cargan (8) |
| A3 · menú y enlaces | ✅ 15 enlaces de la portada sin rotos · ❌→✅ F-001 pie legal |
| A4 · login | ✅ contraseña errónea avisa; enlaces a registro/olvidé contraseña/Google; reset-password con correo |
| A5 · registro | ✅ carga con «Registrar mi empresa / Unirme a una empresa»; enviar vacío no avanza |
| A6 · protegidas | ✅ 7 rutas sin sesión → `/login?next=…`; `/reportar/token-falso` muestra «Este enlace de reporte no está disponible» |
| A7 · salud y 404 | ✅ |

## Fase B/C/D/E — (se completa al terminar cada una)
