'use client';
import { useState } from 'react';

const EMPTY = { name: '', email: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const sendEmail = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm(EMPTY);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contacto" className="py-24 bg-white text-left">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16">
        <div className="space-y-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Contacto</p>
          <h2 className="text-4xl font-black uppercase text-navy leading-tight">
            Hablemos de tu <span className="text-primary">Flota</span>
          </h2>
          <p className="text-slate-500 leading-relaxed">
            Nuestro equipo técnico está listo para asistirte en la implementación y resolver
            cualquier duda sobre la RAC 100.
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            {['Respuesta en menos de 24 horas', 'Soporte en español', 'Migración de datos sin costo'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#1A202C] p-10 rounded-[3rem] shadow-2xl">
          {status === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
              <span className="material-symbols-outlined text-6xl text-primary">mark_email_read</span>
              <h3 className="text-xl font-black text-white uppercase">¡Mensaje enviado!</h3>
              <p className="text-sm text-slate-400">Te responderemos en menos de 24 horas.</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 text-xs font-black text-primary uppercase tracking-widest hover:underline"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={sendEmail} className="space-y-4">
              <input
                required
                value={form.name}
                onChange={set('name')}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none placeholder:text-slate-500 focus:border-primary transition-colors"
                placeholder="Nombre"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={set('email')}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none placeholder:text-slate-500 focus:border-primary transition-colors"
                placeholder="Correo Corporativo"
              />
              <textarea
                required
                rows="4"
                value={form.message}
                onChange={set('message')}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none placeholder:text-slate-500 focus:border-primary transition-colors resize-none"
                placeholder="¿Cómo podemos ayudarte?"
              />

              {status === 'error' && (
                <p className="text-red-400 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Error al enviar. Intenta de nuevo.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-primary py-5 rounded-2xl font-black text-white uppercase text-xs tracking-widest shadow-xl hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : 'Enviar Consulta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
