import "./globals.css";
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        
        {/* CARGA DE LIBRERÍAS PARA TOKENIZACIÓN (Según PDF Pág. 1) */}
        <script src="https://code.jquery.com/jquery-3.7.1.min.js" defer></script>
        <script src="https://checkout.epayco.co/epayco.min.js" defer></script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}