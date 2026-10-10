'use client';

// Skylog V2.0 — historial de pagos de la suscripción (informativo; no es factura fiscal). Solo Gerente General.
import { useEffect, useState } from 'react';

const BILLING = { monthly: 'Mensual', annual: 'Anual' };
const PLAN = { piloto: 'Piloto', escuadrilla: 'Escuadrilla', flota: 'Flota', enterprise: 'Enterprise' };
const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

export default function PaymentHistory({ organizationId }) {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organizationId) return;
    setPayments(null);
    fetch(`/api/suscripcion/historial?organizationId=${organizationId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'No se pudo cargar el historial');
        setPayments(d.payments || []);
      })
      .catch((e) => setError(e.message));
  }, [organizationId]);

  return (
    <div className="rounded-2xl border border-navy-100 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-teal-500 text-white">
          <span className="material-symbols-outlined text-xl">receipt_long</span>
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Historial de pagos</p>
          <p className="text-xs text-navy-400">Comprobante informativo de cada cobro de tu suscripción. No reemplaza la factura.</p>
        </div>
      </div>
      <div className="p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && payments === null && <p className="text-sm text-navy-400">Cargando…</p>}
        {payments && payments.length === 0 && <p className="text-sm text-navy-400">Aún no hay pagos registrados. Aparecerán aquí después de tu primer cobro.</p>}
        {payments && payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-navy-400 border-b border-navy-100">
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Ciclo</th>
                  <th className="py-2 pr-4 font-medium text-right">Valor</th>
                  <th className="py-2 font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-navy-50 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(p.paid_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2 pr-4">{PLAN[p.plan] || p.plan}</td>
                    <td className="py-2 pr-4">{BILLING[p.billing] || p.billing}</td>
                    <td className="py-2 pr-4 text-right font-medium whitespace-nowrap">{money(p.amount_cop)}</td>
                    <td className="py-2 text-xs text-navy-400 font-mono">{p.transaction_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
