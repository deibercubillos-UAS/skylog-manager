'use client';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function LoginPage() {
  const features = [
    { icon: 'history', text: 'Accede a tu historial de vuelos' },
    { icon: 'analytics', text: 'Estadísticas de operación' },
    { icon: 'task_alt', text: 'Próximas inspecciones' }
  ];

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Bienvenido de nuevo, Capitán." features={features} />

      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center">
        <div className="max-w-md w-full mx-auto text-left">
          <div className="hidden lg:flex justify-end mb-8">
            <p className="text-sm text-slate-600">¿No tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/registro">Regístrate</Link></p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingreso a SkyLog</h2>
          </div>

          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium mb-6">
            {/* SVG de Google aquí (el mismo de arriba) */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">...</svg>
            Continuar con Google
          </button>

          <form className="space-y-5">
            <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg" placeholder="Correo" type="email" />
            <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg" placeholder="Contraseña" type="password" />
            <button className="w-full py-4 bg-[#ec5b13] text-white font-bold rounded-lg shadow-lg">Entrar</button>
          </form>
        </div>
      </section>
    </main>
  );
}