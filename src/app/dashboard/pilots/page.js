import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import PilotsClient from './PilotsClient';

export const dynamic = 'force-dynamic';

// Skeleton de la tabla mientras se hace fetch a pilots (cubre el LCP)
function TableSkeleton({ orgName, canManage }) {
  return (
    <>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy uppercase tracking-tighter">
            Tripulación: {orgName}
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase">Cargando miembros...</p>
        </div>
        {canManage && (
          <div className="h-12 w-44 bg-slate-100 rounded-xl animate-pulse" />
        )}
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-14 bg-gray-50 border-b border-gray-100" />
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-white" />
          ))}
        </div>
      </div>
    </>
  );
}

// Componente async que sí espera por los pilots (corre en paralelo al header)
async function PilotsTable({ orgId, orgName, userRole }) {
  const supabase = createClient();

  const { data: pilots } = await supabase
    .from('pilots')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  const initialData = {
    pilots:
      pilots?.map((p) => ({
        ...p,
        full_name: p.name,
        role: p.position || 'Piloto',
      })) || [],
    organization: { company_name: orgName },
    userRole,
    organizationId: orgId,
  };

  return <PilotsClient initialData={initialData} />;
}

export default async function PilotsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // OPTIMIZACIÓN 1: una sola query trae perfil + organización (antes eran 2 round trips)
  const { data: prof } = await supabase
    .from('profiles')
    .select('organization_id, role, organizations(company_name)')
    .eq('id', user.id)
    .single();

  if (!prof?.organization_id) redirect('/login');

  const orgName = prof.organizations?.company_name || 'Bitafly Corp';
  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(prof.role);

  // OPTIMIZACIÓN 3: el shell (con el H1) sale al cliente INMEDIATAMENTE.
  // La tabla se streamea cuando esté lista vía Suspense → mejora LCP drásticamente.
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={<TableSkeleton orgName={orgName} canManage={canManage} />}>
        <PilotsTable
          orgId={prof.organization_id}
          orgName={orgName}
          userRole={prof.role}
        />
      </Suspense>
    </div>
  );
}
