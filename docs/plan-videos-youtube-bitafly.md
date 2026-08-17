# Plan de Videos YouTube — BitaFly

## Objetivo

Serie de videos educativos en YouTube que expliquen qué es BitaFly y cómo usarla
correctamente, desde cero hasta el uso avanzado por cada perfil de usuario. Ventaja real
de producción: grabaciones con **drones y controles reales** (Enterprise, RC, RC 2,
RC-N3, etc.) para mostrar el flujo completo — vuelo real + registro en la plataforma —
no solo capturas de pantalla.

Este documento es la **fuente única de la línea editorial**: primero el listado completo
de títulos/ideas organizado por bloques, después iremos profundizando/guionando uno por
uno a medida que el usuario lo indique. Se actualiza a medida que avanzamos (mismo
patrón que `plan-mejora-sms-bitafly.md`).

**Estado de cada video**: `[ ] Pendiente` · `[~] En diseño/guion` · `[x] Grabado/publicado`

---

## Cómo está organizada la serie

4 bloques grandes, pensados como playlists de YouTube:

1. **Bloque 0 — Introducción y fundamentos**: qué es BitaFly, para quién es, registro,
   primeros pasos. Punto de entrada para cualquier usuario nuevo.
2. **Bloque 1 — Por perfil/rol**: un recorrido dedicado a cada rol del sistema, mostrando
   exactamente lo que ESE rol ve y puede hacer — no una explicación genérica repetida.
3. **Bloque 2 — Por módulo funcional**: profundización de cada módulo (Flota, Bitácora,
   Programación, Mantenimiento, SMS, Reportes, etc.), útil como referencia/tutorial
   independiente del rol.
4. **Bloque 3 — Casos de uso con drones reales**: episodios "de campo" que combinan vuelo
   real (Enterprise/RC/RC 2/RC-N3) con el flujo completo en la app — despacho, importación
   DJI, cierre de vuelo, replay. Es donde más se aprovecha tener equipos reales.

Bloques adicionales quedan abiertos para cuando surjan (ej. troubleshooting, novedades por
versión, testimonios) — se agregan como Bloque 4+ cuando haya contenido real que los
justifique.

---

## Bloque 0 — Introducción y fundamentos

- [~] 0.1 — ¿Qué es BitaFly? Introducción a la plataforma para operadores UAS en Colombia
      (guion listo, ver subsección abajo)
- [~] 0.2 — ¿BitaFly es para mí? Piloto independiente vs. empresa/operadora (RAC 100)
      (guion listo, ver subsección abajo)
- [~] 0.3 — Cómo crear tu cuenta: registro paso a paso — piloto independiente y
      organización/empresa, en un solo video (fusiona los 0.3/0.4 originales a pedido del
      usuario; guion listo, ver subsección abajo)
- [~] 0.5 — Recorrido general del panel: menú lateral, notificaciones, búsqueda, tu perfil
      (guion listo, ver subsección abajo — se omitió el 0.4 original "Unirse a una
      organización con el NIT" a pedido del usuario, sin renumerar el resto de la serie)
- [~] 0.6 — Planes y precios: qué incluye cada plan y cómo elegir el correcto
      (guion listo, ver subsección abajo — precios y beneficios verificados contra
      `epayco_plan_config` en Supabase en vivo, no contra el código, ver nota en la
      subsección)
- [~] 0.7 — Período de prueba, activar tu suscripción y trabajar en varias
      organizaciones (fusiona los 0.7/0.8 originales a pedido del usuario, mismo
      criterio ya aplicado al fusionar 0.3/0.4 — guion listo, ver subsección abajo)

**0.9 omitido** — "Configurar tu organización: logo, datos de la empresa, registro
AeroCivil" se descarta por completo a pedido del usuario (distinto del caso de 0.4, que se
omitió sin reemplazo; aquí tampoco se fusiona con otro video, simplemente no se produce).
El Bloque 0 queda cerrado con el 0.7. Sin renumerar el resto de la serie — el Bloque 1
sigue empezando en 1.1.

### Guion — 0.1 · ¿Qué es BitaFly?

**Formato**: tutorial guiado en pantalla (recorrido del dashboard) + una toma corta de
vuelo real de apertura, sin necesidad de un dron específico (sirve cualquiera de los
disponibles). **Duración objetivo**: 3-5 min (~550-650 palabras). **Tono**: profesional y
cercano. **CTA**: mínimo — el video es puramente introductorio, no vende.

```
===================================
GUION — VIDEO 0.1
===================================
Título: ¿Qué es BitaFly? Introducción a la plataforma para operadores UAS en Colombia
Duración estimada: ~4 minutos (~600 palabras)
Formato: vuelo real (apertura) + pantalla (resto del video)
===================================

[GANCHO — 0:00-0:12]
[Visual: toma real de un dron despegando, luego corte a una persona escribiendo a mano
en una planilla de vuelos]

"Si todavía llevas tu bitácora de vuelo en papel o en un Excel que se te puede dañar
cualquier día, o si te ha tocado armar un reporte para AeroCivil a las carreras la noche
antes... este video es para ti."

[INTRO — 0:12-0:40]
[Visual: corte a pantalla, dashboard de BitaFly abriéndose]

"Hola, bienvenido. Te voy a mostrar qué es BitaFly en menos de 5 minutos: para quién es,
qué problema resuelve, y qué vas a poder hacer con ella desde el primer día.

Este es el primer video de una serie completa donde vamos a recorrer la plataforma paso
a paso — desde crear tu cuenta hasta cada módulo, según tu rol. Pero para empezar,
vamos a lo esencial."

[CONTENIDO PRINCIPAL — 0:40-3:15]

[Bloque 1: Qué es — 0:40-1:30]
[Visual: pantalla, recorrido rápido del dashboard principal]

"BitaFly es una plataforma para gestionar operaciones con drones, pensada específicamente
para la normativa colombiana — RAC 100, Aerocivil, UAEAC.

En español simple: en un solo lugar llevas tu bitácora de vuelo digital, el control de
tu flota de aeronaves y baterías, la programación de tus misiones, la evaluación de
riesgo antes de volar, y todo lo que necesitas para tu seguridad operacional y tus
reportes regulatorios.

Nada de papeles sueltos, nada de Excel que se corrompe, nada de armar un PDF a mano cada
vez que Aerocivil te lo pide."

[Bloque 2: Para quién es — 1:30-2:15]
[Visual: pantalla, split conceptual piloto independiente vs. empresa (puede ser texto
en pantalla o dos capturas del dashboard)]

"BitaFly sirve para dos tipos de operación.

Si vuelas por tu cuenta, como piloto independiente, tienes tu propia flota, tu propia
bitácora, y un flujo simplificado para despachar tus vuelos.

Y si trabajas en una operadora — una empresa de drones — cada persona entra con su rol:
el Gerente General administra todo, el Jefe de Pilotos programa las misiones y gestiona
la tripulación, el Gerente SMS lleva la seguridad operacional, y cada piloto ve
exactamente las misiones que tiene asignadas.

Vamos a dedicarle un video completo a cada uno de estos perfiles más adelante en la
serie."

[Bloque 3: Qué vas a poder hacer — 2:15-3:15]
[Visual: pantalla, recorrido rápido — bitácora, flota, programación, mapa de misión,
alerta de mantenimiento, un reporte descargándose]

"Con BitaFly puedes:

Registrar tus vuelos de forma manual, o importarlos automáticamente si vuelas con
control DJI — se sincroniza solo.

Llevar el control de mantenimiento de tus aeronaves y baterías, con alertas antes de
que algo venza.

Programar tus misiones con su evaluación de riesgo, su zona de vuelo en el mapa, y
descargar la documentación en PDF y KMZ.

Y generar los reportes que necesitas — tu Libro de Vuelo, tu reporte mensual para
Aerocivil, el expediente de cada tripulante — con un clic, no armándolos a mano."

[CONCLUSIÓN — 3:15-3:45]
[Visual: pantalla, vuelve al dashboard general]

"Esa es la idea general de BitaFly: toda tu operación, en un solo lugar, hecha para la
normativa colombiana.

En el próximo video de la serie vamos a ver cómo saber si BitaFly es para ti según el
tipo de operación que tengas, y después, cómo crear tu cuenta paso a paso."

[CIERRE / CTA MÍNIMO — 3:45-4:00]

"Si te sirvió esta introducción, quédate — la serie completa está pensada para que
aprendas a usar la plataforma a tu ritmo, sin apuro. Nos vemos en el siguiente video."

===================================
[FIN DEL GUION]

Conteo de palabras: ~600
Duración estimada: ~4 minutos
Audiencia: operadores UAS en Colombia (pilotos independientes y empresas), sin
conocimiento previo de la plataforma
Tono: profesional, cercano, sin tecnicismos innecesarios

Notas de producción:
- Toma real de apertura: dron despegando (cualquier equipo disponible) + corte a
  alguien escribiendo en una planilla/Excel — contraste "antes/después"
- Resto del video: pantalla completa, recorrido fluido del dashboard, sin detenerse en
  ningún módulo (eso es para los videos siguientes)
- Evitar mostrar datos reales de una organización/cliente en pantalla — usar una cuenta
  de demostración o difuminar datos sensibles
- Pantalla final: sin tarjetas de suscripción agresivas, coherente con el CTA mínimo
===================================
```

