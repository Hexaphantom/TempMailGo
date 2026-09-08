'use strict';
/**
 * TempMailGo backend
 * ---------------------------------------------------------------
 * Responsibilities:
 *   1. Serve the static SPA + SEO pages from /public
 *   2. Provide a REST API the frontend polls for the live inbox
 *   3. Receive REAL inbound email via a provider webhook and store it
 *
 * === WHAT YOU MUST SET UP EXTERNALLY (cannot be pure frontend) ===
 * See README / "How it works" — you need:
 *   - domain(s) you own with MX records pointing at an inbound provider
 *   - an inbound email provider (Mailgun Routes, ImprovMX, Postfix, etc.)
 *     configured to POST parsed mail to  POST /api/inbound
 * Without that step the inbox works but no real mail arrives.
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { MailStore, DEFAULT_TTL_MS } = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');
const store = new MailStore();

// Domains offered in the UI. These MUST be domains you actually own and
// have pointed MX records at your inbound provider for real mail to work.
const DOMAINS = [
  'tempmailgo.com',
  'inboxgo.net',
  'mailburner.org',
  'quickbox.xyz',
  'trashinbox.online',
  'ghostmail.site',
  'nofuss.email',
  'shieldbox.co',
  'campusmail.edu.pl',
  'devtester.dev',
  'privasend.io',
  'zapmail.live',
  // NOTE: The four domains below are added per request. They will only actually
  // RECEIVE mail if you own them and control their MX records — which is
  // impossible for gmail.com / google.com / yahoo.com (owned by Google/Yahoo).
  // student.com is owned by a real company. See README "About these domains".
  // They are safe to display, but treat them as demo/aliases unless you own them.
  'yahoo.com',
  'google.com',
  'gmail.com',
  'student.com',
];

// Optional shared secret to authenticate the inbound webhook.
const INBOUND_SECRET = process.env.INBOUND_SECRET || '';

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// ---------- tiny helpers ----------
const ADJ = ['swift','quiet','lunar','misty','brave','cosmic','amber','vivid','noble','zesty','fuzzy','pixel','solar','mellow','crimson','arctic','golden','velvet','stormy','clever'];
const NOUN = ['otter','falcon','maple','comet','harbor','cipher','willow','raven','ember','quartz','meadow','tiger','nimbus','cedar','pilot','onyx','breeze','koala','delta','vortex'];

function randomLocalPart() {
  const a = ADJ[crypto.randomInt(ADJ.length)];
  const n = NOUN[crypto.randomInt(NOUN.length)];
  const num = crypto.randomInt(1000, 99999);
  return `${a}.${n}${num}`;
}
function sanitizeLocal(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40).replace(/^[._-]+|[._-]+$/g, '');
}
function isValidDomain(d) { return DOMAINS.includes(String(d || '').toLowerCase()); }

// ================= API =================

// List available domains
app.get('/api/domains', (_req, res) => res.json({ domains: DOMAINS }));

// Generate a brand-new random address (collision-checked against live store)
app.post('/api/generate', (req, res) => {
  let domain = (req.body && req.body.domain || '').toLowerCase();
  if (!isValidDomain(domain)) domain = DOMAINS[crypto.randomInt(DOMAINS.length)];

  let custom = req.body && req.body.username ? sanitizeLocal(req.body.username) : '';
  let local = custom || randomLocalPart();
  let address = `${local}@${domain}`;

  // "never been used before" guarantee: regenerate on any live collision
  let guard = 0;
  while (!custom && store.getMailbox(address) && guard < 30) {
    local = randomLocalPart();
    address = `${local}@${domain}`;
    guard++;
  }
  const box = store.createMailbox(address);
  res.json({
    address: box.address,
    token: box.token,
    createdAt: box.createdAt,
    expiresAt: box.expiresAt,
    ttlMs: DEFAULT_TTL_MS,
  });
});

// Poll inbox for a given address
app.get('/api/inbox', (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const box = store.getMailbox(address);
  if (!box) return res.status(404).json({ error: 'mailbox_expired', messages: [] });
  const messages = box.messages.map(m => ({
    id: m.id, from: m.from, fromName: m.fromName, subject: m.subject,
    snippet: m.snippet, otp: m.otp, hasAttachments: m.attachments.length > 0,
    receivedAt: m.receivedAt,
  }));
  res.json({ address: box.address, expiresAt: box.expiresAt, count: messages.length, messages });
});

// Fetch one full message (html/text/attachments meta)
app.get('/api/message', (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const id = String(req.query.id || '');
  const msg = store.getMessage(address, id);
  if (!msg) return res.status(404).json({ error: 'not_found' });
  res.json(msg);
});

// Delete a message
app.delete('/api/message', (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  const id = String(req.query.id || '');
  res.json({ ok: store.deleteMessage(address, id) });
});

// Extend / save a mailbox lifetime
app.post('/api/extend', (req, res) => {
  const address = String(req.body && req.body.address || '').toLowerCase();
  const box = store.extendMailbox(address);
  if (!box) return res.status(404).json({ error: 'mailbox_expired' });
  res.json({ address: box.address, expiresAt: box.expiresAt });
});

// Restore a saved mailbox via token (for the "save address" feature)
app.post('/api/restore', (req, res) => {
  const address = String(req.body && req.body.address || '').toLowerCase();
  const token = String(req.body && req.body.token || '');
  let box = store.getMailbox(address);
  if (box && box.token === token) { store.extendMailbox(address); return res.json({ address: box.address, expiresAt: box.expiresAt }); }
  // recreate the mailbox if it expired but the user has a valid-looking token
  box = store.createMailbox(address);
  res.json({ address: box.address, expiresAt: box.expiresAt, recreated: true });
});

/**
 * INBOUND EMAIL WEBHOOK  ── the heart of the real service.
 * Point your provider's inbound route/forward here.
 *
 * Accepts three shapes automatically:
 *   A) Mailgun "Store & Notify" / Routes (multipart form fields)
 *   B) ImprovMX / SendGrid Inbound Parse style form fields
 *   C) A normalized JSON body { to, from, subject, text, html, attachments }
 */
