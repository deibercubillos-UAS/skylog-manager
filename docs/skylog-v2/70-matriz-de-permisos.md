# Matriz de permisos por rol — decisión del usuario (2026-10-15)

**Fuente única en código:** [`packages/domain/src/permissionsMatrix.js`](../../packages/domain/src/permissionsMatrix.js) (`permissionLevel`, `canEdit`, `canView`).
Este documento se genera a partir de ese archivo; si cambian, cambian juntos. Viene del artefacto *Matriz de permisos BitaFly*, ajustado por el usuario celda por celda.

**Columnas:** SA = superadmin de la plataforma · GG = Gerente General (`admin`) · JP = Jefe de Pilotos · GS = Gerente SMS · P = Piloto · PI = Piloto independiente (plan «piloto»).
✅ puede (usa y modifica) · 👁 solo ve · ❌ no.

## 1 · Qué cambió respecto del sistema anterior (resumen)
- **Gerente SMS** pasa a *solo ver* operación, flota, mantenimiento, tripulación y pólizas; ya no importa desde Excel, no ve el registro de acciones ni las custodias legales, y no designa cargos.
- **Jefe de Pilotos** pasa a *solo ver* el SMS (objetivos, riesgos, indicadores, mejora continua, plan de implantación, reporte mensual), la organización y la certificación Aerocivil; no cambia roles ni gestiona el enlace público de reportes. Gana: firmar la declaración de mercancías peligrosas y ver el aviso de suscripción.
- **Gerente General** conserva todo y además es el único que cambia roles.
- **Piloto** deja de ver la bitácora de la organización, la tripulación, los componentes y la página de la organización; en varias pantallas pasa a solo lectura.
- **Piloto independiente** no tiene SMS, capacitación, proveedores, manuales, reportes, importación ni registro de acciones.
- **Superadmin** gana editar/eliminar vuelos y operar casos SMS.

## 2 · La matriz

### Cuenta y acceso
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| A1 | Iniciar sesión con correo y contraseña | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A2 | Iniciar sesión con Google | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A3 | Registrarse creando una empresa (prueba de 15 días) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A4 | Registrarse uniéndose a una empresa por NIT y rol | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A5 | Aceptar una invitación por enlace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A6 | Segundo factor de verificación (app autenticadora) — *opciónal para el cliente, prerero recomendado por seguridad* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A7 | Cambiar de organización activa | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A8 | Cerrar sesión | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Mi perfil
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| B1 | Editar mis datos personales y contacto de emergencia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B2 | Subir o cambiar mi foto | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B3 | Subir y ver mis documentos personales (cédula, licencia, certificado médico) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B4 | Registrar mis adiciones de licencia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B5 | Descargar mis datos personales | ✅ | ✅ | ✅ | ✅ | 👁 | ✅ |
| B6 | Eliminar mi cuenta | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| B7 | Unirme a otra organización desde el perfil | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Inicio (dashboard)
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| C1 | Ver los indicadores, la gráfica de vuelos y las alertas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C2 | Ver el aviso de suscripción (vence, vencida, activar pago) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| C3 | Ver el recorrido de bienvenida — *debe se el recorrido personalizado según cada perfil* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C4 | Buscar con Ctrl+K y atajos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C5 | Ver, marcar y descartar mis notificaciones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| C6 | Enviar un anuncio a la organización | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Operación · Bitácora
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| D1 | Ver la bitácora de vuelos de la organización | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| D2 | Ver el Libro de vuelo por aeronave | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| D3 | Ver el replay GPS de un vuelo | ✅ | ✅ | ✅ | ✅ | 👁 | ✅ |
| D4 | Importar vuelos desde los registros DJI | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ |
| D5 | Registrar un vuelo manualmente | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| D6 | Editar o eliminar un vuelo ya registrado | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Operación · Programación
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| E1 | Ver las misiones programadas (calendario y lista) | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ |
| E2 | Programar una misión (PIC, observador, aeronave, zona, fecha) | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| E3 | Modificar o cancelar una misión programada | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| E4 | Importar la zona de operación desde un archivo KMZ | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |

### Operación · Despacho
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| F1 | Ver mi propio historial de despachos | ✅ | ✅ | ✅ | ✅ | 👁 | ✅ |
| F2 | Ver el historial de despachos de toda la organización | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| F3 | Despachar un vuelo (verificaciones, listas de chequeo, riesgo) | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ |
| F4 | Cerrar un vuelo despachado | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ |

### Operación · Meteorología
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| G1 | Ver el clima y la aptitud de vuelo de una ubicación | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ |

### Operación · Tiempo de servicio
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| H1 | Iniciar y cerrar mi período de servicio | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| H2 | Ver mi estado de servicio y descanso | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| H3 | Ver el estado de otro piloto | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| H4 | Ver la planificación y el resumen de cumplimiento de toda la empresa | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| H5 | Ver las certificaciones anuales de horas | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| H6 | Certificar las horas anuales de un piloto | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| H7 | Autorizar una excepción de descanso | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |

### Flota · Aeronaves
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| I1 | Ver las aeronaves | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| I2 | Registrar una aeronave | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I3 | Editar una aeronave | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I4 | Subir o cambiar la foto de la aeronave | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I5 | Ver el documento de propiedad | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| I6 | Subir el documento de propiedad | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I7 | Ver los modelos de aeronave | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| I8 | Crear o editar la ficha de un modelo | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I9 | Precargar el catálogo de modelos DJI | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I10 | Subir la autorización ANE de un modelo | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| I11 | Reportar un evento inesperado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I12 | Evaluar un evento inesperado | ✅ | ✅ | 👁 | ✅ | ❌ | ✅ |

### Flota · Baterías y componentes
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| J1 | Ver las baterías | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| J2 | Registrar o editar baterías | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| J3 | Ver los componentes (hélices, motores, etc.) | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| J4 | Agregar, retirar o reemplazar un componente | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |

### Flota · Tripulación
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| K1 | Ver la tripulación | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| K2 | Agregar un tripulante | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| K3 | Editar mi propio perfil de tripulante | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| K4 | Editar el perfil de otro tripulante | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| K5 | Cambiar el rol de un miembro | ✅ | ✅ | 👁 | 👁 | ❌ | ✅ |
| K6 | Editar la membresía de alguien (fechas, dar de baja) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| K7 | Invitar por correo a un piloto, Jefe de Pilotos o Gerente SMS | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| K8 | Invitar por correo a otro Gerente General | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| K9 | Ver y cancelar invitaciones pendientes | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| K10 | Ver el expediente documental de otro tripulante | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |

### Flota · Mantenimiento
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| L1 | Ver el estado de mantenimiento de la flota | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| L2 | Registrar un evento de mantenimiento | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| L3 | Crear un programa de mantenimiento | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| L4 | Crear, editar o eliminar tareas de mantenimiento | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |

### Flota · Existencias de equipo
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| M1 | Ver las existencias (extintores, chalecos, botiquín…) | ✅ | ✅ | ✅ | 👁 | 👁 | ❌ |
| M2 | Crear, editar o eliminar existencias | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |

### Flota · ETA (equipo tecnológico asociado)
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| N1 | Ver el equipo tecnológico asociado | ✅ | ✅ | ✅ | 👁 | 👁 | ❌ |
| N2 | Registrar, editar o eliminar equipo tecnológico asociado | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |

### SMS · Objetivos
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| O1 | Ver los objetivos de seguridad | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| O2 | Crear, editar o eliminar objetivos | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Evaluación de riesgos
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| P1 | Ver la matriz de riesgo y los peligros | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| P2 | Registrar un peligro | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| P3 | Evaluar un peligro (probabilidad y gravedad) | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| P4 | Configurar la matriz de riesgo | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| P5 | Registrar barreras de seguridad | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Gestión del cambio
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| Q1 | Ver los cambios registrados | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| Q2 | Registrar o modificar un cambio | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Indicadores (SPI)
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| R1 | Ver indicadores, ciclos y análisis | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| R2 | Definir indicadores y sembrar el catálogo oficial | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| R3 | Capturar datos mensuales y ciclos | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| R4 | Registrar planes de acción | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| R5 | Marcar el envío anual de los indicadores | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Mejora continua (autoevaluación GAP)
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| S1 | Ver las autoevaluaciones | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| S2 | Crear, diligenciar o eliminar una autoevaluación | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| S3 | Agregar, ocultar o editar preguntas propias | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Reporte mensual a Aerocivil
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| T1 | Ver el paquete mensual | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| T2 | Marcar el envío del paquete mensual | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |

