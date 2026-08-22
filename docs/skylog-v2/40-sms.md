# Módulo SMS

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 5. F3 — SMS fácil de integrar y aplicar

> 📄 **Investigación completa en `docs/investigacion-sms-rac219-bitafly.md`** (2026-08-22):
> marco de 4 componentes / 12 elementos verificado literal contra el catálogo oficial, cobertura
> real de BitaFly elemento por elemento, y el hallazgo central — la autoevaluación GAP declara
> **99 % de cumplimiento** mientras la tabla de datos mensuales de indicadores tiene **cero
> filas**. Ese documento manda sobre lo que sigue en esta sección.

### 5.1 Diagnóstico honesto

El SMS de BitaFly **no está incompleto — está desconectado**. Tiene 9 pestañas, matriz de riesgo
5×5, SPI con fórmula oficial, GAP de 100 preguntas, acciones correctivas de 3 fuentes, VOR/MOR
con línea de tiempo, capacitación. Es más completo que el de muchos competidores.

El problema es que **exige que alguien ya sepa hacer SMS**. Una organización que arranca ve 9
pestañas vacías y no sabe por dónde empezar. Y los datos operacionales que la app ya tiene
(alertas del import DJI, mantenimientos vencidos, exámenes reprobados) **no alimentan el SMS
automáticamente** — un humano tiene que darse cuenta y transcribir.

"Fácil de integrar y aplicar" = resolver esas dos cosas.

### 5.2 Asistente de implantación por fases

Un wizard que lleva a la organización de cero a "SMS aceptado por la Aerocivil", alineado con
RAC 219 y las directivas MAUT-1.0-22-006 (aceptación del SMS) y MAUT-1.0-22-007.

Fases con % de avance visible, cada una desbloqueando la siguiente:
1. **Política y objetivos** — designar Gerente de Seguridad Operacional (valida 100.545(d):
   formación acreditada, curso avanzado, ≥1 año de experiencia), política firmada, alcance.
2. **Gestión del riesgo** — matriz + tolerabilidad (hoy se siembra OACI Doc 9859, se conserva) +
   **catálogo de peligros precargado por tipo de operación**.
3. **Aseguramiento** — ≥3 SPI activos con datos de al menos 3 meses, primera autoevaluación GAP.
4. **Promoción** — cronograma de capacitación SMS con asistencia registrada, MSMS publicado.
5. **Listo para aceptación** — expediente descargable con toda la evidencia.

### 5.3 Plantillas reales, no ejemplos vacíos

Hoy existe `EXAMPLE_INDICATORS` (6 indicadores tipo). Se extiende a **paquetes por tipo de
operación** (las 10 categorías oficiales de `lib/missionTypes.js`): peligros típicos, barreras
sugeridas, SPI recomendados y umbrales de referencia. El usuario los adopta, edita o descarta —
**nunca se fabrican datos operacionales**, solo definiciones, exactamente como se hizo con
`EXAMPLE_INDICATORS`.

### 5.4 SMS alimentado por la operación (el cambio de fondo)

Cada uno de estos eventos, que la app **ya detecta hoy y solo notifica**, pasa a generar un
**borrador de reporte SMS** con su peligro sugerido, pendiente de que el gerente SMS lo confirme
o descarte:

| Evento ya detectado | Origen actual | Peligro sugerido |
|---|---|---|
| Alertas en log DJI (`hasAlerts`) | `import-dji` | Falla de sistema en vuelo |
| Batería sobre umbral de retiro (200 ciclos) | Escáner del dashboard | Falla de energía |
| Mantenimiento mayor/menor vencido | Cron diario | Aeronavegabilidad |
| Examen de capacitación reprobado/vencido | `training-exam-reminder` | Competencia del personal |
| **Geocerca violada** (nuevo, F2) | `c2-gateway` | Incursión en espacio aéreo |
| **Pérdida/degradación de enlace C2** (nuevo, F2) | `c2-gateway` | Pérdida de mando y control |
| **Exceso de tiempo de servicio** (nuevo, F5) | Motor de tiempos | Fatiga del piloto |

Esto convierte el SMS de "formulario que alguien debe recordar llenar" en "bandeja de entrada de
lo que realmente pasó". Es el mayor salto de valor de todo el frente.

> Nota de diseño: el borrador **nunca** se convierte en reporte automáticamente. Un reporte de
> seguridad operacional con consecuencias regulatorias siempre lo confirma una persona. El
> sistema solo evita que se pierda.

### 5.5 Reporte mensual consolidado (cierra B3)

`100.535(a)(26)` exige un único envío mensual, en los primeros 5 días hábiles, con estadística
de operaciones + indicadores SPI + reportes MOR. Hoy son tres cosas separadas. Se unifica en un
**paquete mensual** con acuse de envío (reutilizando el patrón ya probado de
`aerocivil_monthly_reports` + su cron recordatorio).

### 5.6 MSMS como documento vivo

Hoy el MSMS es un archivo que alguien sube a Manuales. Propuesta: generarlo desde la
configuración real (política, matriz vigente, SPI activos, estructura de cargos, cronograma de
capacitación), versionado, con el histórico de acuses que Manuales ya maneja. El archivo subido
sigue siendo válido para quien lo prefiera — se añade una vía, no se quita ninguna.

---

## 5.7 Quién reporta y quién analiza (decisión 2026-08-22)

> *"El MOR y VOR debe ser diligenciado por cualquier persona, pero el asignado para análisis y
> toma de datos es el Gerente SMS."*

Separa dos cosas que hoy se confunden en la plataforma actual, donde el mismo permiso
(`canManageSMS`) gobierna todo el ciclo:

| Etapa | Quién | Nota |
|---|---|---|
| **Diligenciar** el reporte | **Cualquier persona** — tripulante, personal de tierra, contratista, tercero | Los formularios públicos por organización ya lo permiten sin cuenta. No se restringe |
| **Analizar** y tomar los datos | **Gerente SMS**, como responsable asignado | Es el rol que clasifica severidad, investiga, decide acciones y cierra el caso |

Consecuencias de diseño:

1. **La entrada es abierta por diseño, no por descuido.** Restringir quién puede reportar
   contradice el propio descriptor de madurez del ítem 1.1.1 de
   [`15-evaluacion-sms.md`](15-evaluacion-sms.md), que en nivel *Eficaz* pide que **terceros —
   socios, proveedores y contratistas— puedan notificar**.
2. **El análisis tiene dueño nominal.** No es "quien tenga el permiso": es el Gerente SMS
   designado, la misma persona cuyo expediente se construye
   ([`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) §3). Un caso sin analista
   asignado es un caso sin dueño.
3. **La confidencialidad se define en el borde entre las dos etapas.** Quien reporta puede
   pedir confidencialidad; quien analiza necesita ver el contenido. Es ahí donde se aplica la
   protección de `219.115`–`219.140` (regla **S4**), no en el formulario de entrada.
4. El Gerente SMS puede delegar la ejecución de acciones correctivas, pero **la toma de datos y
   el análisis quedan asignados a él** — es lo que la decisión fija.

---

