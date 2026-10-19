# Plan de pruebas por rol + guía de funcionamiento para clientes (2026-10-19)

Documento doble:
1. **Guía de funcionamiento** — cómo se configura una empresa en BitaFly y qué hace cada perfil, pantalla por pantalla (apta para entregar al cliente).
2. **Plan de pruebas** — casos numerados, con pasos y resultado esperado, para verificar cada botón y función por rol. Cada caso se marca ✔ / ✖ / n/a en la columna de resultado.

Fuentes: inventario real de botones/pestañas/campos de producción (`bitafly.com`, 6 cuentas QA, 37 pantallas, ejecutado 2026-10-19), matriz `70-matriz-de-permisos.md` (códigos A1…Z3 entre paréntesis) y guía `74-guia-paso-a-paso.md`.

**Leyenda de acceso:** ✏️ crea/edita · 👁 solo ve · ❌ no aparece o no responde.
**Perfiles:** GG Gerente General · JP Jefe de Pilotos · GS Gerente SMS · P Piloto de empresa · PI Piloto independiente · SO Socio · SA Superadmin (solo BitaFly).

---

## 0 · Preparación de la prueba

| Cuenta QA | Perfil | Contraseña |
|---|---|---|
| qa.gerente@bitafly-test.local | GG | BitaflyQA2026! |
| qa.jefepilotos@… | JP | ídem |
| qa.sms@… | GS | ídem |
| qa.piloto@… | P | ídem |
| qa.independiente@… | PI (ver hallazgo H-1) | ídem |
| qa.socio@… | SO (código `QATESTSOCIO01`) | ídem |

Reglas de ejecución
- Probar en **Chrome escritorio 1366×768** y repetir lo marcado 📱 en celular (375–430 px).
- Cada caso se ejecuta **con el rol indicado**; los casos "❌" se prueban también escribiendo la dirección a mano (acceso por URL directa).
- Lo que se crea en pruebas se nombra con prefijo `QA-` para poder limpiarlo.
- Criterio general de aprobado: la acción hace lo esperado **y** no aparece ningún error en pantalla ni respuesta 403/500 en segundo plano.
- Tiempo máximo aceptable de carga de una pantalla: 5 s (ver `73-resultados-pruebas.md`).

---

# PARTE I — Configuración de la organización (Gerente General)

Orden recomendado para un cliente nuevo. Cada paso es también un caso de prueba.

