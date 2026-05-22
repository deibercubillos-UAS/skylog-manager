function Bone({ className }) {
  return <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />;
}

export default function PilotsLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-4">
        <div className="space-y-2">
          <Bone className="h-8 w-44" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-12 w-44 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Bone className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <Bone className="h-3 w-24" />
                <Bone className="h-3 w-16" />
              </div>
              <div className="flex justify-between items-center">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
            <Bone className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
