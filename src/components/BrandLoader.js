// Loader de marca BitaFly — reemplaza el "círculo simple" (border + animate-spin)
// cuando carga una página o un panel, en la app y en la web. Muestra el isotipo
// (public/logo.png, transparente) "respirando", el wordmark en tipografía de marca
// (Exo 2 italic, clase font-brand) y una barra indeterminada en naranja de marca.
//
// Variantes:
//   <BrandLoader />                → centrado en un alto cómodo para un panel/sección.
//   <BrandLoader fullscreen />     → centrado en la ventana (carga de página completa).
//   <BrandLoader size="sm" />      → compacto, para tarjetas o bloques pequeños.
//   <BrandLoader bare />           → sin contenedor de alto propio; encaja dentro de un
//                                    wrapper que ya centra (reemplazo directo de un spinner).
//
// Respeta prefers-reduced-motion: con movimiento reducido, no se anima.

import Image from 'next/image';

const SIZES = {
  sm: { logo: 36, wordmark: 'text-sm', bar: 'w-14', gap: 'gap-3' },
  md: { logo: 56, wordmark: 'text-lg', bar: 'w-20', gap: 'gap-4' },
  lg: { logo: 76, wordmark: 'text-2xl', bar: 'w-24', gap: 'gap-5' },
};

export default function BrandLoader({ label, fullscreen = false, bare = false, size = 'md', className = '' }) {
  const s = SIZES[size] || SIZES.md;
  // `bare` no envuelve con alto propio; si no viene label y no es bare, usa el texto por defecto.
  const text = label != null ? label : bare ? null : 'Cargando…';
  const wrap = bare
    ? `flex items-center justify-center ${className}`
    : `${fullscreen ? 'min-h-screen' : 'min-h-[50vh] py-12'} flex items-center justify-center ${className}`;

  return (
    <div className={wrap} role="status" aria-live="polite" aria-busy="true">
      <div className={`flex flex-col items-center ${s.gap}`}>
        <div className="relative flex items-center justify-center">
          {/* halo naranja suave detrás del isotipo */}
          <span className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-xl motion-safe:animate-pulse" aria-hidden="true" />
          <Image
            src="/logo.png"
            alt=""
            width={s.logo}
            height={s.logo}
            priority
            className="relative w-auto motion-safe:animate-brand-float"
            style={{ height: s.logo }}
          />
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <span className={`font-brand italic font-black text-navy tracking-tight ${s.wordmark}`}>BitaFly</span>
          {/* barra indeterminada: naranja de marca recorriendo un riel navy claro */}
          <span className={`relative block h-1 ${s.bar} overflow-hidden rounded-full bg-navy-100`} aria-hidden="true">
            <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary motion-safe:animate-brand-slide" />
          </span>
          {text && <span className="text-[11px] font-bold uppercase tracking-widest text-navy-300">{text}</span>}
        </div>
      </div>
    </div>
  );
}
