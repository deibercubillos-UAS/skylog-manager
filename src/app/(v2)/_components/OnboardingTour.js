'use client';

// Skylog V2.0 — tutorial de bienvenida en el primer ingreso (pedido del
// usuario: "letreros" paso a paso, máximo 8). Mismo patrón que
// CookieConsentManager/WelcomeInviteModal (v1): se guarda en localStorage
// por navegador/dispositivo, no en una tabla — es una conveniencia de UI,
// no un dato que deba sincronizarse entre dispositivos del mismo usuario.
// Solo se marca "visto" al cerrarlo (Saltar o Finalizar) — si el usuario
// cierra la pestaña a mitad de camino, vuelve a aparecer la próxima vez.

import { useEffect, useState } from 'react';
import { Button } from '@skylog/ui';

const STORAGE_KEY = 'bitafly_v2_onboarding_seen';

// Máximo 8 — refleja los 4 grupos reales del sidebar (V2Layout) más
// bienvenida/cuenta, nunca un módulo que V2 no tenga construido.
const STEPS = [
  {
    icon: 'flight',
    title: '¡Bienvenido a BitaFly!',
    body: 'Aquí llevas el registro completo de tu operación con drones: vuelos, flota, tripulación y cumplimiento SMS, todo en un solo lugar. Este tutorial te muestra en qué consiste cada sección — tardas menos de un minuto.',
  },
  {
    icon: 'hub',
    title: 'Centro de Control',
    body: 'Tu panorama del día: qué misiones hay programadas, qué vuelos ya se registraron, el estado de la flota y qué queda pendiente de cerrar.',
  },
  {
    icon: 'menu_book',
    title: 'Operación',
    body: 'Bitácora y Libro de vuelo, Programación de misiones, Meteorología y Tiempo de servicio — todo lo que pasa antes, durante y después de cada vuelo.',
  },
  {
    icon: 'flight',
    title: 'Flota & Equipo',
    body: 'La ficha de cada aeronave, baterías y componentes, mantenimiento programado, tu equipo técnico (ETA) y la tripulación de la organización.',
  },
  {
    icon: 'health_and_safety',
    title: 'SMS — Seguridad Operacional',
    body: 'Evaluación de riesgos, indicadores (SPI), reportes y seguimiento de casos, y un asistente que te guía paso a paso en la implantación de tu SMS.',
  },
  {
    icon: 'library_books',
    title: 'Documentación',
    body: 'Capacitación, listas de chequeo, proveedores, reportes y los manuales de tu organización — con versiones y acuse de lectura.',
  },
  {
    icon: 'apartment',
    title: 'Tu organización',
    body: 'Desde el menú de cuenta (abajo en el sidebar) gestionas tu organización, tu suscripción y tu perfil. Si perteneces a más de una organización, puedes cambiar entre ellas desde el encabezado.',
  },
  {
    icon: 'rocket_launch',
    title: 'Listo para empezar',
    body: 'Puedes volver a explorar cada sección desde el menú lateral cuando quieras. ¡Buen vuelo!',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage no disponible — no se muestra, no se bloquea nada
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // no-op
    }
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-navy-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-navy via-navy to-[#0f1420] px-6 pt-6 pb-10 relative">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-full text-navy-200 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar tutorial"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <div className="size-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary-900/30">
            <span className="material-symbols-outlined text-white text-2xl">{current.icon}</span>
          </div>
        </div>

        <div className="px-6 py-5 -mt-5 bg-white rounded-t-3xl relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 mb-1">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h3 className="text-lg font-black text-navy mb-2">{current.title}</h3>
          <p className="text-sm text-navy-500 leading-relaxed">{current.body}</p>

          <div className="flex items-center gap-1.5 mt-5">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-navy-100'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold text-navy-400 hover:text-navy-600 transition-colors"
            >
              Saltar tutorial
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  Atrás
                </Button>
              )}
              <Button variant="primary" onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}>
                {isLast ? 'Comenzar' : 'Siguiente'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
