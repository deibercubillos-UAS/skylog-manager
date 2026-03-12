export default function PricingPage() {
  return (
    <div className="bg-white min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-black text-[#1A202C] mb-4">Planes de Suscripción</h1>
        <p className="text-slate-600 mb-12">Elige el plan ideal para tu operación aeronáutica.</p>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Plan Básico */}
          <div className="p-8 border rounded-2xl hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">Plan Piloto</h3>
            <div className="text-4xl font-black mb-6">$0<span className="text-sm text-slate-400">/mes</span></div>
            <ul className="text-left space-y-4 mb-8 text-sm text-slate-600">
              <li className="flex gap-2"><span className="material-symbols-outlined text-green-500">check</span> 1 Drone & 1 Piloto</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-green-500">check</span> Bitácora Digital Básica</li>
            </ul>
            <button className="w-full py-3 border-2 border-[#ec5b13] text-[#ec5b13] font-bold rounded-xl">Empezar Gratis</button>
          </div>

          {/* Plan Pro */}
          <div className="p-8 border-2 border-[#ec5b13] rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ec5b13] text-white px-4 py-1 rounded-full text-xs font-bold">RECOMENDADO</div>
            <h3 className="text-xl font-bold mb-2">Operador Pro</h3>
            <div className="text-4xl font-black text-[#ec5b13] mb-6">$29<span className="text-sm text-slate-400">/mes</span></div>
            <ul className="text-left space-y-4 mb-8 text-sm text-slate-600">
              <li className="flex gap-2"><span className="material-symbols-outlined text-[#ec5b13]">verified</span> Vuelos Ilimitados</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[#ec5b13]">verified</span> Análisis SORA Pro</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[#ec5b13]">verified</span> Reportes PDF Aerocivil</li>
            </ul>
            <button className="w-full py-3 bg-[#ec5b13] text-white font-bold rounded-xl">Probar 14 días gratis</button>
          </div>

          {/* Plan Enterprise */}
          <div className="p-8 border rounded-2xl hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <div className="text-4xl font-black mb-6">Custom</div>
            <ul className="text-left space-y-4 mb-8 text-sm text-slate-600">
              <li className="flex gap-2"><span className="material-symbols-outlined text-blue-500">check</span> Drones Ilimitados</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-blue-500">check</span> Gestión de Roles y API</li>
            </ul>
            <button className="w-full py-3 bg-[#1A202C] text-white font-bold rounded-xl">Contactar Ventas</button>
          </div>
        </div>
      </div>
    </div>
  );
}