# Bitafly — Proyección Financiera y Valoración
**Documento para inversionistas · Junio 2026**
Plataforma SaaS de gestión de operaciones de drones (RAC 100 / AeroCivil) — Colombia

> ⚠️ **Naturaleza del documento:** es un *modelo financiero* basado en supuestos explícitos, no una garantía de resultados. Todos los supuestos están marcados y son ajustables. Las cifras de mercado (operadores en Colombia) son estimaciones a validar con datos oficiales de la UAEAC. TRM usada: **$4.100 COP/USD**.

---

## 1. Resumen ejecutivo

| Indicador | Valor (caso base) |
|---|---|
| **Valoración pre-money hoy (lanzamiento)** | **$400.000.000 COP** (~$98.000 USD) |
| **Valor por acción (si se divide en 1.000 acciones)** | **$400.000 COP por acción** |
| Rango de valoración | $250M (conservador) – $600M (optimista) |
| Inversión recomendada a levantar | **$180.000.000 COP** (~$44.000 USD) |
| Participación a entregar | **~31%** (dentro de tu máximo de 45%) |
| Clientes de pago fin de Año 1 | ~148 |
| Ingreso Año 1 | ~$60M COP |
| Ingreso run-rate (ARR) fin Año 1 | ~$163M COP |
| Ingreso proyectado Año 5 | ~$2.450M COP (~$600k USD) |
| EBITDA mensual positivo desde | **Mes 10** |
| LTV / CAC | ~5× (saludable, meta >3×) |

**Tesis de inversión:** producto terminado y operativo, mercado regulado en crecimiento (RAC 100 obligatorio), sin competidor local con cobertura completa, márgenes SaaS altos (~85%) y métricas unitarias sanas. La inversión se destina principalmente a **marketing y equipo** para capturar el mercado antes que la competencia reaccione.

---

## 2. Supuestos del modelo (todos explícitos)

### 2.1 Precios (confirmados por el fundador)
| Plan | Mensual | Anual | Equiv. mensual del anual |
|---|---|---|---|
| Piloto | $19.900 | $218.900 | $18.242 |
| Escuadrilla | $149.900 | $1.648.900 | $137.408 |
| Flota | $249.900 | $2.748.900 | $229.075 |
| Enterprise | Variable | desde $5.000.000/año | $416.667 |

### 2.2 Mezcla de planes (supuesto base)
60% Piloto · 25% Escuadrilla · 12% Flota · 3% Enterprise

**ARPU mensual mezclado = $91.900 COP/cliente**
*(Sensibilidad: si la mezcla se inclina a Piloto (80/12/6/2), el ARPU baja a ~$57.200 — ver §10.)*

### 2.3 Embudo y retención (supuestos)
| Variable | Valor | Origen |
|---|---|---|
| Conversión prueba → pago | 8% | supuesto estándar SaaS |
| Churn (cancelación) mensual | 4% | supuesto estándar SaaS |
| Margen bruto | ~85% | costos de hosting/pago bajos por cliente |
| Vida media del cliente | 25 meses | 1 / churn |

### 2.4 Punto de partida
- **Lanzamiento hoy.** 0 clientes de pago, $0 MRR. Modelo desde cero.

---

## 3. Estructura de costos de operación

### 3.1 Costos fijos mensuales (base, sin equipo ni marketing)

| Concepto | COP/mes |
|---|---|
| Vercel ($20 USD) | $82.000 |
| Supabase ($20 USD) | $82.000 |
| Resend ($20 USD) | $82.000 |
| Railway ($20 USD) | $82.000 |
| DJI Developer | $0 (gratis) |
| Dominio | $60.000 |
| Email corporativo | $70.800 |
| ePayco (cuota fija ≤$5M/mes) | $73.400 |
| Siigo (facturación) — $149.000/año | $12.417 |
| Cámara y Comercio — $100.000/año | $8.333 |
| Contador — $200.000/año | $16.667 |
| **Total fijo base** | **≈ $570.000 COP/mes** |

