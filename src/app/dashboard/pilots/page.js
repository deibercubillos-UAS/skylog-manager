import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ExportActions from '@/components/dashboard/ExportActions'; // Asegúrate de haber creado el Paso 5


export default async function PilotsPage() {
  const supabase = createClient();

  // 1. OBTENER SESIÓN (Operación rápida)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. OBTENER CONTEXTO DEL USUARIO (Org y Rol)
  // Solo pedimos 2 columnas: reduce la carga de la base de datos drásticamente
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!currentUser?.organization_id) redirect('/onboarding');

  // --- PASO 2: PARALELISMO TOTAL (Optimización de latencia) ---
  // Ejecutamos todas las consultas al mismo tiempo
  const [pilotsReq, orgReq, statsReq] = await Promise.all([
    // A. Lista de Pilotos: Seleccionamos campos específicos (NO select *)
    supabase
      .from('profiles')
      .select('id, full_name, role, license_number, medical_expiry, phone, email')
      .eq('organization_id', currentUser.organization_id)
      .order('full_name', { ascending: true }),

    // B. Datos de la Empresa
    supabase
      .from('organizations')
      .select('company_name, flight_prefix')
      .eq('id', currentUser.organization_id)
      .single(),

    // C. Conteo rápido para el Dashboard
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', currentUser.organization_id)
      .eq('role', 'Piloto')
  ]);

  const pilots = pilotsReq.data || [];
  const organization = orgReq.data || {};
  const totalPilots = statsReq.count || 0;

  // Lógica de Roles: ¿Puede agregar pilotos?
  const canManage = ['Gerente General', 'Jefe de Pilotos'].includes(currentUser.role);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER DINÁMICO */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Tripulación: {organization.company_name}
          </h1>
          <p className="text-gray-500 text-sm">
            {totalPilots} pilotos activos bajo el prefijo {organization.flight_prefix || 'N/A'}
          </p>
        </div>

        <div className="flex gap-3">
          {/* PASO 5: Exportación optimizada */}
          <ExportActions data={pilots} reportName={`Pilotos-${organization.company_name}`} />
          
          {canManage && (
            <button className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Registrar Piloto
            </button>
          )}
        </div>
      </header>

      {/* TABLA DE TRIPULACIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Piloto</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Licencia</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Contacto</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Estado Médico</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-navy">{pilot.full_name}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-tighter">{pilot.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {pilot.license_number || '---'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{pilot.email}</div>
                    <div className="text-xs text-gray-400">{pilot.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <MedicalStatus date={pilot.medical_expiry} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {pilots.length === 0 && (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-200">group_off</span>
            <p className="mt-2 text-gray-400">No se encontraron tripulantes registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Interno para Estado Médico (Optimización de UI)
function MedicalStatus({ date }) {
  if (!date) return <span className="text-gray-300 text-xs">No registrado</span>;

  const expiryDate = new Date(date);
  const today = new Date();
  const isExpired = expiryDate < today;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isExpired ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500'}`}></span>
      {isExpired ? 'VENCIDO' : 'VIGENTE'} ({date})
    </div>
  );
}