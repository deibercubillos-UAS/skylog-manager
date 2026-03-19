'use client';
import { useState } from 'react';

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });

  const sendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) alert("Mensaje enviado con éxito");
    setLoading(false);
  };

  return (
    <section id="contacto" className="py-24 bg-white text-left">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16">
        <div className="space-y-6">
          <h2 className="text-4xl font-black uppercase text-[#1A202C]">Hablemos de tu <span className="text-[#ec5b13]">Flota</span></h2>
          <p className="text-slate-500">Nuestro equipo técnico está listo para asistirte en la implementación.</p>
        </div>
        <form onSubmit={sendEmail} className="bg-[#1A202C] p-10 rounded-[3rem] shadow-2xl space-y-4">
          <input required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="Nombre" onChange={e => setForm({...form, name: e.target.value})} />
          <input required type="email" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="Correo Corporativo" onChange={e => setForm({...form, email: e.target.value})} />
          <textarea required rows="4" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="¿Cómo podemos ayudarte?" onChange={e => setForm({...form, message: e.target.value})}></textarea>
          <button className="w-full bg-[#ec5b13] py-5 rounded-2xl font-black text-white uppercase text-xs tracking-widest shadow-xl">
            {loading ? "Enviando..." : "Enviar Consulta"}
          </button>
        </form>
      </div>
    </section>
  );
}