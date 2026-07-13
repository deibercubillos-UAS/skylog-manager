import LegalLayout from '@/components/legal/LegalLayout';
import { COMPANY } from '@/lib/legalPages';

export const metadata = {
  title: 'Política de Cookies | Bitafly',
  description: 'Qué cookies usa bitafly.com, con qué finalidad, y cómo puede aceptarlas o rechazarlas, conforme a la Resolución 32.126 de 2022 de la SIC.',
  alternates: { canonical: '/politica-cookies' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Política de Cookies | Bitafly',
    description: 'Cookies esenciales, analíticas y de terceros usadas en bitafly.com, y cómo gestionarlas.',
    url: 'https://bitafly.com/politica-cookies',
  },
};

const TOC = [
  { id: 'que-son', label: '1. ¿Qué son las cookies?' },
  { id: 'tipos', label: '2. Tipos de cookies que usamos' },
  { id: 'tabla-cookies', label: '3. Detalle de cookies' },
  { id: 'lo-que-no-usamos', label: '4. Lo que NO usa cookies' },
  { id: 'consentimiento', label: '5. Consentimiento' },
  { id: 'gestionar', label: '6. Cómo gestionar o rechazar cookies' },
  { id: 'base-legal', label: '7. Base legal' },
  { id: 'cambios', label: '8. Cambios a esta política' },
  { id: 'contacto', label: '9. Contacto' },
];

