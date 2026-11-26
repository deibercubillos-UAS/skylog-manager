// Loader de navegación de la app (App Router): Next lo muestra automáticamente
// mientras carga cualquier página dentro de (v2). Marca BitaFly, no un círculo.
import BrandLoader from '@/components/BrandLoader';

export default function Loading() {
  return <BrandLoader fullscreen label="Cargando…" />;
}