### Guion — 0.2 · ¿BitaFly es para mí?

**Formato**: tutorial guiado en pantalla + tomas reales de b-roll (piloto independiente y
roles de empresa, ya diseñadas para la serie de videos cortos — ver
`docs/intro-video-bitafly.md` y los prompts de video generados en esta misma sesión, no
repetidos aquí para no duplicar contenido). **Duración objetivo**: 3-4 min (~500-550
palabras). **Tono**: profesional y cercano, sin tecnicismos. **CTA**: mínimo — sigue
siendo un video de orientación, no de venta.

```
===================================
GUION — VIDEO 0.2
===================================
Título: ¿BitaFly es para mí? Piloto independiente vs. empresa/operadora (RAC 100)
Duración estimada: ~3.5 minutos (~510 palabras)
Formato: b-roll real (piloto independiente + roles de empresa) + pantalla
===================================

[GANCHO — 0:00-0:12]
[Visual: cortes rápidos alternando la toma del piloto independiente (equipo propio,
despacho simplificado) con el montaje de roles de empresa (Gerente General, Gerente SMS,
Jefe de Pilotos, Piloto)]

"Hay dos formas de volar dentro de BitaFly: por tu cuenta, con el control total en tus
manos. O como parte de un equipo, construyendo una operación que cumple el RAC 100 de
punta a punta. Te muestro exactamente qué te da cada una."

[INTRO — 0:12-0:30]
[Visual: corte a pantalla, recordatorio breve del video anterior]

"En el video anterior te mostré qué es BitaFly en general. Hoy vamos más a fondo: cómo se
ve la plataforma según cómo vuelas — solo, o en equipo."

[CONTENIDO PRINCIPAL — 0:30-3:00]

[Bloque 1: Piloto independiente — 0:30-1:30]
[Visual: toma real — piloto independiente preparando su propio equipo, despachando desde
el celular, un dron, un caso, nadie más alrededor]

"Si vuelas por tu cuenta, el plan Piloto te da el control total: tú decides qué vuelas,
cuándo lo vuelas, y cómo lo registras — sin depender de nadie más. Tu propia flota, así
sea un solo dron, y tu bitácora completamente en tus manos.

Y esa bitácora queda respaldada de verdad — no en un cuaderno que se pierde, ni en un
Excel que se puede dañar cualquier día. Cada vuelo queda registrado con solo un par de
toques, a mano o importado directo desde tu control DJI.

Sin procesos de empresa que aprender, sin roles que explicar. Tu operación, tu control,
tu bitácora."

[Bloque 2: Empresa/operadora — 1:30-2:30]
[Visual: toma real — montaje de los 4 roles (Gerente General, Gerente SMS, Jefe de
Pilotos, Piloto)]

"Y si tu operación es de varias personas — una empresa u operadora que quiere cumplir el
RAC 100 de punta a punta, controlar a sus pilotos, y sostener un verdadero Sistema de
Gestión de Seguridad Operacional — los planes Escuadrilla, Flota y Enterprise te dan
justamente eso: todo lo que necesitas para avanzar hacia convertirte en Explotador UAS
certificado ante AeroCivil, en un solo lugar.

Aquí cada rol sostiene una parte real de esa exigencia. El Gerente General responde por
toda la operación. El Gerente SMS controla los índices de seguridad operacional. El Jefe
de Pilotos programa las misiones y gestiona la tripulación. Y cada piloto vuela
exactamente lo que le corresponde.

Bitácoras, mantenimiento, capacitación, seguridad operacional — todo en un solo lugar, no
repartido entre carpetas y hojas de cálculo sueltas."

[Bloque 3: Cómo saber cuál eres — 2:30-3:00]
[Visual: pantalla, comparación simple en texto o split de dashboard]

"¿Cuál eres tú? Si vuelas solo, sin nadie más de por medio, tu plan es Piloto. Si hay más
personas contigo, o estás construyendo una empresa que debe cumplir ante AeroCivil, tu
plan es de organización."

[Bloque 4: RAC 100 aplica a ambos — 3:00-3:20]
[Visual: pantalla, badge de cumplimiento RAC 100 / reportes]

"Y algo importante: aunque vueles solo por afición, llevar tu bitácora al día ya es un
buen hábito frente al RAC 100. Y si tu meta es certificarte como Explotador UAS, ese
mismo cumplimiento se vuelve el centro de tu operación. BitaFly te acompaña en ambos
casos, desde el primer vuelo."

[CONCLUSIÓN — 3:20-3:40]
[Visual: pantalla, vuelve al dashboard general]

"Ya sabes exactamente qué te da cada plan. En el próximo video te muestro, paso a paso,
cómo crear tu cuenta — primero como piloto independiente, y después como empresa."

[CIERRE / CTA MÍNIMO — 3:40-3:50]

"Sígueme en la serie — vamos a seguir armando tu operación pieza por pieza, sin apuro.
Nos vemos en el siguiente video."

===================================
[FIN DEL GUION]

Conteo de palabras: ~510
Duración estimada: ~3.5 minutos
Audiencia: operadores UAS en Colombia que quieren saber qué les da cada plan — piloto
independiente o empresa — sin conocimiento previo de la plataforma
Tono: profesional, cercano, sin tecnicismos innecesarios. Sin enmarcar la elección como
una decisión riesgosa o difícil de revertir — son simplemente dos formas de operar.

Notas de producción:
- Bloque 1 reutiliza la toma real de "piloto independiente" ya diseñada para la serie de
  videos cortos (10 seg: preparar equipo propio → despacho desde el celular → listo para
  volar) — no se diseña una toma nueva, se reutiliza el mismo prompt/clip.
- Bloque 2 reutiliza el montaje de "los 4 roles de empresa" ya diseñado (3 clips de
  máx. 10 seg: Gerente General, Gerente SMS, Jefe de Pilotos + Piloto) — mismo criterio,
  sin duplicar diseño.
- Bloques 3 y 4, además del gancho y la intro: pantalla completa, sin necesidad de b-roll
  adicional.
- Evitar mostrar datos reales de una organización/cliente en pantalla — misma regla que
  el video 0.1.
- **Subtítulos**: este guion es la fuente única para generarlos — el texto de cada bloque
  ya viene con sus marcas de tiempo aproximadas, así que se puede derivar el archivo de
  subtítulos (.srt/.vtt) directamente de aquí una vez esté el video montado, sin
  retranscribir desde el video final.
===================================
```

### Guion — 0.3 · Cómo crear tu cuenta (piloto independiente + empresa)

**Formato**: tutorial guiado en pantalla — grabación real del flujo `/registro`, sin
necesidad de b-roll de dron. **Duración objetivo**: ~4 min (~500-550 palabras). **Tono**:
profesional, cercano, directo — es un tutorial práctico, no un video de venta. **CTA**:
mínimo.

