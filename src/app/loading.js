// Loader de navegación del sitio público (App Router): Next lo muestra
// automáticamente mientras carga cualquier página de la web. Marca BitaFly.
import BrandLoader from '@/components/BrandLoader';

export default function Loading() {
  return <BrandLoader fullscreen label="Cargando…" />;
}
