import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from './parser.js';

// Fecha de referencia fija para que las pruebas de fechas relativas
// ("mañana", "viernes", etc.) sean deterministas. 2026-09-22 es martes.
const REF = new Date('2026-09-22T09:00:00');

// 30 frases de ARDIS.md §6 y sus variaciones. Criterio de "listo" de la
// Fase 2: al menos 27/30 correctas.
const CASES = [
  // create_task — básicas
  { text: 'tarea llamar a Iván mañana 3 pm SKY', type: 'create_task', check: (r) => r.title === 'llamar a Iván' && r.area === 'SKY' && r.dueAt !== null },
  { text: 'tarea pagar arriendo BIT', type: 'create_task', check: (r) => r.title === 'pagar arriendo' && r.area === 'BIT' },
  { text: 'nueva tarea revisar contrato con el cliente PER', type: 'create_task', check: (r) => r.title === 'revisar contrato con el cliente' && r.area === 'PER' },
  { text: 'tarea enviar cotización viernes WAS', type: 'create_task', check: (r) => r.title === 'enviar cotización' && r.area === 'WAS' && r.dueAt !== null },
  { text: 'tarea comprar baterías', type: 'create_task', check: (r) => r.title === 'comprar baterías' && r.area === null && r.dueAt === null },
  { text: 'tarea revisar dron mañana', type: 'create_task', check: (r) => r.title === 'revisar dron' && r.dueAt !== null },
  { text: 'tarea preparar factura viernes 16:00 SKY', type: 'create_task', check: (r) => r.title === 'preparar factura' && r.area === 'SKY' && r.dueAt !== null },
  { text: 'tarea llamar al banco', type: 'create_task', check: (r) => r.title === 'llamar al banco' },
  { text: 'tarea coordinar vuelo con Andrés WAS', type: 'create_task', check: (r) => r.title === 'coordinar vuelo con Andrés' && r.area === 'WAS' },
  { text: 'tarea cerrar informe mensual', type: 'create_task', check: (r) => r.title === 'cerrar informe mensual' },

  // create_task — recurrencia
  { text: 'tarea reunión cada lunes con el equipo BIT', type: 'create_task', check: (r) => r.recurrence === 'weekly:MO' && r.area === 'BIT' && r.title === 'reunión con el equipo' },
  { text: 'tarea backup semanal cada semana', type: 'create_task', check: (r) => r.recurrence === 'weekly:MO' },
  { text: 'tarea pagar nómina cada mes día 5', type: 'create_task', check: (r) => r.recurrence === 'monthly:5' },
  { text: 'tarea revisar métricas cada viernes SKY', type: 'create_task', check: (r) => r.recurrence === 'weekly:FR' && r.area === 'SKY' },

  // create_task — delegación y dependencias
  { text: 'tarea entregar informe delegado a Carlos', type: 'create_task', check: (r) => r.waitingFor === 'Carlos' },
  { text: 'tarea firmar contrato esperando a legal', type: 'create_task', check: (r) => r.waitingFor === 'legal' },
  { text: 'tarea publicar reporte depende de cerrar informe mensual', type: 'create_task', check: (r) => r.dependsOnTitle === 'cerrar informe mensual' },

  // complete_task
  { text: 'listo llamar a Iván', type: 'complete_task', check: (r) => r.title === 'llamar a Iván' },
  { text: 'listo pagar arriendo', type: 'complete_task', check: (r) => r.title === 'pagar arriendo' },
  { text: 'listo comprar baterías', type: 'complete_task', check: (r) => r.title === 'comprar baterías' },
  { text: 'listo enviar cotización', type: 'complete_task', check: (r) => r.title === 'enviar cotización' },
  { text: 'listo revisar dron', type: 'complete_task', check: (r) => r.title === 'revisar dron' },

  // postpone_task
  { text: 'pospón cotización al viernes', type: 'postpone_task', check: (r) => r.title === 'cotización' && r.dueAt !== null },
  { text: 'posponer entrega a mañana', type: 'postpone_task', check: (r) => r.title === 'entrega' && r.dueAt !== null },
  { text: 'aplaza reunión para el lunes', type: 'postpone_task', check: (r) => r.title === 'reunión' && r.dueAt !== null },
  { text: 'pospon pago al viernes', type: 'postpone_task', check: (r) => r.title === 'pago' && r.dueAt !== null },

  // progress_update
  { text: 'avance inventario 70%', type: 'progress_update', check: (r) => r.target === 'inventario' && r.percent === 70 },
  { text: 'avance mantenimiento drones 45%', type: 'progress_update', check: (r) => r.target === 'mantenimiento drones' && r.percent === 45 },

  // comandos de resumen (con y sin tilde)
  { text: 'buenos días', type: 'daily_summary', check: () => true },
  { text: 'que sigue', type: 'next_task', check: () => true },
  { text: 'cierre', type: 'day_close', check: () => true },
];

test(`parser: ${CASES.length} frases de ARDIS.md §6`, () => {
  let correct = 0;
  const failures = [];

  for (const { text, type, check } of CASES) {
    const result = parseCommand(text, REF);
    const typeOk = result.type === type;
    const detailOk = typeOk && check(result);
    if (typeOk && detailOk) {
      correct += 1;
    } else {
      failures.push({ text, expected: type, got: result });
    }
  }

  if (failures.length > 0) {
    console.log('Fallos:', JSON.stringify(failures, null, 2));
  }

  assert.ok(
    correct >= 27,
    `Se esperaban al menos 27/${CASES.length} frases correctas, se obtuvieron ${correct}`
  );
});

test('parser: entrada vacía es unknown', () => {
  assert.strictEqual(parseCommand('').type, 'unknown');
  assert.strictEqual(parseCommand('   ').type, 'unknown');
});

test('parser: frase no reconocida es unknown', () => {
  assert.strictEqual(parseCommand('¿cómo está el clima hoy?').type, 'unknown');
});
