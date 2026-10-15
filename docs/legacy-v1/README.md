# Archivo de la v1

`CLAUDE-v1.md` es la guía del proyecto cuando BitaFly era la v1 (Next 14, ePayco, tablas `profiles` y `organization_members`).
Se conserva solo como referencia histórica del comportamiento de la v1 y de las decisiones que se tomaron entonces.
**No describe el código actual.** La guía vigente es el `CLAUDE.md` de la raíz y `docs/skylog-v2/`.

`dji-parser/` es la herramienta de línea de comandos de la v1 para leer logs DJI y sincronizar desde el control por USB. Ya no se usa: la importación actual es `src/lib/djiParser.js` + `POST /api/logbook/import-dji`.
