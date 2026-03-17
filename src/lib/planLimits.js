export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    allowedRoles: ['piloto'], // Solo el dueño
    maxDrones: 1,
    maxPilots: 1,
  },
  escuadrilla: {
    name: 'Plan Escuadrilla',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 15,
    maxPilots: 7,
  },
  flota: {
    name: 'Plan Flota',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 999,
    maxPilots: 20,
  },
  enterprise: {
    name: 'Plan Enterprise',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto', 'mantenimiento'],
    maxDrones: 999,
    maxPilots: 999,
  }
};

// Función para verificar permisos por rol
export const hasPermission = (role, action) => {
  const permissions = {
    admin: ['all'],
    jefe_pilotos: ['manage_fleet', 'manage_pilots', 'view_logbook', 'approve_flights'],
    gerente_sms: ['view_logbook', 'manage_sora', 'manage_checklist', 'view_incidents'],
    piloto: ['register_flight', 'view_my_flights']
  };
  
  const userPerms = permissions[role] || [];
  return userPerms.includes('all') || userPerms.includes(action);
};