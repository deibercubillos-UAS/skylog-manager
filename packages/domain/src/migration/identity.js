// migration/identity — `profiles` + `pilots` → `people` (docs/skylog-v2/32-migracion.md §3). Lógica pura y con tests:
// unir dos humanos distintos es peor que dejar un duplicado, así que ante la duda NO se une y se reporta.
import { PILOT_ADDITIONS } from '../pilotQualifications.js';

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
const lower = (v) => clean(v).toLowerCase();
const ts = (row) => Date.parse(row?.updated_at || row?.created_at || 0) || 0;
const docKey = (row) => {
  const type = lower(row?.id_type);
  const number = clean(row?.id_number).replace(/[\s.\-]/g, '').toLowerCase();
  return number ? `${type}:${number}` : '';
};

class UnionFind {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(i) { while (this.p[i] !== i) { this.p[i] = this.p[this.p[i]]; i = this.p[i]; } return i; }
  union(a, b) { this.p[this.find(a)] = this.find(b); }
}

/** Adiciones de la licencia: solo las del catálogo; lo demás se devuelve aparte (se lista, no se descarta). */
export function normalizeAdditions(raw) {
  let list = raw;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = []; } }
  if (!Array.isArray(list)) return { known: [], unknown: [] };
  const known = [];
  const unknown = [];
  for (const item of list) {
    const text = clean(typeof item === 'string' ? item : item?.name).toUpperCase();
    if (!text) continue;
    const match = PILOT_ADDITIONS.find((a) => a.toUpperCase() === text);
    if (match) { if (!known.includes(match)) known.push(match); } else unknown.push(text);
  }
  return { known, unknown };
}

/**
 * @param {{profiles: object[], pilots: object[]}} input
 * @returns {{ people: object[], pilotToPerson: Map<string,number>, profileToPerson: Map<string,number>, report: object[], conflicts: object[] }}
 *   `people[i]` = { key, full_name, email, phone, document_type, document_number, license_number, medical_cert_expiry,
 *   emergency_contact_name, emergency_contact_phone, profileIds[], pilotIds[], additions[], unknownAdditions[], avatarSource, created_at }
 */
