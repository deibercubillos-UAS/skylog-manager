// nav-sections — las 7 secciones de primer nivel del nav de Skylog V2.0,
// reemplazando el modelo anterior de 4 "espacios por momento operacional"
// (feedback del usuario: "es todo lo menos intuitiva posible"). Cada sección
// es una página propia con su propio sub-nav/layout — el selector aquí solo
// resuelve etiqueta/ícono/orden, nunca permisos (eso lo sigue haciendo
// PERMISSIONS/roles.js en cada página).

export const NAV_SECTIONS = [
  { key: 'operacion', label: 'Operación' },
  { key: 'flota-tripulacion', label: 'Flota y Tripulación' },
  { key: 'sms', label: 'SMS' },
  { key: 'capacitacion', label: 'Capacitación' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'control-documental', label: 'Control Documental' },
  { key: 'organizacion', label: 'Organización' },
];
