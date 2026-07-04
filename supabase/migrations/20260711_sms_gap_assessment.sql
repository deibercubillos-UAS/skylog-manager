-- Mejora Continua — Autoevaluación GAP del SMS (Fase 4 del plan de mejora
-- SMS, ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md "Seguridad SMS").
-- Apéndice 1 - Análisis GAP del SMS para Explotador UAS (MAUT-5.0-22-017,
-- Tabla 4, fuente OACI Doc 9859 2ª Ed. Apéndice 2 Cap. 7, modificado por
-- GDMUA) — 100 preguntas Sí/No transcritas literalmente, agrupadas en 4
-- componentes / 12 elementos. Catálogo GLOBAL (sin organization_id): es el
-- mismo checklist oficial para todo explotador UAS, no se personaliza por
-- organización — lo que varía por org son las respuestas
-- (sms_gap_assessments / sms_gap_responses).

create table if not exists public.sms_gap_questions (
  id               uuid primary key default gen_random_uuid(),
  component_number int not null check (component_number between 1 and 4),
  component_name   text not null,
  element_number   text not null,
  element_name     text not null,
  question_text    text not null,
  order_index      int not null unique
);

alter table public.sms_gap_questions enable row level security;

-- Catálogo global de solo lectura — cualquier miembro autenticado de una
-- organización puede leerlo (no expone datos de ninguna org); sin políticas
-- de escritura, se administra solo vía migración (dato de referencia fijo).
create policy sms_gap_questions_select on public.sms_gap_questions
  for select using (auth.uid() is not null);

-- ── Evaluaciones (una fila por autoevaluación fechada) ────────────────────
create table if not exists public.sms_gap_assessments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text,
  assessment_date date not null default current_date,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_sms_gap_assessments_org on public.sms_gap_assessments (organization_id);

alter table public.sms_gap_assessments enable row level security;

create policy sms_gap_assessments_all on public.sms_gap_assessments
  for all
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Respuestas por pregunta ────────────────────────────────────────────────
-- responsible/status alimentan el tablero de Acciones Correctivas (Fase 5)
-- por agregación directa sobre las respuestas 'no' — no se duplica una
-- tabla de acciones aparte para los hallazgos GAP.
create table if not exists public.sms_gap_responses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id   uuid not null references public.sms_gap_assessments(id) on delete cascade,
  question_id     uuid not null references public.sms_gap_questions(id) on delete cascade,
  response        text check (response in ('si', 'no')),
  evidence_date   date,
  comments        text,
  responsible     text,
  status          text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'completado')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (assessment_id, question_id)
);
create index if not exists idx_sms_gap_responses_org on public.sms_gap_responses (organization_id);
create index if not exists idx_sms_gap_responses_assessment on public.sms_gap_responses (assessment_id);

alter table public.sms_gap_responses enable row level security;

create policy sms_gap_responses_all on public.sms_gap_responses
  for all
  using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Semilla del catálogo (100 preguntas, transcripción literal) ───────────