### SMS · Reportes y casos
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| U1 | Reportar un suceso (VOR o MOR) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| U2 | Ver mis propios reportes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| U3 | Ver todos los reportes SMS de la organización | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| U4 | Ver la identidad de quien reporta en un reporte confidencial | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| U5 | Abrir y asumir un caso SMS, y gestionarlo | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| U6 | Agregar y marcar acciones correctivas de un caso | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| U7 | Analizar un reporte y radicarlo ante Aerocivil | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| U8 | Adjuntar evidencias a un reporte | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| U9 | Gestionar el enlace público y el QR para reportar | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### SMS · Asistente de implantación, gobernanza y mapas
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| V1 | Ver el plan de implantación y su avance | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| V2 | Definir y editar el plan de implantación | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| V3 | Publicar la política SMS y designar al Gerente de Seguridad Operacional | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| V4 | Ver el cronograma de capacitación SMS | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |
| V5 | Crear sesiones de capacitación SMS y registrar asistencia | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ |
| V6 | Ver los mapas de restricción | ✅ | ✅ | 👁 | ✅ | 👁 | ❌ |

### Documentación · Capacitación
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| W1 | Ver evaluaciones y material de apoyo | ✅ | ✅ | ✅ | ✅ | 👁 | ❌ |
| W2 | Presentar un examen | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| W3 | Ver mi propio cumplimiento | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| W4 | Ver el cumplimiento de toda la tripulación | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| W5 | Crear, editar o eliminar evaluaciones | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| W6 | Administrar el banco de preguntas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| W7 | Administrar el material de apoyo | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Documentación · Listas de chequeo
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| X1 | Ver las listas de chequeo | ✅ | ✅ | ✅ | 👁 | 👁 | ❌ |
| X2 | Crear, editar o eliminar listas de chequeo | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |

### Documentación · Proveedores
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| Y1 | Ver proveedores y sus auditorías | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Y2 | Crear, editar o eliminar proveedores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Y3 | Registrar, editar o eliminar auditorías | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Y4 | Administrar el checklist de auditoría de proveedores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Documentación · Pólizas
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| Z1 | Ver las pólizas | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |
| Z2 | Crear, editar o eliminar pólizas | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |
| Z3 | Subir o ver el documento de una póliza | ✅ | ✅ | ✅ | 👁 | ❌ | ❌ |

