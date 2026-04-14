'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function MasterPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [edit, setEdit] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/master');
            const data = await res.json();
            
            if (data.error) {
                setError(data.error);
            } else {
                setUsers(data);
            }
        } catch (err) {
            setError("Error de conexión con la Torre de Control");
        } finally {
            setLoading(false);
        }
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
                    organization_id: edit.organization_id,
                    company_name: edit.company_name,
                    last_payment_date: edit.last_payment_date 
                } 
            })
        });
        if (res.ok) {
            setEdit(null);
            loadData();
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-white bg-slate-950 h-screen">AUTORIZANDO NIVEL MASTER...</div>;

    if (error) return (
        <div className="p-20 text-center text-white bg-slate-950 h-screen">
            <h1 className="text-red-500 font-black text-4xl mb-4">ACCESO DENEGADO</h1>
            <p className="text-slate-400 mb-8">Usted no tiene privilegios de SuperAdmin para ver esta consola.</p>
            <button onClick={() => window.location.href='/dashboard'} className="bg-orange-600 px-8 py-3 rounded-xl font-bold">VOLVER AL DASHBOARD</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans text-left">
            <Navbar />
            <main className="p-10 max-w-[1600px] mx-auto">
                <header className="mb-12 border-b border-white/10 pb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-orange-500 uppercase tracking-tighter">BitaFly Master Control</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase mt-2">Torre de Mando Global</p>
                    </div>
                </header>

                <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-[10px] uppercase text-slate-500 font-black">
                            <tr>
                                <th className="p-6">Empresa</th>
                                <th className="p-6">Usuario / Email</th>
                                <th className="p-6">Rol</th>
                                <th className="p-6">Plan</th>
                                <th className="p-6">Pago</th>
                                <th className="p-6 text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-6 font-black text-orange-400 uppercase tracking-tight">{u.company_name || 'Individual'}</td>
                                    <td className="p-6">
                                        <p className="font-bold text-white">{u.full_name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                                    </td>
                                    <td className="p-6"><span className="bg-slate-700 px-2 py-1 rounded text-[9px] font-bold uppercase">{u.role}</span></td>
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
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-[200]">
                    <div className="bg-slate-900 border border-orange-500/30 p-10 rounded-[3rem] w-full max-w-lg space-y-6">
                        <h2 className="text-2xl font-black uppercase text-white">Gestión de Organización</h2>
                        <div className="grid grid-cols-1 gap-4 text-left">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">ID de Organización (VINCULACIÓN)</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-mono text-xs mt-1" value={edit.organization_id || ''} onChange={e => setEdit({...edit, organization_id: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Plan de Pago</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.subscription_plan} onChange={e => setEdit({...edit, subscription_plan: e.target.value})}>
                                    <option value="piloto">Plan Piloto</option>
                                    <option value="escuadrilla">Plan Escuadrilla</option>
                                    <option value="flota">Plan Flota</option>
                                    <option value="enterprise">Plan Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Fecha Último Cobro</label>
                                <input type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white font-bold mt-1" value={edit.last_payment_date || ''} onChange={e => setEdit({...edit, last_payment_date: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-6">
                            <button onClick={handleSave} className="flex-1 bg-orange-600 py-4 rounded-2xl font-black uppercase text-xs">Guardar Cambios</button>
                            <button onClick={() => setEdit(null)} className="flex-1 bg-slate-800 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
