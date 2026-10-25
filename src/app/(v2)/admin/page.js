// Skylog V2.0 — `/admin` no tiene pantalla propia: sin esto el servidor mostraba un listado de archivos con los nombres
// de las rutas internas. Se manda a la consola de plataforma; la guardia de `layout.js` devuelve a `/inicio` a quien no
// es superadmin.
import { redirect } from 'next/navigation';

export default function AdminIndex() {
  redirect('/admin/plataforma');
}
