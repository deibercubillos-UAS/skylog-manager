'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/roles';
import FileUpload from '@/components/FileUpload';
import { toast } from '@/lib/toast';
import PageHero from '@/components/PageHero';
import { fetchLogoDataUrl } from '@/lib/docUrl';

// PERFORMANCE: Solo carga jsPDF + ExcelJS (~400 kB) cuando el usuario realmente descarga
const loadReportGenerators = () => import('@/lib/reportGenerators');

// Definición de los formatos disponibles. `code` es el código de formato
// personalizable en pantalla (no todos tienen columna en `organizations` —
// solo master/batteries/pilots existían antes; maintenance/fleet usan un
// default local, editable en la sesión pero no persistido).
// Orden de las secciones de la grilla — puramente de presentación, agrupa los
// mismos 14+ reportes por área para facilitar la búsqueda del formato deseado.
const GROUP_ORDER = ['Operación', 'Tripulación', 'Documentación', 'Seguridad SMS', 'Proveedores'];

const REPORT_DEFS = [
    {
        key: 'master', code: 'F-OPS-002', name: 'Libro de Vuelo', icon: 'flight_takeoff', group: 'Operación',
        desc: 'Consolidado de vuelos, horas y misiones ejecutadas — de toda la flota o de una/varias aeronaves.',
        needsPeriod: true, needsAircraftMulti: true,
    },
    {
        key: 'maintenance', code: 'F-MNT-006', name: 'Reporte de Mantenimiento', icon: 'build', group: 'Operación',
        desc: 'Historial de intervenciones preventivas y correctivas — de toda la flota o de una sola aeronave.',
        needsPeriod: true, needsAircraft: true,
    },
    {
        key: 'batteries', code: 'F-MNT-003', name: 'Registro de Baterías', icon: 'battery_charging_full', group: 'Operación',
        desc: 'Inventario de baterías: ciclos, salud y estado — con ciclos acumulados hasta una fecha de corte.',
        needsCutoffDate: true,
    },
    {
        key: 'fleet', code: 'F-FLT-007', name: 'Reporte de Flota', icon: 'precision_manufacturing', group: 'Operación',
        desc: 'Inventario de aeronaves, horas totales y estado operativo — toda la flota o una sola aeronave.',
        needsAircraft: true,
    },
    {
        key: 'aerocivil', code: null, name: 'Reporte Operacional UAS (AeroCivil)', icon: 'assignment_turned_in', group: 'Operación',
        desc: 'Circular 2026351070026944 — envío mensual a gouas@aerocivil.gov.co, primeros 5 días del mes.',
        needsMonth: true, format: 'xlsx',
    },
    {
        key: 'components', code: 'F-FLT-008', name: 'Trazabilidad de Componentes', icon: 'settings_suggest', group: 'Operación',
        desc: 'Roster activo (horas/días de uso) e historial de cambios — toda la flota o una sola aeronave.',
        needsAircraft: true,
    },
    {
        key: 'pilots', code: 'F-HUM-005', name: 'Bitácora de Piloto', icon: 'menu_book', group: 'Tripulación',
        desc: 'Horas y misiones ejecutadas por un tripulante en el periodo.',
        needsPeriod: true, needsPilot: true,
    },
    {
        key: 'dossier', code: null, name: 'Expediente de Tripulante', icon: 'badge', group: 'Tripulación',
        desc: 'Hoja de vida completa con anexos digitales y certificados.',
        needsPilot: true,
    },
    {
        key: 'training', code: 'F-CAP-008', name: 'Evaluación de Capacitación', icon: 'school', group: 'Tripulación',
        desc: 'Evaluaciones internas de capacitación por tripulante — Operaciones o Mantenimiento, en el periodo.',
        needsPeriod: true, needsTrainingType: true,
    },
    {
        key: 'trainingSchedule', code: 'F-CAP-009', name: 'Cronograma de Capacitación', icon: 'event_note', group: 'Tripulación',
        desc: 'Sesiones programadas (tema + recurrencia) — Operaciones o Mantenimiento, con sus fechas dentro del periodo.',
        needsPeriod: true, needsTrainingType: true,
    },
    {
        key: 'manualsPublished', code: 'F-DOC-014', name: 'Publicación de Manuales', icon: 'library_add', group: 'Documentación',
        desc: 'Historial de publicaciones — alta inicial y nuevas versiones de cada manual, en el periodo.',
        needsPeriod: true,
    },
    {
        key: 'manualsAck', code: 'F-DOC-015', name: 'Confirmación de Lectura de Manuales', icon: 'fact_check', group: 'Documentación',
        desc: 'Consolidado de todos los manuales vigentes: leídos/pendientes sobre la versión actual.',
    },
    {
        key: 'spi', code: 'F-SMS-010', name: 'Indicadores SPI (anual)', icon: 'monitoring', group: 'Seguridad SMS',
        desc: 'Datos mensuales, líneas de alerta y planes de acción de cada indicador — para el envío anual a Aerocivil.',
        needsYear: true, format: 'xlsx',
    },
    {
        key: 'indicatorsTracking', code: 'F-SMS-016', name: 'Seguimiento de Indicadores', icon: 'trending_up', group: 'Seguridad SMS',
        desc: 'Tasa mensual de cada indicador vs. sus líneas de alerta + planes de acción abiertos, en el periodo.',
        needsPeriod: true,
    },
    {
        key: 'gap', code: 'F-SMS-011', name: 'Autoevaluación GAP del SMS', icon: 'fact_check', group: 'Seguridad SMS',
        desc: 'Última autoevaluación registrada (Apéndice 1, 100 preguntas) con hallazgos y seguimiento.',
    },
    {
        key: 'gapHistory', code: 'F-SMS-017', name: 'Mejora Continua (histórico GAP)', icon: 'timeline', group: 'Seguridad SMS',
        desc: 'Evolución del % de cumplimiento entre todas las autoevaluaciones GAP realizadas, por componente y total.',
    },
    {
        key: 'smsTrainingSchedule', code: 'F-SMS-012', name: 'Cronograma Capacitación SMS', icon: 'school', group: 'Seguridad SMS',
        desc: 'Sesiones de capacitación SMS (todo el personal) con sus fechas dentro del periodo.',
        needsPeriod: true,
    },
    {
        key: 'correctiveActions', code: 'F-SMS-013', name: 'Acciones Correctivas del SMS', icon: 'checklist', group: 'Seguridad SMS',
        desc: 'Consolidado de casos SMS/VOR/MOR, planes de acción SPI y hallazgos GAP — estado actual.',
    },
    {
        key: 'suppliers', code: 'F-PRV-002', name: 'Auditoría de Proveedores', icon: 'store', group: 'Proveedores',
        desc: 'Auditorías de proveedores en el periodo — de todos los proveedores o de uno específico.',
        needsPeriod: true, needsSupplier: true,
    },
];

