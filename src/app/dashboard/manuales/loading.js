function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function ManualesLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-5">
        <div className="space-y-2">
          <Bone className="h-8 w-64" />
          <Bone className="h-3 w-40" />
        </div>
        <Bone className="h-12 w-44 rounded-2xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Bone className="size-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
            <Bone className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
