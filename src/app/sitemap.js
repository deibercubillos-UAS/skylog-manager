const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

export default function sitemap() {
  const routes = [
    { url: '/', priority: 1.0, changeFrequency: 'weekly' },
    { url: '/rac-100', priority: 0.9, changeFrequency: 'monthly' },
    { url: '/bitacora-digital', priority: 0.9, changeFrequency: 'monthly' },
    { url: '/mantenimiento-drones', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/sms-aeronautico', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/autorizaciones-aerocivil', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/gestion-flota-drones', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/operadores-uas', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/reportes-auditoria', priority: 0.7, changeFrequency: 'monthly' },
    { url: '/precios', priority: 0.9, changeFrequency: 'weekly' },
  ];

  return routes.map(({ url, priority, changeFrequency }) => ({
    url: `${SITE_URL}${url}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
