# Autorizaciones de vuelo ante la Aerocivil

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 6. F4 — Autorizaciones de vuelo ante la Aerocivil

### 6.1 Lo que dice la norma, textualmente

`100.805(a)`: la solicitud se presenta **"por medio de la Plataforma UAS Colombia"** adjuntando:
(1) certificado de vigencia de la póliza RCE, (2) **archivo KML** del área de operación,
(3) **matriz de análisis y mitigación de riesgos en el formato establecido por la Aerocivil**,
(4) autorización para espacios restringidos y ZNVD (trámite ante la FAC).

Antelación: **15 días hábiles** en espacio aéreo controlado; **10 días hábiles** en corredores
BVLOS. Y `100.810(b)`: **no se puede volar hasta tener la autorización**.

### 6.2 El problema y la respuesta honesta

La Plataforma UAS Colombia **no publica una API**. Automatizar la radicación implica RPA
(automatización del navegador) contra un portal de la autoridad aeronáutica, con custodia de
credenciales del cliente. Es frágil por definición: un cambio de maquetado del portal rompe la
integración, y un captcha la detiene.

**El repo ya tiene el precedente exacto**: `railway-robot/` (Express + Playwright automatizando
el portal de la Aerocivil). Existe, funciona, y también demuestra el costo de mantenerlo.

Por eso el frente se parte en dos entregables independientes, y el primero da el 80% del valor
sin ningún riesgo externo:

### 6.3 Fase 4a — Expediente listo para radicar (sin dependencia externa)

Un botón "Preparar expediente Aerocivil" en cada misión programada que genera un paquete
completo y validado:

- ✅ **Archivo KML** (no KMZ) del área — cierra B9. Es un cambio menor en `lib/flightPlanDocs.js`.
- ⚠️ **Matriz de riesgos en el formato de la Aerocivil** — **el formato oficial aún no es
  público** (confirmado 2026-08-22). No se puede replicar lo que no se conoce. Solución
  adoptada: el generador se construye con **capa de plantilla intercambiable** — el contenido
  (peligros, probabilidad, gravedad, mitigaciones, riesgo residual) se deriva de la evaluación
  SORA y de la matriz SMS que la organización ya tiene, y la **presentación** vive en una
  plantilla aparte. Cuando la Aerocivil publique el formato, se sustituye la plantilla sin tocar
  la lógica. Mientras tanto se emite una matriz propia, completa y trazable, que el explotador
  transcribe al formato oficial cuando exista. Convierte un bloqueo en un retraso de formato,
  no de funcionalidad.
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

### 6.4 Fase 4b — Radicación asistida (condicional)

Sólo si 4a está estable y el usuario lo autoriza expresamente:

- Servicio `aerocivil-agent` (mismo runtime que `c2-gateway`, patrón `railway-robot`).
- **Nunca almacena la contraseña del cliente en claro ni de forma reutilizable por el sistema**:
  cifrado con clave gestionada, uso auditado en `audit_log`, revocable por el usuario en
  cualquier momento, y consentimiento explícito por escrito antes del primer uso.
- **Modo asistido antes que automático**: el agente prellena el formulario y **se detiene para
  que el humano revise y confirme el envío**. La radicación automática sin supervisión solo se
  considera después de un histórico de confiabilidad demostrado.
- Detección de cambios del portal con alerta al equipo, en vez de fallar en silencio.

> **Decisión pendiente del usuario** (§11): si prefiere 4a sola (recomendado para v2) o
> comprometer 4b desde el inicio.

---
