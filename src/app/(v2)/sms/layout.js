// Sección "SMS". Igual que `operacion/layout.js`: el sub-nav propio de
// pestañas (Inicio/Gobernanza/Riesgo/Indicadores/Reportes/Asistente) se
// quitó a pedido explícito del usuario — el sidebar permanente
// (`src/app/(v2)/layout.js`) ya lista cada módulo real como enlace directo
// bajo el grupo "SMS", así que la franja duplicaba la navegación. Queda
// solo el contenedor de ancho.

export default function SmsLayout({ children }) {
  return <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>;
}