| ID | Paso (qué hace el cliente) | Resultado esperado |
|---|---|---|
| ORG-01 | **Registro**: `bitafly.com/registro` → «crear empresa» (prueba 15 días) o «unirse a una empresa» (NIT + rol). Alternativa: «Continuar con Google». | Cuenta creada, entra a Inicio de su organización. Con NIT inválido: mensaje claro, no crea nada. |
| ORG-02 | **Recorrido de bienvenida** (7 pasos). Probar «Saltar tutorial». | Se cierra y no vuelve a salir. Debe ser el propio del perfil (C3). |
| ORG-03 | **Organización → Guardar datos**: razón social, NIT, correo, teléfono, dirección, representante. | Toast de éxito; al recargar los datos persisten. Un NIT con guion se guarda y sigue permitiendo «unirse por NIT». |
| ORG-04 | **Subir logo** (PNG/JPG ≤ 4 MB). | Logo visible en el encabezado y en los PDF de Reportes. Archivo > 4 MB: error legible. |
| ORG-05 | **Contactos de emergencia → Agregar contacto** (nombre, teléfono, cargo). | Aparece en la lista; editable y eliminable. |
| ORG-06 | **Certificación Aerocivil**: tipo de operación (VLOS / EVLOS / BVLOS), número y vigencia → **Guardar certificación**. | Guarda; se refleja en el Expediente Aerocivil y avisa al acercarse la vigencia. |
| ORG-07 | **Designar cargos** (GSO / Jefe de Pilotos) y, en SMS → Gobernanza, **Designar GSO**. | El cargo aparece en Gobernanza y en la política SMS. |
| ORG-08 | **Organización → Importar desde Excel**: descargar plantilla → llenar (aeronaves, baterías, tripulación, pólizas) → **Revisar archivo** → confirmar. | La revisión lista filas válidas y erróneas con motivo; solo tras confirmar se crean. Re-subir el mismo archivo no duplica. |
| ORG-09 | **Flota → Nueva aeronave** (matrícula, modelo, serie, horas, foto, documento de propiedad). Probar «precargar catálogo DJI». | Aeronave en la lista con barra «N de 25 atributos registrados». Serie duplicada: rechazo claro. |
| ORG-10 | **Baterías y componentes → Nueva batería**; **Agregar componente** (hélices, motores). | Quedan asociados; **Reemplazar / Retirar** dejan historial. |
| ORG-11 | **Existencias de equipo → Nuevo equipo** (extintor, chalecos, botiquín) y **Equipo Tecnológico Asociado → Nuevo ETA**. | Se listan con cantidad/estado. |
| ORG-12 | **Pólizas → Nueva póliza** (aseguradora, número, vigencia, documento). | Aparece con estado vigente/por vencer. |
| ORG-13 | **Tripulación → Agregar tripulante** (datos del piloto) o **Invitar por correo** (piloto, JP, GS). | Invitación en «pendiente» con **Reenviar / Cancelar**. El invitado, al aceptar, queda como tripulante visible con el rol correcto. |
| ORG-14 | **Listas de chequeo → Nueva lista**, **Proveedores → Nuevo proveedor** y **Checklist de auditoría**, **Manuales → Cargar manual**. | Cada elemento se crea; el manual notifica a la tripulación. |
| ORG-15 | **Suscripción** → plan, uso (aeronaves/pilotos) y **Pagar ahora** (Wompi). | Muestra plan, vencimiento y consumo; el pago abre pasarela y, al aprobarse, activa el plan. |
| ORG-16 | **SMS inicial**: Asistente de implantación (Guardar plan), Riesgos («Cargar plantilla de referencia»), Indicadores («Sembrar catálogo oficial (11)»). | Quedan sembrados y editables. |

---

# PARTE II — Perfiles de piloto y expediente

| ID | Caso | Roles | Resultado esperado |
|---|---|---|---|
| PIL-01 | **Perfil → Guardar datos** (nombres, teléfono, ciudad, contacto de emergencia). (B1) | Todos | Persiste tras recargar. |
| PIL-02 | **Subir foto / Reemplazar / Quitar**. (B2) | Todos | La foto se ve en el avatar y en Tripulación. |
| PIL-03 | **Documentos**: Subir cédula, licencia/diploma UAS, certificado médico (con vencimiento), CIPU. (B3) | Todos | Cada documento queda «cargado»; los vencimientos generan alertas. |
| PIL-04 | **Guardar licencia** + **Agregar** adiciones de licencia. (B4) | Todos | Adiciones visibles en el expediente. Probar que el botón **Agregar** sin dato no rompe la pantalla. |
| PIL-05 | **Cambiar contraseña** (GS, P) y **Unirme a otra organización**. (B7, A7) | Todos | Envía correo / permite NIT; con 2 organizaciones aparece el selector en el encabezado y al cambiar se recarga con el rol de esa organización. |
| PIL-06 | **Descargar mis datos** / **Eliminar mi cuenta**. (B5, B6) | Todos (P solo ve) | La eliminación exige confirmación; no deja la organización huérfana. |
| PIL-07 | GG/JP abren **Tripulación → Editar** de un piloto y ven su expediente completo. (K4, K10) | GG, JP | Ven y editan; GS solo ve; P no tiene esta pantalla. |
| PIL-08 | **Dar de baja** a un tripulante. (K6) | GG, JP, GS | Pasa a inactivo y deja de poder despachar; conserva su historial. |
| PIL-09 | **Cambiar rol** de un miembro. (K5) | Solo GG | JP/GS lo ven sin poder cambiarlo. |
| PIL-10 | **Expediente Aerocivil → Crear solicitud**. | GG, JP, GS | Abre formulario de 4 campos; P y PI ven la pantalla sin la acción. |
| PIL-11 | **Capacitación → Presentar examen**: aprobar y reprobar (agotar intentos). (W2) | GG, JP, GS, P | Nota correcta, intentos descontados; reprobar o vencer bloquea despachar hasta aprobar. |

