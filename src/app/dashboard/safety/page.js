'use client';
import Link from 'next/link';

export default function SafetyPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in duration-700">
            {/* ICONO INDUSTRIAL */}
            <div className="relative mb-8">
                <div className="size-24 bg-orange-100 rounded-[2.5rem] flex items-center justify-center text-orange-600 shadow-lg shadow-orange-500/10">
                    <span className="material-symbols-outlined text-6xl">engineering</span>
                </div>
                <div className="absolute -bottom-2 -right-2 size-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white border-4 border-[#f8f6f6]">
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                </div>
            </div>

            {/* TEXTO DE ESTADO */}
            <div className="max-w-md space-y-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-tight">
                    Seguridad Operacional <br/>
                    <span className="text-orange-600">en Desarrollo</span>
                </h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed uppercase tracking-widest text-xs">
                    Estamos construyendo el motor de gestión de riesgos (SMS) más potente del mercado. <br/>
                    <span className="font-black">Próximas capacidades:</span>
                </p>
                
                {/* LISTA DE FUNCIONES FUTURAS */}
                <div className="grid grid-cols-1 gap-2 pt-6">
                    <FeatureTag icon="analytics" text="Análisis de Riesgos SORA" />
                    <FeatureTag icon="report_problem" text="Reporte de Incidentes SMS" />
                    <FeatureTag icon="radar" text="Mapas de Restricción de Vuelo" />
                </div>
            </div>

            <Link href="/dashboard" className="mt-12 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all active:scale-95">
                Volver al Centro de Mando
            </Link>
        </div>
    );
}

function FeatureTag({ icon, text }) {
    return (
        <div className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm opacity-60">
            <span className="material-symbols-outlined text-orange-500 text-base">{icon}</span>
            <span className="text-xs font-black text-slate-700 uppercase">{text}</span>
        </div>
    );
}