import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ARDIS_COOKIE_NAME, verifySessionCookieValue } from '@/lib/ardis/session';

// Grupo de rutas "(app)": no aparece en la URL, solo agrupa todo lo que
// requiere sesión para que quede fuera de este guard únicamente /ardis/entrar
// (que vive como hermano de este grupo, no dentro de él).
export default function ArdisProtectedLayout({ children }) {
  const cookieStore = cookies();
  const sessionValue = cookieStore.get(ARDIS_COOKIE_NAME)?.value;

  if (!verifySessionCookieValue(sessionValue)) {
    notFound();
  }

  return children;
}
