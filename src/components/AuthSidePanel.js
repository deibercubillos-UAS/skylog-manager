export default function AuthSidePanel({ title, features }) {
  return (
    <section className="hidden lg:flex lg:w-5/12 bg-[#1A202C] p-12 flex-col justify-between relative overflow-hidden">
      {/* Patrón de puntos de fondo */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(236, 91, 19, 0.2) 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
      
      <div className="relative z-10">
        {/* LOGO EXTRAÍDO DEL HTML */}
        <div className="flex items-center gap-2 mb-12">
          <div className="size-8 text-[#ec5b13]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">SkyLog</span>
        </div>

        <h1 className="text-white text-4xl font-bold leading-tight mb-8">{title}</h1>

        <ul className="space-y-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-4 text-white/90 text-left">
              <span className="material-symbols-outlined text-[#ec5b13] bg-[#ec5b13]/10 p-2 rounded-lg">{f.icon}</span>
              <span className="text-lg">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Testimonial inferior */}
      <div className="relative z-10 bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-left">
        <div className="flex items-center gap-4 mb-3">
          <div className="size-12 rounded-full bg-cover bg-center border-2 border-[#ec5b13]" 
               style={{backgroundImage: "url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200')"}}></div>
          <div>
            <p className="text-white font-bold text-sm">Capitán UAS</p>
            <p className="text-white/60 text-xs">Piloto Certificado RPAS</p>
          </div>
        </div>
        <p className="text-white/90 italic text-sm leading-relaxed text-left">
          "La mejor herramienta para cumplir con la RAC 100 sin complicaciones."
        </p>
      </div>
    </section>
  );
}