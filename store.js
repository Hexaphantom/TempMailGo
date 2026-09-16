'use strict';
/**
 * Small text utilities used by the mail.tm mappers in server.js.
 * ---------------------------------------------------------------
 * NOTE: The old in-memory MailStore and the inbound webhook were removed when
 * TempMailGo switched to the mail.tm API — mail.tm now stores and delivers all
 * mail. Only these stateless helpers remain (HTML stripping + OTP detection).
 */

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

module.exports = { stripHtml, extractOtp };
