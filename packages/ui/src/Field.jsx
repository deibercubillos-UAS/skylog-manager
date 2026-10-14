// Field — label + input/select/textarea, mismo padding/borde en todo el
// proyecto (35-frontend.md §3.4). `as` decide qué elemento nativo renderizar.

export function Field({ label, as: As = 'input', className = '', children, ...props }) {
  return (
    <label className="block mb-3">
      {label && <span className="block text-xs font-medium text-navy-400 mb-1">{label}</span>}
      <As className={`block w-full min-w-0 max-w-full [&[type=date]]:appearance-none [&[type=datetime-local]]:appearance-none [&[type=time]]:appearance-none min-h-[44px] md:min-h-0 px-3 py-2 rounded-lg border border-navy-200 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${className}`} {...props}>
        {children}
      </As>
    </label>
  );
}
