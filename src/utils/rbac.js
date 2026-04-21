// src/utils/rbac.js
export async function validateRole(supabase, allowedRoles) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!allowedRoles.includes(profile.role)) {
    throw new Error("No autorizado");
  }
  
  return profile;
}