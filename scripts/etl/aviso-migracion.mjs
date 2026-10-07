#!/usr/bin/env node
// scripts/etl/aviso-migracion.mjs — aviso a T−14 a los clientes que vienen de ePayco (32-migracion.md §7.1, decisión B):
// «activa tu pago con Wompi antes de tu vencimiento; no se te cobrará dos veces». Por defecto SOLO LISTA (no envía nada).
//
//   node --env-file=.env.local scripts/etl/aviso-migracion.mjs                 # lista a quién se le enviaría → avisos-migracion.csv
//   node --env-file=.env.local scripts/etl/aviso-migracion.mjs --send --fecha-corte 2026-11-15   # envía (Resend) y marca migration_notice_sent_at
//   … --again  vuelve a enviar aunque ya se haya avisado
import fs from 'node:fs';
import { Resend } from 'resend';
import { v2db, migratedSubscriptions } from './lib/v2db.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const html = ({ name, company, plan, expires, cutDate, link }) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a202c">
<h2 style="margin:0 0 12px">Tu cuenta de BitaFly pasa a la nueva versión</h2>
<p>Hola${name ? ` ${esc(name)}` : ''}, el <b>${esc(cutDate)}</b> BitaFly cambia a una versión nueva. Tus datos, tu equipo y tu plan <b>${esc(plan)}</b> de <b>${esc(company)}</b> pasan con ella.</p>
<p><b>Qué debes hacer:</b> entra con tu mismo correo y contraseña, y registra tu tarjeta en <b>Suscripción</b> (pago con Wompi) <b>antes del ${esc(expires)}</b>, cuando vence el periodo que ya pagaste. Hasta esa fecha conservas el acceso completo.</p>
<p><b>No se te cobrará dos veces:</b> cancelamos por nuestra cuenta el cobro automático que tenías con ePayco el día del cambio.</p>
<p style="margin:20px 0"><a href="${esc(link)}" style="background:#ec5b13;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Entrar a BitaFly</a></p>
<p style="font-size:12px;color:#718096">¿Dudas? Responde este correo.</p></div>`;

async function main() {
  const db = v2db();
  const send = flag('--send');
  const cutDate = value('--fecha-corte');
  if (send && !/^\d{4}-\d{2}-\d{2}$/.test(cutDate || '')) throw new Error('Para enviar indica --fecha-corte AAAA-MM-DD');
  const subs = (await migratedSubscriptions(db)).filter((s) => s.plan !== 'enterprise' && s.expires_at && !(s.payment_provider === 'wompi' && s.wompi_payment_source_id));
  const rows = [];
  const resend = send ? new Resend(process.env.RESEND_API_KEY) : null;
  if (send && !process.env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY');
  for (const s of subs) {
    for (const a of s.admins) {
      const already = !!s.migration_notice_sent_at && !flag('--again');
      let status = already ? 'ya avisado' : send ? 'enviado' : 'por enviar';
      if (send && !already) {
        const { error } = await resend.emails.send({ from: 'BitaFly <no-reply@bitafly.com>', to: [a.email], subject: 'Tu cuenta de BitaFly pasa a la nueva versión: activa tu pago', html: html({ name: a.full_name, company: s.company, plan: s.plan, expires: s.expires_at, cutDate, link: process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com' }) });
        if (error) status = `ERROR: ${error.message || error}`;
      }
      rows.push({ organizacion: s.company, plan: s.plan, vence: s.expires_at, correo: a.email, estado: status });
    }
    if (send && !s.migration_notice_sent_at && rows.some((r) => r.organizacion === s.company && r.estado === 'enviado')) await db.from('subscriptions').update({ migration_notice_sent_at: new Date().toISOString() }).eq('organization_id', s.organization_id);
  }
  const cols = ['organizacion', 'plan', 'vence', 'correo', 'estado'];
  fs.writeFileSync('avisos-migracion.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(','))].join('\n') + '\n');
  console.log(`${rows.length} destinatario(s) en ${new Set(rows.map((r) => r.organizacion)).size} organización(es) → avisos-migracion.csv${send ? '' : ' (no se envió nada: usa --send)'}`);
}
main().catch((e) => { console.error(`aviso-migracion detenido: ${e.message}`); process.exit(1); });
