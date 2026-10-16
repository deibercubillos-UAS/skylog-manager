// Skylog V2.0 — matriz de permisos por rol: FUENTE ÚNICA (decisión del usuario, 2026-10-15).
// Viene del artefacto «Matriz de permisos BitaFly»; documentada en docs/skylog-v2/70-matriz-de-permisos.md.
// Cada fila: [id, sección, función, "SA GG JP GS P PI" en 6 letras, nota?, comentario del usuario?].
// S = puede (usa y modifica) · V = solo ve · N = no. Orden: superadmin, Gerente General (admin),
// Jefe de Pilotos, Gerente SMS, Piloto, Piloto independiente (plan «piloto»: una sola persona con su empresa).

export const MATRIX_ROLES = ['SA', 'GG', 'JP', 'GS', 'P', 'PI'];

// Rol de membresía en base de datos → columna de la matriz.
export const ROLE_COLUMN = { superadmin: 'SA', admin: 'GG', jefe_pilotos: 'JP', gerente_sms: 'GS', piloto: 'P' };

const LEVEL = { S: 'edit', V: 'view', N: 'none' };

const ROWS = [
  ["A1", "Cuenta y acceso", "Iniciar sesión con correo y contraseña", "SSSSSS"],
  ["A2", "Cuenta y acceso", "Iniciar sesión con Google", "SSSSSS"],
  ["A3", "Cuenta y acceso", "Registrarse creando una empresa (prueba de 15 días)", "SSSSSS", "Pública, antes de iniciar sesión."],
  ["A4", "Cuenta y acceso", "Registrarse uniéndose a una empresa por NIT y rol", "SSSSSS", "El sistema valida el cupo del plan y que Jefe de Pilotos y Gerente SMS sean únicos por empresa."],
  ["A5", "Cuenta y acceso", "Aceptar una invitación por enlace", "SSSSSS"],
  ["A6", "Cuenta y acceso", "Segundo factor de verificación (app autenticadora)", "SSSSSS", "Hoy es obligatorio solo para el superadmin; los demás roles no lo tienen.", "opciónal para el cliente, prerero recomendado por seguridad"],
  ["A7", "Cuenta y acceso", "Cambiar de organización activa", "SSSSSS", "Solo si la persona pertenece a más de una."],
  ["A8", "Cuenta y acceso", "Cerrar sesión", "SSSSSS"],
  ["B1", "Mi perfil", "Editar mis datos personales y contacto de emergencia", "SSSSSS"],
  ["B2", "Mi perfil", "Subir o cambiar mi foto", "SSSSSS"],
  ["B3", "Mi perfil", "Subir y ver mis documentos personales (cédula, licencia, certificado médico)", "SSSSSS"],
  ["B4", "Mi perfil", "Registrar mis adiciones de licencia", "SSSSSS"],
  ["B5", "Mi perfil", "Descargar mis datos personales", "SSSSVS"],
  ["B6", "Mi perfil", "Eliminar mi cuenta", "SSSSSS", "El sistema avisa qué organizaciones se borrarían y bloquea si hay registros bajo retención legal."],
  ["B7", "Mi perfil", "Unirme a otra organización desde el perfil", "SSSSSS"],
  ["C1", "Inicio (dashboard)", "Ver los indicadores, la gráfica de vuelos y las alertas", "SSSSSS"],
  ["C2", "Inicio (dashboard)", "Ver el aviso de suscripción (vence, vencida, activar pago)", "SSSNNS", "Hoy solo quien administra la organización."],
  ["C3", "Inicio (dashboard)", "Ver el recorrido de bienvenida", "SSSSSS", null, "debe se el recorrido personalizado según cada perfil"],
  ["C4", "Inicio (dashboard)", "Buscar con Ctrl+K y atajos", "SSSSSS", "A quien no es gestor se le ocultan las acciones de gestión."],
  ["C5", "Inicio (dashboard)", "Ver, marcar y descartar mis notificaciones", "SSSSSS"],
  ["C6", "Inicio (dashboard)", "Enviar un anuncio a la organización", "SSSSNN"],
  ["D1", "Operación · Bitácora", "Ver la bitácora de vuelos de la organización", "SSSSNS", "Hoy el piloto ve los vuelos de toda la empresa, no solo los suyos."],
  ["D2", "Operación · Bitácora", "Ver el Libro de vuelo por aeronave", "SSSVVS"],
  ["D3", "Operación · Bitácora", "Ver el replay GPS de un vuelo", "SSSSVS"],
  ["D4", "Operación · Bitácora", "Importar vuelos desde los registros DJI", "SSSVSS"],
  ["D5", "Operación · Bitácora", "Registrar un vuelo manualmente", "SSSVNS"],
  ["D6", "Operación · Bitácora", "Editar o eliminar un vuelo ya registrado", "SSSNNN", "Hoy no existe esta función para nadie."],
  ["E1", "Operación · Programación", "Ver las misiones programadas (calendario y lista)", "SSSVSS"],
  ["E2", "Operación · Programación", "Programar una misión (PIC, observador, aeronave, zona, fecha)", "SSSVNS"],
  ["E3", "Operación · Programación", "Modificar o cancelar una misión programada", "SSSVNS"],
  ["E4", "Operación · Programación", "Importar la zona de operación desde un archivo KMZ", "SSSVVS"],
  ["F1", "Operación · Despacho", "Ver mi propio historial de despachos", "SSSSVS"],
  ["F2", "Operación · Despacho", "Ver el historial de despachos de toda la organización", "SSSVNS"],
  ["F3", "Operación · Despacho", "Despachar un vuelo (verificaciones, listas de chequeo, riesgo)", "SSSVSS", "El sistema valida que la persona sea el PIC, que no esté en descanso y que la aeronave sea de la organización."],
  ["F4", "Operación · Despacho", "Cerrar un vuelo despachado", "SSSVSS", "Solo puede cerrarlo quien lo despachó."],
  ["G1", "Operación · Meteorología", "Ver el clima y la aptitud de vuelo de una ubicación", "SSSVSS"],
  ["H1", "Operación · Tiempo de servicio", "Iniciar y cerrar mi período de servicio", "SSSVVS"],
  ["H2", "Operación · Tiempo de servicio", "Ver mi estado de servicio y descanso", "SSSVVS"],
  ["H3", "Operación · Tiempo de servicio", "Ver el estado de otro piloto", "SSSVNS"],
  ["H4", "Operación · Tiempo de servicio", "Ver la planificación y el resumen de cumplimiento de toda la empresa", "SSSVNS"],
  ["H5", "Operación · Tiempo de servicio", "Ver las certificaciones anuales de horas", "SSSVVS"],
  ["H6", "Operación · Tiempo de servicio", "Certificar las horas anuales de un piloto", "SSSVNS"],
  ["H7", "Operación · Tiempo de servicio", "Autorizar una excepción de descanso", "SSSVNS"],
  ["I1", "Flota · Aeronaves", "Ver las aeronaves", "SSSVVS"],
  ["I2", "Flota · Aeronaves", "Registrar una aeronave", "SSSVNS", "Limitado por el cupo de aeronaves del plan."],
  ["I3", "Flota · Aeronaves", "Editar una aeronave", "SSSVNS"],
  ["I4", "Flota · Aeronaves", "Subir o cambiar la foto de la aeronave", "SSSVNS"],
  ["I5", "Flota · Aeronaves", "Ver el documento de propiedad", "SSSVVS"],
  ["I6", "Flota · Aeronaves", "Subir el documento de propiedad", "SSSVNS"],
  ["I7", "Flota · Aeronaves", "Ver los modelos de aeronave", "SSSVVS"],
  ["I8", "Flota · Aeronaves", "Crear o editar la ficha de un modelo", "SSSVNS"],
  ["I9", "Flota · Aeronaves", "Precargar el catálogo de modelos DJI", "SSSVNS"],
  ["I10", "Flota · Aeronaves", "Subir la autorización ANE de un modelo", "SSSVNS"],
  ["I11", "Flota · Aeronaves", "Reportar un evento inesperado", "SSSSSS"],
  ["I12", "Flota · Aeronaves", "Evaluar un evento inesperado", "SSVSNS"],
  ["J1", "Flota · Baterías y componentes", "Ver las baterías", "SSSVVS"],
  ["J2", "Flota · Baterías y componentes", "Registrar o editar baterías", "SSSVNS", "Limitado por el cupo de baterías del plan."],
  ["J3", "Flota · Baterías y componentes", "Ver los componentes (hélices, motores, etc.)", "SSSVNS"],
  ["J4", "Flota · Baterías y componentes", "Agregar, retirar o reemplazar un componente", "SSSVNS"],
  ["K1", "Flota · Tripulación", "Ver la tripulación", "SSSVNS"],
  ["K2", "Flota · Tripulación", "Agregar un tripulante", "SSSVNS", "Limitado por el cupo de pilotos del plan."],
  ["K3", "Flota · Tripulación", "Editar mi propio perfil de tripulante", "SSSSSS"],
  ["K4", "Flota · Tripulación", "Editar el perfil de otro tripulante", "SSSNNS"],
  ["K5", "Flota · Tripulación", "Cambiar el rol de un miembro", "SSVVNS", "Hallazgo: hoy un Jefe de Pilotos o Gerente SMS puede ascender a alguien (o a sí mismo) a Gerente General."],
  ["K6", "Flota · Tripulación", "Editar la membresía de alguien (fechas, dar de baja)", "SSSSNS"],
  ["K7", "Flota · Tripulación", "Invitar por correo a un piloto, Jefe de Pilotos o Gerente SMS", "SSSNNS"],
  ["K8", "Flota · Tripulación", "Invitar por correo a otro Gerente General", "SSNNNS"],
  ["K9", "Flota · Tripulación", "Ver y cancelar invitaciones pendientes", "SSSVNS"],
  ["K10", "Flota · Tripulación", "Ver el expediente documental de otro tripulante", "SSSVNS", "Cédula, licencia, certificado médico y adiciones."],
  ["L1", "Flota · Mantenimiento", "Ver el estado de mantenimiento de la flota", "SSSVVS"],
  ["L2", "Flota · Mantenimiento", "Registrar un evento de mantenimiento", "SSSVNS"],
  ["L3", "Flota · Mantenimiento", "Crear un programa de mantenimiento", "SSSVNS"],
  ["L4", "Flota · Mantenimiento", "Crear, editar o eliminar tareas de mantenimiento", "SSSVNS"],
  ["M1", "Flota · Existencias de equipo", "Ver las existencias (extintores, chalecos, botiquín…)", "SSSVVN"],
  ["M2", "Flota · Existencias de equipo", "Crear, editar o eliminar existencias", "SSSVNN"],
  ["N1", "Flota · ETA (equipo tecnológico asociado)", "Ver el equipo tecnológico asociado", "SSSVVN"],
  ["N2", "Flota · ETA (equipo tecnológico asociado)", "Registrar, editar o eliminar equipo tecnológico asociado", "SSSVNN"],
  ["O1", "SMS · Objetivos", "Ver los objetivos de seguridad", "SSVSVN"],
  ["O2", "SMS · Objetivos", "Crear, editar o eliminar objetivos", "SSVSNN"],
  ["P1", "SMS · Evaluación de riesgos", "Ver la matriz de riesgo y los peligros", "SSVSVN"],
  ["P2", "SMS · Evaluación de riesgos", "Registrar un peligro", "SSVSNN"],
  ["P3", "SMS · Evaluación de riesgos", "Evaluar un peligro (probabilidad y gravedad)", "SSVSNN"],
  ["P4", "SMS · Evaluación de riesgos", "Configurar la matriz de riesgo", "SSVSNN"],
  ["P5", "SMS · Evaluación de riesgos", "Registrar barreras de seguridad", "SSVSNN"],
  ["Q1", "SMS · Gestión del cambio", "Ver los cambios registrados", "SSVSVN"],
  ["Q2", "SMS · Gestión del cambio", "Registrar o modificar un cambio", "SSVSNN"],
  ["R1", "SMS · Indicadores (SPI)", "Ver indicadores, ciclos y análisis", "SSVSVN"],
  ["R2", "SMS · Indicadores (SPI)", "Definir indicadores y sembrar el catálogo oficial", "SSVSNN"],
  ["R3", "SMS · Indicadores (SPI)", "Capturar datos mensuales y ciclos", "SSVSNN"],
  ["R4", "SMS · Indicadores (SPI)", "Registrar planes de acción", "SSVSNN"],
  ["R5", "SMS · Indicadores (SPI)", "Marcar el envío anual de los indicadores", "SSVSNN"],
  ["S1", "SMS · Mejora continua (autoevaluación GAP)", "Ver las autoevaluaciones", "SSVSVN"],
  ["S2", "SMS · Mejora continua (autoevaluación GAP)", "Crear, diligenciar o eliminar una autoevaluación", "SSVSNN"],
  ["S3", "SMS · Mejora continua (autoevaluación GAP)", "Agregar, ocultar o editar preguntas propias", "SSVSNN"],
  ["T1", "SMS · Reporte mensual a Aerocivil", "Ver el paquete mensual", "SSVSNN"],
  ["T2", "SMS · Reporte mensual a Aerocivil", "Marcar el envío del paquete mensual", "SSVSNN"],
  ["U1", "SMS · Reportes y casos", "Reportar un suceso (VOR o MOR)", "SSSSSN"],
  ["U2", "SMS · Reportes y casos", "Ver mis propios reportes", "SSSSSN"],
  ["U3", "SMS · Reportes y casos", "Ver todos los reportes SMS de la organización", "SSVSNN"],
  ["U4", "SMS · Reportes y casos", "Ver la identidad de quien reporta en un reporte confidencial", "SNNSNN", "También la ve quien reportó."],
  ["U5", "SMS · Reportes y casos", "Abrir y asumir un caso SMS, y gestionarlo", "SNNSNN", "Hoy solo el rol Gerente SMS, ni siquiera el Gerente General."],
  ["U6", "SMS · Reportes y casos", "Agregar y marcar acciones correctivas de un caso", "SNNSNN"],
  ["U7", "SMS · Reportes y casos", "Analizar un reporte y radicarlo ante Aerocivil", "SNNSNN"],
  ["U8", "SMS · Reportes y casos", "Adjuntar evidencias a un reporte", "SSNSSN", "A los reportes propios; el Gerente SMS, a cualquiera."],
  ["U9", "SMS · Reportes y casos", "Gestionar el enlace público y el QR para reportar", "SSNSNN"],
  ["V1", "SMS · Asistente de implantación, gobernanza y mapas", "Ver el plan de implantación y su avance", "SSVSVN"],
  ["V2", "SMS · Asistente de implantación, gobernanza y mapas", "Definir y editar el plan de implantación", "SSVSNN"],
  ["V3", "SMS · Asistente de implantación, gobernanza y mapas", "Publicar la política SMS y designar al Gerente de Seguridad Operacional", "SSVSNN", "Pantalla de gobernanza, hoy oculta del menú."],
  ["V4", "SMS · Asistente de implantación, gobernanza y mapas", "Ver el cronograma de capacitación SMS", "SSVSVN"],
  ["V5", "SMS · Asistente de implantación, gobernanza y mapas", "Crear sesiones de capacitación SMS y registrar asistencia", "SSVSNN"],
  ["V6", "SMS · Asistente de implantación, gobernanza y mapas", "Ver los mapas de restricción", "SSVSVN"],
  ["W1", "Documentación · Capacitación", "Ver evaluaciones y material de apoyo", "SSSSVN"],
  ["W2", "Documentación · Capacitación", "Presentar un examen", "SSSSSN"],
  ["W3", "Documentación · Capacitación", "Ver mi propio cumplimiento", "SSSSSN"],
  ["W4", "Documentación · Capacitación", "Ver el cumplimiento de toda la tripulación", "SSSSNN"],
  ["W5", "Documentación · Capacitación", "Crear, editar o eliminar evaluaciones", "SSSSNN"],
  ["W6", "Documentación · Capacitación", "Administrar el banco de preguntas", "SSSSNN"],
  ["W7", "Documentación · Capacitación", "Administrar el material de apoyo", "SSSSNN"],
  ["X1", "Documentación · Listas de chequeo", "Ver las listas de chequeo", "SSSVVN"],
  ["X2", "Documentación · Listas de chequeo", "Crear, editar o eliminar listas de chequeo", "SSSVNN"],
  ["Y1", "Documentación · Proveedores", "Ver proveedores y sus auditorías", "SSSSNN", "Hoy el piloto ni siquiera ve la pantalla."],
  ["Y2", "Documentación · Proveedores", "Crear, editar o eliminar proveedores", "SSSSNN"],
  ["Y3", "Documentación · Proveedores", "Registrar, editar o eliminar auditorías", "SSSSNN"],
  ["Y4", "Documentación · Proveedores", "Administrar el checklist de auditoría de proveedores", "SSSSNN"],
  ["Z1", "Documentación · Pólizas", "Ver las pólizas", "SSSVNN"],
  ["Z2", "Documentación · Pólizas", "Crear, editar o eliminar pólizas", "SSSVNN"],
  ["Z3", "Documentación · Pólizas", "Subir o ver el documento de una póliza", "SSSVNN"],
  ["AA1", "Documentación · Manuales", "Ver y descargar manuales", "SSSSVN"],
  ["AA2", "Documentación · Manuales", "Confirmar que leí la versión vigente", "SSSSSN"],
  ["AA3", "Documentación · Manuales", "Ver el seguimiento de lectura de todos", "SSSSNN"],
  ["AA4", "Documentación · Manuales", "Cargar, editar o eliminar un manual", "SSSSNN"],
  ["AA5", "Documentación · Manuales", "Publicar una nueva versión", "SSSSNN"],
  ["AB1", "Documentación · Importar, registro de acciones y retención", "Descargar la plantilla de Excel de carga inicial", "SSSNNN"],
  ["AB2", "Documentación · Importar, registro de acciones y retención", "Importar datos desde Excel (aeronaves, baterías, tripulación, pólizas)", "SSSNNN"],
  ["AB3", "Documentación · Importar, registro de acciones y retención", "Ver y exportar el registro de acciones (quién hizo qué)", "SSSNNN"],
  ["AB4", "Documentación · Importar, registro de acciones y retención", "Ver las custodias legales", "SSSNNN"],
  ["AB5", "Documentación · Importar, registro de acciones y retención", "Abrir o modificar una custodia legal", "SSSNNN"],
  ["AB6", "Documentación · Importar, registro de acciones y retención", "Liberar una custodia legal", "SSNSNN", "Hoy solo Gerente General y Gerente SMS."],
  ["AC1", "Documentación · Reportes", "Generar reportes (vuelos, flota, baterías, mantenimiento, programación, proveedores, ETA, servicio)", "SSSSNN"],
  ["AC2", "Documentación · Reportes", "Generar el reporte de tripulación (datos personales)", "SSSSNN"],
  ["AD1", "Organización", "Ver los datos de la organización, sus miembros y roles", "SSVVNV"],
  ["AD2", "Organización", "Editar los datos de la organización (razón social, NIT, contacto)", "SSVVNV"],
  ["AD3", "Organización", "Cambiar el logo", "SSVVNV"],
  ["AD4", "Organización", "Ver los contactos de emergencia", "SSVVSN"],
  ["AD5", "Organización", "Editar los contactos de emergencia", "SSVVNS"],
  ["AD6", "Organización", "Ver la certificación Aerocivil de la organización", "SSVVSN"],
  ["AD7", "Organización", "Editar la certificación Aerocivil", "SSVVNN"],
  ["AD8", "Organización", "Ver los cargos designados (GSO, Jefe de Pilotos, ejecutivo responsable)", "SSVVVN"],
  ["AD9", "Organización", "Designar cargos y subir sus actas", "SSNNNN", "Hoy solo Gerente General y Gerente SMS."],
  ["AD10", "Organización", "Firmar la declaración de mercancías peligrosas", "SSSSNN", "Hoy solo Gerente General y Gerente SMS."],
  ["AD11", "Organización", "Preparar el expediente Aerocivil y diligenciar el análisis de riesgos", "SSSSNN", "Pantalla hoy oculta del menú."],
  ["AD12", "Organización", "Firmar el análisis de riesgos", "SSSSNN", "Pantalla hoy oculta del menú."],
  ["AE1", "Suscripción", "Ver el plan actual y el uso (aeronaves, pilotos, vuelos del mes)", "SSVVVS"],
  ["AE2", "Suscripción", "Cambiar el plan", "SSNNNS"],
  ["AE3", "Suscripción", "Pagar o renovar con Wompi", "SSNNNS"],
  ["AE4", "Suscripción", "Cancelar la renovación automática", "SSNNNS"],
  ["AE5", "Suscripción", "Ver el historial de pagos", "SSNNNS"],
  ["AF1", "Panel de la plataforma (solo BitaFly)", "Ver y editar organizaciones y planes de todos los clientes", "SNNNNN"],
  ["AF2", "Panel de la plataforma (solo BitaFly)", "Gestionar socios, códigos de venta y comisiones", "SNNNNN"],
  ["AF3", "Panel de la plataforma (solo BitaFly)", "Entregar y renovar regalos (perfiles gratis)", "SNNNNN"],
  ["AF4", "Panel de la plataforma (solo BitaFly)", "Buscar y eliminar cuentas", "SNNNNN"],
  ["AF5", "Panel de la plataforma (solo BitaFly)", "Publicar versiones de la app Android", "SNNNNN"],
];

