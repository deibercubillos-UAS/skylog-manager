import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "BitaFly Manager - Aviation Log",
  description: "Gestión aeronáutica profesional UAS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        
        {/* PARCHE DE RENDIMIENTO: EVENTOS PASIVOS PARA MOBILE */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var opts = {passive: true};
              window.addEventListener('touchstart', function(){}, opts);
              window.addEventListener('touchmove', function(){}, opts);
              window.addEventListener('wheel', function(){}, opts);
            })();
          `
        }} />
      </head>
      <body className="antialiased">
        {children}
        
        {/* MONITOREO DE RENDIMIENTO EN TIEMPO REAL */}
        <SpeedInsights />
        
        {/* MONITOREO DE TRÁFICO Y COMPORTAMIENTO */}
        <Analytics />
      </body>
    </html>
  );
}