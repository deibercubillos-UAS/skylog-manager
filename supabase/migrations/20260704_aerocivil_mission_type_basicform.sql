-- Corrección de la migración 20260704_aerocivil_monthly_report.sql: esa migración
-- solo remapeó las 9 categorías que usaba el despacho de piloto independiente
-- (logbook/new/page.js). BasicForm.js (Programación) tenía su PROPIA lista de 17
-- categorías de estilo RAC 100, independiente y nunca sincronizada con la anterior
-- — flight_authorizations.mission_type (y flights.mission_type cuando se copia vía
-- auto-match de importación DJI) puede contener cualquiera de las 17. Se remapean
-- también a las 10 categorías oficiales de AeroCivil (misma fuente única
-- src/lib/missionTypes.js).
--
-- Aproximaciones documentadas (sin equivalente 1-a-1 exacto):
--   - 'ASPERSIÓN / DISPERSIÓN AGRÍCOLA' → 'Aspersión' (mismo criterio que
--     'Agricultura de precisión' en la migración anterior).
--   - 'BÚSQUEDA Y RESCATE (SAR)' y 'APOYO A EMERGENCIAS' → categoría de apoyo a
--     calamidad/emergencia.
--   - 'PRUEBA Y DESARROLLO (I+D)' → 'Instrucción' (vuelo no comercial, más cercano
--     a entrenamiento/práctica que a una operación de captura de datos).
--   - 'BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL' y 'OPERACIÓN NOCTURNA': estos dos
--     valores en realidad describían línea de vista / condición de vuelo, no un
--     tipo de operación — se fusionaron por error en la lista vieja de
--     BasicForm.js. Van a la categoría genérica de captura de datos; de aquí en
--     adelante esa información vive en los campos reales line_of_sight y
--     visual_condition, no en mission_type.
--   - 'OTRA OPERACIÓN ESPECIAL' → categoría genérica de captura de datos (mismo
--     criterio que 'Otro'/'Recreativo' en la migración anterior).
update public.flight_authorizations set mission_type = case mission_type
  when 'SIMPLE CAPTURA DE IMÁGENES O DATOS'        then 'Captura imágenes/datos'
  when 'FOTOGRAMETRÍA Y MAPEO'                     then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE INFRAESTRUCTURA'             then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE LÍNEAS ELÉCTRICAS'           then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE OLEODUCTOS / GASODUCTOS'     then 'Captura imágenes/datos'
  when 'VIGILANCIA Y SEGURIDAD PRIVADA'            then 'Captura imágenes/datos - Vigilancia y seguridad'
  when 'ASPERSIÓN / DISPERSIÓN AGRÍCOLA'           then 'Aspersión'
  when 'TRANSPORTE DE CARGA (DRONE DELIVERY)'      then 'Drone Delivery'
  when 'BÚSQUEDA Y RESCATE (SAR)'                  then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'APOYO A EMERGENCIAS'                       then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'INSTRUCCIÓN Y ENTRENAMIENTO'               then 'Instrucción'
  when 'PRUEBA Y DESARROLLO (I+D)'                 then 'Instrucción'
  when 'FILMACIÓN Y PRODUCCIÓN AUDIOVISUAL'        then 'Captura imágenes/datos - Medios de comunicación'
  when 'BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL'       then 'Captura imágenes/datos'
  when 'OPERACIÓN NOCTURNA'                        then 'Captura imágenes/datos'
  when 'ENJAMBRE / SWARM'                          then 'Enjambre'
  when 'OTRA OPERACIÓN ESPECIAL'                   then 'Captura imágenes/datos'
  else mission_type
end
where mission_type in (
  'SIMPLE CAPTURA DE IMÁGENES O DATOS','FOTOGRAMETRÍA Y MAPEO','INSPECCIÓN DE INFRAESTRUCTURA',
  'INSPECCIÓN DE LÍNEAS ELÉCTRICAS','INSPECCIÓN DE OLEODUCTOS / GASODUCTOS','VIGILANCIA Y SEGURIDAD PRIVADA',
  'ASPERSIÓN / DISPERSIÓN AGRÍCOLA','TRANSPORTE DE CARGA (DRONE DELIVERY)','BÚSQUEDA Y RESCATE (SAR)',
  'APOYO A EMERGENCIAS','INSTRUCCIÓN Y ENTRENAMIENTO','PRUEBA Y DESARROLLO (I+D)',
  'FILMACIÓN Y PRODUCCIÓN AUDIOVISUAL','BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL','OPERACIÓN NOCTURNA',
  'ENJAMBRE / SWARM','OTRA OPERACIÓN ESPECIAL'
);

-- flights.mission_type puede haber heredado alguno de estos 17 valores vía el
-- auto-match de importación DJI (import-dji copia mission_type de la autorización
-- coincidente al vuelo).
update public.flights set mission_type = case mission_type
  when 'SIMPLE CAPTURA DE IMÁGENES O DATOS'        then 'Captura imágenes/datos'
  when 'FOTOGRAMETRÍA Y MAPEO'                     then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE INFRAESTRUCTURA'             then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE LÍNEAS ELÉCTRICAS'           then 'Captura imágenes/datos'
  when 'INSPECCIÓN DE OLEODUCTOS / GASODUCTOS'     then 'Captura imágenes/datos'
  when 'VIGILANCIA Y SEGURIDAD PRIVADA'            then 'Captura imágenes/datos - Vigilancia y seguridad'
  when 'ASPERSIÓN / DISPERSIÓN AGRÍCOLA'           then 'Aspersión'
  when 'TRANSPORTE DE CARGA (DRONE DELIVERY)'      then 'Drone Delivery'
  when 'BÚSQUEDA Y RESCATE (SAR)'                  then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'APOYO A EMERGENCIAS'                        then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'INSTRUCCIÓN Y ENTRENAMIENTO'               then 'Instrucción'
  when 'PRUEBA Y DESARROLLO (I+D)'                 then 'Instrucción'
  when 'FILMACIÓN Y PRODUCCIÓN AUDIOVISUAL'        then 'Captura imágenes/datos - Medios de comunicación'
  when 'BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL'       then 'Captura imágenes/datos'
  when 'OPERACIÓN NOCTURNA'                        then 'Captura imágenes/datos'
  when 'ENJAMBRE / SWARM'                          then 'Enjambre'
  when 'OTRA OPERACIÓN ESPECIAL'                   then 'Captura imágenes/datos'
  else mission_type
end
where mission_type in (
  'SIMPLE CAPTURA DE IMÁGENES O DATOS','FOTOGRAMETRÍA Y MAPEO','INSPECCIÓN DE INFRAESTRUCTURA',
  'INSPECCIÓN DE LÍNEAS ELÉCTRICAS','INSPECCIÓN DE OLEODUCTOS / GASODUCTOS','VIGILANCIA Y SEGURIDAD PRIVADA',
  'ASPERSIÓN / DISPERSIÓN AGRÍCOLA','TRANSPORTE DE CARGA (DRONE DELIVERY)','BÚSQUEDA Y RESCATE (SAR)',
  'APOYO A EMERGENCIAS','INSTRUCCIÓN Y ENTRENAMIENTO','PRUEBA Y DESARROLLO (I+D)',
  'FILMACIÓN Y PRODUCCIÓN AUDIOVISUAL','BVLOS — MÁS ALLÁ DE LA LÍNEA VISUAL','OPERACIÓN NOCTURNA',
  'ENJAMBRE / SWARM','OTRA OPERACIÓN ESPECIAL'
);
