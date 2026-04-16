import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- 1. GENERADOR: FORMATO MASTER DE VUELO ---
export const generateMasterReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 

    doc.line(65, 10, 65, 35);   
    doc.line(225, 10, 225, 35); 
    doc.line(65, 22.5, 225, 22.5); 
    
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {
            doc.setFontSize(7); doc.text("S/L", 40, 23, { align: 'center' });
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("FORMATO MASTER DE VUELO", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'VUELO', 'MARCA', 'MODELO', 'S/N', 'RUAS', 'LUGAR', 'TIPO OP', 'VISUAL', 'DEP', 'ARR', 'TOTAL', 'PILOTO', 'CIPU']],
        body: data.map(f => [
            f.flight_date, f.mission_id, f.aircraft?.brand, f.aircraft?.model, f.aircraft?.serial_number, 
            f.aircraft?.ruas, f.location, f.mission_type, f.visual_condition, f.takeoff_time, 
            f.landing_time, f.aircraft?.total_hours?.toFixed(2), f.pilots?.name, f.pilots?.license_number
        ]),
        styles: { fontSize: 5.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-OPS-002'}_VUELO_${orgName}.pdf`);
};

// --- 2. GENERADOR: REGISTRO OPERACIONAL DE BATERÍAS ---
export const generateBatteryReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("REGISTRO OPERACIONAL DE BATERÍAS", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version}`, 227, 15);
    doc.text(`FECHA: ${reportDate}`, 227, 23);
    doc.text(`FORMATO: ${formCode}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['S/N BATERÍA', 'MARCA', 'DRON USADO', 'CICLOS ACUM.', 'VUELO ID', 'UBICACIÓN', 'CONDICIÓN']],
        body: data.map(f => [
            f.battery?.serial_number || 'N/A', f.battery?.brand || 'N/A', f.aircraft?.model || 'N/A', 
            f.battery?.cycles || '0', f.mission_id || 'N/A', f.location || 'N/A', f.visual_condition || 'VMC'
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 30;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_ENERGIA_${orgName}.pdf`);
};

// --- 3. GENERADOR: BITÁCORA DE EXPERIENCIA DE PILOTO ---
export const generatePilotReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;
    const pilotName = data[0]?.pilots?.name || "N/A";
    const pilotCIPU = data[0]?.pilots?.license_number || "---";

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`PILOTO: ${pilotName.toUpperCase()} | CIPU: ${pilotCIPU}`, 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("BITÁCORA DE EXPERIENCIA DE VUELO", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version}`, 227, 15);
    doc.text(`FECHA: ${reportDate}`, 227, 23);
    doc.text(`FORMATO: ${formCode}`, 227, 31);

    let totalAcumulado = 0;
    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'MISIÓN ID', 'MODELO UAS', 'S/N EQUIPO', 'UBICACIÓN', 'DEP', 'ARR', 'DURACIÓN (H)', 'OBSERVACIONES']],
        body: data.map(f => {
            totalAcumulado += parseFloat(f.total_time || 0);
            return [
                f.flight_date, f.mission_id, f.aircraft?.model || 'N/A', f.aircraft?.serial_number || 'N/A', 
                f.location, f.takeoff_time, f.landing_time, f.total_time?.toFixed(2) || '0.00', f.notes || ''
            ];
        }),
        foot: [['', '', '', '', '', '', 'TOTAL PERIODO:', totalAcumulado.toFixed(2) + ' H', '']],
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA DEL PILOTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA JEFE DE PILOTOS / CERTIFICADOR", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_PILOTO_${pilotName.replace(' ', '_')}.pdf`);
};

// --- 4. NUEVO GENERADOR: EXPEDIENTE TÉCNICO DE TRIPULANTE (PORTRAIT) ---
export const generatePilotDossier = (pilot, config) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, reportDate } = config;

    // Cabecera Técnica Portrait
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 25); 
    doc.line(50, 10, 50, 35); doc.line(160, 10, 160, 35);
    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 30, 20); } catch (e) {} }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 105, 18, { align: 'center' });
    doc.setFontSize(12); doc.text("EXPEDIENTE TÉCNICO DE TRIPULANTE", 105, 28, { align: 'center' });
    doc.setFontSize(8); doc.text("VERSIÓN: 1.0", 162, 18); doc.text(`EMISIÓN: ${reportDate}`, 162, 28);

    // Bloques de Información
    const drawBlockHeader = (y, title, color = [26, 32, 44]) => {
        doc.setFillColor(...color); doc.rect(10, y, 190, 8, 'F');
        doc.setTextColor(255); doc.setFontSize(9); doc.text(title, 15, y + 5);
        doc.setTextColor(0);
    };

    drawBlockHeader(40, "01. INFORMACIÓN PERSONAL Y DE IDENTIDAD");
    doc.setFontSize(10);
    doc.text(`Nombre Completo: ${pilot.name}`, 15, 55);
    doc.text(`Identificación: ${pilot.id_number || 'N/A'}`, 15, 62);
    doc.text(`Email: ${pilot.email || 'N/A'}`, 15, 69);
    doc.text(`Teléfono: ${pilot.phone || 'N/A'}`, 15, 76);

    drawBlockHeader(85, "02. CREDENCIALES Y CALIFICACIONES", [236, 91, 19]);
    doc.text(`Cargo: ${pilot.pilot_role}`, 15, 100);
    doc.text(`CIPU: ${pilot.license_number || 'PTE'}`, 15, 107);
    doc.text(`Vence Médico: ${pilot.medical_expiry || 'N/R'}`, 15, 114);

    drawBlockHeader(125, "03. DOCUMENTACIÓN DIGITAL (ANEXOS)", [100, 100, 100]);
    let docY = 140;
    const addDocLink = (label, url) => {
        doc.setFontSize(8);
        if (url) {
            doc.setTextColor(0, 31, 63);
            doc.text(`> ${label}: [VER ARCHIVO ONLINE]`, 15, docY);
            doc.textWithLink("   CLIC PARA ABRIR", 15, docY, { url: url });
        } else {
            doc.setTextColor(150); doc.text(`> ${label}: No cargado`, 15, docY);
        }
        docY += 8;
    };
    addDocLink("Cédula Ciudadanía", pilot.id_doc_url);
    addDocLink("Diploma Curso Piloto", pilot.pilot_course_url);
    addDocLink("Certificado Médico", pilot.medical_cert_url);

    drawBlockHeader(185, "04. CONTACTO DE EMERGENCIA", [185, 28, 28]);
    doc.text(`Nombre: ${pilot.emergency_contact_name || 'N/A'}`, 15, 200);
    doc.text(`Teléfono: ${pilot.emergency_contact_phone || 'N/A'}`, 15, 207);

    // Firmas
    const signY = 240;
    doc.line(30, signY, 80, signY); doc.text("FIRMA DEL PILOTO", 55, signY + 5, { align: 'center' });
    doc.line(130, signY, 180, signY); doc.text("FIRMA JEFE DE PILOTOS", 155, signY + 5, { align: 'center' });

    doc.save(`EXPEDIENTE_${pilot.name.replace(' ', '_')}.pdf`);
};