import "./globals.css";

export const metadata = {
  title: "SkyLog Manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Usamos el link de Google Fonts pero con el parámetro display=swap */}
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" 
        />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}