### Documentación · Manuales
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AA1 | Ver y descargar manuales | ✅ | ✅ | ✅ | ✅ | 👁 | ❌ |
| AA2 | Confirmar que leí la versión vigente | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| AA3 | Ver el seguimiento de lectura de todos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AA4 | Cargar, editar o eliminar un manual | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AA5 | Publicar una nueva versión | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Documentación · Importar, registro de acciones y retención
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AB1 | Descargar la plantilla de Excel de carga inicial | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AB2 | Importar datos desde Excel (aeronaves, baterías, tripulación, pólizas) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AB3 | Ver y exportar el registro de acciones (quién hizo qué) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AB4 | Ver las custodias legales | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AB5 | Abrir o modificar una custodia legal | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| AB6 | Liberar una custodia legal | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### Documentación · Reportes
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AC1 | Generar reportes (vuelos, flota, baterías, mantenimiento, programación, proveedores, ETA, servicio) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AC2 | Generar el reporte de tripulación (datos personales) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Organización
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AD1 | Ver los datos de la organización, sus miembros y roles | ✅ | ✅ | 👁 | 👁 | ❌ | 👁 |
| AD2 | Editar los datos de la organización (razón social, NIT, contacto) | ✅ | ✅ | 👁 | 👁 | ❌ | 👁 |
| AD3 | Cambiar el logo | ✅ | ✅ | 👁 | 👁 | ❌ | 👁 |
| AD4 | Ver los contactos de emergencia | ✅ | ✅ | 👁 | 👁 | ✅ | ❌ |
| AD5 | Editar los contactos de emergencia | ✅ | ✅ | 👁 | 👁 | ❌ | ✅ |
| AD6 | Ver la certificación Aerocivil de la organización | ✅ | ✅ | 👁 | 👁 | ✅ | ❌ |
| AD7 | Editar la certificación Aerocivil | ✅ | ✅ | 👁 | 👁 | ❌ | ❌ |
| AD8 | Ver los cargos designados (GSO, Jefe de Pilotos, ejecutivo responsable) | ✅ | ✅ | 👁 | 👁 | 👁 | ❌ |
| AD9 | Designar cargos y subir sus actas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| AD10 | Firmar la declaración de mercancías peligrosas | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AD11 | Preparar el expediente Aerocivil y diligenciar el análisis de riesgos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AD12 | Firmar el análisis de riesgos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Suscripción
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AE1 | Ver el plan actual y el uso (aeronaves, pilotos, vuelos del mes) | ✅ | ✅ | 👁 | 👁 | 👁 | ✅ |
| AE2 | Cambiar el plan | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| AE3 | Pagar o renovar con Wompi | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| AE4 | Cancelar la renovación automática | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| AE5 | Ver el historial de pagos | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

### Panel de la plataforma (solo BitaFly)
| | Función | SA | GG | JP | GS | P | PI |
|---|---|---|---|---|---|---|---|
| AF1 | Ver y editar organizaciones y planes de todos los clientes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AF2 | Gestionar socios, códigos de venta y comisiones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AF3 | Entregar y renovar regalos (perfiles gratis) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AF4 | Buscar y eliminar cuentas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AF5 | Publicar versiones de la app Android | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 3 · Pedidos nuevos que salen de la matriz (no existen todavía)
- **A6 · Segundo factor opcional para todos los roles** (hoy solo el superadmin; el usuario pidió que sea opcional para el cliente y recomendado por seguridad).
- **C3 · Recorrido de bienvenida personalizado según cada perfil.**
- **D6 · Editar o eliminar un vuelo ya registrado** (GG, JP y superadmin). Hoy no existe para nadie.
- **U4-U7 · Superadmin opera casos SMS** (identidad del reportante, abrir casos, acciones correctivas, radicar).

## 4 · Estado de aplicación en el código (2026-10-15)
- **Aplicado:** fuente única en `packages/domain/src/permissionsMatrix.js` (+ pruebas); cada ruta de la API valida el id de la función con `membershipsCanEdit/View` (`src/lib/v2/permissions.js`); `/api/duty/context` entrega a cada pantalla el nivel por función (`permissions`) y el menú lateral, los botones y la paleta de comandos se ocultan según él; el cambio de rol (K5) es solo del Gerente General por las **tres** vías (miembros, membresía y alta de tripulante). En base de datos, políticas **restrictivas** `*_rolegate` limitan la escritura (migración `20261015120000_v2_role_gates.sql`): flota y operación → GG+JP; SMS → GG+GSMS; contactos de emergencia → GG. 334 pruebas de integración (6 nuevas de la matriz).
- **Pendiente (requieren construir algo nuevo):** A6 segundo factor opcional para todos · C3 recorrido de bienvenida por perfil · D6 editar/eliminar vuelos · columna **PI** (piloto independiente = plan «piloto»: ocultar SMS, capacitación, proveedores, manuales, reportes, etc.) · B5 «Ve» para el piloto (descargar sus datos) · piloto sin bitácora de la organización (hoy la RLS de `flights` ya le deja ver solo los suyos) · J3/K1/AD1 ocultos al piloto a nivel de pantalla.
- **Inconsistencia a decidir:** AB6 deja a GSMS liberar una custodia legal, pero AB4/AB5 le niegan verlas y abrirlas; en la práctica no podría hacerlo desde la pantalla.
