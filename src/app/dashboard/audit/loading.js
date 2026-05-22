function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function AuditLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-36" />
          <Bone className="h-3 w-52" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-11 w-32 rounded-xl" />
          <Bone className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-16" />
            <Bone className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b">
          <Bone className="h-4 w-32" />
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-6 py-3.5 border-b border-slate-100 last:border-0 flex items-center gap-4">
            <Bone className="h-3 w-32 shrink-0" />
            <Bone className="h-6 w-20 rounded-full shrink-0" />
            <Bone className="h-3 flex-1" />
            <Bone className="h-3 w-24 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
