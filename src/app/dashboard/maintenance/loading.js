function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function MaintenanceLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-52" />
          <Bone className="h-3 w-40" />
        </div>
        <Bone className="h-12 w-52 rounded-2xl" />
      </div>

      {/* Alerts banner */}
      <Bone className="h-16 w-full rounded-2xl" />

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
          <Bone className="h-4 w-40" />
          <Bone className="h-8 w-32 rounded-xl" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center gap-4">
            <Bone className="size-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-6 w-24 rounded-full" />
            <Bone className="h-4 w-28 hidden sm:block" />
            <Bone className="h-9 w-28 rounded-xl hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
