// Mientras el Centro de Control no esté operativo (featureFlags), la ruta no abre: quien llegue por un marcador va a Operación.
import { redirect } from 'next/navigation';
import { CENTRO_DE_CONTROL_ACTIVO } from '@/lib/v2/featureFlags';

export default function CentroDeControlLayout({ children }) {
  if (!CENTRO_DE_CONTROL_ACTIVO) redirect('/operacion');
  return children;
}
