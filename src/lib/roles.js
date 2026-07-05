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

// Matriz de permisos — fuente única para UI y API routes
export const PERMISSIONS = {
    // Existentes
    canManageOps:       ['superadmin', 'admin', 'jefe_pilotos', 'piloto'],
    canViewAudit:       ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewFinance:     ['superadmin', 'admin', 'gerente_sms'],
    canChangeRoles:     ['superadmin', 'admin'],
    canCloseAnyFlight:  ['superadmin', 'jefe_pilotos'],
    canEditOrg:         ['superadmin', 'admin'],
    canManageInsurance: ['superadmin', 'admin'],
    canFly:             ['superadmin', 'admin', 'jefe_pilotos', 'piloto'],
    canAccessMaster:    ['superadmin'],
    // Nuevas — reemplazan arrays inline en API routes y páginas
    // Piloto (dentro de org) es solo-lectura en flota. El Piloto Independiente
    // tiene role='admin', así que conserva la gestión completa.
    canManageFleet:          ['superadmin', 'admin', 'jefe_pilotos'],
    canEditPilotPic:         ['superadmin', 'admin', 'jefe_pilotos'],
    canEditLogbook:          ['superadmin', 'jefe_pilotos'],
    canDeleteLogbook:        ['superadmin', 'jefe_pilotos'],
    canManageAircraftStatus: ['superadmin', 'admin'],
    canImportFlights:        ['superadmin', 'admin', 'jefe_pilotos'],
    canManageAerocivil: ['superadmin', 'admin', 'jefe_pilotos'],
    canManageSMS:       ['superadmin', 'admin', 'gerente_sms'],
    canViewSMS:         ['superadmin', 'admin', 'gerente_sms'],
    canManageSafetyConfig: ['superadmin', 'admin', 'gerente_sms'],
    canViewFlightReplay:   ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    // Manuales de la empresa — gestión solo GG+GSMS+JP; lectura/descarga todos.
    canManageManuals:   ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewManuals:     ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'],
    // Anuncios en la campana — los publican GG/GSMS/JP (+ superadmin)
    canSendAnnouncements: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    // Checklist de Inventario de Operación — lo crean/editan GG+GSMS+JP; lo ve
    // (y lo diligencia en Despacho) cualquier rol que despache, incluido piloto.
    canManageInventoryChecklist: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewInventoryChecklist:   ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'],
    // Capacitación (programas + evaluaciones internas) — mismo split que Manuales:
    // gestión GG+GSMS+JP; lectura/consulta todos.
    canManageTraining: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewTraining:   ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'],
    // Proveedores (listado + checklist de auditoría) — módulo de back-office/
    // cumplimiento, sin nivel de solo-lectura para piloto (a diferencia de
    // Manuales/Capacitación, que sí lo incluyen).
    canManageSuppliers: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    // Mantenimiento Menor — checklist periódico que diligencia el piloto. Mismo
    // split que Inventario: GG+GSMS+JP configuran el checklist; cualquiera que
    // despache (incluido piloto) lo ve y lo diligencia.
    canManageMinorMaintenanceChecklist: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],
    canViewMinorMaintenanceChecklist:   ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'],
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