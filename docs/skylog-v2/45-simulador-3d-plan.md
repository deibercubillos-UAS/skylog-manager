# Simulador 3D de capacitación — plan por fases

[← Índice maestro](00-INDICE.md) · [Investigación y análisis](45a-simulador-3d-investigacion.md) · [Reglas](01-reglas.md)

> **Estado: solo planeación (2026-11-07). Nada construido.** Este documento dice **qué** se
> construye, **en qué orden** y **cómo se sabe que cada fase terminó** (regla Q1: la puerta de
> verificación se escribe antes de construir). El porqué de cada decisión está en
> [`45a-simulador-3d-investigacion.md`](45a-simulador-3d-investigacion.md).

---

## 0 · Decisiones tomadas por el usuario

| # | Decisión |
|---|---|
| D-SIM-1 | Simulador **3D** |
| D-SIM-2 | Enfoque: **capacitación del personal** (no demostración comercial) |
| D-SIM-3 | Se usa desde el **celular** y desde el **control enterprise** |
| D-SIM-4 | Por ahora **solo el plan**; no se construye nada hasta aprobarlo |

## 1 · Resumen

Un simulador 3D que corre dentro de BitaFly (navegador del celular y app Android en el control),
con escenarios organizados en **5 niveles** (familiarización → maniobras → procedimientos normales
→ emergencias → misiones), **calificación automática** por competencias, **repetición 3D** para
el debriefing y **registro en Capacitación** como evidencia del programa de entrenamiento (PEP).
El tiempo de simulador **nunca** cuenta como horas de vuelo (V1).

**Costo de operación**: prácticamente cero. Corre en el equipo del usuario; solo se guardan
resultados y trazas comprimidas (en R2, unos KB por sesión). El costo real es de desarrollo.

---

## 2 · Arquitectura propuesta

```
packages/domain/src/sim/            ← lógica pura y probada (sin pantalla)
  flightModel.js                      dinámica, modos (GNSS/ATTI/Deportivo), límites
  environment.js                      viento, ráfagas, GNSS, brújula, enlace C2
  battery.js                          consumo, voltaje, umbrales configurables
  scenarioEngine.js                   disparadores de eventos por tiempo/posición/estado
  scoring.js                          métricas, rúbricas, competencias, aprobado
  replay.js                           grabación determinista (semilla + entradas)

src/app/(v2)/capacitacion/simulador/  ← interfaz (carga diferida, solo esta ruta)
  page.js                             catálogo de escenarios asignados y progreso
  [escenario]/page.js                 vuelo: escena 3D + HUD + controles
  debrief/[sesion]/page.js            repetición 3D + línea de tiempo + calificación
src/app/(v2)/capacitacion/administracion/simulador/   gestores: asignar, rúbricas, resultados

src/app/(v2)/api/capacitacion/simulador/  ← API (sesión, resultados, asignaciones)

android/…/SimControlsPlugin.java    ← complemento nativo: palancas físicas del control (Fase 6)
```

Reglas de la arquitectura:

1. **La 3D dibuja, el dominio decide.** El estado del vuelo lo calcula `packages/domain/sim`; la
   escena solo lo muestra.
2. **El servidor recalcula la nota.** El cliente envía semilla + entradas + versión; la API
   vuelve a simular y calcula el resultado. Así una nota no se puede alterar desde el navegador.
3. **Versionado**: cada sesión guarda la versión del modelo y del escenario. Cambiar la física no
   cambia notas ya emitidas.
4. **Carga diferida**: el motor 3D solo se descarga al entrar al simulador; el resto de BitaFly
   no se hace más pesado.

---

## 3 · Modelo de datos propuesto

Todas con `organization_id`, RLS y política en la misma migración (E4, E6). Borrador, se
ajusta en la Fase 4.

| Tabla | Contenido |
|---|---|
| `sim_aircraft_profiles` | Perfiles de aeronave: velocidades, autonomía, resistencia al viento. Base global + propios de la organización (C5) |
| `sim_scenarios` | Escenario: nivel, competencias, escena, condiciones (viento, hora, eventos), rúbrica (umbrales, eliminatorias), versión. Base global editable como plantilla (C1) + propios |
| `sim_assignments` | Qué escenarios debe completar quién (persona o rol), con recurrencia y fecha límite |
| `sim_sessions` | Cada intento: persona, escenario y versión, perfil, semilla, inicio/fin, dispositivo y tipo de control, resultado, puntaje por competencia, aprobado |
| `sim_session_events` | Eventos del intento (violación, emergencia activada, acción del piloto, tiempo de reacción) |
| `sim_reviews` | Revisión del instructor: comentario y, si aplica, decisión sobre el resultado (sin borrar el cálculo original) |
| Traza comprimida en R2 | Entradas + estado muestreado para la repetición 3D (mismo patrón que el Replay de vuelos) |