---

# PARTE III — Casos por módulo (con alcance por rol)

Formato: **ID · acción · resultado esperado**. Debajo, la tabla de acceso: GG / JP / GS / P / PI.

## 1 · Inicio
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| INI-01 | Carga indicadores, gráfica y alertas (C1) | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ |
| INI-02 | **Buscar (Ctrl K)** encuentra aeronaves/vuelos/pilotos solo de mi organización (C4) | ✔ | ✔ | ✔ | ✔ | ✔ |
| INI-03 | **Campana**: lista, marcar leída, descartar; badge con conteo (C5) | ✔ | ✔ | ✔ | ✔ | ✔ |
| INI-04 | **Enviar anuncio** a la organización (C6) | ✏️ | ✏️ | ✏️ | ❌ | ❌ |
| INI-05 | Aviso de suscripción (vence/vencida/«Pagar ahora») (C2) | ✔ | ✔ | ❌ | ❌ | ✔ |
| INI-06 | Menú de cuenta: Perfil, cambiar organización, **Cerrar sesión** (A8) 📱 | ✔ | ✔ | ✔ | ✔ | ✔ |

## 2 · Bitácora (D1–D6)
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| BIT-01 | Vista **Bitácora · por piloto** | ✏️ | ✏️ | ✏️ | ❌ | ✏️ |
| BIT-02 | Vista **Libro de vuelo · por aeronave** | ✏️ | ✏️ | 👁 | 👁 | ✏️ |
| BIT-03 | **Importar vuelos desde el control** (log DJI): sube, detecta aeronave, no duplica, omite vuelos de 0 min | ✏️ | ✏️ | 👁 | ✏️ | ✏️ |
| BIT-04 | **Registrar vuelo** (manual): abre formulario de 8 campos, guarda y suma horas a aeronave/batería | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| BIT-05 | Editar / eliminar un vuelo | ✏️ | ✏️ | ❌ | ❌ | ❌ |
| BIT-06 | **Replay GPS** del vuelo (D3) | ✔ | ✔ | ✔ | 👁 | ✔ |
| BIT-07 | Filtros (fecha, aeronave, piloto, tipo) y búsqueda | ✔ | ✔ | ✔ | — | ✔ |

## 3 · Programación (E1–E4)
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| PRG-01 | Calendario semanal: **‹ HOY ›** navega semanas; lista alterna | ✔ | ✔ | ✔ | ✔ | ✔ |
| PRG-02 | **Nueva misión**: PIC, observador, aeronave, zona (polígono/lineal/circunferencia), fecha/hora, SORA obligatorio | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| PRG-03 | Aviso de **conflicto de agenda** del PIC (mismo día) | ✔ | ✔ | — | — | ✔ |
| PRG-04 | Modificar / cancelar misión | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| PRG-05 | Importar zona desde **KMZ** y descargar KMZ/PDF de la misión | ✏️ | ✏️ | 👁 | 👁 | ✏️ |
| PRG-06 | P ve **solo sus misiones** (las de las que es PIC) | — | — | — | ✔ | — |
| PRG-07 | El **N.º de autorización Aerocivil** se edita en la misión | ✏️ | ✏️ | 👁 | ❌ | ✏️ |

