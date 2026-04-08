'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function MasterPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [edit, setEdit] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/master');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async () => {
        const res = await fetch('/api/admin/master', {
            method: 'PATCH',
            body: JSON.stringify({ 
                targetUserId: edit.id, 
                updateData: { 
                    subscription_plan: edit.subscription_plan, 
                    role: edit.role,
                    last_payment_date: edit.last_payment_date 
                } 
            })
        });
        if (res.ok) {
            setEdit(null);
            loadData();
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-white bg-slate-900 h-screen">CARGANDO TABLA MAESTRA...</div>;

    if (error) return (
        <div className="p-20 text-center text-white bg-slate-900 h-screen">
            <h1 className="text-red-500 font-black text-4xl mb-4">ERROR DE ACCESO</h1>
            <p className="text-slate-400 mb-8">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-orange-600 px-8 py-3 rounded-xl font-bold">REINTENTAR</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans text-left">
            <Navbar />
            <main className="p-10 max-w-7xl mx-auto">
                <header className="mb-12 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tighter">Panel de Control Global</h1>
                    <p className="text-slate-400 text-xs">Viendo {users.length} registros de la base de datos.</p>
                </header>

                <div className="bg-slate-800 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-[10px] uppercase text-slate-500 font-black">
                            <tr>
                                <th className="p-5">Organización</th>
                                <th className="p-5">Plan Actual</th>
                                <th className="p-5">Rol</th>
                                <th className="p-5">Pago</th>
                                <th className="p-5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-5">
                                        <p className="font-bold text-white">{u.company_name || 'N/A'}</p>
                                        <p className="text-[10px] text-slate-500 font-mono uppercase">{u.id.substring(0,8)}...</p>
                                    </td>
                                    <td className="p-5"><span className="text-orange-400 font-black uppercase">{u.subscription_plan}</span></td>
                                    <td className="p-5"><span className="bg-slate-700 px-2 py-1 rounded text-[10px] font-bold">{u.role}</span></td>
                                    <td className="p-5 text-xs">{u.last_payment_date || 'Sin Registro'}</td>
                                    <td className="p-5 text-right">
                                        <button onClick={() => setEdit(u)} className="bg-white text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all">Modificar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {edit && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
                    <div className="bg-slate-900 border border-orange-500/30 p-10 rounded-[3rem] w-full max-w-md space-y-6">
                        <h2 className="text-xl font-black uppercase">Ajustar Cuenta</h2>
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Nivel de Plan</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.subscription_plan} onChange={e => setEdit({...edit, subscription_plan: e.target.value})}>
                                    <option value="piloto">Piloto (Gratis)</option>
                                    <option value="escuadrilla">Escuadrilla</option>
                                    <option value="flota">Flota</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Rol de Usuario</label>
                                <select className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.role} onChange={e => setEdit({...edit, role: e.target.value})}>
                                    <option value="piloto">Piloto</option>
                                    <option value="admin">Admin Empresa</option>
                                    <option value="superadmin">SuperAdmin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Fecha de Pago</label>
                                <input type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white mt-1" value={edit.last_payment_date || ''} onChange={e => setEdit({...edit, last_payment_date: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={handleSave} className="flex-1 bg-orange-600 py-3 rounded-xl font-black uppercase text-xs">Confirmar</button>
                            <button onClick={() => setEdit(null)} className="flex-1 bg-slate-700 py-3 rounded-xl font-black uppercase text-xs">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
