// Datos SINTÉTICOS con la forma real de v1 y las trampas que la auditoría encontró (32-migracion.md §3-§4). Sirven para
// ensayar el ETL sin tocar producción: ningún dato real. `node scripts/etl/fixtures/synthetic-v1.mjs <carpeta>` los escribe.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Hash bcrypt real de la contraseña «Migrada1234» (costo 10, generado con pgcrypto), para probar que el ingreso funciona tras importar el hash.
export const SAMPLE_HASH = '$2a$10$CuHLPFm2IGn/yYEav2JZnOtGGxr17f.sKrg6Fw8RVVFpUZVBOLo7G';

export function syntheticV1() {
  const orgA = U(1), orgB = U(2), orgC = U(3);
  const uAdmin = U(10), uJefe = U(11), uPilotoMulti = U(12), uSoloPerfil = U(13), uGoogle = U(14);
  const aircraft1 = U(20), aircraft2 = U(21), aircraft3 = U(22), aircraft4 = U(23);
  const pAdmin = U(30), pJefe = U(31), pMultiA = U(32), pMultiB = U(33), pSinCuenta = U(34), pDup1 = U(35), pDup2 = U(36), pInactivo = U(37);

  return {
    organizations: [
      { id: orgA, company_name: 'Aerofoto SAS', tax_id: '900.111.222-3', address: 'Bogotá', operator_email: 'Info@Aerofoto.co', dan_number: 'DAN-1', operator_number: 'OP-9', registration_expiry: '2027-02-01', slug: 'aerofoto', created_at: '2025-03-01T00:00:00Z', authorized_operations: ['Fotogrametría'] },
      { id: orgB, company_name: 'Agro Drones', tax_id: '900333444-5', slug: 'agro', created_at: '2025-04-01T00:00:00Z' },
      { id: orgC, company_name: 'Piloto: Solo Perfil', tax_id: null, slug: 'solo', created_at: '2025-05-01T00:00:00Z' },
    ],
    auth_users: [
      { id: uAdmin, email: 'Admin@Aerofoto.co', encrypted_password: SAMPLE_HASH, email_confirmed_at: '2025-03-01T00:00:00Z' },
      { id: uJefe, email: 'jefe@aerofoto.co', encrypted_password: SAMPLE_HASH, email_confirmed_at: '2025-03-02T00:00:00Z' },
      { id: uPilotoMulti, email: 'multi@correo.co', encrypted_password: SAMPLE_HASH, email_confirmed_at: '2025-03-03T00:00:00Z' },
      { id: uSoloPerfil, email: 'solo@correo.co', encrypted_password: SAMPLE_HASH, email_confirmed_at: '2025-05-01T00:00:00Z' },
      { id: uGoogle, email: 'google@correo.co', encrypted_password: null, email_confirmed_at: '2025-06-01T00:00:00Z' },
    ],
    profiles: [
      { id: uAdmin, full_name: 'Gina Gerente', email: 'admin@aerofoto.co', phone: '3001', created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z' },
      { id: uJefe, full_name: 'Jorge Jefe', email: 'jefe@aerofoto.co', medical_expiry: '2027-05-01', license_number: 'L-1', created_at: '2025-03-02T00:00:00Z', updated_at: '2025-03-02T00:00:00Z' },
      { id: uPilotoMulti, full_name: 'Marta Multi', email: 'multi@correo.co', created_at: '2025-03-03T00:00:00Z', updated_at: '2025-03-03T00:00:00Z' },
      { id: uSoloPerfil, full_name: 'Solo Perfil', email: 'solo@correo.co', created_at: '2025-05-01T00:00:00Z', updated_at: '2025-05-01T00:00:00Z' },
      { id: uGoogle, full_name: '', first_name: 'Gabo', last_name: 'Google', email: 'google@correo.co', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
    ],
    pilots: [
      { id: pAdmin, owner_id: uAdmin, name: 'Gina G.', organization_id: orgA, profile_id: uAdmin, pilot_role: 'Gerente General', is_active: true, created_at: '2025-03-01T00:00:00Z', aerocivil_additions: ['BVLOS', 'ACROBACIA'] },
      { id: pJefe, owner_id: uAdmin, name: 'Jorge Jefe', organization_id: orgA, profile_id: uJefe, pilot_role: 'Jefe de Pilotos', medical_expiry: '2026-11-15', license_number: 'L-2', updated_at: '2025-09-01T00:00:00Z', created_at: '2025-03-02T00:00:00Z', is_active: true },
      { id: pMultiA, owner_id: uAdmin, name: 'Marta Multi', organization_id: orgA, profile_id: uPilotoMulti, pilot_role: 'Piloto', is_active: true, created_at: '2025-03-03T00:00:00Z' },
      { id: pMultiB, owner_id: uAdmin, name: 'Marta Multi', organization_id: orgB, profile_id: uPilotoMulti, pilot_role: 'Piloto', is_active: true, created_at: '2025-04-03T00:00:00Z' },
      { id: pSinCuenta, owner_id: uAdmin, name: 'Invitado Sin Cuenta', organization_id: orgA, email: 'invitado@correo.co', pilot_role: 'Piloto', is_active: true, created_at: '2025-06-01T00:00:00Z', id_type: 'CC', id_number: '555' },
      { id: pDup1, owner_id: uAdmin, name: 'Duplicado Uno', organization_id: orgA, email: 'dup@correo.co', id_type: 'CC', id_number: '111', pilot_role: 'Piloto', is_active: true, created_at: '2025-06-01T00:00:00Z' },
      { id: pDup2, owner_id: uAdmin, name: 'Duplicado Dos', organization_id: orgB, email: 'dup@correo.co', id_type: 'CC', id_number: '222', pilot_role: 'Piloto', is_active: true, created_at: '2025-06-01T00:00:00Z' },
      { id: pInactivo, owner_id: uAdmin, name: 'Piloto Retirado', organization_id: orgA, pilot_role: 'Piloto', is_active: false, deactivated_at: '2025-08-01T00:00:00Z', created_at: '2025-03-10T00:00:00Z' },
    ],
    organization_members: [
      { id: U(40), user_id: uAdmin, organization_id: orgA, role: 'admin', subscription_plan: 'escuadrilla', subscription_expires_at: '2026-08-01T03:00:00Z', epayco_subscription_id: 'sub_1', is_active: true, joined_at: '2025-03-01T00:00:00Z' },
      { id: U(41), user_id: uJefe, organization_id: orgA, role: 'jefe_pilotos', subscription_plan: 'piloto', is_active: true, joined_at: '2025-03-02T00:00:00Z' },
      { id: U(42), user_id: uPilotoMulti, organization_id: orgA, role: 'piloto', subscription_plan: 'piloto', is_active: true, joined_at: '2025-03-03T00:00:00Z' },
      { id: U(43), user_id: uPilotoMulti, organization_id: orgB, role: 'piloto', subscription_plan: 'piloto', is_active: true, joined_at: '2025-04-03T00:00:00Z' },
      { id: U(44), user_id: uSoloPerfil, organization_id: orgC, role: 'admin', subscription_plan: 'piloto', subscription_expires_at: '2026-12-01T12:00:00Z', is_active: true, joined_at: '2025-05-01T00:00:00Z' },
      { id: U(45), user_id: uGoogle, organization_id: orgB, role: 'admin', subscription_plan: 'enterprise', is_active: true, joined_at: '2025-06-01T00:00:00Z' },
    ],
    aircraft: [
      { id: aircraft1, owner_id: uAdmin, organization_id: orgA, brand: 'DJI', model: 'Mavic 3 Enterprise', serial_number: 'SN-001', total_hours: 1.5, operational_status: 'disponible', ruas: 'RUAS-1', mtow: 1.05, created_at: '2025-03-05T00:00:00Z', image_url: 'https://old/img1.jpg' },
      { id: aircraft2, owner_id: uAdmin, organization_id: orgA, brand: '', model: 'Matrice 30', serial_number: 'SN-002', total_hours: 0, operational_status: 'en_mantenimiento', created_at: '2025-03-06T00:00:00Z' },
      { id: aircraft3, owner_id: uAdmin, organization_id: orgB, brand: '', model: 'Modelo Rarísimo', serial_number: null, total_hours: 3, operational_status: 'disponible', created_at: '2025-04-06T00:00:00Z' },
      { id: aircraft4, owner_id: uAdmin, organization_id: orgA, brand: 'DJI', model: 'Mavic 3 Enterprise', serial_number: 'sn-001', total_hours: 0, operational_status: 'disponible', baja_date: '2025-09-01', created_at: '2025-03-07T00:00:00Z' },
    ],
    batteries: [
      { id: U(50), organization_id: orgA, serial_number: 'B-1', brand: 'DJI', model: 'TB65', cycles: 12, health_status: 95, status: 'Operativo', created_at: '2025-03-05T00:00:00Z' },
      { id: U(51), organization_id: orgA, serial_number: 'B-2', cycles: 80, health_status: 40, status: 'Baja', created_at: '2025-03-05T00:00:00Z' },
      { id: U(52), organization_id: orgA, serial_number: 'b-1', cycles: 1, health_status: 100, status: 'Operativo' },
    ],
    aircraft_components: [
      { id: U(60), organization_id: orgA, aircraft_id: aircraft1, component_type: 'Hélices', name: 'Hélices 9453', serial: null, installed_at: '2025-03-05T00:00:00Z', installed_at_aircraft_hours: 0, status: 'activo', created_at: '2025-03-05T00:00:00Z' },
      { id: U(61), organization_id: orgA, aircraft_id: U(99), component_type: 'ESC', installed_at: '2025-03-05T00:00:00Z', installed_at_aircraft_hours: 0, status: 'activo', created_at: '2025-03-05T00:00:00Z' },
    ],
    flight_authorizations: [
      { id: U(70), organization_id: orgA, pilot_id: pJefe, aircraft_id: aircraft1, location: 'Madrid', scheduled_at: '2026-03-10T05:00:00Z', status: 'realizado', mission_id: 'MS-1', line_of_sight: 'VLOS', plan_data: { op_name: 'Torre', altitude: 80 }, aerocivil_auth_number: 'AC-77' },
      { id: U(71), organization_id: orgA, pilot_id: null, aircraft_id: aircraft1, location: 'Funza', scheduled_at: '2026-04-10T05:00:00Z', status: 'cancelado', cancellation_notes: 'lluvia' },
    ],
    flights: [
      { id: U(80), organization_id: orgA, pilot_id: pJefe, aircraft_id: aircraft1, flight_date: '2026-03-10', takeoff_time: '08:00:00', landing_time: '08:30:00', total_time: 0.5, line_of_sight: 'VLOS', visual_condition: 'VMC', imported: true, auth_id: U(70), mission_id: 'MS-1', location: 'Madrid', created_at: '2026-03-10T14:00:00Z' },
      { id: U(81), organization_id: orgA, pilot_id: pJefe, aircraft_id: aircraft1, flight_date: '2026-03-11', takeoff_time: '23:30:00', landing_time: '00:15:00', total_time: 0.75, imported: false },
      { id: U(82), organization_id: orgA, pilot_id: null, aircraft_id: aircraft1, flight_date: '2026-03-12', takeoff_time: '10:00:00', landing_time: '10:15:00', total_time: 0.25 },
      { id: U(83), organization_id: orgA, pilot_id: pJefe, aircraft_id: aircraft1, flight_date: '2026-03-13', takeoff_time: '10:00:00', landing_time: '10:00:00', total_time: 0 },
      { id: U(84), organization_id: orgA, pilot_id: pJefe, aircraft_id: aircraft1, flight_date: '2026-03-10', takeoff_time: '08:00:00', landing_time: '08:30:00', total_time: 0.5 },
      { id: U(85), organization_id: orgA, pilot_id: pMultiA, aircraft_id: U(98), flight_date: '2026-03-14', takeoff_time: '09:00:00', landing_time: '09:30:00', total_time: 0.5 },
    ],
    insurance_policies: [
      { id: U(90), organization_id: orgA, insurance_company: 'Seguros S.A.', policy_number: 'P-1', start_date: '2026-01-01', end_date: '2026-12-31', aircraft_id: null },
    ],
    partners: [
      { id: U(100), type: 'escuela', name: 'Escuela Aérea', status: 'activo', commission_pct: 20, free_seats_limit: 5, free_seats_used: 1, free_days: 90, created_at: '2025-07-01T00:00:00Z' },
    ],
    partner_codes: [{ id: U(101), partner_id: U(100), code: 'EAC-XB12', active: true }],
    partner_members: [{ id: U(102), partner_id: U(100), profile_id: uAdmin, role: 'owner' }],
    free_grants: [
      { id: U(103), partner_id: U(100), advisor_member_id: U(102), email: 'Regalo@Correo.co', status: 'enviado', token: 'tok-1', granted_at: '2026-09-01T00:00:00Z', expires_at: '2026-12-01T00:00:00Z', purge_after: '2027-03-01T00:00:00Z', plan: 'piloto' },
    ],
    app_releases: [{ id: U(110), version_name: '1.1.0', version_code: 2, apk_url: 'https://releases/x.apk', is_current: true }],
    colombia_geo: [{ id: U(120), 'Código Municipio': '25430', 'Nombre Departamento': 'Cundinamarca', 'Nombre Municipio': 'Madrid' }],
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const dir = process.argv[2];
  if (!dir) { console.error('Uso: node scripts/etl/fixtures/synthetic-v1.mjs <carpeta>'); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, rows] of Object.entries(syntheticV1())) fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(rows, null, 2));
  console.log(`Datos sintéticos escritos en ${dir}`);
}
