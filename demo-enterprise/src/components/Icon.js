// Ícono Material Symbols decorativo (aria-hidden para no ensuciar lectores de pantalla).
export default function Icon({ name, className = '', style }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined leading-none ${className}`} style={style}>
      {name}
    </span>
  );
}
