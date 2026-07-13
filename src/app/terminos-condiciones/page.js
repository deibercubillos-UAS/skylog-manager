import LegalLayout from '@/components/legal/LegalLayout';
import { COMPANY } from '@/lib/legalPages';

export const metadata = {
  title: 'Términos y Condiciones | Bitafly',
  description: 'Condiciones de registro, planes, pagos y uso de la plataforma Bitafly, conforme al Estatuto del Consumidor colombiano (Ley 1480 de 2011).',
  alternates: { canonical: '/terminos-condiciones' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Términos y Condiciones | Bitafly',
    description: 'Condiciones de registro, planes de suscripción, pagos y uso de la plataforma Bitafly.',
    url: 'https://bitafly.com/terminos-condiciones',
  },
};

const TOC = [
  { id: 'objeto', label: '1. Objeto y aceptación' },
  { id: 'definiciones', label: '2. Definiciones' },
  { id: 'cuenta', label: '3. Registro y cuenta' },
  { id: 'planes-pagos', label: '4. Planes, precios y pagos' },
  { id: 'retracto', label: '5. Derecho de retracto' },
  { id: 'cancelacion', label: '6. Cancelación y terminación' },
  { id: 'uso-aceptable', label: '7. Uso aceptable' },
  { id: 'contenido-usuario', label: '8. Contenido y datos del usuario' },
  { id: 'propiedad-intelectual', label: '9. Propiedad intelectual' },
  { id: 'disponibilidad', label: '10. Disponibilidad del servicio' },
  { id: 'responsabilidad', label: '11. Limitación de responsabilidad' },
  { id: 'privacidad', label: '12. Privacidad' },
  { id: 'modificaciones', label: '13. Modificaciones a estos términos' },
  { id: 'legislacion', label: '14. Legislación aplicable y resolución de conflictos' },
  { id: 'contacto', label: '15. Identificación y contacto' },
];