> A partir de $5.000.000 COP procesados/mes, ePayco cobra **0,7% sobre el excedente** (impacto menor; incluido desde el Mes 8).

### 3.2 Costos variables / de crecimiento
- **Marketing:** desde $400 USD/mes, escalando con la inversión (ver §5 y §6).
- **Equipo:** fundador **sin salario** hoy. Proyección: contratar **2 personas ($3.500.000 COP/mes en conjunto)** desde el Mes 7 (post-inversión).

---

## 4. Mercado en Colombia (modelo "Opción 2" — desde tamaño de mercado)

> Estimaciones a validar con la UAEAC. El régimen RAC 100 hace **obligatorio** el cumplimiento documental para operadores comerciales, lo que define el mercado.

| Nivel | Definición | Estimado 2026 | Proyección 2031 |
|---|---|---|---|
| **TAM** | Operadores de drones comerciales en Colombia | ~6.000 | ~18.000 (crec. ~25%/año) |
| **SAM** | Los que requieren cumplimiento RAC 100 activo (≈60%) | ~3.600 | ~10.800 |
| **SOM Año 1** | Captura realista año 1 | ~148 (≈4% del SAM) | — |
| **SOM Año 5** | Captura acumulada | ~2.200 | ≈20% del SAM proyectado |

La penetración del Año 5 (~2.200 clientes) es ambiciosa pero alcanzable dentro del SAM proyectado; **la expansión regional (Perú, Ecuador, México)** ampliaría el techo más allá de Colombia.

---

## 5. Modelo de adquisición y métricas unitarias

**Embudo (publicidad + orgánico + referidos):**
- CPC Google Colombia (nicho): ~$2.500 COP/clic
- Conversión landing → prueba: ~7%
- Conversión prueba → pago: 8%
- **CAC objetivo mezclado:** ~$350.000–$450.000 COP/cliente (baja a medida que el orgánico/SEO madura)

**Economía por cliente (unit economics):**
| Métrica | Valor |
|---|---|
| ARPU mensual | $91.900 |
| Margen bruto | 85% |
| Vida media | 25 meses |
| **LTV** | **~$1.950.000 COP** |
| **CAC** | ~$400.000 COP |
| **LTV / CAC** | **~4,9×** (sano, meta >3×) |
| **Payback de CAC** | **~5 meses** |

> Un LTV/CAC ~5× y payback ~5 meses son métricas atractivas: cada peso en adquisición se recupera rápido y multiplica casi 5×.

---

## 6. Proyección Año 1 — mes a mes (caso base, con inversión)

Marketing escalando de $400 a $1.500 USD/mes; equipo (2 personas) desde Mes 7.

| Mes | Nuevos | Activos | MRR (COP) | Marketing (COP) | Costo total (COP) | EBITDA mes | EBITDA acum. |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 2 | 183.800 | 1.640.000 | 2.210.000 | −2.026.000 | −2,0M |
| 2 | 3 | 5 | 459.500 | 1.640.000 | 2.210.000 | −1.751.000 | −3,8M |
| 3 | 5 | 10 | 919.000 | 2.050.000 | 2.620.000 | −1.701.000 | −5,5M |
| 4 | 7 | 16 | 1.470.400 | 2.460.000 | 3.030.000 | −1.560.000 | −7,0M |
| 5 | 9 | 25 | 2.297.500 | 2.870.000 | 3.440.000 | −1.143.000 | −8,2M |
| 6 | 12 | 36 | 3.308.400 | 3.280.000 | 3.850.000 | −542.000 | −8,7M |
| 7 | 14 | 48 | 4.411.200 | 3.690.000 | 7.760.000 | −3.349.000 | −12,1M |
| 8 | 17 | 63 | 5.789.700 | 4.100.000 | 8.170.000 | −2.380.000 | −14,5M |
| 9 | 20 | 81 | 7.443.900 | 4.510.000 | 8.580.000 | −1.136.000 | −15,6M |
| 10 | 23 | 101 | 9.281.900 | 4.920.000 | 8.990.000 | **+292.000** | −15,3M |
| 11 | 26 | 123 | 11.303.700 | 5.330.000 | 9.400.000 | **+1.904.000** | −13,4M |
| 12 | 30 | 148 | 13.601.200 | 6.150.000 | 10.220.000 | **+3.381.000** | **−10,0M** |

