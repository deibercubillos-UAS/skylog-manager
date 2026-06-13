'use client';
import { useEffect, useState } from 'react';
import { ROLE_LABELS, ASSIGNABLE_ROLES, labelForRole } from '@/lib/roles';
import { toast } from '@/lib/toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { docOpenUrl } from '@/lib/docUrl';

export default function UsersClient({ currentUserId, currentRole, organization }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [search, setSearch] = useState('');
    const [confirmDlg, setConfirmDlg] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Error al cargar usuarios');
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const changeRole = (targetUserId, newRole, currentTargetRole) => {
        if (newRole === currentTargetRole) return;
        const target = users.find(u => u.id === targetUserId);
        const confirmMsg = targetUserId === currentUserId
            ? `Vas a cambiar TU PROPIO rol a "${labelForRole(newRole)}". Perderás accesos inmediatamente. ¿Continuar?`
            : `Cambiar rol de ${target?.full_name || target?.email} a "${labelForRole(newRole)}"?`;

        setConfirmDlg({
            isOpen: true,
            title: 'Cambiar rol',
            message: confirmMsg,
            confirmText: 'Confirmar',
            danger: targetUserId === currentUserId,
            onConfirm: async () => {
                setConfirmDlg(null);
                setSavingId(targetUserId);
                try {
                    const res = await fetch('/api/admin/users', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetUserId, newRole })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Error al actualizar');
                    setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: data.role } : u));
                    if (targetUserId === currentUserId) {
                        setTimeout(() => window.location.reload(), 600);
                    }
                } catch (err) {
                    toast.error(err.message);
                } finally {
                    setSavingId(null);
                }
            }
        });
    };

    const filtered = users.filter(u => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (u.full_name || '').toLowerCase().includes(s)
            || (u.email || '').toLowerCase().includes(s)
            || (u.role || '').toLowerCase().includes(s);
    });

    const roleBadge = (role) => {
        const map = {
            superadmin:   'bg-purple-50 text-purple-600 border-purple-200',
            admin:        'bg-orange-50 text-orange-600 border-orange-200',
            gerente_sms:  'bg-blue-50 text-blue-600 border-blue-200',
            jefe_pilotos: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            piloto:       'bg-slate-50 text-slate-600 border-slate-200',
        };
        return map[role] || 'bg-slate-50 text-slate-600 border-slate-200';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-500 pb-20 px-2 md:px-0">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Gestión de Usuarios</h2>
                    <p className="text-slate-500 text-xs md:text-sm font-bold uppercase mt-2 tracking-widest">
                        {organization.company_name} · {users.length} miembros
                    </p>
                </div>
                <div className="w-full md:w-72">
                    <input
                        placeholder="Buscar por nombre, correo o rol..."
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">
                    Cargando miembros...
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">No se encontraron miembros.</p>
                        ) : filtered.map(u => {
                            const isSelf = u.id === currentUserId;
                            const isSuper = u.role === 'superadmin';
                            const disabled = isSuper || savingId === u.id;
                            return (
                                <div key={u.id} className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                            {u.avatar_url
                                              ? (// eslint-disable-next-line @next/next/no-img-element
                                                <img src={docOpenUrl(u.avatar_url)} alt={u.full_name} className="size-full object-cover" width={40} height={40} />)
                                              : <span className="material-symbols-outlined text-slate-400 text-xl">person</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 uppercase text-xs truncate">
                                                {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '---'}
                                                {isSelf && <span className="ml-2 text-orange-600">(TÚ)</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black uppercase border ${roleBadge(u.role)}`}>
                                            {labelForRole(u.role)}
                                        </span>
                                    </div>
                                    {!isSuper && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-400 uppercase">Cambiar rol:</span>
                                            <select
                                                disabled={disabled}
                                                value={u.role || ''}
                                                onChange={e => changeRole(u.id, e.target.value, u.role)}
                                                className={`flex-1 p-2.5 bg-slate-50 rounded-xl border-none text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                            </select>
                                            {savingId === u.id && <span className="text-xs font-bold text-orange-500 animate-pulse">guardando...</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
                                    <th className="px-6 py-5">Miembro</th>
                                    <th className="px-6 py-5">Correo</th>
                                    <th className="px-6 py-5">Rol Actual</th>
                                    <th className="px-6 py-5">Asignar Rol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="4" className="p-16 text-center italic text-slate-400 text-xs">No se encontraron miembros.</td></tr>
                                ) : filtered.map(u => {
                                    const isSelf = u.id === currentUserId;
                                    const isSuper = u.role === 'superadmin';
                                    const disabled = isSuper || savingId === u.id;
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                        {u.avatar_url
                                                          ? (// eslint-disable-next-line @next/next/no-img-element
                                                            <img src={docOpenUrl(u.avatar_url)} alt={u.full_name} className="size-full object-cover" width={40} height={40} />)
                                                          : <span className="material-symbols-outlined text-slate-400 text-xl">person</span>}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 uppercase text-xs">
                                                            {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '---'}
                                                            {isSelf && <span className="ml-2 text-xs text-orange-600 font-black">(TÚ)</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">{u.phone || '---'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-xs text-slate-600 font-medium">{u.email}</td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${roleBadge(u.role)}`}>{labelForRole(u.role)}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                {isSuper ? (
                                                    <span className="text-xs italic text-slate-400 font-bold">Gestión desde Master</span>
                                                ) : (
                                                    <select disabled={disabled} value={u.role || ''} onChange={e => changeRole(u.id, e.target.value, u.role)} className={`p-3 bg-slate-50 rounded-xl border-none text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                                    </select>
                                                )}
                                                {savingId === u.id && <span className="ml-2 text-xs font-bold text-orange-500 animate-pulse">guardando...</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-medium text-slate-500 leading-relaxed">
                <p className="font-black text-slate-700 uppercase tracking-widest mb-2 text-xs">Reglas del sistema</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Solo se pueden asignar los roles: Gerente General, Gerente SMS, Jefe de Pilotos y Piloto.</li>
                    <li>El rol SuperAdmin solo se gestiona desde el panel Master.</li>
                    <li>No se puede degradar al último Gerente General de la organización.</li>
                    <li>Si cambias tu propio rol, la página se recargará y podrías perder accesos.</li>
                </ul>
            </div>
        </div>
    );
}