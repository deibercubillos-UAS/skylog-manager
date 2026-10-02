'use client';

// Skylog V2.0 — Proveedores: listado de proveedores + checklist de
// auditoría, a pedido del usuario ("sigamos con la sección de
// proveedores"). Réplica funcional del módulo real de v1 (2026-07-20),
// sobre datos 100% V2 (`organizations`/`people`) — mismo criterio real:
// TODO el módulo (incluso lectura) es solo para gestores, sin nivel de
// acceso para piloto (a diferencia de la mayoría del resto de V2).
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import CriteriaConfigPanel from './_CriteriaConfigPanel';
import SupplierDetail from './_SupplierDetail';

const EMPTY_SUPPLIER_FORM = { name: '', category: '', nit: '', contact: '', notes: '' };

export default function ProveedoresPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [audits, setAudits] = useState([]);

  const [showCriteriaPanel, setShowCriteriaPanel] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplierError, setSupplierError] = useState(null);

  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [search, setSearch] = useState('');

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadSuppliers = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/proveedores/suppliers?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setSuppliers(data.suppliers || []);
  }, []);

  const loadCriteria = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/proveedores/criteria?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setCriteria(data.criteria || []);
  }, []);

  const loadAudits = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/proveedores/audits?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setAudits(data.audits || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId || !isManager) return;
    loadSuppliers(organizationId);
    loadCriteria(organizationId);
    loadAudits(organizationId);
  }, [organizationId, isManager, loadSuppliers, loadCriteria, loadAudits]);

  async function handleSupplierSubmit(e) {
    e.preventDefault();
    setSupplierBusy(true);
    setSupplierError(null);
    try {
      const res = await fetch('/api/proveedores/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...supplierForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando el proveedor');
      setSupplierForm(EMPTY_SUPPLIER_FORM);
      setShowNewSupplier(false);
      await loadSuppliers(organizationId);
    } catch (e) {
      setSupplierError(e.message);
    } finally {
      setSupplierBusy(false);
    }
  }

  async function handleSupplierDelete(id) {
    if (!confirm('¿Eliminar este proveedor? También se borrará su historial de auditorías.')) return;
    const res = await fetch(`/api/proveedores/suppliers?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    if (selectedSupplierId === id) setSelectedSupplierId(null);
    await loadSuppliers(organizationId);
  }

  async function handleToggleActive(supplier) {
    const res = await fetch('/api/proveedores/suppliers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: supplier.id, isActive: !supplier.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    await loadSuppliers(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Proveedores" description="Listado de proveedores y checklist de auditoría." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Proveedores" description="Listado de proveedores y checklist de auditoría." />
        <p className="text-sm text-navy-400 mt-4">Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede ver Proveedores.</p>
      </div>
    );
  }

  const activeCount = suppliers.filter((s) => s.is_active).length;
  const thisYear = new Date().getFullYear();
  const auditsThisYear = audits.filter((a) => new Date(`${a.audit_date}T00:00:00`).getFullYear() === thisYear).length;
  const filtered = suppliers.filter((s) => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()) || s.category?.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Proveedores"
        description="Listado de proveedores y checklist de auditoría — cada organización arma su propio checklist."
        metric={{ value: suppliers.length, label: 'Proveedores' }}
        cta={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCriteriaPanel(true)} type="button" className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/10">
              <span className="material-symbols-outlined text-base align-middle mr-1">checklist</span>
              Checklist de auditoría
            </button>
            <Button onClick={() => setShowNewSupplier((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showNewSupplier ? 'close' : 'add'}</span>
              {showNewSupplier ? 'Cerrar' : 'Nuevo proveedor'}
            </Button>
          </div>
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="storefront" color="primary" label="Proveedores" value={suppliers.length} />
        <StatCard icon="check_circle" color="emerald" label="Activos" value={activeCount} />
        <StatCard icon="fact_check" color="blue" label="Auditorías este año" value={auditsThisYear} />
        <StatCard icon="checklist" color="violet" label="Criterios configurados" value={criteria.length} />
      </div>

      {showCriteriaPanel && (
        <CriteriaConfigPanel organizationId={organizationId} criteria={criteria} onClose={() => setShowCriteriaPanel(false)} onChanged={() => loadCriteria(organizationId)} />
      )}

      {showNewSupplier && (
        <div className="bg-white rounded-2xl border border-navy-100 p-4">
          <p className="text-sm font-semibold text-navy mb-3">Nuevo proveedor</p>
          <form onSubmit={handleSupplierSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Nombre" value={supplierForm.name} onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))} required />
            <Field label="Categoría (opcional)" value={supplierForm.category} onChange={(e) => setSupplierForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ej. Mantenimiento, Logística" />
            <Field label="NIT (opcional)" value={supplierForm.nit} onChange={(e) => setSupplierForm((f) => ({ ...f, nit: e.target.value }))} />
            <Field label="Contacto (opcional)" value={supplierForm.contact} onChange={(e) => setSupplierForm((f) => ({ ...f, contact: e.target.value }))} />
            <div className="sm:col-span-2">
              <Field label="Notas (opcional)" value={supplierForm.notes} onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {supplierError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{supplierError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={supplierBusy}>
                {supplierBusy ? 'Guardando…' : 'Crear proveedor'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar proveedor por nombre o categoría…"
        className="w-full text-sm border border-navy-200 rounded-xl px-3 py-2.5"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-navy-300">{suppliers.length === 0 ? 'Sin proveedores registrados todavía.' : 'Sin resultados para esta búsqueda.'}</p>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-navy-100 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${s.is_active ? 'bg-primary text-white' : 'bg-navy-100 text-navy-400'}`}>
                    <span className="material-symbols-outlined text-xl">storefront</span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{s.name}</p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      {[s.category, s.nit && `NIT ${s.nit}`, s.contact].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(s)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-400'}`}
                  >
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button type="button" onClick={() => handleSupplierDelete(s.id)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSupplierId(selectedSupplierId === s.id ? null : s.id)}
                className="text-xs text-primary-700 hover:underline mt-2"
              >
                {selectedSupplierId === s.id ? 'Ocultar auditorías' : 'Ver historial y nueva auditoría'}
              </button>

              {selectedSupplierId === s.id && (
                <SupplierDetail
                  supplier={s}
                  organizationId={organizationId}
                  criteria={criteria}
                  fullName={context.fullName}
                  onAuditSaved={() => loadAudits(organizationId)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