**Lectura del Año 1:**
- **EBITDA mensual positivo desde el Mes 10.**
- **Pérdida acumulada del año: ~$10M COP** (es la inversión en crecimiento, no un hueco operativo).
- **Máximo hundimiento de caja: ~$15,6M** (Mes 9) — mejora aún más con los planes anuales que se pagan por adelantado.
- **Run-rate de salida (ARR): ~$163M COP.**

> Nota de caja: los planes **anuales** se cobran 100% por adelantado, así que la caja real es mejor que el EBITDA mostrado (que reconoce el ingreso mes a mes).

---

## 7. Proyección a 5 años

Supuestos: ARPU crece ~5%/año (subidas de precio + upsell a planes altos); reinversión fuerte en marketing y equipo; expansión del margen a medida que escala.

| Año | Clientes (fin) | ARPU | Ingreso anual | Margen EBITDA | EBITDA | ARR (run-rate) |
|---|---|---|---|---|---|---|
| 1 | 148 | $91.900 | ~$60M | −17% | −$10M | ~$163M |
| 2 | 420 | $96.500 | ~$324M | +10% | +$32M | ~$486M |
| 3 | 850 | $101.300 | ~$772M | +20% | +$154M | ~$1.033M |
| 4 | 1.450 | $106.400 | ~$1.468M | +28% | +$411M | ~$1.851M |
| 5 | 2.200 | $111.700 | ~$2.446M | +32% | +$784M | ~$2.949M |

**Curva en J clásica de SaaS:** pérdida pequeña el Año 1, rentabilidad creciente y márgenes que se expanden hacia ~30% al Año 5. Al Año 5: **~$2.450M COP de ingreso (~$600k USD)** con EBITDA ~$784M.

---

## 8. Valoración de la compañía hoy

Al lanzar hoy (pre-ingresos) pero con **producto terminado y operativo**, trianguló tres métodos:

| Método | Lógica | Resultado |
|---|---|---|
| **Costo de reposición** | Reconstruir Bitafly: ~15 meses de desarrollo senior + producto/QA + experticia RAC 100 | $200M–$300M COP |
| **Múltiplo de ingresos a futuro** | ARR fin Año 1 (~$163M) × 3× SaaS LatAm, descontado por riesgo de etapa | $200M–$250M COP |
| **Pre-revenue (tipo Berkus, ajustado a Colombia)** | Producto funcional + moat regulatorio + mercado validado | $300M–$600M COP |

### Valoración recomendada (pre-money)
| Escenario | Pre-money | Base de sustento |
|---|---|---|
| Conservador | **$250.000.000 COP** | Anclado a costo de reposición |
| **Base (recomendado)** | **$400.000.000 COP** | Producto + moat + proyección |
| Optimista | **$600.000.000 COP** | Si se demuestra tracción temprana |

---

## 9. Valor por acción (división en 1.000 acciones)

Dividiendo la valoración **pre-money** en **1.000 acciones**:

| Escenario | Valoración pre-money | **Valor por acción (÷1.000)** |
|---|---|---|
| Conservador | $250.000.000 | **$250.000 COP** |
| **Base (recomendado)** | $400.000.000 | **$400.000 COP** |
| Optimista | $600.000.000 | **$600.000 COP** |

