'use strict';
/* Shared HTML layout + SEO head for all static pages (now i18n-aware). */

const i18n = require('./i18n');
const { CODES, DEFAULT_LANG, langMeta, prefixOf, hreflangOf, dictFor } = i18n;
const tr = (lang, k) => i18n.tr(lang, k);

const SITE = 'https://freetempmailgo.xyz';
const NAME = 'TempMailGo';

// Donation wallet (placeholder — replace with your own before deploying).
const USDT_TRC20_WALLET = 'TGjg3Rab4byTwAacdfPXhUr5PXzzpdTZtx';
const BUYMEACOFFEE_URL = 'https://www.buymeacoffee.com/tempmailgo';

// Nav items: key -> i18n key, href -> clean path (language prefix added at render).
const NAV = [
  { href: '/', key: 'nav_inbox' },
  { href: '/how-it-works', key: 'nav_how' },
  { href: '/blog', key: 'nav_blog' },
  { href: '/about', key: 'nav_about' },
  { href: '/faq', key: 'nav_faq' },
  { href: '/contact', key: 'nav_contact' },
];

// Join a language prefix with a clean path (keeps a single leading slash and
// preserves the trailing slash used by the home page).
function localizedHref(lang, cleanPath) {
  const p = prefixOf(lang);
  if (cleanPath === '/') return p === '' ? '/' : p + '/';
  return p + cleanPath;
}

function head(o) {
  const lang = o.lang || DEFAULT_LANG;
  const meta = langMeta(lang);
  const cleanPath = o.path || '/';
  const canonical = SITE + localizedHref(lang, cleanPath);
  const ogImg = SITE + '/assets/og-image.png';
  const schema = (o.schema || []).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n');

  // hreflang alternates for every language + x-default (points at English).
  const alternates = CODES.map(c =>
    `<link rel="alternate" hreflang="${hreflangOf(c)}" href="${SITE + localizedHref(c, cleanPath)}">`
  ).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${SITE + localizedHref(DEFAULT_LANG, cleanPath)}">`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${meta.dir}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title}</title>
<meta name="description" content="${o.description}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#4c6fe6">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="keywords" content="${o.keywords || 'temp mail, temporary email, disposable email, fake email generator, burner email, temp mail otp'}">
<meta name="author" content="${NAME}">
<!-- hreflang alternates -->
${alternates}
<!-- Open Graph -->
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="${NAME}">
<meta property="og:locale" content="${lang.replace('-', '_')}">
<meta property="og:title" content="${o.title}">
<meta property="og:description" content="${o.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${o.title}">
<meta name="twitter:description" content="${o.description}">
<meta name="twitter:image" content="${ogImg}">
<link rel="icon" type="image/png" href="/assets/logo.png">
<link rel="apple-touch-icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"></noscript>
<link rel="stylesheet" href="/css/style.css">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<!-- Google AdSense (replace ca-pub-XXXX with your publisher ID after approval) -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script> -->
${schema}
</head>
<body>`;
}

function logoSvg() {
  return `<img class="brand-logo" src="/assets/logo.png" alt="TempMailGo logo — disposable temporary email service" width="112" height="60">`;
}

// Language switcher (crawlable anchor links to the same page in each language).
function langSwitcher(lang, cleanPath) {
  const items = CODES.map(c =>
    `<a href="${localizedHref(c, cleanPath)}"${c === lang ? ' class="active" aria-current="true"' : ''} hreflang="${hreflangOf(c)}" lang="${c}">${langMeta(c).native}</a>`
  ).join('');
  return `<details class="lang-switch">
    <summary aria-label="${tr(lang, 'lang_label')}"><span class="lang-globe" aria-hidden="true">🌐</span><span class="lang-cur">${langMeta(lang).native}</span></summary>
    <div class="lang-menu" role="menu">${items}</div>
  </details>`;
}

function header(active, lang) {
  lang = lang || DEFAULT_LANG;
  const links = NAV.map(n => {
    const href = localizedHref(lang, n.href);
    return `<a href="${href}"${n.href === active ? ' class="active"' : ''}>${tr(lang, n.key)}</a>`;
  }).join('');
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="${localizedHref(lang, '/')}">${logoSvg()}<span>Temp<b>Mail</b>Go</span></a>
    <nav class="nav-links" id="navLinks" aria-label="Primary">${links}</nav>
    <div class="nav-tools">
      ${langSwitcher(lang, active || '/')}
      <button class="theme-toggle" data-theme-toggle aria-label="Toggle dark mode"><span class="ti">🌙</span></button>
      <button class="nav-toggle" data-nav-toggle aria-label="Open menu">☰</button>
    </div>
  </div>
</header>`;
}

