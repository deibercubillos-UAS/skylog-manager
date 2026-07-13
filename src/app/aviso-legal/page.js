import LegalLayout from '@/components/legal/LegalLayout';
import { COMPANY } from '@/lib/legalPages';

export const metadata = {
  title: 'Aviso Legal | Bitafly',
  description: 'Identificación del prestador del servicio, condiciones de acceso y uso del sitio bitafly.com, propiedad intelectual y régimen de responsabilidad de Bitafly.',
  alternates: { canonical: '/aviso-legal' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Aviso Legal | Bitafly',
    description: 'Identificación del prestador, condiciones de acceso y uso, propiedad intelectual y responsabilidad de Bitafly.',
    url: 'https://bitafly.com/aviso-legal',
  },
};

const TOC = [
  { id: 'identificacion', label: '1. Identificación del prestador' },
  { id: 'objeto', label: '2. Objeto' },
  { id: 'condiciones-acceso', label: '3. Condiciones de acceso y uso' },
  { id: 'propiedad-intelectual', label: '4. Propiedad intelectual' },
  { id: 'enlaces-terceros', label: '5. Enlaces a terceros' },
  { id: 'responsabilidad', label: '6. Limitación de responsabilidad' },
  { id: 'proteccion-datos', label: '7. Protección de datos' },
  { id: 'legislacion', label: '8. Legislación y fuero' },
  { id: 'contacto', label: '9. Contacto' },
];

