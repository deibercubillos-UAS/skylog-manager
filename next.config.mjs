/** @type {import('next').NextConfig} */
const nextConfig = {
  // dji-log-parser-js usa WASM — excluir del bundling de webpack
  experimental: {
    serverComponentsExternalPackages: ['dji-log-parser-js'],
  },

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
    // Tamaños usados por srcset
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache de imágenes optimizadas — 30 días en CDN (Vercel)
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Reducir calidad por defecto: 80 sigue siendo imperceptible y pesa ~30% menos
    qualities: [50, 75, 85, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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
        // _next/static: assets con hash en el nombre → inmutables para siempre
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Headers de seguridad globales (suman puntos en Lighthouse Best Practices)
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(self)' },
          // Strict-Transport-Security: fuerza HTTPS por 1 año (mejora Best Practices)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
