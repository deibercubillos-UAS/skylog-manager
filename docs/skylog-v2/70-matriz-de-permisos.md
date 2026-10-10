# Matriz de permisos por rol — estado real al 2026-10-10

Extraída del código de la API (cada ruta) y verificada en producción con las cuentas `qa.*`. **GG** = Gerente General (`admin`) ·
**JP** = Jefe de Pilotos · **GSMS** = Gerente SMS · **Piloto**. Hoy el sistema solo distingue dos grupos —**gestor** (GG + JP + GSMS) y
**piloto**— más algunas reglas especiales que se listan aparte. ✅ puede · 👁 solo ve · ❌ no.

## 1 · Reglas especiales (donde los roles NO son iguales)
| Acción | GG | JP | GSMS | Piloto |
|---|---|---|---|---|
| Ver/cambiar plan, pagar, cancelar la renovación, ver historial de pagos | ✅ | ❌ | ❌ | ❌ |
| Invitar a otro Gerente General | ✅ | ❌ | ❌ | ❌ |
| Declaración de mercancías peligrosas · designar cargos (GSO, Jefe de Pilotos, ejecutivo responsable) | ✅ | ❌ | ✅ | ❌ |
| Liberar una custodia legal | ✅ | ❌ | ✅ | ❌ |
| Recibir el aviso de custodia legal | ✅ | ❌ | ✅ | ❌ |
| Abrir/asumir un caso SMS, gestionarlo, acciones correctivas, analizar y radicar ante Aerocivil | ❌ | ❌ | ✅ (solo el Gerente SMS) | ❌ |
| Ver la identidad de quien reporta en un reporte confidencial | ❌ | ❌ | ✅ | solo si es quien reportó |
| Cerrar un vuelo despachado | solo quien lo despachó (PIC) | | | |
| Plataforma (`/admin`, socios, regalos, borrar cuentas) | solo superadmin con segundo factor | | | |

## 2 · Lo que hoy es idéntico para GG, JP y GSMS («gestor»)
Operación: programar/modificar misiones · ver planificación de servicio de toda la empresa · certificar horas · autorizar excepciones de descanso · ver el estado de otro piloto.
Flota: registrar/editar aeronaves, modelos, baterías, componentes, existencias, ETA, mantenimiento (eventos, programas, tareas), evaluar eventos inesperados.
Tripulación: agregar tripulantes, editar perfiles y membresías, **cambiar roles**, invitar.
Documentación: pólizas, proveedores y auditorías, manuales (publicar/editar/borrar), listas de chequeo, custodia legal (abrir/modificar), importar desde Excel, registro de acciones, todos los reportes, logo y datos de la organización, contactos de emergencia, certificación Aerocivil, anuncios.
SMS: objetivos, peligros, evaluación de riesgos y matriz, gestión del cambio, indicadores (definir, capturar, planes de acción, envío anual), mejora continua (GAP), plan de implantación, política y GSO, capacitación SMS, barreras, reporte mensual y su envío.
Capacitación: crear evaluaciones, banco de preguntas, material, ver cumplimiento.
Aerocivil: preparar el expediente, diligenciar y firmar el análisis de riesgos.

## 3 · Lo que puede hacer el Piloto
✅ Ver dashboard, bitácora de la organización, flota y tripulación (solo lectura), programación y misiones (solo lectura), meteorología, manuales (y confirmar lectura), listas de chequeo, capacitación (presentar el examen), objetivos/riesgos/indicadores/mejora continua de SMS (solo lectura), mapas.
✅ Despachar y cerrar sus vuelos, cargar vuelos (bitácora/DJI), iniciar y cerrar su tiempo de servicio, reportar sucesos (VOR/MOR), reportar eventos inesperados, editar su propio perfil y documentos, exportar o eliminar su propia cuenta.
❌ Todo lo demás de la sección 2.

## 4 · Hallazgo de seguridad (a corregir)
`PATCH /api/organizacion/members` (cambiar roles) solo exige ser «gestor»: **un Jefe de Pilotos o un Gerente SMS puede ascender a cualquiera —o a sí mismo— a Gerente General, o degradar a un Gerente General** si hay más de uno. La invitación sí lo impide («Solo un Gerente General puede invitar a otro Gerente General»); el cambio de rol no.
**Corrección propuesta:** solo un GG asigna o quita el rol `admin`; JP y GSMS podrían cambiar únicamente entre `piloto`, `jefe_pilotos` y `gerente_sms` (o ninguno, según la decisión 2).

## 5 · Decisiones por tomar
1. ¿Se separan JP y GSMS? En la v1 el SMS (objetivos, riesgos, indicadores, política, plan de implantación…) era solo del GG y el GSMS; el JP no. Hoy el JP puede todo el SMS y el GSMS puede programar misiones y registrar mantenimiento.
2. ¿Quién cambia roles? (solo GG / GG + los demás para roles no administrativos).
3. ¿El Jefe de Pilotos y el Gerente SMS ven Suscripción (plan y vencimiento, solo lectura) o solo el GG?
4. ¿El Piloto ve los vuelos de todos los pilotos de la empresa o solo los suyos?
5. ¿Quién libera una custodia legal y quién firma declaraciones? (hoy GG + GSMS).
6. ¿Quién puede importar desde Excel, ver el registro de acciones y los reportes? (hoy los tres gestores).
