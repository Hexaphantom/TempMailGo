'use strict';
/**
 * mail.tm API client for TempMailGo
 * ---------------------------------------------------------------
 * Wraps the free public mail.tm REST API (https://docs.mail.tm).
 *
 *  - No API key / no signup required.
 *  - Hard limit: 8 queries per second (QPS) PER IP ADDRESS.
 *    Because our backend calls mail.tm from ONE server IP, that 8 QPS
 *    budget is SHARED across ALL of our visitors. So this module funnels
 *    every outgoing request through a single global throttle (spacing +
 *    small concurrency cap) and honors 429 Retry-After with backoff.
 *
 * Uses Node's built-in global fetch (Node 18+). No extra dependencies.
 */

const BASE = process.env.MAILTM_BASE || 'https://api.mail.tm';

// ---- Global throttle: keep us safely under 8 QPS across all users ----
const MIN_SPACING_MS = Number(process.env.MAILTM_MIN_SPACING_MS || 160); // ~6.2 req/s
let _chain = Promise.resolve();
let _lastAt = 0;

function schedule(fn) {
  const run = async () => {
    const now = Date.now();
    const wait = Math.max(0, _lastAt + MIN_SPACING_MS - now);
    if (wait) await sleep(wait);
    _lastAt = Date.now();
    return fn();
  };
  // Chain so requests are spaced sequentially; errors don't break the chain.
  const result = _chain.then(run, run);
  _chain = result.then(() => {}, () => {});
  return result;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Throttled fetch with JSON handling + 429 backoff.
 * Returns { status, ok, body }.
 */
async function req(pathname, { method = 'GET', token, body, retries = 2 } = {}) {
  return schedule(async () => {
    for (let attempt = 0; ; attempt++) {
      const headers = { Accept: 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (token) headers['Authorization'] = 'Bearer ' + token;

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

      if (res.status === 429 && attempt < retries) {
        const ra = Number(res.headers.get('retry-after')) || 1;
        await sleep(Math.min(ra * 1000, 4000));
        continue;
      }

      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch (_) { data = { raw: text }; } }
      return { status: res.status, ok: res.ok, body: data || {} };
    }
  });
}

// ---------- API surface ----------

/** GET /domains -> array of active domain strings */
async function getDomains() {
  const r = await req('/domains?page=1');
  const members = (r.body && (r.body['hydra:member'] || r.body)) || [];
  return members
    .filter((d) => d && d.isActive !== false)
    .map((d) => d.domain)
    .filter(Boolean);
}

/** Create an account. Returns { ok, status, id, address }. */
async function createAccount(address, password) {
  const r = await req('/accounts', { method: 'POST', body: { address, password } });
  return { ok: r.ok, status: r.status, id: r.body && r.body.id, address: r.body && r.body.address, body: r.body };
}

/** Get a bearer token for an account. Retries briefly (token can lag account creation). */
async function getToken(address, password) {
  for (let i = 0; i < 4; i++) {
    const r = await req('/token', { method: 'POST', body: { address, password } });
    if (r.ok && r.body && r.body.token) return { ok: true, token: r.body.token, id: r.body.id };
    if (r.status !== 401 && r.status !== 404) return { ok: false, status: r.status, body: r.body };
    await sleep(500 * (i + 1));
  }
  return { ok: false, status: 401, body: { error: 'token_unavailable' } };
}

/** GET /messages -> raw hydra member array */
async function listMessages(token) {
  const r = await req('/messages?page=1', { token });
  if (!r.ok) return { ok: false, status: r.status };
  const members = (r.body && (r.body['hydra:member'] || r.body)) || [];
  return { ok: true, messages: members };
}

/** GET /messages/{id} -> raw message object */
async function getMessage(token, id) {
  const r = await req('/messages/' + encodeURIComponent(id), { token });
  return { ok: r.ok, status: r.status, message: r.body };
}

/** DELETE /messages/{id} (best effort) */
async function deleteMessage(token, id) {
  if (!id) return { ok: false };
  const r = await req('/messages/' + encodeURIComponent(id), { method: 'DELETE', token, retries: 0 });
  return { ok: r.ok, status: r.status };
}

/** DELETE /accounts/{id} (best effort cleanup) */
async function deleteAccount(token, id) {
  if (!id) return;
  try { await req('/accounts/' + encodeURIComponent(id), { method: 'DELETE', token, retries: 0 }); } catch (_) {}
}

module.exports = { getDomains, createAccount, getToken, listMessages, getMessage, deleteMessage, deleteAccount };
