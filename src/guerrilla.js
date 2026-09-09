'use strict';
/**
 * Guerrilla Mail API client for TempMailGo
 * ---------------------------------------------------------------
 * Free, no key, no signup. https://www.guerrillamail.com/GuerrillaMailAPI.html
 *
 * IMPORTANT real-world behavior (verified from a server IP):
 *   - Guerrilla assigns addresses on the "@guerrillamailblock.com" domain when
 *     called from a datacenter/server IP (its anti-abuse policy). Requests to
 *     switch to sharklasers.com / grr.la / etc. are silently ignored server-side.
 *     So we expose the domain Guerrilla actually gives us, not a wished-for one.
 *   - It DOES receive real external email (verified end-to-end).
 *
 * Guerrilla identifies a mailbox by a `sid_token`. We hand that token to the
 * browser (as the "token" field) and accept it back on inbox/message polls, so
 * the app stays stateless — mirroring how the mail.tm path works.
 */

const BASE = process.env.GUERRILLA_BASE || 'https://api.guerrillamail.com/ajax.php';

async function call(f, params = {}, cookieJar) {
  const usp = new URLSearchParams({ f, ...params });
  const headers = {};
  if (cookieJar && cookieJar.value) headers['Cookie'] = cookieJar.value;
  let res;
  try {
    res = await fetch(`${BASE}?${usp.toString()}`, { headers });
  } catch (e) {
    return { _error: 'network', detail: String(e) };
  }
  const sc = res.headers.get('set-cookie');
  if (sc && cookieJar) cookieJar.value = sc.split(';')[0];
  const text = await res.text();
  try { return JSON.parse(text); } catch (_) { return { _error: 'bad_json', raw: text }; }
}

/** Create a fresh Guerrilla mailbox. Returns { ok, address, token }. */
async function create(username) {
  const jar = { value: '' };
  const data = await call('get_email_address', {}, jar);
  if (data._error || !data.email_addr) return { ok: false };
  let address = data.email_addr;
  const sid = data.sid_token;

  // Try to honor a custom username on whatever domain Guerrilla gave us.
  if (username) {
    const dom = address.split('@')[1];
    const set = await call('set_email_user', { email_user: username, domain: dom, sid_token: sid }, jar);
    if (set && set.email_addr) address = set.email_addr;
  }
  // token we hand to the client encodes sid + cookie so polls are stateless
  const token = 'g:' + Buffer.from(JSON.stringify({ sid, ck: jar.value })).toString('base64url');
  return { ok: true, address, token };
}

function decode(token) {
  try { return JSON.parse(Buffer.from(String(token).slice(2), 'base64url').toString()); }
  catch (_) { return null; }
}

/** List messages. Returns { ok, messages: [raw guerrilla list items] }. */
async function listMessages(token) {
  const t = decode(token);
  if (!t) return { ok: false, status: 401 };
  const jar = { value: t.ck || '' };
  const data = await call('check_email', { seq: 0, sid_token: t.sid }, jar);
  if (data._error) return { ok: false, status: 502 };
  const list = (data.list || []).filter((m) => m.mail_from !== 'no-reply@guerrillamail.com');
  return { ok: true, messages: list };
}

/** Fetch one full message. Returns { ok, message }. */
async function getMessage(token, id) {
  const t = decode(token);
  if (!t) return { ok: false, status: 401 };
  const jar = { value: t.ck || '' };
  const data = await call('fetch_email', { email_id: id, sid_token: t.sid }, jar);
  if (data._error || !data.mail_id) return { ok: false, status: 404 };
  return { ok: true, message: data };
}

async function deleteMessage(token, id) {
  const t = decode(token);
  if (!t) return { ok: false };
  const jar = { value: t.ck || '' };
  await call('del_email', { 'email_ids[]': id, sid_token: t.sid }, jar);
  return { ok: true };
}

module.exports = { create, listMessages, getMessage, deleteMessage, isGuerrilla: (tok) => String(tok || '').startsWith('g:') };
