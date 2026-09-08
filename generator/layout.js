'use strict';
/* Shared HTML layout + SEO head for all static pages. */

const SITE = 'https://www.tempmailgo.com';
const NAME = 'TempMailGo';

const NAV = [
  { href: '/', label: 'Inbox' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

function head(o) {
  const canonical = SITE + (o.path === '/' ? '/' : o.path);
  const ogImg = SITE + '/assets/og-image.png';
  const schema = (o.schema || []).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
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
<!-- Open Graph -->
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="${NAME}">
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

function header(active) {
  const links = NAV.map(n => `<a href="${n.href}"${n.href === active ? ' class="active"' : ''}>${n.label}</a>`).join('');
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="/">${logoSvg()}<span>Temp<b>Mail</b>Go</span></a>
    <nav class="nav-links" id="navLinks" aria-label="Primary">${links}</nav>
    <div class="nav-tools">
      <button class="theme-toggle" data-theme-toggle aria-label="Toggle dark mode"><span class="ti">🌙</span></button>
      <button class="nav-toggle" data-nav-toggle aria-label="Open menu">☰</button>
    </div>
  </div>
</header>`;
}

function adZone(cls, label) {
  return `<aside class="ad-zone ${cls}" aria-label="Advertisement"><span class="ad-label">Advertisement · ${label}</span></aside>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/">${logoSvg()}<span>Temp<b>Mail</b>Go</span></a>
        <p>Free, instant disposable email addresses that receive real messages and OTP codes — no signup, no personal data, no spam in your real inbox.</p>
        <div class="trust-row" style="justify-content:flex-start">
          <span class="trust-pill">🔒 No-log privacy</span>
          <span class="trust-pill">⚡ 99.9% uptime</span>
        </div>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <a href="/">Temp Mail Inbox</a>
        <a href="/how-it-works">How It Works</a>
        <a href="/faq">FAQ</a>
        <a href="/#features">Features</a>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <a href="/blog">Blog</a>
        <a href="/blog/how-does-temp-mail-work">How Temp Mail Works</a>
        <a href="/blog/is-temp-mail-safe">Is Temp Mail Safe?</a>
        <a href="/blog/temp-mail-vs-guerrilla-mail">Temp Mail vs Guerrilla Mail</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> ${NAME}. All rights reserved.</span>
      <span>Made for privacy · Not affiliated with Gmail, Yahoo, or Outlook.</span>
    </div>
    <p class="footer-disclaimer">TempMailGo is a free disposable email tool intended for protecting your privacy from spam and for testing. Do not use temporary addresses for banking, government, healthcare, or any account you need to keep. Emails are automatically and permanently deleted when the inbox expires.</p>
  </div>
</footer>`;
}

function scripts(extra) {
  return `<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/js/common.js" defer></script>
${extra || ''}
</body>
</html>`;
}

module.exports = { SITE, NAME, NAV, head, header, footer, adZone, scripts, logoSvg };
