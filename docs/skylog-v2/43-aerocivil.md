# Autorizaciones de vuelo ante la Aerocivil

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> **Revisado 2026-08-22.** Corrección real: el "formato oficial de la matriz de riesgos" que
> §6.3 daba por no público **ya se obtuvo y se analizó** — es `MAUT-5.0-12-055`
> ([`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md)). Deja de ser una plantilla
> intercambiable por necesidad y pasa a ser **el formato real que se emite**. También se
> actualiza la decisión de alcance de F4b, ya cerrada.

---

## 1 · F4 — Autorizaciones de vuelo ante la Aerocivil

### 1.1 Lo que dice la norma, textualmente

`100.805(a)`: la solicitud se presenta **"por medio de la Plataforma UAS Colombia"** adjuntando:
(1) certificado de vigencia de la póliza RCE, (2) **archivo KML** del área de operación,
(3) **matriz de análisis y mitigación de riesgos en el formato establecido por la Aerocivil**,
(4) autorización para espacios restringidos y ZNVD (trámite ante la FAC).

Antelación: **15 días hábiles** en espacio aéreo controlado; **10 días hábiles** en corredores
BVLOS. Y `100.810(b)`: **no se puede volar hasta tener la autorización**.

### 1.2 El problema y la respuesta honesta

La Plataforma UAS Colombia **no publica una API**. Automatizar la radicación implica RPA
(automatización del navegador) contra un portal de la autoridad aeronáutica, con custodia de
credenciales del cliente. Es frágil por definición: un cambio de maquetado del portal rompe la
integración, y un captcha la detiene.

**El repo ya tiene el precedente exacto**: `railway-robot/` (Express + Playwright automatizando
el portal de la Aerocivil). Existe, funciona, y también demuestra el costo de mantenerlo.

Por eso el frente se parte en dos entregables independientes, y el primero da el 80% del valor
sin ningún riesgo externo:

### 1.3 Fase 4a — Expediente listo para radicar (sin dependencia externa)

Un botón "Preparar expediente Aerocivil" en cada misión programada que genera un paquete
completo y validado:

- ✅ **Archivo KML** (no KMZ) del área — cierra B9. Es un cambio menor en `lib/flightPlanDocs.js`.
- ✅ **Matriz de riesgos en el formato exacto de la Aerocivil** — **resuelto**: es
  `MAUT-5.0-12-055`, obtenido y analizado en
  [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md). Deja de ser una plantilla
  intercambiable a la espera de un formato desconocido — la entidad `risk_analyses`
  ([`31-esquema-datos.md`](31-esquema-datos.md) §3) ya se diseñó para emitir **ese** formato:
  24 peligros fijos + libres, matriz de tolerabilidad de la autoridad (no la del SMS interno de
  la organización, que es distinta a propósito — ver [`18`](18-analisis-riesgos-vuelo.md) §5),
  firma del Jefe de Pilotos. Diez de los 24 peligros son computables con datos que el sistema ya
  tiene ([`18`](18-analisis-riesgos-vuelo.md) §5, tabla de preguntas resueltas solas) — el mayor
  ahorro de trabajo manual de todo este frente.
- ✅ **Certificado de vigencia de póliza RCE** — ya vive en `insurance_policies`; se adjunta y se
  valida que cubra la fecha de operación y el serial de la UA (`100.410(a)(2)(i)`).
- ✅ **Validación previa de antelación** (B10): si faltan menos de 15 días hábiles y la zona es
  espacio aéreo controlado, se advierte antes de dejar programar. Mismo patrón del aviso de
  conflicto de agenda del PIC, que ya existe.
- ✅ **Checklist de completitud**: CDO-U vigente, CIPU y adiciones del PIC vigentes para el tipo
  de operación (`100.810(d)`), aeronave registrada, póliza vigente. Un solo semáforo.
- ✅ Seguimiento de estado del trámite (radicado, en revisión, autorizada, negada) con el número
  de autorización — extendiendo `flight_authorizations.aerocivil_auth_number`, que ya existe.

Esto elimina el 80% del trabajo manual y **no depende de que la Aerocivil no cambie nada**.

### 1.4 Fase 4b — Radicación asistida

Sólo si 4a está estable y el usuario lo autoriza expresamente:

- Servicio `aerocivil-agent` (mismo runtime que `c2-gateway`, patrón `railway-robot`).
- **Nunca almacena la contraseña del cliente en claro ni de forma reutilizable por el sistema**:
  cifrado con clave gestionada, uso auditado en `audit_log`, revocable por el usuario en
  cualquier momento, y consentimiento explícito por escrito antes del primer uso.
- **Modo asistido antes que automático**: el agente prellena el formulario y **se detiene para
  que el humano revise y confirme el envío**. La radicación automática sin supervisión solo se
  considera después de un histórico de confiabilidad demostrado.
- Detección de cambios del portal con alerta al equipo, en vez de fallar en silencio.

**Decisión ya cerrada** ([`51-bitacora.md`](51-bitacora.md), decisión 6): el usuario eligió
comprometer **F4a + F4b desde el inicio**, con F4b como último en el orden de ejecución por ser
el de mayor riesgo de responsabilidad ([`50-hoja-de-ruta.md`](50-hoja-de-ruta.md) §4).

---

---

*Actualizado: 2026-08-22.*
