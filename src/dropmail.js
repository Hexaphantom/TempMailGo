'use strict';
/**
 * DropMail.me GraphQL API client for TempMailGo
 * ---------------------------------------------------------------
 * Free disposable email via DropMail's GraphQL API (https://dropmail.me/api/).
 * Domains include @dropmail.me, @10mail.org and several others.
 *
 * === IMPORTANT: the API changed in 2026 ===
 *   - The OLD "GET https://dropmail.me/api/token" endpoint is GONE (404), and
 *     legacy arbitrary-string tokens are COMPLETELY DISABLED (403
 *     legacy_token_disabled). You MUST use a signed "af_..." token now.
 *   - Get one with:  POST https://dropmail.me/api/token/generate
 *                    body {"type":"af","lifetime":"1h"}  ->  {"token":"af_..."}
 *     A 1h/1d token needs NO captcha; longer lifetimes require a captcha.
 *   - Generating tokens too rapidly from one IP triggers a captcha
 *     (HTTP 402 "captcha_required"). So we generate ONE token and REUSE it for
 *     MANY sessions, refreshing only when it is near expiry. This is the whole
 *     reason this client caches the token process-wide.
 *
 * Endpoints (token in the URL, not a header):
 *   HTTP:      POST https://dropmail.me/api/graphql/{token}
 *   WebSocket: wss://dropmail.me/api/graphql/{token}/websocket  (real-time)
 *
 * Uses Node's built-in global fetch (Node 18+). No extra dependencies for HTTP.
 */

const API = process.env.DROPMAIL_BASE || 'https://dropmail.me/api';
const TOKEN_LIFETIME = process.env.DROPMAIL_LIFETIME || '1h';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- process-wide token cache (reused across all users/sessions) ----
// Optionally pin a token via env (avoids ANY token-generation captcha on hosts
// whose IP DropMail throttles). Generate one at https://dropmail.me/api/ .
let _token = process.env.DROPMAIL_TOKEN || null;
let _tokenExp = _token ? Number.MAX_SAFE_INTEGER : 0; // pinned token never auto-expires
let _tokenPromise = null; // de-dupe concurrent token generation

function lifetimeToMs(lt) {
  const m = String(lt).match(/^(\d+)([hd])$/);
  if (!m) return 60 * 60 * 1000;
  const n = Number(m[1]);
  return m[2] === 'd' ? n * 86400000 : n * 3600000;
}

/** Get (and cache) a signed af_ token, refreshing before expiry. */
async function getToken() {
  const now = Date.now();
  if (_token && now < _tokenExp) return _token;
  if (_tokenPromise) return _tokenPromise;
  _tokenPromise = (async () => {
    try {
      const res = await fetch(`${API}/token/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'af', lifetime: TOKEN_LIFETIME }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        // 402 => captcha_required (asked for tokens too fast). Keep old token if any.
        if (_token) return _token;
        throw new Error(data.error || ('token_http_' + res.status));
      }
      _token = data.token;
      // Refresh a little before the real expiry to avoid mid-request expiry.
      _tokenExp = Date.now() + lifetimeToMs(TOKEN_LIFETIME) - 60 * 1000;
      return _token;
    } finally {
      _tokenPromise = null;
    }
  })();
  return _tokenPromise;
}

/** Run a GraphQL query/mutation against the cached token. */
async function gql(query, variables) {
  const token = await getToken();
  return gqlWith(token, query, variables);
}

/** Run a GraphQL query/mutation against an EXPLICIT token (for stateless polls). */
async function gqlWith(token, query, variables) {
  const res = await fetch(`${API}/graphql/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json().catch(() => ({}));
  // If OUR cached token was rejected (expired/disabled), drop it so we re-gen.
  if (data && data.errors && String(JSON.stringify(data.errors)).includes('authentication_error')) {
    if (token === _token) { _token = null; _tokenExp = 0; }
    return { ok: false, status: 403, errors: data.errors };
  }
  return { ok: res.ok && !!data.data, status: res.status, data: data.data, errors: data.errors };
}

// ---------- API surface ----------

/** List domains DropMail offers (for the dropdown). Returns [{ id, name }]. */
async function getDomains() {
  const r = await gql(`query { domains { id name availableVia } }`);
  if (!r.ok || !r.data) return [];
  return (r.data.domains || [])
    .filter((d) => (d.availableVia || []).includes('API'))
    .map((d) => ({ id: d.id, name: d.name }));
}

/**
 * Create a session + address. Optionally on a specific domainId.
 * Returns { ok, sessionId, address, restoreKey, expiresAt }.
 */
async function create(domainId) {
  const q = `mutation($input: IntroduceSessionInput) {
    introduceSession(input: $input) { id expiresAt addresses { address restoreKey } }
  }`;
  // brief retry: a freshly generated token can lag a moment before it is accepted
  let r;
  for (let i = 0; i < 3; i++) {
    r = await gql(q, { input: { withAddress: true, domainId: domainId || null } });
    if (r.ok) break;
    await sleep(800 * (i + 1));
  }
  if (!r.ok || !r.data) return { ok: false };
  const s = r.data.introduceSession;
  const a = (s.addresses && s.addresses[0]) || {};
  const afToken = await getToken();
  return { ok: true, sessionId: s.id, address: a.address, restoreKey: a.restoreKey, expiresAt: s.expiresAt, afToken };
}

const MAILS_QUERY = `query($id: ID!){ session(id:$id){ mails { id headerSubject headerFrom fromAddr toAddr text html receivedAt } } }`;

/**
 * List mails in a session. Pass the session's own af_ token (afToken) so polls
 * are stateless and keep working across server restarts; falls back to the
 * process-cached token if none is supplied.
 * Returns { ok, messages:[raw dropmail mails] }.
 */
async function listMessages(sessionId, afToken) {
  const r = afToken
    ? await gqlWith(afToken, MAILS_QUERY, { id: sessionId })
    : await gql(MAILS_QUERY, { id: sessionId });
  if (!r.ok || !r.data || !r.data.session) return { ok: false, status: r.status, messages: [] };
  return { ok: true, messages: r.data.session.mails || [] };
}

/** Fetch a single mail by id from a session (DropMail returns full mail in list). */
async function getMessage(sessionId, id, afToken) {
  const r = await listMessages(sessionId, afToken);
  if (!r.ok) return { ok: false, status: r.status };
  const m = r.messages.find((x) => x.id === id);
  return m ? { ok: true, message: m } : { ok: false, status: 404 };
}

/** WebSocket URL for real-time push (used by the optional listen() demo). */
async function websocketUrl() {
  const token = await getToken();
  return `wss://dropmail.me/api/graphql/${token}/websocket`;
}

module.exports = { getToken, gql, gqlWith, getDomains, create, listMessages, getMessage, websocketUrl };
