# Tiempos de servicio, vuelo y descanso

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 7. F5 — Tiempos de servicio, vuelo y descanso (nuevo, obligatorio)

No estaba en la lista del usuario. Es la brecha más grave que encontré: `100.540` es una sección
completa, nueva, con límites numéricos duros, y `100.535(a)(10)(11)(12)` obliga a **prevenir la
fatiga, registrar todo y certificar anualmente**. Hoy BitaFly no tiene absolutamente nada de esto.

### 7.1 Reglas exactas a implementar

| Límite | Valor | Fuente |
|---|---|---|
| Vuelo efectivo por mes calendario | **90 h** | 100.540(c)(1) |
| Vuelo máximo por 24 h — BVLOS | **6 h** | 100.540(d)(1)(i) |
| Vuelo máximo por 24 h — VLOS/EVLOS | **8 h** | 100.540(d)(1)(ii) |
| Operación continua sin pausa | **2 h**, luego **30 min** de descanso | 100.540(e) |
| Descanso tras servicio ≤ 8 h | **10 h consecutivas** | 100.540(f)(2)(i) |
| Descanso tras servicio > 8 h | **12 h consecutivas** | 100.540(f)(2)(ii) |
| Descanso mínimo absoluto | Nunca inferior al servicio inmediatamente anterior | 100.540(f)(2)(iii) |
| Fraccionamiento del descanso | **Prohibido** | 100.540(f)(2)(iv) |

Además, el tiempo de vuelo efectivo debe estar **dentro** del tiempo de servicio asignado —
cumplir el límite de vuelo no exime del límite de servicio (100.540(b)(2)).

### 7.2 Diseño

- El **tiempo de vuelo efectivo** se deriva de lo que ya se registra: `flights.total_time`. No se
  le pide al piloto capturarlo dos veces.
- El **tiempo de servicio** sí es nuevo: incluye preparación, monitoreo activo, espera en
  disponibilidad, entrenamiento programado y actividades posteriores. Se captura con dos
  botones — "Inicio de servicio" / "Fin de servicio" — en el modo campo, y automáticamente al
  despachar y cerrar vuelo si el piloto olvidó marcarlo.
- **Bloqueo de despacho** cuando un límite se excedería, con el mismo patrón ya probado en el
  proyecto para el examen de capacitación reprobado y el mantenimiento menor vencido: pantalla
  de bloqueo dedicada, no un aviso ignorable. Con excepción documentada y firmada por el jefe de
  pilotos cuando la norma lo permita.
- **Alertas preventivas**: al 80% del límite mensual, y antes de programar una misión que
  llevaría al piloto a exceder.
- **Certificación anual** (B2): documento por piloto con el tiempo acumulado del año calendario,
  firmado por el Jefe de Pilotos — un formato más en Reportes, mismo patrón que el resto.
- **Vista de planificación** para el Jefe de Pilotos: quién está disponible hoy, quién está en
  descanso obligatorio y hasta cuándo. Esto convierte una obligación en una herramienta útil.

---
