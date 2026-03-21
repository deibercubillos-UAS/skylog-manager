import "./globals.css";
import Script from 'next/script';

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
      </head>
      <body className="antialiased">
        {children}
        {/* CAMBIO: Usamos epayco.min.js para Tokenización Directa */}
        <Script 
          src="https://js.epayco.co/epayco.min.js" 
          strategy="beforeInteractive" 
        />
      </body>
    </html>
  );
}