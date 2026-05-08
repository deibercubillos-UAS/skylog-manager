function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function LogbookLoading() {
  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-52" />
          <Bone className="h-3 w-36" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-11 w-24 rounded-xl" />
          <Bone className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        {/* Column headers */}
        <div className="hidden md:flex gap-3 bg-slate-50 px-4 py-4 border-b">
          {[90, 110, 130, 110, 90, 90, 90, 110].map((w, i) => (
            <Bone key={i} className="h-3 rounded" style={{ width: w, flexShrink: 0 }} />
          ))}
        </div>
        {/* Filter row */}
        <div className="hidden md:flex gap-3 px-2 py-2 border-b-2 border-slate-100">
          {[...Array(8)].map((_, i) => (
            <Bone key={i} className="h-8 flex-1 rounded-lg" />
          ))}
        </div>

        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-slate-100 last:border-0">
            {/* Desktop row */}
            <div className="hidden md:flex gap-3 items-center">
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 flex-1 rounded" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 flex-1 font-mono" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-6 w-14 rounded-md" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 flex-1" />
            </div>
            {/* Mobile card */}
            <div className="md:hidden space-y-2">
              <div className="flex justify-between">
                <Bone className="h-4 w-24" />
                <Bone className="h-5 w-14 rounded" />
              </div>
              <Bone className="h-3 w-40" />
              <Bone className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
