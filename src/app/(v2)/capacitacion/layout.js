// Sección "Capacitación" — sin sub-nav propio (a pedido explícito del
// usuario, 2026-09-26: "quitale el menu nav viejo"). La barra de pestañas
// por pista quedó redundante una vez que `/capacitacion` y
// `/capacitacion/administracion` se enlazan entre sí desde el botón del
// propio `SectionHero` de cada página, y la vuelta a `/inicio` ya la da el
// sidebar principal — no hace falta un segundo nivel de navegación fijo.
export default function CapacitacionLayout({ children }) {
  return <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>;
}
