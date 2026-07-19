import LegalLayout from '@/components/legal/LegalLayout';
import { COMPANY } from '@/lib/legalPages';

export const metadata = {
  title: 'Política de Privacidad | Bitafly',
  description: 'Cómo Bitafly recolecta, usa y protege los datos personales de sus usuarios, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Derechos ARCO y procedimiento para ejercerlos.',
  alternates: { canonical: '/politica-privacidad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Política de Privacidad | Bitafly',
    description: 'Tratamiento de datos personales, derechos ARCO y encargados del tratamiento de la plataforma Bitafly.',
    url: 'https://bitafly.com/politica-privacidad',
  },
};

const TOC = [
  { id: 'responsable', label: '1. Responsable del tratamiento' },
  { id: 'datos-recolectados', label: '2. Datos que recolectamos' },
  { id: 'finalidades', label: '3. Finalidades del tratamiento' },
  { id: 'encargados', label: '4. Encargados y transferencia internacional' },
  { id: 'seguridad', label: '5. Medidas de seguridad' },
  { id: 'conservacion', label: '6. Tiempo de conservación' },
  { id: 'menores', label: '7. Datos de menores de edad' },
  { id: 'derechos-arco', label: '8. Derechos de los titulares (ARCO)' },
  { id: 'procedimiento', label: '9. Cómo ejercer sus derechos' },
  { id: 'cookies', label: '10. Cookies' },
  { id: 'cambios', label: '11. Cambios a esta política' },
  { id: 'contacto', label: '12. Contacto' },
];