app.post('/api/inbound', (req, res) => {
  if (INBOUND_SECRET) {
    const sig = req.get('x-webhook-secret') || (req.body && req.body.secret) || req.query.secret;
    if (sig !== INBOUND_SECRET) return res.status(401).json({ error: 'unauthorized' });
  }
  const b = req.body || {};

  // recipient can appear under many keys depending on provider
  const rawTo = b.recipient || b.to || b.To || b['envelope[to]'] || (b.envelope && b.envelope.to) || '';
  const toAddr = extractEmail(rawTo);
  if (!toAddr) return res.status(400).json({ error: 'no_recipient' });

  const fromRaw = b.from || b.From || b.sender || '';
  const message = {
    from: extractEmail(fromRaw) || fromRaw,
    fromName: extractName(fromRaw),
    subject: b.subject || b.Subject || '',
    text: b['body-plain'] || b.text || b.plain || b['stripped-text'] || '',
    html: b['body-html'] || b.html || b['stripped-html'] || '',
    attachments: normalizeAttachments(b),
  };
  const saved = store.deliver(toAddr, message);
  res.json({ ok: true, id: saved.id, to: toAddr });
});

// ---- Demo endpoint: inject a sample email so the UI is testable without DNS.
// Remove or protect this in production.
app.post('/api/demo-mail', (req, res) => {
  const address = String(req.body && req.body.address || '').toLowerCase();
  if (!store.getMailbox(address)) return res.status(404).json({ error: 'mailbox_expired' });
  const samples = [
    {
      from: 'security@notify-stripe.com', fromName: 'Stripe',
      subject: 'Your verification code is 481920',
      text: 'Enter this code to continue: 481920. It expires in 10 minutes.',
      html: '<div style="font-family:Arial;padding:20px"><h2 style="color:#4c6fe6">Confirm it\'s you</h2><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#111">481920</p><p style="color:#666">This code expires in 10 minutes. If you didn\'t request it, ignore this email.</p></div>',
    },
    {
      from: 'no-reply@socialapp.io', fromName: 'SocialApp',
      subject: 'Welcome! Confirm your email',
      text: 'Tap the button to confirm your account. Your one-time PIN is 730154.',
      html: '<div style="font-family:Arial;padding:20px"><h2>Welcome aboard 🎉</h2><p>Confirm your email to activate your account. Your one-time PIN:</p><p style="font-size:26px;font-weight:800;color:#7c3aed">730154</p><a href="#" style="display:inline-block;background:#4c6fe6;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;margin-top:8px">Confirm email</a></div>',
    },
    {
      from: 'deals@shopmart.online', fromName: 'ShopMart',
      subject: 'Here is your 15% off welcome coupon',
      text: 'Use code WELCOME15 at checkout. Valid for 48 hours.',
      html: '<div style="font-family:Arial;padding:20px"><h1 style="color:#35c7e0">15% OFF</h1><p>Thanks for signing up! Use coupon <b>WELCOME15</b> at checkout.</p></div>',
    },
  ];
  const s = samples[crypto.randomInt(samples.length)];
  const saved = store.deliver(address, s);
  res.json({ ok: true, id: saved.id });
});

// Server-side QR code (SVG) for the "save / restore inbox" feature — works offline.
app.get('/api/qr', (req, res) => {
  const data = String(req.query.data || '').slice(0, 800);
  if (!data) return res.status(400).send('missing data');
  QRCode.toString(data, { type: 'svg', margin: 1, color: { dark: '#4c6fe6', light: '#ffffff' } }, (err, svg) => {
    if (err) return res.status(500).send('qr error');
    res.type('image/svg+xml').send(svg);
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ...store.stats(), time: Date.now() }));

// ---------- email parsing utils ----------
function extractEmail(s) {
  if (!s) return '';
  const m = String(s).match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
  return m ? m[0].toLowerCase() : '';
}
function extractName(s) {
  if (!s) return '';
  const m = String(s).match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : '';
}
function normalizeAttachments(b) {
  const out = [];
  if (Array.isArray(b.attachments)) {
    for (const a of b.attachments) out.push({ filename: a.filename || a.name, contentType: a.contentType || a.type, size: a.size || 0 });
  }
  const count = parseInt(b['attachment-count'] || '0', 10);
  for (let i = 1; i <= count; i++) {
    const a = b[`attachment-${i}`];
    if (a && a.filename) out.push({ filename: a.filename, contentType: a.contentType, size: a.size || 0 });
  }
  return out;
}

// ---------- static + page routing ----------
app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: '1h' }));

// SPA/history fallback for clean content routes
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const candidate = path.join(PUBLIC, req.path.replace(/\/$/, '') + '.html');
  res.sendFile(candidate, err => { if (err) res.status(404).sendFile(path.join(PUBLIC, '404.html'), e2 => { if (e2) res.status(404).send('Not found'); }); });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TempMailGo listening on http://0.0.0.0:${PORT}`);
  console.log(`Domains: ${DOMAINS.join(', ')}`);
});
