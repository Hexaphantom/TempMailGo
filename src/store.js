'use strict';
/**
 * In-memory mailbox store with TTL expiry.
 * ---------------------------------------------------------------
 * In production swap this module for Redis (SET ... EX <ttl>) so
 * that multiple app instances share state and messages auto-expire.
 * The public method surface below maps 1:1 to Redis operations, so
 * migrating is mostly changing the internals of this file.
 */

const crypto = require('crypto');

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour inbox lifetime

class MailStore {
  constructor() {
    /** address(lowercase) -> { address, token, createdAt, expiresAt, messages:[] } */
    this.mailboxes = new Map();
    // sweep expired mailboxes every minute
    this._sweeper = setInterval(() => this.sweep(), 60 * 1000);
    if (this._sweeper.unref) this._sweeper.unref();
  }

  _key(addr) { return String(addr || '').trim().toLowerCase(); }

  createMailbox(address, ttlMs = DEFAULT_TTL_MS) {
    const key = this._key(address);
    const now = Date.now();
    const existing = this.mailboxes.get(key);
    if (existing) return existing;
    const box = {
      address: key,
      token: crypto.randomBytes(18).toString('base64url'),
      createdAt: now,
      expiresAt: now + ttlMs,
      messages: [],
    };
    this.mailboxes.set(key, box);
    return box;
  }

  getMailbox(address) {
    const key = this._key(address);
    const box = this.mailboxes.get(key);
    if (!box) return null;
    if (Date.now() > box.expiresAt) { this.mailboxes.delete(key); return null; }
    return box;
  }

  extendMailbox(address, ttlMs = DEFAULT_TTL_MS) {
    const box = this.getMailbox(address);
    if (!box) return null;
    box.expiresAt = Date.now() + ttlMs;
    return box;
  }

  /** Deliver a normalized message object to an address. Returns message or null. */
  deliver(address, message) {
    let box = this.getMailbox(address);
    // Auto-provision a mailbox on inbound delivery so a code sent to a
    // freshly-generated address is never dropped due to a race.
    if (!box) box = this.createMailbox(address);
    const msg = {
      id: crypto.randomBytes(10).toString('hex'),
      from: message.from || 'unknown@sender',
      fromName: message.fromName || '',
      to: box.address,
      subject: message.subject || '(no subject)',
      text: message.text || '',
      html: message.html || '',
      snippet: (message.text || stripHtml(message.html || '') || '').slice(0, 140),
      otp: extractOtp(message.subject, message.text, message.html),
      attachments: (message.attachments || []).map(a => ({
        filename: a.filename || 'attachment',
        contentType: a.contentType || 'application/octet-stream',
        size: a.size || 0,
      })),
      receivedAt: Date.now(),
    };
    box.messages.unshift(msg);
    if (box.messages.length > 100) box.messages.length = 100;
    return msg;
  }

  listMessages(address) {
    const box = this.getMailbox(address);
    return box ? box.messages : null;
  }

  getMessage(address, id) {
    const box = this.getMailbox(address);
    if (!box) return null;
    return box.messages.find(m => m.id === id) || null;
  }

  deleteMessage(address, id) {
    const box = this.getMailbox(address);
    if (!box) return false;
    const i = box.messages.findIndex(m => m.id === id);
    if (i === -1) return false;
    box.messages.splice(i, 1);
    return true;
  }

  sweep() {
    const now = Date.now();
    for (const [k, box] of this.mailboxes) {
      if (now > box.expiresAt) this.mailboxes.delete(k);
    }
  }

  stats() {
    return { mailboxes: this.mailboxes.size };
  }
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Best-effort OTP / verification-code detection for the inbox preview chip. */
function extractOtp(subject, text, html) {
  const hay = `${subject || ''}\n${text || ''}\n${stripHtml(html || '')}`;
  // Look for 4-8 digit codes near verification-ish words first
  const near = hay.match(/(?:code|otp|passcode|pin|verification|verify|confirm)[^0-9]{0,24}(\b\d{4,8}\b)/i);
  if (near) return near[1];
  const alnum = hay.match(/\b([A-Z0-9]{6})\b/);
  if (alnum && /\d/.test(alnum[1]) && /[A-Z]/.test(alnum[1])) return alnum[1];
  const plain = hay.match(/\b(\d{6})\b/);
  return plain ? plain[1] : null;
}

module.exports = { MailStore, DEFAULT_TTL_MS, stripHtml, extractOtp };
