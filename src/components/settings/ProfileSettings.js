'use client';
export default function ProfileSettings({ profile, setProfile }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Información del Usuario</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nombre Completo</label>
          <input type="text" value={profile.full_name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Cargo Operativo</label>
          <input type="text" value={profile.role || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" onChange={(e) => setProfile({...profile, role: e.target.value})} />
        </div>
      </div>
    </div>
  );
}