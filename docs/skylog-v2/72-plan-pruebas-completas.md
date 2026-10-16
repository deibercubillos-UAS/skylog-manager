# Plan de pruebas completas desde la página (web y celular) — 2026-10-15

**Objetivo:** recorrer **toda** la aplicación en producción (`https://bitafly.com`) con las cuentas QA, usando cada pantalla, botón y formulario,
primero en **navegador de escritorio** y luego en **celular (emulado)**, sin saltar ninguna verificación. Los resultados van en
[`73-resultados-pruebas.md`](73-resultados-pruebas.md); cada fila del plan tiene un estado (⬜ pendiente · ✅ pasa · ❌ falla · ➖ no aplica / no se prueba a propósito).

## 0 · Reglas de la prueba
1. **Solo la organización QA** («BitaFly QA - Organización de Prueba», id `be7bb786-…`). Nada en organizaciones reales.
2. **No se prueba:** pagos reales de Wompi, borrar cuentas reales, enviar correos a direcciones externas, ni el segundo factor del superadmin (requiere al usuario presente).
3. Lo que se **crea** se nombra con el prefijo `PRUEBA-AAAAMMDD` y se **borra al final** del mismo flujo cuando la pantalla lo permite.
4. Cada falla se anota con: pantalla, rol, pasos, esperado/obtenido, captura. Una falla **no detiene** el plan: se registra y se sigue; al final se corrige y se repite solo lo que falló.
5. Después de cada corrección publicada se espera a que el despliegue termine (≈1–2 min) antes de repetir.
6. La verificación de datos es doble: lo que se ve en pantalla **y** lo que devuelve la API (respuesta de red de la propia pantalla).

## 1 · Cuentas (contraseña común en `docs/plan-qa-completa-bitafly.md`)
| Cuenta | Rol | Cómo se usa |
|---|---|---|
| `qa.gerente@bitafly-test.local` | Gerente General | Recorrido completo y ciclo de crear/editar/borrar en cada módulo |
| `qa.jefepilotos@bitafly-test.local` | Jefe de Pilotos | Operación y flota sí; SMS, organización y roles solo lectura |
| `qa.sms@bitafly-test.local` | Gerente SMS | SMS sí; operación, flota, pólizas, importar y custodias solo lectura/ocultos |
| `qa.piloto@bitafly-test.local` | Piloto | Despacho, bitácora propia, examen; sin tripulación/componentes/organización |
| `qa.independiente@bitafly-test.local` | Piloto independiente | Flota y misiones propias; sin SMS, proveedores, manuales, reportes |
| `qa.socio@bitafly-test.local` | Socio | Panel `/socio` |
| (sin sesión) | Visitante | Sitio público, acceso, reporte público de sucesos |

## 2 · Herramientas
- **Escritorio:** Chrome real (1366×768) con Playwright; inicio de sesión por la **pantalla de login** (no por token), para probar también el acceso.
- **Celular:** (a) Chrome en modo Android (Pixel 7, 412×915, táctil, UA móvil); (b) Safari real en simulador de iPhone con Appium (`tools/mobile-sweep`).
- En cada pantalla se registran: errores de consola, excepciones de la página, peticiones ≥ 400 (distinguiendo las esperadas), desborde horizontal (celular), tiempo hasta contenido.

## 3 · Fases (en este orden; no se pasa a la siguiente sin cerrar la anterior)
### Fase A — Visitante (público) · 27 + 9 pantallas
| # | Prueba | Estado |
|---|---|---|
| A1 | Cada una de las 27 páginas públicas carga sin errores de consola ni peticiones fallidas (`/`, `/precios`, `/documentacion`, `/tutoriales`, `/blog` + artículo, `/casos` + caso, 12 páginas SEO, 4 comparativas, 4 legales) | ⬜ |
| A2 | Aviso de cookies: Aceptar y Rechazar; sin aceptar no se cargan terceros | ⬜ |
| A3 | Menú superior y desplegables, enlaces del pie, CTA «Empezar», cambio claro/oscuro si existe | ⬜ |
| A4 | `/login`: credenciales erróneas muestran error; «Olvidé mi contraseña» envía (pantalla), enlace a registro, botón Google presente | ⬜ |
| A5 | `/registro` (empresa y «unirme»): validaciones de campos y selector de rol, **sin enviar** | ⬜ |
| A6 | Rutas protegidas sin sesión llevan a `/login?next=…`; `/reportar/[token]` inválido muestra mensaje | ⬜ |
| A7 | `/api/health` 200; 404 propia del sitio | ⬜ |