**Separación de datos operacionales (V1)**: ninguna de estas tablas alimenta `flights`, horas de
aeronave, ciclos de batería, tiempos de servicio (100.540), reportes a la Aerocivil ni
indicadores SPI.

---

## 4 · Catálogo inicial de escenarios (borrador para validar con instructores)

| Nivel | Escenario | Competencias | Criterios de aprobado (ejemplo, editables) |
|---|---|---|---|
| 0 | Conoce tus palancas | C-MAN | Completar el recorrido guiado |
| 0 | Lectura del HUD | C-SIT | Responder 5 preguntas en vuelo sobre altura, batería, distancia y enlace |
| 1 | Despegue y estacionario | C-MAN | 60 s en un círculo de 1 m, altura ±0,5 m |
| 1 | Cuadrado y ocho | C-MAN | Recorrido dentro del corredor, sin tocar conos |
| 1 | Órbita alrededor de un punto | C-MAN | Radio ±2 m, cámara apuntando al objeto |
| 1 | Aterrizaje de precisión | C-MAN | ≤ 0,5 m del punto, sin rebote |
| 1 | Vuelo en modo ATTI | C-MAN, C-AUT | Mantener posición con viento de 5 m/s sin GNSS |
| 2 | Vuelo completo según el MO | C-PRO, C-LIM | Checklist completo, punto de retorno configurado, sin violar límites |
| 2 | Operación dentro de la geocerca | C-LIM, C-SIT | Cero salidas del área; altura bajo el máximo |
| 3 | Batería crítica lejos del punto de despegue | C-EME, C-DEC | Regreso o aterrizaje alterno antes del aterrizaje forzado |
| 3 | Pérdida del enlace C2 | C-EME, C-AUT | Reconoce la pérdida y aplica el procedimiento de la organización |
| 3 | Pérdida de GNSS (paso a ATTI) | C-EME, C-MAN | No hay deriva peligrosa; aterriza en zona segura |
| 3 | Viento por encima del límite | C-DEC | Aborta o regresa según el límite de la organización |
| 3 | Interferencia de brújula | C-EME | Reacción correcta en el tiempo definido |
| 3 | Aeronave tripulada aproximándose | C-SIT, C-DEC | Desciende o se aparta en el tiempo definido |
| 3 | Persona entra al área de operación | C-SIT, C-DEC | Detiene la operación según el procedimiento |
| 4 | Inspección de estructura | C-MAN, C-SIT | Cubre los puntos de inspección sin colisión, distancia mínima respetada |
| 4 | Mapeo por cuadrícula | C-AUT, C-PRO | Misión automática supervisada; retoma el control al aviso |
| 4 | Búsqueda en área | C-SIT | Localiza el objetivo en el tiempo definido |

Todos los escenarios y umbrales se precargan como **plantilla editable**: cada organización ajusta
los umbrales a su MO y crea escenarios propios (C1, C3, C5).

---

## 5 · Fases

Tamaño relativo: **S** pequeño · **M** mediano · **L** grande. Cada fase termina solo cuando
cumple su puerta de verificación.

### Fase 0 — Verificación y prototipos de riesgo (M)

**Objetivo**: resolver lo incierto antes de construir. Nada de esto llega a producción.

| Entregable | Detalle |
|---|---|
| 0.1 Verificaciones externas | Las 9 de `45a` §9 (competencia, hardware, librerías, normativa), con fuente citada |
| 0.2 Prototipo de palancas del control | App Android de prueba en un RC Plus o RC Pro real: ¿se instala? ¿el MSDK entrega las palancas sin aeronave conectada? |
| 0.3 Prototipo de rendimiento 3D | Escena de prueba (terreno + dron + HUD) medida en 3 equipos: celular de gama media, celular de gama baja y el control |
| 0.4 Validación pedagógica | Sesión con el jefe de pilotos o un instructor del usuario: competencias (`45a` §4.2), niveles y catálogo (§4) |
| 0.5 Consulta normativa | Si es posible, consultar a la Aerocivil sobre el simulador como evidencia del PEP |

**Puerta de verificación**:
- [ ] Las 9 verificaciones con fuente; las que no se resuelvan quedan marcadas y con decisión tomada.
- [ ] Decisión escrita sobre el control: **palancas físicas** o **solo pantalla táctil**.
- [ ] El prototipo 3D da ≥ 30 cuadros por segundo en los 3 equipos; si no, se ajusta el alcance gráfico.
- [ ] Catálogo de escenarios y competencias aprobado por el usuario.
- [ ] Decisión registrada en `51-bitacora.md`.

### Fase 1 — Núcleo de vuelo en el dominio (M)

**Objetivo**: el modelo de vuelo completo, sin pantalla, probado.

