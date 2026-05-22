function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-40" />
          <Bone className="h-3 w-48" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[...Array(3)].map((_, i) => (
          <Bone key={i} className="h-10 w-28 rounded-xl" />
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Bone className="size-10 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-56" />
                <Bone className="h-3 w-44" />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Bone className="h-10 flex-1 rounded-xl" />
              <Bone className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