export default function TerminosCondicionesPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Términos y Condiciones"
      description="Condiciones que rigen el registro, la suscripción y el uso de la plataforma Bitafly por parte de operadores UAS y sus tripulantes."
      updated="13 de julio de 2026"
      toc={TOC}
    >
      <p>
        Estos Términos y Condiciones (en adelante, los &quot;Términos&quot;) regulan el acceso y
        uso de la plataforma <strong>Bitafly</strong>, ofrecida por {COMPANY.legalName} a través
        del sitio <strong>bitafly.com</strong>. Al crear una cuenta o usar la Plataforma, usted
        declara haber leído, entendido y aceptado estos Términos, así como la{' '}
        <a href="/politica-privacidad">Política de Privacidad</a> y la{' '}
        <a href="/politica-cookies">Política de Cookies</a>.
      </p>

      <h2 id="objeto">1. Objeto y aceptación</h2>
      <p>
        Bitafly es una plataforma tipo SaaS de gestión de operaciones con drones/UAS para
        Colombia, que incluye bitácora digital, gestión de flota y tripulación, planeación y
        autorización de misiones, mantenimiento, Sistema de Gestión de la Seguridad Operacional
        (SMS) y generación de reportes/formatos exigidos por la Aeronáutica Civil (UAEAC)
        conforme a la RAC 100. Estos Términos aplican a toda persona natural o jurídica que se
        registre y use la Plataforma, ya sea como titular de la cuenta de una organización o como
        tripulante invitado a ella.
      </p>

      <h2 id="definiciones">2. Definiciones</h2>
      <ul>
        <li><strong>&quot;Bitafly&quot; / &quot;la Plataforma&quot;:</strong> el software, sitio web y demás servicios ofrecidos por {COMPANY.legalName}.</li>
        <li><strong>&quot;Usuario&quot;:</strong> persona que crea o usa una cuenta en la Plataforma, ya sea como administrador de una organización o como tripulante (piloto, jefe de pilotos, gerente SMS, etc.).</li>
        <li><strong>&quot;Organización&quot;:</strong> operador UAS (empresa o piloto independiente) registrado en la Plataforma, cuyos datos operativos están aislados de los de otras organizaciones.</li>
        <li><strong>&quot;Plan&quot;:</strong> el nivel de suscripción contratado (por ejemplo, Piloto, Escuadrilla, Flota o Enterprise), con sus propios límites de recursos y funcionalidades, publicados en <a href="/precios">bitafly.com/precios</a>.</li>
      </ul>

      <h2 id="cuenta">3. Registro y cuenta</h2>
      <p>
        Para usar la Plataforma es necesario crear una cuenta con datos veraces, exactos y
        actualizados. El usuario es responsable de mantener la confidencialidad de sus
        credenciales de acceso y de toda actividad realizada desde su cuenta. Debe notificar a
        Bitafly de inmediato ante cualquier uso no autorizado de su cuenta.
      </p>
      <p>
        Los administradores de una organización pueden invitar a otros usuarios (tripulantes) a
        unirse a ella, asignándoles un rol con permisos específicos dentro de la Plataforma. Cada
        usuario es responsable de la veracidad de la información que carga, incluida la que
        corresponde a su expediente de tripulante.
      </p>

      <h2 id="planes-pagos">4. Planes, precios y pagos</h2>
      <p>
        Bitafly ofrece distintos planes de suscripción, cuyos precios, límites y funcionalidades
        vigentes se publican en <a href="/precios">bitafly.com/precios</a>. Algunos planes
        incluyen un período de prueba gratuito antes del primer cobro, cuya duración se indica en
        el momento de la contratación. Los pagos se procesan a través de la pasarela{' '}
        <strong>ePayco</strong>; Bitafly no almacena datos de tarjetas ni información financiera
        sensible.
      </p>
      <p>
        Las suscripciones pagas se renuevan automáticamente al final de cada ciclo de facturación
        (mensual o anual, según lo elegido), salvo que el usuario cancele antes de la fecha de
        renovación desde el panel de <em>Suscripción</em> de su cuenta. Adicionalmente, cualquier
        organización puede contratar recursos adicionales (pilotos o drones extra) sobre su plan
        base, cuyo precio vigente también se publica en la página de precios.
      </p>
      <p>
        Bitafly podrá modificar los precios de los planes hacia el futuro, sin afectar los ciclos
        de facturación ya pagados. Cualquier cambio de precio será informado al usuario antes de
        aplicarse a su próxima renovación.
      </p>

      <h2 id="retracto">5. Derecho de retracto</h2>
      <p>
        De conformidad con el artículo 47 de la Ley 1480 de 2011, en las ventas realizadas a
        través de sistemas de comercio electrónico o a distancia, el consumidor tiene derecho a
        retractarse de la contratación dentro de los cinco (5) días hábiles siguientes a la
        celebración del contrato, siempre que el servicio aún no haya sido completamente prestado
        con su consentimiento expreso. En el caso de los planes pagos de Bitafly que incluyen
        período de prueba gratuito, el usuario puede cancelar en cualquier momento durante dicho
        período sin costo alguno, antes de que se genere el primer cobro. Para ejercer el derecho
        de retracto o solicitar la cancelación de su suscripción, puede escribir a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o gestionarlo directamente desde
        el panel de <em>Suscripción</em> de su cuenta.
      </p>

      <h2 id="cancelacion">6. Cancelación y terminación</h2>
      <p>
        El usuario puede cancelar su suscripción en cualquier momento desde el panel de
        <em> Suscripción</em>; la cancelación detiene la renovación automática, y el acceso a las
        funcionalidades del plan pago se mantiene hasta el final del período ya pagado. Bitafly
        podrá suspender o terminar el acceso a una cuenta que incumpla estos Términos, que haga un
        uso indebido de la Plataforma, o cuando lo exija la ley, previa notificación al usuario
        cuando sea razonablemente posible.
      </p>

      <h2 id="uso-aceptable">7. Uso aceptable</h2>
      <p>El usuario se compromete a no usar la Plataforma para:</p>
      <ul>
        <li>Cargar información falsa en registros de bitácora, mantenimiento o expedientes de tripulación.</li>
        <li>Vulnerar la normativa aeronáutica colombiana (RAC 100/UAEAC) o cualquier otra ley aplicable.</li>
        <li>Intentar acceder sin autorización a datos de otra organización o cuenta.</li>
        <li>Distribuir malware, realizar ingeniería inversa sobre el software, o sobrecargar deliberadamente la infraestructura del servicio.</li>
        <li>Usar la Plataforma con fines distintos a la gestión legítima de operaciones UAS.</li>
      </ul>

      <h2 id="contenido-usuario">8. Contenido y datos del usuario</h2>
      <p>
        El usuario conserva la titularidad de los datos operativos, documentos y demás
        información que carga en la Plataforma (&quot;Contenido del Usuario&quot;). Al cargarlo,
        otorga a Bitafly una licencia limitada para almacenar, procesar y mostrar dicho contenido
        con el único fin de prestarle el servicio contratado. El tratamiento de los datos
        personales contenidos en ese Contenido del Usuario se rige por la{' '}
        <a href="/politica-privacidad">Política de Privacidad</a>.
      </p>

      <h2 id="propiedad-intelectual">9. Propiedad intelectual</h2>
      <p>
        El software, código fuente, diseño y demás elementos de la Plataforma son propiedad de
        {' '}{COMPANY.legalName} o de terceros licenciantes, y están protegidos por la normativa
        de propiedad intelectual aplicable. Estos Términos no transfieren al usuario ningún
        derecho de propiedad sobre la Plataforma; únicamente se concede una licencia de uso
        personal, no exclusiva e intransferible, limitada a la duración de la suscripción activa.
      </p>

      <h2 id="disponibilidad">10. Disponibilidad del servicio</h2>
      <p>
        Bitafly procura mantener la Plataforma disponible de forma continua, pero no garantiza
        una disponibilidad ininterrumpida, dado que depende de proveedores de infraestructura de
        terceros. Podrán existir interrupciones programadas por mantenimiento o interrupciones no
        programadas por causas ajenas a Bitafly, sin que ello genere derecho a indemnización,
        salvo lo que disponga la ley colombiana aplicable.
      </p>

      <h2 id="responsabilidad">11. Limitación de responsabilidad</h2>
      <p>
        Bitafly es una herramienta de apoyo a la gestión documental y operativa del explotador
        UAS; no sustituye el juicio profesional del piloto, del jefe de pilotos, ni las
        obligaciones regulatorias directas del operador ante la Aeronáutica Civil. La
        responsabilidad por la exactitud de la información cargada por los usuarios, por las
        decisiones operativas de vuelo y por el cumplimiento regulatorio ante la UAEAC corresponde
        al operador UAS, no a Bitafly. En la medida permitida por la ley colombiana, la
        responsabilidad de Bitafly frente al usuario se limita a los valores efectivamente
        pagados por la suscripción durante los doce (12) meses previos al hecho que genere la
        reclamación.
      </p>

      <h2 id="privacidad">12. Privacidad</h2>
      <p>
        El tratamiento de los datos personales de los usuarios se rige por la{' '}
        <a href="/politica-privacidad">Política de Privacidad</a> y la{' '}
        <a href="/politica-cookies">Política de Cookies</a>, que forman parte integral de estos
        Términos.
      </p>

      <h2 id="modificaciones">13. Modificaciones a estos Términos</h2>
      <p>
        Bitafly podrá modificar estos Términos para reflejar cambios normativos, nuevas
        funcionalidades o ajustes comerciales. Los cambios sustanciales se comunicarán a los
        usuarios registrados con antelación razonable; el uso continuado de la Plataforma tras la
        entrada en vigencia de los cambios implica su aceptación.
      </p>

      <h2 id="legislacion">14. Legislación aplicable y resolución de conflictos</h2>
      <p>
        Estos Términos se rigen por las leyes de la República de Colombia, en particular la Ley
        1480 de 2011 (Estatuto del Consumidor) y la Ley 527 de 1999 (validez de mensajes de datos
        y comercio electrónico). Cualquier controversia se someterá a los jueces y tribunales
        colombianos competentes, sin perjuicio del derecho del consumidor a acudir a la
        Superintendencia de Industria y Comercio (SIC).
      </p>

      <h2 id="contacto">15. Identificación y contacto</h2>
      <p>
        En cumplimiento del artículo 50 de la Ley 1480 de 2011, se informa que el prestador del
        servicio es <strong>{COMPANY.legalName}</strong>, NIT {COMPANY.nit}, con domicilio en{' '}
        {COMPANY.domicile}, representada legalmente por {COMPANY.legalRepresentative}. Para
        cualquier consulta, reclamo o solicitud relacionada con estos Términos, puede escribir a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
