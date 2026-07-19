// Fuente única de los 4 documentos legales — usada por el footer compartido,
// la tira de enlaces cruzados de LegalLayout y cualquier otro punto de integración.
export const LEGAL_PAGES = [
  { href: '/aviso-legal', label: 'Aviso Legal' },
  { href: '/politica-privacidad', label: 'Política de Privacidad' },
  { href: '/politica-cookies', label: 'Política de Cookies' },
  { href: '/terminos-condiciones', label: 'Términos y Condiciones' },
];

// Identidad real de la sociedad (confirmada con el usuario, ver CLAUDE.md
// "Páginas legales" — BitaFly S.A.S. es la razón social usada en los 4
// documentos legales y en los datos de identidad publicados del sitio).
export const COMPANY = {
  legalName: 'BitaFly S.A.S.',
  nit: 'En trámite de asignación ante la DIAN',
  domicile: 'Madrid, Cundinamarca, Colombia',
  legalRepresentative: 'Natalia Marcela Rodríguez',
  email: 'soporte@bitafly.com',
  siteUrl: 'https://bitafly.com',
  natureNote: 'Sociedad por Acciones Simplificada (S.A.S.), constituida conforme a la Ley 1258 de 2008.',
};
