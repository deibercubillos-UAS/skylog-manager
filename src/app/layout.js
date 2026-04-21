import "./globals.css";
import { Public_Sans } from "next/font/google"; // Optimización de fuentes de Next.js

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata = {
  title: "Bitafly - Gestión Aeronáutica",
  description: "Plataforma de gestión para tripulaciones y aeronaves",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${publicSans.variable}`}>
      <head>
        {/* ELIMINADO: Script de ePayco que bloqueaba el renderizado */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}