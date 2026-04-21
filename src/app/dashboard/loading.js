export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Skeleton del Título */}
      <div className="h-10 w-1/3 bg-slate-200 rounded-lg"></div>
      
      {/* Skeleton de las Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200"></div>
        ))}
      </div>

      {/* Skeleton del Contenido Principal */}
      <div className="h-64 bg-slate-50 rounded-[2.5rem] border border-slate-200"></div>
    </div>
  );
}