'use client';
import Link from 'next/link';
import AuthSidePanel from '@/components/AuthSidePanel';

export default function RegisterPage() {
  const features = [
    { icon: 'verified', text: '14 días de acceso total PRO' },
    { icon: 'picture_as_pdf', text: 'Generación de reportes PDF' },
    { icon: 'shield_with_heart', text: 'Análisis SORA ilimitado' },
    { icon: 'credit_card_off', text: 'Sin tarjeta de crédito' }
  ];

  return (
    <main className="flex min-h-screen flex-col lg:flex-row bg-[#f8f6f6]">
      <AuthSidePanel title="Estás a un paso de volar con total tranquilidad legal." features={features} />

      <section className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-20 justify-center">
        <div className="max-w-md w-full mx-auto text-left">
          <div className="hidden lg:flex justify-end mb-8">
            <p className="text-sm text-slate-600">¿Ya tienes cuenta? <Link className="text-[#ec5b13] font-bold ml-1 hover:underline" href="/login">Log in</Link></p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Crea tu cuenta de operador</h2>
            <p className="text-slate-500">Comienza a gestionar tus drones hoy mismo.</p>
          </div>

          {/* BOTÓN DE GOOGLE EXTRAÍDO DEL HTML */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 transition-all mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative bg-[#f8f6f6] px-4 text-xs uppercase text-slate-400 font-bold">O regístrate con tu correo</span>
          </div>

          <form className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
              <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#ec5b13]/20 outline-none" placeholder="Juan Pérez" type="text" />
            </div>
            {/* ... Resto de campos iguales ... */}
            <button className="w-full py-4 bg-[#ec5b13] text-white font-bold rounded-lg shadow-lg shadow-[#ec5b13]/20">Iniciar mi prueba gratuita</button>
          </form>
        </div>
      </section>
    </main>
  );
}