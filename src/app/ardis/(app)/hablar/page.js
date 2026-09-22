'use client';

import { useCallback, useRef, useState } from 'react';

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

function normalizeGoodbye(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function describeIntent(intent) {
  if (!intent) return '';
  switch (intent.type) {
    case 'create_task': {
      const parts = [`Crear tarea: "${intent.title}"`];
      if (intent.area) parts.push(intent.area);
      const date = formatDate(intent.dueAt);
      if (date) parts.push(date);
      if (intent.recurrence) parts.push(`recurrente (${intent.recurrence})`);
      if (intent.waitingFor) parts.push(`delegada a ${intent.waitingFor}`);
      return parts.join(' — ');
    }
    case 'complete_task':
      return `Marcar como hecha: "${intent.title}"`;
    case 'postpone_task':
      return `Posponer "${intent.title}" a ${formatDate(intent.dueAt) || '(no interpreté la fecha)'}`;
    case 'progress_update':
      return `Consultar avance de "${intent.target}"`;
    case 'next_task':
      return 'Ver la siguiente tarea';
    case 'daily_summary':
      return 'Ver el resumen del día';
    case 'day_close':
      return 'Ver el cierre del día';
    case 'unknown':
      return 'No entendí ese comando';
    default:
      return intent.type;
  }
}

const EDITABLE_FIELD_BY_TYPE = {
  create_task: 'title',
  complete_task: 'title',
  postpone_task: 'title',
  progress_update: 'target',
};

export default function ArdisHablarPage() {
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | reviewing | speaking | error
  const [transcript, setTranscript] = useState('');
  const [pending, setPending] = useState(null); // { intent, source, rawText }
  const [editedValue, setEditedValue] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [continuous, setContinuous] = useState(false);

  const recognitionRef = useRef(null);
  const continuousRef = useRef(false);

  const startListening = useCallback((onResult) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Este navegador no soporta reconocimiento de voz. Prueba Chrome.');
      setStatus('error');
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      onResult(text);
    };
    recognition.onerror = () => {
      setError('No pude escuchar bien, intenta de nuevo.');
      setStatus('idle');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setStatus('listening');
    setError('');
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const askArdis = useCallback(async (text) => {
    setTranscript(text);
    setStatus('thinking');
    try {
      const res = await fetch('/api/ardis/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error interpretando el comando');
        setStatus('idle');
        return;
      }
      setPending(data);
      setEditedValue(data.intent?.[EDITABLE_FIELD_BY_TYPE[data.intent?.type]] || '');
      setStatus('reviewing');
    } catch {
      setError('Error de red hablando con ARDIS');
      setStatus('idle');
    }
  }, []);

  const handleVoiceResult = useCallback(
    (text) => {
      if (!text.trim()) {
        setStatus('idle');
        return;
      }
      if (continuousRef.current && normalizeGoodbye(text).includes('gracias ardis')) {
        continuousRef.current = false;
        setContinuous(false);
        speak('Hasta luego').then(() => setStatus('idle'));
        return;
      }
      askArdis(text);
    },
    [askArdis]
  );

  const handlePushToTalkStart = () => startListening(handleVoiceResult);
  const handlePushToTalkEnd = () => stopListening();

  const toggleContinuous = () => {
    if (continuousRef.current) {
      continuousRef.current = false;
      setContinuous(false);
      stopListening();
      setStatus('idle');
      return;
    }
    continuousRef.current = true;
    setContinuous(true);
    startListening(handleVoiceResult);
  };

  const resumeContinuousIfNeeded = useCallback(() => {
    if (continuousRef.current) {
      startListening(handleVoiceResult);
    } else {
      setStatus('idle');
    }
  }, [startListening, handleVoiceResult]);

  const confirmIntent = async (confirmed) => {
    if (!pending) return;

    if (!confirmed) {
      setPending(null);
      setStatus('speaking');
      await speak('Cancelado');
      resumeContinuousIfNeeded();
      return;
    }

    const field = EDITABLE_FIELD_BY_TYPE[pending.intent.type];
    const edited = field ? editedValue !== (pending.intent[field] || '') : false;
    const intentToSend = field ? { ...pending.intent, [field]: editedValue } : pending.intent;

    setStatus('thinking');
    try {
      const res = await fetch('/api/ardis/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: intentToSend,
          rawText: pending.rawText,
          source: pending.source,
          edited,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error ejecutando la acción');
        setStatus('idle');
        return;
      }
      setReply(data.reply || '');
      setPending(null);
      setStatus('speaking');
      await speak(data.reply || 'Listo');
      resumeContinuousIfNeeded();
    } catch {
      setError('Error de red confirmando la acción');
      setStatus('idle');
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col items-center gap-6 px-6 pt-8">
      <h1 className="text-xl font-semibold text-white">Hablar con ARDIS</h1>

      <p className="max-w-xs text-center text-sm text-white/50">
        {status === 'listening' && 'Escuchando…'}
        {status === 'thinking' && 'Pensando…'}
        {status === 'speaking' && 'Respondiendo…'}
        {status === 'idle' && 'Mantén presionado para hablar, o activa conversación continua.'}
        {status === 'reviewing' && 'Revisa antes de confirmar'}
        {status === 'error' && 'Este navegador no soporta reconocimiento de voz (usa Chrome).'}
      </p>

      {/* Indicador de estado */}
      {(status === 'listening' || status === 'thinking' || status === 'speaking') && (
        <div className="relative flex h-24 w-24 items-center justify-center">
          {status === 'listening' && (
            <>
              <span className="absolute h-24 w-24 animate-ping rounded-full bg-primary/30" />
              <span className="absolute h-16 w-16 animate-ping rounded-full bg-primary/40 [animation-delay:150ms]" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                <span className="material-symbols-outlined text-2xl">mic</span>
              </span>
            </>
          )}
          {status === 'thinking' && (
            <span className="h-14 w-14 animate-spin rounded-full border-4 border-white/15 border-t-primary" />
          )}
          {status === 'speaking' && (
            <div className="flex items-end gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-2 animate-pulse rounded-full bg-primary"
                  style={{ height: `${16 + (i % 2) * 20}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {transcript && status !== 'idle' && (
        <p className="max-w-xs text-center text-sm italic text-white/60">&ldquo;{transcript}&rdquo;</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {status === 'reviewing' && pending && (
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <span className="w-fit rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
            {pending.source === 'parser' ? 'Reconocido directo' : pending.source === 'learned' ? 'Frase aprendida' : 'Gemini'}
          </span>
          <p className="text-sm text-white">{describeIntent(pending.intent)}</p>

          {EDITABLE_FIELD_BY_TYPE[pending.intent.type] && (
            <input
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="rounded-lg border border-white/15 bg-navy px-3 py-2 text-sm text-white"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => confirmIntent(true)}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white"
            >
              Confirmar
            </button>
            <button
              onClick={() => confirmIntent(false)}
              className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {reply && status === 'idle' && <p className="max-w-xs text-center text-sm text-white/50">{reply}</p>}

      {(status === 'idle' || status === 'listening') && (
        <div className="mt-auto flex flex-col items-center gap-3 pb-4">
          <button
            onMouseDown={handlePushToTalkStart}
            onMouseUp={handlePushToTalkEnd}
            onTouchStart={handlePushToTalkStart}
            onTouchEnd={handlePushToTalkEnd}
            disabled={continuous}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-white transition
                        ${status === 'listening' ? 'bg-primary' : 'bg-white/10'}
                        ${continuous ? 'cursor-not-allowed opacity-40' : 'active:scale-95'}`}
          >
            <span className="material-symbols-outlined text-3xl">mic</span>
          </button>
          <span className="text-xs text-white/40">Pulsar para hablar</span>

          <button
            onClick={toggleContinuous}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition
                        ${continuous ? 'border-primary bg-primary text-white' : 'border-white/20 text-white/70'}`}
          >
            {continuous ? 'Conversación activa — di "gracias ARDIS" para salir' : 'Iniciar conversación'}
          </button>
        </div>
      )}
    </main>
  );
}
