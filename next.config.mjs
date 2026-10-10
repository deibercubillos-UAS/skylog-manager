/** @type {import('next').NextConfig} */
// Content-Security-Policy. Next inyecta scripts en línea para hidratar, por eso 'unsafe-inline' en script-src (un nonce
// por petición obligaría a renderizar todo de forma dinámica). Lo que sí se restringe: de dónde se cargan scripts,
// conexiones, marcos y formularios, y que nadie pueda incrustar la app (frame-ancestors).
const isProdBuild = process.env.NODE_ENV === 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProdBuild ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://snap.licdn.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  [
    "connect-src 'self'",
    'https://*.supabase.co wss://*.supabase.co',
    'https://*.r2.cloudflarestorage.com https://*.bitafly.com',
    'https://api.open-meteo.com https://archive-api.open-meteo.com https://services.swpc.noaa.gov',
    'https://nominatim.openstreetmap.org https://server.arcgisonline.com https://*.tile.openstreetmap.org',
    'https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://www.google.com https://stats.g.doubleclick.net https://px.ads.linkedin.com https://www.linkedin.com https://*.clarity.ms https://vitals.vercel-insights.com https://va.vercel-scripts.com',
    'https://production.wompi.co https://checkout.wompi.co',
  ].join(' '),
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://aerocivil.maps.arcgis.com https://www.openstreetmap.org https://checkout.wompi.co https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.wompi.co",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig = {
  // dji-log-parser-js usa WASM — excluir del bundling de webpack
  experimental: {
    serverComponentsExternalPackages: ['dji-log-parser-js'],
  },

  // @skylog/ui vive en packages/ui (npm workspace) — Next no transpila JSX/ESM
  // de paquetes de workspace por defecto. Sin esto, el build falla en cuanto
  // ese paquete tenga un componente real (docs/skylog-v2/33-arquitectura.md).
  transpilePackages: ['@skylog/ui', '@skylog/domain'],

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

  // Rutas de v1 retiradas (C2): los marcadores, la app instalada y los correos viejos siguen llegando a /dashboard.
  async redirects() {
    return [
      { source: '/dashboard', destination: '/inicio', permanent: false },
      { source: '/dashboard/:path*', destination: '/inicio', permanent: false },
      { source: '/admin/master', destination: '/admin/plataforma', permanent: false },
      { source: '/admin/master/:path*', destination: '/admin/plataforma', permanent: false },
    ];
  },

  // Headers personalizados — caché agresivo en assets que nunca cambian
  async headers() {
    // ⚠️ El caché `immutable` SOLO debe aplicarse en producción. En `next dev`
    // los chunks de /_next/static/* (app/page.js, app/layout.js, not-found.js…)
    // se sirven SIN hash de contenido; con `immutable, max-age=1año` el navegador
    // los cachea para siempre. Al recompilar, webpack.js trae un `?v=` nuevo
    // (runtime nuevo) pero los chunks de página se sirven del caché viejo →
    // desincronización → "Cannot read properties of undefined (reading 'call')"
    // en webpack.js + mismatch de hidratación #document. Sobrevive a `rm -rf .next`
    // y a reiniciar el server porque el caché vive en el navegador.
    const isProd = process.env.NODE_ENV === 'production';
    const immutable = 'public, max-age=31536000, immutable';

    return [
      ...(isProd
        ? [
            {
              // Logo, favicon, fuentes y demás archivos en /public
              source: '/(.*)\\.(png|jpg|jpeg|gif|webp|avif|ico|svg|woff2|woff|ttf)$',
              headers: [{ key: 'Cache-Control', value: immutable }],
            },
            {
              // _next/static: assets con hash en el nombre → inmutables para siempre
              source: '/_next/static/(.*)',
              headers: [{ key: 'Cache-Control', value: immutable }],
            },
          ]
        : []),
      {
        // Robots y sitemap — caché corto para que actualizaciones lleguen rápido
        source: '/(robots.txt|sitemap.xml|manifest.webmanifest)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
        ],
      },
      {
        // Headers de seguridad globales (suman puntos en Lighthouse Best Practices)
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
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
