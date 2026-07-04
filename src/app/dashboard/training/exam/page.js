'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import PageHero from '@/components/PageHero';

const TYPE_LABELS = { operaciones: 'Operaciones', mantenimiento: 'Mantenimiento' };

function ExamPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') === 'mantenimiento' ? 'mantenimiento' : 'operaciones';

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [compliance, setCompliance] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/training/exam?type=${type}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Error al cargar el examen');
                if (!cancelled) {
                    setExam(data.exam);
                    setQuestions(data.questions || []);
                    setCompliance(data.compliance || null);
                }
            } catch (e) {
                if (!cancelled) toast.error(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [type]);

    const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] != null);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = { type, answers: questions.map(q => ({ question_id: q.id, selected_index: answers[q.id] })) };
            const res = await fetch('/api/training/exam', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Error al enviar el examen');
            setResult(data);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">Cargando examen...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6 text-left animate-in fade-in duration-500 pb-24">
            <PageHero eyebrow="Cumplimiento" title={`Examen de ${TYPE_LABELS[type]}`} description="Evaluación interna recurrente." />

            {!exam ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-slate-300">quiz</span>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay un examen configurado todavía.</p>
                </div>
            ) : result ? (
                <div className={`bg-white border rounded-2xl p-8 text-center space-y-4 ${result.passed ? 'border-emerald-200' : 'border-red-200'}`}>
                    <span className={`material-symbols-outlined text-5xl ${result.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                        {result.passed ? 'check_circle' : 'cancel'}
                    </span>
                    <p className={`text-lg font-black uppercase ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {result.passed ? 'Aprobado' : 'No aprobado'}
                    </p>
                    <p className="text-sm font-bold text-slate-600">Puntaje: {result.score}% ({result.correctCount}/{result.total} correctas)</p>
                    <button onClick={() => router.push('/dashboard/training')}
                        className="mt-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wide transition-all active:scale-95">
                        Volver a Capacitación
                    </button>
                </div>
            ) : compliance?.status === 'ok' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                    <p className="text-sm font-black text-emerald-700 uppercase">Ya aprobaste el ciclo vigente</p>
                    <p className="text-xs text-slate-500 font-semibold">Ciclo hasta {compliance.cycleEnd}</p>
                </div>
            ) : compliance?.attemptsLeft <= 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-red-500">block</span>
                    <p className="text-sm font-black text-red-700 uppercase">Agotaste los intentos de este ciclo</p>
                    <p className="text-xs text-slate-500 font-semibold">Contacta a tu Jefe de Pilotos — ciclo hasta {compliance.cycleEnd}</p>
                </div>
            ) : questions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-slate-300">quiz</span>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">El examen todavía no tiene preguntas.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4">
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{exam.title}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">Nota mínima: {exam.passing_score}% · Intentos restantes: {compliance.attemptsLeft}/{compliance.maxAttempts}</p>
                        </div>
                    </div>

                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                            <p className="text-sm font-bold text-slate-800">{idx + 1}. {q.question_text}</p>
                            <div className="space-y-2">
                                {q.options.map((opt, oIdx) => (
                                    <label key={oIdx} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        answers[q.id] === oIdx ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'
                                    }`}>
                                        <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === oIdx}
                                            onChange={() => setAnswers(prev => ({ ...prev, [q.id]: oIdx }))} className="accent-orange-600" />
                                        <span className="text-xs font-semibold text-slate-700">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button onClick={handleSubmit} disabled={!allAnswered || submitting}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:bg-slate-200 transition-all active:scale-95">
                        {submitting ? 'Enviando...' : 'Enviar examen'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ExamPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">Cargando...</div>}>
            <ExamPageInner />
        </Suspense>
    );
}
