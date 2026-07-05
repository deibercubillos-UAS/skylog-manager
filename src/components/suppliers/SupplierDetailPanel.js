'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { generateSupplierAuditDetailReport } from '@/lib/reportGenerators';
import { fetchLogoDataUrl } from '@/lib/docUrl';

function scoreOf(audit, criteriaCount) {
  const responses = audit.responses || {};
  const values = Object.values(responses).filter(r => r?.value);
  const applicable = values.filter(v => v.value !== 'no_aplica');
  const compliant = applicable.filter(v => v.value === 'cumple');
  if (!applicable.length) return null;
  return Math.round((compliant.length / applicable.length) * 100);
}

export default function SupplierDetailPanel({ supplier, criteria, orgName, logoUrl, onClose, onEditSupplier, onOpenAudit, onNewAudit, refreshKey }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/suppliers/audits?supplier_id=${supplier.id}`).then(r => r.json())
      .then(d => setAudits(Array.isArray(d) ? d : []))
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [supplier.id, refreshKey]);

  const deleteAudit = async (id) => {
    try {
      const res = await fetch(`/api/suppliers/audits/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la auditoría.');
      toast.success('Auditoría eliminada.');
      load();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const downloadAudit = async (auditId) => {
    setDownloadingId(auditId);
    try {
      const res = await fetch(`/api/suppliers/audits/${auditId}`);
      const detail = await res.json();
      if (!res.ok) throw new Error(detail.error || 'Error al cargar la auditoría.');
      const logo = await fetchLogoDataUrl(logoUrl).catch(() => null);
      generateSupplierAuditDetailReport(detail, {
        orgName,
        logo,
        downloadedAt: new Date().toLocaleString('es-CO'),
      });
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Proveedores</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">{supplier.name}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">{supplier.category || 'Proveedor'}</p>
            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{supplier.name}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {supplier.contact_name || 'Sin contacto registrado'}{supplier.contact_phone ? ` · ${supplier.contact_phone}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => onEditSupplier(supplier)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wide transition-all shrink-0">
            <span className="material-symbols-outlined text-base">edit</span>
            Editar proveedor
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-wide text-orange-600">Historial de auditorías</p>
          <button type="button" onClick={() => onNewAudit(supplier)}
            className="flex items-center gap-1.5 text-xs font-black text-orange-600 hover:text-orange-700 transition-colors">
            <span className="material-symbols-outlined text-base">add_circle</span>
            Nueva auditoría
          </button>
        </div>

        {loading ? (
          <p className="text-center text-xs font-black text-slate-300 uppercase tracking-widest py-10 animate-pulse">Cargando...</p>
        ) : audits.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-10">Este proveedor aún no tiene auditorías registradas.</p>
        ) : (
          <div className="space-y-2">
            {audits.map(a => {
              const score = scoreOf(a, criteria.length);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">{new Date(a.audit_date).toLocaleDateString('es-CO')}</p>
                    <p className="text-[11px] font-semibold text-slate-400 truncate">{a.auditor_name || 'Sin auditor registrado'}</p>
                  </div>
                  {score !== null && (
                    <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black uppercase shrink-0 ${score >= 80 ? 'bg-emerald-50 text-emerald-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {score}%
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => onOpenAudit(supplier, a)} title="Ver / editar"
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button type="button" onClick={() => downloadAudit(a.id)} disabled={downloadingId === a.id} title="Descargar PDF"
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-all disabled:opacity-50">
                      <span className="material-symbols-outlined text-base">{downloadingId === a.id ? 'progress_activity' : 'picture_as_pdf'}</span>
                    </button>
                    <button type="button" onClick={() => deleteAudit(a.id)} title="Eliminar"
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cerrar
        </button>
      </div>
    </aside>
  );
}
