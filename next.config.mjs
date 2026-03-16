/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivamos Turbopack para el build si está dando problemas de memoria
  // y limitamos la cantidad de procesos simultáneos
  experimental: {
    cpus: 1, 
    workerThreads: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;