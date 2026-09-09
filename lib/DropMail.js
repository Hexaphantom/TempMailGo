/**
 * DropMail — standalone temp-email class (DropMail.me GraphQL API)
 * =======================================================================
 * Free disposable email with real-time push. Domains include @dropmail.me,
 * @10mail.org and more. Works in Node.js 18+ (global fetch). The optional
 * real-time listen() uses WebSocket: in Node pass a WebSocket implementation
 * (e.g. the 'ws' package); in the browser the native WebSocket is used.
 *
 *   Node:    const { DropMail } = require('./lib/DropMail.js');
 *            const WebSocket = require('ws');
 *            const mail = new DropMail({ WebSocketImpl: WebSocket });
 *
 * === IMPORTANT: DropMail's auth changed in 2026 ===
 *   - The old "GET /api/token" endpoint is GONE and legacy arbitrary-string
 *     tokens are DISABLED. You now need a signed "af_..." token:
 *        POST https://dropmail.me/api/token/generate  {"type":"af","lifetime":"1h"}
 *     1h / 1d tokens need NO captcha; longer lifetimes require one.
 *   - Generating tokens too fast from one IP triggers a captcha (HTTP 402).
 *     So GENERATE ONE TOKEN AND REUSE IT for many sessions. You can also pass a
 *     token you generated elsewhere via `new DropMail({ token })`.
 *
 * API:
 *   const mail = new DropMail();
 *   const address = await mail.create();            // token + session + address
 *   const msgs    = await mail.checkInbox();        // poll messages
 *   mail.listen(cb);                                 // real-time WebSocket push
 *   const otp     = await mail.getOtp();            // first 4-8 digit code
 *   mail.stop();
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.DropMail = mod.DropMail; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const API = 'https://dropmail.me/api';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function stripHtml(html) {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function extractOtp(text) {
    const hay = String(text || '');
    const near = hay.match(/(?:code|otp|passcode|pin|verification|verify|confirm)[^0-9]{0,24}(\b\d{4,8}\b)/i);
    if (near) return near[1];
    const plain = hay.match(/\b(\d{4,8})\b/);
    return plain ? plain[1] : null;
  }

  class DropMail {
    /** opts: { token?, lifetime='1h', WebSocketImpl? } */
    constructor(opts) {
      opts = opts || {};
      this.token = opts.token || null;      // reuse a token if you have one
      this.lifetime = opts.lifetime || '1h';
      this.WebSocketImpl = opts.WebSocketImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
      this.sessionId = null;
      this.address = null;
      this.restoreKey = null;
      this._timer = null;
      this._ws = null;
      this._seen = new Set();
    }

    /** Generate a signed af_ token (only if we don't already have one). */
    async _ensureToken() {
      if (this.token) return this.token;
      const res = await fetch(`${API}/token/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'af', lifetime: this.lifetime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        throw new Error(data.error === 'captcha_required'
          ? 'DropMail requires a captcha (too many tokens from this IP). Reuse one token via new DropMail({ token }).'
          : ('token error: ' + (data.error || res.status)));
      }
      this.token = data.token;
      return this.token;
    }

    async _gql(query, variables) {
      const token = await this._ensureToken();
      const res = await fetch(`${API}/graphql/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      return res.json().catch(() => ({}));
    }

    /** Get token, create a session + random address. Returns the email address. */
    async create(domainId) {
      let r;
      for (let i = 0; i < 3; i++) {
        r = await this._gql(
          `mutation($input: IntroduceSessionInput){ introduceSession(input:$input){ id expiresAt addresses { address restoreKey } } }`,
          { input: { withAddress: true, domainId: domainId || null } }
        );
        if (r && r.data) break;
        await sleep(800 * (i + 1));
      }
      if (!r || !r.data) throw new Error('could not create session');
      const s = r.data.introduceSession;
      this.sessionId = s.id;
      this.address = s.addresses[0].address;
      this.restoreKey = s.addresses[0].restoreKey;
      this._seen.clear();
      return this.address;
    }

    /** List available domains: [{ id, name }]. */
    async domains() {
      const r = await this._gql(`query { domains { id name availableVia } }`);
      if (!r.data) return [];
      return r.data.domains.filter((d) => (d.availableVia || []).includes('API')).map((d) => ({ id: d.id, name: d.name }));
    }

    /** Poll messages once. Returns [{id, subject, from, text, html}]. */
    async checkInbox() {
      if (!this.sessionId) throw new Error('call create() first');
      const r = await this._gql(
        `query($id: ID!){ session(id:$id){ mails { id headerSubject headerFrom fromAddr text html } } }`,
        { id: this.sessionId }
      );
      if (!r.data || !r.data.session) return [];
      return r.data.session.mails.map((m) => ({
        id: m.id, subject: m.headerSubject, from: m.fromAddr || m.headerFrom, text: m.text || stripHtml(m.html), html: m.html,
      }));
    }

    /** Real-time push via WebSocket (graphql-ws protocol). cb(message) per mail. */
    listen(cb) {
      if (!this.WebSocketImpl) throw new Error('No WebSocket implementation. In Node pass new DropMail({ WebSocketImpl: require("ws") }).');
      if (!this.token || !this.sessionId) throw new Error('call create() first');
      const url = `wss://dropmail.me/api/graphql/${this.token}/websocket`;
      const ws = new this.WebSocketImpl(url, 'graphql-transport-ws');
      this._ws = ws;
      const send = (o) => ws.send(JSON.stringify(o));
      const onOpen = () => send({ type: 'connection_init' });
      const onMsg = (raw) => {
        let msg; try { msg = JSON.parse(raw.data !== undefined ? raw.data : raw); } catch (_) { return; }
        if (msg.type === 'connection_ack') {
          send({ id: '1', type: 'subscribe', payload: { query:
            `subscription($id: ID!){ sessionMailReceived(id:$id){ fromAddr headerSubject text html } }`, variables: { id: this.sessionId } } });
        } else if (msg.type === 'next' && msg.payload && msg.payload.data) {
          const m = msg.payload.data.sessionMailReceived;
          if (m && typeof cb === 'function') cb({ subject: m.headerSubject, from: m.fromAddr, text: m.text || stripHtml(m.html), html: m.html });
        }
      };
      if (ws.on) { ws.on('open', onOpen); ws.on('message', (d) => onMsg({ data: d.toString() })); }
      else { ws.onopen = onOpen; ws.onmessage = onMsg; }
      return this;
    }

    /** Convenience: poll every intervalMs; cb(newMessages[]) on new mail. */
    startPolling(cb, intervalMs) {
      this.stop();
      const tick = async () => {
        const msgs = await this.checkInbox();
        const fresh = msgs.filter((m) => !this._seen.has(m.id));
        fresh.forEach((m) => this._seen.add(m.id));
        if (fresh.length && typeof cb === 'function') cb(fresh);
      };
      this._timer = setInterval(tick, intervalMs || 3000);
      tick();
      return this;
    }

    stop() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._ws) { try { this._ws.close(); } catch (_) {} this._ws = null; }
    }

    /** Scan messages, return first 4-8 digit code (or null). */
    async getOtp() {
      const msgs = await this.checkInbox();
      for (const m of msgs) {
        const code = extractOtp((m.subject || '') + '\n' + (m.text || ''));
        if (code) return code;
      }
      return null;
    }
  }

  return { DropMail, extractOtp };
});
