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
    <main
      style={{
        minHeight: '100vh',
        background: '#111318',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ARDIS — Hablar</h1>

      <p style={{ color: '#9a9a9a', fontSize: '0.9rem', textAlign: 'center', maxWidth: '28rem' }}>
        {status === 'listening' && 'Escuchando…'}
        {status === 'thinking' && 'Pensando…'}
        {status === 'speaking' && 'Respondiendo…'}
        {status === 'idle' && 'Mantén presionado para hablar, o activa conversación continua.'}
        {status === 'error' && 'Este navegador no soporta reconocimiento de voz (usa Chrome).'}
      </p>

      {transcript && status !== 'idle' && (
        <p style={{ color: '#ccc', fontStyle: 'italic', maxWidth: '28rem', textAlign: 'center' }}>
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}

      {status === 'reviewing' && pending && (
        <div
          style={{
            width: '100%',
            maxWidth: '28rem',
            background: '#1a1c22',
            border: '1px solid #333',
            borderRadius: '0.6rem',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9a9a9a' }}>
            Fuente: {pending.source === 'parser' ? 'reconocido directo' : pending.source === 'learned' ? 'frase aprendida' : 'Gemini'}
          </p>
          <p style={{ margin: 0 }}>{describeIntent(pending.intent)}</p>

          {EDITABLE_FIELD_BY_TYPE[pending.intent.type] && (
            <input
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              style={{
                padding: '0.5rem 0.6rem',
                borderRadius: '0.4rem',
                border: '1px solid #333',
                background: '#111318',
                color: '#f5f5f5',
              }}
            />
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => confirmIntent(true)}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '0.4rem',
                border: 'none',
                background: '#ec5b13',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Confirmar
            </button>
            <button
              onClick={() => confirmIntent(false)}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '0.4rem',
                border: '1px solid #444',
                background: 'transparent',
                color: '#f5f5f5',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {reply && status === 'idle' && (
        <p style={{ color: '#9a9a9a', fontSize: '0.85rem', maxWidth: '28rem', textAlign: 'center' }}>{reply}</p>
      )}

      {(status === 'idle' || status === 'listening') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <button
            onMouseDown={handlePushToTalkStart}
            onMouseUp={handlePushToTalkEnd}
            onTouchStart={handlePushToTalkStart}
            onTouchEnd={handlePushToTalkEnd}
            disabled={continuous}
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              border: 'none',
              background: status === 'listening' ? '#ec5b13' : '#2a2d35',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: continuous ? 'not-allowed' : 'pointer',
              opacity: continuous ? 0.4 : 1,
            }}
          >
            🎙
          </button>
          <span style={{ fontSize: '0.75rem', color: '#9a9a9a' }}>Pulsar para hablar</span>

          <button
            onClick={toggleContinuous}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '2rem',
              border: '1px solid #444',
              background: continuous ? '#ec5b13' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {continuous ? 'Conversación activa (di "gracias ARDIS" para salir)' : 'Iniciar conversación'}
          </button>
        </div>
      )}
    </main>
  );
}
