import { BLOG_POSTS } from '@/lib/blogPosts';
import { CASE_STUDIES } from '@/lib/caseStudies';

// Quitar barra final si NEXT_PUBLIC_SITE_URL viene como "https://bitafly.com/"
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/+$/, '');

export default function sitemap() {
  const now = new Date();

  // Blog posts
  const blogEntries = BLOG_POSTS.map(post => ({
    url:             `${SITE_URL}/blog/${post.slug}`,
    lastModified:    new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: 'monthly',
    priority:        0.7,
  }));

  // Case studies
  const caseEntries = CASE_STUDIES.map(c => ({
    url:             `${SITE_URL}/casos/${c.slug}`,
    lastModified:    new Date(c.publishedAt),
    changeFrequency: 'monthly',
    priority:        0.75,
  }));

  return [
    // ── Páginas principales ───────────────────────────────────────────────
    { url: `${SITE_URL}/`,                           lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/precios`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/registro`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/documentacion`,              lastModified: now, changeFrequency: 'monthly', priority: 0.88 },
    { url: `${SITE_URL}/tutoriales`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },

    // ── Blog ─────────────────────────────────────────────────────────────
    { url: `${SITE_URL}/blog`,                       lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    ...blogEntries,

    // ── Casos de éxito ────────────────────────────────────────────────────
    { url: `${SITE_URL}/casos`,                      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...caseEntries,

    // ── Páginas en inglés ─────────────────────────────────────────────────
    { url: `${SITE_URL}/drone-logbook-colombia`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/rac-100-compliance`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // ── Landing pages de módulos ──────────────────────────────────────────
    { url: `${SITE_URL}/rac-100`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE_URL}/bitacora-digital`,           lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${SITE_URL}/mantenimiento-drones`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/sms-aeronautico`,            lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/autorizaciones-aerocivil`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gestion-flota-drones`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/sora`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/replay-gps-drones`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gestion-pilotos`,            lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/plan-vuelo-drones`,          lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/clima-drones`,               lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/operadores-uas`,             lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/reportes-auditoria`,         lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/comparativa-bitafly-airdata`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/comparativa-bitafly-geodrone`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/comparativa-bitafly-dronedesk`,    lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/comparativa-bitafly-uav-forecast`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
