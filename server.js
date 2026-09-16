'use strict';
/**
 * TempMailGo backend — multi-provider (mail.tm + Guerrilla Mail)
 * ---------------------------------------------------------------
 * Both providers are free, need no API key, and — verified end-to-end — actually
 * receive real external email and OTP codes.
 *
 *   - mail.tm      : real domains it owns (fetched live via GET /domains).
 *                    8 QPS/IP limit -> throttled in src/mailtm.js.
 *   - Guerrilla    : serves "@guerrillamailblock.com" from a server IP.
 *
 * PROVIDER ROUTING (fully stateless, no frontend changes needed):
 *   - The domain the user picks decides which provider creates the inbox.
 *   - The token we return is prefixed: Guerrilla tokens start with "g:".
 *   - /api/inbox and /api/message inspect the token prefix and route accordingly.
 *
 * NOTE ON "custom domains" (gmail.com, googlemail.com, gamil.com, yhoo.com, ...):
 *   These are intentionally NOT offered. A site can only read mail for a domain
 *   it OWNS or has an API for. Those domains belong to Google/Yahoo/strangers,
 *   so an OTP sent to them would never reach this app — offering them would just
 *   produce a permanently empty inbox. Only domains that truly deliver are shown.
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const mailtm = require('./mailtm');
const guerrilla = require('./guerrilla');
const mailinator = require('./mailinator');
const dropmail = require('./dropmail');
const { stripHtml, extractOtp } = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');
const DEFAULT_TTL_MS = 60 * 60 * 1000; // soft UI expiry for the countdown

// ---- in-memory session cache (convenience only; token is source of truth) ----
const sessions = new Map(); // address -> { token, provider, createdAt, expiresAt }
function rememberSession(s) {
  sessions.set(s.address.toLowerCase(), s);
  if (sessions.size > 5000) {
    const now = Date.now();
    for (const [k, v] of sessions) if (v.expiresAt < now) sessions.delete(k);
  }
}
function tokenFor(req) {
  const fromHeader = (req.get('x-mail-token') || '').trim();
  if (fromHeader) return fromHeader;
  if (req.body && req.body.token) return String(req.body.token);
  if (req.query && req.query.token) return String(req.query.token);
  const address = String((req.query && req.query.address) || (req.body && req.body.address) || '').toLowerCase();
  const s = sessions.get(address);
  return s ? s.token : '';
}
// Token prefixes identify the provider so inbox/message polls route statelessly:
//   "g:"  Guerrilla   |   "mi:" Mailinator   |   "d:" DropMail   |   (else) mail.tm
function providerForToken(token) {
  const t = String(token || '');
  if (t.startsWith('g:')) return 'guerrilla';
  if (t.startsWith('mi:')) return 'mailinator';
  if (t.startsWith('d:')) return 'dropmail';
  return 'mailtm';
}
// Mailinator token just wraps the username (no server auth needed).
function makeMailinatorToken(username) { return 'mi:' + username; }
function readMailinatorToken(token) { return String(token || '').slice(3); }
// DropMail token wraps { s: sessionId, t: afToken } so polls are stateless.
function makeDropmailToken(sessionId, afToken) {
  return 'd:' + Buffer.from(JSON.stringify({ s: sessionId, t: afToken })).toString('base64url');
}
function readDropmailToken(token) {
  try { return JSON.parse(Buffer.from(String(token).slice(2), 'base64url').toString()); }
  catch (_) { return null; }
}

// ---- domain catalog (all providers), cached ----
const GUERRILLA_DOMAIN = 'guerrillamailblock.com';
const MAILINATOR_DOMAIN = 'mailinator.com';
// which provider owns a given domain string
const dropmailDomains = new Set(); // filled from DropMail's live domain list
function providerForDomain(d) {
  const dom = String(d || '').toLowerCase();
  if (dom === GUERRILLA_DOMAIN) return 'guerrilla';
  if (dom === MAILINATOR_DOMAIN) return 'mailinator';
  if (dropmailDomains.has(dom)) return 'dropmail';
  return 'mailtm';
}
let _dropmailDomainMeta = []; // [{ id, name }]
let domainCache = { list: [], at: 0 };
async function getDomainCatalog() {
  const now = Date.now();
  if (domainCache.list.length && now - domainCache.at < 5 * 60 * 1000) return domainCache.list;
  const [mt, dm] = await Promise.all([
    mailtm.getDomains().catch(() => []),
    dropmail.getDomains().catch(() => []),
  ]);
  _dropmailDomainMeta = dm || [];
  dropmailDomains.clear();
  for (const d of _dropmailDomainMeta) dropmailDomains.add(d.name.toLowerCase());
  // Order: mail.tm domains, a few DropMail domains, Mailinator, Guerrilla.
  const set = new Set(mt);
  for (const d of _dropmailDomainMeta.slice(0, 6)) set.add(d.name);
  set.add(MAILINATOR_DOMAIN);
  set.add(GUERRILLA_DOMAIN);
  const list = Array.from(set);
  if (list.length) domainCache = { list, at: now };
  return domainCache.list.length ? domainCache.list : list;
}
function dropmailDomainId(name) {
  const d = _dropmailDomainMeta.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
  return d ? d.id : null;
}
function isGuerrillaDomain(d) { return String(d || '').toLowerCase() === GUERRILLA_DOMAIN; }

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------- helpers ----------
const ADJ = ['swift','quiet','lunar','misty','brave','cosmic','amber','vivid','noble','zesty','fuzzy','pixel','solar','mellow','crimson','arctic','golden','velvet','stormy','clever'];
const NOUN = ['otter','falcon','maple','comet','harbor','cipher','willow','raven','ember','quartz','meadow','tiger','nimbus','cedar','pilot','onyx','breeze','koala','delta','vortex'];
function randomLocalPart() {
  return `${ADJ[crypto.randomInt(ADJ.length)]}${NOUN[crypto.randomInt(NOUN.length)]}${crypto.randomInt(1000, 99999)}`;
}
function sanitizeLocal(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
}
function randomPassword() { return 'Pw' + crypto.randomBytes(12).toString('base64url') + 'aA1!'; }

function fromParts(from) {
  if (from && typeof from === 'object') return { email: from.address || '', name: from.name || '' };
  return { email: String(from || ''), name: '' };
}

// ---- mappers: mail.tm ----
function mtListItem(m) {
  const f = fromParts(m.from);
  const subject = m.subject || '(no subject)';
  const intro = m.intro || '';
  return {
    id: m.id, from: f.email || 'unknown@sender', fromName: f.name || '',
    subject, snippet: intro, otp: extractOtp(subject, intro, ''),
    hasAttachments: !!m.hasAttachments,
    receivedAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  };
}
function mtFullMessage(m, address) {
  const f = fromParts(m.from);
  const html = Array.isArray(m.html) ? m.html.join('\n') : (m.html || '');
  const text = m.text || '';
  const subject = m.subject || '(no subject)';
  return {
    id: m.id, from: f.email || 'unknown@sender', fromName: f.name || '',
    to: address || (Array.isArray(m.to) && m.to[0] && m.to[0].address) || '',
    subject, text, html,
    snippet: m.intro || (text ? text.slice(0, 140) : stripHtml(html).slice(0, 140)),
    otp: extractOtp(subject, text, html),
    attachments: (m.attachments || []).map((a) => ({
      filename: a.filename || a.name || 'attachment',
      contentType: a.contentType || a.type || 'application/octet-stream',
      size: a.size || 0,
    })),
    receivedAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  };
}

// ---- mappers: Guerrilla (different field names) ----
function gmListItem(m) {
  const subject = m.mail_subject || '(no subject)';
  const excerpt = m.mail_excerpt || '';
  return {
    id: String(m.mail_id),
    from: m.mail_from || 'unknown@sender',
    fromName: '',
    subject,
    snippet: excerpt,
    otp: extractOtp(subject, excerpt, ''),
    hasAttachments: !!(m.att && Number(m.att) > 0),
    receivedAt: m.mail_timestamp ? Number(m.mail_timestamp) * 1000 : Date.now(),
  };
}
function gmFullMessage(m, address) {
  const html = m.mail_body || '';
  const text = m.content_type === 'text' ? (m.mail_body || '') : stripHtml(m.mail_body || '');
  const subject = m.mail_subject || '(no subject)';
  return {
    id: String(m.mail_id),
    from: m.mail_from || 'unknown@sender',
    fromName: '',
    to: address || m.mail_recipient || '',
    subject,
    text,
    html: m.content_type === 'html' ? html : '',
    snippet: (text || stripHtml(html)).slice(0, 140),
    otp: extractOtp(subject, text, html),
    attachments: [],
    receivedAt: m.mail_timestamp ? Number(m.mail_timestamp) * 1000 : Date.now(),
  };
}

// ---- mappers: Mailinator ----
function miListItem(m) {
  const subject = m.subject || '(no subject)';
  return {
    id: m.id,
    from: m.fromfull || m.from || 'unknown@sender',
    fromName: m.from || '',
    subject,
    snippet: '', // Mailinator list has no preview; OTP is scanned on open
    otp: extractOtp(subject, '', ''),
    hasAttachments: !!(m.hasAttachments || (m.attachments && m.attachments.length)),
    receivedAt: m.time || (m.seconds_ago ? Date.now() - m.seconds_ago * 1000 : Date.now()),
  };
}
function miFullMessage(m, address) {
  const { html, text } = mailinator.extractBodies(m);
  const subject = m.subject || '(no subject)';
  return {
    id: m.id,
    from: m.fromfull || m.from || 'unknown@sender',
    fromName: m.from || '',
    to: address || (m.to ? m.to + '@' + MAILINATOR_DOMAIN : ''),
    subject, text, html,
    snippet: (text || stripHtml(html)).slice(0, 140),
    otp: extractOtp(subject, text, html),
    attachments: (m.parts || [])
      .filter((p) => p.headers && /attachment/i.test(p.headers['content-disposition'] || ''))
      .map((p) => ({ filename: 'attachment', contentType: (p.headers && p.headers['content-type']) || 'application/octet-stream', size: (p.body || '').length })),
    receivedAt: m.time || Date.now(),
  };
}

// ---- mappers: DropMail ----
function dmListItem(m) {
  const subject = m.headerSubject || '(no subject)';
  const text = m.text || '';
  return {
    id: m.id,
    from: m.fromAddr || 'unknown@sender',
    fromName: m.headerFrom || '',
    subject,
    snippet: (text || stripHtml(m.html || '')).slice(0, 140),
    otp: extractOtp(subject, text, m.html || ''),
    hasAttachments: false,
    receivedAt: m.receivedAt ? new Date(m.receivedAt).getTime() : Date.now(),
  };
}
function dmFullMessage(m, address) {
  const subject = m.headerSubject || '(no subject)';
  const text = m.text || '';
  const html = m.html || '';
  return {
    id: m.id,
    from: m.fromAddr || 'unknown@sender',
    fromName: m.headerFrom || '',
    to: address || m.toAddr || '',
    subject, text, html,
    snippet: (text || stripHtml(html)).slice(0, 140),
    otp: extractOtp(subject, text, html),
    attachments: [],
    receivedAt: m.receivedAt ? new Date(m.receivedAt).getTime() : Date.now(),
  };
}

// ================= API =================

app.get('/api/domains', async (_req, res) => {
  const domains = await getDomainCatalog();
  res.json({ domains });
});

// Create an inbox with the right provider based on the chosen domain.
app.post('/api/generate', async (req, res) => {
  const catalog = await getDomainCatalog();
  let domain = String((req.body && req.body.domain) || '').toLowerCase();
  const custom = req.body && req.body.username ? sanitizeLocal(req.body.username) : '';

  // If no valid domain chosen, default to a mail.tm domain when available.
  if (!catalog.includes(domain)) {
    const mtOnly = catalog.filter((d) => providerForDomain(d) === 'mailtm');
    const pool = mtOnly.length ? mtOnly : catalog;
    domain = pool[crypto.randomInt(pool.length)];
  }

  const provider = providerForDomain(domain);
  const now0 = Date.now();

  // -------- Guerrilla path --------
  if (provider === 'guerrilla') {
    const gm = await guerrilla.create(custom);
    if (!gm.ok) return res.status(502).json({ error: 'guerrilla_error', message: 'Could not create a Guerrilla inbox, try another domain.' });
    rememberSession({ address: gm.address, token: gm.token, provider: 'guerrilla', createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS });
    return res.json({ address: gm.address, token: gm.token, provider: 'guerrilla', createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS, ttlMs: DEFAULT_TTL_MS });
  }

  // -------- Mailinator path (no API call to create; public inbox) --------
  if (provider === 'mailinator') {
    const address = mailinator.randomAddress(custom);
    const username = address.split('@')[0];
    const token = makeMailinatorToken(username);
    rememberSession({ address, token, provider: 'mailinator', createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS });
    return res.json({ address, token, provider: 'mailinator', createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS, ttlMs: DEFAULT_TTL_MS });
  }

  // -------- DropMail path --------
  if (provider === 'dropmail') {
    const dm = await dropmail.create(dropmailDomainId(domain));
    if (!dm.ok || !dm.address) return res.status(502).json({ error: 'dropmail_error', message: 'Could not create a DropMail inbox, try another domain.' });
    const token = makeDropmailToken(dm.sessionId, dm.afToken);
    rememberSession({ address: dm.address, token, provider: 'dropmail', createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS });
    return res.json({ address: dm.address, token, provider: 'dropmail', restoreKey: dm.restoreKey, createdAt: now0, expiresAt: now0 + DEFAULT_TTL_MS, ttlMs: DEFAULT_TTL_MS });
  }

  // -------- mail.tm path --------
  const mtDomains = catalog.filter((d) => providerForDomain(d) === 'mailtm');
  if (!mtDomains.length) return res.status(503).json({ error: 'no_domains', message: 'No mail.tm domains available right now, try the other domain.' });

  const password = randomPassword();
  let created = null, address = '';
  for (let attempt = 0; attempt < (custom ? 1 : 5); attempt++) {
    const local = custom || randomLocalPart();
    address = `${local}@${domain}`;
    const acc = await mailtm.createAccount(address, password);
    if (acc.ok) { created = acc; break; }
    if (acc.status === 422 && custom) return res.status(409).json({ error: 'address_taken', message: 'That username is taken on this domain — try another.' });
    if (acc.status !== 422) return res.status(502).json({ error: 'mailtm_error', message: 'Could not create inbox via mail.tm.', status: acc.status });
  }
  if (!created) return res.status(409).json({ error: 'address_taken', message: 'Could not find a free address, please retry.' });

  const tok = await mailtm.getToken(address, password);
  if (!tok.ok) return res.status(502).json({ error: 'token_error', message: 'Inbox created but token unavailable, please retry.' });

  const now = Date.now();
  rememberSession({ address: created.address, token: tok.token, provider: 'mailtm', createdAt: now, expiresAt: now + DEFAULT_TTL_MS });
  res.json({ address: created.address, token: tok.token, provider: 'mailtm', accountId: created.id || tok.id, createdAt: now, expiresAt: now + DEFAULT_TTL_MS, ttlMs: DEFAULT_TTL_MS });
});

// Poll inbox (routes by token prefix)
app.get('/api/inbox', async (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const token = tokenFor(req);
  if (!token) return res.status(404).json({ error: 'mailbox_expired', messages: [] });

  const s = sessions.get(address);
  const expiresAt = s ? s.expiresAt : Date.now() + DEFAULT_TTL_MS;

  const provider = providerForToken(token);

  if (provider === 'guerrilla') {
    const r = await guerrilla.listMessages(token);
    if (!r.ok) return res.status(r.status === 401 ? 404 : 502).json({ error: 'mailbox_error', messages: [] });
    const messages = r.messages.map(gmListItem);
    return res.json({ address, expiresAt, count: messages.length, messages });
  }

  if (provider === 'mailinator') {
    const r = await mailinator.listMessages(readMailinatorToken(token));
    if (!r.ok) return res.status(502).json({ error: 'mailinator_error', messages: [] });
    const messages = r.messages.map(miListItem);
    return res.json({ address, expiresAt, count: messages.length, messages });
  }

  if (provider === 'dropmail') {
    const t = readDropmailToken(token);
    if (!t) return res.status(404).json({ error: 'mailbox_expired', messages: [] });
    const r = await dropmail.listMessages(t.s, t.t);
    if (!r.ok) return res.status(r.status === 403 ? 404 : 502).json({ error: 'dropmail_error', messages: [] });
    const messages = r.messages.map(dmListItem);
    return res.json({ address, expiresAt, count: messages.length, messages });
  }

  const r = await mailtm.listMessages(token);
  if (!r.ok) {
    if (r.status === 401) return res.status(404).json({ error: 'mailbox_expired', messages: [] });
    return res.status(502).json({ error: 'mailtm_error', messages: [] });
  }
  const messages = r.messages.map(mtListItem);
  res.json({ address, expiresAt, count: messages.length, messages });
});

// Fetch full message (routes by token prefix)
app.get('/api/message', async (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const id = String(req.query.id || '');
  const token = tokenFor(req);
  if (!token || !id) return res.status(404).json({ error: 'not_found' });

  const provider = providerForToken(token);

  if (provider === 'guerrilla') {
    const r = await guerrilla.getMessage(token, id);
    if (!r.ok) return res.status(404).json({ error: 'not_found' });
    return res.json(gmFullMessage(r.message, address));
  }

  if (provider === 'mailinator') {
    const r = await mailinator.getMessage(id);
    if (!r.ok) return res.status(404).json({ error: 'not_found' });
    return res.json(miFullMessage(r.message, address));
  }

  if (provider === 'dropmail') {
    const t = readDropmailToken(token);
    if (!t) return res.status(404).json({ error: 'not_found' });
    const r = await dropmail.getMessage(t.s, id, t.t);
    if (!r.ok) return res.status(404).json({ error: 'not_found' });
    return res.json(dmFullMessage(r.message, address));
  }

  const r = await mailtm.getMessage(token, id);
  if (!r.ok) return res.status(r.status === 401 ? 404 : 502).json({ error: 'not_found' });
  res.json(mtFullMessage(r.message, address));
});

// Delete a message (routes by token prefix)
app.delete('/api/message', async (req, res) => {
  const id = String(req.query.id || '');
  const token = tokenFor(req);
  if (!token || !id) return res.json({ ok: false });
  const provider = providerForToken(token);
  let r = { ok: false };
  if (provider === 'guerrilla') r = await guerrilla.deleteMessage(token, id);
  else if (provider === 'mailtm') r = await mailtm.deleteMessage(token, id);
  // Mailinator public API + DropMail have no per-message delete here; no-op ok.
  else r = { ok: true };
  res.json({ ok: !!(r && r.ok) });
});

// "Extend time" — push the soft UI expiry forward (keeps the countdown UX).
app.post('/api/extend', (req, res) => {
  const address = String((req.body && req.body.address) || '').toLowerCase();
  const s = sessions.get(address);
  const expiresAt = Date.now() + DEFAULT_TTL_MS;
  if (s) s.expiresAt = expiresAt;
  res.json({ address, expiresAt });
});

// Restore a saved inbox (address + token from the QR/save link).
app.post('/api/restore', (req, res) => {
  const address = String((req.body && req.body.address) || '').toLowerCase();
  const token = String((req.body && req.body.token) || '');
  if (!address || !token) return res.status(404).json({ error: 'mailbox_expired' });
  const now = Date.now();
  const expiresAt = now + DEFAULT_TTL_MS;
  rememberSession({ address, token, provider: providerForToken(token), createdAt: now, expiresAt });
  res.json({ address, expiresAt });
});

// Server-side QR code (SVG) for the "save / restore inbox" feature.
app.get('/api/qr', (req, res) => {
  const data = String(req.query.data || '').slice(0, 1200);
  if (!data) return res.status(400).send('missing data');
  QRCode.toString(data, { type: 'svg', margin: 1, color: { dark: '#4c6fe6', light: '#ffffff' } }, (err, svg) => {
    if (err) return res.status(500).send('qr error');
    res.type('image/svg+xml').send(svg);
  });
});

app.get('/api/health', async (_req, res) => {
  const domains = await getDomainCatalog();
  res.json({ ok: true, providers: ['mail.tm', 'guerrillamail', 'mailinator', 'dropmail'], domains: domains.length, sessions: sessions.size, time: Date.now() });
});

// ---------- static + page routing ----------
app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: '1h' }));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const candidate = path.join(PUBLIC, req.path.replace(/\/$/, '') + '.html');
  res.sendFile(candidate, err => { if (err) res.status(404).sendFile(path.join(PUBLIC, '404.html'), e2 => { if (e2) res.status(404).send('Not found'); }); });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TempMailGo (mail.tm + DropMail + Mailinator + Guerrilla) listening on http://0.0.0.0:${PORT}`);
});
