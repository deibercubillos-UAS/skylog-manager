# Guía paso a paso de BitaFly V2 — por perfil (2026-10-16)

Basada en el recorrido real de producción (`https://bitafly.com`) con las cuentas QA, y en la matriz `70-matriz-de-permisos.md`.
Leyenda: ✏️ puede crear/editar · 👁 solo ve · ❌ no aparece o responde 403. Los tiempos de cada pantalla están en la sección 9 de `73-resultados-pruebas.md`.

## 0 · Antes de empezar (todos los perfiles)
1. Abra `bitafly.com/login`, escriba correo y contraseña y pulse **Iniciar sesión** (o «Continuar con Google»).
2. Al primer ingreso aparece un recorrido de bienvenida de 7 pasos («Saltar tutorial» lo cierra) y el aviso de cookies (Aceptar/Rechazar).
3. Quedará en **Inicio**. Arriba: menú ☰, buscador (**Ctrl+K**), campana de notificaciones y menú de cuenta (avatar → Perfil, cambiar de organización, Cerrar sesión). En celular, el avatar abre `/perfil`, donde está «Cerrar sesión».
4. El menú lateral muestra solo lo que su rol puede usar. Si escribe a mano la dirección de una pantalla no permitida, se redirige o aparece sin acciones.
5. Contraseña olvidada: «Olvidé mi contraseña» en el login. Invitado por correo: abra el enlace, cree la cuenta y entra directo a la organización que lo invitó.

---

## 1 · Gerente General (dueño de la empresa) — todo ✏️ excepto abrir/gestionar casos SMS
**Primer día (alta de la operación)**
1. **Organización** → *Guardar datos* (razón social, NIT, contacto), *Subir logo*, contactos de emergencia, certificación Aerocivil, designar cargos (GSO, Jefe de Pilotos).
2. **Organización → Importar desde Excel**: descargue la plantilla, llénela (aeronaves, baterías, tripulación, pólizas), *Revisar archivo* y confirme.
3. **Flota → Aeronaves** → *Nueva aeronave* (ficha técnica, foto, documento de propiedad). Si usa DJI, «precargar catálogo de modelos».
4. **Flota → Baterías y Componentes** → *Nueva batería*; instalar/retirar hélices y motores.
5. **Flota → Tripulación** → *Agregar tripulante* o *Invitar por correo*; el rol se cambia solo aquí (solo el Gerente General cambia roles).
6. **Documentación** → Pólizas, Proveedores, Manuales (*Cargar manual*), Listas de chequeo (*Nueva lista*).

**Operación diaria**
1. **Programación** → *Nueva misión* (PIC, aeronave, zona, fecha y hora) → aparece en el calendario; se puede editar o cancelar.
2. **Despacho** → asistente: verificaciones, listas de chequeo, evaluación de riesgo → *Despachar*; al volver, *Cerrar vuelo*. El vuelo queda en **Bitácora**.
3. **Bitácora** → vista por piloto o Libro de vuelo por aeronave; *Registrar vuelo* manual o importar el log DJI; replay GPS.
4. **Tiempos de servicio** → iniciar/cerrar período, *Certificar* horas anuales, autorizar excepciones de descanso.
5. **Mantenimiento** → *Registrar mantenimiento* o *Reportar evento* (los eventos quedan 5 años: no se borran).
6. **Meteorología** → ubicación → aptitud de vuelo.

**Seguridad (SMS) y control**
1. **SMS → Reportes y Casos**: ve los reportes; *Activar enlace público* y QR para que cualquiera reporte un suceso. Abrir/analizar/radicar casos es del Gerente SMS.
2. **SMS**: objetivos, riesgos (matriz, peligros, barreras), cambios, indicadores, mejora continua (GAP), reporte mensual a Aerocivil (*Marcar como enviado*), asistente de implantación, gobernanza (*Publicar política*).
3. **Reportes**: elija formato → descargar PDF/Excel. **Registro de acciones**: quién hizo qué (*Descargar CSV*). **Retención y custodia**: *Nueva custodia* congela vuelos por requerimiento legal.
4. **Suscripción**: plan, uso, *Pagar ahora* (Wompi), cancelar renovación.

