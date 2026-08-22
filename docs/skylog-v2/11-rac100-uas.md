# RAC 100 — análisis y brechas

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 1. Análisis del RAC 100 actualizado — brecha real contra lo que BitaFly tiene hoy

Leí la norma completa (resolución que modifica integralmente el RAC 100). Estos son los
hallazgos que **obligan** trabajo nuevo, no los que ya cubrimos.

### 1.1 Lo que ya está cubierto (no requiere acción)

Registro UAS, bitácora de vuelo y de mantenimiento (100.535(a)(4)), programa de mantenimiento
(a)(3), documentación de trabajos de mantenimiento con histórico y responsable (a)(6), SORA /
análisis de riesgos por operación (a)(25), SMS con matriz de riesgos, SPI, GAP y acciones
correctivas (a)(18), manuales MO/MCM/MSMS como repositorio versionado con acuse de lectura
(100.550), capacitación y verificaciones de competencia (a)(8), pólizas RCE (100.410(a)(2)),
designación de Jefe de Pilotos y Gerente de Seguridad Operacional (100.545), reporte mensual de
operaciones. Esta base es sólida y es la razón por la que v2 es una evolución, no un rehacer.

### 1.2 Brechas duras — requisitos que hoy NO se cumplen

| # | Sección RAC 100 | Requisito | Estado hoy en BitaFly |
|---|---|---|---|
| **B1** | **100.540** completa + 100.535(a)(10)(11) | Límites de tiempo de servicio, vuelo efectivo y descanso del piloto UAS, **con registro obligatorio** | ❌ **No existe nada**. Ni el registro ni el control. |
| **B2** | 100.535(a)(12) | Certificar a cada piloto el tiempo de vuelo acumulado ≥1 vez por año calendario | ❌ No existe |
| **B3** | 100.535(a)(26) | Reporte mensual (primeros 5 días hábiles) con estadística **+ indicadores SPI + reportes MOR** al Grupo Estadísticas | ⚠️ Parcial: existe el Reporte Operacional Mensual UAS (8 columnas), pero SPI y MOR van por separado y sin acuse consolidado |
| **B4** | 100.535(a)(29) | Conservar registros operacionales **5 años** | ⚠️ Conflicto: la retención de replay GPS es 30–180 días según plan |
| **B5** | 100.535(a)(7) | Firmware al día + **guardar copia de la última versión que funcionó** | ❌ No existe campo ni control |
| **B6** | 100.415(a)(2)(iii) | La estación de control debe mostrar en todo momento: posición georreferenciada, azimuth, velocidad horizontal/vertical, altura, energía, **calidad del enlace C2**, **imagen de video frontal de la UA** | ❌ No existe → **esto es exactamente "comando y control"** |
| **B7** | **100.440(a)(12)** | El explotador BVLOS debe contar con un **sistema tecnológico de gestión de vuelo UAS** que garantice geocercas en toda el área de operación y **visualización de telemetría en todas las fases del vuelo** | ❌ No existe |
| **B8** | Apéndice 2 completo | Condiciones de aceptación del enlace C2 (VLOS/EVLOS/BVLOS), incl. registro de eventos críticos del enlace y programa de mantenimiento de sus componentes | ❌ No existe |
| **B9** | 100.805(a) | Solicitud de autorización por **Plataforma UAS Colombia** con: cert. vigencia póliza RCE, **archivo KML**, **matriz de riesgos en el formato de la Aerocivil**, autorización ZNVD | ⚠️ BitaFly genera **KMZ**, no KML; la matriz de riesgo no está en formato Aerocivil; no hay expediente ni radicación |
| **B10** | 100.805(c)(d) | Antelación mínima: **15 días hábiles** en espacio aéreo controlado, **10 días hábiles** en corredores BVLOS | ❌ La programación no valida antelación |
| **B11** | 100.215(b) | EVLOS: observadores con posición fija, ≤750 m cada uno, primer observador ≤1.500 m del piloto, comunicación ininterrumpida | ⚠️ "Observador" existe como rol pero sin geometría ni validación |
| **B12** | 100.215(c)(4) | BVLOS se clasifica **I a V** por distancia máxima (5/10/15/20 km / 80% del enlace) | ❌ No se clasifica |
| **B13** | 100.545(b)(c) | JP y GSMS con **exclusividad** (no vinculados a otro explotador); JP con ≥100 h certificadas + ≥40 h SMS por CIAC | ❌ Sin validación. Con multi-organización esto es hoy verificable y no se verifica |
| **B14** | 100.410(a)(10) | Radio VHF de banda aérea cuando se opera en/cerca de aeródromos | ❌ No se registra ni se exige en el despacho |
| **B15** | 100.440(a)(6) | En BVLOS: monitoreo **en tiempo real** de condiciones meteorológicas durante toda la operación | ⚠️ El módulo de clima consulta al planear/despachar, no monitorea en vuelo |

**Conclusión del análisis**: la norma nueva no solo valida las 3 ideas del usuario — las convierte
en obligaciones. El "comando y control" es literalmente B6+B7+B8. La "programación automática
ante la Aerocivil" es B9+B10. Y aparece una brecha que el usuario no mencionó y que es la más
urgente de todas: **B1, tiempos de servicio y descanso**, sin la cual ningún explotador puede
demostrar cumplimiento de 100.540.

---
