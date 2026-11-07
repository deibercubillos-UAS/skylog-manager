# Simulador 3D de capacitación — investigación y análisis

[← Índice maestro](00-INDICE.md) · [Plan por fases](45-simulador-3d-plan.md) · [Reglas](01-reglas.md)

> **Estado: solo planeación (2026-11-07).** No se ha construido nada. Pedido del usuario: *"crear
> la planeación para realizar el simulador en 3D, enfocado en la capacitación del personal, que
> será usado desde el celular o desde el mismo control enterprise […] enfócate en la
> investigación y análisis […] no haremos nada aún"*.
>
> **Limitación declarada (V5):** esta sesión no tuvo acceso a internet (todas las consultas web
> fallaron por DNS). Lo que viene de fuentes externas —productos de la competencia, capacidades
> del hardware DJI, librerías— se escribió con conocimiento previo y va marcado **⚠️ VERIFICAR**.
> Verificarlo es la primera tarea de la Fase 0 del plan, antes de comprometer cualquier decisión.

---

## 1 · Qué es y qué no es

**Es** un entrenador de **procedimientos y criterio operacional** para el personal de un
explotador UAS: que el piloto practique en un entorno seguro lo que en campo es caro o peligroso
de practicar —emergencias, pérdida de enlace, viento, límites de la operación— y que la
organización tenga **evidencia** de esa práctica dentro de su programa de entrenamiento.

**No es**:

| No es | Por qué |
|---|---|
| Un simulador certificado | Nada en el RAC 100 analizado reconoce un simulador web; no se presenta como tal |
| Fuente de horas de vuelo | **Regla V1**: el tiempo en simulador nunca va a la Bitácora ni suma a las horas del piloto o de la aeronave. Se registra aparte, como entrenamiento |
| Un juego de carreras FPV | La fidelidad que importa es la **funcional** (cómo responde el dron y cómo debe responder el piloto), no la espectacularidad visual |
| Un reemplazo del simulador del fabricante | DJI tiene su propio simulador para pilotaje fino con el control real conectado a un PC ⚠️ VERIFICAR alcance actual. El nuestro se enfoca en procedimientos de la organización y se integra a su gestión |
| Un controlador del dron real | Nunca envía comandos a una aeronave. Misma línea que C2 (`42-comando-control.md` §4.10) |

---

## 2 · Contexto normativo

| Fuente | Qué dice / implica | Uso en el simulador |
|---|---|---|
| RAC 100, Apéndice 1, Parte D del MO | El MO del explotador incluye un **Programa de entrenamiento periódico (PEP)** (`11-rac100-uas.md`) | El simulador es una **herramienta del PEP**: escenarios asignables, recurrentes y con registro |
| MAUT-5.0-12-095, ítem 32 | "Entrenamiento continuo: programa, recurrencia, registros" (`14-listas-verificacion.md`) | Cada sesión deja **registro verificable** (quién, qué escenario, cuándo, resultado, versión del simulador) |
| RAC 100, Apéndice 4 | Programa del curso *Piloto UAS y Adiciones* — aplica a los **CIAC** (escuelas), no al explotador | Oportunidad comercial con escuelas socias (Panel Socio). Sin analizar todavía ⚠️ |
| `100.415(a)(2)(iii)` | Datos que el software de control muestra en todo momento: actitud, posición, rumbo, velocidades, altura, energía, calidad del enlace C2, video | El HUD del simulador muestra **exactamente esos datos**: el piloto entrena leyendo lo que verá en campo |
| RAC 219 / SMS (`10-rac219-sms.md`) | Instrucción y competencia del personal en seguridad operacional | Los escenarios de emergencia se conectan con los peligros del SMS de la organización |
| Regla V1 del proyecto | Nunca se fabrican datos operacionales | Datos del simulador en tablas propias, nunca en `flights`, horas de aeronave ni reportes a la Aerocivil |

