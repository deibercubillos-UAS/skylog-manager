export default function SoraWizard() {
  return (
    <div className="max-w-4xl mx-auto p-10 bg-white min-h-screen shadow-xl my-10 rounded-2xl">
      <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">Análisis de Riesgo SORA</h1>
      <p className="text-slate-500 mb-10 border-b pb-6">Metodología JARUS para la evaluación de riesgos operacionales.</p>
      
      <div className="space-y-10">
        {/* Step 1 */}
        <section>
          <label className="block text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">1. Riesgo en Tierra (GRC)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-6 border-2 border-[#ec5b13] rounded-xl text-center bg-orange-50">
              <span className="material-symbols-outlined text-3xl text-[#ec5b13]">location_city</span>
              <p className="font-bold mt-2">Área Poblada</p>
            </button>
            <button className="p-6 border border-slate-200 rounded-xl text-center hover:border-[#ec5b13]">
              <span className="material-symbols-outlined text-3xl text-slate-400">landscape</span>
              <p className="font-bold mt-2 text-slate-600">Área Rural</p>
            </button>
            <button className="p-6 border border-slate-200 rounded-xl text-center hover:border-[#ec5b13]">
              <span className="material-symbols-outlined text-3xl text-slate-400">groups</span>
              <p className="font-bold mt-2 text-slate-600">Reunión Personas</p>
            </button>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <label className="block text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">2. Dimensión del Dron</label>
          <select className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold">
            <option>Menor a 1 metro</option>
            <option>Entre 1 y 3 metros</option>
            <option>Mayor a 3 metros</option>
          </select>
        </section>

        {/* Result Area */}
        <div className="bg-[#1A202C] text-white p-8 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-[#ec5b13] uppercase mb-1">Resultado SAIL Proyectado</p>
            <p className="text-4xl font-black">NIVEL II</p>
          </div>
          <button className="bg-[#ec5b13] px-8 py-3 rounded-xl font-black hover:bg-orange-600 transition-all">
            GENERAR PDF SORA
          </button>
        </div>
      </div>
    </div>
  );
}