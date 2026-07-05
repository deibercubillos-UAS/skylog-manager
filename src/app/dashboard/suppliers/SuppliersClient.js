'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';
import { PERMISSIONS } from '@/lib/roles';

const SupplierPanel = dynamic(() => import('@/components/suppliers/SupplierPanel'), { ssr: false });
const CriteriaConfigPanel = dynamic(() => import('@/components/suppliers/CriteriaConfigPanel'), { ssr: false });
const SupplierDetailPanel = dynamic(() => import('@/components/suppliers/SupplierDetailPanel'), { ssr: false });
const AuditPanel = dynamic(() => import('@/components/suppliers/AuditPanel'), { ssr: false });

function scoreOf(audit) {
  const values = Object.values(audit.responses || {}).filter(r => r?.value);
  const applicable = values.filter(v => v.value !== 'no_aplica');
  if (!applicable.length) return null;
  const compliant = applicable.filter(v => v.value === 'cumple');
  return Math.round((compliant.length / applicable.length) * 100);
}

export default function SuppliersClient({ initialData }) {
  const canManage = PERMISSIONS.canManageSuppliers.includes(initialData.role);
  const [suppliers, setSuppliers] = useState(initialData.suppliers);
  const [criteria, setCriteria] = useState(initialData.criteria);
  const [audits, setAudits] = useState(initialData.audits);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [supplierPanel, setSupplierPanel] = useState(null); // null | 'new' | supplier
  const [criteriaPanelOpen, setCriteriaPanelOpen] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [auditPanel, setAuditPanel] = useState(null); // { supplier, audit? }

  const reloadAll = async () => {
    const [sRes, cRes, aRes] = await Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/suppliers/criteria').then(r => r.json()),
      fetch('/api/suppliers/audits').then(r => r.json()),
    ]);
    setSuppliers(Array.isArray(sRes) ? sRes : []);
    setCriteria(Array.isArray(cRes) ? cRes : []);
    setAudits(Array.isArray(aRes) ? aRes : []);
    setRefreshKey(k => k + 1);
  };

  const lastAuditBySupplier = useMemo(() => {
    const map = {};
    audits.forEach(a => {
      if (!map[a.supplier_id] || a.audit_date > map[a.supplier_id].audit_date) map[a.supplier_id] = a;
    });
    return map;
  }, [audits]);

  const filtered = suppliers.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search && !`${s.name} ${s.category || ''} ${s.contact_name || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const thisYear = new Date().getFullYear();
  const auditsThisYear = audits.filter(a => new Date(a.audit_date).getFullYear() === thisYear);
  const scores = audits.map(scoreOf).filter(s => s !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const staleSuppliers = suppliers.filter(s => s.status === 'activo' && (!lastAuditBySupplier[s.id] || new Date(lastAuditBySupplier[s.id].audit_date) < sixMonthsAgo));

  const kpiItems = [
    { key: 'active', icon: 'store', label: 'Proveedores activos', value: suppliers.filter(s => s.status === 'activo').length },
    { key: 'audits', icon: 'fact_check', label: 'Auditorías este año', value: auditsThisYear.length },
    { key: 'avg', icon: 'verified', label: 'Cumplimiento promedio', value: avgScore !== null ? `${avgScore}%` : '—' },
    { key: 'stale', icon: 'warning', label: 'Sin auditoría reciente', value: staleSuppliers.length, iconColor: staleSuppliers.length ? '#ef4444' : undefined },
  ];

  const inputCls = "bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900";

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Cumplimiento"
        title="Proveedores"
        description="Listado de proveedores y checklist de auditoría periódica"
        right={canManage && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCriteriaPanelOpen(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95">
              <span className="material-symbols-outlined text-base">checklist</span>
              Checklist de auditoría
            </button>
            <button type="button" onClick={() => setSupplierPanel('new')}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95">
              <span className="material-symbols-outlined text-base">add_circle</span>
              Nuevo proveedor
            </button>
          </div>
        )}
      />

      <KPIStrip variant="strip" items={kpiItems} className="bg-white border border-slate-200 rounded-2xl py-4" />

      <div className="flex flex-col sm:flex-row gap-3">
        <input className={inputCls + ' flex-1'} placeholder="Buscar por nombre, categoría o contacto..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className={inputCls + " flex items-center gap-2"}>
          <select className="bg-transparent outline-none appearance-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-xs font-bold text-slate-400">
            {suppliers.length === 0 ? 'Aún no hay proveedores registrados.' : 'Ningún proveedor coincide con el filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const last = lastAuditBySupplier[s.id];
            const score = last ? scoreOf(last) : null;
            return (
              <button key={s.id} type="button" onClick={() => setDetailSupplier(s)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{s.name}</p>
                    <p className="text-[10.5px] font-bold text-slate-400 truncate">{s.category || 'Sin categoría'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase shrink-0 ${s.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold text-slate-400">
                    {last ? `Última auditoría: ${new Date(last.audit_date).toLocaleDateString('es-CO')}` : 'Sin auditorías'}
                  </p>
                  {score !== null && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${score >= 80 ? 'bg-emerald-50 text-emerald-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {score}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {supplierPanel && (
        <SupplierPanel
          supplier={supplierPanel === 'new' ? null : supplierPanel}
          onClose={() => setSupplierPanel(null)}
          onSuccess={() => { setSupplierPanel(null); reloadAll(); }}
        />
      )}

      {criteriaPanelOpen && (
        <CriteriaConfigPanel onClose={() => setCriteriaPanelOpen(false)} onChanged={reloadAll} />
      )}

      {detailSupplier && (
        <SupplierDetailPanel
          supplier={suppliers.find(s => s.id === detailSupplier.id) || detailSupplier}
          criteria={criteria}
          orgName={initialData.orgName}
          logoUrl={initialData.logoUrl}
          refreshKey={refreshKey}
          onClose={() => setDetailSupplier(null)}
          onEditSupplier={(s) => { setDetailSupplier(null); setSupplierPanel(s); }}
          onOpenAudit={(supplier, audit) => setAuditPanel({ supplier, audit })}
          onNewAudit={(supplier) => setAuditPanel({ supplier, audit: null })}
        />
      )}

      {auditPanel && (
        <AuditPanel
          supplier={auditPanel.supplier}
          audit={auditPanel.audit}
          criteria={criteria}
          onClose={() => setAuditPanel(null)}
          onSuccess={() => { setAuditPanel(null); reloadAll(); }}
        />
      )}
    </div>
  );
}