## 4 · Despacho y cierre de vuelo (F1–F4) — flujo crítico
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| DES-01 | Asistente de despacho: elegir misión (P: solo la de hoy), verificaciones | ✏️ | ✏️ | 👁 | ✏️ | ✏️ |
| DES-02 | Listas de chequeo (salud, inventario, pre-vuelo, briefing): **no se puede avanzar sin responder todos los ítems** | ✔ | ✔ | — | ✔ | ✔ |
| DES-03 | **Evaluación de riesgo**: zona *Inaceptable* exige barreras y riesgo residual aceptable; *Tolerable* permite barreras voluntarias | ✔ | ✔ | — | ✔ | ✔ |
| DES-04 | **Despachar** → vuelo en curso; aeronave en mantenimiento o piloto con examen vencido **bloquea** | ✔ | ✔ | — | ✔ | ✔ |
| DES-05 | **Cerrar vuelo**: hora de aterrizaje (vuelo nocturno cruzando medianoche válido), observaciones, «reporte SMS: Sí» pide VOR/MOR | ✔ | ✔ | — | ✔ | ✔ |
| DES-06 | Tras cerrar: aparece en Bitácora, suma horas aeronave/batería/tiempo de servicio | ✔ | ✔ | ✔ | — | ✔ |
| DES-07 | Historial de despachos propio / de toda la organización (F1, F2) | ✔/✔ | ✔/✔ | 👁/👁 | 👁/❌ | ✔/✔ |

## 5 · Meteorología y Tiempos de servicio (G1, H1–H7)
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| MET-01 | Aptitud de vuelo (GO/NO-GO), 6 condiciones, pronóstico por hora, zonas de hoy | ✔ | ✔ | 👁 | ✔ | ✔ |
| DUT-01 | Iniciar / cerrar mi período de servicio (H1) | ✏️ | ✏️ | 👁 | ✏️ | ✏️ |
| DUT-02 | Ver estado de otro piloto y resumen de toda la empresa (H3, H4) | ✔ | ✔ | 👁 | ❌ | ✔ |
| DUT-03 | **Certificar** horas anuales (H6) | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| DUT-04 | Autorizar excepción de descanso (H7) | ✏️ | ✏️ | 👁 | ❌ | ✏️ |

## 6 · Flota (I, J, L, M, N)
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| FLO-01 | Lista de aeronaves y ficha (atributos registrados) | ✔ | ✔ | 👁 | 👁 | ✔ |
| FLO-02 | **Nueva aeronave** / **Editar** / foto / documento de propiedad / ficha de modelo / autorización ANE | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| FLO-03 | Estado **Fuera de servicio**: impide despachar esa aeronave | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| BAT-01 | **Nueva batería**, **Marcar operativa / de baja** | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| BAT-02 | **Agregar componente / Reemplazar / Retirar** | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| MAN-01 | **Registrar mantenimiento** (tipo, técnico, adjunto) y programa/tareas de mantenimiento | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| MAN-02 | **Reportar evento** inesperado (I11) — queda 5 años, no se borra | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ |
| MAN-03 | **Evaluar evento** (I12) | ✏️ | 👁 | ✏️ | ❌ | ✏️ |
| EQU-01 | **Nuevo equipo** (existencias) y **Nuevo ETA** | ✏️ | ✏️ | 👁 | 👁 | ❌ |
| TRI-01 | **Agregar tripulante**, **Invitar por correo** (K7), **Reenviar / Cancelar**, **Editar**, **Dar de baja** | ✏️ | ✏️ | 👁 | ❌ | ✏️ |
| TRI-02 | Invitar a otro **Gerente General** (K8) | ✏️ | ❌ | ❌ | ❌ | ✏️ |