**Referencias de diseño instruccional (no vinculantes)**: el enfoque de la OACI de
**entrenamiento y evaluación basados en competencias (CBTA)** y el manual de RPAS de la OACI
proponen describir el entrenamiento como competencias observables evaluadas con criterios
explícitos ⚠️ VERIFICAR documento y edición exactos. Se adopta como **modelo de diseño**, sin
afirmar cumplimiento formal.

> **Pendiente normativo**: confirmar con la Aerocivil (o con un inspector) si un registro de
> entrenamiento en simulador **se acepta como evidencia** dentro del PEP de un explotador. Hasta
> confirmarlo, la plataforma lo presenta como "registro de práctica", sin prometer que la
> autoridad lo valide (C4: recomendación explicada, no imposición).

---

## 3 · Referentes de mercado — qué aprender de cada uno

Sin verificación en línea en esta sesión: características y precios ⚠️ VERIFICAR todos.

| Producto | Qué es | Lección para BitaFly |
|---|---|---|
| **DJI Flight Simulator** (versión Enterprise) | Simulador de PC con el control DJI real conectado; modelos de aeronaves DJI; escenarios industriales (inspección, búsqueda y rescate) | La **transferencia** mejora cuando el piloto usa el mismo control y ve una interfaz parecida a la de campo. Es de pago y requiere PC |
| **Zephyr Drone Simulator** | Simulador educativo con lecciones guiadas, calificación automática y panel del instructor (orientado a currículos de EE. UU.) | El valor para una organización está en el **panel del instructor + calificación objetiva**, no solo en volar |
| **RealFlight / Liftoff / DRL** | Simuladores recreativos y de FPV | La física convincente engancha, pero sin estructura pedagógica no sirve para un PEP |
| **AirSim / Colosseum** (código abierto, investigación) | Simulación fotorrealista para investigación de autonomía | Demasiado pesado para un celular; útil como referencia de modelos de vuelo y sensores |

**Hueco que nadie cubre** (a confirmar en Fase 0): un simulador que corra **en el celular o en
el control enterprise**, **en español**, alineado con el **RAC 100**, con los **procedimientos y
checklists propios de la organización** y cuyos resultados caigan en el **expediente de
capacitación** y en el **SMS** del explotador. El diferencial no es la gráfica, es la integración.

---

## 4 · Pedagogía — qué hace que un simulador enseñe

### 4.1 Principios

| # | Principio | Cómo se traduce |
|---|---|---|
| P1 | **Aprendizaje por escenarios** | Cada ejercicio es una situación operacional con objetivo, contexto y condiciones, no un "vuelo libre" |
| P2 | **Práctica deliberada** | Ejercicios cortos (3–8 min), enfocados en una competencia, repetibles |
| P3 | **Dominio antes de avanzar** | Un nivel se desbloquea al aprobar el anterior con el criterio definido |
| P4 | **Retroalimentación inmediata y debriefing** | Alertas en vuelo + repetición 3D al final con la línea de tiempo de eventos y errores |
| P5 | **Fallar es seguro y enseña** | Estrellarse o salirse de la geocerca no "castiga": explica qué pasó y por qué |
| P6 | **Fidelidad funcional sobre visual** | Se prioriza que el viento, la batería, el enlace y los modos se comporten como en campo |
| P7 | **Objetividad de la evaluación** | Métricas calculadas por el sistema (S2), con rúbricas visibles antes de empezar |
| P8 | **El instructor decide** | El sistema propone la calificación; el gestor puede revisar y comentar (análogo a S3) |
| P9 | **Contenido de la organización** | Escenarios y rúbricas precargados como plantilla editable (C1, C3, C5) |

### 4.2 Competencias a entrenar (borrador para validar con instructores)

