'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

// Cada tarjeta navega a su módulo dedicado (SORA, Barreras, Reportes SMS, VOR/MOR,
// Mapas ya existen como páginas completas con su propia lógica — el mockup los
// mostraba como tabs en vivo, pero fusionar esos ~1800 líneas de wizard/CRUD/mapa
// en un solo archivo era un riesgo innecesario; en su lugar esta pantalla es un
// panorama con datos reales por módulo + navegación).
const SAFETY_MODULES = [
  {
    key: 'sora', href: '/dashboard/sora', icon: 'analytics',
    title: 'Análisis SORA', desc: 'Evaluación de riesgos operacionales — Metodología JARUS v2.0',
    color: 'bg-orange-50 border-orange-200 text-orange-600',
  },
  {
    key: 'barreras', href: '/dashboard/safety-config', icon: 'shield',
    title: 'Barreras de Seguridad', desc: 'Mitigaciones y OSOs — requerimientos operacionales de tu organización',
    color: 'bg-blue-50 border-blue-200 text-blue-600',
  },
  {
    key: 'sms', href: '/dashboard/sms', icon: 'health_and_safety',
    title: 'Reportes SMS', desc: 'Sistema de gestión de seguridad operacional — reporte de incidentes',
    color: 'bg-amber-50 border-amber-200 text-amber-600',
  },
  {
    key: 'vormor', href: '/dashboard/vor-mor', icon: 'report',
    title: 'VOR / MOR', desc: 'Reportes Voluntarios y Obligatorios de Ocurrencia — formulario público con QR',
    color: 'bg-rose-50 border-rose-200 text-rose-600',
  },
  {
    key: 'mapas', href: '/dashboard/safety/mapas', icon: 'map',
    title: 'Mapas de Restricción', desc: 'Visor ArcGIS Aerocivil — zonas prohibidas, CTR, TFR y espacio aéreo UAS Colombia',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  },
];

export default function SafetyPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ sora: null, barreras: null, sms: null, vormorPending: null, vormorTotal: null });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!prof?.organization_id) { setLoading(false); return; }

      const [soraRes, barrerasRes, smsRes, vorMorRes] = await Promise.all([
        supabase.from('sora_assessments').select('id').eq('organization_id', prof.organization_id),
        supabase.from('form_definitions').select('id').eq('organization_id', prof.organization_id).eq('form_type', 'sora'),
        supabase.from('sms_reports').select('id').eq('organization_id', prof.organization_id),
        supabase.from('vor_mor_submissions').select('status').eq('organization_id', prof.organization_id),
      ]);

      const vormorTotal = (vorMorRes.data || []).length;
      const vormorPending = (vorMorRes.data || []).filter(r => r.status === 'recibido' || r.status === 'en_investigacion').length;

      setCounts({
        sora: (soraRes.data || []).length,
        barreras: (barrerasRes.data || []).length,
        sms: (smsRes.data || []).length,
        vormorPending,
        vormorTotal,
      });
      setLoading(false);
    }
    load();
  }, []);

  const badgeFor = (key) => {
    if (loading) return null;
    if (key === 'sora')     return `${counts.sora ?? 0} evaluaciones`;
    if (key === 'barreras') return `${counts.barreras ?? 0} definidas`;
    if (key === 'sms')      return `${counts.sms ?? 0} registrados`;
    if (key === 'vormor')   return `${counts.vormorPending ?? 0} de ${counts.vormorTotal ?? 0} pendientes`;
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 text-left pb-20">

      <PageHero
        eyebrow="Cumplimiento"
        title="Seguridad SMS"
        description="Sistema de Gestión de Seguridad Operacional (SMS) · SORA · Barreras · VOR/MOR · Mapas de restricción"
      />

      <section aria-label="Indicadores de seguridad operacional" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
        <KPIStrip variant="strip" items={[
          { key: 'sora', label: 'Evaluaciones SORA', value: loading ? '—' : counts.sora, icon: 'analytics', iconColor: '#ec5b13' },
          { key: 'barreras', label: 'Barreras definidas', value: loading ? '—' : counts.barreras, icon: 'shield', iconColor: '#2563eb' },
          { key: 'sms', label: 'Reportes SMS', value: loading ? '—' : counts.sms, icon: 'health_and_safety', iconColor: '#d97706' },
          {
            key: 'vormor', label: 'VOR/MOR pendientes', value: loading ? '—' : counts.vormorPending, icon: 'report',
            iconColor: !loading && counts.vormorPending > 0 ? '#dc2626' : '#94a3b8',
          },
        ]} />
      </section>

      {/* Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SAFETY_MODULES.map(m => (
          <Link key={m.key} href={m.href}
            className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-[2rem] hover:border-orange-300 hover:shadow-md transition-all group active:scale-[0.99]">
            <div className={`size-12 rounded-2xl flex items-center justify-center border shrink-0 ${m.color} group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-xl">{m.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">{m.title}</p>
                {badgeFor(m.key) && (
                  <span className="text-[9.5px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">{badgeFor(m.key)}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-400 transition-colors text-xl shrink-0 mt-0.5">chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
