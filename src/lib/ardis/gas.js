import 'server-only';

// El script de Apps Script vive fuera del repo (en script.google.com). El
// código fuente de referencia está en ARDIS.md §13 — el usuario lo pega ahí,
// lo despliega como Web App, y pone la URL resultante en ARDIS_GAS_URL.
async function callGas(action, payload) {
  const url = process.env.ARDIS_GAS_URL;
  const secret = process.env.ARDIS_GAS_SECRET;
  if (!url || !secret) {
    throw new Error('ARDIS_GAS_URL / ARDIS_GAS_SECRET no configuradas');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, action, payload }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Apps Script respondió ${res.status}`);
  }
  return data;
}

export function getWeekMeetings() {
  return callGas('get_week_meetings', {});
}

export function createCalendarBlock({ title, start, end }) {
  return callGas('create_calendar_block', { title, start, end });
}

export function syncGanttToSheet(projectName, tasks) {
  return callGas('sync_gantt', { projectName, tasks });
}

export function backupToDrive(payload) {
  return callGas('backup', payload);
}