function adZone(cls, label) {
  return `<aside class="ad-zone ${cls}" aria-label="Advertisement"><span class="ad-label">Advertisement · ${label}</span></aside>`;
}

// Small, non-intrusive donation section (rendered inside the footer).
function donation(lang) {
  return `<div class="donation">
    <div class="donation-inner">
      <div class="donation-copy">
        <span class="donation-title">💜 ${tr(lang, 'donate_title')}</span>
        <p class="donation-desc">${tr(lang, 'donate_desc')}</p>
      </div>
      <div class="donation-actions">
        <a class="btn-coffee" href="${BUYMEACOFFEE_URL}" target="_blank" rel="noopener nofollow">☕ ${tr(lang, 'donate_coffee')}</a>
        <div class="donation-crypto">
          <span class="crypto-label">${tr(lang, 'donate_crypto')}</span>
          <code class="crypto-wallet" id="usdtWallet">${USDT_TRC20_WALLET}</code>
          <button class="crypto-copy" data-copy-wallet aria-label="${tr(lang, 'donate_copy')}">${tr(lang, 'donate_copy')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function footer(lang) {
  lang = lang || DEFAULT_LANG;
  const L = (p) => localizedHref(lang, p);
  return `<footer class="site-footer">
  <div class="container">
    ${donation(lang)}
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${L('/')}">${logoSvg()}<span>Temp<b>Mail</b>Go</span></a>
        <p>${tr(lang, 'foot_tagline')}</p>
        <div class="trust-row" style="justify-content:flex-start">
          <span class="trust-pill">🔒 ${tr(lang, 'tp_nolog')}</span>
          <span class="trust-pill">⚡ ${tr(lang, 'tp_uptime')}</span>
        </div>
      </div>
      <div class="footer-col">
        <h4>${tr(lang, 'foot_product')}</h4>
        <a href="${L('/')}">${tr(lang, 'foot_l_inbox')}</a>
        <a href="${L('/how-it-works')}">${tr(lang, 'foot_l_how')}</a>
        <a href="${L('/faq')}">${tr(lang, 'foot_l_faq')}</a>
        <a href="${L('/') + '#features'}">${tr(lang, 'foot_l_features')}</a>
      </div>
      <div class="footer-col">
        <h4>${tr(lang, 'foot_resources')}</h4>
        <a href="${L('/blog')}">${tr(lang, 'foot_l_blog')}</a>
        <a href="${L('/blog/how-does-temp-mail-work')}">${tr(lang, 'foot_l_howblog')}</a>
        <a href="${L('/blog/is-temp-mail-safe')}">${tr(lang, 'foot_l_safe')}</a>
        <a href="${L('/blog/temp-mail-vs-guerrilla-mail')}">${tr(lang, 'foot_l_vs')}</a>
      </div>
      <div class="footer-col">
        <h4>${tr(lang, 'foot_company')}</h4>
        <a href="${L('/about')}">${tr(lang, 'foot_l_about')}</a>
        <a href="${L('/contact')}">${tr(lang, 'foot_l_contact')}</a>
        <a href="${L('/privacy')}">${tr(lang, 'foot_l_privacy')}</a>
        <a href="${L('/terms')}">${tr(lang, 'foot_l_terms')}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> ${NAME}. ${tr(lang, 'foot_rights')}</span>
      <span>${tr(lang, 'foot_powered')} <a href="https://mail.tm" rel="noopener nofollow" target="_blank">mail.tm</a>, <a href="https://www.guerrillamail.com" rel="noopener nofollow" target="_blank">Guerrilla Mail</a>, <a href="https://www.mailinator.com" rel="noopener nofollow" target="_blank">Mailinator</a> and <a href="https://dropmail.me" rel="noopener nofollow" target="_blank">DropMail</a> · ${tr(lang, 'foot_notaffil')}</span>
    </div>
    <p class="footer-disclaimer">${tr(lang, 'foot_disclaimer')}</p>
  </div>
</footer>`;
}

function scripts(extra, lang) {
  lang = lang || DEFAULT_LANG;
  const i18nJson = JSON.stringify(dictFor(lang));
  return `<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.__TMG_I18N=${i18nJson};window.__TMG_LANG=${JSON.stringify(lang)};</script>
<script src="/js/common.js" defer></script>
${extra || ''}
</body>
</html>`;
}

module.exports = { SITE, NAME, NAV, head, header, footer, adZone, scripts, logoSvg, donation, localizedHref, USDT_TRC20_WALLET };
