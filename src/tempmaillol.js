'use strict';
/**
 * tempmail.lol API client for TempMailGo
 * ---------------------------------------------------------------
 * Wraps the free public tempmail.lol REST API (https://tempmail.lol).
 *
 *  - No API key / no signup required for the free tier.
 *  - Verified end-to-end: creating an inbox, sending real SMTP to the
 *    address, and receiving it back through the API all work.
 *  - Gives several fresh, rotating domains (e.g. 26ai.art,
 *    prominentghost.com, imagesthere.com) that many sites have NOT yet
 *    added to their disposable-email blocklists — useful as a fallback
 *    when another provider's domain is rejected.
 *
 * Endpoints used (v2):
 *   POST /v2/inbox/create           -> { address, token }
 *   GET  /v2/inbox?token=<token>    -> { emails: [...], expired: bool }
 *
 * Each email object: { _id, to, from, subject, body, html, date,
 *                      attachment_urls: [] }
 *
 * Uses Node's built-in global fetch (Node 18+). No extra dependencies.
 */

const BASE = process.env.TEMPMAILLOL_BASE || 'https://api.tempmail.lol';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * IMPORTANT — tempmail.lol drains messages on read.
 * ---------------------------------------------------------------
 * The GET /v2/inbox endpoint returns any *new* emails once and then empties
 * the mailbox server-side, so a subsequent poll returns an empty list. Because
 * TempMailGo polls the inbox continuously and lets the user re-open a message
 * later, we keep a small per-token in-memory cache: every time we list, we
 * merge freshly delivered emails into the cache and return the full accumulated
 * set. getMessage() is then served straight from this cache (the list response
 * already includes full body + html, so no extra network call is needed).
 *
 * Entries are evicted after CACHE_TTL_MS of inactivity to bound memory. This
 * mirrors how the other providers behave from the UI's point of view.
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h idle -> drop
const cache = new Map(); // token -> { at, expired, byId: Map<id, email> }

function cacheFor(token) {
  let entry = cache.get(token);
  if (!entry) {
    entry = { at: Date.now(), expired: false, byId: new Map() };
    cache.set(token, entry);
  }
  entry.at = Date.now();
  return entry;
}

function sweepCache() {
  const now = Date.now();
  for (const [token, entry] of cache) {
    if (now - entry.at > CACHE_TTL_MS) cache.delete(token);
  }
}

async function req(pathname, { method = 'GET', body, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(BASE + pathname, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      if (attempt < retries) { await sleep(300 * (attempt + 1)); continue; }
      return { status: 0, ok: false, body: { error: 'network_error', detail: String(e) } };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (_) { data = { raw: text }; } }
    return { status: res.status, ok: res.ok, body: data || {} };
  }
}

/**
 * Create a new inbox. tempmail.lol assigns a random address on one of its
 * rotating domains (custom local parts are not supported by the free API).
 * Returns { ok, status, address, token }.
 */
async function create() {
  const r = await req('/v2/inbox/create', { method: 'POST' });
  if (!r.ok || !r.body || !r.body.address || !r.body.token) {
    return { ok: false, status: r.status, body: r.body };
  }
  return { ok: true, status: r.status, address: r.body.address, token: r.body.token };
}

/**
 * List messages for a token.
 *
 * Merges any newly delivered emails (which the API only returns once) into the
 * per-token cache and returns the full accumulated set, newest first. This
 * makes tempmail.lol behave like the other providers even though its API drains
 * the mailbox on read.
 *
 * Returns { ok, status, expired, messages: [rawEmail...] }.
 */
async function listMessages(token) {
  if (!token) return { ok: false, status: 404, messages: [] };
  sweepCache();
  const entry = cacheFor(token);

  const r = await req('/v2/inbox?token=' + encodeURIComponent(token));
  if (!r.ok) {
    // On a transient error, still serve whatever we have cached so the inbox
    // does not appear to lose already-received mail.
    if (entry.byId.size) {
      return { ok: true, status: 200, expired: entry.expired, messages: sortedFrom(entry) };
    }
    return { ok: false, status: r.status, messages: [] };
  }

  const emails = (r.body && r.body.emails) || [];
  for (const m of emails) {
    if (m && m._id != null) entry.byId.set(String(m._id), m);
  }
  if (r.body && r.body.expired) entry.expired = true;

  return { ok: true, status: r.status, expired: entry.expired, messages: sortedFrom(entry) };
}

function sortedFrom(entry) {
  return Array.from(entry.byId.values()).sort((a, b) => {
    const da = a && a.date ? Number(new Date(a.date)) : 0;
    const db = b && b.date ? Number(new Date(b.date)) : 0;
    return db - da;
  });
}

/**
 * tempmail.lol returns the full email (body + html) directly in the list
 * response. Because the mailbox drains on read, we serve getMessage straight
 * from the per-token cache populated by listMessages (refreshing it first so a
 * message that just arrived is available immediately).
 * Returns { ok, status, message }.
 */
async function getMessage(token, id) {
  if (!token) return { ok: false, status: 404 };
  // Refresh the cache first (picks up anything just delivered), ignoring errors
  // so a rate-limited refresh still lets us serve an already-cached message.
  await listMessages(token);
  const entry = cache.get(token);
  const message = entry && entry.byId.get(String(id));
  if (!message) return { ok: false, status: 404 };
  return { ok: true, status: 200, message };
}

module.exports = { create, listMessages, getMessage };
