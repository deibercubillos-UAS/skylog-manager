export default function AircraftCard({ drone }) {
  const isMaintenance = drone.status === "Mantenimiento";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex group hover:shadow-md transition-shadow">
      <div className="w-48 bg-slate-100 dark:bg-slate-900 relative">
        <div className={`absolute top-3 left-3 px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
          isMaintenance ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
          {drone.status}
        </div>
        <img 
          src={drone.image} 
          alt={drone.model} 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 p-5 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{drone.model}</h3>
            <p className="text-primary text-xs font-semibold">{drone.alias}</p>
          </div>
          <div className="circular-progress flex items-center justify-center text-[10px] font-bold" style={{ '--value': drone.health }}>
            {drone.health}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Serial Number</p>
            <p className="text-sm font-medium">{drone.sn}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Hours</p>
            <p className="text-sm font-medium">{drone.hours} h</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">MTOW</p>
            <p className="text-sm font-medium">{drone.mtow} kg</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Estado</p>
            <p className={`text-sm font-bold ${isMaintenance ? 'text-red-500' : 'text-primary'}`}>
              {isMaintenance ? 'Mantenimiento' : 'Operativo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}