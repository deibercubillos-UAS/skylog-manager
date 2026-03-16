'use client';
export default function NotificationSettings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Alertas del Sistema</h3>
      <div className="space-y-4">
        <ToggleItem label="Avisos de Mantenimiento" desc="Recibir correo 5 horas antes del vencimiento." checked={true} />
        <ToggleItem label="Vencimiento de Licencias" desc="Alertar 30 días antes del vencimiento médico." checked={true} />
        <ToggleItem label="Reportes Mensuales" desc="Notificar cuando la bitácora esté lista para descargar." checked={false} />
      </div>
    </div>
  );
}

function ToggleItem({ label, desc, checked }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="text-left">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-500 uppercase font-medium">{desc}</p>
      </div>
      <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#ec5b13]' : 'bg-slate-300'}`}>
        <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${checked ? 'right-1' : 'left-1'}`}></div>
      </div>
    </div>
  );
}