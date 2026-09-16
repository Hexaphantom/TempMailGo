'use strict';
/*
 * Internationalization for TempMailGo.
 * ---------------------------------------------------------------
 * - LANGS: every supported language (code, English name, native name, text dir).
 *   English (en) is the default and lives at the site root ("/"); every other
 *   language lives under "/{code}/..." (e.g. "/fr/", "/ar/faq").
 * - T: translation dictionaries keyed by language code. Any key missing from a
 *   language automatically falls back to English (see tr() below), so the site
 *   can never render an empty string.
 *
 * Only UI text + homepage/marketing copy + FAQ are translated (per request).
 * Long-form prose (blog, legal, about, how-it-works bodies) stays in English,
 * but every page still gets localized chrome (nav/footer/donation), correct
 * <html lang>/dir, and full hreflang alternates so search engines index them.
 */

// `abbr` = short label shown in the compact header toggle (temp-mail.org style),
// `flag` = country flag emoji shown next to it.
const LANGS = [
  { code: 'en',    name: 'English',              native: 'English',     abbr: 'ENG', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar',    name: 'Arabic',               native: 'العربية',      abbr: 'عربي', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es',    name: 'Spanish',              native: 'Español',     abbr: 'ESP', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr',    name: 'French',               native: 'Français',    abbr: 'FRA', flag: '🇫🇷', dir: 'ltr' },
  { code: 'pt',    name: 'Portuguese',           native: 'Português',   abbr: 'POR', flag: '🇵🇹', dir: 'ltr' },
  { code: 'hi',    name: 'Hindi',                native: 'हिन्दी',        abbr: 'हिन', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur',    name: 'Urdu',                 native: 'اردو',         abbr: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'id',    name: 'Indonesian',           native: 'Indonesia',   abbr: 'IND', flag: '🇮🇩', dir: 'ltr' },
  { code: 'de',    name: 'German',               native: 'Deutsch',     abbr: 'DEU', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ru',    name: 'Russian',              native: 'Русский',     abbr: 'РУС', flag: '🇷🇺', dir: 'ltr' },
  { code: 'tr',    name: 'Turkish',              native: 'Türkçe',      abbr: 'TÜR', flag: '🇹🇷', dir: 'ltr' },
  { code: 'vi',    name: 'Vietnamese',           native: 'Tiếng Việt',  abbr: 'VIE', flag: '🇻🇳', dir: 'ltr' },
  { code: 'bn',    name: 'Bengali',              native: 'বাংলা',        abbr: 'বাং', flag: '🇧🇩', dir: 'ltr' },
  { code: 'sw',    name: 'Swahili',              native: 'Kiswahili',   abbr: 'SWA', flag: '🇰🇪', dir: 'ltr' },
  { code: 'it',    name: 'Italian',              native: 'Italiano',    abbr: 'ITA', flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl',    name: 'Dutch',                native: 'Nederlands',  abbr: 'NLD', flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl',    name: 'Polish',               native: 'Polski',      abbr: 'POL', flag: '🇵🇱', dir: 'ltr' },
  { code: 'uk',    name: 'Ukrainian',            native: 'Українська',  abbr: 'УКР', flag: '🇺🇦', dir: 'ltr' },
  { code: 'th',    name: 'Thai',                 native: 'ไทย',          abbr: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'tl',    name: 'Filipino',             native: 'Filipino',    abbr: 'FIL', flag: '🇵🇭', dir: 'ltr' },
  { code: 'ko',    name: 'Korean',               native: '한국어',        abbr: '한국', flag: '🇰🇷', dir: 'ltr' },
  { code: 'ja',    name: 'Japanese',             native: '日本語',        abbr: '日本', flag: '🇯🇵', dir: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文',      abbr: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'fa',    name: 'Persian',              native: 'فارسی',        abbr: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'ha',    name: 'Hausa',                native: 'Hausa',       abbr: 'HAU', flag: '🇳🇬', dir: 'ltr' },
  { code: 'ro',    name: 'Romanian',             native: 'Română',      abbr: 'ROU', flag: '🇷🇴', dir: 'ltr' },
  { code: 'el',    name: 'Greek',                native: 'Ελληνικά',    abbr: 'ΕΛΛ', flag: '🇬🇷', dir: 'ltr' },
  { code: 'he',    name: 'Hebrew',               native: 'עברית',        abbr: 'עבר', flag: '🇮🇱', dir: 'rtl' },
  { code: 'ms',    name: 'Malay',                native: 'Melayu',      abbr: 'MSA', flag: '🇲🇾', dir: 'ltr' },
  { code: 'pa',    name: 'Punjabi',              native: 'ਪੰਜਾਬੀ',        abbr: 'ਪੰਜਾ', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ne',    name: 'Nepali',               native: 'नेपाली',        abbr: 'नेप', flag: '🇳🇵', dir: 'ltr' },
];

const DEFAULT_LANG = 'en';
const CODES = LANGS.map((l) => l.code);
function langMeta(code) { return LANGS.find((l) => l.code === code) || LANGS[0]; }

// The BCP-47 hreflang value for a code (mostly identical; kept explicit for clarity).
function hreflangOf(code) { return code; }

// URL prefix for a language ('' for English at root, '/xx' otherwise).
function prefixOf(code) { return code === DEFAULT_LANG ? '' : '/' + code; }

const T = {};

// English master — the single source of truth and the fallback for every key.
T.en = {
  // meta (home)
  meta_title: 'TempMailGo — Free Temp Mail & Disposable Email (Instant, No Signup)',
  meta_desc: 'Free temporary email that receives real messages and OTP codes instantly. Disposable, anonymous, no signup. 10+ domains, real-time inbox, and dark mode.',
  // nav
  nav_inbox: 'Inbox', nav_how: 'How It Works', nav_blog: 'Blog', nav_about: 'About', nav_faq: 'FAQ', nav_contact: 'Contact',
  lang_label: 'Language',
  // service landing pages (chrome)
  ls_cta_h: 'Get a free temp mail address',
  ls_cta_p: 'a live disposable inbox in one click, no signup.',
  ls_cta_btn: 'Open my inbox',
  ls_related_h: 'Related temp mail guides',
  ls_related_p: 'keep your real inbox clean.',
  ls_home_link_pre: 'Back to the',
  ls_home_link: 'free temporary email generator',
  ls_home_link_post: 'on our homepage.',
  // hero
  hero_h1a: 'Free Temporary Email —', hero_h1b: 'Instant Disposable Inbox',
  hero_sub: 'Generate an instant disposable email that receives real messages and OTP verification codes in seconds — temp mail with no signup and no personal info. Free forever, with a live inbox that keeps spam out of your real one.',
  tp_nolog: 'No-log privacy', tp_instant: 'Instant & free', tp_uptime: '99.9% uptime', tp_otp: 'Receives OTP codes',
  // mail card
  mc_label: 'Your temporary email address', addr_generating: 'generating…',
  btn_copy: 'Copy', btn_new: 'New address', btn_extend: 'Extend time', btn_qr: 'Save / QR code',
  ph_user: 'custom username (optional)', btn_create: 'Create custom', timer_label: 'Inbox expires in',
  // inbox
  inbox: 'Inbox', msg_one: 'message', msg_many: 'messages', refresh: 'Refresh inbox',
  empty_h: 'Waiting for incoming emails…', empty_p: 'Your inbox is live. Send an email or OTP to your address above and it will appear here automatically.',
  // features
  feat_head: 'Everything you need in a temp mail service',
  feat_sub: 'Built for privacy, speed, and real-world signups — from OTP verification to newsletters you’d rather not see again.',
  f1t: 'Instant, no signup', f1d: 'A working address is generated the moment the page loads. No account, no password, no personal info — ever.',
  f2t: 'Real-time inbox', f2d: 'A temp mail with inbox updates built in: incoming mail appears automatically within seconds, and live polling keeps it fresh without a refresh.',
  f3t: 'Receives real OTP codes', f3d: 'A temp mail that receives OTP and confirmation links — genuine verification codes are detected and highlighted so you can copy them instantly. Ideal temp mail for verification code signups.',
  f4t: '10+ domains', f4d: 'Choose from .com, .net, .org, .xyz, .online, .dev and more. Switch domains if a site blocks one.',
  f5t: 'Attachments & HTML', f5d: 'View full HTML and plain-text bodies, sender details, timestamps, and attachment info safely in a sandbox — and developers can automate signup testing with a temp mail API.',
  f6t: 'No-log privacy', f6d: 'We don’t track you or keep your mail. Inboxes self-destruct on expiry and everything is deleted for good.',
  // steps
  steps_head: 'How TempMailGo works', steps_sub: 'Four steps, about five seconds, zero setup.',
  s1t: 'Get your address', s1d: 'Your free disposable email is ready the instant you land here. Copy it with one click.',
  s2t: 'Use it anywhere', s2d: 'Paste it into any signup, free trial, or form that asks for an email address.',
  s3t: 'Receive mail live', s3d: 'Verification codes and messages land in your inbox in real time — no refresh needed.',
  s4t: 'It self-destructs', s4d: 'When the timer ends, the inbox and every message are permanently deleted.',
  steps_cta: 'Read the full technical breakdown',
  // faq
  faq_head: 'Frequently asked questions', faq_sub: 'Quick answers about disposable email, OTP codes, privacy, and safety.',
  faq_all: 'See all FAQs',
  q1: 'Is TempMailGo really free?', a1: 'Yes. TempMailGo is 100% free with no signup, no account, and no hidden limits. Generate as many disposable addresses as you need.',
  q2: 'Can temp mail receive OTP and verification codes?', a2: 'Absolutely. Our addresses receive real email OTPs and verification links. Detected codes are highlighted in your inbox so you can copy them instantly. Note that SMS codes require a phone number and cannot be received by email.',
  q3: 'Do I need to sign up or install anything?', a3: 'No. TempMailGo works entirely in your browser with no signup, no download, and no app. Your address is ready the moment the page loads.',
  q4: 'How long does a temporary inbox last?', a4: 'By default an inbox lasts one hour. You can extend it with one click, or save it via a QR code / restore link to bring the same address back later.',
  q5: 'Is my temporary email private?', a5: 'We use random, private addresses and keep no logs of your activity. When an inbox expires, it and all its messages are permanently deleted. Still, never use temp mail for banking or sensitive accounts.',
  q6: 'Can I choose my own address and domain?', a6: 'Yes. Pick from 10+ domains and optionally type a custom username before the @ symbol. If a website blocks one domain, simply switch to another.',
  // footer
  foot_tagline: 'Free, instant disposable email addresses that receive real messages and OTP codes — no signup, no personal data, no spam in your real inbox.',
  foot_product: 'Product', foot_resources: 'Resources', foot_company: 'Company',
  foot_l_inbox: 'Temp Mail Inbox', foot_l_how: 'How It Works', foot_l_faq: 'FAQ', foot_l_features: 'Features',
  foot_l_blog: 'Blog', foot_l_howblog: 'How Temp Mail Works', foot_l_safe: 'Is Temp Mail Safe?', foot_l_vs: 'Temp Mail vs Guerrilla Mail',
  foot_l_about: 'About', foot_l_contact: 'Contact', foot_l_privacy: 'Privacy Policy', foot_l_terms: 'Terms of Service',
  foot_rights: 'All rights reserved.',
  foot_powered: 'Mail delivery powered by',
  foot_notaffil: 'Not affiliated with Gmail, Yahoo, or Outlook.',
  foot_disclaimer: 'TempMailGo is a free disposable email tool intended for protecting your privacy from spam and for testing. Do not use temporary addresses for banking, government, healthcare, or any account you need to keep. Emails are automatically and permanently deleted when the inbox expires.',
  // donation
  donate_btn: 'Donate',
  donate_title: 'Support TempMailGo', donate_desc: 'TempMailGo is free and ad-light. If it saved you from spam, a small crypto tip helps keep it running.',
  donate_coffee: 'Buy me a coffee', donate_crypto: 'USDT (TRC20)', donate_copy: 'Copy',
  // modals
  modal_html: 'HTML', modal_text: 'Plain text', save_title: 'Save your inbox', save_sub: 'Scan or copy this link to restore this exact address later.', copy_link: 'Copy link',
  // app toasts (used by app.js via window.__TMG_I18N)
  t_copied: '✅ Address copied to clipboard', t_copied2: '✅ Copied', t_new: '🔄 New address generated',
  t_custom: '✨ Custom address created', t_extended: '⏱️ Inbox extended', t_expired: 'Inbox expired — generated a new address',
  t_newmail: '📩 New email received', t_restore: '🔗 Restore link copied', t_wallet: '✅ Wallet address copied',
};

// Merge every non-English dictionary from translations.js into T.
// Kept in a separate file to keep this module readable; any missing key still
// falls back to English via tr() below.
const TRANSLATIONS = require('./translations.js');
for (const code of Object.keys(TRANSLATIONS)) {
  T[code] = TRANSLATIONS[code];
}

/** Translate: key -> string for `lang`, falling back to English. */
function tr(lang, key) {
  const dict = T[lang] || {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  return T.en[key] != null ? T.en[key] : '';
}

/** Build a plain object of ALL keys for a language, English-filled. */
function dictFor(lang) {
  const out = {};
  for (const k of Object.keys(T.en)) out[k] = tr(lang, k);
  return out;
}

module.exports = { LANGS, CODES, DEFAULT_LANG, T, tr, dictFor, langMeta, hreflangOf, prefixOf };
