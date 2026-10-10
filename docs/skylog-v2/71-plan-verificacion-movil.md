# Plan de verificación en celular — todas las páginas en línea

**Objetivo:** confirmar que cada página de `bitafly.com` se ve y se puede usar bien en un celular, desde la página principal hasta
el último rincón del panel interno, con cada rol que lo usa.
**Alcance:** las 84 pantallas de la aplicación (79 distintas más las plantillas de blog y casos). **Fuera de alcance:** la app
nativa Android (carga el mismo sitio, se prueba aparte en la fase 6) y el rendimiento del servidor.

## 1 · Cómo se prueba (cuatro capas)
| Capa | Qué detecta | Quién |
|---|---|---|
| **A. Barrido automático** (navegador con tamaño y táctil de celular) | desbordes horizontales, elementos más anchos que la pantalla, botones menores de 44 px, errores de consola, peticiones fallidas, texto cortado | yo (script) |
| **B. Revisión visual de capturas** | alineación, jerarquía, textos montados, tablas, botones tapados, tema claro/oscuro | yo, con tu visto bueno |
| **C. Lighthouse móvil** (conexión lenta 4G) | velocidad, estabilidad visual, accesibilidad, tamaño de texto | yo |
| **D. Dispositivos reales** | teclado que tapa campos, barra del navegador, zona segura (muesca), gestos, cámara/archivos | tú, 15 minutos con la lista de la fase 6 |

**Tamaños:** 360×740 (Android pequeño), 390×844 (iPhone estándar), 430×932 (iPhone grande) y 768×1024 (tableta, solo las pantallas
con tablas o calendarios). **Temas:** claro y oscuro en las pantallas principales. **Orientación horizontal:** solo despacho, replay y mapas.

## 2 · Criterios de aprobación (cada pantalla)
1. Sin desplazamiento horizontal de la página (solo dentro de tablas, que van en su propio contenedor).
2. Ningún texto cortado ni montado sobre otro; los títulos largos se parten.
3. Botones y enlaces de al menos 44×44 px y separados entre sí.
4. Formularios: el campo activo queda visible con el teclado abierto; el botón de enviar es alcanzable.
5. Paneles y ventanas emergentes: se abren completos, se pueden cerrar y no se salen de la pantalla.
6. Menú lateral: se abre y cierra, no tapa el contenido ni queda abierto al navegar; la barra inferior no tapa botones.
7. Tablas: se leen deslizando, o se transforman en tarjetas; nunca ensanchan la página.
8. Sin errores de consola ni peticiones fallidas al cargar.
9. Carga útil (contenido visible) en menos de 4 s en 4G simulado.

## 3 · Datos y cuentas de prueba
- **Con datos:** organización «BitaFly QA - Organización de Prueba» (aeronave, batería, misión, vuelo, mantenimiento, manual) con `qa.gerente`, `qa.jefepilotos`, `qa.sms`, `qa.piloto`.
- **Poca información:** `qa.independiente` (una persona, una aeronave) y una cuenta nueva sin nada, para ver los estados vacíos.
- **Superadmin:** solo `/admin/*` y `/verificacion`, con segundo factor (lo hago contigo presente).
- Cada pantalla se mira **con datos y vacía** cuando tenga ambos estados.

## 4 · Inventario por bloques y qué mirar
### Bloque 1 — Página principal y marketing (público, sin sesión) · 27 pantallas
`/` · `/precios` · `/documentacion` · `/tutoriales` · `/blog` y un artículo · `/casos` y un caso · `/operadores-uas` · `/rac-100` ·
`/rac-100-compliance` · `/bitacora-digital` · `/drone-logbook-colombia` · `/gestion-flota-drones` · `/gestion-pilotos` ·
`/mantenimiento-drones` · `/plan-vuelo-drones` · `/replay-gps-drones` · `/reportes-auditoria` · `/sms-aeronautico` ·
`/capacitacion-drones` · `/clima-drones` · las 4 comparativas · `/aviso-legal` · `/politica-privacidad` · `/politica-cookies` · `/terminos-condiciones`
**Mirar:** menú hamburguesa y desplegables, héroe, carruseles/capturas, tabla de precios y comparativas (deben deslizar), videos de
tutoriales, aviso de cookies (no debe tapar botones), pie de página, tipografía legible sin zoom.

### Bloque 2 — Acceso y registro · 9 pantallas
`/login` · `/registro` (empresa y «unirme») · `/registro/completar` (Google) · `/reset-password` · `/update-password` · `/verificacion` ·
`/invitacion/[token]` · `/invitacion-socio/[token]` · `/reportar/[token]` (reporte público de sucesos)
**Mirar:** teclado y autocompletado, mostrar/ocultar contraseña, selector de rol, mensajes de error, botón de Google, QR.

