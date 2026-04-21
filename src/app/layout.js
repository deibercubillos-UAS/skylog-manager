import "./globals.css";
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: "BitaFly Manager - Aviation Log",
  description: "Gestión aeronáutica profesional UAS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
  <script dangerouslySetInnerHTML={{
    __html: `
      (function() {
        var originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
            if (typeof options === 'boolean') options = { capture: options, passive: true };
            else if (typeof options === 'object') options.passive = options.passive !== undefined ? options.passive : true;
          }
          originalAddEventListener.call(this, type, listener, options);
        };
      })();
    `
  }} />
      </head>
      <body className="antialiased">
        {children}
        {/* LIBRERÍA OFICIAL DE CHECKOUT PRO - Más estable para suscripciones */}
        <Script 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}