## 2 · Jefe de Pilotos — operación y flota ✏️; SMS y Organización 👁
Igual que el Gerente General en **Programación, Despacho, Bitácora, Tiempos de servicio, Flota (aeronaves, baterías, componentes, tripulación, mantenimiento, existencias, ETA), Pólizas, Proveedores, Manuales, Listas de chequeo, Capacitación, Importar, Registro de acciones y Retención**. Diferencias:
1. No cambia roles ni invita a otro Gerente General.
2. SMS, Organización y Aerocivil son solo lectura (no ve «Abrir caso»).
3. Sí firma la declaración de mercancías peligrosas y ve el aviso de suscripción.

## 3 · Gerente SMS — SMS ✏️; operación y flota 👁
1. **SMS → Reportes y Casos**: abrir y asumir el caso → analizar → *Acción correctiva* → radicar ante Aerocivil → cerrar. Es el único (junto al superadmin) que ve la identidad en reportes confidenciales.
2. **SMS**: objetivos, riesgos (evaluar probabilidad × gravedad), indicadores (capturar meses, planes de acción), GAP, reporte mensual, plan de implantación, capacitación SMS (sesiones y asistencia).
3. **Organización → Gobernanza**: designar cargos y publicar política. **Capacitación** y **Manuales** ✏️. **Reportes** ✏️.
4. No importa desde Excel, no ve el registro de acciones ni las custodias; operación, flota, pólizas y tripulación son 👁.

## 4 · Piloto de la empresa
1. **Inicio** → sus indicadores. **Programación** → ve sus misiones.
2. **Despacho** → elija su misión → verificaciones y listas → *Despachar* → al aterrizar *Cerrar vuelo*. Puede importar el log del control; no registra vuelos a mano.
3. **Tiempos de servicio** → iniciar/cerrar su período.
4. **Capacitación** → *Presentar examen*; ve su cumplimiento.
5. **SMS → Reportar un suceso** (VOR/MOR), con evidencias; ve solo sus reportes. Lee manuales y marca «He leído esta versión».
6. **Perfil** → datos, documentos (cédula, licencia, certificado médico), foto.
7. No ve tripulación, componentes ni Organización; flota, mantenimiento y listas son 👁.

## 5 · Piloto independiente (Gerente General + plan «piloto» + único integrante)
1. Registro «solo»: crea su propia empresa y entra directo.
2. **Flota** → *Nueva aeronave* y *Nueva batería*. **Programación** → *Nueva misión* para sí mismo. **Despacho** → despachar y cerrar.
3. **Bitácora** → importar logs DJI o registrar manual. **Mantenimiento**, **Tiempos de servicio**, **Meteorología**.
4. **Suscripción** → plan y pago (Wompi). Contactos de emergencia en Organización.
5. No tiene SMS, capacitación, proveedores, manuales, reportes, importación ni registro de acciones. Si suma un segundo integrante o paga un plan mayor, pasa a comportarse como empresa.

## 6 · Socio (escuela o asesor) — `bitafly.com/socio`
1. Pestaña **Panel**: sus códigos de venta (ej. `QATESTSOCIO01`), cupos y resumen.
2. **REGALAR**: escriba un correo → se entrega un perfil gratuito (90 días) con enlace de registro; se puede anular (🗑).
3. **INVITAR** (dueño de escuela): agrega asesores.
4. **Reportes**: perfiles regalados/activos, clientes referidos, comisiones. **Perfil**: logo y cuenta.

## 7 · Superadmin (solo BitaFly) — `/admin/*`
Requiere segundo factor. Administra organizaciones y planes, socios y comisiones, regalos, cuentas y versiones de la app Android. Los demás roles que entran a `/admin/*` son devueltos a Inicio.

## 8 · Flujo extremo a extremo (cómo se conecta todo)
Programación (Gerente/Jefe crea la misión) → Despacho (Piloto despacha) → Cierre de vuelo → Bitácora + horas de aeronave y batería + tiempo de servicio → Mantenimiento se vence por horas → si ocurre un suceso: Reporte público o desde SMS → Caso (Gerente SMS) → Acción correctiva → Reporte mensual a Aerocivil. Todo queda en el Registro de acciones y puede congelarse con una Custodia legal.
