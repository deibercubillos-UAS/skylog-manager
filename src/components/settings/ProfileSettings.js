'use client';

export default function ProfileSettings({ profile, setProfile }) {
  // Definimos los roles permitidos en la interfaz
  const operationalRoles = [
    { id: 'piloto', name: 'Piloto' },
    { id: 'jefe_pilotos', name: 'Jefe de Pilotos' },
    { id: 'gerente_sms', name: 'Gerente de SMS' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">
        Información del Usuario
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campo Nombre Completo */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
            Nombre Completo
          </label>
          <input 
            type="text" 
            value={profile.full_name || ''} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
            onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
          />
        </div>

        {/* Campo Cargo Operativo (Lista Desplegable) */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
            Cargo Operativo
          </label>
          <div className="relative">
            <select 
              value={profile.role || 'piloto'} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20 appearance-none cursor-pointer"
              onChange={(e) => setProfile({...profile, role: e.target.value})}
              // Si es admin, desactivamos el cambio para cumplir con la regla de seguridad
              disabled={profile.role === 'admin'}
            >
              {/* Opción oculta si es Admin (solo modificable desde Supabase) */}
              {profile.role === 'admin' && (
                <option value="admin">Administrador (Solo Lectura)</option>
              )}
              
              {/* Roles seleccionables */}
              {operationalRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            
            {/* Icono de flecha para el select */}
            {profile.role !== 'admin' && (
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                expand_more
              </span>
            )}
          </div>
          
          {profile.role === 'admin' ? (
            <p className="text-[9px] text-blue-500 font-bold uppercase mt-2 ml-1 tracking-tighter">
              ℹ️ Tu nivel de acceso actual es restringido por el sistema.
            </p>
          ) : (
            <p className="text-[9px] text-slate-400 font-medium mt-2 ml-1">
              Selecciona tu rol para ajustar tus permisos en la plataforma.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}