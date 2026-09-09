'use strict';
/**
 * Mailinator (public inboxes) API client for TempMailGo
 * ---------------------------------------------------------------
 * Uses Mailinator's free public API — no key, no signup, no auth headers.
 *   - ANY address at @mailinator.com already exists; there is NO create step.
 *     We just pick a random username; the address is {username}@mailinator.com.
 *   - Inbox:   GET /cli/v3/domains/public/inboxes/{username}
 *   - Message: GET /cli/v3/domains/public/messages/{message_id}
 *   - Mail persists a few hours.
 *
 * IMPORTANT (verified from a datacenter IP): Mailinator rate-limits rapid
 * requests from a shared IP and will start returning an HTML error page instead
 * of JSON. So every call goes through a global throttle (spacing) + we defensively
 * detect non-JSON responses. Recommended client poll interval: ~3s (per spec).
 *
 * PRIVACY NOTE: Mailinator public inboxes are PUBLIC — anyone who guesses the
 * username can read the mail. That is fine for throwaway OTP testing, and the UI
 * warns users not to use temp mail for anything sensitive. We use long random
 * usernames to make addresses effectively unguessable.
 *
 * Uses Node's built-in global fetch (Node 18+). No extra dependencies.
 */

const BASE = process.env.MAILINATOR_BASE || 'https://api.mailinator.com';
const DOMAIN = 'mailinator.com';

// ---- Global throttle to stay friendly with Mailinator's shared-IP limits ----
const MIN_SPACING_MS = Number(process.env.MAILINATOR_MIN_SPACING_MS || 1200);
let _chain = Promise.resolve();
let _lastAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function schedule(fn) {
  const run = async () => {
    const wait = Math.max(0, _lastAt + MIN_SPACING_MS - Date.now());
    if (wait) await sleep(wait);
    _lastAt = Date.now();
    return fn();
  };
  const result = _chain.then(run, run);
  _chain = result.then(() => {}, () => {});
  return result;
}

/** Throttled GET returning { ok, status, json } — tolerates HTML rate-limit pages. */
async function get(pathname, { retries = 2 } = {}) {
  return schedule(async () => {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(BASE + pathname, { headers: { Accept: 'application/json' } });
      } catch (e) {
        if (attempt < retries) { await sleep(500 * (attempt + 1)); continue; }
        return { ok: false, status: 0, json: null };
      }
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (!ct.includes('json')) {
        // Rate-limited / error HTML page. Back off and retry a couple times.
        if (attempt < retries) { await sleep(1500 * (attempt + 1)); continue; }
        return { ok: false, status: res.status || 429, json: null };
      }
      let json = null;
      try { json = JSON.parse(text); } catch (_) { json = null; }
      return { ok: res.ok && !!json, status: res.status, json };
    }
  });
}

// ---------- API surface ----------

/** No API call needed — build a random public address. */
function randomAddress(username) {
  const local = username || ('user' + Math.random().toString(36).slice(2, 10));
  return `${local}@${DOMAIN}`;
}

/** GET public inbox for a username. Returns { ok, messages:[raw] }. */
async function listMessages(username) {
  const r = await get(`/cli/v3/domains/public/inboxes/${encodeURIComponent(username)}`);
  if (!r.ok || !r.json) return { ok: false, status: r.status, messages: [] };
  return { ok: true, messages: r.json.msgs || [] };
}

/** GET a full public message by id. Returns { ok, message:{...normalized parts} }. */
async function getMessage(id) {
  const r = await get(`/cli/v3/domains/public/messages/${encodeURIComponent(id)}`);
  if (!r.ok || !r.json) return { ok: false, status: r.status };
  return { ok: true, message: r.json };
}

/** Concatenate a Mailinator message's parts into { html, text }. */
function extractBodies(message) {
  let html = '';
  let text = '';
  for (const p of message.parts || []) {
    const ct = (p.headers && (p.headers['content-type'] || p.headers['Content-Type'])) || '';
    if (/html/i.test(ct)) html += (p.body || '');
    else text += (p.body || '');
  }
  return { html, text };
}

module.exports = { DOMAIN, randomAddress, listMessages, getMessage, extractBodies };
