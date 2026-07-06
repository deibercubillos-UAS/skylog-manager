import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ProgramacionActivaClient from './ProgramacionActivaClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function ProgramacionActivaPage() {
  const supabase = await createClient();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) redirect('/login');

  if (!['superadmin', 'admin', 'jefe_pilotos'].includes(ctx.role)) redirect('/dashboard');

  return <ProgramacionActivaClient />;
}
