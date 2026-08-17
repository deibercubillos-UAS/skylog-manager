/**
 * FeatureSpotlight — sección "destacado" a 2 columnas (texto + ilustración SVG).
 *
 * Pensada para enriquecer secciones internas planas de los landings: se inserta
 * normalmente entre la banda oscura de stats y la grilla de funciones.
 *
 * Props:
 *   overline   string  — antetítulo en mayúsculas
 *   title      node    — h2 (puede incluir <span style={{color:'#ec5b13'}}>)
 *   desc       string  — párrafo descriptivo
 *   bullets    string[] — lista con check (opcional)
 *   children   node    — la ilustración (DroneOpsScene, FleetScene, etc.)
 *   flip       bool    — true = ilustración a la izquierda
 *   bg         string  — color de fondo de la sección (default #fff)
 *   decor      string  — variante de <Decor> (default "light"); usar "minimal"
 *                        cuando `children` es un screenshot real (la decoración
 *                        no debe competir con la imagen — ver Fase 1 del plan
 *                        de mejora visual)
 *
 * Incluye <Decor> para textura sutil. Cero peticiones de red.
 */
import Decor from '@/components/landing/Decor';

const ACCENT = '#ec5b13';
const NAVY = '#1A202C';

export default function FeatureSpotlight({ overline, title, desc, bullets = [], children, flip = false, bg = '#fff', decor = 'light' }) {
  return (
    <section className="relative overflow-hidden isolate px-6 lg:px-8 py-16 lg:py-20" style={{ background: bg }}>
      <Decor variant={decor} />
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center"
        style={{ maxWidth: '1100px', margin: '0 auto' }}
      >
        <div className={flip ? 'order-1 lg:order-2' : undefined}>
          {overline && (
            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: ACCENT, marginBottom: '12px' }}>
              {overline}
            </div>
          )}
          <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1.06, color: NAVY, marginBottom: '16px' }}>
            {title}
          </h2>
          {desc && (
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#64748b', lineHeight: 1.65, maxWidth: '480px', marginBottom: bullets.length ? '20px' : 0 }}>
              {desc}
            </p>
          )}
          {bullets.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bullets.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 500, color: '#475569', lineHeight: 1.5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: ACCENT, flexShrink: 0 }}>check_circle</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={flip ? 'order-2 lg:order-1' : undefined}>
          {children}
        </div>
      </div>
    </section>
  );
}
