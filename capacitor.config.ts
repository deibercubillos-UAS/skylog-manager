import type { CapacitorConfig } from '@capacitor/cli';

// Configuración aditiva de la app nativa (Capacitor).
// Modo "remote URL": el shell nativo carga la web YA desplegada (bitafly.com),
// por lo que NO se toca el build de Next.js ni `src/`. Riesgo nulo sobre producción.
// Ver docs/APP_NATIVA_SPEC.md (§5.2) y docs/PLAN_APP_MOVIL.md (Etapa 3).
const config: CapacitorConfig = {
  appId: 'com.bitafly.app',
  appName: 'BitaFly',
  // webDir solo se usa como respaldo local; en modo server.url se carga la web remota.
  webDir: 'mobile/www',
  server: {
    url: 'https://bitafly.com',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
