import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PilotsClient from './PilotsClient';

export const dynamic = 'force-dynamic';

export default async function PilotsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: currentUser } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!currentUser?.organization_id) redirect('/onboarding');

  // PARALELISMO: Traemos a TODOS los miembros de la empresa (sin filtrar solo por 'Piloto')
  // para que no desaparezcan los que ya estaban registrados.
  const [pilotsReq, orgReq] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, license_number, medical_expiry, phone, email')
      .eq('organization_id', currentUser.organization_id)
      .order('full_name', { ascending: true }),
    supabase
      .from('organizations')
      .select('company_name')
      .eq('id', currentUser.organization_id)
      .single()
  ]);

  const initialData = {
    pilots: pilotsReq.data || [],
    organization: orgReq.data || {},
    userRole: currentUser.role,
    organizationId: currentUser.organization_id
  };

  return <PilotsClient initialData={initialData} />;
}