| Código | Competencia | Ejemplos observables |
|---|---|---|
| **C-MAN** | Control manual de la aeronave | Estacionario estable, altura constante, giros coordinados, aterrizaje de precisión |
| **C-PRO** | Aplicación de procedimientos | Checklist previo completo, despegue y aterrizaje según el MO, punto de retorno configurado |
| **C-SIT** | Conciencia situacional | Vigila batería, distancia, altura y enlace; detecta tránsito o personas a tiempo |
| **C-LIM** | Respeto de límites operacionales | Sin exceder altura máxima, área autorizada ni distancia VLOS |
| **C-EME** | Gestión de emergencias | Reacción correcta y oportuna ante batería crítica, pérdida C2, pérdida GNSS, viento fuerte |
| **C-DEC** | Toma de decisiones | Abortar a tiempo, elegir zona de aterrizaje alterna, no continuar fuera de condiciones |
| **C-AUT** | Uso de automatismos | Uso correcto del retorno a casa, modos de vuelo, misiones automáticas, y saber retomar el control |

### 4.3 Progresión en niveles

| Nivel | Nombre | Para quién | Contenido |
|---|---|---|---|
| 0 | Familiarización | Todos | Controles (modo 1/2), lectura del HUD, modos de vuelo, cámara y cardán |
| 1 | Maniobras básicas | Pilotos nuevos | Despegue, estacionario, traslación, cuadrado, ocho, órbita, aterrizaje de precisión |
| 2 | Procedimientos normales | Todos los pilotos | Vuelo completo con checklist de la organización, punto de retorno, límites del área |
| 3 | Procedimientos anormales y emergencias | Todos, recurrente | Batería crítica, pérdida C2, pérdida GNSS (ATTI), viento por encima del límite, interferencia magnética, intrusión en geocerca, aeronave tripulada, persona en el área |
| 4 | Misiones | Según la operación | Inspección de estructura, mapeo por cuadrícula, búsqueda, aspersión (si aplica a la organización) |

### 4.4 Evaluación

- **Métricas objetivas** por escenario: error medio de posición en estacionario, desviación de
  altura, distancia de aterrizaje al punto, tiempo, violaciones de límites (altura, área,
  distancia), tiempo de reacción ante la emergencia, acción tomada (correcta / incorrecta /
  tardía), batería al aterrizar.
- **Rúbrica por escenario**: cada métrica tiene umbral de aprobado; algunas son **eliminatorias**
  (salir del área autorizada, aterrizar con batería por debajo del mínimo de la organización).
- **Resultado**: aprobado / no aprobado + puntaje por competencia + observaciones.
- **Debrief**: repetición 3D con línea de tiempo marcada (eventos, errores, decisiones).
- **Revisión del instructor** opcional, con comentario, sin borrar el cálculo original.
- **Determinismo**: misma semilla + mismas entradas = mismo vuelo. Permite volver a calcular la
  nota, repetir el vuelo exacto en el debrief y detectar resultados manipulados.

---

## 5 · Modelo de vuelo — qué simular y con qué detalle

Criterio: simular con detalle **lo que cambia una decisión del piloto**; simplificar el resto.

| Elemento | Por qué importa en capacitación | Detalle propuesto |
|---|---|---|
| Dinámica de multirrotor | Sensación de control | Modelo de respuesta de primer/segundo orden por eje (velocidad objetivo según palancas, inclinación máxima, aceleración limitada). No se simulan motores ni aerodinámica fina |
| **Modos de vuelo** | Es donde más falla el piloto real | **Posicionamiento GNSS** (frena al soltar palancas), **ATTI** (deriva con el viento, no frena), **Deportivo** (más velocidad, más distancia de frenado). Velocidades por perfil de aeronave |
| **Viento** | Causa frecuente de incidentes | Viento medio + ráfagas + gradiente con la altura. Desde el escenario o desde el módulo de Meteorología |
| **Batería** | Decisión de regresar a tiempo | Consumo según estacionario, velocidad, ascenso y viento; caída de voltaje; umbrales de aviso y aterrizaje forzado **configurables** como en el control real |
| **Enlace C2** | Pérdida de señal es un caso del SMS | Calidad según distancia y obstáculos; acción ante pérdida configurable (regreso, estacionario, aterrizaje) |
| **GNSS / brújula** | Paso inesperado a ATTI | Pérdida o degradación programada por el escenario; aviso de interferencia magnética |
| Retorno a casa | Automatismo que hay que conocer | Altura de retorno, ruta recta, aterrizaje; cancelable por el piloto |
| Sensores de obstáculos | Confianza excesiva en ellos | Detección frontal/lateral simplificada con avisos; pueden desactivarse por escenario |
| Límites | C-LIM | Altura máxima, geocerca, distancia VLOS; aviso y registro de la violación |
| Colisiones | Consecuencia | Contra terreno, estructuras y árboles con volúmenes simples; termina el ejercicio con explicación |
| Cámara y cardán | Misiones de inspección | Inclinación del cardán, zoom simple, vista FPV |

