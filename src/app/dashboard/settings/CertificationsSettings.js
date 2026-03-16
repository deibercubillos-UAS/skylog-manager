'use client';
export default function CertificationsSettings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Certificados Aeronáuticos</h3>
      <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">verified_user</span>
        <p className="text-xs font-bold text-slate-500 uppercase">Carga aquí tu resolución de explotación comercial</p>
        <button className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all">SUBIR PDF / IMAGEN</button>
      </div>
    </div>
  );
}