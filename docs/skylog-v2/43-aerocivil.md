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
- ✅ **Matriz de riesgos en el formato oficial de la Aerocivil — resuelto (2026-09-06)**: el
  formato SÍ se consiguió — es `MAUT-5.0-12-055` (libro Excel oficial v01, aprobado 07/11/2023,
  documentado en detalle en [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md)). La
  nota "aún no es público" (2026-08-22) quedó superada por la obtención posterior de ese
  documento — no hay contradicción real, solo dos estados del proyecto en momentos distintos.
  Se descarta la capa de plantilla intercambiable: al ser un formato fijo (regla C2), se
  construye directo contra el catálogo de 24 peligros + matriz de probabilidad/severidad/
  tolerabilidad oficiales — sin derivarlo de la matriz SMS interna (regla C3, configurable),
  que es un instrumento distinto y no debe conflarse (`18-analisis-riesgos-vuelo.md` R1).
- ✅ **Certificado de vigencia de póliza RCE** — vive en `insurance_policies` (decisión 157) y el
  checklist valida que cubra **todo el periodo** de la solicitud, aeronave por aeronave
  (`100.410(a)(2)(i)`), y avisa si la póliza no tiene certificado adjunto (decisión 158).
- ✅ **Antelación** (B10) — **corrección 2026-10-06 (decisión 166)**: figuraba ✅ pero en V2 no existía. Ahora el
  checklist cuenta los **días hábiles colombianos** (con festivos) entre hoy y el inicio del periodo y compara con
  15 (espacio aéreo controlado) y 10 (corredores BVLOS); como no se sabe el tipo de espacio, informa ambos umbrales.
  Informativo: no impide programar.
- ✅ **Checklist de completitud** (informativo, no bloquea firmar ni radicar; `GET /api/aerocivil/readiness`):
  póliza RCE (decisión 157/158) · **CDO-U vigente durante todo el periodo** · **antelación** · **aeronaves con número
  de registro RUAS**. Sigue sin construir **CIPU y adiciones del PIC** (`100.810(d)`): la solicitud es una campaña
  sin piloto asignado, así que el ítem pertenece a la misión programada, no a la solicitud.
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
