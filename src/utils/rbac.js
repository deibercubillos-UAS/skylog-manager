// src/utils/rbac.js
export async function validateRole(supabase, allowedRoles) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Perfil no encontrado");

  if (!allowedRoles.includes(profile.role)) {
    throw new Error("No autorizado");
  }

  return profile;
}