export default function GridBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0c10]">
      {/* Resplandor radial naranja, arriba a la izquierda */}
      <div
        className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full opacity-25 blur-[100px]"
        style={{ background: 'radial-gradient(circle, #ec5b13 0%, transparent 70%)' }}
      />
      {/* Resplandor secundario, abajo a la derecha */}
      <div
        className="absolute -bottom-32 -right-20 h-[22rem] w-[22rem] rounded-full opacity-[0.12] blur-[100px]"
        style={{ background: 'radial-gradient(circle, #ec5b13 0%, transparent 70%)' }}
      />
      {/* Cuadrícula */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Viñeta para que los bordes se fundan con el fondo */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #0a0c10 100%)' }}
      />
    </div>
  );
}
