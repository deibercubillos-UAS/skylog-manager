'use client';
import { useState, useEffect } from 'react';

/**
 * Tab "Releases" del panel Master.
 * Muestra el historial de versiones del APK Android y permite publicar
 * una nueva versión (requiere haber subido el .apk al bucket app-releases).
 */
export default function ReleasesTab() {
    const [releases, setReleases] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [form, setForm]         = useState({ version_name: '', version_code: '', apk_url: '', release_notes: '', force_update: false });
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const load = async () => {
        setLoading(true);
        const res = await fetch('/api/admin/master/releases');
        const data = await res.json();
        setReleases(data.releases || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.version_name || !form.version_code || !form.apk_url) {
            setMsg('✗ Completa versión, código y URL del APK.');
            return;
        }
        setSaving(true);
        setMsg('');
        const res = await fetch('/api/admin/master/releases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, version_code: parseInt(form.version_code) }),
        });
        const data = await res.json();
        if (data.error) { setMsg('✗ ' + data.error); }
        else {
            setMsg('✓ Versión publicada. Los controles la verán al abrir la app.');
            setForm({ version_name: '', version_code: '', apk_url: '', release_notes: '', force_update: false });
            load();
        }
        setSaving(false);
    };

    const retire = async (id) => {
        await fetch('/api/admin/master/releases', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        load();
    };

    return (
        <div className="space-y-8">

            {/* Publicar nueva versión */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">upload</span>
                    Publicar nueva versión
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Sube el APK firmado al bucket <code className="text-orange-400">app-releases</code> en Supabase Storage,
                    copia la URL pública y pégala aquí. Los controles DJI la detectarán automáticamente al abrir la app.
                </p>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nombre de versión *</label>
                        <input
                            value={form.version_name}
                            onChange={e => setForm(f => ({ ...f, version_name: e.target.value }))}
                            placeholder="1.2.0"
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Código de versión * (entero creciente)</label>
                        <input
                            type="number"
                            value={form.version_code}
                            onChange={e => setForm(f => ({ ...f, version_code: e.target.value }))}
                            placeholder="3"
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL pública del APK * (Supabase Storage)</label>
                        <input
                            value={form.apk_url}
                            onChange={e => setForm(f => ({ ...f, apk_url: e.target.value }))}
                            placeholder="https://xxxx.supabase.co/storage/v1/object/public/app-releases/bitafly-v1.2.0.apk"
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 font-mono text-xs"
                        />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Notas del release</label>
                        <textarea
                            value={form.release_notes}
                            onChange={e => setForm(f => ({ ...f, release_notes: e.target.value }))}
                            placeholder="Correcciones de estabilidad y nuevas funciones…"
                            rows={2}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 resize-none"
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="force"
                            checked={form.force_update}
                            onChange={e => setForm(f => ({ ...f, force_update: e.target.checked }))}
                            className="size-4 accent-orange-500"
                        />
                        <label htmlFor="force" className="text-xs text-slate-400 cursor-pointer">
                            <span className="font-black text-red-400">Actualización forzada</span> — el dialog no se puede cerrar hasta instalar
                        </label>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                        >
                            {saving ? 'Publicando…' : 'Publicar versión'}
                        </button>
                        {msg && <p className={`text-xs font-bold ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
                    </div>
                </form>
            </div>

            {/* Historial */}
            <div className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">history</span>
                    Historial de versiones
                </h2>
                {loading ? (
                    <p className="text-slate-500 text-sm animate-pulse">Cargando…</p>
                ) : releases.length === 0 ? (
                    <p className="text-slate-600 text-sm">Sin versiones publicadas.</p>
                ) : (
                    <div className="space-y-2">
                        {releases.map(r => (
                            <div key={r.id} className="bg-slate-900 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-white font-black text-sm">v{r.version_name}</span>
                                        <span className="text-slate-500 text-xs">código {r.version_code}</span>
                                        {r.is_current && (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase">Activa</span>
                                        )}
                                        {r.force_update && (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase">Forzada</span>
                                        )}
                                    </div>
                                    {r.release_notes && <p className="text-xs text-slate-500 truncate">{r.release_notes}</p>}
                                    <p className="text-[10px] text-slate-700 font-mono truncate">{r.apk_url}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={r.apk_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="size-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                        title="Descargar APK"
                                    >
                                        <span className="material-symbols-outlined text-base">download</span>
                                    </a>
                                    {r.is_current && (
                                        <button
                                            onClick={() => retire(r.id)}
                                            className="size-8 flex items-center justify-center rounded-lg bg-slate-800 text-red-500/60 hover:text-red-400 transition-colors"
                                            title="Retirar versión"
                                        >
                                            <span className="material-symbols-outlined text-base">block</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
