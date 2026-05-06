'use client';

/**
 * ConfirmModal — reemplaza window.confirm() con un modal accesible
 *
 * Uso:
 *   const [confirm, setConfirm] = useState(null);
 *   <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />
 *
 *   // Para mostrar:
 *   setConfirm({
 *     isOpen: true,
 *     title: '¿Eliminar piloto?',
 *     message: 'Esta acción es irreversible.',
 *     confirmText: 'Eliminar',
 *     danger: true,
 *     onConfirm: () => { handleDelete(); setConfirm(null); },
 *   });
 */
export default function ConfirmModal({
  isOpen,
  title = '¿Confirmar acción?',
  message,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-200">
        {/* Icono */}
        <div className={`size-12 rounded-2xl flex items-center justify-center mb-5 ${danger ? 'bg-red-50' : 'bg-slate-100'}`}>
          <span className={`material-symbols-outlined text-2xl ${danger ? 'text-red-500' : 'text-slate-500'}`}>
            {danger ? 'delete' : 'info'}
          </span>
        </div>

        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-snug">
          {title}
        </h3>
        {message && (
          <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{message}</p>
        )}

        <div className="flex gap-3 mt-7">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-slate-300 active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all
              ${danger
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20'
                : 'bg-slate-900 hover:bg-orange-600 shadow-lg'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
