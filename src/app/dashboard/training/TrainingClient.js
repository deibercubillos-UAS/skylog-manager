'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { hasPermission, PERMISSIONS } from '@/lib/roles';
import { computeCompliance, RECURRENCE_LABELS, currentCycle, nextOccurrence } from '@/lib/trainingCompliance';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';
import ConfirmModal from '@/components/ui/ConfirmModal';

const AddSmsSessionPanel = dynamic(() => import('@/components/safety/AddSmsSessionPanel'), { ssr: false });
const SmsAttendancePanel = dynamic(() => import('@/components/safety/SmsAttendancePanel'), { ssr: false });

const TYPE_LABELS = { operaciones: 'Operaciones', mantenimiento: 'Mantenimiento' };
const RECURRENCES = ['semanal', 'quincenal', 'mensual', 'personalizado'];
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_META = {
    ok:       { label: 'Cumplido',   cls: 'text-emerald-600', icon: 'check_circle' },
    pending:  { label: 'Pendiente',  cls: 'text-amber-600',   icon: 'schedule' },
    failed:   { label: 'Reprobado',  cls: 'text-red-600',     icon: 'cancel' },
    overdue:  { label: 'Vencido',    cls: 'text-red-600',     icon: 'warning' },
    not_configured: { label: 'Sin examen', cls: 'text-slate-400', icon: 'remove' },
};

const emptyQuestion = () => ({ id: null, question_text: '', options: ['', '', '', ''], correct_index: 0 });

