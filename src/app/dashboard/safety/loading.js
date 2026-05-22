function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function SafetyLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-3 w-44" />
        </div>
        <Bone className="h-12 w-48 rounded-2xl" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bone className="size-8 rounded-xl" />
              <Bone className="h-3 w-28" />
            </div>
            <Bone className="h-9 w-20" />
            <Bone className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Incidents table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
          <Bone className="h-4 w-36" />
          <Bone className="h-9 w-36 rounded-xl" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center gap-4">
            <Bone className="h-6 w-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-6 w-24 rounded-full hidden sm:block" />
            <Bone className="h-3 w-24 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