export default function PoliticaPrivacidadPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Política de Privacidad"
      description="Cómo tratamos los datos personales de quienes usan bitafly.com y la plataforma Bitafly, y cómo puede ejercer sus derechos como titular de la información."
      updated="13 de julio de 2026"
      toc={TOC}
    >
      <p>
        Esta Política de Privacidad describe el tratamiento que {COMPANY.legalName} da a los
        datos personales de los usuarios del sitio <strong>bitafly.com</strong> y de la
        plataforma <strong>Bitafly</strong>, en cumplimiento de la Ley Estatutaria 1581 de 2012,
        su Decreto Reglamentario 1377 de 2013, y demás normas colombianas de protección de datos
        personales.
      </p>

      <h2 id="responsable">1. Responsable del tratamiento</h2>
      <table>
        <tbody>
          <tr><th>Responsable</th><td>{COMPANY.legalName}</td></tr>
          <tr><th>NIT</th><td>{COMPANY.nit}</td></tr>
          <tr><th>Domicilio</th><td>{COMPANY.domicile}</td></tr>
          <tr><th>Correo de contacto</th><td>{COMPANY.email}</td></tr>
        </tbody>
      </table>

      <h2 id="datos-recolectados">2. Datos que recolectamos</h2>
      <p>Según cómo use la Plataforma, Bitafly puede recolectar las siguientes categorías de datos:</p>
      <ul>
        <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, teléfono, ciudad y contraseña (almacenada de forma cifrada por nuestro proveedor de autenticación).</li>
        <li><strong>Datos de organización:</strong> razón social, NIT, dirección, representante legal y datos de registro ante la Aeronáutica Civil (N.º de explotador, N.º de operador UAS) de la empresa que usted representa o a la que pertenece.</li>
        <li><strong>Expediente de tripulante:</strong> número de cédula, licencia/CIPU, certificado médico y su vigencia, diploma UAS, examen teórico y contacto de emergencia, cuando usted o su organización los cargan para llevar el expediente de piloto exigido por la RAC 100.</li>
        <li><strong>Datos operativos de vuelo:</strong> bitácora de vuelos, ubicación de las operaciones, evaluaciones de riesgo (SORA), reportes de seguridad operacional (SMS, VOR/MOR) y demás información propia de la operación de aeronaves no tripuladas.</li>
        <li><strong>Datos de facturación:</strong> los pagos de suscripción se procesan a través de nuestra pasarela de pagos ePayco. <strong>Bitafly no almacena números de tarjeta ni datos financieros sensibles</strong> — esa información es tratada directamente por ePayco bajo su propia política de privacidad.</li>
        <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador y de dispositivo, y datos de uso del Sitio recolectados mediante cookies y tecnologías similares (ver <a href="/politica-cookies">Política de Cookies</a>).</li>
      </ul>

      <h2 id="finalidades">3. Finalidades del tratamiento</h2>
      <p>Los datos personales se tratan para las siguientes finalidades:</p>
      <ul>
        <li>Crear y administrar su cuenta y la de su organización en la Plataforma.</li>
        <li>Prestar el servicio contratado: bitácora digital, gestión de flota y tripulación, planeación y autorización de misiones, mantenimiento, SMS y generación de reportes/formatos regulatorios.</li>
        <li>Procesar pagos y gestionar suscripciones a través de ePayco.</li>
        <li>Enviar comunicaciones operativas (notificaciones de vuelo, mantenimiento, vencimiento de certificaciones, invitaciones a la organización) y, cuando aplique, comunicaciones comerciales.</li>
        <li>Cumplir obligaciones legales y regulatorias, incluidas las derivadas de la normativa aeronáutica colombiana (RAC 100 / UAEAC) que exige llevar registros de bitácora, mantenimiento y seguridad operacional.</li>
        <li>Prevenir el fraude, garantizar la seguridad de la Plataforma y atender requerimientos de autoridades competentes.</li>
      </ul>

      <h2 id="encargados">4. Encargados del tratamiento y transferencia internacional</h2>
      <p>
        Para operar la Plataforma, Bitafly se apoya en proveedores de infraestructura tecnológica
        que actúan como <strong>Encargados del Tratamiento</strong>, bajo instrucciones de
        Bitafly y sujetos a obligaciones de confidencialidad y seguridad:
      </p>
      <ul>
        <li><strong>Supabase</strong> — base de datos y autenticación de usuarios.</li>
        <li><strong>Vercel</strong> — alojamiento (hosting) del sitio y de la aplicación.</li>
        <li><strong>Cloudflare (R2)</strong> — almacenamiento de archivos y documentos adjuntos (fotos, certificados, adjuntos de mantenimiento, replays de vuelo).</li>
        <li><strong>ePayco</strong> — procesamiento de pagos y suscripciones.</li>
        <li><strong>Resend</strong> — envío de correos electrónicos transaccionales y de notificación.</li>
      </ul>
      <p>
        Algunos de estos proveedores procesan o almacenan información en servidores ubicados fuera
        de Colombia. Al usar la Plataforma, usted acepta esta transferencia y transmisión
        internacional de datos, necesaria para la prestación del servicio, la cual se realiza
        exclusivamente hacia encargados que ofrecen garantías adecuadas de protección de la
        información, conforme al artículo 26 de la Ley 1581 de 2012.
      </p>

      <h2 id="seguridad">5. Medidas de seguridad</h2>
      <p>
        Bitafly implementa medidas técnicas, humanas y administrativas razonables para proteger
        los datos personales contra pérdida, uso indebido, acceso no autorizado o alteración.
        Entre ellas, la información de cada organización está aislada mediante políticas de
        seguridad a nivel de fila (Row Level Security) en la base de datos, de forma que ninguna
        organización puede acceder a los datos de otra, y los documentos sensibles (cédulas,
        certificados médicos, diplomas) se almacenan en buckets privados accesibles únicamente
        mediante enlaces firmados y de vigencia limitada.
      </p>

      <h2 id="conservacion">6. Tiempo de conservación</h2>
      <p>
        Los datos personales se conservan mientras su cuenta y la de su organización permanezcan
        activas en la Plataforma, y durante el tiempo adicional necesario para cumplir
        obligaciones legales, contables, regulatorias (incluida la normativa RAC 100, que exige
        conservar registros de operación) o para atender eventuales requerimientos de autoridades
        competentes. Una vez cumplidas esas finalidades, los datos se eliminan o anonimizan de
        forma segura, salvo que exista una obligación legal de conservarlos por más tiempo.
      </p>

      <h2 id="menores">7. Datos de menores de edad</h2>
      <p>
        La Plataforma está dirigida a operadores UAS, empresas y profesionales mayores de edad. No
        está diseñada para ser usada por menores de edad y no recolectamos, a sabiendas, datos
        personales de menores. Si un padre, madre o acudiente considera que un menor ha
        suministrado datos personales a través del Sitio, puede contactarnos para solicitar su
        eliminación.
      </p>

      <h2 id="derechos-arco">8. Derechos de los titulares</h2>
      <p>Como titular de datos personales, usted tiene derecho a:</p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos personales frente a Bitafly.</li>
        <li>Solicitar prueba de la autorización otorgada para el tratamiento de sus datos.</li>
        <li>Ser informado, previa solicitud, sobre el uso que se le ha dado a sus datos personales.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normativa de protección de datos.</li>
        <li>Revocar la autorización y/o solicitar la supresión de sus datos, cuando no exista un deber legal o contractual que impida su eliminación.</li>
        <li>Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento.</li>
      </ul>

      <h2 id="procedimiento">9. Cómo ejercer sus derechos</h2>
      <p>
        Para ejercer cualquiera de los derechos anteriores, puede enviar su solicitud al correo{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, indicando su nombre completo,
        el derecho que desea ejercer y una descripción clara de su solicitud. Bitafly dará
        respuesta dentro de los plazos legales (10 días hábiles para consultas y 15 días hábiles
        para reclamos, prorrogables conforme lo permite la ley, informando oportunamente al
        titular). Si no obtiene respuesta satisfactoria, puede acudir a la Superintendencia de
        Industria y Comercio (SIC) para presentar su reclamo.
      </p>

      <h2 id="cookies">10. Cookies y tecnologías similares</h2>
      <p>
        El Sitio utiliza cookies propias y de terceros para su correcto funcionamiento y con
        fines analíticos. El detalle de las cookies utilizadas, su finalidad y cómo gestionarlas
        se encuentra en nuestra <a href="/politica-cookies">Política de Cookies</a>.
      </p>

      <h2 id="cambios">11. Cambios a esta política</h2>
      <p>
        Bitafly podrá actualizar esta Política de Privacidad para reflejar cambios normativos, en
        nuestros proveedores o en la forma en que tratamos los datos personales. La fecha de
        &quot;Última actualización&quot; en la parte superior de este documento indica la versión
        vigente. Los cambios sustanciales serán comunicados a los usuarios registrados por los
        canales habituales de la Plataforma.
      </p>

      <h2 id="contacto">12. Contacto</h2>
      <p>
        Para preguntas sobre esta Política de Privacidad o sobre el tratamiento de sus datos
        personales, escríbanos a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
