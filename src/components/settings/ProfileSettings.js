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
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Nombre Completo
          </label>
          <input 
            type="text" 
            value={profile.full_name || ''} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
            onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
          />
        </div>

        {/* Campo Cargo Operativo — solo lectura, asignado por el administrador */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Cargo Operativo
          </label>
          <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 select-none cursor-default">
            {operationalRoles.find(r => r.id === profile.role)?.name
              || (profile.role === 'admin' || profile.role === 'superadmin' ? 'Administrador' : profile.role || 'Piloto')}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-2 ml-1">
            El cargo es asignado por tu administrador. Contacta al soporte para cambiarlo.
          </p>
        </div>
      </div>
    </div>
  );
}