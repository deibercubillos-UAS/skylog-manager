function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Saludo */}
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-64" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-5 md:p-8 space-y-4">
            <div className="flex justify-between">
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-6 rounded-lg" />
            </div>
            <Bone className="h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Chart + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 h-[380px] md:h-[450px] flex flex-col gap-6">
          <div className="space-y-2">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-24" />
          </div>
          <div className="flex-1 flex items-end justify-around gap-2 pb-4 border-b border-slate-100">
            {[40, 70, 50, 85, 60, 90].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 justify-end h-full">
                <div className="w-full max-w-[40px] bg-slate-100 rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                <Bone className="h-2 w-6" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-[2.5rem] h-[380px] md:h-[450px] p-8 md:p-10 flex flex-col gap-4 animate-pulse">
          <Bone className="h-4 w-24 bg-slate-600" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-700/30 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/30 flex justify-between">
          <Bone className="h-3 w-32" />
          <Bone className="h-3 w-20" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-8 px-8 py-6 border-b border-slate-100 last:border-0">
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-20" />
            <Bone className="h-6 w-20 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
