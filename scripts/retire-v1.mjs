// Retira el código de v1 listado en scripts/retire-v1.manifest.txt (C2 de docs/skylog-v2/60-auditoria-codigo.md).
// Por defecto solo MUESTRA lo que borraría; con --apply borra los archivos y los directorios que queden vacíos.
// Todo está versionado en git (commit 65fead28 o posterior): `git checkout -- <ruta>` lo recupera.
import fs from 'node:fs';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const list = fs.readFileSync(new URL('./retire-v1.manifest.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
let removed = 0;
for (const rel of list) {
  if (!rel.startsWith('src/')) throw new Error(`Ruta fuera de src/: ${rel}`);
  if (!fs.existsSync(rel)) continue;
  if (apply) fs.unlinkSync(rel);
  removed += 1;
}
let dirs = 0;
if (apply) {
  const sweep = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) sweep(path.join(dir, e.name));
    if (dir !== 'src' && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dirs += 1; }
  };
  sweep('src');
}
console.log(apply ? `Borrados ${removed} archivos y ${dirs} directorios vacíos.` : `Ensayo: se borrarían ${removed} archivos (usa --apply).`);
