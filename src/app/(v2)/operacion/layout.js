// Sección "Operación". El sub-nav propio con línea divisoria (pill-bar +
// botón "volver al dashboard") era un remanente de la arquitectura de 7
// secciones descartada — hoy el sidebar permanente (src/app/(v2)/layout.js)
// ya lista Bitácora/Programación/Meteorología/Tiempo de servicio como
// enlaces directos, así que esa franja duplicaba la navegación y dejaba una
// línea horizontal de más justo debajo del header — pedido explícito del
// usuario: quitarla, no va con este diseño. Queda solo el contenedor de ancho.

export default function OperacionLayout({ children }) {
  return <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>;
}
