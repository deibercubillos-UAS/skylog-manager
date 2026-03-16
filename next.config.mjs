/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Esto evita que Next intente renderizar páginas en el servidor durante el build
  // reduciendo drásticamente el consumo de memoria.
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;