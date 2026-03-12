export default function Register() {
  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col lg:flex-row">
      <section className="hidden lg:flex lg:w-5/12 bg-[#1A202C] p-12 flex-col justify-between text-white">
        <div>
          <h2 className="text-3xl font-bold text-[#ec5b13] mb-6">SkyLog</h2>
          <h1 className="text-4xl font-bold leading-tight">Vuela con total tranquilidad legal.</h1>
        </div>
        <p className="italic text-slate-400">"La mejor herramienta para cumplir con la RAC 100."</p>
      </section>
      <section className="flex-1 p-8 lg:p-20 flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-6">Crea tu cuenta de operador</h2>
        <form className="space-y-4">
          <input className="w-full p-3 border rounded-lg" placeholder="Nombre completo" type="text" />
          <input className="w-full p-3 border rounded-lg" placeholder="Correo" type="email" />
          <button className="w-full py-4 bg-[#ec5b13] text-white font-bold rounded-lg">Iniciar prueba gratuita</button>
        </form>
      </section>
    </div>
  );
}