**Perfiles de aeronave**: parámetros por modelo (velocidades, autonomía, resistencia al viento,
peso) tomados de las **fichas técnicas públicas** de los equipos que usan los clientes (p. ej.
multirrotores enterprise de clase M30/M350/M3E) ⚠️ VERIFICAR valores. Nombres por función, no
por marca, en el catálogo base (regla N2); la organización puede crear sus propios perfiles a
partir de sus aeronaves registradas (C5).

**Arquitectura del modelo**: lógica **pura y probada** en `packages/domain` (regla Q2), con paso
de tiempo fijo (p. ej. 60 Hz) y generador aleatorio con semilla. La parte 3D solo dibuja el
estado; nunca decide la física. Eso permite probar el modelo sin pantalla y recalcular notas.

---

## 6 · Plataforma técnica

### 6.1 Motor 3D

| Opción | A favor | En contra |
|---|---|---|
| **Three.js + React Three Fiber** | El proyecto ya es React 19/Next; ecosistema enorme; control total del rendimiento | Hay que armar más piezas (cámaras, HUD, carga de modelos) |
| Babylon.js | Motor completo (física, GUI, inspector) | Otra forma de trabajo fuera de React; más peso |
| CesiumJS | Terreno y globo reales | Pesado para celular; terreno de calidad atado a un servicio de pago ⚠️ VERIFICAR |
| Unity WebGL | Herramientas maduras | Paquetes de decenas de MB, arranque lento en celular, otra pila tecnológica |

**Recomendación**: **Three.js con React Three Fiber**, cargado solo en la ruta del simulador
(no aumenta el peso del resto de la aplicación). Compatibilidad exacta de versiones con
React 19 ⚠️ VERIFICAR en Fase 0.

### 6.2 Escenarios: construidos vs. terreno real

| Opción | A favor | En contra |
|---|---|---|
| **Escenarios construidos** (campo de entrenamiento, subestación, torre, cultivo, zona urbana baja) | Livianos, controlables, iguales para todos (evaluación justa) | No es el sitio real del cliente |
| Terreno real (relieve + imagen satelital) | Practicar en la zona de la misión programada | Datos de relieve abiertos existen; la **imagen satelital** tiene licencias y límites de uso que hay que revisar; más peso |

**Recomendación**: empezar con **escenarios construidos** (Fases 2–5) y evaluar el terreno real
como fase posterior (Fase 7), usando la zona ya dibujada en Programación. Licencias de imagen
⚠️ VERIFICAR antes de comprometerlo.

### 6.3 Física y colisiones

Modelo de vuelo **propio** (sección 5, en el dominio). Colisiones con volúmenes simples y rayos;
no se necesita un motor de física completo. Si hiciera falta, Rapier (WASM) es la opción liviana
⚠️ VERIFICAR.

### 6.4 Recursos gráficos

Modelos 3D **propios o con licencia libre** (p. ej. CC0), comprimidos para web. **No se copian**
modelos, íconos ni pantallas de un fabricante (riesgo de marca e infracción). El HUD imita la
**disposición** funcional que el piloto conoce (para que el entrenamiento se transfiera), con
diseño propio de BitaFly.

---

## 7 · Dispositivos y controles

### 7.1 Celular (Android e iPhone)

