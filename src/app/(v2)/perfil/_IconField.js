'use client';

// Skylog V2.0 — Mi Perfil: campo con ícono guía a la izquierda — mismo
// borde/focus-ring que `Field` de `@skylog/ui`, pero con más textura visual
// para un formulario de una sola persona (a diferencia de una tabla, donde
// el ícono por fila sobra). No se modifica `Field` en el paquete compartido
// — esto es local a esta página, sin afectar el resto de V2.
export default function IconField({ icon, label, className = '', ...props }) {
  return (
    <label className={`block mb-3 ${className}`}>
      {label && <span className="block text-xs font-medium text-navy-400 mb-1">{label}</span>}
      <div className="relative">
        <span className="material-symbols-outlined text-[18px] text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          {...props}
        />
      </div>
    </label>
  );
}
