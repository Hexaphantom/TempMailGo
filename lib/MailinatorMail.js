/**
 * MailinatorMail — standalone temp-email class (Mailinator public inboxes)
 * =======================================================================
 * Free public API: no key, no signup, no auth headers. Works in the browser
 * (fetch) and in Node.js 18+ (global fetch). Import styles:
 *
 *   Node (CommonJS):  const { MailinatorMail } = require('./lib/MailinatorMail.js');
 *   Browser (ESM):    import { MailinatorMail } from './lib/MailinatorMail.js';
 *   Browser (script): <script src="MailinatorMail.js"></script> -> window.MailinatorMail
 *
 * How it works:
 *   - ANY address at @mailinator.com already exists — NO creation API call.
 *   - Inboxes are PUBLIC (anyone who knows the name can read them). We generate
 *     a long random username so it is effectively unguessable. Never use these
 *     for anything sensitive.
 *   - Mailinator rate-limits rapid requests from one IP and may answer with an
 *     HTML page; this class tolerates that and just returns [] for that poll.
 *
 * API:
 *   const mail = new MailinatorMail();
 *   const address = mail.create();                 // pick a random address (no network)
 *   const msgs    = await mail.checkInbox();        // one inbox read
 *   mail.startPolling(cb, 3000);                     // poll every 3s, cb(newMessages)
 *   const otp     = await mail.getOtp();            // first 4-8 digit code found
 *   mail.stopPolling();
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.MailinatorMail = mod.MailinatorMail; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASE = 'https://api.mailinator.com';
  const DOMAIN = 'mailinator.com';

  function randomUser() {
    let s = 'user';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractOtp(text) {
    const hay = String(text || '');
    const near = hay.match(/(?:code|otp|passcode|pin|verification|verify|confirm)[^0-9]{0,24}(\b\d{4,8}\b)/i);
    if (near) return near[1];
    const plain = hay.match(/\b(\d{4,8})\b/);
    return plain ? plain[1] : null;
  }

  class MailinatorMail {
    constructor() {
      this.username = null;
      this.address = null;
      this._timer = null;
      this._seen = new Set();
    }

    /** Generate a random @mailinator.com address (no API call needed). */
    create(username) {
      this.username = (username || randomUser()).toLowerCase().replace(/[^a-z0-9]/g, '');
      this.address = this.username + '@' + DOMAIN;
      this._seen.clear();
      return this.address;
    }

    async _getJson(url) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) return null; // rate-limited HTML page
        return await res.json();
      } catch (_) { return null; }
    }

    /** One inbox read. Returns an array of {id, from, subject, time}. */
    async checkInbox() {
      if (!this.username) throw new Error('call create() first');
      const j = await this._getJson(`${BASE}/cli/v3/domains/public/inboxes/${encodeURIComponent(this.username)}`);
      if (!j || !j.msgs) return [];
      return j.msgs.map((m) => ({
        id: m.id,
        from: m.fromfull || m.from,
        subject: m.subject,
        time: m.time || (m.seconds_ago ? Date.now() - m.seconds_ago * 1000 : Date.now()),
      }));
    }

    /** Fetch one full message. Returns {subject, from, text, html}. */
    async readMessage(id) {
      const m = await this._getJson(`${BASE}/cli/v3/domains/public/messages/${encodeURIComponent(id)}`);
      if (!m) return null;
      let html = '', text = '';
      for (const p of m.parts || []) {
        const ct = (p.headers && (p.headers['content-type'] || p.headers['Content-Type'])) || '';
        if (/html/i.test(ct)) html += (p.body || ''); else text += (p.body || '');
      }
      return { subject: m.subject, from: m.fromfull || m.from, text: text || stripHtml(html), html };
    }

    /** Poll every `intervalMs` (default 3000). cb(newMessages[]) fires on new mail. */
    startPolling(cb, intervalMs) {
      this.stopPolling();
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

    stopPolling() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

    /** Scan all messages and return the first 4-8 digit code found (or null). */
    async getOtp() {
      const msgs = await this.checkInbox();
      for (const m of msgs) {
        const full = await this.readMessage(m.id);
        const code = extractOtp((m.subject || '') + '\n' + (full ? full.text : ''));
        if (code) return code;
      }
      return null;
    }
  }

  return { MailinatorMail, extractOtp };
});
