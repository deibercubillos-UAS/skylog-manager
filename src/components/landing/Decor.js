/**
 * Decor — capa decorativa 100% vectorial (SVG inline + gradientes CSS).
 *
 * Objetivo: dar profundidad visual a los landings sin una sola petición de red
 * adicional (cero imágenes raster, cero fuentes nuevas). Todo es SVG inline o
 * radial-gradient CSS, por lo que NO impacta el tiempo de carga.
 *
 * Todos los elementos son aria-hidden + pointer-events:none → puramente
 * decorativos, nunca interfieren con accesibilidad ni interacción.
 *
 * Uso: el contenedor padre (normalmente la <section>) debe tener
 *   position: relative; overflow: hidden;
 * y el contenido real ir en un wrapper con position: relative; z-index: 1.
 *
 *   <section style={{ position:'relative', overflow:'hidden' }}>
 *     <Decor variant="hero" />
 *     <div style={{ position:'relative', zIndex:1 }}> ...contenido... </div>
 *   </section>
 *
 * Variantes:
 *   "hero"    → aura naranja + dot-grid sutil + arco de ruta GPS (fondo claro)
 *   "light"   → solo dot-grid muy tenue (secciones claras intermedias)
 *   "dark"    → líneas topográficas + grid sobre navy (#1A202C)
 *   "glow"    → solo aura naranja difusa (para CTAs / bandas)
 *   "minimal" → aura muy tenue, sin dot-grid — para secciones que llevan un
 *               screenshot real como protagonista (Fase 1/2 del plan de
 *               mejora visual): la decoración no debe competir con la imagen.
 *   "accent"  → aura azul cielo (en vez de naranja) — variedad cromática
 *               deliberada para no repetir siempre navy+naranja en cada
 *               sección de cada página pública.
 */

const ORANGE = '#ec5b13';
const NAVY = '#1A202C';
const SKY = '#1d7fbf';

function Aura({ color = ORANGE, size = 520, top, left, right, bottom, opacity = 0.12 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top, left, right, bottom,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 68%)`,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}

function DotGrid({ color = NAVY, opacity = 0.05 }) {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1 }}
    >
      <defs>
        <pattern id="bf-dotgrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" fill={color} opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bf-dotgrid)" />
    </svg>
  );
}

/* Arco de ruta GPS con waypoints + dron — acento de hero (esquina superior derecha) */
function FlightPath() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMaxYMin slice"
      style={{ position: 'absolute', top: 0, right: 0, width: '46%', maxWidth: 460, height: 'auto', pointerEvents: 'none', zIndex: -1, opacity: 0.9 }}
    >
      {/* trayectoria punteada */}
      <path
        d="M30 250 C 120 250, 150 90, 250 80 S 380 40, 390 20"
        fill="none"
        stroke={ORANGE}
        strokeWidth="2"
        strokeDasharray="2 8"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* waypoints */}
      {[[30, 250], [180, 120], [250, 80], [390, 20]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="5" fill="none" stroke={ORANGE} strokeWidth="1.5" opacity="0.4" />
          <circle cx={cx} cy={cy} r="2" fill={ORANGE} opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

/* Líneas topográficas tipo carta aeronáutica — para bandas oscuras (navy) */
function TopoLines({ color = ORANGE }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}
    >
      <g fill="none" stroke={color} strokeWidth="1.5" opacity="0.07">
        <path d="M-50 120 C 200 60, 400 180, 650 110 S 1050 40, 1260 130" />
        <path d="M-50 190 C 220 130, 430 250, 680 180 S 1060 110, 1260 200" />
        <path d="M-50 260 C 240 200, 450 320, 700 250 S 1080 180, 1260 270" />
        <path d="M-50 330 C 260 270, 470 390, 720 320 S 1100 250, 1260 340" />
      </g>
      <g stroke="#ffffff" strokeWidth="1" opacity="0.04">
        <line x1="0" y1="0" x2="1200" y2="0" />
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="400" />
        ))}
      </g>
    </svg>
  );
}

export default function Decor({ variant = 'light' }) {
  if (variant === 'hero') {
    return (
      <>
        <DotGrid opacity={0.045} />
        <FlightPath />
        <Aura top="-160px" right="-120px" size={560} opacity={0.14} />
        <Aura bottom="-200px" left="-160px" size={520} color={NAVY} opacity={0.05} />
      </>
    );
  }
  if (variant === 'dark') {
    return (
      <>
        <TopoLines />
        <Aura top="-180px" right="-140px" size={560} opacity={0.1} />
      </>
    );
  }
  if (variant === 'glow') {
    return <Aura top="-180px" right="-120px" size={540} opacity={0.12} />;
  }
  if (variant === 'minimal') {
    return <Aura top="-140px" right="-100px" size={420} opacity={0.06} />;
  }
  if (variant === 'accent') {
    return (
      <>
        <DotGrid opacity={0.045} />
        <Aura color={SKY} top="-160px" right="-120px" size={520} opacity={0.12} />
      </>
    );
  }
  // light
  return <DotGrid opacity={0.05} />;
}
