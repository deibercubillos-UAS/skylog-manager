const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/reset-password',
          '/update-password',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/dashboard/', '/admin/', '/api/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
