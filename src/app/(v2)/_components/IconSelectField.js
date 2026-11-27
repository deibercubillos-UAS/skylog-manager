// Skylog V2.0 — select de formulario con ícono guía y chevron propios, con el
// ancho y la altura de campo del resto del formulario (misma caja que `Field`).
// Nació en Bitácora/Programación para que los selectores (piloto, aeronave,
// observador…) dejaran de verse planos; se promueve aquí al repetirse en una
// tercera pantalla (Tiempos de servicio). Usa un <select> nativo (accesible,
// teclado) con `appearance-none` para no depender de la flecha del sistema.
export default function IconSelectField({ icon, label, value, onChange, required = false, className = '', children }) {
  return (
    <label className={`block mb-3 ${className}`}>
      {label && <span className="block text-xs font-medium text-navy-400 mb-1">{label}</span>}
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-navy-300">{icon}</span>
        <select
          value={value}
          onChange={onChange}
          required={required}
          className="block w-full appearance-none bg-white min-h-[44px] md:min-h-0 pl-9 pr-9 py-2 rounded-lg border border-navy-200 text-base md:text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {children}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-base text-navy-400">expand_more</span>
      </div>
    </label>
  );
}
