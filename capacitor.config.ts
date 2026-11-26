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
  plugins: {
    // Splash nativo (logo BitaFly sobre blanco, ya en res/drawable-*/splash.png).
    // Se mantiene visible mientras el WebView carga bitafly.com y la redirección
    // de arranque decide a dónde ir (dashboard o bienvenida), para que no se vea
    // el home de marketing. Auto-oculta tras la duración como respaldo.
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