### Bloque 3 — Panel · Operación · 8 pantallas
`/inicio` · `/operacion` · `/operacion/bitacora` (vista Bitácora y Libro de vuelo) · `/operacion/programacion` (calendario y formulario de misión) ·
`/operacion/despacho` (asistente de despacho y cierre) · `/operacion/meteorologia` · `/operacion/duty` · `/operacion/centro-de-control` (oculto: debe redirigir)
**Mirar:** calendario semanal, tarjetas del dashboard, gráfica, lista de vuelos, replay GPS, asistente de despacho paso a paso (el más crítico del celular), importar logs DJI.

### Bloque 4 — Panel · Flota y Equipo · 5 pantallas
`/flota` (lista y formulario de aeronave) · `/flota/baterias` · `/flota/tripulacion` (perfiles, invitaciones) · `/flota/mantenimiento` · `/flota/equipo` · `/flota/eta`
**Mirar:** tablas anchas, filas expandibles, subida de fotos y documentos desde el celular, formularios largos.

### Bloque 5 — Panel · SMS · 13 pantallas
`/sms` · `/sms/objetivos` · `/sms/riesgos` (matriz de riesgo) · `/sms/cambios` · `/sms/indicadores` (gráficas) · `/sms/mejora-continua` ·
`/sms/reporte-mensual` · `/sms/reportes` · `/sms/casos/[id]` · `/sms/asistente` · `/sms/mapas` (visor externo) · `/sms/gobernanza`, `/sms/msms`, `/sms/capacitacion` (ocultas del menú, alcanzables por enlace)
**Mirar:** matriz 5×5 de riesgo, gráficas, formularios de reporte, mapa embebido y su desplazamiento.

### Bloque 6 — Panel · Documentación y Organización · 14 pantallas
`/capacitacion` y `/capacitacion/administracion` (examen) · `/listas-de-chequeo` · `/proveedores` · `/polizas` · `/manuales` · `/reportes` ·
`/retencion` · `/organizacion` · `/organizacion/importar` · `/organizacion/registro` · `/suscripcion` · `/perfil` · `/aerocivil` (oculta)
**Mirar:** examen en una mano, descarga de PDF/Excel, carga de archivos, tabla de registro de acciones, pago con Wompi (ventana externa), eliminar cuenta.

### Bloque 7 — Plataforma y socios · 3 pantallas
`/admin/plataforma` · `/admin/socios` · `/socio` (panel de escuelas y asesores)

### Elementos que están en todas las pantallas del panel (se prueban una vez con detalle)
Menú lateral y su botón, barra inferior, selector de organización, campana de notificaciones, buscador Ctrl+K (en celular: botón),
recorrido de bienvenida, aviso de suscripción, menú de cuenta.

## 5 · Procedimiento del barrido (capa A)
Para cada pantalla × tamaño × cuenta: cargar, esperar a que termine el contenido (no solo la red), medir
`documentElement.scrollWidth > clientWidth`, listar los elementos que sobresalen, contar objetivos táctiles menores de 44 px, recoger
errores y peticiones ≥ 400, tomar captura de página completa. Resultado: una tabla (pantalla, tamaño, desborde sí/no, errores, captura) y una
carpeta de capturas. **Tiempo estimado:** unas 2 horas de ejecución, repartidas por bloques; el navegador de pruebas es lento, no es el servidor.

## 6 · Lista para tu celular real (capa D, 15 minutos)
iPhone con Safari y Android con Chrome: (1) iniciar sesión con Google y con contraseña; (2) abrir el menú y moverte por 5 secciones;
(3) crear una misión escribiendo en todos los campos con el teclado abierto; (4) despachar un vuelo completo; (5) subir una foto de
aeronave desde la cámara; (6) descargar un PDF; (7) girar el celular en el replay; (8) instalar el sitio en la pantalla de inicio;
(9) abrir con la app Android. Anota cualquier cosa rara con una captura.

## 7 · Entregables y cierre
- Tabla de resultados por pantalla y tamaño (aprobada / con observaciones / falla).
- Lista de defectos con captura, tamaño, cuenta y gravedad (**bloqueante**: no se puede usar · **alta**: se ve roto · **media**: incómodo · **baja**: estético).
- Correcciones en orden de gravedad, con prueba automática de «sin desborde horizontal» para evitar regresiones.
- Segunda pasada de verificación solo de lo corregido.

## 8 · Orden sugerido
1. Elementos comunes del panel (menú, barra inferior, selector) · 2. Despacho y programación (lo que más usa el piloto en campo) ·
3. Inicio y bitácora · 4. Acceso y registro · 5. Resto del panel por bloques · 6. Marketing · 7. Plataforma y socios · 8. Lighthouse y dispositivos reales.

## 9 · Riesgos conocidos a vigilar
Tablas anchas (flota, tripulación, mantenimiento, registro de acciones) · matriz de riesgo 5×5 · calendario semanal de programación ·
asistente de despacho (pasos largos) · visor de mapas de la Aerocivil (externo, no controlable) · pantallas ocultas del menú pero accesibles por enlace ·
primera carga lenta de las llamadas a la API observada en el navegador de pruebas (confirmar con cronómetro en un celular real).