### Fase B — Gerente General (recorrido y ciclo completo)
Para **cada** pantalla: carga con datos, estados vacíos si los hay, filtros/búsqueda, botones, formularios (válido e inválido), crear → editar → borrar, descargas.
| # | Módulo / pantalla | Qué se usa | Estado |
|---|---|---|---|
| B1 | Inicio `/inicio` | tarjetas, gráfica, alertas, recorrido de bienvenida, aviso de suscripción | ⬜ |
| B2 | Menú: grupos, orden, resaltado, barra superior, selector de organización, campana (abrir, marcar leída, descartar), buscador Ctrl+K, menú de cuenta | | ⬜ |
| B3 | Bitácora: vista Bitácora y Libro de vuelo, filtro por piloto/aeronave, replay GPS, importar log (archivo `.txt` de ejemplo), carga manual (crear → ver) | | ⬜ |
| B4 | Programación: calendario semana anterior/siguiente, crear misión (válida e inválida), editar, cancelar, importar KMZ | | ⬜ |
| B5 | Despacho: asistente completo de punta a punta (verificaciones, listas, riesgo) y cierre; historial de la organización | | ⬜ |
| B6 | Meteorología: búsqueda de ubicación, aptitud de vuelo | | ⬜ |
| B7 | Tiempo de servicio: iniciar/cerrar período, resumen de la empresa, filtro por piloto, certificar horas, excepción de descanso | | ⬜ |
| B8 | Aeronaves: crear (ficha de 26 atributos), editar, foto, documento de propiedad, modelos (crear/editar/precargar DJI), borrar | | ⬜ |
| B9 | Baterías y componentes: crear/editar/baja de batería; agregar/retirar/reemplazar componente | | ⬜ |
| B10 | Tripulación: agregar tripulante, editar perfil, cambiar rol (K5), invitar (a correo `@bitafly-test.local`), cancelar invitación, dar de baja | | ⬜ |
| B11 | Mantenimiento: evento, programa, tarea, documento adjunto | | ⬜ |
| B12 | Existencias de equipo y ETA: crear → editar → borrar | | ⬜ |
| B13 | SMS: objetivos, riesgos (matriz, peligros, evaluación, barreras), cambios, indicadores (catálogo oficial, captura mensual, planes, envío), mejora continua (GAP), reporte mensual, reportes y casos (abrir caso, acciones, analizar), asistente de implantación, mapas, gobernanza, MSMS, capacitación SMS | | ⬜ |
| B14 | Capacitación: evaluación (crear, preguntas, material), presentar examen, cumplimiento | | ⬜ |
| B15 | Listas de chequeo, Proveedores (+auditoría), Pólizas (+certificado), Manuales (+versión, acuse) | | ⬜ |
| B16 | Reportes: generar cada PDF/Excel del catálogo (descarga válida), formatos (código y versión) | | ⬜ |
| B17 | Retención y custodia: abrir custodia, agregar vuelos, liberar | | ⬜ |
| B18 | Organización: datos, logo, contactos de emergencia, certificación Aerocivil, designaciones, mercancías peligrosas, miembros; Importar desde Excel (plantilla + carga de prueba); Registro de acciones (filtros, exportar) | | ⬜ |
| B19 | Suscripción: plan, uso, historial (sin pagar); Perfil: datos, documentos, descargar mis datos (sin eliminar la cuenta) | | ⬜ |
| B20 | Cerrar sesión; sesión caducada; volver con «atrás» no muestra datos | | ⬜ |

### Fase C — Roles restringidos (matriz `70-matriz-de-permisos.md`)
Por cada rol: (1) menú que ve, (2) cada pantalla: ve/no ve, (3) cada acción de escritura: debe aparecer/estar oculta **y** la API debe responder 403 si se fuerza.
| # | Rol | Qué se comprueba | Estado |
|---|---|---|---|
| C1 | Jefe de Pilotos | escribe en operación y flota; SMS en solo lectura; no cambia roles; no gestiona enlace público de reportes; sí firma mercancías peligrosas | ⬜ |
| C2 | Gerente SMS | escribe en SMS; solo ve operación/flota/pólizas/organización; sin importar, registro de acciones ni custodias; no invita | ⬜ |
| C3 | Piloto | despacha y cierra sus vuelos, importa logs, examen; no ve tripulación, componentes, organización; sin carga manual | ⬜ |
| C4 | Piloto independiente | su flota y misiones; sin SMS, capacitación, proveedores, manuales, reportes, importación | ⬜ |
| C5 | Socio | `/socio`: panel, regalos, asesores, reportes (sin enviar correos reales) | ⬜ |
| C6 | Superadmin | `/admin/*` redirige a verificación sin segundo factor (se comprueba la redirección; el resto lo hace el usuario) | ⬜ |

### Fase D — Transversales
| # | Prueba | Estado |
|---|---|---|
| D1 | Aislamiento: una cuenta no ve datos de otra organización (URL con `organizationId` ajeno → 403/400) | ⬜ |
| D2 | Sin conexión: pantalla de respaldo y copia de páginas (service worker) | ⬜ |
| D3 | Velocidad: carga de cada pantalla < 4 s (3G rápido) y sin saltos de diseño | ⬜ |
| D4 | Accesibilidad básica: foco visible, etiquetas en formularios, contraste (Lighthouse) en las 10 pantallas principales | ⬜ |

### Fase E — Celular
Se repite A, B y C completas en **Pixel 7 emulado (Chrome)**, y las pantallas críticas (login, inicio, bitácora, programación, despacho, flota, tripulación, SMS riesgos, examen, perfil) en **iPhone (Safari real)**.
Criterios por pantalla: sin desplazamiento horizontal, botones ≥ 44 px, formulario usable con teclado, paneles se cierran, menú lateral/barra inferior no tapan botones, orientación horizontal en despacho/replay/mapas.
| # | Prueba | Estado |
|---|---|---|
| E1 | Barrido automático de las ~84 pantallas × 3 tamaños (360, 390, 430) | ⬜ |
| E2 | Flujos de A/B/C en Pixel 7 emulado | ⬜ |
| E3 | Pantallas críticas en iPhone real (Appium) | ⬜ |
| E4 | Orientación horizontal: despacho, replay, mapas | ⬜ |

## 4 · Cierre
- Informe en `73-resultados-pruebas.md` con tabla de fallas, severidad y estado de corrección.
- Cada falla corregida se vuelve a probar en el mismo rol y el mismo dispositivo.
- Datos de prueba creados: se borran; lo que quede se lista.
