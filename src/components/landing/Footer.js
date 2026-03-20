'use client';

export default function Footer() {
  return (
    <footer className="bg-[#1A202C] text-white py-12 text-center border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
             <img src="/logo.png" className="size-10 object-contain" alt="BitaFly" />
             <span className="text-xl font-black uppercase tracking-tighter">BitaFly Manager</span>
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">© 2024 BitaFly UAS Manager - Aviation Systems</p>
          <div className="flex gap-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
             <span>RAC Compliant</span>
             <span>SORA Methodology</span>
             <span>ISO 27001 Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}