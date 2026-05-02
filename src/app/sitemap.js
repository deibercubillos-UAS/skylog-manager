const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

export default function sitemap() {
  const now = new Date();

  return [
    // Páginas principales
    { url: `${SITE_URL}/`,                         lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/precios`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/registro`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.9 },

    // Landing pages SEO
    { url: `${SITE_URL}/rac-100`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE_URL}/bitacora-digital`,         lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE_URL}/mantenimiento-drones`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/sms-aeronautico`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/autorizaciones-aerocivil`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gestion-flota-drones`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/operadores-uas`,           lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/reportes-auditoria`,       lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

    // Páginas de acceso (baja prioridad)
    { url: `${SITE_URL}/login`,                    lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ];
}
