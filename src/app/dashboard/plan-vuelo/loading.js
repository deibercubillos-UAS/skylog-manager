function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function PlanVueloLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bone className="size-10 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-3 w-56" />
        </div>
      </div>

      {/* Datos de la operación */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-5">
        <Bone className="h-3 w-32" />
        <div className="space-y-1.5">
          <Bone className="h-3 w-24" />
          <Bone className="h-12 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Bone className="h-3 w-20" />
            <Bone className="h-12 w-full rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <Bone className="h-3 w-24" />
            <Bone className="h-12 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Bone className="h-3 w-32" />
          <Bone className="h-24 w-full rounded-2xl" />
        </div>
      </div>

      {/* Zona de vuelo */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-5">
        <Bone className="h-3 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <Bone key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Bone className="h-12 w-full rounded-2xl border-2 border-dashed" />
      </div>

      {/* Descarga */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4">
        <div className="flex gap-3">
          <Bone className="size-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-full" />
          </div>
        </div>
        <Bone className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