| Entregable | Detalle |
|---|---|
| 1.1 `flightModel` | Ejes, modos GNSS/ATTI/Deportivo, inclinación y velocidades por perfil, frenado |
| 1.2 `environment` | Viento con ráfagas y gradiente; GNSS, brújula y enlace C2 con degradación y pérdida |
| 1.3 `battery` | Consumo según régimen y viento, umbrales configurables, aterrizaje forzado |
| 1.4 Automatismos | Retorno a casa (altura, ruta, cancelación), acción ante pérdida de enlace |
| 1.5 Determinismo | Paso fijo, semilla, grabar y reproducir entradas con resultado idéntico |
| 1.6 Perfiles base | 3–4 perfiles genéricos con parámetros de fichas técnicas públicas (con fuente) |

**Puerta de verificación**:
- [ ] Pruebas automáticas del dominio: frenado en GNSS vs deriva en ATTI con el mismo viento; autonomía de cada perfil dentro de ±10 % de su ficha; retorno a casa al umbral; misma semilla + entradas = mismo estado final.
- [ ] Ningún valor numérico de aeronave sin fuente (Q2).
- [ ] `npm run test:domain` en verde.

### Fase 2 — Escena 3D y controles en el celular (L)

**Objetivo**: volar en 3D desde el celular, con la sensación correcta.

| Entregable | Detalle |
|---|---|
| 2.1 Escena "campo de entrenamiento" | Terreno, conos, plataforma, obstáculos simples, cielo e iluminación |
| 2.2 Cámaras | Tercera persona (vista del piloto en tierra, la más fiel a VLOS), cámara del cardán y mapa |
| 2.3 HUD | Los datos de `100.415(a)(2)(iii)`, avisos de batería, enlace y límites; alto contraste |
| 2.4 Controles | Palancas táctiles modo 1/2, sensibilidad, gamepad Bluetooth, pantalla completa y horizontal |
| 2.5 Calidad adaptable | Perfiles alto/medio/bajo automáticos según el equipo |

**Puerta de verificación**:
- [ ] ≥ 30 cuadros por segundo en los 3 equipos de la Fase 0; descarga inicial ≤ 15 MB.
- [ ] 3 pilotos reales del usuario vuelan 10 min cada uno; ≥ 2 de 3 dicen que la respuesta "se parece" al dron real (anotado en la bitácora).
- [ ] Probado en Android e iPhone.

### Fase 3 — Pedagogía: niveles 0–1, calificación y debriefing (L)

**Objetivo**: que enseñe, no solo que vuele.

| Entregable | Detalle |
|---|---|
| 3.1 Motor de escenarios | Objetivos, instrucciones guiadas, disparadores, fin del ejercicio |
| 3.2 Escenarios niveles 0 y 1 | Los 7 del catálogo |
| 3.3 Calificación | `scoring`: métricas, rúbrica con eliminatorias, puntaje por competencia |
| 3.4 Debriefing | Repetición 3D con línea de tiempo, errores marcados y explicación |
| 3.5 Progresión | Desbloqueo de nivel por dominio |

**Puerta de verificación**:
- [ ] Pruebas del dominio: cada rúbrica aprueba un vuelo bueno grabado y reprueba uno malo grabado.
- [ ] El servidor recalcula la nota a partir de la traza y coincide con la del celular.
- [ ] Un instructor del usuario revisa 5 vuelos y está de acuerdo con la calificación en ≥ 4.

### Fase 4 — Integración con Capacitación (M)

**Objetivo**: que la práctica quede como evidencia en la organización.

| Entregable | Detalle |
|---|---|
| 4.1 Esquema | Tablas de §3 con RLS y migración en el repositorio |
| 4.2 Asignaciones | El gestor asigna escenarios por persona o rol, con recurrencia y fecha límite |
| 4.3 Cumplimiento | Estado del piloto (al día / pendiente / vencido) junto al de los exámenes |
| 4.4 Expediente y reporte | Resultados en el expediente del tripulante y un reporte PDF de entrenamiento en simulador |
| 4.5 Permisos | Funciones nuevas en `permissionsMatrix.js` y en `70-matriz-de-permisos.md` |
| 4.6 Revisión del instructor | Comentario y decisión sin borrar la nota calculada |

**Puerta de verificación**:
- [ ] Prueba de aislamiento: un usuario de otra organización no ve ni escribe nada (RLS).
- [ ] Un piloto no puede ver ni alterar los resultados de otro; el gestor sí ve los de su organización.
- [ ] Nada aparece en Bitácora, horas, tiempos de servicio ni reportes a la Aerocivil (V1).
- [ ] Pruebas de integración de la API en verde.

### Fase 5 — Procedimientos normales y emergencias: niveles 2–3 (L)

**Objetivo**: el núcleo de valor para la seguridad operacional.

