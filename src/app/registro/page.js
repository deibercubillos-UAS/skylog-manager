'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', password: '', phone: '', city: '',
        type: 'solo', role: 'piloto', orgCode: '', companyName: ''
    });

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        const result = await res.json();
        if (result.success) {
            alert("🚀 Registro exitoso. Por favor verifica tu correo.");
            window.location.href = '/login';
        } else {
            alert("⚠️ " + result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center p-6 font-display">
            <main className="max-w-xl w-full bg-white p-10 rounded-[3rem] shadow-2xl text-left border border-slate-100">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Unirse a BitaFly</h2>
                <p className="text-slate-400 text-sm mb-8 font-bold uppercase tracking-widest">Paso {step} de 2</p>

                <form onSubmit={handleRegister} className="space-y-5">
                    {step === 1 ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <input required placeholder="Nombre" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, firstName: e.target.value})} />
                                <input required placeholder="Apellido" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, lastName: e.target.value})} />
                            </div>
                            <input required type="email" placeholder="Correo corporativo" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, email: e.target.value})} />
                            <input required type="password" placeholder="Contraseña segura" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, password: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input required placeholder="Teléfono" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, phone: e.target.value})} />
                                <input required placeholder="Ciudad" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <button type="button" onClick={() => setStep(2)} className="w-full bg-[#ec5b13] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Siguiente</button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setForm({...form, type: 'solo', role: 'admin'})} className={`flex-1 p-4 rounded-2xl border-2 transition-all ${form.type === 'solo' ? 'border-[#ec5b13] bg-orange-50 text-[#ec5b13]' : 'border-slate-100'}`}>
                                    <p className="font-black uppercase text-xs">Piloto Solo</p>
                                    <p className="text-[10px] opacity-60">Soy independiente</p>
                                </button>
                                <button type="button" onClick={() => setForm({...form, type: 'company', role: 'piloto'})} className={`flex-1 p-4 rounded-2xl border-2 transition-all ${form.type === 'company' ? 'border-[#ec5b13] bg-orange-50 text-[#ec5b13]' : 'border-slate-100'}`}>
                                    <p className="font-black uppercase text-xs">Empresa</p>
                                    <p className="text-[10px] opacity-60">Trabajo para una organización</p>
                                </button>
                            </div>

                            {form.type === 'company' ? (
                                <div className="space-y-4">
                                    <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, role: e.target.value})}>
                                        <option value="admin">Gerente General (Crea Empresa)</option>
                                        <option value="gerente_sms">Gerente SMS (Seguridad)</option>
                                        <option value="jefe_pilotos">Jefe de Pilotos (Operaciones)</option>
                                        <option value="piloto">Piloto Estándar (Vuelos)</option>
                                    </select>
                                    
                                    {form.role === 'admin' ? (
                                        <input required placeholder="Nombre de la Empresa" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, companyName: e.target.value})} />
                                    ) : (
                                        <input required placeholder="ID de Empresa (Código)" className="w-full p-4 bg-white border-2 border-orange-200 rounded-2xl font-black text-center text-[#ec5b13] uppercase" onChange={e => setForm({...form, orgCode: e.target.value})} />
                                    )}
                                    <p className="text-[10px] text-slate-400 italic">Nota: SMS y Jefe de Pilotos son cargos de responsabilidad única.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-50 rounded-2xl text-blue-700 text-xs font-medium">
                                    Se creará un perfil de Piloto Independiente bajo el Plan Piloto gratuito. Podrás migrar a empresa luego.
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 text-slate-400 font-black uppercase text-xs">Atrás</button>
                                <button disabled={loading} type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">
                                    {loading ? 'Validando...' : 'Finalizar Registro'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
}