insert into public.sms_gap_questions (component_number, component_name, element_number, element_name, question_text, order_index) values
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Se ha definido y se ha implementado una política de seguridad operacional aplicable al tipo y condiciones de operación?', 1),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Refleja la política de seguridad operacional los compromisos del explotador UAS con respecto a la gestión de la seguridad operacional?', 2),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Incluye la política de seguridad operacional una declaración clara sobre la provisión de los recursos necesarios para la implementación del sistema de gestión de seguridad operacional?', 3),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Incluye la política de seguridad operacional los procedimientos de notificación de la seguridad operacional?', 4),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Indica claramente la política de seguridad operacional cuáles son los tipos de comportamientos operacionales que resultan inaceptables?', 5),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Incluye la política de seguridad operacional las condiciones en las cuales no se aplicarían medidas disciplinarias?', 6),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Está la política de seguridad operacional firmada por el Gerente Responsable?', 7),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Se comunica la política de seguridad operacional, con visible endoso, a toda la organización?', 8),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Se examina periódicamente la política de seguridad operacional para asegurar que sigue siendo pertinente y apropiada para el explotador UAS?', 9),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Existe un proceso formal para elaborar un conjunto coherente de objetivos de seguridad operacional?', 10),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Están los objetivos de seguridad operacional relacionados con los indicadores, las metas y los planes de acción?', 11),
(1, 'Política y objetivos de seguridad operacional', '1.1', 'Responsabilidad y compromiso de la administración', '¿Se publican y distribuyen los objetivos de seguridad operacional?', 12),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Ha identificado la organización un Gerente Responsable quien, independientemente de otras funciones, tendrá la responsabilidad final y rendirá cuentas, en nombre del explotador UAS, de la implementación y mantenimiento del SMS?', 13),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Tiene el Gerente de Seguridad Operacional responsabilidad para asegurar que el SMS está adecuadamente implementado y funciona cumpliendo todos los requisitos en todos los procesos del explotador UAS?', 14),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Tiene el Gerente Responsable control completo de los recursos financieros necesarios para las operaciones cuya realización se ha autorizado en el marco de un certificado de operaciones?', 15),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Tiene el Gerente Responsable control completo de los recursos humanos necesarios para las operaciones cuya realización se ha autorizado en el marco del certificado de operaciones?', 16),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Tiene el Gerente Responsable responsabilidad directa por la realización de las actividades del explotador UAS?', 17),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Tiene el Gerente Responsable autoridad final con respecto a las operaciones cuya realización se ha autorizado en el marco del certificado de operaciones?', 18),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Se han identificado las líneas de rendición de cuentas de todos los miembros de la administración, independientemente de otras funciones, así como la de los empleados, con respecto a la eficacia de la seguridad operacional del SMS?', 19),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Se documentan y comunican en toda la organización las responsabilidades, rendición de cuentas y autoridades de seguridad operacional?', 20),
(1, 'Política y objetivos de seguridad operacional', '1.2', 'Responsabilidades respecto de la seguridad operacional', '¿Existe una definición de los niveles de administración con autoridad para tomar decisiones con respecto a la aceptabilidad de los riesgos de seguridad operacional?', 21),
(1, 'Política y objetivos de seguridad operacional', '1.3', 'Designación del personal clave de seguridad operacional', '¿Hay designada una persona cualificada para gestionar y supervisar el funcionamiento diario del SMS?', 22),
(1, 'Política y objetivos de seguridad operacional', '1.3', 'Designación del personal clave de seguridad operacional', '¿Cumple la persona que supervisa el funcionamiento del SMS las funciones y responsabilidades requeridas de su cargo?', 23),
(1, 'Política y objetivos de seguridad operacional', '1.3', 'Designación del personal clave de seguridad operacional', '¿Están definidas y documentadas las facultades, responsabilidades y rendición de cuentas de seguridad operacional del personal a todos los niveles de la organización?', 24),
(1, 'Política y objetivos de seguridad operacional', '1.4', 'Coordinación del plan de respuesta ante emergencias', '¿Está definido un plan de respuestas ante emergencias apropiado al tamaño, carácter y complejidad de la operación?', 25),
(1, 'Política y objetivos de seguridad operacional', '1.4', 'Coordinación del plan de respuesta ante emergencias', '¿Hay coordinación en los procedimientos de respuesta ante emergencias del explotador UAS con los procedimientos de respuesta ante emergencias de otras organizaciones con las que se interrelaciona durante la prestación de servicios?', 26),
(1, 'Política y objetivos de seguridad operacional', '1.4', 'Coordinación del plan de respuesta ante emergencias', '¿Está definido el proceso para distribuir y comunicar los procedimientos de coordinación a todo personal involucrado en la ejecución del plan de respuesta a emergencias?', 27),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Esta descrito y se mantiene un control de documentos de seguridad operacional?', 28),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Existe documentación SMS en papel o formato electrónico, en buen orden y mantenimiento?', 29),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se ha elaborado un manual SMS, donde se describa el SMS y las interrelaciones consolidadas entre todos los componentes y elementos del SMS?', 30),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se ha elaborado un plan de implementación del SMS que asegure que el SMS se ejecutará para satisfacer los objetivos de seguridad operacional del explotador UAS?', 31),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se realiza la implementación del SMS por un equipo de trabajo con una base de experiencia apropiada?', 32),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Recibe el equipo de trabajo recursos suficientes (incluyendo tiempo para reuniones) para la implementación SMS?', 33),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿El Gerente Responsable revisa regularmente los procesos del SMS?', 34),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se ha realizado la implementación del SMS en fases?', 35),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Trata explícitamente el MSMS la coordinación entre el SMS del explotador UAS y el SMS de otras organizaciones con las cuales se interactúa durante la prestación de servicios?', 36),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se ha elaborado MSMS como instrumento básico para comunicar a todo el personal del explotador UAS el enfoque de seguridad operacional del mismo?', 37),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se documentan en el MSMS todos los aspectos del SMS, incluidos: la política de seguridad operacional, sus objetivos, procedimientos y responsabilidades individuales en seguridad operacional?', 38),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Articula claramente el MSMS la función de la gestión del riesgo de seguridad operacional como una actividad del diseño inicial, y la función de la garantía de seguridad operacional como actividad continua?', 39),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se han incorporado partes pertinentes de la documentación relacionada con el SMS en el manual de operaciones y en el manual de control de mantenimiento del explotador UAS, según corresponda?', 40),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se cuenta con un sistema de registros que asegure la generación y conservación de todos los registros necesarios para documentar y apoyar los requisitos operacionales?', 41),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Se ajusta el sistema de registros a los requisitos normativos aplicables y mejores prácticas industriales?', 42),
(1, 'Política y objetivos de seguridad operacional', '1.5', 'Documentación SMS', '¿Proporciona el sistema de registros los procesos de control necesarios para asegurar la apropiada identificación, legibilidad, almacenamiento, protección, archivo, recuperación, tiempo de retención y disposición de los registros?', 43),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Está definido un sistema formal de recopilación y procesamiento de datos de seguridad operacional (SDCPS) para la eficaz recolección de información sobre peligros en las operaciones?', 44),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Incluye el SDCPS una combinación de métodos reactivos, proactivos y predictivos para recoger datos de seguridad operacional?', 45),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se cuenta con procesos reactivos que permitan la captación de información pertinente a la gestión de la seguridad operacional y de los riesgos?', 46),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se ha desarrollado un programa de instrucción pertinente a métodos reactivos de recolección de datos de seguridad operacional?', 47),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se han desarrollado técnicas de comunicaciones pertinentes a los métodos reactivos de recolección de datos de seguridad operacional?', 48),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Es la notificación reactiva sencilla, accesible y conmensurable con el tamaño del explotador UAS?', 49),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se examinan los informes reactivos al nivel apropiado de la administración?', 50),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Existe un proceso de retroinformación para notificar a los contribuyentes que sus informes se han recibido y compartir los resultados de los análisis?', 51),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se cuenta con procesos proactivos que busquen activamente identificar los riesgos de seguridad operacional mediante el análisis de las actividades de la organización?', 52),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Existe instrucción pertinente a los métodos proactivos de recolección de datos de seguridad operacional?', 53),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se han elaborado técnicas de comunicación pertinente a los métodos proactivos de recolección de datos de seguridad operacional?', 54),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Es la notificación proactiva sencilla, accesible y conmensurable con el tamaño del explotador UAS?', 55),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se cuenta con procesos predictivos que permitan la captación de la eficacia del sistema en las operaciones normales en tiempo real?', 56),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Existe instrucción pertinente a los métodos predictivos de recolección de datos de seguridad operacional?', 57),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Se han implementado técnicas de comunicación pertinente a los métodos predictivos de recolección de datos de seguridad operacional?', 58),
(2, 'Gestión de riesgos de seguridad operacional', '2.1', 'Identificación de peligros', '¿Es el proceso predictivo de captación de datos de seguridad operacional conmensurable con el tamaño del explotador UAS?', 59),
(2, 'Gestión de riesgos de seguridad operacional', '2.2', 'Evaluación y mitigación de riesgos de seguridad operacional', '¿Se ha elaborado y se mantiene un protocolo que asegure el análisis, evaluación y control de los riesgos de seguridad operacional en las operaciones de la organización?', 60),
(2, 'Gestión de riesgos de seguridad operacional', '2.2', 'Evaluación y mitigación de riesgos de seguridad operacional', '¿Articula claramente la documentación SMS de la organización la relación entre peligros, consecuencias y riesgos de seguridad operacional?', 61),
(2, 'Gestión de riesgos de seguridad operacional', '2.2', 'Evaluación y mitigación de riesgos de seguridad operacional', '¿Existe un proceso estructurado para el análisis de los riesgos de seguridad operacional relacionados con las consecuencias de peligros identificados, expresados en términos de probabilidad y gravedad del evento?', 62),
(2, 'Gestión de riesgos de seguridad operacional', '2.2', 'Evaluación y mitigación de riesgos de seguridad operacional', '¿Existen criterios para evaluar los riesgos de seguridad operacional y establecer la aceptabilidad de los riesgos (es decir el nivel aceptable de riesgos de seguridad operacional que el explotador UAS está dispuesta a aceptar)?', 63),
(2, 'Gestión de riesgos de seguridad operacional', '2.2', 'Evaluación y mitigación de riesgos de seguridad operacional', '¿Se cuenta con estrategias de mitigación de riesgos de seguridad operacional que comprendan planes de acción correctiva/preventiva para evitar la repetición de eventos y deficiencias notificadas?', 64),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se ha implementado un proceso interno para verificar la eficacia de la seguridad operacional de la organización y validar la efectividad de los controles de riesgo de seguridad operacional?', 65),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se incluyen en esos procesos las herramientas siguientes?: Sistemas de notificación de seguridad operacional / Estudios de seguridad operacional / Revisión del gerente de seguridad operacional al SMS / Auditorías del SMS', 66),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se verifica la eficacia de la seguridad operacional de la organización con referencia a los SPI?', 67),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se examinan los informes de seguridad operacional al nivel apropiado de la administración?', 68),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un proceso de retroinformación para notificar a los contribuyentes que sus informes se han recibido y compartir los resultados de los análisis?', 69),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se generan medidas correctivas y preventivas en respuesta de la identificación de peligros?', 70),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se aplican procedimientos para la realización de investigaciones internas?', 71),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un proceso que asegure que los eventos y deficiencias notificados se analizan para identificar todos los peligros conexos?', 72),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se cuenta con un proceso para evaluar la efectividad de las medidas correctivas/preventivas que se han elaborado?', 73),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Se cuenta con un sistema para supervisar el proceso de notificación interno y las medidas correctivas conexas?', 74),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe una función de auditoría con la independencia y autoridad requeridas para realizar evaluaciones internas efectivas?', 75),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Cubre el sistema de auditoría todas las funciones, actividades y procesos dentro del explotador UAS?', 76),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existen procesos de selección/instrucción para asegurar la objetividad y competencia de los auditores así como la imparcialidad del proceso de auditoría?', 77),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un proceso para notificar los resultados de las auditorías y mantener registros?', 78),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un procedimiento que establezca los requisitos para la oportuna adopción de medidas correctivas y preventivas en respuesta a los resultados de las auditorías?', 79),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un procedimiento para registrar la verificación de las medidas adoptadas y la notificación de los resultados de verificación?', 80),
(3, 'Garantía de la seguridad operacional', '3.1', 'Supervisión y medición de la eficacia de la seguridad operacional', '¿Existe un proceso para supervisar y analizar tendencias?', 81),
(3, 'Garantía de la seguridad operacional', '3.2', 'Gestión del cambio', '¿Existe y está vigente un protocolo para identificar cambios dentro de la organización que puedan afectar a procesos y servicios establecidos?', 82),
(3, 'Garantía de la seguridad operacional', '3.2', 'Gestión del cambio', '¿Analiza el protocolo para la gestión del cambio los cambios a las operaciones o personal fundamental debidos a riesgos de seguridad operacional?', 83),
(3, 'Garantía de la seguridad operacional', '3.2', 'Gestión del cambio', '¿Se han establecido acuerdos para asegurar la eficacia de la seguridad operacional antes de intentar los cambios?', 84),
(3, 'Garantía de la seguridad operacional', '3.2', 'Gestión del cambio', '¿Existe un proceso para eliminar o modificar los controles de riesgos de seguridad operacional que ya no se necesitan debido a los cambios introducidos en el entorno operacional?', 85),
(3, 'Garantía de la seguridad operacional', '3.3', 'Mejora continua del SMS', '¿Existe un protocolo para identificar las causas del bajo nivel de eficacia del SMS?', 86),
(3, 'Garantía de la seguridad operacional', '3.3', 'Mejora continua del SMS', '¿Se ha establecido un mecanismo para determinar las consecuencias del bajo nivel de eficacia del SMS sobre las operaciones?', 87),
(3, 'Garantía de la seguridad operacional', '3.3', 'Mejora continua del SMS', '¿Se ha establecido un mecanismo para eliminar o mitigar las causas de la baja eficacia del SMS?', 88),
(3, 'Garantía de la seguridad operacional', '3.3', 'Mejora continua del SMS', '¿Se cuenta con un proceso para la evaluación proactiva de instalaciones, equipos, documentación y procedimientos (mediante auditorías y encuestas, etc.)?', 89),
(3, 'Garantía de la seguridad operacional', '3.3', 'Mejora continua del SMS', '¿Se cuenta con un proceso para la evaluación proactiva de la actuación de un individuo, para verificar el cumplimiento de las responsabilidades de seguridad operacional de dicho individuo?', 90),
(4, 'Promoción de la seguridad operacional', '4.1', 'Instrucción y educación', '¿Existe un proceso documentado para identificar requisitos de instrucción de modo que el personal esté capacitado y sea competente para realizar sus tareas en SMS?', 91),
(4, 'Promoción de la seguridad operacional', '4.1', 'Instrucción y educación', '¿Se corresponde la instrucción en seguridad operacional con la participación del individuo en el SMS?', 92),
(4, 'Promoción de la seguridad operacional', '4.1', 'Instrucción y educación', '¿Se ha incorporado la instrucción en seguridad operacional en la instrucción de adoctrinamiento después de la contratación?', 93),
(4, 'Promoción de la seguridad operacional', '4.1', 'Instrucción y educación', '¿Existe instrucción sobre respuesta a emergencias para el personal afectado?', 94),
(4, 'Promoción de la seguridad operacional', '4.1', 'Instrucción y educación', '¿Existe un proceso que mida la efectividad de la instrucción?', 95),
(4, 'Promoción de la seguridad operacional', '4.2', 'Comunicación de la seguridad operacional', '¿Existen procesos de comunicación en la organización que permitan que el SMS funcione efectivamente?', 96),
(4, 'Promoción de la seguridad operacional', '4.2', 'Comunicación de la seguridad operacional', '¿Existen procesos de comunicación (escrita, reuniones, electrónica, etc.) conmensurables con el tamaño y alcance del explotador UAS?', 97),
(4, 'Promoción de la seguridad operacional', '4.2', 'Comunicación de la seguridad operacional', '¿Se ha establecido y mantiene la información crítica para la seguridad operacional en un medio adecuado que proporcione dirección con respecto a documentos SMS pertinentes?', 98),
(4, 'Promoción de la seguridad operacional', '4.2', 'Comunicación de la seguridad operacional', '¿Se difunde en toda la organización la información crítica para la seguridad operacional y se supervisa la efectividad de dicha comunicación?', 99),
(4, 'Promoción de la seguridad operacional', '4.2', 'Comunicación de la seguridad operacional', '¿Existe un procedimiento que explique por qué se adoptan medidas de seguridad operacional particulares y por qué se introducen o modifican los procedimientos de seguridad operacional?', 100)
on conflict (order_index) do nothing;
