/**
 * Página pública del formulario MOR (Mandatory Occurrence Report)
 * URL: /mor/[orgCode]
 * Sin autenticación — accesible desde QR
 */
import VorMorForm from '@/components/public/VorMorForm';

export async function generateMetadata({ params }) {
  const { orgCode } = await params;
  return {
    title: 'Reporte Obligatorio de Ocurrencia (MOR) · BitaFly',
    description: 'Formulario de reporte obligatorio de ocurrencias aeronáuticas (RAC 100).',
    robots: 'noindex',
  };
}

async function getFormDefinition(orgCode) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';
    const res = await fetch(`${base}/api/public/mor/${orgCode}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function MorPublicPage({ params }) {
  const { orgCode } = await params;
  const data = await getFormDefinition(orgCode);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-10 max-w-sm text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-slate-300">link_off</span>
          <h2 className="text-lg font-black text-slate-800 uppercase">Formulario no disponible</h2>
          <p className="text-sm text-slate-500">El código de organización no es válido o el formulario MOR no está activo.</p>
        </div>
      </div>
    );
  }

  return (
    <VorMorForm
      orgCode={orgCode}
      type="MOR"
      orgName={data.org_name}
      formDef={data.form}
      barriers={data.barriers}
    />
  );
}
