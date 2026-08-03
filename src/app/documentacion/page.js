import Link from 'next/link';
import SEONav from '@/components/seo/SEONav';
import SEOFooter from '@/components/seo/SEOFooter';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');

export const metadata = {
  title: 'Documentación | Bitafly — Guía de Usuario',
  description: 'Guía completa de uso de Bitafly: configuración inicial, gestión de flota, planificación de misiones, bitácora digital, seguridad SMS y reportes RAC 100 con tu propio código de formato.',
  alternates: { canonical: '/documentacion' },
  openGraph: {
    title: 'Documentación Bitafly — Guía de Usuario Completa',
    description: 'Aprende a usar Bitafly paso a paso: desde la configuración hasta los reportes RAC 100 para la AeroCivil.',
    url: `${SITE_URL}/documentacion`,
    type: 'website',
  },
};

// ─── Datos de las 6 fases ────────────────────────────────────────────────────

const FASES = [
  {
    id: 'fase-1',
    num: '01',
    title: 'Configuración Inicial',
    titleCorto: 'Configuración',
    subtitle: 'Prepara tu organización antes de operar',
    icon: 'settings',
    color: 'from-orange-500 to-orange-600',
    colorSolid: 'bg-orange-500',
    roles: ['Admin'],
    duracion: '~15 min',
    desc: 'El primer paso es crear la cuenta de tu organización y dejar la plataforma lista para que tu equipo pueda operar. Aquí defines la identidad corporativa, vinculas a tu tripulación, cargas el historial previo con la plantilla Excel y configuras los parámetros de seguridad.',
    pasos: [
      { icon: 'how_to_reg', title: 'Crear cuenta de organización', desc: 'Regístrate en /registro con tu correo corporativo. La plataforma crea automáticamente una organización con un código único de vinculación.' },
      { icon: 'business', title: 'Configurar identidad corporativa', desc: 'En Configuración → Organización completa la razón social, NIT/cédula, número de explotador DAN, representante legal, teléfono, dirección y correo oficial. Sube el logo de la empresa.' },
      { icon: 'table_view', title: 'Cargar datos históricos con plantilla Excel', desc: 'Si ya tienes información de vuelos, pilotos, aeronaves o baterías en registros anteriores, descarga la plantilla Excel oficial desde Bitácora → Importar → Descargar Plantilla. Llena las columnas con tus datos existentes (aeronave, piloto, fecha, hora despegue/aterrizaje, baterías, condiciones) y cárgala. El sistema valida el formato, detecta duplicados y registra el historial completo en un solo paso. Ideal para migrar desde Excel de la AeroCivil o bitácoras manuales.' },
      { icon: 'link', title: 'Vincular tripulación', desc: 'Comparte el código único de tu organización a tus pilotos y gerentes. Cada miembro se registra y usa ese código para unirse a tu flota. El administrador asigna el rol correspondiente.' },
      { icon: 'badge', title: 'Configurar roles y permisos', desc: 'Bitafly tiene 4 roles: Administrador, Gerente SMS, Jefe de Pilotos y Piloto. Cada rol tiene permisos específicos sobre los módulos del sistema.' },
      { icon: 'policy', title: 'Registrar pólizas de seguro', desc: 'En Configuración → Pólizas registra las pólizas de seguro de la flota: aseguradora, número de póliza, vigencia y aeronave cubierta. El sistema alerta cuando se acercan los vencimientos.' },
      { icon: 'health_and_safety', title: 'Configurar parámetros SMS', desc: 'En Seguridad y SMS activa el sistema de gestión de seguridad. Define los umbrales de riesgo y configura las listas SORA/OSO de tu organización.' },
      { icon: 'key', title: 'Conectar credenciales AeroCivil', desc: 'En Configuración → Cuenta AeroCivil ingresa tus credenciales del portal de la UAEAC para habilitar la generación automática de solicitudes de vuelo.' },
    ],
    roles_tabla: [
      { accion: 'Crear y editar organización', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Gestionar usuarios y roles', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Importar datos con plantilla Excel', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Registrar pólizas de seguro', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Configurar parámetros SMS', admin: true, gerente: true, jefe: false, piloto: false },
      { accion: 'Ver configuración', admin: true, gerente: 'ver', jefe: 'ver', piloto: false },
    ],
    nota: 'La plantilla Excel acepta el formato estándar de la AeroCivil. Si tienes registros en hojas de cálculo propias, solo asegúrate de que las columnas de aeronave, piloto, fecha y horas de vuelo coincidan con los encabezados de la plantilla. Los registros duplicados (misma aeronave, fecha y hora de despegue) se ignoran automáticamente para evitar conteos dobles.',
  },
  {
    id: 'fase-2',
    num: '02',
    title: 'Gestión de Flota y Pilotos',
    titleCorto: 'Flota',
    subtitle: 'Registra tus aeronaves y tripulación',
    icon: 'precision_manufacturing',
    color: 'from-slate-700 to-slate-800',
    colorSolid: 'bg-slate-700',
    roles: ['Admin', 'Jefe de Pilotos'],
    duracion: '~20 min',
    desc: 'Antes de planificar cualquier misión, necesitas tener registradas todas tus aeronaves, baterías y pilotos. Este es el corazón del cumplimiento RAC 100: cada activo tiene su hoja de vida digital.',
    pasos: [
      { icon: 'flight', title: 'Registrar aeronaves', desc: 'En Flota → Nueva Aeronave ingresa modelo, número de serie, matrícula, fabricante, fecha de adquisición y horas iniciales. Cada aeronave tiene su propio expediente de mantenimiento.' },
      { icon: 'battery_charging_full', title: 'Registrar baterías LiPo', desc: 'En Flota → Baterías registra cada batería con su serial, capacidad (mAh), número de celdas, ciclos iniciales y aeronave asignada. El sistema lleva el conteo automático de ciclos por vuelo.' },
      { icon: 'build', title: 'Configurar alertas de mantenimiento', desc: 'Activa las alertas por horas de vuelo (ej. cada 200h) y por tiempo calendario (ej. cada 6 meses). El dashboard principal mostrará las aeronaves que requieren intervención.' },
      { icon: 'person_add', title: 'Registrar pilotos', desc: 'En Tripulación → Nuevo Piloto ingresa nombre, número de licencia CIPU, vencimiento del examen médico y contacto de emergencia. El sistema alerta 30 días antes del vencimiento del médico.' },
      { icon: 'upload_file', title: 'Subir documentos y certificados', desc: 'Adjunta el certificado médico, la licencia y los registros de entrenamiento de cada piloto. Los documentos quedan almacenados en el expediente digital del tripulante.' },
      { icon: 'assignment_ind', title: 'Asignar pilotos a aeronaves', desc: 'Configura qué pilotos están habilitados para operar cada aeronave de la flota. Esto se valida automáticamente al planificar una misión.' },
    ],
    roles_tabla: [
      { accion: 'Registrar y editar aeronaves', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Registrar y editar baterías', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Registrar y editar pilotos', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Ver flota y tripulación', admin: true, gerente: 'ver', jefe: true, piloto: 'ver' },
      { accion: 'Subir documentos de pilotos', admin: true, gerente: false, jefe: true, piloto: 'propio' },
    ],
    nota: 'Las horas "iniciales" de la aeronave son las horas acumuladas antes de ingresar a Bitafly. Es fundamental ingresarlas correctamente para que los reportes reflejen el historial real del equipo.',
  },
  {
    id: 'fase-3',
    num: '03',
    title: 'Planificación de Misión',
    titleCorto: 'Misiones',
    subtitle: 'Crea y autoriza misiones de vuelo',
    icon: 'map',
    color: 'from-blue-600 to-blue-700',
    colorSolid: 'bg-blue-600',
    roles: ['Admin', 'Jefe de Pilotos', 'Piloto'],
    duracion: '~10 min por misión',
    desc: 'Cada operación comienza con una misión planificada. Bitafly centraliza toda la información preoperacional: zona de vuelo, tripulación asignada, aeronave seleccionada y evaluación de riesgo SORA.',
    pasos: [
      { icon: 'add_circle', title: 'Crear nueva misión', desc: 'En Misiones → Nueva Misión define el número de misión (generado automáticamente), tipo de operación (VLOS, BVLOS, nocturno), ubicación y fecha programada.' },
      { icon: 'group', title: 'Asignar tripulación y aeronave', desc: 'Selecciona el piloto al mando (PIC) y la aeronave a utilizar. El sistema valida que el piloto tenga licencia vigente y la aeronave esté habilitada para operación.' },
      { icon: 'checklist', title: 'Completar lista de verificación pre-vuelo', desc: 'El piloto completa el checklist preoperacional: condiciones meteorológicas, verificación física de la aeronave, estado de baterías, espacio aéreo y zona de operación.' },
      { icon: 'analytics', title: 'Evaluación de riesgo SORA — asistente 6 pasos', desc: 'El asistente SORA guía paso a paso: Identificación → Riesgo Terrestre (GRC intrínseco + matriz) → Mitigaciones M1/M2/M3 → Riesgo Aéreo (ARC por clase de espacio ICAO) → Mitigaciones estratégicas → SAIL final (I–VI) + checklist de OSOs requeridos. El nivel SAIL determina los Objetivos de Seguridad Operacional que debes demostrar ante la Aerocivil.' },
      { icon: 'map', title: 'Verificar mapas de restricción ArcGIS', desc: 'Antes de solicitar la autorización, consulta el visor oficial Aerocivil en Seguridad → Mapas de Restricción UAS. Muestra zonas prohibidas, restringidas y peligrosas en tiempo real desde el portal de la UAEAC. Si la zona de operación está afectada, aparece un banner de advertencia en el formulario de plan de vuelo.' },
      { icon: 'gavel', title: 'Solicitar autorización AeroCivil', desc: 'Con los datos de la misión completos, genera el formato F-OPS-001 automáticamente y envíalo al portal de la UAEAC. Bitafly pre-llena todos los campos exigidos.' },
      { icon: 'verified', title: 'Aprobar y activar la misión', desc: 'El administrador o jefe de pilotos revisa la misión y la aprueba. A partir de ese momento el piloto puede registrar los vuelos asociados a esa misión.' },
    ],
    roles_tabla: [
      { accion: 'Crear y editar misiones', admin: true, gerente: false, jefe: true, piloto: true },
      { accion: 'Aprobar misiones', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Completar checklist pre-vuelo', admin: true, gerente: false, jefe: true, piloto: true },
      { accion: 'Ejecutar evaluación SORA', admin: true, gerente: true, jefe: true, piloto: false },
      { accion: 'Generar solicitud AeroCivil', admin: true, gerente: false, jefe: true, piloto: false },
    ],
    nota: 'Una misión puede tener múltiples vuelos asociados (ej. varios despegues en el mismo día). Cada vuelo se registra individualmente en la bitácora pero referencia la misma misión.',
  },
  {
    id: 'fase-4',
    num: '04',
    title: 'Ejecución y Bitácora',
    titleCorto: 'Bitácora',
    subtitle: 'Registra cada vuelo con precisión RAC 100',
    icon: 'flight_takeoff',
    color: 'from-emerald-600 to-emerald-700',
    colorSolid: 'bg-emerald-600',
    roles: ['Piloto', 'Admin', 'Jefe de Pilotos'],
    duracion: '~5 min por vuelo',
    desc: 'La bitácora digital es el core de Bitafly. Cada vuelo registrado alimenta automáticamente las horas totales de la aeronave, los ciclos de las baterías y el historial del piloto. Puedes importar vuelos directamente desde tu controlador DJI RC y revisar cada vuelo con el Replay GPS animado. Cumplimiento RAC 100 en tiempo real.',
    pasos: [
      { icon: 'flight_takeoff', title: 'Registrar nuevo vuelo', desc: 'En Bitácora → Nuevo Vuelo selecciona la misión activa. El sistema pre-llena aeronave, piloto y condiciones base. Ingresa hora de despegue y hora de aterrizaje.' },
      { icon: 'wb_sunny', title: 'Condiciones del vuelo', desc: 'Registra la condición visual (VMC, IMC, NIGHT), velocidad del viento y observaciones meteorológicas. Estos datos son obligatorios para el reporte F-OPS-002.' },
      { icon: 'battery_charging_full', title: 'Seleccionar baterías utilizadas', desc: 'Marca las baterías empleadas en el vuelo. El sistema suma automáticamente un ciclo a cada una y actualiza el conteo total.' },
      { icon: 'timer', title: 'Calcular tiempo de vuelo', desc: 'Con los tiempos de despegue y aterrizaje, Bitafly calcula automáticamente la duración del vuelo y la suma a las horas totales de la aeronave y del piloto.' },
      { icon: 'warning', title: 'Registrar incidentes o anomalías', desc: 'Si ocurre cualquier evento anormal durante el vuelo, regístralo en el campo de incidentes. Esto puede derivar en un reporte SMS dependiendo de la clasificación.' },
      { icon: 'note_add', title: 'Observaciones y cierre', desc: 'Agrega notas operacionales, condiciones de aterrizaje y firma digital del piloto al mando. El vuelo queda registrado en la bitácora de la organización.' },
      { icon: 'build', title: 'Registrar mantenimiento post-vuelo', desc: 'Si se realizó alguna intervención en la aeronave (limpieza, ajuste, calibración), regístrala en Mantenimiento. El sistema actualiza el historial técnico.' },
      { icon: 'sync', title: 'Importar vuelos desde DJI RC', desc: 'En Bitácora → Importar DJI, copia la carpeta FlightRecord desde tu controlador DJI RC 2, Android o iPhone al PC. Bitafly detecta automáticamente la aeronave por número de serie, actualiza las horas de vuelo y los ciclos de batería. Si la aeronave no existe, ofrece crearla pre-llenada.' },
      { icon: 'replay', title: 'Replay GPS animado', desc: 'Desde cualquier vuelo en la bitácora, pulsa el botón de replay (naranja = guardado, gris = disponible). Sube el archivo .txt del DJI y revisa la ruta GPS cuadro a cuadro: posición, joysticks RC, nivel de batería y alertas en tiempo real. El replay se guarda en la nube según las cuotas de tu plan.' },
      { icon: 'person_edit', title: 'Editar piloto al mando (PIC)', desc: 'Administradores y Jefes de Pilotos pueden cambiar el piloto asignado a cualquier vuelo directamente desde la bitácora con un dropdown inline, sin necesidad de eliminar y recrgar el registro.' },
    ],
    roles_tabla: [
      { accion: 'Registrar vuelos en bitácora', admin: true, gerente: false, jefe: true, piloto: true },
      { accion: 'Editar vuelos existentes', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Editar piloto (PIC) de un vuelo', admin: true, gerente: false, jefe: true, piloto: false },
      { accion: 'Eliminar vuelos', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Registrar incidentes', admin: true, gerente: true, jefe: true, piloto: true },
      { accion: 'Importar vuelos desde DJI RC / Excel', admin: true, gerente: false, jefe: true, piloto: true },
      { accion: 'Ver y guardar Replay de Vuelo', admin: true, gerente: true, jefe: true, piloto: false },
    ],
    nota: 'La importación DJI detecta automáticamente la aeronave y la batería por número de serie. Si importas un vuelo duplicado (misma aeronave, fecha y hora de despegue), el sistema lo ignora sin generar error. También puedes importar desde Excel/CSV en el formato estándar de la AeroCivil.',
  },
  {
    id: 'fase-5',
    num: '05',
    title: 'Seguridad y SMS',
    titleCorto: 'SMS',
    subtitle: 'Sistema de gestión de seguridad operacional',
    icon: 'health_and_safety',
    color: 'from-red-600 to-red-700',
    colorSolid: 'bg-red-600',
    roles: ['Gerente SMS', 'Admin', 'Todos (reportar)'],
    duracion: 'Continuo',
    desc: 'El Sistema de Gestión de Seguridad (SMS) aeronáutico es un requisito RAC 100. Bitafly integra la gestión de incidentes, la evaluación de riesgo SORA y el seguimiento de acciones correctivas en un solo módulo.',
    pasos: [
      { icon: 'report_problem', title: 'Reportar evento de seguridad', desc: 'Cualquier usuario puede reportar un evento: incidente, incidente grave o accidente. Describe el evento, fecha, aeronave involucrada y circunstancias. El sistema asigna un número de reporte automático.' },
      { icon: 'category', title: 'Clasificar el evento', desc: 'El Gerente SMS clasifica el evento según la severidad (Bajo/Medio/Alto/Crítico) y el tipo (operacional, técnico, humano, organizacional). Esta clasificación determina el proceso de investigación.' },
      { icon: 'manage_search', title: 'Investigar causa raíz', desc: 'Documenta la cadena de causas del evento: causa inmediata, factores contribuyentes y causas raíz. Usa el análisis de árbol de fallos integrado en el formulario de investigación.' },
      { icon: 'task_alt', title: 'Definir acciones correctivas', desc: 'Por cada causa raíz identifica una acción correctiva con responsable, fecha límite y criterio de verificación. El sistema hace seguimiento del estado de cada acción.' },
      { icon: 'analytics', title: 'Evaluación de riesgo SORA (6 pasos)', desc: 'El asistente SORA calcula el nivel SAIL (I–VI) combinando el GRC (riesgo terrestre) y el ARC (riesgo aéreo). El resultado incluye la lista de OSOs obligatorios con su nivel de robustez requerido. Los datos de cada evaluación quedan guardados con historial por misión.' },
      { icon: 'policy', title: 'Revisar cumplimiento y OSOs', desc: 'Verifica que los Objetivos de Seguridad Operacional (OSOs) requeridos para el nivel SAIL estén implementados. La lista de OSOs puede ser personalizada por tu organización en Configuración → Seguridad.' },
      { icon: 'qr_code_2', title: 'Formularios VOR/MOR por código QR', desc: 'Genera y comparte un código QR de tu organización para que cualquier persona (sin necesidad de cuenta) reporte voluntariamente ocurrencias o peligros (VOR) y sucesos de mantenimiento (MOR). Los reportes llegan directamente al módulo SMS de tu organización.' },
      { icon: 'map', title: 'Mapas de restricción ArcGIS', desc: 'En Seguridad → Mapas de Restricción UAS consulta el visor oficial de la Aerocivil con capas de zonas prohibidas, restringidas y peligrosas. Útil para verificar el espacio aéreo antes de planificar una misión y documentar la diligencia previa.' },
    ],
    roles_tabla: [
      { accion: 'Crear reporte SMS / VOR / MOR', admin: true, gerente: true, jefe: true, piloto: true },
      { accion: 'Recibir reportes por QR (VOR/MOR)', admin: true, gerente: true, jefe: false, piloto: false },
      { accion: 'Clasificar e investigar eventos', admin: true, gerente: true, jefe: false, piloto: false },
      { accion: 'Definir acciones correctivas', admin: true, gerente: true, jefe: false, piloto: false },
      { accion: 'Ejecutar evaluación SORA', admin: true, gerente: true, jefe: true, piloto: false },
      { accion: 'Configurar lista OSO personalizada', admin: true, gerente: true, jefe: false, piloto: false },
      { accion: 'Ver mapas de restricción ArcGIS', admin: true, gerente: true, jefe: true, piloto: true },
    ],
    nota: 'Los formularios VOR/MOR por QR no requieren que el reportante tenga cuenta en Bitafly. Son ideales para que clientes, observadores o el público general reporten ocurrencias durante tus operaciones sin fricciones.',
  },
  {
    id: 'fase-6',
    num: '06',
    title: 'Reportes y Administración',
    titleCorto: 'Reportes',
    subtitle: 'Exporta reportes y gestiona tu cuenta',
    icon: 'assessment',
    color: 'from-purple-600 to-purple-700',
    colorSolid: 'bg-purple-600',
    roles: ['Admin', 'Gerente SMS', 'Jefe de Pilotos'],
    duracion: '~5 min por reporte',
    desc: 'Bitafly genera en un clic todos los reportes que exige la RAC 100 en PDF con membrete corporativo y tu propio código de formato. Además, desde el panel de administración gestionas usuarios, planes y configuración avanzada.',
    pasos: [
      { icon: 'summarize', title: 'Centro de reportes', desc: 'En Reportes selecciona el tipo de reporte: Maestro de Vuelo (F-OPS-002), Registro de Baterías (F-MNT-003), Bitácora de Piloto (F-HUM-005) o Expediente de Tripulante. Los códigos de formato son configurables por la organización.' },
      { icon: 'menu_book', title: 'Reporte de bitácora', desc: 'Filtra por rango de fechas, aeronave o piloto y exporta el Maestro de Vuelo en PDF. Incluye logo corporativo, tu código de formato, versión y todas las columnas exigidas por la RAC 100.' },
      { icon: 'precision_manufacturing', title: 'Reporte de flota y mantenimiento', desc: 'Genera el estado actual de toda la flota: horas por aeronave, próximas revisiones, historial de mantenimiento y estado de pólizas de seguro.' },
      { icon: 'person', title: 'Expediente de tripulación', desc: 'Exporta el expediente completo de cada tripulante: datos personales, licencias, horas voladas por aeronave, exámenes médicos y registro de capacitaciones.' },
      { icon: 'group', title: 'Gestión de usuarios y roles', desc: 'En Configuración → Usuarios ve todos los miembros activos, cambia sus roles, desactiva accesos o envía invitaciones a nuevos miembros del equipo.' },
      { icon: 'credit_card', title: 'Gestión de suscripción', desc: 'En Mi Suscripción revisa tu plan actual con sus límites (aeronaves, pilotos, baterías, replay), la fecha de vencimiento y el desglose de funciones incluidas. Desde ahí puedes actualizar a un plan superior con toggle mensual/anual. La cancelación incluye un resumen de lo que perderías para que tomes la decisión con información completa.' },
      { icon: 'tune', title: 'Configuración avanzada', desc: 'Ajusta los parámetros de alertas (ciclos de batería, horas de mantenimiento, días de vencimiento médico), personaliza los formatos de reporte y configura las integraciones disponibles.' },
    ],
    roles_tabla: [
      { accion: 'Generar reportes PDF', admin: true, gerente: true, jefe: true, piloto: false },
      { accion: 'Ver bitácora propia', admin: true, gerente: false, jefe: true, piloto: true },
      { accion: 'Gestionar usuarios', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Gestionar suscripción', admin: true, gerente: false, jefe: false, piloto: false },
      { accion: 'Configuración avanzada', admin: true, gerente: false, jefe: false, piloto: false },
    ],
    nota: 'Todos los reportes PDF generados llevan automáticamente el logo, razón social y NIT de tu organización tal como está configurado en Configuración → Organización.',
  },
];

const ROLES = ['Admin', 'Gte. SMS', 'Jefe', 'Piloto'];
const ROLES_FULL = ['Admin', 'Gerente SMS', 'Jefe Pilotos', 'Piloto'];
const ROLE_KEYS = ['admin', 'gerente', 'jefe', 'piloto'];

// ─── Badge de permiso ────────────────────────────────────────────────────────
function RolBadge({ val, compact = false }) {
  if (val === true)     return <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-black">✓</span>;
  if (val === false)    return <span className="inline-flex items-center justify-center size-5 rounded-full bg-red-50 text-red-400 text-xs font-black">✗</span>;
  if (val === 'ver')    return <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-black">VER</span>;
  if (val === 'propio') return <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-black">OWN</span>;
  return null;
}

// ─── Tabla de permisos mobile (cards) ───────────────────────────────────────
function PermisosMobile({ tabla }) {
  return (
    <div className="md:hidden space-y-2">
      {tabla.map((row, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-black text-slate-700 mb-2 leading-tight">{row.accion}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ROLE_KEYS.map((key, ki) => (
              <span key={key} className="flex items-center gap-1 text-xs text-slate-400">
                <span className="font-bold">{ROLES[ki]}</span>
                <RolBadge val={row[key]} compact />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tabla de permisos desktop ───────────────────────────────────────────────
function PermisosDesktop({ tabla }) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left min-w-[480px]">
        <thead>
          <tr className="text-xs font-black uppercase text-slate-400 border-b border-slate-200">
            <th className="px-4 py-3 w-1/2">Acción</th>
            {ROLES_FULL.map((r) => (
              <th key={r} className="px-3 py-3 text-center whitespace-nowrap">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tabla.map((row, i) => (
            <tr key={i} className="hover:bg-white transition-colors">
              <td className="px-4 py-3 text-xs font-bold text-slate-700">{row.accion}</td>
              {ROLE_KEYS.map((key) => (
                <td key={key} className="px-3 py-3 text-center">
                  <RolBadge val={row[key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────
export default function DocumentacionPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">

      {/* ── HEADER ── */}
      <SEONav />

      {/* ── MOBILE STICKY NAV — navegación entre fases ── */}
      {/* Solo visible en mobile/tablet, sticky justo debajo del header */}
      <div className="lg:hidden sticky top-14 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="flex overflow-x-auto gap-1.5 px-4 py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {FASES.map((f) => (
            <a
              key={f.id}
              href={`#${f.id}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-primary transition-all`}
            >
              <span className={`size-4 rounded-full ${f.colorSolid} flex items-center justify-center text-white font-black`} style={{ fontSize: '8px' }}>
                {f.num}
              </span>
              {f.titleCorto}
            </a>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="bg-navy text-white py-12 md:py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4 md:space-y-6">
          <p className="inline-flex items-center gap-2 bg-white/10 text-orange-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-black uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">menu_book</span>
            Guía de Usuario — 6 Fases
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.95]">
            Cómo usar <span className="text-primary">Bitafly</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Guía completa paso a paso para operadores UAS. Desde la configuración
            hasta los reportes RAC 100 para la AeroCivil.
          </p>

          {/* Chips de fases — solo desktop (en mobile hay la sticky nav) */}
          <div className="hidden sm:flex flex-wrap justify-center gap-2 pt-2">
            {FASES.map((f) => (
              <a
                key={f.id}
                href={`#${f.id}`}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-black uppercase tracking-wide text-slate-300 hover:text-white transition-all"
              >
                {f.num}. {f.titleCorto}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-20">
        <div className="flex gap-10 lg:gap-16">

          {/* Sidebar TOC — solo desktop */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Contenido</p>
              {FASES.map((f) => (
                <a
                  key={f.id}
                  href={`#${f.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-primary hover:bg-orange-50 transition-all group"
                >
                  <span className="size-6 rounded-lg bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-primary shrink-0 transition-all">
                    {f.num}
                  </span>
                  <span className="leading-tight">{f.title}</span>
                </a>
              ))}
              <div className="border-t border-slate-100 mt-6 pt-5 space-y-2 px-3">
                <Link href="/tutoriales" className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  Ver en video
                </Link>
                <Link href="/registro" className="block text-center py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                  Comenzar gratis
                </Link>
                <Link href="/login" className="block text-center py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:border-slate-400 transition-all">
                  Ingresar
                </Link>
              </div>
            </div>
          </aside>

          {/* Contenido */}
          <main className="flex-1 min-w-0 space-y-14 md:space-y-20">

            {/* Resumen de roles */}
            <section className="bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200 p-5 md:p-10">
              <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-navy mb-1">Los 4 roles de Bitafly</h2>
              <p className="text-xs md:text-sm text-slate-500 mb-5">Cada usuario tiene un rol que define lo que puede ver y hacer en la plataforma.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 md:gap-3">
                {[
                  { rol: 'Administrador', desc: 'Gestión completa de la organización, flota, pilotos y reportes.', icon: 'manage_accounts', color: 'bg-navy/5 text-navy border-navy/20' },
                  { rol: 'Gerente SMS', desc: 'Seguridad operacional, SORA, reportes e incidentes.', icon: 'health_and_safety', color: 'bg-red-50 text-red-700 border-red-200' },
                  { rol: 'Jefe de Pilotos', desc: 'Gestión de flota, pilotos, misiones y bitácora.', icon: 'flight', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { rol: 'Piloto', desc: 'Registra sus propios vuelos y consulta su expediente.', icon: 'person', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                ].map((r) => (
                  <div key={r.rol} className={`flex items-start gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border ${r.color}`}>
                    <span className="material-symbols-outlined text-lg md:text-xl shrink-0 mt-0.5">{r.icon}</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">{r.rol}</p>
                      <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ─ Fases ─ */}
            {FASES.map((fase, idx) => (
              <section
                key={fase.id}
                id={fase.id}
                // scroll-mt compensa: header (56px mobile / 64px desktop) + mobile nav (44px) + margen
                className="scroll-mt-28 lg:scroll-mt-24"
              >
                {/* Encabezado de fase */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`size-12 md:size-16 rounded-2xl md:rounded-3xl bg-gradient-to-br ${fase.color} flex items-center justify-center shadow-lg shrink-0`}>
                    <span className="material-symbols-outlined text-white text-xl md:text-2xl">{fase.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fase {fase.num}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{fase.duracion}</span>
                    </div>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-navy leading-tight">
                      {fase.title}
                    </h2>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">{fase.subtitle}</p>
                    {/* Roles — debajo del título en mobile */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {fase.roles.map((r) => (
                        <span key={r} className="px-2 py-0.5 bg-orange-50 text-primary rounded-full text-xs font-black uppercase">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-slate-600 leading-relaxed mb-6 text-sm">{fase.desc}</p>

                {/* Pasos */}
                <div className="space-y-2 md:space-y-3 mb-6">
                  {fase.pasos.map((paso, i) => (
                    <div key={i} className="flex gap-3 md:gap-4 p-4 md:p-5 bg-white rounded-xl md:rounded-2xl border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="size-9 md:size-10 rounded-xl md:rounded-2xl bg-orange-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-base md:text-lg">{paso.icon}</span>
                        </div>
                        <span className="text-xs font-black text-orange-300">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-navy text-xs md:text-sm uppercase tracking-tight mb-1 leading-tight">{paso.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{paso.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabla de permisos */}
                <div className="bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden mb-5">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Permisos por rol</p>
                  </div>
                  {/* Mobile: cards */}
                  <div className="p-3 md:p-0">
                    <PermisosMobile tabla={fase.roles_tabla} />
                  </div>
                  {/* Desktop: tabla */}
                  <PermisosDesktop tabla={fase.roles_tabla} />
                </div>

                {/* Nota */}
                <div className="flex gap-3 p-4 bg-amber-50 rounded-xl md:rounded-2xl border border-amber-200">
                  <span className="material-symbols-outlined text-amber-500 text-lg shrink-0 mt-0.5">lightbulb</span>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">{fase.nota}</p>
                </div>

                {idx < FASES.length - 1 && (
                  <div className="mt-14 md:mt-20 border-t border-slate-100" />
                )}
              </section>
            ))}

            {/* CTA final */}
            <section className="bg-navy rounded-2xl md:rounded-[2.5rem] p-7 md:p-12 text-white text-center space-y-5">
              <span className="material-symbols-outlined text-primary text-4xl md:text-5xl">rocket_launch</span>
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">
                ¿Listo para comenzar?
              </h2>
              <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
                Crea tu cuenta gratuita y ten tu primera aeronave registrada en menos de 15 minutos.
                Sin tarjeta de crédito. Sin instalaciones.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/registro" className="bg-primary text-white px-7 py-3.5 md:px-8 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/20 active:scale-95">
                  Crear cuenta gratis
                </Link>
                <a href="mailto:soporte@bitafly.com" className="border-2 border-white/20 px-7 py-3.5 md:px-8 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">
                  Contactar soporte
                </a>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <SEOFooter brandDesc="Software de gestión aeronáutica para operadores UAS en Colombia. Cumplimiento RAC 100 desde el primer vuelo." />
    </div>
  );
}