## 7 · SMS (O–V)
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| SMS-01 | **Objetivos → Nuevo objetivo** | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-02 | **Riesgos**: *Cargar plantilla*, *Agregar* (escala), *Evaluar* (prob. × gravedad), *Registrar peligro*, barreras | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-03 | **Gestión del cambio → Nuevo cambio** | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-04 | **Indicadores**: *Sembrar catálogo oficial (11)*, *Agregar*, capturar meses, *Guardar*, plan de acción, **Marcar como enviado** | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-05 | **Mejora continua**: *Nueva evaluación*, *Abrir*, diligenciar Sí/No, *Configurar preguntas*, eliminar | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-06 | **Reporte mensual**: ver paquete y **Marcar como enviado** (≤ 5 días hábiles) | ✏️ | 👁 | ✏️ | ❌ | ❌ |
| SMS-07 | **Reportes y casos → Nuevo reporte** (VOR/MOR) con evidencias | ✏️ | ✏️ | ✏️ | ✏️ | ❌ |
| SMS-08 | **Activar enlace público** + QR (U9) y reporte desde `/vor/…` o `/mor/…` sin sesión | ✏️ | ❌ | ✏️ | ❌ | ❌ |
| SMS-09 | **Abrir caso → Analizar → Acción correctiva → Radicar → Cerrar** (U5–U7) | ❌ | ❌ | ✏️ | ❌ | ❌ |
| SMS-10 | Identidad del reportante en reporte confidencial (U4) | ❌ | ❌ | ✔ | ❌ | ❌ |
| SMS-11 | **Asistente de implantación**: *Agregar al plan*, *+ Tarea personalizada*, *Guardar plan* | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-12 | **Gobernanza**: *Publicar política*, *Designar GSO* | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-13 | **MSMS**: *Generar el MSMS por primera vez* | ✏️ | 👁 | ✏️ | 👁 | ❌ |
| SMS-14 | **Capacitación SMS → Nueva sesión**, registrar asistencia; mapas de restricción | ✏️ | 👁 | ✏️ | 👁 | ❌ |

## 8 · Documentación
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| CAP-01 | **Capacitación**: *Administración* (banco de preguntas, material, evaluaciones) | ✏️ | ✏️ | ✏️ | ❌ | ❌ |
| CAP-02 | Cumplimiento de toda la tripulación (W4) | ✔ | ✔ | ✔ | ❌ | ❌ |
| LIS-01 | **Listas de chequeo**: *Nueva lista*, editar, eliminar, **Ver pasos**, PDF | ✏️ | ✏️ | 👁 | 👁 | ❌ |
| PRV-01 | **Proveedores**: *Nuevo proveedor*, *Activo*, eliminar, **Checklist de auditoría**, **Ver historial y nueva auditoría** | ✏️ | ✏️ | ✏️ | ❌ | ❌ |
| POL-01 | **Pólizas**: *Nueva póliza*, documento | ✏️ | ✏️ | 👁 | ❌ | ❌ |
| MNL-01 | **Manuales**: *Cargar manual*, *Nueva versión*, *Historial*, *Descargar*, *Eliminar* | ✏️ | ✏️ | ✏️ | 👁 | 👁 |
| MNL-02 | «**He leído esta versión**»; *Seguimiento* (quién leyó) y acta PDF | ✔ | ✔ | ✔ | ✔ | ✔ |
| REP-01 | **Reportes**: cada formato (Libro de vuelo, Mantenimiento, Flota, Baterías, Tripulación, Capacitación, Proveedores, Tiempos de servicio…) descarga PDF/Excel con logo, versión y fecha | ✔ | ✔ | ✔ | ❌ | ❌ |
| RET-01 | **Retención y custodia**: *Nueva custodia*, *Agregar vuelos*, *Ver vuelos y bitácora*, *Liberar* | ✏️ | ✏️ | ❌ | ❌ | ❌ |
| IMP-01 | **Importar desde Excel** (ver ORG-08) | ✏️ | ✏️ | ❌ | ❌ | ❌ |
| REG-01 | **Registro de acciones**: lista, filtros, **Descargar CSV** | ✔ | ✔ | ❌ | ❌ | ❌ |