export default function PoliticaCookiesPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Política de Cookies"
      description="Qué cookies utiliza bitafly.com, para qué las usamos y cómo puede aceptarlas, rechazarlas o eliminarlas."
      updated="13 de julio de 2026"
      toc={TOC}
    >
      <p>
        Esta Política de Cookies explica, de forma clara y honesta, qué cookies y tecnologías de
        seguimiento similares utiliza el sitio <strong>bitafly.com</strong> y la plataforma
        <strong> Bitafly</strong>, para qué se usan y cómo puede gestionarlas, conforme a la Ley
        1581 de 2012 y a los criterios de la Superintendencia de Industria y Comercio (SIC) para
        el uso de cookies, en particular la Resolución 32.126 de 2022.
      </p>

      <h2 id="que-son">1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que un sitio web guarda en su navegador al
        visitarlo. Sirven para recordar información sobre su visita —como si inició sesión, o
        cómo interactúa con el sitio— y así facilitar la navegación o generar estadísticas
        agregadas de uso.
      </p>

      <h2 id="tipos">2. Tipos de cookies que usamos</h2>
      <ul>
        <li>
          <strong>Cookies esenciales/funcionales:</strong> necesarias para que la Plataforma
          funcione — por ejemplo, para mantener su sesión iniciada. Sin ellas no es posible
          acceder al dashboard de Bitafly. No requieren consentimiento previo porque son
          estrictamente necesarias para prestar el servicio que usted solicita.
        </li>
        <li>
          <strong>Cookies analíticas y de terceros:</strong> utilizadas para entender cómo se usa
          el sitio (páginas visitadas, origen del tráfico) y, en el caso de campañas
          publicitarias, para medir su efectividad. Estas cookies sí requieren su consentimiento
          previo, expreso e informado antes de activarse.
        </li>
      </ul>

      <h2 id="tabla-cookies">3. Detalle de cookies</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie / proveedor</th>
            <th>Tipo</th>
            <th>Finalidad</th>
            <th>¿Requiere consentimiento?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cookies de sesión de Supabase Auth</td>
            <td>Esencial / propia</td>
            <td>Mantener su sesión iniciada en el dashboard de Bitafly.</td>
            <td>No — estrictamente necesaria</td>
          </tr>
          <tr>
            <td>Google Tag Manager (GTM)</td>
            <td>Terceros</td>
            <td>Gestiona la carga de las demás etiquetas de medición del sitio.</td>
            <td>Sí</td>
          </tr>
          <tr>
            <td>Google Analytics (_ga, _gid)</td>
            <td>Terceros / analítica</td>
            <td>Estadísticas agregadas de tráfico y uso del sitio (páginas vistas, origen de las visitas).</td>
            <td>Sí</td>
          </tr>
          <tr>
            <td>Etiquetas de Google Ads (vía GTM)</td>
            <td>Terceros / publicidad</td>
            <td>Medición de la efectividad de campañas publicitarias, cuando están activas.</td>
            <td>Sí</td>
          </tr>
          <tr>
            <td>Microsoft Clarity</td>
            <td>Terceros / analítica</td>
            <td>Mapas de calor y grabación de sesiones anonimizadas, para entender cómo se usa el sitio y mejorarlo.</td>
            <td>Sí</td>
          </tr>
        </tbody>
      </table>
      <p>
        Ninguna cookie analítica ni de terceros se activa antes de que usted otorgue su
        consentimiento en el aviso que aparece al ingresar al Sitio (ver{' '}
        <a href="#consentimiento">sección 5</a>).
      </p>

      <h2 id="lo-que-no-usamos">4. Lo que NO usa cookies</h2>
      <p>
        Bitafly también utiliza <strong>Vercel Web Analytics</strong> y{' '}
        <strong>Vercel Speed Insights</strong> para medir el desempeño técnico del sitio
        (tiempos de carga, errores). Estas herramientas <strong>no usan cookies</strong>: generan
        un identificador anónimo a partir de cada solicitud, sin almacenarlo en el navegador, y
        los datos agregados se descartan pasadas 24 horas. Las mencionamos aquí por transparencia,
        aunque no requieren consentimiento por no constituir tratamiento de datos personales vía
        cookies.
      </p>
      <p>
        El Sitio también guarda en <strong>localStorage</strong> del navegador (no en cookies) los
        parámetros de campaña (UTM) y el referente de su primera visita, con fines internos de
        medición de origen de tráfico. Al ser almacenamiento local de primera parte, no un archivo
        de cookie enviado por el servidor, no está sujeto a esta Política de Cookies, pero su
        tratamiento como dato técnico se describe en la{' '}
        <a href="/politica-privacidad">Política de Privacidad</a>.
      </p>

      <h2 id="consentimiento">5. Consentimiento</h2>
      <p>
        Al ingresar por primera vez a bitafly.com, se le muestra un aviso que le permite aceptar
        el uso de cookies analíticas y de terceros, o consultar esta Política de Cookies antes de
        decidir. Las cookies analíticas y de terceros solo se activan después de que usted otorga
        su consentimiento; las cookies esenciales operan siempre, por ser indispensables para el
        funcionamiento del servicio que usted solicita al iniciar sesión.
      </p>

      <h2 id="gestionar">6. Cómo gestionar o rechazar cookies</h2>
      <p>
        Además del aviso de cookies del Sitio, usted puede administrar o eliminar las cookies
        directamente desde la configuración de su navegador. Tenga en cuenta que bloquear las
        cookies esenciales puede impedir que pueda iniciar sesión o usar el dashboard de Bitafly
        correctamente.
      </p>
      <ul>
        <li>Google Chrome: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
        <li>Mozilla Firefox: Opciones → Privacidad y seguridad → Cookies y datos del sitio.</li>
        <li>Safari: Preferencias → Privacidad → Gestionar datos de sitios web.</li>
        <li>Microsoft Edge: Configuración → Cookies y permisos del sitio.</li>
      </ul>
      <p>
        También puede oponerse al uso de Google Analytics con fines de medición instalando el{' '}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
          complemento de inhabilitación para navegadores de Google Analytics
        </a>.
      </p>

      <h2 id="base-legal">7. Base legal</h2>
      <p>
        El tratamiento de datos personales a través de cookies se rige por la Ley 1581 de 2012 y
        el Decreto 1377 de 2013, y sigue los criterios específicos sobre cookies fijados por la
        Superintendencia de Industria y Comercio en su Resolución 32.126 de 2022, que exige que el
        consentimiento para cookies que traten datos personales sea previo, expreso e informado.
        Para más detalle sobre cómo tratamos los datos personales en general, consulte nuestra{' '}
        <a href="/politica-privacidad">Política de Privacidad</a>.
      </p>

      <h2 id="cambios">8. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta Política de Cookies para reflejar cambios en las herramientas que
        usamos o en la normativa aplicable. La fecha de &quot;Última actualización&quot; indica la
        versión vigente.
      </p>

      <h2 id="contacto">9. Contacto</h2>
      <p>
        Para preguntas sobre el uso de cookies en bitafly.com, escríbanos a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