export default function AvisoLegalPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Aviso Legal"
      description="Información sobre la identidad del prestador del servicio y las condiciones generales de acceso y uso del sitio bitafly.com y la plataforma Bitafly."
      updated="13 de julio de 2026"
      toc={TOC}
    >
      <p>
        En cumplimiento del deber de información a los consumidores establecido en el artículo 50
        de la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas concordantes, se ponen a
        disposición de los usuarios los siguientes datos de identificación del prestador del
        servicio ofrecido a través del sitio web <strong>bitafly.com</strong> y la plataforma
        <strong> Bitafly</strong> (en adelante, indistintamente, &quot;Bitafly&quot;, &quot;la
        Plataforma&quot; o &quot;el Sitio&quot;).
      </p>

      <h2 id="identificacion">1. Identificación del prestador</h2>
      <table>
        <tbody>
          <tr><th>Razón social</th><td>{COMPANY.legalName}</td></tr>
          <tr><th>Naturaleza jurídica</th><td>{COMPANY.natureNote}</td></tr>
          <tr><th>NIT</th><td>{COMPANY.nit}</td></tr>
          <tr><th>Domicilio</th><td>{COMPANY.domicile}</td></tr>
          <tr><th>Representante legal</th><td>{COMPANY.legalRepresentative}</td></tr>
          <tr><th>Correo de contacto</th><td>{COMPANY.email}</td></tr>
          <tr><th>Sitio web</th><td>{COMPANY.siteUrl}</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Nota sobre el NIT:</strong> BitaFly S.A.S. se encuentra en proceso de constitución
        formal (elevación a escritura pública y registro mercantil). El Número de Identificación
        Tributaria (NIT) está en trámite de asignación ante la Dirección de Impuestos y Aduanas
        Nacionales (DIAN). Este aviso se actualizará tan pronto el NIT sea asignado, sin que ello
        afecte la identificación real del prestador del servicio ni los datos de contacto aquí
        publicados, que son plenamente vigentes y operativos.
      </p>

      <h2 id="objeto">2. Objeto</h2>
      <p>
        Bitafly es una plataforma tipo SaaS (Software as a Service) de gestión de operaciones con
        drones/UAS, dirigida a operadores aéreos no tripulados en Colombia, que permite —entre
        otras funciones— llevar bitácora de vuelo, gestionar flota y tripulación, planear y
        autorizar misiones, administrar el mantenimiento de aeronaves, generar reportes y
        formatos exigidos por la Aeronáutica Civil (UAEAC) conforme a la Reglamentación
        Aeronáutica Colombiana (RAC 100), y administrar el Sistema de Gestión de la Seguridad
        Operacional (SMS) del operador.
      </p>
      <p>
        El acceso al Sitio y su navegación básica es libre y gratuito. El uso de las
        funcionalidades de la Plataforma requiere el registro de una cuenta y, según el plan
        contratado, el pago de una suscripción, conforme a los{' '}
        <a href="/terminos-condiciones">Términos y Condiciones</a>.
      </p>

      <h2 id="condiciones-acceso">3. Condiciones de acceso y uso</h2>
      <p>
        El acceso y uso del Sitio atribuye la condición de usuario e implica la aceptación plena
        de este Aviso Legal, de la <a href="/politica-privacidad">Política de Privacidad</a>, de
        la <a href="/politica-cookies">Política de Cookies</a> y, para quienes creen una cuenta,
        de los <a href="/terminos-condiciones">Términos y Condiciones</a>. El usuario se
        compromete a hacer un uso adecuado y lícito del Sitio y de sus contenidos, de conformidad
        con la legislación colombiana aplicable, la buena fe, el orden público y los presentes
        términos.
      </p>
      <p>
        Queda prohibido usar el Sitio con fines ilícitos o lesivos, introducir o difundir virus u
        otros elementos que puedan dañar sistemas informáticos, intentar acceder a áreas
        restringidas de la Plataforma sin autorización, o realizar cualquier acción que suponga
        una carga desproporcionada sobre la infraestructura del servicio.
      </p>

      <h2 id="propiedad-intelectual">4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos del Sitio y de la Plataforma —incluyendo, entre otros, el software,
        el código fuente, el diseño, la estructura de navegación, los textos, gráficos, logotipos,
        íconos, marcas, nombres comerciales y demás signos distintivos— son titularidad de{' '}
        {COMPANY.legalName} o de terceros que han autorizado su uso, y están protegidos por la
        normativa colombiana e internacional de propiedad intelectual e industrial.
      </p>
      <p>
        Se prohíbe la reproducción, distribución, comunicación pública, transformación o
        cualquier otra forma de explotación, total o parcial, de los contenidos del Sitio sin la
        autorización previa y expresa de {COMPANY.legalName}, salvo en los casos expresamente
        permitidos por la ley o por estos documentos.
      </p>

      <h2 id="enlaces-terceros">5. Enlaces a sitios de terceros</h2>
      <p>
        El Sitio puede contener enlaces a páginas web de terceros (por ejemplo, pasarelas de
        pago, recursos regulatorios de la Aeronáutica Civil, o contenido de blog). Bitafly no
        controla ni se hace responsable del contenido, políticas de privacidad o prácticas de
        dichos sitios. La inclusión de estos enlaces no implica relación, recomendación o
        aprobación entre Bitafly y el sitio enlazado.
      </p>

      <h2 id="responsabilidad">6. Limitación de responsabilidad</h2>
      <p>
        Bitafly adopta medidas razonables para mantener el Sitio operativo, actualizado y libre de
        errores. No obstante, no garantiza la disponibilidad, continuidad o infalibilidad del
        Sitio, ni la ausencia de virus u otros elementos lesivos, y no será responsable por daños
        derivados de la falta de disponibilidad o continuidad del servicio, salvo en los casos en
        que la ley colombiana disponga lo contrario.
      </p>
      <p>
        La responsabilidad contractual derivada del uso de la Plataforma por parte de usuarios
        registrados se rige por los <a href="/terminos-condiciones">Términos y Condiciones</a>.
        Este Aviso Legal regula exclusivamente el acceso y uso general del sitio web.
      </p>

      <h2 id="proteccion-datos">7. Protección de datos personales</h2>
      <p>
        El tratamiento de los datos personales recolectados a través del Sitio y de la Plataforma
        se rige por la <a href="/politica-privacidad">Política de Privacidad</a>, elaborada
        conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. El uso de cookies y tecnologías
        similares se describe en la <a href="/politica-cookies">Política de Cookies</a>.
      </p>

      <h2 id="legislacion">8. Legislación aplicable y fuero</h2>
      <p>
        Este Aviso Legal se rige por las leyes de la República de Colombia. Para la resolución de
        cualquier controversia derivada del acceso o uso del Sitio, las partes se someten a la
        jurisdicción de los jueces y tribunales colombianos competentes, sin perjuicio de los
        mecanismos de protección al consumidor disponibles ante la Superintendencia de Industria y
        Comercio (SIC).
      </p>

      <h2 id="contacto">9. Contacto</h2>
      <p>
        Para cualquier consulta relacionada con este Aviso Legal, puede escribir a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