## 9 · Organización y suscripción
| ID | Acción / esperado | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|
| ORG-20 | Pantalla Organización completa (ORG-03 a ORG-07) | ✏️ | 👁 | 👁* | ❌ | ❌ |
| ORG-21 | `Designar` / `Declarar` (cargos, declaración de mercancías peligrosas) | ✏️ | ✏️ (firma) | ✏️ | ❌ | ❌ |
| SUS-01 | **Suscripción**: plan, uso, **Pagar ahora**, cancelar renovación | ✏️ | ✏️ | ❌ | ❌ | ✏️ |

\* GS solo ve la parte de gobernanza (Designar/Declarar).

## 10 · Socio (SO) — `bitafly.com/socio`
| ID | Acción / esperado |
|---|---|
| SOC-01 | Pestañas **PANEL / REPORTES / PERFIL** cargan. Panel muestra código `QATESTSOCIO01`, cupos y totales. |
| SOC-02 | **REGALAR**: correo → se crea regalo (90 días) y se envía enlace; no deja regalar el mismo correo dos veces. |
| SOC-03 | Papelera (🗑) **anula** un regalo y libera el cupo; si ya se canjeó, baja a los beneficiarios a plan piloto. |
| SOC-04 | **INVITAR** (dueño de escuela) agrega un asesor; el invitado crea cuenta con el correo bloqueado. |
| SOC-05 | **REPORTES**: perfiles regalados/activos, referidos, comisiones. **PERFIL**: logo y cuenta. |
| SOC-06 | Un socio **desactivado** ya no ve el Panel. |

## 11 · Superadmin (SA)
| ID | Acción / esperado |
|---|---|
| ADM-01 | `/admin/*` exige segundo factor; cualquier otro rol es devuelto a Inicio. |
| ADM-02 | Organizaciones/planes, socios y comisiones, regalos, cuentas, versiones de la app Android. |
| ADM-03 | Convertir a Piloto Independiente y eliminar cuenta (con confirmación escribiendo el correo). |

---

# PARTE IV — Pruebas transversales

| ID | Prueba | Esperado |
|---|---|---|
| TRV-01 | **Acceso por URL directa**: con P y PI escribir `/flota/tripulacion`, `/proveedores`, `/polizas`, `/reportes`, `/retencion`, `/organizacion/importar`, `/organizacion/registro`, `/sms/reporte-mensual`; con GS `/retencion`, `/organizacion/importar`, `/organizacion/registro` | Redirige o muestra pantalla sin acciones; nunca datos ajenos. Ya verificado en recorrido: no hay pantallas expuestas. |
| TRV-02 | **403 / errores en red** al recorrer las 37 pantallas con cada rol | 0 respuestas ≥ 400 (F-016 corregido 2026-10-18; verificar de nuevo). |
| TRV-03 | **Aislamiento entre organizaciones**: dos organizaciones, buscar con Ctrl K y abrir enlaces de la otra | No aparece nada de la otra. |
| TRV-04 | **Cambio de organización** (cuenta con 2) | Recarga con el rol, menús y permisos de la organización elegida. |
| TRV-05 | **Móvil 📱** (375, 390, 430 px; vertical y horizontal): sin desborde horizontal, menú ☰ usable, botón de acción final de Despacho visible | Sin scroll lateral; nada tapado por la barra inferior. |
| TRV-06 | **Formularios**: campo obligatorio vacío, texto largo, caracteres especiales (ñ, tildes, `<>`) | Mensaje claro; nada se rompe ni se ejecuta. |
| TRV-07 | **Sesión**: cerrar sesión, botón atrás, expiración | No muestra datos tras cerrar sesión. |
| TRV-08 | **Rendimiento**: tiempo de cada pantalla con datos | ≤ 5 s; cualquier salto > 10 s se registra (F-017). |
| TRV-09 | **Notificaciones**: crear misión, aceptar invitación, publicar manual, abrir caso | Cada destinatario recibe la campana correcta; el que actúa no se notifica a sí mismo. |
| TRV-10 | **Registro de acciones** tras cada creación (GG) | La acción aparece con usuario, módulo y hora. |
| TRV-11 | **Correos** (invitación, regalo, anuncio) | Llegan desde `bitafly.com`, con logo y enlace correcto. |
| TRV-12 | **Pagos** (Wompi): pago aprobado, rechazado y cancelado | Plan se activa solo con aprobado; el rechazo no cambia nada. |

