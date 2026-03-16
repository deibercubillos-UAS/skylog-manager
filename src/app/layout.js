import "./globals.css";

export const metadata = {
  title: "SkyLog Manager - La Bitácora de Vuelo Digital",
  description: "Cumplimiento legal para operadores de drones",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}