export const PERMISSION_MATRIX = ROWS.map(([id, section, name, v, note, comment]) => ({
  id,
  section,
  name,
  note: note || null,
  comment: comment || null,
  levels: Object.fromEntries(MATRIX_ROLES.map((r, i) => [r, LEVEL[v[i]]])),
}));

const BY_ID = Object.fromEntries(PERMISSION_MATRIX.map((p) => [p.id, p]));

/** Nivel ('edit' | 'view' | 'none') que un rol de membresía tiene sobre una función de la matriz. */
export function permissionLevel(role, id, { independentPilot = false } = {}) {
  const row = BY_ID[id];
  if (!row) throw new Error('Función de permisos desconocida: ' + id);
  const col = independentPilot ? 'PI' : ROLE_COLUMN[role];
  return col ? row.levels[col] : 'none';
}

export const canEdit = (role, id, opts) => permissionLevel(role, id, opts) === 'edit';
export const canView = (role, id, opts) => permissionLevel(role, id, opts) !== 'none';

/** ¿Alguna de las membresías de la organización puede editar / ver esta función? */
export function membershipsCanEdit(memberships, organizationId, id, opts) {
  return (memberships || []).some((m) => m.organization_id === organizationId && canEdit(m.role, id, opts));
}
export function membershipsCanView(memberships, organizationId, id, opts) {
  return (memberships || []).some((m) => m.organization_id === organizationId && canView(m.role, id, opts));
}

/** { id: 'edit' | 'view' | 'none' } para un rol de membresía (lo que el cliente usa para mostrar u ocultar). */
export function permissionsForRole(role, { independentPilot = false } = {}) {
  const col = independentPilot ? 'PI' : ROLE_COLUMN[role];
  return Object.fromEntries(PERMISSION_MATRIX.map((p) => [p.id, col ? p.levels[col] : 'none']));
}
