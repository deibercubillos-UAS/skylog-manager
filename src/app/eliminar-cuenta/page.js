import LegalLayout from '@/components/legal/LegalLayout';
import { COMPANY } from '@/lib/legalPages';

export const metadata = {
  title: 'Eliminar mi cuenta | Bitafly',
  description:
    'Cómo solicitar la eliminación de tu cuenta de Bitafly y de tus datos personales, qué se elimina, qué se conserva por obligación legal y en cuánto tiempo.',
  alternates: { canonical: '/eliminar-cuenta' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Eliminar mi cuenta | Bitafly',
    description: 'Solicita la eliminación de tu cuenta de Bitafly y de tus datos personales.',
    url: 'https://bitafly.com/eliminar-cuenta',
  },
};

const TOC = [
  { id: 'solicitar', label: '1. Cómo solicitar la eliminación' },
  { id: 'se-elimina', label: '2. Qué datos se eliminan' },
  { id: 'se-conserva', label: '3. Qué datos se conservan y por qué' },
  { id: 'plazo', label: '4. Plazo de respuesta' },
  { id: 'alternativas', label: '5. Otras opciones' },
  { id: 'contacto', label: '6. Contacto' },
];

const MAILTO = `mailto:${COMPANY.email}?subject=${encodeURIComponent(
  'Solicitud de eliminación de cuenta'
)}&body=${encodeURIComponent(
  'Solicito la eliminación de mi cuenta y de mis datos personales en Bitafly.\n\n' +
    'Correo de la cuenta: \n' +
    'Nombre completo: \n' +
    'Organización (si aplica): \n'
)}`;

export default function EliminarCuentaPage() {
  return (
    <LegalLayout
      eyebrow="Tu cuenta"
      title="Eliminar mi cuenta"
      description="Cómo pedir que se borren tu cuenta de Bitafly y tus datos personales, qué se elimina y qué debemos conservar por ley."
      updated="24 de noviembre de 2026"
      toc={TOC}
    >
      <p>
        Esta página explica cómo solicitar la eliminación de tu cuenta de <strong>Bitafly</strong> y
        de los datos personales asociados, qué información se elimina, cuál debemos conservar por
        obligación legal y en cuánto tiempo atendemos tu solicitud. El tratamiento general de tus
        datos se describe en la <a href="/politica-privacidad">Política de Privacidad</a>.
      </p>

      <h2 id="solicitar">1. Cómo solicitar la eliminación</h2>
      <p>
        Para solicitar que se borren tu cuenta y tus datos personales, escríbenos desde el correo
        asociado a tu cuenta al buzón <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>,
        indicando tu nombre completo y, si aplica, la organización a la que perteneces. Puedes usar
        el siguiente botón, que abre un correo con el asunto y los campos ya preparados:
      </p>
      <p>
        <a
          href={MAILTO}
          className="inline-flex items-center gap-2 !no-underline !text-white bg-primary rounded-xl px-5 py-3 font-bold shadow-sm hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">delete_forever</span>
          Solicitar eliminación de mi cuenta
        </a>
      </p>
      <p>
        Verificaremos que la solicitud provenga del titular de la cuenta antes de ejecutarla, para
        proteger tu información. Si perteneces a una organización gestionada por un tercero (por
        ejemplo, tu empleador), es posible que algunos registros de la operación pertenezcan a esa
        organización; en ese caso te indicaremos qué datos podemos eliminar directamente y cuáles
        dependen del administrador de la organización.
      </p>

      <h2 id="se-elimina">2. Qué datos se eliminan</h2>
      <p>Al atender tu solicitud, eliminamos o anonimizamos de forma segura:</p>
      <ul>
        <li>Los datos de tu cuenta: nombre, correo electrónico, teléfono y credenciales de acceso.</li>
        <li>Tu expediente de tripulante y los documentos personales que hayas cargado (cédula, licencia, certificado médico, diplomas), salvo los que debamos conservar según el apartado 3.</li>
        <li>Tu perfil y tus preferencias dentro de la Plataforma.</li>
      </ul>

      <h2 id="se-conserva">3. Qué datos se conservan y por qué</h2>
      <p>
        Algunos datos no pueden eliminarse de inmediato porque existe una obligación legal o
        regulatoria de conservarlos. En particular:
      </p>
      <ul>
        <li>
          <strong>Registros de la operación aérea</strong> (bitácoras de vuelo, mantenimiento,
          seguridad operacional) que la normativa aeronáutica colombiana (RAC 100 / UAEAC) exige
          conservar. Estos registros pertenecen a la operación de la organización y se conservan por
          el tiempo que ordene la regulación.
        </li>
        <li>
          <strong>Información contable y de facturación</strong> necesaria para cumplir obligaciones
          tributarias y comerciales.
        </li>
        <li>
          Datos que debamos conservar para atender requerimientos de autoridades competentes o para
          ejercer o defender reclamaciones legales.
        </li>
      </ul>
      <p>
        Una vez cumplidas esas finalidades y vencidos los plazos legales de conservación, estos
        datos también se eliminan o anonimizan. El detalle está en la{' '}
        <a href="/politica-privacidad#conservacion">sección 6 de la Política de Privacidad</a>.
      </p>

      <h2 id="plazo">4. Plazo de respuesta</h2>
      <p>
        Atendemos las solicitudes dentro de los plazos de la Ley 1581 de 2012: hasta 10 días hábiles
        para consultas y 15 días hábiles para reclamos, prorrogables conforme lo permite la ley,
        informándote oportunamente. Te confirmaremos por correo cuando la eliminación se haya
        ejecutado y qué datos, de haberlos, se conservaron por las razones del apartado 3.
      </p>

      <h2 id="alternativas">5. Otras opciones</h2>
      <ul>
        <li>
          <strong>Eliminar solo algunos datos:</strong> puedes pedir la rectificación o eliminación
          de datos puntuales sin cerrar la cuenta, escribiéndonos al mismo correo.
        </li>
        <li>
          <strong>Salir de una organización:</strong> si solo quieres dejar de pertenecer a una
          organización, puedes hacerlo desde tu perfil sin eliminar la cuenta.
        </li>
      </ul>

      <h2 id="contacto">6. Contacto</h2>
      <p>
        Para cualquier duda sobre la eliminación de tu cuenta o el tratamiento de tus datos
        personales, escríbenos a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
