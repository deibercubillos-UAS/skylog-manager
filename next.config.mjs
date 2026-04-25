/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compresión gzip/brotli en respuestas (mejora TTFB)
  compress: true,

  // Quita el header X-Powered-By (mejora seguridad y reduce 1 byte por request)
  poweredByHeader: false,

  // Genera ETags para caché condicional del navegador
  generateEtags: true,

  // React strict para detectar problemas en dev (no afecta prod)
  reactStrictMode: true,

  images: {
    // AVIF + WebP: ~30-50% más liviano que PNG/JPG con misma calidad
    formats: ['image/avif', 'image/webp'],
    // Tamaños usados por srcset — reducir lo que no necesitamos
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache de imágenes optimizadas en CDN
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 días
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Headers personalizados — caché agresivo en assets que nunca cambian
  async headers() {
    return [
      {
        // Logo, favicon y demás archivos en /public
        source: '/(.*)\\.(png|jpg|jpeg|gif|webp|avif|ico|svg)$',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Robots y sitemap — caché corto para que actualizaciones lleguen rápido
        source: '/(robots.txt|sitemap.xml|manifest.webmanifest)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
        ],
      },
      {
        // Headers de seguridad globales (suman puntos de Lighthouse y SEO)
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
