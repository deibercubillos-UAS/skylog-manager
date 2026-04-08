'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function MasterPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState(null);

    const loadData = async () => {
        const res = await fetch('/api/admin/master');
        const data = await res.json();
        if (!data.error) setUsers(data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async () => {
        const res = await fetch('/api/admin/master', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                targetUserId: edit.id, 
                updateData: { 
                    subscription_plan: edit.subscription_plan, 
                    role: edit.role,
                    last_payment_date: edit.last_payment_date,
                    company_name: edit.company_name,
                    full_name: edit.full_name
                } 
            })
        });
        if (res.ok) {
            setEdit(null);
            loadData();
        }
    };

    const getRoleBadge = (role) => {
        const roles = {
            superadmin: 'bg-purple-600',
            admin: 'bg-blue-600',
            gerente_sms: 'bg-emerald-600',
            jefe_pilotos: 'bg-orange-600',
            piloto: 'bg-slate-600'
        };
        const labels = {
            superadmin: 'Master',
            admin: 'Gerente General',
            gerente_sms: 'Gerente SMS',
            jefe_pilotos: 'Jefe de Pilotos',
            piloto: 'Piloto'
        };
        return <span className={`${roles[role] || 'bg-slate-500'} px-2 py-1 rounded text-[9px] font-black uppercase text-white`}>
            {labels[role] || role}
        </span>;
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-white bg-slate-900 h-screen uppercase">Accediendo a la Torre de Control...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans text-left">
            <Navbar />
            <main className="p-10 max-w-[1600px] mx-auto">
                <header className="mb-12 border-b border-white/10 pb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-orange-500 uppercase tracking-tighter">Control de Organizaciones</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">SaaS Management & Billing</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Usuarios Globales</p>
                        <p className="text-2xl font-black text-white">{users.length}</p>
                    </div>
                </header>

                <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-[10px] uppercase text-slate-500 font-black">
                            <tr>
                                <th className="p-6">Empresa</th>
                                <th className="p-6">Nombre Completo</th>
                                <th className="p-6">Correo Electrónico</th>
                                <th className="p-6">Rol Operativo</th>
                                <th className="p-6">Plan</th>
                                <th className="p-6">Último Pago</th>
                                <th className="p-6 text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-6 font-black text-orange-400 uppercase tracking-tight">{u.company_name || 'N/A'}</td>
                                    <td className="p-6 font-bold text-white">{u.full_name || 'Sin nombre'}</td>
                                    <td className="p-6 font-mono text-xs text-slate-400">{u.email || 'N/A'}</td>
                                    <td className="p-6">{getRoleBadge(u.role)}</td>
                                    <td className="p-6 font-black uppercase text-[11px]">{u.subscription_plan}</td>
                                    <td className="p-6 font-mono text-xs text-slate-500">{u.last_payment_date || '---'}</td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => setEdit(u)} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {edit && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[200]">
                    <div className="bg-slate-900 border border-orange-500/30 p-10 rounded-[3rem] w-full max-w-lg space-y-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Ajustes de Cuenta</h2>
                        
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de la Empresa</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.company_name || ''} onChange={e => setEdit({...edit, company_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre Persona</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.full_name || ''} onChange={e => setEdit({...edit, full_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Plan SaaS</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.subscription_plan} onChange={e => setEdit({...edit, subscription_plan: e.target.value})}>
                                    <option value="piloto">Plan Piloto</option>
                                    <option value="escuadrilla">Plan Escuadrilla</option>
                                    <option value="flota">Plan Flota</option>
                                    <option value="enterprise">Plan Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Rol Aeronáutico</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.role} onChange={e => setEdit({...edit, role: e.target.value})}>
                                    <option value="piloto">Piloto</option>
                                    <option value="jefe_pilotos">Jefe de Pilotos</option>
                                    <option value="gerente_sms">Gerente SMS</option>
                                    <option value="admin">Gerente General</option>
                                    <option value="superadmin">SuperAdmin (Master)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fecha de Cobro</label>
                                <input type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.last_payment_date || ''} onChange={e => setEdit({...edit, last_payment_date: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <button onClick={handleSave} className="flex-1 bg-orange-600 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Guardar Cambios</button>
                            <button onClick={() => setEdit(null)} className="flex-1 bg-slate-800 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
