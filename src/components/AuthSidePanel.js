'use client';
import Link from 'next/link';

export default function AuthSidePanel({ title }) {
  return (
    <section className="hidden lg:flex lg:w-5/12 bg-[#1A202C] p-12 flex-col justify-between relative overflow-hidden text-left">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(236, 91, 19, 0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-3 mb-12 group">
          <div className="size-12 flex items-center justify-center">
            <img src="/logo.png" alt="BitaFly" className="h-full w-auto" />
          </div>
          <span className="text-white text-3xl font-black tracking-tighter group-hover:text-[#ec5b13] transition-colors">BitaFly</span>
        </Link>
        <h1 className="text-white text-4xl font-black leading-tight mb-8">{title}</h1>
        {/* ... el resto de la lista de beneficios se mantiene igual ... */}
      </div>
      {/* ... testimonial inferior se mantiene igual ... */}
    </section>
  );
}