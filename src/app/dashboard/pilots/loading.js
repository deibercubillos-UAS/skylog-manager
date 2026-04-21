export default function PilotsLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8 flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-slate-200 rounded-md"></div>
          <div className="h-4 w-40 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-12 w-40 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 h-14 border-b border-slate-200"></div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-slate-100 rounded"></div>
                  <div className="h-3 w-24 bg-slate-50 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-32 bg-slate-100 rounded"></div>
              <div className="h-8 w-24 bg-slate-100 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}