// Button — primitiva mínima, 3 variantes reales usadas en todo el proyecto
// (primario naranja, secundario navy, ghost). 35-frontend.md §3.4.

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-600 disabled:bg-primary-200',
  secondary: 'bg-navy text-white hover:bg-navy-600 disabled:bg-navy-200',
  ghost: 'bg-transparent text-navy border border-navy-200 hover:bg-navy-50',
};

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      type={props.type || 'button'}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