```
===================================
GUION — VIDEO 0.3
===================================
Título: Cómo crear tu cuenta en BitaFly — piloto independiente y empresa, paso a paso
Duración estimada: ~4 minutos (~530 palabras)
Formato: tutorial 100% en pantalla (grabación real del flujo de registro)
===================================

[GANCHO — 0:00-0:12]
[Visual: toma real — estilo documental observacional, macro/close-up de alguien
preparando café (moliendo, sirviendo), nadie mira a cámara en ningún momento. En los
últimos 2 segundos cae la primera gota sobre la taza, coincidiendo con el remate de la
frase — clip ya generado y aprobado, ver prompt en las notas de producción]

"¿Sabes cuánto se demora preparar un café? Vas a tardar lo mismo en abrir tu cuenta en
BitaFly."

[INTRO — 0:12-0:25]
[Visual: pantalla, bitafly.com/registro]

"Vamos a hacerlo juntos, paso a paso. Empezamos por el registro más simple, el de piloto
independiente, y después seguimos con el de una empresa."

[CONTENIDO PRINCIPAL — 0:25-3:30]

[Bloque 1: Registro piloto independiente — 0:25-1:40]
[Visual: pantalla, grabación real del flujo /registro con la opción de piloto
independiente — datos básicos, confirmación, llegada al dashboard]

"Si vas a volar por tu cuenta, entra a bitafly.com y elige la opción para pilotos
independientes. Te va a pedir tus datos básicos — nombre, correo y una contraseña — nada
más.

Al confirmar, entras directo a tu panel. No necesitas tarjeta: tienes quince días de
prueba gratis del plan Piloto para usar la plataforma completa — tu bitácora, tu flota, tu
mantenimiento — desde el primer minuto.

Y ya está. Esa es toda la creación de cuenta para un piloto independiente."

[Bloque 2: Registro de una empresa/operadora — 1:40-3:10]
[Visual: pantalla, grabación real del flujo /registro con la opción de empresa/operadora
— selección de plan, datos de la organización, confirmación de pago, llegada al panel
como administrador]

"Si tu operación es de varias personas, el registro tiene un paso más: eliges el plan que
se ajuste al tamaño de tu operación — Escuadrilla, Flota o Enterprise — y completas los
datos de tu empresa: NIT, razón social, y quién va a ser el administrador de la cuenta,
normalmente el Gerente General.

Confirmas el pago de forma segura con ePayco, y tu organización queda creada. Entras
directo a tu panel como administrador — listo para configurar tu flota, tu tripulación, y
empezar a invitar al resto de tu equipo."

[Bloque 3: Qué sigue — 3:10-3:30]
[Visual: pantalla, ambos dashboards uno al lado del otro brevemente]

"Y eso es todo — los dos registros toman apenas unos minutos. En el próximo video te
muestro un recorrido completo del panel, para que sepas exactamente dónde está todo apenas
entres."

[CONCLUSIÓN — 3:30-3:45]
[Visual: vuelve brevemente a la taza de café del gancho, ahora servida y humeante —
cierra el paralelo planteado al inicio]

"¿Ves? Tu café todavía está caliente, y tu cuenta ya está lista, sea cual sea tu caso. Lo
que sigue es empezar a construir tu operación dentro de la plataforma."

[CIERRE / CTA MÍNIMO — 3:45-3:55]

"Sígueme en la serie — seguimos armando tu operación paso a paso. Nos vemos en el
siguiente video."

===================================
[FIN DEL GUION]

Conteo de palabras: ~530
Duración estimada: ~4 minutos
Audiencia: operadores UAS en Colombia que ya decidieron qué plan quieren (vienen del video
0.2) y necesitan ver el registro real, paso a paso, antes de intentarlo ellos mismos
Tono: profesional, directo, práctico — sin relleno, es un tutorial de acción, no de
orientación conceptual como los dos anteriores.
===================================
```

Notas de producción:
- **Gancho — paralelo del café (guion final, video ya generado y aprobado)**: se descartó
  el enfoque de cronómetro (arrastraba dos problemas reales: números en pantalla que la IA
  de video distorsiona, y requería calibrar el overlay a la duración exacta del video ya
  montado). El paralelo del café resuelve ambos — no necesita overlay ni número exacto, y
  la duración real del video no tiene que coincidir con nada. Iteraciones del prompt de
  video hasta llegar a la versión aprobada: (1) presentador mirando directo a cámara con
  laptop de fondo → generaba glitches de UI en la pantalla del laptop; (2) se quitó
  cualquier pantalla/dispositivo del cuadro y se probó un tono "disruptivo" (café golpeado
  contra la mesa, mirada intensa a cámara) → no respetaba el orden del guion (mostraba el
  café ya listo antes de plantear la pregunta) y la mirada directa resultaba intimidante,
  restándole enganche; (3) versión final: estilo documental observacional puro, nadie mira
  a cámara en ningún momento, cámara "descubre" a alguien preparando café de forma
  candorosa — la primera gota cae justo en el remate de la frase. El guion se ajustó
  después para calzar con este video ya aprobado (pregunta sobre el café primero, la cuenta
  BitaFly como remate — orden invertido respecto a versiones anteriores del guion).
- **Formato distinto a 0.1/0.2 — con una excepción**: el resto del video (Bloques 1-3) es
  100% grabación de pantalla real del flujo `/registro`, sin b-roll adicional. El gancho es
  la única excepción — sí lleva una toma real generada (el clip del café descrito arriba),
  igual que el gancho del Video 0.1 (toma real de apertura + resto en pantalla).
- **Cuenta de prueba necesaria para grabar**: ambos flujos (piloto independiente y
  empresa) deben grabarse con datos ficticios/desechables — nunca con el NIT o datos
  reales de un cliente. El flujo de empresa además requiere completar un pago real de
  prueba en ePayco (aunque sea el monto mínimo) para poder mostrar la confirmación real —
  no se puede fingir esa pantalla. Mismo tipo de cuenta desechable que se necesitaría para
  las pruebas de QA de la plataforma (ver conversación de auditoría del mismo día) — si se
  resuelve el acceso para una, sirve para la otra.
- Evitar mostrar datos reales de una organización/cliente en pantalla — misma regla que
  los videos 0.1 y 0.2.
- **Subtítulos**: este guion es la fuente única para generarlos — el texto de cada bloque
  ya viene con sus marcas de tiempo aproximadas, así que se puede derivar el archivo de
  subtítulos (.srt/.vtt) directamente de aquí una vez esté el video montado, sin
  retranscribir desde el video final.

### Guion — 0.5 · Recorrido general del panel

**Formato**: tutorial 100% en pantalla (recorrido guiado del dashboard real), sin necesidad
de b-roll de dron. **Duración objetivo**: ~3:30 min (~480 palabras). **Tono**: profesional,
cercano, directo. **CTA**: mínimo — video de orientación, no de venta.

