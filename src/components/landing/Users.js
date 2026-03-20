'use client';
import { useState, useEffect } from 'react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const res = await fetch('/api/testimonials');
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    }
    loadUsers();
  }, []);

  return (
    <section className="py-24 bg-white dark:bg-[#1A202C] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado con Stats Reales */}
        <div className="grid lg:grid-cols-2 gap-12 items-end mb-20">
          <div>
            <h2 className="text-4xl font-black text-[#1A202C] dark:text-white uppercase tracking-tighter leading-none mb-4">
              Confiado por los <span className="text-[#ec5b13]">Expertos.</span>
            </h2>
            <p className="text-slate-500 font-medium max-w-md">
              Más de 500 operadores certificados en Latinoamérica confían sus datos de vuelo a nuestra infraestructura segura.
            </p>
          </div>
          <div className="flex gap-8 border-l border-slate-100 dark:border-white/5 pl-8">
             <div><p className="text-3xl font-black text-[#1A202C] dark:text-white leading-none">15k+</p><p className="text-[10px] font-black uppercase text-slate-400 mt-2">Vuelos Registrados</p></div>
             <div><p className="text-3xl font-black text-[#ec5b13] leading-none">100%</p><p className="text-[10px] font-black uppercase text-slate-400 mt-2">Cumplimiento RAC</p></div>
          </div>
        </div>

        {/* Grid de Testimonios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] animate-pulse"></div>)
          ) : (
            users.map(user => (
              <div key={user.id} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col justify-between hover:shadow-xl transition-all group">
                <div>
                  <span className="material-symbols-outlined text-4xl text-[#ec5b13]/20 group-hover:text-[#ec5b13] transition-colors mb-6">format_quote</span>
                  <p className="text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed mb-8">
                    "{user.content}"
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <img src={user.avatar} alt={user.name} className="size-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                  <div>
                    <p className="text-sm font-black text-[#1A202C] dark:text-white uppercase tracking-tight">{user.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role} en <span className="text-[#ec5b13]">{user.company}</span></p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}