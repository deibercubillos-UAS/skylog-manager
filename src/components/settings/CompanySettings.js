'use client';

export default function CompanySettings({ profile, setProfile }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">
        Identidad del Operador
      </h3>
      
      <div className="space-y-6">
        {/* Razón Social */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
            Razón Social / Empresa
          </label>
          <input 
            type="text" 
            value={profile.company_name || ''} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
            placeholder="Ej: AeroTech Solutions S.A.S"
            onChange={(e) => setProfile({...profile, company_name: e.target.value})} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ID de Operador */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
              ID de Operador (DAN / Registro)
            </label>
            <input 
              type="text" 
              value={profile.operator_id || ''} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
              placeholder="CO-OP-XXXX"
              onChange={(e) => setProfile({...profile, operator_id: e.target.value})} 
            />
          </div>

          {/* PREFIJO DE VUELO (NUEVO CAMPO SOLICITADO) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
              Prefijo de Vuelo (Iniciales)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#ec5b13] text-lg">
                label_important
              </span>
              <input 
                type="text" 
                maxLength="4"
                value={profile.flight_prefix || ''} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-black font-mono uppercase outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="EJ: SKY"
                onChange={(e) => setProfile({...profile, flight_prefix: e.target.value.toUpperCase()})} 
              />
            </div>
            <p className="text-[9px] text-slate-400 font-medium mt-2 ml-1 uppercase">
              Estas iniciales se usarán para generar tus IDs de vuelo (ej: {profile.flight_prefix || 'SKL'}-0001).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}