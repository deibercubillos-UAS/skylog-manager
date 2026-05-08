function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pb-20 px-2 md:px-0">
      {/* Header */}
      <div className="border-b pb-6 space-y-2">
        <Bone className="h-8 w-64" />
        <Bone className="h-3 w-52" />
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center gap-5">
            <Bone className="size-32 rounded-3xl" />
            <Bone className="h-9 w-44 rounded-xl" />
          </div>
          <div className="bg-slate-800/20 p-8 rounded-[2rem] space-y-3">
            <Bone className="h-3 w-24 bg-slate-300" />
            <Bone className="h-7 w-36 bg-slate-300" />
            <Bone className="h-3 w-full bg-slate-300 mt-4" />
            <Bone className="h-3 w-3/4 bg-slate-300" />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <Bone className="h-3 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Bone className="h-12 col-span-full rounded-2xl" />
            {[...Array(4)].map((_, i) => (
              <Bone key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
          <Bone className="h-3 w-48 mt-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <Bone key={i} className={`h-12 rounded-2xl ${i === 2 ? 'col-span-full' : ''}`} />
            ))}
          </div>
          <Bone className="h-14 w-full rounded-2xl mt-2" />
        </div>
      </div>

      {/* Insurance policies skeleton */}
      <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div className="space-y-2">
            <Bone className="h-5 w-40" />
            <Bone className="h-3 w-28" />
          </div>
          <Bone className="h-9 w-32 rounded-xl" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="hidden md:flex gap-6 items-center py-2 border-b border-slate-100 last:border-0">
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-28 font-mono" />
            <Bone className="h-4 w-44" />
            <Bone className="h-4 w-28" />
            <Bone className="h-6 w-20 rounded-full ml-auto" />
            <Bone className="h-8 w-16 rounded-xl" />
          </div>
        ))}
        {/* Mobile cards */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="md:hidden space-y-2 py-3 border-b border-slate-100">
            <div className="flex justify-between">
              <Bone className="h-4 w-32" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <Bone className="h-3 w-48" />
            <Bone className="h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
