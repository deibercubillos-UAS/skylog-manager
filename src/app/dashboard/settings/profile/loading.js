function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="border-b pb-6 flex justify-between items-end">
        <div className="space-y-2">
          <Bone className="h-8 w-36" />
          <Bone className="h-4 w-64" />
        </div>
        <Bone className="h-7 w-28 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center gap-4">
            <Bone className="size-32 rounded-full" />
            <Bone className="h-9 w-44 rounded-xl" />
            <Bone className="h-4 w-32" />
            <Bone className="h-3 w-40" />
          </div>
          <div className="bg-slate-800/20 p-8 rounded-[2.5rem] space-y-4">
            <Bone className="h-3 w-24 bg-slate-300" />
            <Bone className="h-10 w-full rounded-xl bg-slate-300" />
            <Bone className="h-10 w-full rounded-xl bg-slate-300" />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <Bone className="h-3 w-52" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Bone key={i} className="h-12 rounded-2xl" />
            ))}
            <Bone className="h-16 col-span-full rounded-2xl" />
          </div>

          <Bone className="h-3 w-44 mt-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <Bone key={i} className="h-12 rounded-2xl" />
            ))}
          </div>

          <Bone className="h-14 w-full rounded-[2rem] mt-2" />
        </div>
      </div>
    </div>
  );
}
