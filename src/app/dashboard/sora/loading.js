function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function SoraLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-3 w-56" />
        </div>
        <Bone className="h-12 w-52 rounded-2xl" />
      </div>

      {/* Wizard steps */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(5)].map((_, i) => (
          <Bone key={i} className="h-10 w-28 rounded-2xl shrink-0" />
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 space-y-6">
        <div className="space-y-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-11 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <Bone className="h-3 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Bone key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
        </div>
        <Bone className="h-12 w-full rounded-2xl" />
      </div>

      {/* Assessments list */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b">
          <Bone className="h-4 w-40" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center gap-4">
            <Bone className="size-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-28" />
            </div>
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-9 w-24 rounded-xl hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
