'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission } from '@/lib/roles';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';
import ConfirmModal from '@/components/ui/ConfirmModal';

const TYPE_LABELS = { operaciones: 'Operaciones', mantenimiento: 'Mantenimiento' };
const TYPE_TITLES = {
    operaciones: 'Programa de Capacitación de Operaciones',
    mantenimiento: 'Programa de Capacitación Interna de Mantenimiento',
};
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const emptyProgramForm = (p) => ({
    title: p?.title || '',
    description: p?.description || '',
    topics: p?.topics?.length ? [...p.topics] : [''],
});

// Capacitación — dos programas independientes (Operaciones/Mantenimiento), cada uno
// con: (1) un programa personalizable (título + descripción + temas/módulos, editado
// por GG/GSMS/JP) y (2) un registro de evaluaciones internas por tripulante (fecha +
// Aprobado/No aprobado), que también se refleja en el Expediente de Tripulante.
export default function TrainingClient({ initialData }) {
    const [activeType, setActiveType] = useState('operaciones');
    const [programs, setPrograms] = useState(initialData.programs);
    const [evaluations, setEvaluations] = useState(initialData.evaluations);
    const [programForm, setProgramForm] = useState(() => ({
        operaciones: emptyProgramForm(initialData.programs.operaciones),
        mantenimiento: emptyProgramForm(initialData.programs.mantenimiento),
    }));
    const [savingProgram, setSavingProgram] = useState(false);
    const [addingEval, setAddingEval] = useState(false);
    const [confirmDlg, setConfirmDlg] = useState(null);

    const [evalForm, setEvalForm] = useState({ pilot_id: '', evaluation_date: new Date().toISOString().split('T')[0], result: 'aprobado', evaluator_name: '', notes: '' });

    const canManage = hasPermission(initialData.role, 'canManageTraining');

    const activeEvaluations = useMemo(() => evaluations[activeType] || [], [evaluations, activeType]);
    const kpis = useMemo(() => {
        const total = activeEvaluations.length;
        const approved = activeEvaluations.filter(e => e.result === 'aprobado').length;
        const failed = total - approved;
        const topicsCount = (programForm[activeType]?.topics || []).filter(t => t.trim()).length;
        return { total, approved, failed, topicsCount };
    }, [activeEvaluations, programForm, activeType]);

    // ── Programa de capacitación ─────────────────────────────────────────────
    const updateTopic = (idx, value) => setProgramForm(prev => ({
        ...prev, [activeType]: { ...prev[activeType], topics: prev[activeType].topics.map((t, i) => i === idx ? value : t) },
    }));
    const addTopic = () => setProgramForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], topics: [...prev[activeType].topics, ''] } }));
    const removeTopic = (idx) => setProgramForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], topics: prev[activeType].topics.filter((_, i) => i !== idx) } }));

    const handleSaveProgram = async () => {
        setSavingProgram(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const form = programForm[activeType];
            const payload = {
                organization_id: initialData.organizationId,
                type: activeType,
                title: form.title.trim() || TYPE_TITLES[activeType],
                description: form.description.trim() || null,
                topics: form.topics.map(t => t.trim()).filter(Boolean),
                updated_by: user.id,
            };
            const { data, error } = await supabase
                .from('training_programs')
                .upsert([payload], { onConflict: 'organization_id,type' })
                .select().single();
            if (error) throw error;
            setPrograms(prev => ({ ...prev, [activeType]: data }));
            toast.success('Programa guardado.');
        } catch (e) {
            toast.error('Error al guardar: ' + e.message);
        } finally {
            setSavingProgram(false);
        }
    };

    // ── Evaluaciones internas ────────────────────────────────────────────────
    const handleAddEvaluation = async (e) => {
        e.preventDefault();
        if (!evalForm.pilot_id) return toast.warn('Selecciona un tripulante.');
        setAddingEval(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('training_evaluations').insert([{
                organization_id: initialData.organizationId,
                pilot_id: evalForm.pilot_id,
                type: activeType,
                evaluation_date: evalForm.evaluation_date,
                result: evalForm.result,
                evaluator_name: evalForm.evaluator_name.trim() || null,
                notes: evalForm.notes.trim() || null,
                created_by: user.id,
            }]).select('*, pilot:pilot_id(name)').single();
            if (error) throw error;
            setEvaluations(prev => ({ ...prev, [activeType]: [data, ...prev[activeType]] }));
            setEvalForm({ pilot_id: '', evaluation_date: new Date().toISOString().split('T')[0], result: 'aprobado', evaluator_name: '', notes: '' });
            toast.success('Evaluación registrada.');
        } catch (err) {
            toast.error('Error al registrar: ' + err.message);
        } finally {
            setAddingEval(false);
        }
    };

    const handleDeleteEvaluation = (evalRow) => {
        setConfirmDlg({
            isOpen: true,
            title: '¿Eliminar esta evaluación?',
            message: `Se eliminará la evaluación de ${evalRow.pilot?.name || 'este tripulante'} del ${fmtDate(evalRow.evaluation_date)}.`,
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                setConfirmDlg(null);
                const prev = evaluations;
                setEvaluations(p => ({ ...p, [activeType]: p[activeType].filter(x => x.id !== evalRow.id) }));
                const { error } = await supabase.from('training_evaluations').delete().eq('id', evalRow.id);
                if (error) {
                    setEvaluations(prev);
                    toast.error('No se pudo eliminar: ' + error.message);
                }
            },
        });
    };

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-200";
    const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

            <PageHero
                eyebrow="Cumplimiento"
                title="Capacitación"
                description="Programas de capacitación de Operaciones y Mantenimiento, con evaluaciones internas por tripulante."
            />

            {/* Tabs */}
            <div className="flex gap-2">
                {Object.keys(TYPE_LABELS).map(t => (
                    <button key={t} onClick={() => setActiveType(t)}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                            activeType === t ? 'bg-[#1A202C] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                        }`}>
                        {TYPE_LABELS[t]}
                    </button>
                ))}
            </div>

            <section aria-label="Indicadores de capacitación" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'total', label: 'Evaluaciones', value: kpis.total, icon: 'fact_check', iconColor: '#ec5b13' },
                    { key: 'approved', label: 'Aprobadas', value: kpis.approved, icon: 'check_circle', iconColor: '#16a34a' },
                    { key: 'failed', label: 'No aprobadas', value: kpis.failed, icon: 'cancel', iconColor: kpis.failed > 0 ? '#dc2626' : '#94a3b8' },
                    { key: 'topics', label: 'Temas del programa', value: kpis.topicsCount, icon: 'menu_book', iconColor: '#94a3b8' },
                ]} />
            </section>

            {!canManage && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                    <span className="text-[11px] font-semibold text-orange-800 leading-snug">
                        Solo lectura — Gerente General, Gerente SMS y Jefe de Pilotos pueden editar el programa y registrar evaluaciones.
                    </span>
                </div>
            )}

            {/* ── Programa de capacitación ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                <div>
                    <p className="text-sm font-black text-slate-900">{TYPE_TITLES[activeType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Contenido personalizable según lo requiera la organización.
                        {programs[activeType]?.updated_at && (
                            <span className="text-slate-400"> · Actualizado {fmtDate(programs[activeType].updated_at.slice(0, 10))}</span>
                        )}
                    </p>
                </div>

                {canManage ? (
                    <>
                        <div className="space-y-1">
                            <label className={labelCls}>Título del programa</label>
                            <input className={inputCls} placeholder={TYPE_TITLES[activeType]}
                                value={programForm[activeType].title}
                                onChange={e => setProgramForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], title: e.target.value } }))} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Descripción general</label>
                            <textarea rows={4} className={inputCls + ' font-medium resize-none'}
                                placeholder="Objetivo, alcance y periodicidad del programa de capacitación…"
                                value={programForm[activeType].description}
                                onChange={e => setProgramForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], description: e.target.value } }))} />
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Temas / módulos</span>
                                <span className="text-[10.5px] font-semibold text-slate-400">
                                    {programForm[activeType].topics.filter(t => t.trim()).length} agregados
                                </span>
                            </div>
                            <div className="p-3 space-y-2">
                                {programForm[activeType].topics.map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <input className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900"
                                            placeholder={`Ej. Tema ${idx + 1} del programa…`}
                                            value={t} onChange={e => updateTopic(idx, e.target.value)} />
                                        <button type="button" onClick={() => removeTopic(idx)}
                                            className="size-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addTopic}
                                    className="flex items-center gap-1.5 px-2 py-2 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors">
                                    <span className="material-symbols-outlined text-base">add_circle</span>
                                    Agregar tema
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" onClick={handleSaveProgram} disabled={savingProgram}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                                <span className="material-symbols-outlined text-base">save</span>
                                {savingProgram ? 'Guardando...' : 'Guardar programa'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {programForm[activeType].description && (
                            <p className="text-xs text-slate-600 leading-relaxed">{programForm[activeType].description}</p>
                        )}
                        {kpis.topicsCount === 0 ? (
                            <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-6 text-center">
                                Aún no hay temas configurados en este programa.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {programForm[activeType].topics.filter(t => t.trim()).map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                                        <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <span className="text-xs font-semibold text-slate-700">{t}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Evaluaciones internas ────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 md:px-7 py-4 border-b border-slate-100">
                    <p className="text-sm font-black text-slate-900">Evaluación Interna de Capacitación — {TYPE_LABELS[activeType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Se refleja en el expediente de cada tripulante.</p>
                </div>

                {canManage && (
                    <form onSubmit={handleAddEvaluation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-4 bg-slate-50 border-b border-slate-100">
                        <select required className={inputCls} value={evalForm.pilot_id} onChange={e => setEvalForm({ ...evalForm, pilot_id: e.target.value })}>
                            <option value="">-- Tripulante --</option>
                            {initialData.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input required type="date" className={inputCls} value={evalForm.evaluation_date}
                            onChange={e => setEvalForm({ ...evalForm, evaluation_date: e.target.value })} />
                        <select className={inputCls} value={evalForm.result} onChange={e => setEvalForm({ ...evalForm, result: e.target.value })}>
                            <option value="aprobado">Aprobado</option>
                            <option value="no_aprobado">No aprobado</option>
                        </select>
                        <input placeholder="Evaluador (opcional)" className={inputCls}
                            value={evalForm.evaluator_name} onChange={e => setEvalForm({ ...evalForm, evaluator_name: e.target.value })} />
                        <button type="submit" disabled={addingEval}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Registrar
                        </button>
                    </form>
                )}

                {activeEvaluations.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-10">Sin evaluaciones registradas todavía.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <th className="px-5 py-3">Tripulante</th>
                                    <th className="px-3 py-3">Fecha</th>
                                    <th className="px-3 py-3">Resultado</th>
                                    <th className="px-3 py-3">Evaluador</th>
                                    {canManage && <th className="px-3 py-3 w-14"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeEvaluations.map(ev => (
                                    <tr key={ev.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-3 font-bold text-slate-800">{ev.pilot?.name || 'N/A'}</td>
                                        <td className="px-3 py-3 text-slate-600 font-semibold">{fmtDate(ev.evaluation_date)}</td>
                                        <td className="px-3 py-3">
                                            {ev.result === 'aprobado' ? (
                                                <span className="flex items-center gap-1 font-black text-emerald-600">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    Aprobado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 font-black text-red-600">
                                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                                    No aprobado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-slate-500 font-semibold">{ev.evaluator_name || '—'}</td>
                                        {canManage && (
                                            <td className="px-3 py-3">
                                                <button onClick={() => handleDeleteEvaluation(ev)} aria-label="Eliminar evaluación"
                                                    className="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
