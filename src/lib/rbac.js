// src/lib/rbac.js
import { createClient } from '@/lib/supabaseServer';

export async function validateRole(allowedRoles) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!allowedRoles.includes(profile.role)) {
    throw new Error("Acceso no autorizado para este rol operativo.");
  }

  return { user, profile };
}