```
===================================
GUION — VIDEO 0.5
===================================
Título: Recorrido completo del panel de BitaFly — todo lo que necesitas saber para empezar
Duración estimada: ~3:30 minutos (~480 palabras)
Formato: tutorial 100% en pantalla (recorrido guiado del dashboard)
===================================

[GANCHO — 0:00-0:12]
[Visual: pantalla, dashboard recién cargado, cursor quieto un instante como quien no sabe
por dónde empezar]

"Ya tienes tu cuenta lista — y ahora ves un panel completo, con menús, campana, buscador...
¿por dónde empiezas? Te lo muestro todo en los próximos minutos, para que nunca te sientas
perdido."

[INTRO — 0:12-0:25]
[Visual: pantalla, dashboard general]

"No importa si acabas de crear tu cuenta o si te uniste a una empresa ya existente — el
panel que vas a ver es el mismo. Vamos a recorrerlo juntos, parte por parte."

[CONTENIDO PRINCIPAL — 0:25-2:35]

[Bloque 1: El menú lateral — 0:25-0:55]
[Visual: pantalla, sidebar completo, mostrando los 3 grupos y cómo se contraen/expanden]

"A la izquierda está tu menú principal, organizado en tres grupos: Operación, Flota y
Equipo, y Documentación. Cada grupo se puede contraer si quieres más espacio — y no te
preocupes si ves menos opciones que en este video: lo que aparece depende de tu rol dentro
de la organización."

[Bloque 2: La barra de búsqueda — 0:55-1:25]
[Visual: pantalla, escribiendo en el buscador del header, resultados desplegándose en vivo]

"Arriba tienes un buscador global. Escribe el número de un vuelo, el modelo de una
aeronave, o el nombre de un piloto, y te lleva directo — sin tener que navegar módulo por
módulo para encontrar algo."

[Bloque 3: La campana de notificaciones — 1:25-1:55]
[Visual: pantalla, clic en la campana, panel de notificaciones desplegado]

"La campana te avisa en tiempo real de lo que pasa en tu operación: un vuelo programado
para ti, una alerta de mantenimiento, una invitación pendiente. No tienes que estar
revisando cada módulo — las notificaciones llegan solas."

[Bloque 4: Tu perfil y menú de cuenta — 1:55-2:35]
[Visual: pantalla, clic en el avatar+nombre al pie del menú lateral, menú desplegado con
Configurar Organización / Gestión de Usuarios / Mi Perfil / Suscripción / Cerrar sesión]

"Y al pie del menú lateral, en tu nombre y tu rol, está todo lo relacionado con tu cuenta:
tu perfil personal, los datos de tu organización si te corresponde verlos, tu suscripción,
y por supuesto, cerrar sesión."

[CONCLUSIÓN — 2:35-3:00]
[Visual: pantalla, vuelve al dashboard general]

"Con esto ya sabes ubicarte en cualquier parte del panel. El resto de la serie va a ir
mucho más rápido ahora que conoces el terreno."

[CIERRE / CTA MÍNIMO — 3:00-3:10]

"En el próximo video vemos los planes y precios — qué incluye cada uno, y cómo saber cuál
te conviene. Nos vemos ahí."

===================================
[FIN DEL GUION]

Conteo de palabras: ~480
Duración estimada: ~3:30 minutos
Audiencia: cualquier usuario recién registrado (piloto independiente o miembro de una
organización) que necesita orientarse en el panel por primera vez
Tono: profesional, cercano, directo — video de orientación pura, sin venta.
===================================
```

Notas de producción:
- **Sin toma real de apertura**: como 0.3, es 100% pantalla — el gancho se apoya en la
  situación relatable ("panel completo, ¿por dónde empiezas?") sin necesidad de b-roll.
- **Grabar con una cuenta que tenga notificaciones reales pendientes**: para que el Bloque
  3 (campana) no muestre un estado vacío — vale la pena programar una misión o generar
  alguna alerta de prueba antes de grabar, para que el panel de notificaciones tenga
  contenido real que mostrar.
- **Evitar mostrar datos reales de una organización/cliente en pantalla** — misma regla que
  el resto de la serie.
- **No profundizar en ningún módulo específico**: este video es solo orientación de la
  "cáscara" del dashboard (menú, búsqueda, notificaciones, cuenta) — cada módulo (Flota,
  Bitácora, Programación, etc.) tiene su propio video dedicado más adelante en el Bloque 2.
- **Subtítulos**: mismo criterio que los guiones anteriores — se derivan de este documento
  una vez esté el video montado.
- **GIFs de referencia grabados (2026-08-17)**: 4 clips silenciosos, uno por bloque, contra
  la organización QA de prueba, sin overlays (sin círculos de clic/etiquetas/marca de agua)
  — `0.5-bloque1-menu-lateral.gif`, `0.5-bloque2-buscador.gif`, `0.5-bloque3-campana.gif`,
  `0.5-bloque4-menu-cuenta.gif`. Son referencia/b-roll de apoyo (ritmo de demo, no
  cronometrados a los segundos del guion) — el usuario los usa como base para grabar su
  propia pantalla con narración, o los recorta directo en su editor.
- **Corrección real encontrada al grabar**: el avatar de **arriba a la derecha** del header
  NO abre un menú — navega directo a Mi Perfil. El menú de cuenta real (Configurar
  Organización / Gestión de Usuarios / Mi Perfil / Suscripción / Cerrar sesión) está en el
  **pie del menú lateral** (avatar + nombre + rol). El guion del Bloque 4 ya se corrigió
  arriba para reflejar esto.

### Guion — 0.6 · Planes y precios

**Formato**: tutorial 100% en pantalla (recorrido real de `/precios`), sin necesidad de
b-roll de dron. **Duración objetivo**: ~3:45 min (~530 palabras). **Tono**: profesional,
cercano, directo. **CTA**: mínimo — orientación, no venta agresiva.

**⚠️ Verificación de precios (antes de grabar)**: los montos de este guion se tomaron de la
tabla real `epayco_plan_config` en Supabase (fuente de verdad — la misma que sirve
`GET /api/plans/public` a la página pública de precios), **no** de las constantes
`PLAN_CONFIG`/`EPAYCO_PLANS` en `src/lib/planLimits.js` ni del array `PLANS_BASE` en
`src/app/precios/PreciosClient.js`, que están desactualizados (documentado como bug real,
ver nota en la conversación de esta sesión). Antes de grabar, **vuelve a consultar la tabla
en vivo** — si los precios cambiaron de nuevo entre que se escribió este guion y la
grabación, hay que actualizar los números aquí primero.

```
===================================
GUION — VIDEO 0.6
===================================
Título: Planes y precios de BitaFly — qué incluye cada uno y cómo elegir el correcto
Duración estimada: ~3:45 minutos (~530 palabras)
Formato: tutorial 100% en pantalla (recorrido real de /precios)
===================================

[GANCHO — 0:00-0:12]
[Visual: pantalla, la grilla de 4 planes en /precios]

"Cuatro planes, cada uno con su propia lista de lo que incluye — ¿cómo elegir sin perder
media hora comparando tabla por tabla? Te lo resumo en los próximos minutos."

[INTRO — 0:12-0:25]
[Visual: pantalla, /precios]

"Ya viste en un video anterior si BitaFly es para ti como piloto independiente o como
empresa. Ahora vamos a los números concretos: qué te da cada plan, y cuánto cuesta."

[CONTENIDO PRINCIPAL — 0:25-3:00]

[Bloque 1: Plan Piloto — 0:25-0:55]
[Visual: pantalla, tarjeta del plan Piloto en /precios]

"El plan Piloto cuesta $19.900 al mes, con quince días de prueba gratis sin tarjeta de
crédito. Incluye una aeronave, bitácora RAC 100 ilimitada, alertas de mantenimiento, hasta
tres baterías, y tu reporte en PDF. Es para quien vuela solo — no incluye SMS aeronáutico
ni varios usuarios, porque simplemente no los necesita."

[Bloque 2: Plan Escuadrilla — 0:55-1:30]
[Visual: pantalla, tarjeta del plan Escuadrilla]

"El plan Escuadrilla cuesta $238.000 al mes. Es para pequeñas empresas: hasta tres
aeronaves, hasta cuatro usuarios con distintos roles, autorizaciones de vuelo, y un módulo
de SMS básico para empezar a documentar tu seguridad operacional."

[Bloque 3: Plan Flota — 1:30-2:10]
[Visual: pantalla, tarjeta del plan Flota, la más elegida]

"El plan Flota cuesta $476.000 al mes, y es el más elegido por empresas medianas: hasta
diez aeronaves, diez usuarios con los cinco roles del sistema, todos los reportes
regulatorios, SMS completo con trazabilidad, auditoría, checklists personalizables, y
soporte prioritario."

[Bloque 4: Plan Enterprise — 2:10-2:35]
[Visual: pantalla, tarjeta Enterprise]

"Y si tu operación no cabe en ningún límite de los anteriores, está Enterprise: aeronaves y
usuarios ilimitados, marca propia, acceso a API, y soporte dedicado. El precio es a
consultar directamente con nuestro equipo, porque se ajusta a cada operación."

[Bloque 5: Cómo elegir — 2:35-3:00]
[Visual: pantalla, toggle mensual/anual, botón de cambio de plan en el dashboard]

"Para elegir, cuenta tus aeronaves y tu equipo de HOY, no los que planeas tener en dos
años — puedes cambiar de plan cuando quieras, sin contratos rígidos. Y si tienes dudas, el
plan Piloto tiene quince días gratis para que pruebes la plataforma completa antes de
decidir."

[CONCLUSIÓN — 3:00-3:25]
[Visual: pantalla, vuelve a la grilla completa de planes]

"Ya tienes claro qué te da cada plan y cuánto cuesta. La decisión ya no es sobre qué incluye
cada uno — es sobre qué tamaño tiene tu operación hoy."

[CIERRE / CTA MÍNIMO — 3:25-3:45]

"En el próximo video te muestro cómo funciona el período de prueba y cómo activar tu
suscripción cuando estés listo. Nos vemos ahí."

===================================
[FIN DEL GUION]

Conteo de palabras: ~530
Duración estimada: ~3:45 minutos
Audiencia: cualquier usuario evaluando qué plan de BitaFly le conviene — ya sea antes de
registrarse o ya con una cuenta activa considerando cambiar de plan
Tono: profesional, cercano, directo — informa precios y beneficios reales, sin presión de
venta.
===================================
```

