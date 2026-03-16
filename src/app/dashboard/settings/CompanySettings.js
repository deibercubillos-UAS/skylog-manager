'use client';
export default function CompanySettings({ profile, setProfile }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Datos del Operador</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Razón Social / Empresa</label>
          <input type="text" value={profile.company_name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" onChange={(e) => setProfile({...profile, company_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">ID de Operador (DAN / Registro Aerocivil)</label>
          <input type="text" value={profile.operator_id || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none" placeholder="CO-OP-XXXX" onChange={(e) => setProfile({...profile, operator_id: e.target.value})} />
        </div>
      </div>
    </div>
  );
}