export function mergePeople({ profiles = [], pilots = [] }) {
  const nodes = [
    ...profiles.map((row) => ({ kind: 'profile', row })),
    ...pilots.map((row) => ({ kind: 'pilot', row })),
  ];
  const uf = new UnionFind(nodes.length);
  const profileIndex = new Map(profiles.map((p, i) => [p.id, i]));
  const conflicts = [];

  // 1) Enlace explícito pilots.profile_id → profiles.id.
  pilots.forEach((pilot, i) => {
    const target = pilot.profile_id ? profileIndex.get(pilot.profile_id) : undefined;
    if (target !== undefined) uf.union(profiles.length + i, target);
  });

  // 2) Sin enlace: correo o documento, salvo que el otro dato contradiga.
  const emailOf = (n) => lower(n.row.email);
  const docOf = (n) => docKey(n.row);
  const linked = (n, idx) => n.kind === 'pilot' && n.row.profile_id && profileIndex.has(n.row.profile_id) && uf.find(idx) === uf.find(profileIndex.get(n.row.profile_id));
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      if (uf.find(a) === uf.find(b)) continue;
      if (linked(nodes[a], a) && linked(nodes[b], b)) continue;
      const ea = emailOf(nodes[a]), eb = emailOf(nodes[b]);
      const da = docOf(nodes[a]), db = docOf(nodes[b]);
      const sameEmail = ea && ea === eb;
      const sameDoc = da && da === db;
      if (!sameEmail && !sameDoc) continue;
      const emailDiffers = ea && eb && ea !== eb;
      const docDiffers = da && db && da !== db;
      if ((sameEmail && docDiffers) || (sameDoc && emailDiffers)) {
        conflicts.push({ a: nodes[a].row.id, b: nodes[b].row.id, reason: sameEmail ? 'mismo correo, documento distinto' : 'mismo documento, correo distinto' });
        continue;
      }
      uf.union(a, b);
    }
  }

  const groups = new Map();
  nodes.forEach((n, i) => { const r = uf.find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(n); });

  const people = [];
  const pilotToPerson = new Map();
  const profileToPerson = new Map();
  const report = [];

  for (const members of groups.values()) {
    const profs = members.filter((m) => m.kind === 'profile').map((m) => m.row);
    const pils = members.filter((m) => m.kind === 'pilot').map((m) => m.row);
    const rows = [...profs, ...pils];
    const idx = people.length;
    const label = clean(profs[0]?.full_name) || clean(pils[0]?.name) || rows[0].id;

    const pick = (field, candidates, rule) => {
      const filled = candidates.filter((r) => clean(r[field]));
      if (!filled.length) return null;
      const winner = [...filled].sort((x, y) => ts(y) - ts(x))[0];
      const discarded = [...new Set(filled.filter((r) => clean(r[field]) !== clean(winner[field])).map((r) => clean(r[field])))];
      if (discarded.length) report.push({ person: label, field, winner: clean(winner[field]), discarded: discarded.join(' | '), rule });
      return clean(winner[field]);
    };

    // Nombre: el perfil (lo escribe la propia persona); si no, nombre+apellido; si no, el del piloto.
    let full_name = clean(profs.find((p) => clean(p.full_name))?.full_name);
    if (!full_name) full_name = clean(profs.map((p) => `${clean(p.first_name)} ${clean(p.last_name)}`.trim()).find(Boolean));
    if (!full_name) full_name = clean([...pils].sort((x, y) => Date.parse(x.created_at || 0) - Date.parse(y.created_at || 0))[0]?.name);
    if (!full_name) full_name = 'Sin nombre (migrado)';

    // Vencimiento médico: la fecha MÁS TEMPRANA (criterio conservador); la otra queda descartada y se confirma en V2.
    const dates = [...new Set(rows.map((r) => clean(r.medical_expiry).slice(0, 10)).filter(Boolean))].sort();
    if (dates.length > 1) report.push({ person: label, field: 'medical_cert_expiry', winner: dates[0], discarded: dates.slice(1).join(' | '), rule: 'la más temprana (criterio de seguridad) — CONFIRMAR A MANO', manual: true });

    // Documento: lo carga la organización (pilots) y gana sobre profiles.
    const docRows = [...pils].filter((p) => clean(p.id_number)).sort((x, y) => ts(y) - ts(x));
    const document_number = docRows.length ? clean(docRows[0].id_number) : null;
    const document_type = docRows.length ? clean(docRows[0].id_type) || null : null;

    // Adiciones: unión de todas las filas de piloto.
    const additions = [];
    const unknownAdditions = [];
    for (const p of pils) {
      const n = normalizeAdditions(p.aerocivil_additions);
      n.known.forEach((a) => !additions.includes(a) && additions.push(a));
      n.unknown.forEach((a) => !unknownAdditions.includes(a) && unknownAdditions.push(a));
    }

    const person = {
      key: idx,
      full_name,
      email: pick('email', rows, 'más reciente no vacío')?.toLowerCase() || null,
      phone: pick('phone', rows, 'más reciente no vacío'),
      document_type: document_number ? document_type : null,
      document_number,
      license_number: pick('license_number', rows, 'más reciente no vacío'),
      medical_cert_expiry: dates[0] || null,
      emergency_contact_name: pick('emergency_contact_name', rows, 'más reciente no vacío'),
      emergency_contact_phone: pick('emergency_contact_phone', rows, 'más reciente no vacío'),
      avatarSource: clean([...rows].sort((x, y) => ts(y) - ts(x)).find((r) => clean(r.avatar_url))?.avatar_url) || null,
      additions,
      unknownAdditions,
      profileIds: profs.map((p) => p.id),
      pilotIds: pils.map((p) => p.id),
      created_at: rows.map((r) => r.created_at).filter(Boolean).sort()[0] || null,
    };
    people.push(person);
    profs.forEach((p) => profileToPerson.set(p.id, idx));
    pils.forEach((p) => pilotToPerson.set(p.id, idx));
  }

  return { people, pilotToPerson, profileToPerson, report, conflicts };
}