Notas de producción:
- **Sin toma real de apertura**: como 0.5, es 100% pantalla — el gancho se apoya en la
  situación relatable de comparar planes, sin necesidad de b-roll.
- **Precios sujetos a cambio**: a diferencia del resto de la serie, este guion tiene una
  fecha de caducidad real — los precios pueden cambiar de nuevo antes de grabar. Revisar
  `epayco_plan_config` (o simplemente cargar `/precios` en producción y mirar los números
  reales que muestra) el mismo día de la grabación, no confiar en los montos de este
  documento si pasó tiempo desde que se escribió.
- **Plan Enterprise sin precio público**: se mantiene "a consultar" en el guion — no se
  inventa un rango de precio, porque no existe un valor único real (se negocia caso a
  caso).
- **Toggle mensual/anual**: el video puede mostrar brevemente el toggle de la página de
  precios, pero el guion no menciona el precio anual de cada plan en el audio para no
  saturar de números — si se quiere agregar, el precio anual real (verificado en la misma
  consulta) es: Piloto $218.899/año, Escuadrilla $2.570.400/año, Flota $5.140.800/año.
- **Subtítulos**: mismo criterio que los guiones anteriores — se derivan de este documento
  una vez esté el video montado.

---

### Guion — 0.7 · Período de prueba, activar tu suscripción y varias organizaciones

**Formato**: tutorial 100% en pantalla — recorrido real de `/dashboard/subscription` y del
switcher de organizaciones, mismo criterio que 0.5/0.6 (sin b-roll). **Duración
objetivo**: ~5-5:30 min (~700-750 palabras — más largo que el resto de la serie por venir
de la fusión de dos temas). **Tono**: profesional, cercano, práctico. **CTA**: mínimo.