> El inversionista entra **al precio pre-money por acción**, así que el valor por acción no se diluye al invertir: se emiten acciones nuevas a ese mismo precio.

---

## 10. Recomendación de inversión

No necesitas levantar mucho para *sobrevivir* (el negocio llega a EBITDA positivo en el Mes 10 con pérdida acumulada de solo ~$10M). El capital es para **acelerar**: más marketing y equipo para capturar el mercado rápido.

### Opciones de ronda (caso base, pre-money $400M)
| Levantas | Acciones nuevas | % entregado | Post-money |
|---|---|---|---|
| $120.000.000 | 300 | 23,1% | $520M |
| **$180.000.000 (recomendado)** | **450** | **31,0%** | **$580M** |
| $260.000.000 | 650 | 39,4% | $660M |

**Recomendación: levantar $180M COP por ~31%** (dentro de tu máximo del 45%).

**Destino de los $180M (24 meses de pista):**
| Uso | Monto | % |
|---|---|---|
| Marketing (escalar a $1.500–2.500 USD/mes) | ~$110M | 61% |
| Equipo (2–3 personas) | ~$50M | 28% |
| Infraestructura + buffer | ~$20M | 11% |

### Retorno proyectado para el inversionista
- Entra hoy: **$180M por 31%** (post-money $580M).
- Valoración Año 5 (ARR ~$2.949M × 4×): **~$11.800M COP**.
- Participación del inversionista al Año 5: 31% × $11.800M = **~$3.660M COP**.
- **Retorno ~20× en 5 años** (TIR ~82%).

---

## 11. Riesgos y análisis de sensibilidad

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **ARPU real más bajo** (mezcla hacia Piloto) | Alto | Con ARPU $57.200 (vs $91.900), el ingreso baja ~38%; se compensa con más volumen y upsell. **Variable #1 a vigilar.** |
| Conversión < 8% o churn > 4% | Medio | Mejorar onboarding, soporte en español, valor del cumplimiento RAC 100 (alto costo de cambio) |
| CAC sube (publicidad cara) | Medio | Apalancar SEO/orgánico (ya construido) y referidos para bajar CAC mezclado |
| Tamaño de mercado menor al estimado | Medio | Validar con UAEAC; expansión regional como techo adicional |
| Competidor reacciona (GEODRONE, etc.) | Medio | Velocidad de captura + moat de cumplimiento completo |
| Entra un actor internacional | Bajo-Medio | Ventaja local: RAC 100 nativo, español, COP, soporte en zona horaria |

### Sensibilidad del ingreso Año 1 al ARPU
| ARPU | Ingreso Año 1 | ARR fin Año 1 |
|---|---|---|
| $57.200 (conservador) | ~$37M | ~$102M |
| **$91.900 (base)** | **~$60M** | **~$163M** |
| $110.000 (optimista) | ~$72M | ~$195M |

---

## 12. Métricas SaaS clave (resumen para el inversionista)

| Métrica | Valor | Referencia "buena" |
|---|---|---|
| Margen bruto | ~85% | >75% ✅ |
| LTV / CAC | ~4,9× | >3× ✅ |
| Payback de CAC | ~5 meses | <12 meses ✅ |
| Churn mensual | 4% | <5% ✅ |
| Meses a EBITDA+ | 10 | <18 ✅ |

---

## 13. Próximos pasos sugeridos
1. **Validar el tamaño de mercado** con cifras oficiales de la UAEAC (refina TAM/SAM).
2. **Confirmar la mezcla de planes real** tras los primeros 30–60 días (ajusta el ARPU, variable #1).
3. Definir la cifra final de ronda y preparar el **pacto de accionistas** (1.000 acciones base).
4. Convertir este modelo a **Excel con fórmulas vivas** para las reuniones con inversionistas.

---

*Documento vivo — actualizar con datos reales de tracción a medida que lleguen. Cifras de mercado pendientes de validación oficial UAEAC.*