---

# PARTE V — Flujos extremo a extremo (ejecutar en este orden)

1. **Alta de operación**: ORG-03 → ORG-09 → ORG-10 → ORG-13 (invitar piloto) → el piloto acepta → PIL-01…PIL-04.
2. **Vuelo completo**: PRG-02 (GG/JP programa) → DES-01…DES-04 (P despacha) → DES-05 (cierra) → BIT-01 → verificar horas en Flota, Baterías y Tiempos de servicio.
3. **Mantenimiento por horas**: registrar suficientes horas → alerta de vencimiento → MAN-01 → aeronave vuelve a disponible.
4. **Suceso de seguridad**: P reporta (SMS-07) → GS abre caso (SMS-09) → acción correctiva → radicar → cerrar → SMS-06 (reporte mensual) → verificar rastro en Registro de acciones.
5. **Capacitación con bloqueo**: crear examen (CAP-01) → P reprueba hasta agotar intentos → DES-04 bloquea → aprueba → vuelve a poder despachar.
6. **Custodia legal**: RET-01 congela vuelos → intentar editarlos (BIT-05) → debe impedirlo.
7. **Socio → cliente**: SOC-02 regala → el invitado se registra → usa plan piloto 90 días → SOC-03 anula.

---

# PARTE VI — Hallazgos del inventario de esta ejecución

| # | Hallazgo | Severidad | Acción |
|---|---|---|---|
| H-1 | La cuenta `qa.independiente` **no se comporta como piloto independiente real**: muestra la organización «BitaFly QA – Organización de Prueba» en el encabezado, no tiene ningún botón de creación (Nueva aeronave, Nueva misión, Registrar vuelo) y sí ve SMS y Existencias de equipo, contrario a la matriz (PI: ✏️ en flota/programación, ❌ en SMS y existencias). Parece una cuenta de organización con plan «piloto», no una creada con registro «solo». | Alta para la prueba | Crear un PI real con registro «solo» y repetir PRG, FLO, BAT, MAN, DES, BIT con esa cuenta antes de dar por probado el perfil. Si el real también ve SMS, es un fallo de permisos. |
| H-2 | `/perfil → Agregar` (adiciones de licencia) no abrió campo en ninguna cuenta en el sondeo automático. | Por confirmar | Probar a mano (PIL-04); si no hay formulario, es defecto. |
| H-3 | **Activar enlace público** no abre ventana: aparentemente actúa directo. | Baja | Confirmar que pide confirmación antes de publicar un enlace (SMS-08). |
| H-4 | Pantallas sin acceso devuelven título vacío (p. ej. `/retencion`, `/proveedores` para P/PI) en lugar de un mensaje «sin permiso». | Baja (UX) | Mostrar «No tiene acceso a esta sección». |
| H-5 | `CommandPalette` (Ctrl K) aún pide `/api/organizacion/members` sin verificar permiso (posible 403 silencioso). | Baja | Poner la condición AD1 como en F-016. |

---

# PARTE VII — Registro de resultados

Copiar por cada ejecución: **Fecha · Ejecutor · Navegador/Dispositivo · Cuenta · ID del caso · Resultado (✔/✖/n/a) · Evidencia (captura) · Observaciones**. Los ✖ se abren como hallazgo con el mismo formato de `73-resultados-pruebas.md` (F-0NN).

Condición de salida para considerar la plataforma lista para clientes: 0 casos ✖ en Partes I, II y V; 0 respuestas ≥ 400 en TRV-02; H-1 resuelto con un piloto independiente real.
