// Genera un PDF descargable con la documentación de la API (jsPDF).
import { jsPDF } from 'jspdf';
import { DEMO } from '@/demo.config';
import { ENDPOINTS, SAMPLE_KEY, API_BASE } from '@/lib/apiSamples';

export function downloadApiDocsPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48;
  let y = 56;
  const accent = DEMO.accent;

  const line = (txt, size, color, bold, dx = 0) => {
    doc.setFontSize(size);
    doc.setTextColor(color || '#1A202C');
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(txt, M + dx, y);
  };

  // Encabezado
  doc.setFillColor(accent);
  doc.rect(0, 0, 595, 8, 'F');
  line(`${DEMO.poweredBy} · API Enterprise`, 20, '#0F1419', true); y += 22;
  line('Documentación de integración — Plan pago por vuelo', 11, '#64748b'); y += 30;

  // Autenticación
  line('Autenticación', 14, accent, true); y += 18;
  line('Todas las solicitudes requieren tu API key en el encabezado:', 10, '#334155'); y += 16;
  doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor('#0F1419');
  doc.text(`Authorization: Bearer ${SAMPLE_KEY}`, M, y); y += 14;
  doc.text(`Base URL: ${API_BASE}`, M, y); y += 28;

  // Endpoints
  line('Endpoints', 14, accent, true); y += 20;
  ENDPOINTS.forEach((e) => {
    doc.setFont('courier', 'bold'); doc.setFontSize(9.5); doc.setTextColor('#0F1419');
    doc.text(`${e.method}  ${e.path}`, M, y); y += 13;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#64748b');
    const wrapped = doc.splitTextToSize(e.desc, 460);
    doc.text(wrapped, M, y); y += wrapped.length * 12 + 12;
  });

  y += 6;
  // Seguimiento y cumplimiento de ruta
  line('Seguimiento y cumplimiento de ruta', 14, accent, true); y += 18;
  const tracking = [
    '· Cada misión programada genera un ID de seguimiento (tracking_id) compartido por organización, piloto y API.',
    '· La API entrega las coordenadas GPS por donde voló la aeronave (gps_track).',
    '· El servicio cruza la ruta volada contra el área programada y reporta route_compliance.',
    '· Tolerancia de 100 m: confirma si el vuelo se mantuvo en el área asignada (within_tolerance, max_deviation_m).',
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor('#334155');
  tracking.forEach((b) => { const w = doc.splitTextToSize(b, 480); doc.text(w, M, y); y += w.length * 13 + 4; });
  y += 6;

  // Modelo de cobro
  line('Modelo de cobro', 14, accent, true); y += 18;
  const billing = [
    `· ${DEMO.pricePerFlight.toLocaleString('es-CO')} COP por cada vuelo cargado (> 0 min) de una misión asignada.`,
    `· Créditos prepago. Mínimo ${DEMO.minMonthlyCredits} créditos/mes, con renovación y vencimiento mensual.`,
    '· Si el saldo llega a 0, la carga de vuelos se bloquea hasta recargar (rechazo duro).',
    '· Alertas de saldo bajo en 100, 50, 25, 10 y 5 créditos.',
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor('#334155');
  billing.forEach((b) => {
    const w = doc.splitTextToSize(b, 480);
    doc.text(w, M, y); y += w.length * 13 + 4;
  });

  // Pie
  doc.setFontSize(8); doc.setTextColor('#94a3b8');
  doc.text('Documento de demostración — datos y endpoints de ejemplo, sin servicio en producción.', M, 800);

  doc.save('bitafly-api-enterprise.pdf');
}