// Mes anterior en formato YYYY-MM — el reporte AeroCivil siempre es del "mes vencido"
function previousMonthISO() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PERIODS = ['Este mes', 'Este trimestre', 'Este año', 'Personalizado'];

function periodRange(period, customFrom, customTo) {
    const fmt = (d) => d.toISOString().split('T')[0];
    const today = new Date();
    if (period === 'Personalizado') return { from: customFrom, to: customTo };
    if (period === 'Este trimestre') {
        const q = Math.floor(today.getMonth() / 3);
        return { from: fmt(new Date(today.getFullYear(), q * 3, 1)), to: fmt(today) };
    }
    if (period === 'Este año') return { from: fmt(new Date(today.getFullYear(), 0, 1)), to: fmt(today) };
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [downloadingKey, setDownloadingKey] = useState(null);
    const [search, setSearch] = useState('');
    const [orgData, setOrgData] = useState(null);
    const [pilots, setPilots] = useState([]);
    const [aircraftList, setAircraftList] = useState([]);
    const [selectedPilot, setSelectedPilot] = useState('');
    const [selectedAircraft, setSelectedAircraft] = useState('');
    const [selectedAircraftIds, setSelectedAircraftIds] = useState([]);
    const [supplierList, setSupplierList] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [userRole, setUserRole] = useState(null);
    const [openKey, setOpenKey] = useState(null);

    const [period, setPeriod] = useState('Este mes');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(previousMonthISO());
    const [aerocivilStatus, setAerocivilStatus] = useState(null);
    const [markingSent, setMarkingSent] = useState(false);
    const [cutoffDate, setCutoffDate] = useState(new Date().toISOString().split('T')[0]);
    const [trainingType, setTrainingType] = useState('operaciones');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);

    // Versión y fecha del reporte se editan de forma individual por formato
    // (antes eran un único control compartido en la cabecera de la página).
    const todayISO = new Date().toISOString().split('T')[0];
    const [configs, setConfigs] = useState(
        Object.fromEntries(REPORT_DEFS.map(d => [d.key, { version: '1.0', reportDate: todayISO }]))
    );
    const updateConfig = (key, patch) => setConfigs(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

    const [formCodes, setFormCodes] = useState(
        Object.fromEntries(REPORT_DEFS.map(d => [d.key, d.code]))
    );

    const canViewReports = hasPermission(userRole, 'canViewAudit');
    const canEditLogo = hasPermission(userRole, 'canEditOrg');

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prof } = await supabase
            .from('profiles').select('organization_id, role').eq('id', user.id).single();
        if (!prof?.organization_id) return;

        const [{ data: org }, { data: crew }, { data: fleet }, { data: vendors }] = await Promise.all([
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single(),
            supabase.from('pilots').select('id, name').eq('organization_id', prof.organization_id),
            supabase.from('aircraft').select('id, model, serial_number').eq('organization_id', prof.organization_id).order('model'),
            supabase.from('suppliers').select('id, name').eq('organization_id', prof.organization_id).order('name'),
        ]);

        setUserRole(prof.role || null);
        setOrgData(org);
        setPilots(crew || []);
        setAircraftList(fleet || []);
        setSupplierList(vendors || []);
        setFormCodes(prev => ({
            ...prev,
            master:    org?.form_code_master    || prev.master,
            batteries: org?.form_code_batteries || prev.batteries,
            pilots:    org?.form_code_pilots    || prev.pilots,
        }));
    };

    useEffect(() => { init(); }, []);

    // Estado de envío del reporte AeroCivil del mes seleccionado
    useEffect(() => {
        if (openKey !== 'aerocivil') return;
        let active = true;
        fetch(`/api/aerocivil-report/status?period=${selectedMonth}`)
            .then(r => r.json())
            .then(d => { if (active) setAerocivilStatus(d); })
            .catch(() => { if (active) setAerocivilStatus(null); });
        return () => { active = false; };
    }, [openKey, selectedMonth]);

    const handleMarkSent = async () => {
        setMarkingSent(true);
        try {
            const res = await fetch('/api/aerocivil-report/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period: selectedMonth }),
            });
            if (!res.ok) throw new Error((await res.json())?.error || 'Error al guardar');
            toast.success('Marcado como enviado');
            setAerocivilStatus(prev => ({ ...prev, sent: true }));
        } catch (e) {
            toast.error(e.message);
        } finally {
            setMarkingSent(false);
        }
    };

    const updateLogo = async (url) => {
        await supabase.from('organizations').update({ logo_url: url }).eq('id', orgData.id);
        init();
        toast.success("Logo actualizado");
    };

    // Agrupa los formatos por área (`group`) en el orden fijo de GROUP_ORDER —
    // grupos sin ningún reporte todavía (ej. Documentación antes de la Fase 2)
    // simplemente no se renderizan, en vez de mostrar una sección vacía.
    const groupedDefs = useMemo(() => {
        const q = search.trim().toLowerCase();
        const matches = (d) => !q || `${d.name} ${d.desc} ${d.code || ''}`.toLowerCase().includes(q);
        return GROUP_ORDER
            .map(group => ({ group, defs: REPORT_DEFS.filter(d => d.group === group && matches(d)) }))
            .filter(g => g.defs.length > 0);
    }, [search]);

    const activeDef = useMemo(() => REPORT_DEFS.find(d => d.key === openKey) || null, [openKey]);
    const selectedAircraftLabel = useMemo(() => {
        const a = aircraftList.find(x => x.id === selectedAircraft);
        return a ? `${a.model} · ${a.serial_number}` : null;
    }, [aircraftList, selectedAircraft]);

    const selectedSupplierLabel = useMemo(() => {
        const s = supplierList.find(x => x.id === selectedSupplier);
        return s ? s.name : null;
    }, [supplierList, selectedSupplier]);

    // Libro de Vuelo: etiqueta de alcance cuando se elige una o varias aeronaves (no todas)
    const selectedAircraftMultiLabel = useMemo(() => {
        if (!selectedAircraftIds.length || selectedAircraftIds.length === aircraftList.length) return null;
        if (selectedAircraftIds.length === 1) {
            const a = aircraftList.find(x => x.id === selectedAircraftIds[0]);
            return a ? `${a.model} · ${a.serial_number}` : null;
        }
        return `${selectedAircraftIds.length} aeronaves seleccionadas`;
    }, [aircraftList, selectedAircraftIds]);

    const toggleDef = (key) => {
        setOpenKey(prev => prev === key ? null : key);
        setSelectedAircraft('');
        setSelectedAircraftIds([]);
        setSelectedSupplier('');
    };

    const handleDownload = async (def) => {
        const { from, to } = periodRange(period, customFrom, customTo);
        if (def.needsPeriod && (!from || !to)) return toast.warn('Selecciona un periodo válido.');
        if (def.needsPilot && !selectedPilot) return toast.warn('Selecciona un tripulante.');
        if (def.needsMonth && !/^\d{4}-\d{2}$/.test(selectedMonth)) return toast.warn('Selecciona un mes válido.');
        if (def.needsCutoffDate && !cutoffDate) return toast.warn('Selecciona una fecha de corte.');
        if (def.needsTrainingType && !trainingType) return toast.warn('Selecciona Operaciones o Mantenimiento.');
        if (def.needsYear && (!selectedYear || selectedYear < 2000)) return toast.warn('Selecciona un año válido.');

        setDownloadingKey(def.key);
        try {
            const generators = await loadReportGenerators();
            const cfg = configs[def.key] || { version: '1.0', reportDate: todayISO };
            const logo = await fetchLogoDataUrl(orgData?.logo_url);
            const downloadedAt = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
            const rangeLabel = def.needsMonth
                ? `Mes ${selectedMonth}`
                : def.needsCutoffDate
                    ? `Corte al ${cutoffDate}`
                    : def.needsYear
                        ? `Año ${selectedYear}`
                        : def.needsPeriod
                            ? `${from} a ${to}`
                            : 'Instantánea (sin rango de fechas)';

            const common = {
                orgName: orgData?.company_name,
                logo,
                version: cfg.version,
                reportDate: cfg.reportDate,
                formCode: formCodes[def.key],
                rangeLabel,
                downloadedAt,
            };

            if (def.key === 'master') {
                // "Todas" (todos los checks marcados) equivale a no filtrar — enviar el
                // filtro igual excluiría vuelos cuyo aircraft_id no calce exactamente con
                // la lista actual (aeronave dada de baja/eliminada, vuelo sin aeronave
                // enlazada, etc.). Solo se filtra en una selección parcial real.
                const isPartialSelection = selectedAircraftIds.length > 0 && selectedAircraftIds.length < aircraftList.length;
                const q = isPartialSelection ? `&aircraftIds=${selectedAircraftIds.join(',')}` : '';
                const res = await fetch(`/api/reports/master?from=${from}&to=${to}${q}`);
                generators.generateMasterReport(await res.json(), { ...common, aircraftLabel: selectedAircraftMultiLabel });
            }
            if (def.key === 'maintenance') {
                const q = selectedAircraft ? `&aircraftId=${selectedAircraft}` : '';
                const res = await fetch(`/api/reports/maintenance?from=${from}&to=${to}${q}`);
                generators.generateMaintenanceReport(await res.json(), { ...common, aircraftLabel: selectedAircraftLabel });
            }
            if (def.key === 'batteries') {
                const res = await fetch(`/api/reports/batteries?to=${cutoffDate}`);
                generators.generateBatteryReport(await res.json(), { ...common, cutoffDate });
            }
            if (def.key === 'fleet') {
                const q = selectedAircraft ? `?aircraftId=${selectedAircraft}` : '';
                const res = await fetch(`/api/reports/fleet${q}`);
                generators.generateFleetReport(await res.json(), common);
            }
            if (def.key === 'pilots') {
                const res = await fetch(`/api/reports/pilots?from=${from}&to=${to}&pilotId=${selectedPilot}`);
                generators.generatePilotReport(await res.json(), common);
            }
            if (def.key === 'dossier') {
                const res = await fetch(`/api/reports/crew/expediente?pilotId=${selectedPilot}`);
                generators.generatePilotDossier(await res.json(), {
                    orgName: orgData?.company_name,
                    logo,
                    version: cfg.version,
                    reportDate: cfg.reportDate,
                    rangeLabel: 'Instantánea — expediente vigente a la fecha de descarga',
                    downloadedAt,
                });
            }
            if (def.key === 'aerocivil') {
                const res = await fetch(`/api/reports/aerocivil-monthly?month=${selectedMonth}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Error al obtener los datos');
                await generators.generateAerocivilMonthlyExcel(data.rows, selectedMonth);
            }
            if (def.key === 'training') {
                const res = await fetch(`/api/reports/training?type=${trainingType}&from=${from}&to=${to}`);
                generators.generateTrainingReport(await res.json(), { ...common, trainingType });
            }
            if (def.key === 'trainingSchedule') {
                const res = await fetch(`/api/reports/training-schedule?type=${trainingType}&from=${from}&to=${to}`);
                generators.generateTrainingScheduleReport(await res.json(), { ...common, trainingType });
            }
            if (def.key === 'components') {
                const q = selectedAircraft ? `?aircraftId=${selectedAircraft}` : '';
                const res = await fetch(`/api/reports/components-traceability${q}`);
                generators.generateComponentsTraceabilityReport(await res.json(), { ...common, aircraftLabel: selectedAircraftLabel });
            }
            if (def.key === 'manualsPublished') {
                const res = await fetch(`/api/reports/manuals-published?from=${from}&to=${to}`);
                generators.generateManualsPublishedReport(await res.json(), common);
            }
            if (def.key === 'manualsAck') {
                const res = await fetch('/api/reports/manuals-ack');
                generators.generateManualsAckReport(await res.json(), common);
            }
            if (def.key === 'indicatorsTracking') {
                const res = await fetch(`/api/reports/indicators-tracking?from=${from}&to=${to}`);
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || 'Error al obtener los datos');
                generators.generateIndicatorsTrackingReport(json, common);
            }
            if (def.key === 'spi') {
                const res = await fetch(`/api/reports/spi?year=${selectedYear}`);
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || 'Error al obtener los datos');
                await generators.generateSpiReport(json, { ...common, year: selectedYear });
            }
            if (def.key === 'gapHistory') {
                const res = await fetch('/api/reports/gap-history');
                generators.generateGapHistoryReport(await res.json(), common);
            }
            if (def.key === 'gap') {
                const res = await fetch('/api/reports/gap');
                generators.generateGapReport(await res.json(), common);
            }
            if (def.key === 'smsTrainingSchedule') {
                const res = await fetch(`/api/reports/sms-training-schedule?from=${from}&to=${to}`);
                generators.generateSmsTrainingScheduleReport(await res.json(), common);
            }
            if (def.key === 'correctiveActions') {
                const res = await fetch('/api/reports/corrective-actions');
                generators.generateCorrectiveActionsReport(await res.json(), common);
            }
            if (def.key === 'suppliers') {
                const q = selectedSupplier ? `&supplierId=${selectedSupplier}` : '';
                const res = await fetch(`/api/reports/suppliers?from=${from}&to=${to}${q}`);
                generators.generateSupplierAuditSummaryReport(await res.json(), { ...common, supplierLabel: selectedSupplierLabel });
            }
        } catch (e) {
            toast.error("Error al generar reporte");
        } finally {
            setDownloadingKey(null);
        }
    };

    const selectCls = "p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 border border-slate-200";

    return (
        <div className="space-y-6 md:space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <PageHero
                eyebrow="Documentación"
                title="Reportes"
                description="Formatos oficiales RAC 100 y reportes personalizados de tu operación."
                right={canEditLogo && (
                    <div className="w-40">
                        <FileUpload path="org/logos" label="Actualizar logo" onUploadSuccess={updateLogo} />
                    </div>
                )}
            />

            {!canViewReports ? (
                <div className="bg-slate-100 p-10 rounded-[2.5rem] border border-slate-200 text-center space-y-4">
                    <span className="material-symbols-outlined text-5xl text-slate-400">lock</span>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Acceso restringido — solo personal gerencial.</p>
                </div>
            ) : (
            <>
                {/* Búsqueda rápida por nombre/código/descripción */}
                <div className="relative max-w-md">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar reporte por nombre o código..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                    />
                </div>

                {/* Grid de formatos, agrupados por área */}
                <div className="space-y-7">
                    {groupedDefs.length === 0 && (
                        <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-8 text-center">
                            Ningún reporte coincide con &quot;{search}&quot;.
                        </p>
                    )}
                    {groupedDefs.map(({ group, defs }) => (
                        <div key={group} className="space-y-3">
                            <p className="text-[10.5px] font-black uppercase tracking-widest text-slate-400 px-0.5">{group}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {defs.map(def => (
                                    <button key={def.key} type="button" onClick={() => toggleDef(def.key)}
                                        className={`text-left bg-white border rounded-2xl p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:border-orange-200 ${
                                            openKey === def.key ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-lg text-orange-600">{def.icon}</span>
                                            </div>
                                            {def.code && <span className="text-[9.5px] font-black text-slate-300 font-mono">{formCodes[def.key]}</span>}
                                        </div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{def.name}</p>
                                        <p className="text-xs text-slate-500 leading-snug">{def.desc}</p>
                                        <div className="flex items-center gap-1.5 mt-auto pt-2.5 border-t border-slate-100 text-orange-600">
                                            <span className="material-symbols-outlined text-sm">{openKey === def.key ? 'expand_less' : (def.format === 'xlsx' ? 'table_view' : 'picture_as_pdf')}</span>
                                            <span className="text-[10.5px] font-black uppercase tracking-wide">{openKey === def.key ? 'Ocultar opciones' : (def.format === 'xlsx' ? 'Generar Excel' : 'Generar PDF')}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Panel de generación del formato activo */}
                {activeDef && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-slate-900">Generar — {activeDef.name}</p>
                            <button type="button" onClick={() => setOpenKey(null)}
                                className="size-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        {(activeDef.code || activeDef.key !== 'aerocivil') && (
                            <div className="flex flex-wrap items-start gap-4">
                                {activeDef.code && (
                                    <div className="space-y-1 max-w-xs">
                                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Código de formato</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono text-slate-900"
                                            value={formCodes[activeDef.key]}
                                            onChange={e => setFormCodes({ ...formCodes, [activeDef.key]: e.target.value })} />
                                        <p className="text-[10px] font-semibold text-slate-400">Personaliza el código con el que se identifica este reporte en tu organización.</p>
                                    </div>
                                )}
                                {!['aerocivil', 'spi'].includes(activeDef.key) && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Versión</label>
                                            <input className="w-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                                                value={configs[activeDef.key]?.version || ''}
                                                onChange={e => updateConfig(activeDef.key, { version: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Fecha del formato</label>
                                            <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                                value={configs[activeDef.key]?.reportDate || ''}
                                                onChange={e => updateConfig(activeDef.key, { reportDate: e.target.value })} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeDef.needsCutoffDate && (
                            <div className="space-y-1 max-w-xs">
                                <label className="text-[9.5px] font-black uppercase tracking-wide text-slate-400 ml-0.5">Fecha de corte</label>
                                <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                    value={cutoffDate} onChange={e => setCutoffDate(e.target.value)} max={todayISO} />
                                <p className="text-[10px] font-semibold text-slate-400">Los ciclos totales se calculan acumulados hasta esta fecha.</p>
                            </div>
                        )}

                        {activeDef.needsYear && (
                            <div className="space-y-1 max-w-xs">
                                <label className="text-[9.5px] font-black uppercase tracking-wide text-slate-400 ml-0.5">Año a reportar</label>
                                <input type="number" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-28"
                                    value={selectedYear} min="2000" max={new Date().getFullYear()}
                                    onChange={e => setSelectedYear(parseInt(e.target.value, 10) || '')} />
                                <p className="text-[10px] font-semibold text-slate-400">La línea base (líneas de alerta) se calcula con el año anterior a este.</p>
                            </div>
                        )}

                        {activeDef.needsTrainingType && (
                            <div className="space-y-2">
                                <span className="text-[9.5px] font-black uppercase tracking-wide text-slate-400">Programa</span>
                                <div className="flex flex-wrap gap-2">
                                    {[['operaciones', 'Operaciones'], ['mantenimiento', 'Mantenimiento']].map(([val, label]) => (
                                        <button key={val} type="button" onClick={() => setTrainingType(val)}
                                            className={`text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
                                                trainingType === val ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeDef.needsMonth && (
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9.5px] font-black uppercase tracking-wide text-slate-400 ml-0.5">Mes a reportar (mes vencido)</label>
                                    <input type="month" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} max={previousMonthISO()} />
                                </div>
                                {aerocivilStatus && (
                                    aerocivilStatus.sent ? (
                                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Enviado{aerocivilStatus.sentByName ? ` · ${aerocivilStatus.sentByName}` : ''}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                                            <span className="material-symbols-outlined text-sm">pending</span>
                                            Pendiente de envío
                                        </span>
                                    )
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Periodo */}
                            {activeDef.needsPeriod && (
                                <div className="space-y-2">
                                    <span className="text-[9.5px] font-black uppercase tracking-wide text-slate-400">Periodo a descargar</span>
                                    <div className="flex flex-wrap gap-2">
                                        {PERIODS.map(p => (
                                            <button key={p} type="button" onClick={() => setPeriod(p)}
                                                className={`text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
                                                    period === p ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    {period === 'Personalizado' && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <input type="date" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                                            <span className="text-xs font-bold text-slate-400">a</span>
                                            <input type="date" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Alcance: una o varias aeronaves (Libro de Vuelo) */}
                            {activeDef.needsAircraftMulti && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9.5px] font-black uppercase tracking-wide text-slate-400">Aeronaves incluidas</span>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setSelectedAircraftIds(aircraftList.map(a => a.id))}
                                                className="text-[10px] font-black text-orange-600 hover:underline">Todas</button>
                                            <span className="text-slate-300">·</span>
                                            <button type="button" onClick={() => setSelectedAircraftIds([])}
                                                className="text-[10px] font-black text-slate-400 hover:underline">Ninguna</button>
                                        </div>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        {aircraftList.length === 0 && (
                                            <p className="text-xs font-semibold text-slate-400 px-3 py-3">Sin aeronaves registradas.</p>
                                        )}
                                        {aircraftList.map(a => {
                                            const checked = selectedAircraftIds.includes(a.id);
                                            return (
                                                <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
                                                    <input type="checkbox" className="accent-orange-600" checked={checked}
                                                        onChange={() => setSelectedAircraftIds(prev => checked ? prev.filter(id => id !== a.id) : [...prev, a.id])} />
                                                    {a.model} · {a.serial_number}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] font-semibold text-slate-400">Deja sin marcar ninguna para incluir toda la flota.</p>
                                </div>
                            )}

                            {/* Alcance: aeronave, piloto o proveedor */}
                            {(activeDef.needsAircraft || activeDef.needsPilot || activeDef.needsSupplier) && (
                                <div className="space-y-2">
                                    <span className="text-[9.5px] font-black uppercase tracking-wide text-slate-400">
                                        {activeDef.needsAircraft ? 'Alcance — aeronave' : activeDef.needsSupplier ? 'Alcance — proveedor' : 'Tripulante'}
                                        {activeDef.needsPilot && <span className="text-orange-600"> *</span>}
                                    </span>
                                    {activeDef.needsAircraft && (
                                        <select className={selectCls + ' w-full'} value={selectedAircraft} onChange={e => setSelectedAircraft(e.target.value)}>
                                            <option value="">Todas las aeronaves</option>
                                            {aircraftList.map(a => <option key={a.id} value={a.id}>{a.model} · {a.serial_number}</option>)}
                                        </select>
                                    )}
                                    {activeDef.needsPilot && (
                                        <select className={selectCls + ' w-full'} value={selectedPilot} onChange={e => setSelectedPilot(e.target.value)}>
                                            <option value="">-- Seleccionar tripulante --</option>
                                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}
                                    {activeDef.needsSupplier && (
                                        <select className={selectCls + ' w-full'} value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                            <option value="">Todos los proveedores</option>
                                            {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    )}
                                    {activeDef.needsAircraft && (
                                        <p className="text-[10px] font-semibold text-slate-400">Deja "Todas las aeronaves" para el reporte completo, o elige una para un reporte de solo esa unidad.</p>
                                    )}
                                    {activeDef.needsSupplier && (
                                        <p className="text-[10px] font-semibold text-slate-400">Deja "Todos los proveedores" para el consolidado, o elige uno para su historial de auditorías.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setOpenKey(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
                                Cancelar
                            </button>
                            {activeDef.key === 'aerocivil' && !aerocivilStatus?.sent && (
                                <button type="button" onClick={handleMarkSent} disabled={markingSent}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-black text-xs uppercase tracking-wide hover:bg-emerald-100 transition-all disabled:opacity-50">
                                    <span className="material-symbols-outlined text-base">{markingSent ? 'progress_activity' : 'check_circle'}</span>
                                    {markingSent ? 'Guardando...' : 'Marcar como enviado'}
                                </button>
                            )}
                            <button type="button" onClick={() => handleDownload(activeDef)} disabled={downloadingKey === activeDef.key}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
                                <span className="material-symbols-outlined text-base">{activeDef.format === 'xlsx' ? 'table_view' : 'picture_as_pdf'}</span>
                                {downloadingKey === activeDef.key ? 'Generando...' : (activeDef.format === 'xlsx' ? 'Descargar Excel' : 'Descargar PDF')}
                            </button>
                        </div>
                    </div>
                )}
            </>
            )}
        </div>
    );
}
