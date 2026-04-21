import "./globals.css";
import { Public_Sans } from "next/font/google";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${publicSans.variable}`}>
      <head>
        {/* Cargamos los iconos de forma estándar para asegurar que se vean */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}