- **Palancas táctiles** en pantalla, modo 1 y modo 2 configurables (modo 2 por defecto ⚠️
  VERIFICAR costumbre local), sensibilidad ajustable.
- **Control Bluetooth tipo gamepad** opcional (estándar Gamepad del navegador).
- Inclinación del teléfono como control: **no recomendada** (no se parece al control real).
- Pantalla horizontal y completa; aviso si el teléfono está vertical.

### 7.2 Control enterprise (RC Plus / RC Pro y equivalentes)

Supuestos a comprobar con hardware real en Fase 0 (todos ⚠️ VERIFICAR):

1. Estos controles corren **Android** y permiten **instalar aplicaciones de terceros**: la app de
   BitaFly (la misma de Capacitor) podría instalarse en el control.
2. Las **palancas físicas** no se exponen como un gamepad estándar a otras aplicaciones; leerlas
   requiere el **SDK móvil de DJI (MSDK v5)** dentro de un complemento nativo de la app. Hay que
   confirmar si el SDK entrega los valores de las palancas **sin aeronave conectada**.
3. Si (2) no es posible: en el control se usan las **palancas táctiles** de su pantalla. Se
   pierde parte de la transferencia, pero el entrenamiento de procedimientos sigue sirviendo.

**Esto es el mayor riesgo técnico del plan** y por eso es la primera prueba de la Fase 0: decide
si "usar el mismo control" significa palancas físicas o solo la pantalla del control.

### 7.3 Presupuesto de rendimiento (objetivos iniciales)

| Medida | Objetivo |
|---|---|
| Cuadros por segundo | 60 en gama media; mínimo aceptable 30 |
| Descarga inicial del simulador | ≤ 15 MB; escenarios bajo demanda |
| Tiempo hasta poder volar | ≤ 8 s en 4G en gama media |
| Consumo | Modo de ahorro (menos sombras y efectos) automático con batería baja o equipo lento |
| Sin conexión | El simulador y los escenarios descargados funcionan sin internet; los resultados se sincronizan después (reutiliza el patrón de `OfflineSync`) |
| Exteriores | HUD de alto contraste, legible al sol en la pantalla del control |

---

## 8 · Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Las palancas físicas del control no se pueden leer | Alto | Prueba con hardware en Fase 0; plan alterno con palancas táctiles |
| Bajo rendimiento en celulares de gama baja o en el control | Alto | Presupuesto de rendimiento desde la Fase 2, perfiles de calidad, pruebas en 3 equipos reales |
| Física poco creíble ("no se siente como el dron") | Medio | Validación con pilotos reales; parámetros por perfil; ajustes en ciclos cortos |
| Que se use como "horas de vuelo" | Alto (regulatorio) | Tablas separadas, rótulos claros, nada llega a Bitácora ni a reportes oficiales (V1) |
| Contenido pedagógico débil | Alto | Validar competencias, escenarios y rúbricas con el jefe de pilotos / instructores antes de construirlos |
| Licencias de imagen satelital o de modelos | Medio | Escenarios construidos primero; solo recursos con licencia verificada |
| Alcance que crece sin control | Medio | Fases con puerta de verificación y no-objetivos explícitos (plan §7) |

---

## 9 · Verificaciones pendientes para la Fase 0

1. Capacidades actuales de DJI Flight Simulator, Zephyr y competidores; precios.
2. Instalación de aplicaciones de terceros en RC Plus / RC Pro y versión de Android.
3. Lectura de palancas con MSDK v5 sin aeronave conectada; requisitos de registro de app DJI.
4. Compatibilidad de React Three Fiber con React 19 / Next 15.
5. Fichas técnicas de los modelos de aeronave de los clientes (velocidades, autonomía, viento).
6. Documento OACI de referencia para competencias de pilotos RPAS (edición vigente).
7. Aceptación por la Aerocivil del registro de simulador como evidencia del PEP.
8. Costumbre local de modo de palancas (modo 1 / modo 2).
9. Licencias de datos de relieve e imagen satelital para la fase de terreno real.