// Capacitación v2 — por tipo (Operaciones/Mantenimiento):
// 1. Cronograma de sesiones: tema + recurrencia (semanal/quincenal/mensual/personalizado).
// 2. Examen: configuración (recurrencia propia + nota mínima + intentos) + banco de
//    preguntas (opción múltiple) + tabla de cumplimiento por piloto. El piloto lo
//    presenta en /dashboard/training/exam — aquí solo se administra y se consulta.
export default function TrainingClient({ initialData }) {
    const [activeType, setActiveType] = useState('operaciones');
    const [confirmDlg, setConfirmDlg] = useState(null);

    const [sessions, setSessions] = useState(initialData.sessions);
    const [sessionForm, setSessionForm] = useState({ topic: '', recurrence: 'mensual', recurrence_days: 30, start_date: new Date().toISOString().split('T')[0] });
    const [addingSession, setAddingSession] = useState(false);

    const [exams, setExams] = useState(initialData.exams);
    const [examForm, setExamForm] = useState(() => ({
        operaciones: toExamForm(initialData.exams.operaciones),
        mantenimiento: toExamForm(initialData.exams.mantenimiento),
    }));
    const [savingExam, setSavingExam] = useState(false);

    const [questionsByExam, setQuestionsByExam] = useState(initialData.questionsByExam);
    const [questionDrafts, setQuestionDrafts] = useState(() => ({
        operaciones: toQuestionDrafts(initialData.exams.operaciones, initialData.questionsByExam),
        mantenimiento: toQuestionDrafts(initialData.exams.mantenimiento, initialData.questionsByExam),
    }));
    const [savingQuestions, setSavingQuestions] = useState(false);

    const [attempts, setAttempts] = useState(initialData.attempts);

    function toExamForm(exam) {
        return {
            title: exam?.title || '',
            recurrence: exam?.recurrence || 'mensual',
            recurrence_days: exam?.recurrence_days || 30,
            start_date: exam?.start_date || new Date().toISOString().split('T')[0],
            passing_score: exam?.passing_score ?? 80,
            max_attempts: exam?.max_attempts ?? 3,
        };
    }
    function toQuestionDrafts(exam, qMap) {
        const list = exam ? (qMap[exam.id] || []) : [];
        return list.length
            ? list.map(q => ({ id: q.id, question_text: q.question_text, options: [...q.options], correct_index: q.correct_index }))
            : [emptyQuestion()];
    }

    const canManage = hasPermission(initialData.role, 'canManageTraining');
    const exam = exams[activeType];
    const activeAttempts = useMemo(() => attempts.filter(a => a.exam_id === exam?.id), [attempts, exam]);

    // ── Capacitación SMS (todo el personal, sin examen) ─────────────────────
    // Mismo cronograma/roster que el tab "Capacitación SMS" de Seguridad SMS —
    // reutiliza los mismos componentes y endpoints, sin duplicar lógica. Gateado a
    // canManageSMS (superadmin/admin/gerente_sms): jefe_pilotos/piloto no administran
    // ni ven este tab aquí, igual que en el hub de Seguridad SMS (Fase 0 del plan SMS).
    const canManageSMSRole = PERMISSIONS.canManageSMS.includes(initialData.role);
    const [smsSessions, setSmsSessions] = useState(initialData.smsSessions || []);
    const [sessionPanel, setSessionPanel] = useState(null);     // null | 'new' | session object
    const [attendancePanel, setAttendancePanel] = useState(null); // null | session object

    const loadSmsSessions = () => {
        fetch('/api/safety/training/sessions').then(r => r.json())
            .then(d => setSmsSessions(Array.isArray(d) ? d : []))
            .catch(() => {});
    };

    const thisYearISO = new Date().getFullYear().toString();
    const smsKpis = useMemo(() => {
        const totalAttendance = smsSessions.reduce((s, sess) => s + (sess.attendance || []).length, 0);
        const attendanceThisYear = smsSessions.reduce(
            (s, sess) => s + (sess.attendance || []).filter(a => (a.attended_date || '').startsWith(thisYearISO)).length, 0
        );
        const uniqueAttendees = new Set();
        smsSessions.forEach(sess => (sess.attendance || []).forEach(a => uniqueAttendees.add(a.profile_id)));
        return { total: smsSessions.length, attendanceThisYear, totalAttendance, people: uniqueAttendees.size };
    }, [smsSessions, thisYearISO]);

    // ── Cronograma ───────────────────────────────────────────────────────────
    const handleAddSession = async (e) => {
        e.preventDefault();
        if (!sessionForm.topic.trim()) return toast.warn('Escribe el tema de la sesión.');
        setAddingSession(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('training_sessions').insert([{
                organization_id: initialData.organizationId,
                type: activeType,
                topic: sessionForm.topic.trim(),
                recurrence: sessionForm.recurrence,
                recurrence_days: sessionForm.recurrence === 'personalizado' ? parseInt(sessionForm.recurrence_days || 30, 10) : null,
                start_date: sessionForm.start_date,
                created_by: user.id,
            }]).select().single();
            if (error) throw error;
            setSessions(prev => ({ ...prev, [activeType]: [...prev[activeType], data] }));
            setSessionForm({ topic: '', recurrence: 'mensual', recurrence_days: 30, start_date: new Date().toISOString().split('T')[0] });
            toast.success('Sesión agregada al cronograma.');
        } catch (err) {
            toast.error('Error al agregar: ' + err.message);
        } finally {
            setAddingSession(false);
        }
    };

    const handleDeleteSession = (session) => {
        setConfirmDlg({
            isOpen: true,
            title: '¿Eliminar esta sesión del cronograma?',
            message: `"${session.topic}" se eliminará permanentemente.`,
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                setConfirmDlg(null);
                const prev = sessions;
                setSessions(p => ({ ...p, [activeType]: p[activeType].filter(s => s.id !== session.id) }));
                const { error } = await supabase.from('training_sessions').delete().eq('id', session.id);
                if (error) { setSessions(prev); toast.error('No se pudo eliminar: ' + error.message); }
            },
        });
    };

    // ── Examen — configuración ───────────────────────────────────────────────
    const handleSaveExam = async () => {
        setSavingExam(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const form = examForm[activeType];
            const payload = {
                organization_id: initialData.organizationId,
                type: activeType,
                title: form.title.trim() || `Examen de ${TYPE_LABELS[activeType]}`,
                recurrence: form.recurrence,
                recurrence_days: form.recurrence === 'personalizado' ? parseInt(form.recurrence_days || 30, 10) : null,
                start_date: form.start_date,
                passing_score: parseFloat(form.passing_score || 80),
                max_attempts: parseInt(form.max_attempts || 1, 10),
                updated_by: user.id,
            };
            const { data, error } = await supabase
                .from('training_exams')
                .upsert([payload], { onConflict: 'organization_id,type' })
                .select().single();
            if (error) throw error;
            setExams(prev => ({ ...prev, [activeType]: data }));
            toast.success('Configuración del examen guardada.');
        } catch (e) {
            toast.error('Error al guardar: ' + e.message);
        } finally {
            setSavingExam(false);
        }
    };

    // ── Examen — banco de preguntas ──────────────────────────────────────────
    const updateQuestion = (idx, patch) => setQuestionDrafts(prev => ({
        ...prev, [activeType]: prev[activeType].map((q, i) => i === idx ? { ...q, ...patch } : q),
    }));
    const updateOption = (qIdx, oIdx, value) => setQuestionDrafts(prev => ({
        ...prev, [activeType]: prev[activeType].map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q),
    }));
    const addQuestion = () => setQuestionDrafts(prev => ({ ...prev, [activeType]: [...prev[activeType], emptyQuestion()] }));
    const removeQuestion = (idx) => setQuestionDrafts(prev => ({ ...prev, [activeType]: prev[activeType].filter((_, i) => i !== idx) }));

    const handleSaveQuestions = async () => {
        if (!exam) return toast.warn('Guarda primero la configuración del examen.');
        const drafts = questionDrafts[activeType].filter(q => q.question_text.trim() && q.options.every(o => o.trim()));
        if (drafts.length === 0) return toast.warn('Agrega al menos una pregunta completa (texto + 4 opciones).');
        setSavingQuestions(true);
        try {
            const toInsert = drafts.filter(q => !q.id).map((q, i) => ({
                organization_id: initialData.organizationId, exam_id: exam.id,
                question_text: q.question_text.trim(), options: q.options.map(o => o.trim()),
                correct_index: q.correct_index, order_index: i,
            }));
            const toUpdate = drafts.filter(q => q.id);

            if (toInsert.length) {
                const { error } = await supabase.from('training_exam_questions').insert(toInsert);
                if (error) throw error;
            }
            for (const q of toUpdate) {
                const { error } = await supabase.from('training_exam_questions').update({
                    question_text: q.question_text.trim(), options: q.options.map(o => o.trim()), correct_index: q.correct_index,
                }).eq('id', q.id);
                if (error) throw error;
            }
            const { data: refreshed } = await supabase.from('training_exam_questions')
                .select('id, exam_id, question_text, options, order_index').eq('exam_id', exam.id).order('order_index');
            setQuestionsByExam(prev => ({ ...prev, [exam.id]: refreshed || [] }));
            setQuestionDrafts(prev => ({ ...prev, [activeType]: toQuestionDrafts(exam, { [exam.id]: refreshed || [] }) }));
            toast.success('Banco de preguntas guardado.');
        } catch (e) {
            toast.error('Error al guardar preguntas: ' + e.message);
        } finally {
            setSavingQuestions(false);
        }
    };

    const handleDeleteQuestion = (idx) => {
        const q = questionDrafts[activeType][idx];
        if (!q.id) { removeQuestion(idx); return; }
        setConfirmDlg({
            isOpen: true, title: '¿Eliminar esta pregunta?', message: 'Se eliminará permanentemente del banco.',
            confirmText: 'Eliminar', danger: true,
            onConfirm: async () => {
                setConfirmDlg(null);
                const { error } = await supabase.from('training_exam_questions').delete().eq('id', q.id);
                if (error) return toast.error('No se pudo eliminar: ' + error.message);
                removeQuestion(idx);
                setQuestionsByExam(prev => ({ ...prev, [exam.id]: (prev[exam.id] || []).filter(x => x.id !== q.id) }));
            },
        });
    };

    // ── Cumplimiento por piloto ───────────────────────────────────────────────
    const complianceRows = useMemo(() => {
        return initialData.pilots.map(p => {
            const pilotAttempts = activeAttempts.filter(a => a.pilot_id === p.id);
            const c = computeCompliance(exam, pilotAttempts);
            const lastAttempt = pilotAttempts[0]; // ya vienen ordenados desc por submitted_at
            return { pilot: p, compliance: c, lastAttempt };
        });
    }, [initialData.pilots, activeAttempts, exam]);

    const kpis = useMemo(() => {
        const compliant = complianceRows.filter(r => r.compliance.status === 'ok').length;
        const overdue = complianceRows.filter(r => r.compliance.status === 'overdue' || r.compliance.status === 'failed').length;
        return {
            sessions: sessions[activeType]?.length || 0,
            questions: exam ? (questionsByExam[exam.id]?.length || 0) : 0,
            compliant, overdue,
        };
    }, [complianceRows, sessions, activeType, exam, questionsByExam]);

    const myCompliance = useMemo(() => {
        if (!initialData.myPilotId) return null;
        const row = complianceRows.find(r => r.pilot.id === initialData.myPilotId);
        return row?.compliance || null;
    }, [complianceRows, initialData.myPilotId]);

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-200";
    const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 text-left animate-in fade-in duration-500 pb-24">
            <ConfirmModal {...confirmDlg} onCancel={() => setConfirmDlg(null)} />

            <PageHero
                eyebrow="Cumplimiento"
                title="Capacitación"
                description="Cronograma de sesiones y examen interno recurrente de Operaciones y Mantenimiento."
                right={activeType === 'sms' && canManageSMSRole && (
                    <button onClick={() => setSessionPanel('new')}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        Nueva sesión
                    </button>
                )}
            />

            <div className="flex gap-2">
                {Object.keys(TYPE_LABELS).map(t => (
                    <button key={t} onClick={() => setActiveType(t)}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                            activeType === t ? 'bg-[#1A202C] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                        }`}>
                        {TYPE_LABELS[t]}
                    </button>
                ))}
                {canManageSMSRole && (
                    <button onClick={() => setActiveType('sms')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                            activeType === 'sms' ? 'bg-[#1A202C] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                        }`}>
                        Capacitación SMS
                    </button>
                )}
            </div>

            {activeType === 'sms' ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <section aria-label="Indicadores de capacitación SMS" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                        <KPIStrip variant="strip" items={[
                            { key: 'total', label: 'Sesiones en cronograma', value: smsKpis.total, icon: 'school', iconColor: '#ec5b13' },
                            { key: 'attYear', label: `Asistencias ${thisYearISO}`, value: smsKpis.attendanceThisYear, icon: 'event_available', iconColor: '#16a34a' },
                            { key: 'attTotal', label: 'Asistencias totales', value: smsKpis.totalAttendance, icon: 'groups', iconColor: '#4f46e5' },
                            { key: 'people', label: 'Personal con asistencia', value: smsKpis.people, icon: 'badge', iconColor: '#94a3b8' },
                        ]} />
                    </section>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 md:px-7 py-4 border-b border-slate-100">
                            <p className="text-sm font-black text-slate-900">Cronograma de Capacitación SMS</p>
                            <p className="text-xs text-slate-500 mt-0.5">Inducción, SORA, Factores Humanos, Cultura Justa, TEM, etc. — dirigido a todo el personal, sin examen.</p>
                        </div>

                        {smsSessions.length === 0 ? (
                            <p className="text-xs font-bold text-slate-400 text-center py-10">Sin sesiones en el cronograma todavía.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                            <th className="px-5 py-3">Tema</th>
                                            <th className="px-3 py-3">Recurrencia</th>
                                            <th className="px-3 py-3">Próxima ocurrencia</th>
                                            <th className="px-3 py-3">Asistencias</th>
                                            <th className="px-3 py-3 w-14"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {smsSessions.map(s => {
                                            const { date: nextDate } = nextOccurrence(s);
                                            return (
                                                <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => setAttendancePanel(s)}>
                                                    <td className="px-5 py-3 font-bold text-slate-800">{s.topic}</td>
                                                    <td className="px-3 py-3 text-slate-600 font-semibold">
                                                        {RECURRENCE_LABELS[s.recurrence]}{s.recurrence === 'personalizado' ? ` (cada ${s.recurrence_days}d)` : ''}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600 font-semibold">{fmtDate(nextDate.toISOString().split('T')[0])}</td>
                                                    <td className="px-3 py-3 text-slate-600 font-semibold">{(s.attendance || []).length}</td>
                                                    <td className="px-3 py-3">
                                                        <button onClick={(e) => { e.stopPropagation(); setSessionPanel(s); }} aria-label="Editar sesión"
                                                            className="size-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-95">
                                                            <span className="material-symbols-outlined text-base">edit</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
            <>
            <section aria-label="Indicadores de capacitación" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'sessions', label: 'Sesiones en cronograma', value: kpis.sessions, icon: 'event_repeat', iconColor: '#ec5b13' },
                    { key: 'questions', label: 'Preguntas del examen', value: kpis.questions, icon: 'quiz', iconColor: '#94a3b8' },
                    { key: 'compliant', label: 'Pilotos al día', value: kpis.compliant, icon: 'check_circle', iconColor: '#16a34a' },
                    { key: 'overdue', label: 'Reprobados/vencidos', value: kpis.overdue, icon: 'warning', iconColor: kpis.overdue > 0 ? '#dc2626' : '#94a3b8' },
                ]} />
            </section>

            {!canManage && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                    <span className="text-[11px] font-semibold text-orange-800 leading-snug">
                        Solo lectura — Gerente General, Gerente SMS y Jefe de Pilotos administran el cronograma y el examen.
                    </span>
                </div>
            )}

            {myCompliance && activeType === 'operaciones' && (
                <div className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
                    myCompliance.compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-2xl ${STATUS_META[myCompliance.status].cls}`}>{STATUS_META[myCompliance.status].icon}</span>
                        <div>
                            <p className={`text-xs font-black uppercase ${STATUS_META[myCompliance.status].cls}`}>Tu examen de Operaciones: {STATUS_META[myCompliance.status].label}</p>
                            <p className="text-[11px] text-slate-500 font-semibold">Intentos usados: {myCompliance.attemptsUsed}/{myCompliance.maxAttempts} · Ciclo hasta {fmtDate(myCompliance.cycleEnd)}</p>
                        </div>
                    </div>
                    {!myCompliance.compliant || myCompliance.status === 'pending' ? (
                        <Link href={`/dashboard/training/exam?type=${activeType}`}
                            className="shrink-0 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow shadow-orange-600/20 transition-all active:scale-95">
                            Presentar examen
                        </Link>
                    ) : null}
                </div>
            )}

            {/* ── Cronograma de capacitación ───────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 md:px-7 py-4 border-b border-slate-100">
                    <p className="text-sm font-black text-slate-900">Cronograma de Capacitación — {TYPE_LABELS[activeType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tema que se dictará en cada sesión y la recurrencia que defina la organización.</p>
                </div>

                {canManage && (
                    <form onSubmit={handleAddSession} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-4 bg-slate-50 border-b border-slate-100">
                        <input required placeholder="Tema de la sesión" className={inputCls + ' lg:col-span-2'}
                            value={sessionForm.topic} onChange={e => setSessionForm({ ...sessionForm, topic: e.target.value })} />
                        <select className={inputCls} value={sessionForm.recurrence} onChange={e => setSessionForm({ ...sessionForm, recurrence: e.target.value })}>
                            {RECURRENCES.map(r => <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>)}
                        </select>
                        {sessionForm.recurrence === 'personalizado' ? (
                            <input type="number" min="1" placeholder="Cada N días" className={inputCls}
                                value={sessionForm.recurrence_days} onChange={e => setSessionForm({ ...sessionForm, recurrence_days: e.target.value })} />
                        ) : (
                            <input type="date" className={inputCls}
                                value={sessionForm.start_date} onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })} />
                        )}
                        <button type="submit" disabled={addingSession}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Agregar
                        </button>
                    </form>
                )}

                {(sessions[activeType] || []).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-10">Sin sesiones en el cronograma todavía.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <th className="px-5 py-3">Tema</th>
                                    <th className="px-3 py-3">Recurrencia</th>
                                    <th className="px-3 py-3">Próxima sesión</th>
                                    {canManage && <th className="px-3 py-3 w-14"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sessions[activeType].map(s => {
                                    const { cycleStart } = currentCycle(s);
                                    return (
                                        <tr key={s.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3 font-bold text-slate-800">{s.topic}</td>
                                            <td className="px-3 py-3 text-slate-600 font-semibold">
                                                {RECURRENCE_LABELS[s.recurrence]}{s.recurrence === 'personalizado' ? ` (cada ${s.recurrence_days}d)` : ''}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 font-semibold">{fmtDate(cycleStart.toISOString().split('T')[0])}</td>
                                            {canManage && (
                                                <td className="px-3 py-3">
                                                    <button onClick={() => handleDeleteSession(s)} aria-label="Eliminar sesión"
                                                        className="size-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-colors active:scale-95">
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Examen — configuración + banco de preguntas ─────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
                <div>
                    <p className="text-sm font-black text-slate-900">Evaluación Interna — {TYPE_LABELS[activeType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Examen recurrente que se alerta a los pilotos; si no aprueban o vencen el plazo, no pueden despachar vuelos.
                    </p>
                </div>

                {canManage && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="space-y-1 md:col-span-2">
                                <label className={labelCls}>Título</label>
                                <input className={inputCls} placeholder={`Examen de ${TYPE_LABELS[activeType]}`}
                                    value={examForm[activeType].title} onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], title: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Recurrencia</label>
                                <select className={inputCls} value={examForm[activeType].recurrence}
                                    onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], recurrence: e.target.value } }))}>
                                    {RECURRENCES.map(r => <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>)}
                                </select>
                            </div>
                            {examForm[activeType].recurrence === 'personalizado' ? (
                                <div className="space-y-1">
                                    <label className={labelCls}>Cada N días</label>
                                    <input type="number" min="1" className={inputCls} value={examForm[activeType].recurrence_days}
                                        onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], recurrence_days: e.target.value } }))} />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className={labelCls}>Fecha inicio</label>
                                    <input type="date" className={inputCls} value={examForm[activeType].start_date}
                                        onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], start_date: e.target.value } }))} />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className={labelCls}>Nota mínima (%)</label>
                                <input type="number" min="0" max="100" className={inputCls} value={examForm[activeType].passing_score}
                                    onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], passing_score: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Intentos máximos</label>
                                <input type="number" min="1" className={inputCls} value={examForm[activeType].max_attempts}
                                    onChange={e => setExamForm(prev => ({ ...prev, [activeType]: { ...prev[activeType], max_attempts: e.target.value } }))} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={handleSaveExam} disabled={savingExam}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                                <span className="material-symbols-outlined text-base">save</span>
                                {savingExam ? 'Guardando...' : 'Guardar configuración'}
                            </button>
                        </div>

                        {!exam ? (
                            <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-4 text-center">
                                Guarda la configuración para poder agregar preguntas al examen.
                            </p>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                    <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Banco de preguntas</span>
                                    <span className="text-[10.5px] font-semibold text-slate-400">{questionDrafts[activeType].length} pregunta(s)</span>
                                </div>
                                <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {questionDrafts[activeType].map((q, qIdx) => (
                                        <div key={qIdx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="size-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{qIdx + 1}</span>
                                                <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                                                    placeholder="Texto de la pregunta"
                                                    value={q.question_text} onChange={e => updateQuestion(qIdx, { question_text: e.target.value })} />
                                                <button type="button" onClick={() => handleDeleteQuestion(qIdx)}
                                                    className="size-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 transition-colors shrink-0">
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                                                {q.options.map((opt, oIdx) => (
                                                    <label key={oIdx} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer ${q.correct_index === oIdx ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                                        <input type="radio" name={`correct-${activeType}-${qIdx}`} checked={q.correct_index === oIdx}
                                                            onChange={() => updateQuestion(qIdx, { correct_index: oIdx })} className="accent-emerald-600 shrink-0" />
                                                        <input className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 outline-none"
                                                            placeholder={`Opción ${oIdx + 1}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addQuestion}
                                        className="flex items-center gap-1.5 px-2 py-2 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors">
                                        <span className="material-symbols-outlined text-base">add_circle</span>
                                        Agregar pregunta
                                    </button>
                                </div>
                                <div className="flex justify-end px-4 py-3 border-t border-slate-200 bg-white">
                                    <button type="button" onClick={handleSaveQuestions} disabled={savingQuestions}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wide shadow transition-all active:scale-95 disabled:opacity-50">
                                        <span className="material-symbols-outlined text-base">save</span>
                                        {savingQuestions ? 'Guardando...' : 'Guardar preguntas'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Tabla de cumplimiento por piloto */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Cumplimiento por tripulante</span>
                    </div>
                    {!exam ? (
                        <p className="text-xs font-bold text-slate-400 text-center py-8">Sin examen configurado todavía.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                        <th className="px-5 py-3">Tripulante</th>
                                        <th className="px-3 py-3">Estado</th>
                                        <th className="px-3 py-3">Intentos</th>
                                        <th className="px-3 py-3">Último puntaje</th>
                                        <th className="px-3 py-3">Ciclo hasta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complianceRows.map(({ pilot, compliance, lastAttempt }) => {
                                        const meta = STATUS_META[compliance.status];
                                        return (
                                            <tr key={pilot.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3 font-bold text-slate-800">{pilot.name}</td>
                                                <td className="px-3 py-3">
                                                    <span className={`flex items-center gap-1 font-black ${meta.cls}`}>
                                                        <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-slate-600 font-semibold">{compliance.attemptsUsed}/{compliance.maxAttempts}</td>
                                                <td className="px-3 py-3 text-slate-600 font-semibold">{lastAttempt ? `${Number(lastAttempt.score).toFixed(0)}%` : '—'}</td>
                                                <td className="px-3 py-3 text-slate-500 font-semibold">{fmtDate(compliance.cycleEnd)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            </>
            )}

            {sessionPanel && (
                <AddSmsSessionPanel
                    session={sessionPanel === 'new' ? null : sessionPanel}
                    onClose={() => setSessionPanel(null)}
                    onSuccess={() => { setSessionPanel(null); loadSmsSessions(); }}
                />
            )}

            {attendancePanel && (
                <SmsAttendancePanel
                    session={smsSessions.find(s => s.id === attendancePanel.id) || attendancePanel}
                    onClose={() => setAttendancePanel(null)}
                    onSuccess={loadSmsSessions}
                />
            )}
        </div>
    );
}