**Por qué se fusionan estos dos temas en un solo video**: ambos son, en el fondo, "qué
puede hacer tu cuenta además de simplemente usar la plataforma" — activar/cambiar tu plan
de pago y pertenecer a más de una organización viven en la misma zona del producto
(Suscripción / menú de cuenta) y se resuelven desde las mismas pantallas. Separarlos en
dos videos de ~2-3 min cada uno habría repetido la misma introducción ("esto lo
encuentras en tu menú de cuenta...") dos veces sin necesidad.

```
===================================
GUION — VIDEO 0.7
===================================
Título: Período de prueba, activar tu suscripción y trabajar en varias organizaciones
Duración estimada: ~5:15 minutos (~730 palabras)
Formato: tutorial 100% en pantalla (recorrido real de Suscripción + switcher de org)
===================================

[GANCHO — 0:00-0:15]
[Visual: pantalla, /dashboard/subscription con el plan Piloto activo y el contador de
días de prueba visible]

"Ya elegiste tu plan. Ahora vamos directo a lo práctico: qué pasa cuando termina tu
período de prueba, cómo activas el pago en el momento que decidas, y cómo trabajar con
más de una organización si tu operación lo pide."

[INTRO — 0:15-0:30]
[Visual: pantalla, menú de cuenta / Suscripción]

"Todo esto vive en el mismo lugar: tu menú de cuenta. Vamos paso a paso."

[CONTENIDO PRINCIPAL — 0:30-4:45]

[Bloque 1: Cómo funciona el período de prueba — 0:30-1:15]
[Visual: pantalla, /dashboard/subscription — fecha de vencimiento del período de prueba]

"Si te registraste con el plan Piloto, tienes quince días de prueba gratis sin necesidad
de tarjeta de crédito. Durante esos quince días tienes acceso completo a la plataforma —
tu bitácora, tu flota, tu mantenimiento, todo. Aquí en Suscripción siempre puedes ver
cuántos días te quedan. Si el período termina y no has activado un pago, tu cuenta no se
borra ni pierde tu información: simplemente algunas funciones quedan pausadas hasta que
actives tu plan."

[Bloque 2: Activar tu suscripción — pago con ePayco — 1:15-2:45]
[Visual: pantalla, botón "Mejorar plan" / "Activar suscripción" → se abre ePayco en una
pestaña nueva → vuelve a BitaFly y muestra el estado actualizándose]

"Para activar tu plan, sea el mismo Piloto ya vencido o uno superior como Escuadrilla o
Flota, entra a Suscripción y elige tu plan. Vas a pasar a una pestaña nueva, la de
nuestra pasarela de pagos ePayco, donde completas el pago de forma segura con tu tarjeta.

No necesitas volver a hacer nada más: en cuanto el pago se confirma, tu cuenta en BitaFly
se actualiza sola — la página va revisando el estado cada pocos segundos, así que no
tienes que recargar nada manualmente.

Y si por algún motivo tu plan no se actualiza solo después de pagar — por ejemplo, si
cerraste la pestaña muy rápido — no te preocupes: en la misma pantalla de Suscripción
tienes un botón para 'Verificar pago', donde pegas la referencia que te llega por correo
de ePayco y confirmamos el pago manualmente."

[Bloque 3: Y si tu cuenta necesita estar en más de una organización... — 2:45-3:00]
[Visual: pantalla, transición al menú de cuenta]

"Ahora, algo distinto: qué pasa si tú, con esta misma cuenta, necesitas trabajar para más
de una empresa — o eres dueño de varias operadoras."

[Bloque 4: Unirse a una segunda organización — 3:00-3:45]
[Visual: pantalla, flujo de unirse a una organización adicional desde el menú de cuenta —
ingreso del NIT de la segunda empresa]

"BitaFly te permite pertenecer a más de una organización con la misma cuenta, sin perder
nada de lo que ya tienes. Desde tu menú de cuenta, eliges unirte a otra organización e
ingresas su NIT. Esto no mueve ni mezcla tu información — tu flota, tus vuelos y tu
historial de la primera organización se quedan intactos, y simplemente se agrega esta
segunda como una membresía nueva."

[Bloque 5: Cambiar entre organizaciones — el switcher — 3:45-4:45]
[Visual: pantalla, clic en el nombre de la organización en el encabezado, se despliega el
listado de organizaciones, clic en la otra, la página recarga y refleja el nuevo
contexto]

"Para moverte de una a otra, no necesitas cerrar sesión ni volver a entrar. Haz clic en
el nombre de tu organización, arriba en el encabezado, y vas a ver el listado completo de
organizaciones a las que perteneces. Eliges la que quieres activar, y la plataforma
recarga con todo el contexto de esa organización — tu rol, tu flota, tu tripulación, todo
lo que corresponde a esa empresa específica, sin mezclarse con la otra.

Puedes cambiar cuantas veces quieras, cuando quieras — es simplemente decirle a BitaFly
en cuál de tus organizaciones estás trabajando en este momento."

[CONCLUSIÓN — 4:45-5:05]
[Visual: pantalla, vuelve a Suscripción y luego al switcher, brevemente]

"Y eso es todo: ya sabes cómo funciona tu período de prueba, cómo activar tu pago cuando
estés listo, y cómo moverte entre varias organizaciones si tu operación lo necesita. Tu
cuenta está lista para crecer contigo."

[CIERRE / CTA MÍNIMO — 5:05-5:15]

"En el próximo video te muestro cómo configurar los datos de tu organización — tu logo,
tu registro ante la Aerocivil, y más. Nos vemos ahí."

===================================
[FIN DEL GUION]

Conteo de palabras: ~730
Duración estimada: ~5:15 minutos
Audiencia: usuarios que ya tienen una cuenta activa en BitaFly (vienen del video 0.6) y
necesitan saber qué pasa después de su período de prueba, o que gestionan/trabajan para
más de una organización
Tono: profesional, cercano, práctico — dos temas de "gestión de cuenta" resueltos en un
solo recorrido, sin relleno.
===================================
```

Notas de producción:
- **Sin toma real de apertura**: como 0.5/0.6, es 100% pantalla — el gancho se apoya en
  listar directamente los tres beneficios concretos del video, sin necesidad de b-roll.
- **Cuenta de prueba necesaria para grabar**: el Bloque 2 requiere completar un pago real
  de prueba en ePayco (mismo caso ya documentado en las notas de 0.3) para poder mostrar
  la confirmación y el estado actualizándose en vivo — no se puede fingir esa pantalla. El
  Bloque 4 requiere una segunda cuenta/organización de prueba ya existente para poder
  mostrar el flujo de unión real con un NIT válido.
- **Verificar el comportamiento exacto de ePayco antes de grabar**: el correo con la
  referencia de pago y el copy exacto del botón "Verificar pago" pueden diferir
  ligeramente de lo descrito aquí si el flujo cambió desde que se escribió este guion —
  revisar `/dashboard/subscription` en producción el mismo día de la grabación.
- **El switcher solo aparece con más de una organización**: para grabar el Bloque 5, la
  cuenta de prueba usada debe tener ya al menos dos membresías activas (unida vía el
  Bloque 4, o preparada de antemano) — con una sola organización, el nombre en el
  encabezado no es clicable y no hay nada que mostrar.
- **Evitar mostrar datos reales de una organización/cliente en pantalla** — misma regla
  que el resto de la serie.
- **Subtítulos**: mismo criterio que los guiones anteriores — se derivan de este documento
  una vez esté el video montado.

---

## Bloque 1 — Por perfil/rol

Cada video muestra el dashboard y las opciones reales que ve ESE rol, con ejemplos en vivo.

- [~] 1.1 — Perfil Piloto Independiente: todo lo que necesitas para volar y llevar tu
      bitácora tú solo (flota propia, planeación, despacho simplificado) (guion listo, ver
      subsección abajo)
- [~] 1.2 — Perfil Gerente General (Admin): gestión completa de la organización (guion
      listo, ver subsección abajo)
- [ ] 1.3 — Perfil Jefe de Pilotos: programación de misiones, tripulación, flota
- [ ] 1.4 — Perfil Gerente SMS: seguridad operacional, reportes VOR/MOR, indicadores
- [ ] 1.5 — Perfil Piloto (dentro de una organización): despacho de misiones asignadas,
      mis vuelos, expediente personal
- [ ] 1.6 — Diferencias clave entre los 4 perfiles: quién ve qué y por qué

### Guion — 1.1 · Perfil Piloto Independiente

**Formato**: reutiliza la toma real de apertura ya diseñada para el piloto independiente
(la misma usada en el Bloque 1 del Video 0.2 — "piloto independiente preparando su propio
equipo, despachando desde el celular, un dron, un caso, nadie más alrededor"), y el resto
del video 100% en pantalla — mismo criterio que el resto del Bloque 0/1: solo se graba
b-roll nuevo cuando el tema lo amerita, y aquí ya existe un clip aprobado que encaja
perfecto. **Duración objetivo**: ~4:30-5 min (~650-700 palabras). **Tono**: profesional,
cercano, directo. **CTA**: mínimo.

```
===================================
GUION — VIDEO 1.1
===================================
Título: Perfil Piloto Independiente: todo lo que necesitas para volar y llevar tu
bitácora tú solo
Duración estimada: ~4:45 minutos (~680 palabras)
Formato: toma real de apertura (reutilizada de 0.2) + tutorial 100% en pantalla
===================================

[GANCHO — 0:00-0:15]
[Visual: toma real reutilizada — piloto independiente preparando su propio equipo,
despachando desde el celular, un dron, un caso, nadie más alrededor]

"Si vuelas por tu cuenta, no necesitas un equipo de personas ni procesos de empresa para
llevar tu operación en regla. Te muestro exactamente lo que tienes dentro de BitaFly para
volar y llevar tu bitácora tú solo."

[INTRO — 0:15-0:30]
[Visual: pantalla, dashboard del piloto independiente]

"En un video anterior viste si este es tu perfil. Ahora vamos a fondo: qué ves en tu
panel, y cómo se ve cada paso, desde registrar tu dron hasta cerrar un vuelo."

[CONTENIDO PRINCIPAL — 0:30-4:15]

[Bloque 1: Tu flota, a tu medida — 0:30-1:15]
[Visual: pantalla, /dashboard/fleet y /dashboard/batteries del piloto independiente]

"Tu panel empieza simple: registras tu aeronave, con sus datos técnicos y una foto si
quieres, y tus baterías. No hay tripulación que gestionar ni roles que asignar — todo lo
que ves aquí es tuyo, y solo tuyo. Y como sigues siendo el administrador de tu propia
cuenta, tienes acceso completo a todo lo que necesitas configurar, sin restricciones."

[Bloque 2: Despacho simplificado — 1:15-2:15]
[Visual: pantalla, flujo de despacho /logbook/new sin orden de vuelo — selección de
aeronave, tipo de misión, hora de despegue]

"Aquí está la diferencia más grande frente a una operación de empresa: tu despacho es
simplificado. No necesitas crear una orden de vuelo ni elegir batería a mano — solo
indicas el tipo de misión, tu aeronave y la hora de despegue, y listo. Si tu organización
tiene configurado el checklist de salud o el de pre-vuelo, los completas en el mismo
paso, y puedes ver de una vez el clima de la zona donde vas a volar, para decidir con
información real si es un buen momento para despegar."

[Bloque 3: Tu bitácora — manual o automática — 2:15-3:15]
[Visual: pantalla, registro manual de un vuelo + importación automática desde el control
remoto DJI]

"Para tu bitácora tienes dos caminos. Puedes registrar el vuelo a mano, con los datos
básicos. O, si vuelas con un control DJI, conectas tu equipo y BitaFly importa tus
vuelos automáticamente — calcula la duración, suma las horas a tu aeronave, y actualiza
los ciclos de tus baterías. Si es tu primer vuelo importado, el sistema incluso crea tu
perfil de piloto solo, para que nunca te quede un vuelo sin dueño."

[Bloque 4: Mantenimiento de tu dron — 3:15-3:45]
[Visual: pantalla, /dashboard/maintenance — configuración de intervalos + registro de una
intervención]

"Aunque vueles solo, tu dron también necesita mantenimiento — mayor y menor. Configuras
cada cuánto, en horas de vuelo o en días, y BitaFly te avisa cuando se acerca la fecha, y
bloquea el despacho si tu aeronave ya lo necesita. Así tu operación se mantiene segura,
sin que tengas que llevar la cuenta tú mismo en un cuaderno aparte."

[Bloque 5: Simplicidad a propósito — 3:45-4:15]
[Visual: pantalla, barra lateral del piloto independiente — sin el grupo de
Documentación]

"Vas a notar que tu menú es más corto que el de una empresa: no tienes SMS aeronáutico,
SORA, reportes regulatorios ni protocolos — todo eso está pensado para operaciones con
varias personas y procesos que documentar. Volando solo, no lo necesitas. Es una decisión
de diseño, no algo que te esté faltando: tu panel te muestra exactamente lo que tu
operación individual requiere, ni más ni menos."

[CONCLUSIÓN — 4:15-4:35]
[Visual: vuelve brevemente a la toma real del gancho]

"Y eso es todo lo que necesitas para operar por tu cuenta dentro de BitaFly: tu flota, tu
despacho, tu bitácora y tu mantenimiento, sin nada de más."

[CIERRE / CTA MÍNIMO — 4:35-4:45]

"En el próximo video te muestro el otro lado: el perfil de Gerente General, para quien
administra una operación completa con equipo. Nos vemos ahí."

===================================
[FIN DEL GUION]

Conteo de palabras: ~680
Duración estimada: ~4:45 minutos
Audiencia: pilotos independientes que ya crearon su cuenta (vienen de los videos 0.2/0.3)
y quieren ver en detalle cómo se ve operar día a día dentro de la plataforma
Tono: profesional, cercano, directo — un recorrido práctico por su propio flujo, sin
comparaciones innecesarias con el perfil de empresa (eso ya se cubrió en 0.2).
===================================
```

Notas de producción:
- **Toma real de apertura reutilizada, no una nueva**: mismo clip ya aprobado y usado en
  el Bloque 1 del Video 0.2 — evita regrabar o regenerar b-roll que ya existe y encaja
  perfecto con el tema de este video.
- **Cuenta de prueba necesaria para grabar**: una cuenta de piloto independiente real
  (`role='admin'`, `subscription_plan='piloto'`) con al menos una aeronave y una batería ya
  registradas, para no tener que registrar todo desde cero en cámara y alargar el video.
  El Bloque 3 (importación DJI) requiere un archivo de log real de un control remoto DJI de
  prueba — mismo tipo de archivo ya usado para otras grabaciones de la serie.
- **Verificar los límites del plan Piloto antes de grabar** (1 aeronave, 3 baterías, 3
  tech): si cambiaron desde que se escribió este guion, ajustar el Bloque 1 en
  consecuencia — mismo criterio de verificación ya aplicado en 0.6.
- **Bloque 5 — verificar que el menú lateral siga sin el grupo "Documentación" para este
  rol** antes de grabar (comportamiento documentado como intencional en el proyecto, pero
  puede cambiar) — si el piloto independiente ya tiene acceso a alguna de esas secciones
  para cuando se grabe, ajustar el bloque.
- **Evitar mostrar datos reales de una organización/cliente en pantalla** — misma regla
  que el resto de la serie.
- **Subtítulos**: mismo criterio que los guiones anteriores — se derivan de este documento
  una vez esté el video montado.
- **GIFs de referencia grabados (2026-08-17)**: 5 clips silenciosos, uno por bloque
  (2-5, el gancho reutiliza el clip real de 0.2), sin overlays — `1.1-bloque1-flota-
  baterias.gif`, `1.1-bloque2-despacho-simplificado.gif`, `1.1-bloque3-bitacora.gif`,
  `1.1-bloque4-mantenimiento.gif`, `1.1-bloque5-menu-simplificado.gif`. Grabados contra
  `qa.independiente@bitafly-test.local` (organización propia "Piloto: QA Piloto
  Independiente", separada de la QA org principal — la misma cuenta también es miembro
  regular de la QA org, así que tiene dos membresías; se usó la organización activa
  correcta para la grabación).
- **Bloque 5 confirmado real**: el menú lateral del piloto independiente efectivamente
  no tiene el grupo Documentación — solo Operación (Dashboard/Bitácora/Meteorología) y
  Flota & Equipo (Flota/Baterías/Mantenimiento). El guion no necesita ajuste.
- **Limitación real encontrada al grabar el Bloque 3**: la organización de prueba no
  tenía fila en `pilots` para el piloto independiente (solo `profiles`+
  `organization_members`), así que no se pudo demostrar en vivo el "auto-piloto DJI"
  (crear el registro de piloto automáticamente al importar el primer vuelo) — el GIF
  grabado muestra la bitácora real (1 vuelo sin PIC asignado) + el panel de importación
  DJI, pero no el resultado de una importación real (requiere un archivo `.txt` real de
  un log DJI, que tampoco está disponible en este entorno — mismo pendiente que el
  Replay GPS de la Fase 0 del plan visual).

### Guion — 1.2 · Perfil Gerente General (Admin)

**Formato**: reutiliza la toma real ya diseñada para la perspectiva de empresa/operadora
(la misma usada en el Bloque 2 del Video 0.2 — "montaje de los 4 roles: Gerente General,
Gerente SMS, Jefe de Pilotos, Piloto"), y el resto del video 100% en pantalla — mismo
criterio que 1.1: solo se graba b-roll nuevo cuando el tema lo amerita, y aquí ya existe un
clip aprobado que encaja. **Duración objetivo**: ~5:30-6 min (~800-850 palabras) — más largo
que 1.1 porque el Gerente General ve toda la plataforma, no un subconjunto. **Tono**:
profesional, cercano, directo. **CTA**: mínimo.

```
===================================
GUION — VIDEO 1.2
===================================
Título: Perfil Gerente General: gestión completa de tu organización en BitaFly
Duración estimada: ~5:45 minutos (~830 palabras)
Formato: toma real reutilizada (de 0.2) + tutorial 100% en pantalla
===================================

[GANCHO — 0:00-0:15]
[Visual: toma real reutilizada — montaje de los 4 roles (Gerente General, Gerente SMS,
Jefe de Pilotos, Piloto)]

"Si administras una operación con más de una persona, tu cuenta ve la plataforma completa:
tu equipo, tu flota, tu documentación regulatoria y tu facturación, todo en un solo lugar.
Te muestro exactamente qué tienes como Gerente General dentro de BitaFly."

[INTRO — 0:15-0:30]
[Visual: pantalla, dashboard del Gerente General — franja de KPIs con datos reales]

"En un video anterior viste si este es tu perfil. Ahora vamos a fondo: tu equipo, tu
flota, la documentación de tu organización, y cómo se administra la cuenta detrás de
todo."

[CONTENIDO PRINCIPAL — 0:30-5:15]

[Bloque 1: Tu equipo — 0:30-1:30]
[Visual: pantalla, /dashboard/users (Gestión de Usuarios) y el panel de Tripulación —
invitar a alguien, ver roles asignados]

"Como Gerente General, tú administras quién entra a tu organización y con qué rol: Jefe
de Pilotos, Gerente SMS, o Piloto. Invitas a alguien por correo, y en cuanto acepta, ya
tiene exactamente los permisos de su rol — ni más, ni menos. Y en Tripulación llevas el
expediente de cada persona: licencia, certificado médico, capacitación, todo con alertas
de vencimiento."

[Bloque 2: Tu flota, sin límites artificiales — 1:30-2:15]
[Visual: pantalla, /dashboard/fleet con varias aeronaves, /dashboard/batteries,
/dashboard/maintenance]

"Tu flota ya no es una sola aeronave: aquí administras todas las que tenga tu operación,
con sus baterías y su mantenimiento — mayor y menor — configurado por equipo, no por
persona. Cada aeronave tiene su propio historial, sus propios intervalos, y sus propias
alertas."

[Bloque 3: Programación de misiones — 2:15-3:00]
[Visual: pantalla, /dashboard/authorizations — calendario semanal con misiones asignadas
a distintos pilotos]

"Aquí programas misiones con anticipación: eliges piloto, aeronave, zona y horario, y el
sistema exige una evaluación SORA completa antes de poder autorizarla. Cada tripulante ve
solo lo que le corresponde a él en su propio panel — tú ves la operación completa."

[Bloque 4: El grupo Documentación — 3:00-4:15]
[Visual: pantalla, sidebar abriendo el grupo Documentación, recorrido rápido por
Seguridad SMS, Auditoría, Reportes y Protocolos]

"Este es el grupo que no existe en una cuenta de piloto independiente: Documentación.
Aquí vive todo lo que exige operar como empresa ante la AeroCivil — el Sistema de Gestión
de Seguridad Operacional completo, con SORA, evaluación de riesgos e indicadores;
Auditoría, con la trazabilidad de aeronavegabilidad y documentos de tu tripulación; más de
veinte formatos de Reportes en PDF y Excel; y tu biblioteca de Protocolos, Proveedores,
Capacitación y Manuales corporativos. Cada uno de estos módulos tiene su propio video más
adelante en la serie — aquí solo te muestro que existen y para qué sirven en conjunto."

[Bloque 5: La cuenta detrás de todo — 4:15-5:00]
[Visual: pantalla, menú de cuenta al pie del sidebar → Configurar Organización y
Suscripción]

"Y al pie de tu menú lateral está la administración de la cuenta misma: los datos de tu
organización — NIT, registro AeroCivil, código de acceso para que tu equipo se una — y tu
suscripción, con el plan contratado, cuántas aeronaves y pilotos llevas usados de tu cupo,
y la opción de sumar recursos adicionales sin cambiar de plan."

[CONCLUSIÓN — 5:00-5:30]
[Visual: vuelve brevemente a la toma real del gancho]

"Y eso es tu perspectiva completa como Gerente General: tu equipo, tu flota, tu
documentación regulatoria y tu cuenta, todo desde un solo panel — sin tener que repartir
la operación entre Excels y carpetas sueltas."

[CIERRE / CTA MÍNIMO — 5:30-5:45]

"En el próximo video vemos el perfil de Jefe de Pilotos — quien programa las misiones y
gestiona la tripulación día a día. Nos vemos ahí."

===================================
[FIN DEL GUION]

Conteo de palabras: ~830
Duración estimada: ~5:45 minutos
Audiencia: administradores/dueños de una operación con más de una persona que ya crearon
su organización (vienen de los videos 0.2/0.3) y quieren ver en detalle todo lo que
administran desde su cuenta
Tono: profesional, cercano, directo — un recorrido amplio por toda la plataforma desde la
perspectiva de quien responde por la operación completa, sin profundizar en ningún módulo
específico (eso lo cubre cada video del Bloque 2).
===================================
```

Notas de producción:
- **Toma real de apertura reutilizada, no una nueva**: mismo clip ya aprobado y usado en
  el Bloque 2 del Video 0.2 — evita regrabar b-roll que ya existe y encaja con las 4
  perspectivas de rol.
- **Cuenta de prueba necesaria para grabar**: una cuenta Gerente General real
  (`role='admin'` dentro de una organización, no plan piloto) con datos reales — al menos
  2 aeronaves, varios tripulantes con roles distintos, vuelos recientes y alguna misión
  programada — para que los Bloques 1-3 no se vean vacíos.
- **Bloque 4 es deliberadamente superficial**: es un recorrido de "qué existe", no un
  tutorial de cada módulo — cada uno (SMS, Auditoría, Reportes, Protocolos, etc.) tiene su
  propio video dedicado en el Bloque 2 de la serie. No alargar este bloque más de lo
  necesario.
- **Evitar mostrar datos reales de una organización/cliente en pantalla** — misma regla
  que el resto de la serie.
- **Subtítulos**: mismo criterio que los guiones anteriores — se derivan de este documento
  una vez esté el video montado.
- **GIFs de referencia grabados (2026-08-17)**: 5 clips silenciosos, uno por bloque
  (el gancho reutiliza el clip real de 0.2), sin overlays — `1.2-bloque1-equipo.gif`,
  `1.2-bloque2-flota.gif`, `1.2-bloque3-programacion.gif`,
  `1.2-bloque4-documentacion.gif`, `1.2-bloque5-cuenta-suscripcion.gif`. Grabados contra
  `qa.gerente@bitafly-test.local` (organización QA principal, con datos reales: 7
  tripulantes, 2 aeronaves, 3 misiones programadas, plan Flota) — todos los bloques
  coincidieron con lo escrito en el guion sin necesitar ajustes.

---

## Bloque 2 — Por módulo funcional

- [ ] 2.1 — Mi Flota: registrar aeronaves, baterías y equipo técnico
- [ ] 2.2 — Baterías: ciclos, salud y control de vida útil
- [ ] 2.3 — Mantenimiento de aeronaves: mayor y menor, configuración de intervalos
- [ ] 2.4 — Tripulación: invitar pilotos, roles, expedientes y certificaciones
- [ ] 2.5 — Programación de vuelos: crear una misión paso a paso
- [ ] 2.6 — SORA: evaluación de riesgo obligatoria antes de programar una misión
- [ ] 2.7 — Despacho de vuelo: el wizard completo (salud, inventario, pre-vuelo, riesgos,
      briefing)
- [ ] 2.8 — Importación automática de vuelos DJI: sincronización desde el control remoto
- [ ] 2.9 — Bitácora de vuelo: consulta, edición y descarga de tus registros
- [ ] 2.10 — Replay de vuelo: revive tu misión con el mapa GPS animado
- [ ] 2.11 — Meteorología: cómo leer el semáforo GO/NO-GO antes de volar
- [ ] 2.12 — Seguridad SMS: matriz de riesgos, indicadores (SPI) y mejora continua
- [ ] 2.13 — Reportes VOR/MOR: cuándo y cómo reportar un evento de seguridad
- [ ] 2.14 — Auditoría y cumplimiento: verifica que tu operación esté al día
- [ ] 2.15 — Reportes descargables: Libro de Vuelo, Mantenimiento, Bitácora y más
- [ ] 2.16 — Protocolos: checklists personalizables para tu operación
- [ ] 2.17 — Manuales corporativos: publicación y acuse de lectura
- [ ] 2.18 — Capacitación: cronograma, asistencia y examen calificado
- [ ] 2.19 — Proveedores: registro y auditoría de proveedores
- [ ] 2.20 — Notificaciones: cómo no perderte ninguna alerta importante
- [ ] 2.21 — Recursos adicionales: agregar pilotos o drones extra a tu plan

---

## Bloque 3 — Casos de uso con drones reales

Aquí es donde entra el equipo físico: Enterprise, RC, RC 2, RC-N3, etc. — vuelo real +
flujo completo en BitaFly, de principio a fin.

- [ ] 3.1 — Vuelo completo de principio a fin: planear, despachar, volar e importar
      (control RC-N3)
- [ ] 3.2 — Sincronización automática DJI: "elige la carpeta una vez" (RC 2 / Enterprise)
- [ ] 3.3 — Operación con drone Enterprise: particularidades del flujo empresarial
- [ ] 3.4 — Cierre de vuelo y reporte de un incidente en campo (VOR/MOR real)
- [ ] 3.5 — Mantenimiento real: registrar una intervención con checklist de recibo
- [ ] 3.6 — Un día de operación completo: de la programación al reporte mensual AeroCivil

---

## Notas de producción (confirmadas con el usuario)

- **Duración objetivo por video**: sin duración fija — la que sea necesaria según la
  importancia/profundidad del tema. Videos de fundamentos o de un módulo simple pueden ser
  cortos; videos de un flujo completo (ej. 3.6 — un día de operación) pueden extenderse
  todo lo que haga falta para cubrirlo bien.
- **Tono/formato**: se usan **ambos formatos** (tutorial guiado en pantalla y fragmentos de
  vuelo real), elegidos según el tipo de video — no es un formato fijo para toda la serie:
  - Bloques 0, 1 y 2 (introducción, perfiles, módulos): principalmente tutorial guiado en
    pantalla — se apoya en vuelo real solo cuando el módulo lo amerite (ej. 2.7 Despacho,
    2.8 Importación DJI).
  - Bloque 3 (casos de uso): principalmente vuelo real con el control físico correspondiente
    (Enterprise/RC/RC 2/RC-N3), intercalado con pantalla para mostrar el registro en la app.
- **Orden de grabación**: no necesariamente el orden de publicación.
- Este documento se actualiza con guion/notas de cada video a medida que se profundiza —
  cada video ampliado gana su propia subsección debajo del bloque correspondiente (guion,
  tomas necesarias, equipo/control a usar, capturas de pantalla requeridas).

---

## Próximo paso

Esperando indicación del usuario sobre qué video de esta lista ampliar/guionar primero.
