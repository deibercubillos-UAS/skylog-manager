// ... (Tus imports actuales)
import EditAircraftPanel from '@/components/EditAircraftPanel';

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [editingAircraft, setEditingAircraft] = useState(null); // Nuevo estado
  const [showAddPanel, setShowAddPanel] = useState(false);
  
  // ... (Tu función fetchData se mantiene igual)

  return (
    <div className="space-y-8 text-left h-full relative">
      {/* ... Header igual ... */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {fleet.map(drone => (
          <div key={drone.id} className="relative group">
            <AircraftCard aircraft={drone} />
            {/* Botón flotante de edición */}
            <button 
              onClick={() => setEditingAircraft(drone)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all text-[#ec5b13] hover:bg-[#ec5b13] hover:text-white z-20"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
          </div>
        ))}
      </div>

      {/* PANEL DE EDICIÓN */}
      {editingAircraft && (
        <EditAircraftPanel 
          aircraft={editingAircraft} 
          onClose={() => setEditingAircraft(null)} 
          onSuccess={() => { setEditingAircraft(null); fetchData(); }} 
        />
      )}

      {/* ... Panel de agregar igual ... */}
    </div>
  );
}