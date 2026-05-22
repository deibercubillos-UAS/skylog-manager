function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function FleetLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-44" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-12 w-48 rounded-2xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <Bone className="h-3 w-20" />
            <Bone className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Bone className="size-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-20" />
              </div>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-4/5" />
            </div>
            <div className="flex gap-2 pt-1">
              <Bone className="h-9 flex-1 rounded-xl" />
              <Bone className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
