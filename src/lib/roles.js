// =====================================================
// FUENTE DE VERDAD DE ROLES (frontend)
// =====================================================
// Los valores de rol en DB son snake_case: admin, gerente_sms, etc.
// El frontend muestra labels legibles.

export const ROLE_LABELS = {
    superadmin: 'SuperAdmin',
    admin: 'Gerente General',
    gerente_sms: 'Gerente SMS',
    jefe_pilotos: 'Jefe de Pilotos',
    piloto: 'Piloto'
};

export const ROLE_DESCRIPTIONS = {
    superadmin: 'Acceso total a la plataforma y al Master.',
    admin: 'Dueño del negocio y representante legal.',
    gerente_sms: 'Gestión de seguridad y cumplimiento.',
    jefe_pilotos: 'Responsable operativo y de programación.',
    piloto: 'Operador de campo.'
};

// Matriz de permisos — fuente única para UI
export const PERMISSIONS = {
    canManageOps:       ['superadmin', 'admin', 'jefe_pilotos'],
    canViewAudit:       ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewFinance:     ['superadmin', 'admin', 'gerente_sms'],
    canChangeRoles:     ['superadmin', 'admin'],
    canCloseAnyFlight:  ['superadmin', 'jefe_pilotos'],
    canEditOrg:         ['superadmin', 'admin'],
    canManageInsurance: ['superadmin', 'admin'],
    canFly:             ['superadmin', 'admin', 'jefe_pilotos', 'piloto'],
    canAccessMaster:    ['superadmin']
};

// Helper: ¿el usuario tiene un permiso?
export function hasPermission(role, permKey) {
    if (!role) return false;
    return PERMISSIONS[permKey]?.includes(role) || false;
}

// Helper: label legible para un rol
export function labelForRole(role) {
    return ROLE_LABELS[role] || role || 'Sin rol';
}

// Lista de roles asignables por un Gerente General (no puede promover a superadmin)
export const ASSIGNABLE_ROLES = ['admin', 'gerente_sms', 'jefe_pilotos', 'piloto'];