| Entregable | Detalle |
|---|---|
| 5.1 Escenarios nivel 2 y 3 | Los 9 del catálogo |
| 5.2 Checklist real | El ejercicio usa la **lista de chequeo configurada por la organización** antes del despegue |
| 5.3 Límites de la organización | Altura máxima, viento máximo, batería mínima de aterrizaje tomados de su configuración |
| 5.4 Clima real opcional | Viento del módulo de Meteorología para practicar con las condiciones del día |
| 5.5 Conexión con SMS | Informe de qué emergencias fallan más en la organización (agregado, sin crear reportes automáticos — S3) |

**Puerta de verificación**:
- [ ] Cada emergencia probada en el dominio: disparo, reacción correcta, reacción tardía y omisión dan resultados distintos.
- [ ] Validación de un instructor sobre los procedimientos esperados en cada emergencia.

### Fase 6 — El control enterprise (M–L, según la Fase 0)

**Objetivo**: entrenar con el equipo que se usa en campo.

| Entregable | Detalle |
|---|---|
| 6.1 Complemento nativo | `SimControlsPlugin`: palancas físicas y botones (retorno a casa, pausa) vía MSDK, si la Fase 0 lo confirmó |
| 6.2 Alterno táctil | Si la Fase 0 lo descartó: palancas táctiles adaptadas a la pantalla del control |
| 6.3 Sin conexión | Escenarios descargados y resultados en cola hasta tener internet |
| 6.4 Exteriores | Ajustes de brillo, contraste y tamaño para la pantalla del control |
| 6.5 Distribución | Versión del APK publicada por el mecanismo de actualización existente |

**Puerta de verificación**:
- [ ] Vuelo completo de un escenario en un control real, sin internet, y sincronización posterior correcta.
- [ ] La latencia entre la palanca física y la respuesta se siente inmediata (≤ 100 ms medidos).

### Fase 7 — Misiones y escenarios de la organización (L)

| Entregable | Detalle |
|---|---|
| 7.1 Escenarios nivel 4 | Inspección, mapeo, búsqueda |
| 7.2 Editor de escenarios | La organización arma ejercicios: escena, condiciones, eventos y rúbrica |
| 7.3 Zona real (evaluación) | Practicar sobre la zona de una misión programada con relieve real, si las licencias lo permiten |

**Puerta de verificación**:
- [ ] Un gestor crea un escenario propio sin ayuda y un piloto lo completa.
- [ ] Licencias de datos de relieve e imagen documentadas antes de publicar 7.3.

### Fase 8 — Piloto con clientes y ajuste (M)

| Entregable | Detalle |
|---|---|
| 8.1 Prueba con 1–2 organizaciones | Uso real durante un mes |
| 8.2 Medición | Avance de los pilotos entre intentos, escenarios con más fallas, tiempo de uso |
| 8.3 Ajustes | Física, rúbricas y contenido según lo observado |
| 8.4 Decisión comercial | Plan en que se incluye o precio adicional; oferta para escuelas socias (Apéndice 4) |

**Puerta de verificación**: informe de la prueba en `51-bitacora.md` y decisión comercial del usuario.

---

## 6 · Orden y dependencias

```
F0 ──► F1 ──► F2 ──► F3 ──► F4 ──► F5 ──► F7 ──► F8
                      └────────────► F6 (puede ir en paralelo desde F3, depende de F0.2)
```

Primera entrega útil para los pilotos: **al cerrar F4** (niveles 0–1 registrados en
Capacitación). La de mayor valor para la seguridad operacional: **al cerrar F5**.

---

## 7 · No-objetivos

- Contar tiempo de simulador como horas de vuelo o experiencia reciente.
- Certificar el simulador ante la autoridad.
- Controlar un dron real o conectarse a uno en vuelo.
- Multijugador o varios drones en la misma escena.
- Simular cargas útiles especializadas (térmica radiométrica, LiDAR) más allá de una vista de cámara.
- Usar modelos, interfaces o marcas de un fabricante.

---

## 8 · Decisiones pendientes del usuario

| # | Pregunta | Cuándo |
|---|---|---|
| P-SIM-1 | ¿Qué controles enterprise tiene para la prueba de la Fase 0 (RC Plus, RC Pro u otro)? | Antes de F0 |
| P-SIM-2 | ¿Quién valida la parte pedagógica (jefe de pilotos, instructor externo, escuela socia)? | Antes de F0 |
| P-SIM-3 | ¿Qué modelos de aeronave usan sus clientes, para los primeros perfiles? | F0 |
| P-SIM-4 | ¿Se ofrece en todos los planes, solo en algunos o como servicio adicional? | F8 (se puede adelantar) |
| P-SIM-5 | ¿Se ofrece a las escuelas socias para el curso de piloto (Apéndice 4)? | F8 |
