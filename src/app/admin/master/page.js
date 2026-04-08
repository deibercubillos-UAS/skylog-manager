'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function MasterPanel() {
    const [users, setUsers] = useState([]);
    const [edit, setEdit] = useState(null);

    const load = async () => {
        const res = await fetch('/api/admin/master');
        const data = await res.json();
        if (!data.error) setUsers(data);
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        await fetch('/api/admin/master', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId: edit.id, updateData: { 
                subscription_plan: edit.subscription_plan, 
                role: edit.role,
                last_payment_date: edit.last_payment_date 
            }})
        });
        setEdit(null);
        load();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans text-left">
            <Navbar />
            <main className="p-10">
                <h1 className="text-3xl font-black text-orange-500 uppercase mb-8">Master Tower: Control de Empresas</h1>
                <div className="bg-slate-800 rounded-3xl overflow-hidden border border-white/5">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-[10px] uppercase text-slate-500 font-black">
                            <tr>
                                <th className="p-5">Empresa / CIPU</th>
                                <th className="p-5">Rol</th>
                                <th className="p-5">Plan</th>
                                <th className="p-5">Pago</th>
                                <th className="p-5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5">
                                    <td className="p-5">
                                        <p className="font-bold text-white">{u.company_name || 'Individual'}</p>
                                        <p className="text-[10px] text-slate-400">{u.full_name}</p>
                                    </td>
                                    <td className="p-5"><span className="bg-slate-700 px-2 py-1 rounded text-[10px] uppercase font-black">{u.role}</span></td>
                                    <td className="p-5 font-black text-orange-400 uppercase">{u.subscription_plan}</td>
                                    <td className="p-5 text-xs font-mono">{u.last_payment_date || 'N/A'}</td>
                                    <td className="p-5 text-right">
                                        <button onClick={() => setEdit(u)} className="bg-white text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Gestionar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {edit && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
                    <div className="bg-slate-900 border border-orange-500/30 p-10 rounded-[2.5rem] w-full max-w-md space-y-6">
                        <h2 className="text-xl font-black uppercase">Modificar Cuenta</h2>
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Plan</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.subscription_plan} onChange={e => setEdit({...edit, subscription_plan: e.target.value})}>
                                    <option value="piloto">Piloto</option>
                                    <option value="escuadrilla">Escuadrilla</option>
                                    <option value="flota">Flota</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Rol Sistema</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.role} onChange={e => setEdit({...edit, role: e.target.value})}>
                                    <option value="piloto">Piloto</option>
                                    <option value="admin">Admin Empresa</option>
                                    <option value="superadmin">SuperAdmin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Fecha Pago Manual</label>
                                <input type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.last_payment_date || ''} onChange={e => setEdit({...edit, last_payment_date: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={save} className="flex-1 bg-orange-600 py-3 rounded-xl font-black uppercase text-xs">Guardar</button>
                            <button onClick={() => setEdit(null)} className="flex-1 bg-slate-700 py-3 rounded-xl font-black uppercase text-xs">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
