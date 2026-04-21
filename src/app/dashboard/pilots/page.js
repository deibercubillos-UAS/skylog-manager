import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ExportActions from '@/components/dashboard/ExportActions';

export const dynamic = 'force-dynamic';

export default async function PilotsPage() {
  const supabase = createClient();

  // MOTOR NUEVO: Carga ultra rápida
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: currentUser } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!currentUser?.organization_id) redirect('/onboarding');

  // PARALELISMO: Traemos todo en una sola ráfaga de red
  const [pilotsReq, orgReq, statsReq] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, license_number, medical_expiry, phone, email')
      .eq('organization_id', currentUser.organization_id)
      .order('full_name', { ascending: true }),
    supabase
      .from('organizations')
      .select('company_name, flight_prefix')
      .eq('id', currentUser.organization_id)
      .single(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', currentUser.organization_id)
      .eq('role', 'Piloto')
  ]);

  const pilots = pilotsReq.data || [];
  const organization = orgReq.data || {};
  const totalPilots = statsReq.count || 0;
  const canManage = ['Gerente General', 'Jefe de Pilotos'].includes(currentUser.role);

  // --- TU FRONTEND ORIGINAL (Commit 5d87505) ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Tripulación: {organization.company_name}
          </h1>
          <p className="text-gray-500 text-sm">
            {totalPilots} pilotos activos registrados
          </p>
        </div>

        <div className="flex gap-3">
          {/* Mantenemos el botón de exportar optimizado */}
          <ExportActions data={pilots} reportName={`Pilotos-${organization.company_name}`} />
          
          {canManage && (
            <button className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Registrar Piloto
            </button>
          )}
        </div>
      </header>

      {/* Aquí restauramos tu tabla con el estilo exacto que tenías */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Piloto</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Licencia</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Contacto</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-500 font-bold">Estado Médico</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-navy">{pilot.full_name}</div>
                    <div className="text-xs text-gray-400 uppercase">{pilot.role}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {pilot.license_number || '---'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{pilot.email}</div>
                    <div className="text-xs text-gray-400">{pilot.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Restauramos tu lógica de colores para el médico */}
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        new Date(pilot.medical_expiry) < new Date() 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {pilot.medical_expiry ? pilot.medical_expiry : 'SIN FECHA'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-primary">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}