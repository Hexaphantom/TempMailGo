'use strict';
/**
 * TempMailGo backend — powered by the mail.tm public API
 * ---------------------------------------------------------------
 * Responsibilities:
 *   1. Serve the static SPA + SEO pages from /public
 *   2. Provide a REST API the frontend polls for the live inbox
 *   3. Create real inboxes and read real mail via mail.tm (https://docs.mail.tm)
 *
 * === NO DOMAINS / MX / WEBHOOK NEEDED ANYMORE ===
 * mail.tm owns the domains and mail infrastructure. We just call their API.
 *   - No API key, no signup, fully anonymous.
 *   - Hard limit: 8 QPS per IP (shared across all our users) -> see src/mailtm.js
 *   - mail.tm Terms: no reselling as a paid product, no proxying under another
 *     domain, and attribution to mail.tm is required (see footer/README).
 *
 * STATELESS BY DESIGN: the mail.tm bearer token is returned to the browser and
 * sent back on each inbox/message poll. We also keep a tiny in-memory session
 * map as a convenience cache, but nothing needs a database and the app can run
 * on multiple instances (the token in the request is the source of truth).
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const mailtm = require('./mailtm');
const { stripHtml, extractOtp } = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');

// Default UI lifetime for the countdown timer (mail.tm inboxes persist while
// the account exists; we surface a soft expiry to match the original UX).
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---- tiny in-memory session cache (optional convenience; not required) ----
// Maps address -> { token, accountId, password, createdAt, expiresAt }
const sessions = new Map();
function rememberSession(s) {
  sessions.set(s.address.toLowerCase(), s);
  // opportunistic cleanup
  if (sessions.size > 5000) {
    const now = Date.now();
    for (const [k, v] of sessions) if (v.expiresAt < now) sessions.delete(k);
  }
}
function tokenFor(req) {
  // Prefer an explicit token from the client (stateless), fall back to cache.
  const fromHeader = (req.get('x-mail-token') || '').trim();
  if (fromHeader) return fromHeader;
  const fromBody = req.body && req.body.token;
  if (fromBody) return String(fromBody);
  const fromQuery = req.query && req.query.token;
  if (fromQuery) return String(fromQuery);
  const address = String((req.query && req.query.address) || (req.body && req.body.address) || '').toLowerCase();
  const s = sessions.get(address);
  return s ? s.token : '';
}

// ---- domain cache (refreshed every few minutes to respect the rate limit) ----
let domainCache = { list: [], at: 0 };
async function getDomainsCached() {
  const now = Date.now();
  if (domainCache.list.length && now - domainCache.at < 5 * 60 * 1000) return domainCache.list;
  try {
    const list = await mailtm.getDomains();
    if (list.length) domainCache = { list, at: now };
  } catch (_) {}
  return domainCache.list;
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------- helpers ----------
const ADJ = ['swift','quiet','lunar','misty','brave','cosmic','amber','vivid','noble','zesty','fuzzy','pixel','solar','mellow','crimson','arctic','golden','velvet','stormy','clever'];
const NOUN = ['otter','falcon','maple','comet','harbor','cipher','willow','raven','ember','quartz','meadow','tiger','nimbus','cedar','pilot','onyx','breeze','koala','delta','vortex'];

function randomLocalPart() {
  const a = ADJ[crypto.randomInt(ADJ.length)];
  const n = NOUN[crypto.randomInt(NOUN.length)];
  const num = crypto.randomInt(1000, 99999);
  return `${a}${n}${num}`; // mail.tm local parts must be simple; avoid dots to be safe
}
function sanitizeLocal(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
}
function randomPassword() {
  return 'Pw' + crypto.randomBytes(12).toString('base64url') + 'aA1!';
}

function fromParts(from) {
  // mail.tm returns from: { address, name }
  if (from && typeof from === 'object') return { email: from.address || '', name: from.name || '' };
  return { email: String(from || ''), name: '' };
}

// Map a mail.tm list item -> the shape app.js already expects
function toListItem(m) {
  const f = fromParts(m.from);
  const subject = m.subject || '(no subject)';
  const intro = m.intro || '';
  return {
    id: m.id,
    from: f.email || 'unknown@sender',
    fromName: f.name || '',
    subject,
    snippet: intro,
    otp: extractOtp(subject, intro, ''), // full body scanned on open; intro often holds the code
    hasAttachments: !!m.hasAttachments,
    receivedAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  };
}

// Map a mail.tm full message -> the shape app.js modal expects
function toFullMessage(m, address) {
  const f = fromParts(m.from);
  const html = Array.isArray(m.html) ? m.html.join('\n') : (m.html || '');
  const text = m.text || '';
  const subject = m.subject || '(no subject)';
  return {
    id: m.id,
    from: f.email || 'unknown@sender',
    fromName: f.name || '',
    to: address || (Array.isArray(m.to) && m.to[0] && m.to[0].address) || '',
    subject,
    text,
    html,
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

// ================= API =================

// List available domains (from mail.tm, cached)
app.get('/api/domains', async (_req, res) => {
  const domains = await getDomainsCached();
  res.json({ domains });
});

// Create a real mail.tm inbox and return address + token
app.post('/api/generate', async (req, res) => {
  const domains = await getDomainsCached();
  if (!domains.length) return res.status(503).json({ error: 'no_domains', message: 'mail.tm domains unavailable, try again shortly.' });

  let domain = String((req.body && req.body.domain) || '').toLowerCase();
  if (!domains.includes(domain)) domain = domains[crypto.randomInt(domains.length)];

  const custom = req.body && req.body.username ? sanitizeLocal(req.body.username) : '';
  const password = randomPassword();

  // Try a few times to avoid the rare address collision (mail.tm returns 422).
  let created = null, address = '';
  for (let attempt = 0; attempt < (custom ? 1 : 5); attempt++) {
    const local = custom || randomLocalPart();
    address = `${local}@${domain}`;
    const acc = await mailtm.createAccount(address, password);
    if (acc.ok) { created = acc; break; }
    if (acc.status === 422 && custom) {
      return res.status(409).json({ error: 'address_taken', message: 'That username is taken on this domain — try another.' });
    }
    if (acc.status !== 422) {
      return res.status(502).json({ error: 'mailtm_error', message: 'Could not create inbox via mail.tm.', status: acc.status });
    }
  }
  if (!created) return res.status(409).json({ error: 'address_taken', message: 'Could not find a free address, please retry.' });

  const tok = await mailtm.getToken(address, password);
  if (!tok.ok) return res.status(502).json({ error: 'token_error', message: 'Inbox created but token unavailable, please retry.' });

  const now = Date.now();
  const session = { address: created.address, token: tok.token, accountId: created.id || tok.id, password, createdAt: now, expiresAt: now + DEFAULT_TTL_MS };
  rememberSession(session);

  res.json({
    address: created.address,
    token: tok.token,      // client stores this and sends it back on polls
    accountId: session.accountId,
    createdAt: now,
    expiresAt: session.expiresAt,
    ttlMs: DEFAULT_TTL_MS,
  });
});

// Poll inbox via mail.tm using the bearer token
app.get('/api/inbox', async (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const token = tokenFor(req);
  if (!token) return res.status(404).json({ error: 'mailbox_expired', messages: [] });

  const r = await mailtm.listMessages(token);
  if (!r.ok) {
    // token invalid/expired at mail.tm -> tell frontend to regenerate
    if (r.status === 401) return res.status(404).json({ error: 'mailbox_expired', messages: [] });
    return res.status(502).json({ error: 'mailtm_error', messages: [] });
  }
  const messages = r.messages.map(toListItem);
  const s = sessions.get(address);
  const expiresAt = s ? s.expiresAt : Date.now() + DEFAULT_TTL_MS;
  res.json({ address, expiresAt, count: messages.length, messages });
});

// Fetch one full message via mail.tm
app.get('/api/message', async (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const id = String(req.query.id || '');
  const token = tokenFor(req);
  if (!token || !id) return res.status(404).json({ error: 'not_found' });

  const r = await mailtm.getMessage(token, id);
  if (!r.ok) return res.status(r.status === 401 ? 404 : 502).json({ error: 'not_found' });
  res.json(toFullMessage(r.message, address));
});

// Delete a message (best-effort; mail.tm supports DELETE /messages/{id})
app.delete('/api/message', async (req, res) => {
  const id = String(req.query.id || '');
  const token = tokenFor(req);
  if (!token || !id) return res.json({ ok: false });
  const r = await mailtm.deleteMessage(token, id);
  res.json({ ok: !!r.ok });
});

// "Extend time" — mail.tm inboxes live as long as the account exists, so we
// simply push the soft UI expiry forward (keeps the countdown UX intact).
app.post('/api/extend', (req, res) => {
  const address = String((req.body && req.body.address) || '').toLowerCase();
  const s = sessions.get(address);
  const expiresAt = Date.now() + DEFAULT_TTL_MS;
  if (s) s.expiresAt = expiresAt;
  res.json({ address, expiresAt });
});

// Restore a saved inbox: the QR/save link carries address + token, so we just
// re-accept the token (stateless). We re-cache a soft session for the timer.
app.post('/api/restore', (req, res) => {
  const address = String((req.body && req.body.address) || '').toLowerCase();
  const token = String((req.body && req.body.token) || '');
  if (!address || !token) return res.status(404).json({ error: 'mailbox_expired' });
  const now = Date.now();
  const expiresAt = now + DEFAULT_TTL_MS;
  rememberSession({ address, token, accountId: null, password: null, createdAt: now, expiresAt });
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
  const domains = await getDomainsCached();
  res.json({ ok: true, provider: 'mail.tm', domains: domains.length, sessions: sessions.size, time: Date.now() });
});

// ---------- static + page routing ----------
app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: '1h' }));

// SPA/history fallback for clean content routes
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const candidate = path.join(PUBLIC, req.path.replace(/\/$/, '') + '.html');
  res.sendFile(candidate, err => { if (err) res.status(404).sendFile(path.join(PUBLIC, '404.html'), e2 => { if (e2) res.status(404).send('Not found'); }); });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TempMailGo (mail.tm) listening on http://0.0.0.0:${PORT}`);
});
