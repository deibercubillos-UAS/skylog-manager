'use client';
export default function TeamSettings({ profile }) {
  const roles = [
    { id: 'jefe_pilotos', name: 'Jefe de Pilotos', desc: 'Control operacional de flota y personal.' },
    { id: 'gerente_sms', name: 'Gerente de SMS', desc: 'Responsable de Riesgos y Seguridad.' },
    { id: 'piloto', name: 'Piloto Estándar', desc: 'Registro de vuelos y pre-vuelo.' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Gestión de Equipo (Roles)</h3>
      <p className="text-xs text-slate-500 mb-6">Asigna responsabilidades específicas según la normativa RAC 100.</p>
      
      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.id} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between group hover:border-[#ec5b13]/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-white flex items-center justify-center text-[#ec5b13] shadow-sm">
                <span className="material-symbols-outlined">{role.id === 'gerente_sms' ? 'shield' : 'person'}</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{role.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{role.desc}</p>
              </div>
            </div>
            <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#ec5b13] hover:text-white transition-all shadow-sm">
              Asignar Usuario
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}