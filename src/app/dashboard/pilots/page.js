import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PilotsClient from './PilotsClient';

export const dynamic = 'force-dynamic';

export default async function PilotsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  const orgId = prof?.organization_id;

  // TRAEMOS DE LA TABLA 'pilots' (Donde están tus datos antiguos)
  const [pilotsReq, orgReq] = await Promise.all([
    supabase
      .from('pilots') // <--- CAMBIO A TU TABLA DE PILOTOS REAL
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true }),
    supabase
      .from('organizations')
      .select('company_name')
      .eq('id', orgId)
      .single()
  ]);

  const initialData = {
    // Mapeamos 'name' porque en tu tabla 'pilots' no se llama 'full_name'
    pilots: pilotsReq.data?.map(p => ({
        ...p,
        full_name: p.name, 
        role: p.position || 'Piloto'
    })) || [],
    organization: orgReq.data || { company_name: 'Bitafly Corp' },
    userRole: prof?.role,
    organizationId: orgId
  };

  return <PilotsClient initialData={initialData} />;
}