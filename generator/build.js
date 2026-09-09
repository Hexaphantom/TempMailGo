'use strict';
/* Generates all static HTML pages into /public */

const fs = require('fs');
const path = require('path');
const { SITE, NAME, head, header, footer, adZone, scripts } = require('./layout');
const { ARTICLES } = require('./blog-data');

const PUBLIC = path.join(__dirname, '..', 'public');
function write(rel, html) {
  const full = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
  console.log('wrote', rel);
}

const orgSchema = {
  '@context': 'https://schema.org', '@type': 'Organization', name: NAME, url: SITE,
  logo: SITE + '/assets/logo.png',
  sameAs: [],
  description: 'Free disposable temporary email service that receives real messages and OTP codes with no signup.',
};

/* ---------------- ICONS ---------------- */
const I = {
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="M11 12 21 2m-3 0 3 3m-6 0 3 3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>',
  paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5 12 20a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m4 4v-7m0 7h-4m0-4h.01"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

/* ================= HOME / APP ================= */
function buildHome() {
  const schema = [
    orgSchema,
    {
      '@context': 'https://schema.org', '@type': 'WebApplication', name: NAME,
      url: SITE + '/', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web-based)',
      browserRequirements: 'Requires JavaScript. Works in any modern browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: 'Free disposable temporary email address that receives real emails and OTP verification codes instantly — no signup required.',
      featureList: ['Instant disposable email address', 'Receive real emails and OTP codes', '10+ custom domains', 'Real-time inbox', 'No registration', 'Auto-expiry with save/extend', 'Dark mode'],
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '2143' },
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  const featureCards = [
    [I.bolt, 'Instant, no signup', 'A working address is generated the moment the page loads. No account, no password, no personal info — ever.'],
    [I.clock, 'Real-time inbox', 'Incoming mail appears automatically within seconds. Live polling keeps your inbox fresh without a refresh.'],
    [I.key, 'Receives real OTP codes', 'Get genuine verification codes and confirmation links. Detected codes are highlighted so you can copy them instantly.'],
    [I.globe, '10+ domains', 'Choose from .com, .net, .org, .xyz, .online, .dev and more. Switch domains if a site blocks one.'],
    [I.paperclip, 'Attachments & HTML', 'View full HTML and plain-text bodies, sender details, timestamps, and attachment info safely in a sandbox.'],
    [I.shield, 'No-log privacy', 'We don’t track you or keep your mail. Inboxes self-destruct on expiry and everything is deleted for good.'],
  ].map(([ic, t, d]) => `<article class="feature-card"><div class="feature-ico" aria-hidden="true">${ic}</div><h3>${t}</h3><p>${d}</p></article>`).join('');

  const steps = [
    ['Get your address', 'Your free disposable email is ready the instant you land here. Copy it with one click.'],
    ['Use it anywhere', 'Paste it into any signup, free trial, or form that asks for an email address.'],
    ['Receive mail live', 'Verification codes and messages land in your inbox in real time — no refresh needed.'],
    ['It self-destructs', 'When the timer ends, the inbox and every message are permanently deleted.'],
  ].map(([t, d]) => `<div class="step"><h3>${t}</h3><p>${d}</p></div>`).join('');

  const faqHtml = HOME_FAQ.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('');

  const body = `
${header('/')}
<main>
  <section class="hero">
    <div class="container">
      <div class="hero-head">
        <h1>Free Temporary Email — <span class="gradient-text">Instant Disposable Inbox</span></h1>
        <p>Generate a free temp mail address that receives real emails and OTP verification codes in seconds. No signup, no personal info, no spam in your real inbox.</p>
        <div class="trust-row">
          <span class="trust-pill">${I.lock} No-log privacy</span>
          <span class="trust-pill">${I.bolt} Instant &amp; free</span>
          <span class="trust-pill">${I.clock} 99.9% uptime</span>
          <span class="trust-pill">${I.key} Receives OTP codes</span>
        </div>
      </div>

      <div class="mail-card">
        <div class="mail-card-label"><span class="dot-live" aria-hidden="true"></span> Your temporary email address</div>
        <div class="email-display">
          <span class="email-address" id="emailAddress" aria-live="polite">generating…</span>
          <button class="btn btn-primary" id="copyBtn">${I.copy} Copy</button>
        </div>

        <div class="email-actions">
          <button class="btn btn-ghost" id="newBtn">${I.refresh} New address</button>
          <button class="btn btn-ghost" id="extendBtn">${I.clock} Extend time</button>
          <button class="btn btn-ghost" id="qrBtn">${I.qr} Save / QR code</button>
        </div>

        <div class="email-builder">
          <input type="text" id="userInput" placeholder="custom username (optional)" aria-label="Custom username">
          <select id="domainSelect" aria-label="Choose a domain"></select>
          <button class="btn btn-ghost" id="createBtn">Create custom</button>
        </div>

        <div class="timer-bar">
          <span>Inbox expires in</span>
          <span class="timer-val" id="timerVal">60:00</span>
          <div class="timer-track"><div class="timer-fill" id="timerFill" style="width:100%"></div></div>
        </div>
      </div>

      ${adZone('ad-leaderboard', 'Header 728×90')}
    </div>
  </section>

  <section class="container">
    <div class="inbox-wrap">
      <div>
        <div class="inbox">
          <div class="inbox-head">
            <h2>Inbox <span class="inbox-count" id="inboxCount">0 messages</span></h2>
            <button class="refresh-btn" id="refreshBtn" aria-label="Refresh inbox">${I.refresh}</button>
          </div>
          <ul class="mail-list" id="mailList" aria-live="polite"></ul>
        </div>
        ${adZone('ad-inline', 'In-content responsive')}
      </div>
      <div>
        ${adZone('ad-sidebar', 'Sidebar 300×600')}
      </div>
    </div>
  </section>

  <section class="section" id="features">
    <div class="container">
      <div class="section-head">
        <h2>Everything you need in a temp mail service</h2>
        <p>Built for privacy, speed, and real-world signups — from OTP verification to newsletters you’d rather not see again.</p>
      </div>
      <div class="feature-grid">${featureCards}</div>
    </div>
  </section>

  <section class="section" style="background:var(--bg-2);border-block:1px solid var(--border)">
    <div class="container">
      <div class="section-head"><h2>How TempMailGo works</h2><p>Four steps, about five seconds, zero setup.</p></div>
      <div class="steps">${steps}</div>
      <p style="text-align:center;margin-top:28px"><a class="btn btn-primary" href="/how-it-works">Read the full technical breakdown</a></p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head"><h2>Frequently asked questions</h2><p>Quick answers about disposable email, OTP codes, privacy, and safety.</p></div>
      <div class="faq">${faqHtml}</div>
      <p style="text-align:center;margin-top:22px"><a class="btn btn-ghost" href="/faq">See all FAQs</a></p>
      ${adZone('ad-footer', 'Footer 728×90')}
    </div>
  </section>
</main>

<!-- Mail viewer modal -->
<div class="modal-backdrop" id="mailModal" role="dialog" aria-modal="true" aria-labelledby="mSubject">
  <div class="modal">
    <div class="modal-head">
      <div><h3 id="mSubject">Subject</h3><div class="modal-sub" id="mSub"></div></div>
      <button class="modal-close" data-close-modal aria-label="Close">×</button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab active" id="tabHtml">HTML</button>
      <button class="modal-tab" id="tabText">Plain text</button>
    </div>
    <div class="modal-body">
      <div id="viewHtml"><iframe id="htmlFrame" class="mail-html-frame" title="Email HTML content" sandbox></iframe></div>
      <div id="viewText" style="display:none"><pre id="textBody" style="white-space:pre-wrap;font-family:inherit;margin:0"></pre></div>
      <div id="viewAttach"></div>
    </div>
  </div>
</div>

<!-- QR / save modal -->
<div class="modal-backdrop" id="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrTitle">
  <div class="modal" style="max-width:440px">
    <div class="modal-head"><div><h3 id="qrTitle">Save your inbox</h3><div class="modal-sub">Scan or copy this link to restore this exact address later.</div></div><button class="modal-close" data-close-modal aria-label="Close">×</button></div>
    <div class="modal-body" style="text-align:center">
      <div id="qrImg" style="display:grid;place-items:center;min-height:220px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <input id="qrData" readonly style="flex:1;padding:.6em .8em;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:.85rem">
        <button class="btn btn-primary btn-sm" id="copyQr">Copy link</button>
      </div>
    </div>
  </div>
</div>

${footer()}
`;
  const html = head({
    path: '/',
    title: 'TempMailGo — Free Temp Mail & Disposable Email (Instant, No Signup)',
    description: 'Free temporary email that receives real messages and OTP codes instantly. Disposable, anonymous, no signup. 10+ domains, real-time inbox, and dark mode.',
    keywords: 'temp mail, temp mail free, temporary email, disposable email, fake email generator, burner email, throwaway email, temp mail no sign up, temp mail otp, receive verification code, anonymous email, 10 minute mail',
    schema,
  }) + body + scripts('<script src="/js/app.js" defer></script>');
  write('index.html', html);
}

const HOME_FAQ = [
  { q: 'Is TempMailGo really free?', a: 'Yes. TempMailGo is 100% free with no signup, no account, and no hidden limits. Generate as many disposable addresses as you need.' },
  { q: 'Can temp mail receive OTP and verification codes?', a: 'Absolutely. Our addresses receive real email OTPs and verification links. Detected codes are highlighted in your inbox so you can copy them instantly. Note that SMS codes require a phone number and cannot be received by email.' },
  { q: 'Do I need to sign up or install anything?', a: 'No. TempMailGo works entirely in your browser with no signup, no download, and no app. Your address is ready the moment the page loads.' },
  { q: 'How long does a temporary inbox last?', a: 'By default an inbox lasts one hour. You can extend it with one click, or save it via a QR code / restore link to bring the same address back later.' },
  { q: 'Is my temporary email private?', a: 'We use random, private addresses and keep no logs of your activity. When an inbox expires, it and all its messages are permanently deleted. Still, never use temp mail for banking or sensitive accounts.' },
  { q: 'Can I choose my own address and domain?', a: 'Yes. Pick from 10+ domains and optionally type a custom username before the @ symbol. If a website blocks one domain, simply switch to another.' },
];

/* ================= CONTENT PAGE WRAPPER ================= */
function contentPage({ path: p, title, description, keywords, h1, eyebrow, bodyHtml, schema, breadcrumb }) {
  const body = `
${header(p)}
<main class="page">
  <div class="container">
    ${adZone('ad-leaderboard', 'Header 728×90')}
    <div class="page-layout">
      <article class="prose">
        ${breadcrumb ? `<nav class="breadcrumb" aria-label="Breadcrumb">${breadcrumb}</nav>` : ''}
        ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
        <h1>${h1}</h1>
        ${bodyHtml}
      </article>
      <aside>
        ${adZone('ad-sidebar', 'Sidebar 300×600')}
      </aside>
    </div>
    ${adZone('ad-footer', 'Footer 728×90')}
  </div>
</main>
${footer()}
`;
  const html = head({ path: p, title, description, keywords, schema: schema || [orgSchema] }) + body + scripts();
  write((p === '/' ? 'index' : p.replace(/^\//, '')) + '.html', html);
}

function crumb(items) {
  return items.map((it, i) => it.href ? `<a href="${it.href}">${it.label}</a>${i < items.length - 1 ? ' › ' : ''}` : `${it.label}`).join('');
}
function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, item: SITE + (it.href || '') })),
  };
}

/* ================= ABOUT ================= */
contentPage({
  path: '/about',
  title: 'About TempMailGo — Our Mission for Private, Spam-Free Email',
  description: 'Learn about TempMailGo, a free disposable email service built to protect your privacy, stop spam, and make online signups fast and anonymous.',
  keywords: 'about temp mail, temp mail service, private temp mail, anonymous email',
  eyebrow: 'About us',
  h1: 'About TempMailGo',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'About' }]),
  schema: [orgSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }])],
  bodyHtml: `
<p class="lead">TempMailGo exists for one simple reason: <strong>you shouldn’t have to hand over your real email address just to read an article, download a file, or try a free trial.</strong></p>
<p>Every day, millions of email addresses are collected, sold, and leaked. Once your address is out there, the spam never really stops. We built TempMailGo to give everyone a fast, free, and private way to interact with the web without paying for it in junk mail and data breaches.</p>

<h2>What we do</h2>
<p>TempMailGo generates instant, disposable email addresses that receive real messages and verification codes — then disappear. There’s no signup, no password, and no personal information required. It’s a working inbox for the moments you need one, and nothing left behind when you don’t.</p>

<h2>Our principles</h2>
<ul>
  <li><strong>Privacy first.</strong> We keep no logs of who you are or what you do. Inboxes and their contents are permanently deleted on expiry.</li>
  <li><strong>Genuinely free.</strong> No paywalls, no “premium to remove limits” traps for core features.</li>
  <li><strong>Honest about limits.</strong> We’ll always tell you what temp mail <em>shouldn’t</em> be used for — like banking or accounts you need to keep.</li>
  <li><strong>Fast and reliable.</strong> A real-time inbox on infrastructure built for uptime.</li>
</ul>

<h2>Who it’s for</h2>
<p>Privacy-conscious users avoiding spam, shoppers trying new stores, readers getting past email walls, and developers testing signup flows. If you’ve ever paused before typing your real email, TempMailGo is for you.</p>

<div class="callout"><strong>A note on responsible use:</strong> TempMailGo is a privacy tool, not a shield for abuse. Please use it lawfully and never for fraud, harassment, or evading legitimate security. See our <a href="/terms">Terms of Service</a>.</div>

<h2>How we keep the lights on</h2>
<p>TempMailGo is supported by unobtrusive, clearly-labeled advertising placed around — never inside — the functional parts of the app. That lets us keep the service free for everyone while respecting your experience. We do not sell your data; we don’t have your data to sell.</p>

<p>Questions or feedback? We’d love to hear from you on our <a href="/contact">contact page</a>.</p>
`,
});

/* ================= HOW IT WORKS ================= */
contentPage({
  path: '/how-it-works',
  title: 'How It Works — The Technology Behind TempMailGo Temp Mail',
  description: 'How TempMailGo works: MX records, catch-all mail servers, inbound email APIs, and a real-time inbox that delivers disposable email and OTP codes.',
  keywords: 'how does temp mail work, how temp mail works, temp mail infrastructure, MX records, inbound email api',
  eyebrow: 'How it works',
  h1: 'How TempMailGo Works',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'How It Works' }]),
  schema: [orgSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'How It Works', href: '/how-it-works' }])],
  bodyHtml: `
<p class="lead">TempMailGo looks effortless — an address appears, and codes arrive. Under the hood it runs on the same email infrastructure the rest of the internet uses. Here’s the whole picture.</p>

<div class="article-hero"><img src="/blog/img/how-temp-mail-works.png" alt="Diagram showing how a temporary email flows from sender through MX records and a mail server into a real-time inbox" loading="lazy" width="1200" height="514"></div>

<h2>1. Domains with MX records we control</h2>
<p>Every address ends in a domain. For a domain to receive email, its DNS must include <strong>MX (Mail Exchange) records</strong> pointing at a mail server. TempMailGo’s domains route all their mail to our inbound infrastructure — this is what makes real delivery possible and why a temp mail service can never be front-end only.</p>

<h2>2. A catch-all mail server</h2>
<p>Our servers are configured as <em>catch-all</em>, meaning they accept mail for <strong>any</strong> username at our domains. That’s why you can invent any address on the spot and still receive mail at it.</p>

<h2>3. Inbound parsing via webhook</h2>
<p>When mail arrives, it’s parsed into structured data — sender, subject, HTML and plain-text bodies, and attachments — and delivered to our application through a secure webhook. TempMailGo also scans each message for one-time codes so it can highlight OTPs automatically.</p>

<h2>4. Temporary, TTL-based storage</h2>
<p>Messages are stored in a fast store with a strict time-to-live, keyed to the recipient address. Nothing is kept longer than the inbox’s lifetime, and expired data is purged automatically.</p>

<h2>5. Your live browser inbox</h2>
<p>Your browser polls our API every few seconds for new mail. The instant something arrives, it appears in your inbox with no page reload. You can open any message to read the full HTML (rendered safely in a sandbox), the plain-text version, and attachment details.</p>

<h2>6. Auto-expiry &amp; save</h2>
<p>When the timer hits zero, the mailbox and all its messages are deleted for good. Need longer? Extend with a click, or save a restore link / QR code to bring the same address back later.</p>

<table>
  <tr><th>Layer</th><th>Role</th></tr>
  <tr><td>DNS / MX records</td><td>Route incoming mail to our servers</td></tr>
  <tr><td>Catch-all mail server</td><td>Accept mail for any username</td></tr>
  <tr><td>Inbound webhook / API</td><td>Parse mail into structured JSON</td></tr>
  <tr><td>TTL store (e.g. Redis)</td><td>Hold messages temporarily by address</td></tr>
  <tr><td>REST API + polling</td><td>Deliver mail to your live inbox</td></tr>
  <tr><td>Expiry job</td><td>Permanently delete on timeout</td></tr>
</table>

<div class="callout">Curious about safety and privacy trade-offs? Read <a href="/blog/is-temp-mail-safe">Is Temp Mail Safe?</a> Want the OTP flow specifically? See <a href="/blog/how-otp-verification-works">How OTP Verification Works</a>.</div>

<p style="margin-top:24px"><a class="btn btn-primary" href="/">Try your live inbox now</a></p>
`,
});

/* ================= FAQ ================= */
const FULL_FAQ = [
  { q: 'What is temp mail?', a: 'Temp mail (temporary or disposable email) is a free, self-destructing email address you can use instead of your real one. It receives real messages and verification codes, then expires — with no signup or personal information required.' },
  { q: 'Is TempMailGo free?', a: 'Yes, completely free. There is no account, no password, and no limit on how many disposable addresses you can create.' },
  { q: 'Do I need to register or log in?', a: 'No. TempMailGo works instantly in your browser with no signup, login, or app install.' },
  { q: 'Can temp mail receive OTP / verification codes?', a: 'Yes. Email-based one-time passwords and verification links arrive normally, and TempMailGo highlights detected codes for one-click copying. SMS codes require a phone number and cannot be received by email.' },
  { q: 'How long does my temporary inbox last?', a: 'One hour by default. You can extend the timer, or save a restore link / QR code to recover the same address later.' },
  { q: 'Can I pick my own username and domain?', a: 'Yes. Choose from 10+ domains (.com, .net, .org, .xyz, .online, .dev and more) and optionally set a custom username before the @ symbol.' },
  { q: 'Can I reply to or send emails?', a: 'TempMailGo is receive-only by design. It’s built for getting verification codes and messages, not for sending mail.' },
  { q: 'Is temp mail safe?', a: 'It’s safe for low-stakes signups and keeps spam out of your real inbox. However, temp inboxes are not private enough for sensitive data, and you can be locked out if the inbox expires. Never use it for banking, government, healthcare, or important accounts.' },
  { q: 'Can I use temp mail for banking?', a: 'No — please don’t. Financial accounts require a secure, permanent inbox for statements, alerts, and password recovery. A disposable address can expire or be accessed by others, putting you at risk. Always use your real, secured email for anything involving money or identity.' },
  { q: 'Can temp mail be traced back to me?', a: 'The address itself isn’t tied to your identity, but websites can still see your IP address and browser details. Temp mail protects your email identity; it is not a substitute for a VPN or Tor for network-level anonymity.' },
  { q: 'What happens to my emails when the inbox expires?', a: 'They are permanently deleted along with the mailbox. Copy any codes or information you need before the timer runs out.' },
  { q: 'Does temp mail work for Gmail or Yahoo signup?', a: 'You cannot create a Gmail or Yahoo address with temp mail — those providers control their own domains. But you can often use a TempMailGo address to receive verification emails from many services. Some sites deliberately block disposable domains; try switching domains if so.' },
  { q: 'Can I use the same temp email twice?', a: 'While an inbox is active, yes. After it expires the address is released. Use the save/QR feature if you want to reliably restore the same address later.' },
  { q: 'Why was my temp address rejected by a website?', a: 'Some sites blocklist known disposable domains. Switch to a different TempMailGo domain or set a clean custom username and try again.' },
];
contentPage({
  path: '/faq',
  title: 'Temp Mail FAQ — Answers About Disposable Email & OTP Codes',
  description: 'Frequently asked questions about TempMailGo temp mail: OTP codes, privacy, safety, custom domains, expiry, and when not to use disposable email.',
  keywords: 'temp mail faq, can temp mail receive otp, is temp mail safe, how long does temp mail last, can i use temp mail for banking',
  eyebrow: 'Support',
  h1: 'Frequently Asked Questions',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'FAQ' }]),
  schema: [
    orgSchema,
    breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'FAQ', href: '/faq' }]),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FULL_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
  bodyHtml: `<p class="lead">Everything you need to know about using TempMailGo and disposable email in general. Can’t find your answer? <a href="/contact">Contact us</a>.</p>
  <div class="faq">${FULL_FAQ.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</div>`,
});

/* ================= CONTACT ================= */
contentPage({
  path: '/contact',
  title: 'Contact TempMailGo — Support, Feedback & Business Enquiries',
  description: 'Get in touch with the TempMailGo team for support, feedback, abuse reports, or business enquiries. We usually reply within two business days.',
  keywords: 'contact temp mail, temp mail support, temp mail feedback',
  eyebrow: 'Get in touch',
  h1: 'Contact Us',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'Contact' }]),
  schema: [orgSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact' }]),
    { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact TempMailGo', url: SITE + '/contact' }],
  bodyHtml: `
<p class="lead">We’d love to hear from you — whether it’s a bug, a feature idea, a partnership, or an abuse report.</p>
<p>Email us directly at <a href="mailto:support@tempmailgo.com">support@tempmailgo.com</a> and we’ll typically respond within two business days. For abuse or legal notices, use <a href="mailto:abuse@tempmailgo.com">abuse@tempmailgo.com</a>.</p>

<form class="form-grid" id="contactForm" onsubmit="event.preventDefault();var t=document.getElementById('toast');t.textContent='✅ Thanks! Your message has been noted. We\\'ll reply by email.';t.classList.add('show');setTimeout(function(){t.classList.remove('show')},3000);this.reset();">
  <div class="form-field"><label for="cName">Name</label><input id="cName" name="name" required autocomplete="name"></div>
  <div class="form-field"><label for="cEmail">Your email</label><input id="cEmail" name="email" type="email" required autocomplete="email"></div>
  <div class="form-field"><label for="cTopic">Topic</label>
    <select id="cTopic" name="topic"><option>General question</option><option>Bug report</option><option>Feature request</option><option>Abuse report</option><option>Business / advertising</option></select>
  </div>
  <div class="form-field"><label for="cMsg">Message</label><textarea id="cMsg" name="message" required></textarea></div>
  <button class="btn btn-primary" type="submit">Send message</button>
  <p style="font-size:.82rem;color:var(--text-3)">This demo form does not transmit data. For a live deployment, connect it to your email or a form backend (e.g. Formspree, or your own <code>/api/contact</code> route).</p>
</form>

<h2>Other ways to reach us</h2>
<ul>
  <li><strong>Support:</strong> <a href="mailto:support@tempmailgo.com">support@tempmailgo.com</a></li>
  <li><strong>Privacy questions:</strong> <a href="mailto:privacy@tempmailgo.com">privacy@tempmailgo.com</a></li>
  <li><strong>Abuse / legal:</strong> <a href="mailto:abuse@tempmailgo.com">abuse@tempmailgo.com</a></li>
</ul>
`,
});

/* ================= PRIVACY ================= */
contentPage({
  path: '/privacy',
  title: 'Privacy Policy — TempMailGo Disposable Email',
  description: 'TempMailGo Privacy Policy: how we handle temporary emails, what we do and don’t store, cookies, third-party advertising, and your rights.',
  keywords: 'temp mail privacy policy, disposable email privacy, no log email',
  eyebrow: 'Legal',
  h1: 'Privacy Policy',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]),
  schema: [orgSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Privacy Policy', href: '/privacy' }])],
  bodyHtml: `
<p><em>Last updated: 8 September 2026.</em></p>
<p>TempMailGo (“we”, “us”) is a free disposable email service. This Privacy Policy explains what information we handle when you use our website and service, and the choices you have. Because this is an email tool, we take data handling seriously and aim to collect as little as possible.</p>

<h2>1. The short version</h2>
<div class="callout">We don’t require an account. We don’t ask for your name or personal details. Temporary emails and their contents are stored only briefly and are permanently deleted when your inbox expires. We do not sell your personal data.</div>

<h2>2. Information we handle</h2>
<h3>a) Temporary email content</h3>
<p>Messages sent to a disposable address you generate are stored temporarily so we can display them in your inbox. This content is automatically and permanently deleted when the inbox expires (by default within one hour) or when you generate a new address. We do not read, analyze for marketing, or share the contents of your temporary messages.</p>
<h3>b) Technical data</h3>
<p>Like most websites, our servers may process limited technical information such as IP address, browser type, and request timestamps for security, abuse prevention, and reliability. We minimize retention of this data and do not use it to build advertising profiles.</p>
<h3>c) Local storage</h3>
<p>We store your current address, session token, and theme preference in your browser’s local storage so your inbox persists across page reloads. This never leaves your device except when you choose to restore an inbox.</p>

<h2>3. Cookies &amp; advertising</h2>
<p>We use minimal first-party storage for functionality. We may display advertising from third-party networks such as Google AdSense to keep the service free. These partners may use cookies or similar technologies to serve and measure ads, potentially including personalized ads based on your prior activity.</p>
<ul>
  <li>You can learn about and control personalized advertising via <a href="https://myadcenter.google.com/" rel="nofollow noopener" target="_blank">Google Ads Settings</a>.</li>
  <li>Google’s use of advertising cookies is governed by the <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow noopener" target="_blank">Google Privacy &amp; Terms</a>.</li>
  <li>Where required by law, we will request consent before setting non-essential cookies.</li>
</ul>

<h2>4. How we use information</h2>
<ul>
  <li>To provide the disposable inbox and display incoming mail.</li>
  <li>To maintain security, prevent abuse, and keep the service reliable.</li>
  <li>To display advertising that funds the free service.</li>
</ul>

<h2>5. Data retention</h2>
<p>Temporary email content lives only for the inbox lifetime and is then deleted. We do not maintain long-term archives of your messages. Limited security logs, if kept, are retained only as long as necessary.</p>

<h2>6. Data sharing</h2>
<p>We do not sell your personal data. We may share limited technical data with service providers (e.g. hosting, our email-receiving provider, and advertising partners) strictly to operate the service, and where legally required.</p>

<h2>7. Your rights</h2>
<p>Depending on your location (including under the GDPR and CCPA), you may have rights to access, delete, or restrict processing of personal data. Because we intentionally hold very little personal data and delete messages automatically, most content is already ephemeral. To make a request, email <a href="mailto:privacy@tempmailgo.com">privacy@tempmailgo.com</a>.</p>

<h2>8. Children</h2>
<p>TempMailGo is not directed to children under 13 (or the minimum age in your jurisdiction) and we do not knowingly collect their data.</p>

<h2>9. Security</h2>
<p>We use reasonable technical measures to protect the service, but no method of transmission or storage is 100% secure. Never send sensitive personal, financial, or confidential information through a temporary inbox.</p>

<h2>10. Changes</h2>
<p>We may update this policy; the “last updated” date will change accordingly. Continued use after an update constitutes acceptance.</p>

<h2>11. Contact</h2>
<p>Questions about privacy? Email <a href="mailto:privacy@tempmailgo.com">privacy@tempmailgo.com</a> or visit our <a href="/contact">contact page</a>.</p>
`,
});

/* ================= TERMS ================= */
contentPage({
  path: '/terms',
  title: 'Terms of Service — TempMailGo',
  description: 'The Terms of Service governing your use of TempMailGo’s free disposable email service, including acceptable use and disclaimers.',
  keywords: 'temp mail terms of service, disposable email terms',
  eyebrow: 'Legal',
  h1: 'Terms of Service',
  breadcrumb: crumb([{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]),
  schema: [orgSchema, breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Terms of Service', href: '/terms' }])],
  bodyHtml: `
<p><em>Last updated: 8 September 2026.</em></p>
<p>By accessing or using TempMailGo (the “Service”), you agree to these Terms of Service. If you do not agree, please do not use the Service.</p>

<h2>1. The Service</h2>
<p>TempMailGo provides free, temporary, disposable email addresses that receive messages for a limited time. The Service is provided on an “as is” and “as available” basis, without warranties of any kind.</p>

<h2>2. Acceptable use</h2>
<p>You agree <strong>not</strong> to use the Service to:</p>
<ul>
  <li>Break any law or regulation, or facilitate fraud, phishing, or identity theft.</li>
  <li>Harass, threaten, or harm others, or distribute malware or spam.</li>
  <li>Evade bans, security controls, or authentication in a manner that violates another party’s terms or the law.</li>
  <li>Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the Service.</li>
  <li>Register accounts for critical services (banking, government, healthcare, work) where a permanent, secure inbox is required.</li>
</ul>

<h2>3. No confidentiality or permanence</h2>
<p>Temporary inboxes are ephemeral and may be publicly reachable by address. Do not use them for sensitive, confidential, or important communications. Messages are deleted automatically on expiry and cannot be recovered. We are not responsible for any loss resulting from expired or inaccessible inboxes.</p>

<h2>4. Availability</h2>
<p>We strive for high uptime but do not guarantee uninterrupted or error-free operation. We may modify, suspend, or discontinue any part of the Service at any time without notice.</p>

<h2>5. Advertising</h2>
<p>The Service is supported by advertising. By using it, you acknowledge that ads may be displayed, and that third-party advertising partners operate under their own terms and privacy policies.</p>

<h2>6. Intellectual property</h2>
<p>The TempMailGo name, logo, design, and original content are our property. You may not copy or reuse them without permission. Article content is provided for informational purposes only and does not constitute legal advice.</p>

<h2>7. Limitation of liability</h2>
<p>To the maximum extent permitted by law, TempMailGo and its operators shall not be liable for any indirect, incidental, or consequential damages, or any loss of data, profits, or opportunities arising from your use of or inability to use the Service.</p>

<h2>8. Indemnity</h2>
<p>You agree to indemnify and hold harmless TempMailGo from any claims or damages arising out of your misuse of the Service or violation of these Terms.</p>

<h2>9. Changes to these Terms</h2>
<p>We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms.</p>

<h2>10. Contact</h2>
<p>Questions about these Terms? Email <a href="mailto:support@tempmailgo.com">support@tempmailgo.com</a>.</p>
`,
});

/* ================= BLOG INDEX ================= */
function buildBlogIndex() {
  const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  const cards = sorted.map(a => `
    <a class="blog-card" href="/blog/${a.slug}">
      <div class="blog-thumb"><img src="${a.img}" alt="${a.title}" loading="lazy" width="600" height="338"></div>
      <div class="blog-card-body">
        <div class="blog-tag">${a.tag}</div>
        <h3>${a.title}</h3>
        <p>${a.description}</p>
        <div class="blog-meta"><span>${new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span><span>${a.read}</span></div>
      </div>
    </a>`).join('');

  const schema = [
    orgSchema,
    breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }]),
    { '@context': 'https://schema.org', '@type': 'Blog', name: 'TempMailGo Blog', url: SITE + '/blog',
      blogPost: sorted.map(a => ({ '@type': 'BlogPosting', headline: a.title, url: SITE + '/blog/' + a.slug, datePublished: a.date, image: SITE + a.img })) },
  ];
  const body = `
${header('/blog')}
<main class="page">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">${crumb([{ label: 'Home', href: '/' }, { label: 'Blog' }])}</nav>
    <div class="section-head" style="text-align:left;max-width:720px;margin-bottom:8px">
      <div class="eyebrow">Resources</div>
      <h1>The TempMailGo Blog</h1>
      <p>Guides, comparisons, and deep-dives on disposable email, OTP verification, privacy, and beating spam.</p>
    </div>
    ${adZone('ad-leaderboard', 'Header 728×90')}
    <div class="blog-grid">${cards}</div>
    ${adZone('ad-footer', 'Footer 728×90')}
  </div>
</main>
${footer()}
`;
  const html = head({
    path: '/blog',
    title: 'Temp Mail Blog — Guides on Disposable Email, OTP & Privacy | TempMailGo',
    description: 'Read the TempMailGo blog for guides on how temp mail works, whether disposable email is safe, OTP verification, and comparisons like temp mail vs Guerrilla Mail.',
    keywords: 'temp mail blog, how does temp mail work, is temp mail safe, temp mail vs guerrilla mail, temp mail otp',
    schema,
  }) + body + scripts();
  write('blog/index.html', html);
}

/* ================= BLOG ARTICLES ================= */
function buildArticles() {
  ARTICLES.forEach(a => {
    const others = ARTICLES.filter(x => x.slug !== a.slug).slice(0, 3);
    const related = others.map(o => `<a class="blog-card" href="/blog/${o.slug}"><div class="blog-thumb"><img src="${o.img}" alt="${o.title}" loading="lazy" width="600" height="338"></div><div class="blog-card-body"><div class="blog-tag">${o.tag}</div><h3>${o.title}</h3></div></a>`).join('');
    const schema = [
      orgSchema,
      breadcrumbSchema([{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: a.title, href: '/blog/' + a.slug }]),
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        headline: a.title, description: a.description,
        image: SITE + a.img, datePublished: a.date, dateModified: a.date,
        author: { '@type': 'Organization', name: NAME }, publisher: orgSchema,
        mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + '/blog/' + a.slug },
      },
    ];
    const body = `
${header('/blog')}
<main class="page">
  <div class="container">
    ${adZone('ad-leaderboard', 'Header 728×90')}
    <div class="page-layout">
      <article class="prose">
        <nav class="breadcrumb" aria-label="Breadcrumb">${crumb([{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: a.tag }])}</nav>
        <div class="eyebrow">${a.tag}</div>
        <h1>${a.title}</h1>
        <div class="article-meta"><span>${new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span><span>·</span><span>${a.read}</span></div>
        <div class="article-hero"><img src="${a.img}" alt="${a.title}" width="1200" height="514"></div>
        ${a.body}
        ${adZone('ad-inline', 'In-content responsive')}
        <div class="callout" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div><strong>Try TempMailGo free</strong> — a live disposable inbox in one click.</div>
          <a class="btn btn-primary" href="/">Get a temp email</a>
        </div>
        <h2>Related articles</h2>
        <div class="blog-grid">${related}</div>
      </article>
      <aside>${adZone('ad-sidebar', 'Sidebar 300×600')}</aside>
    </div>
    ${adZone('ad-footer', 'Footer 728×90')}
  </div>
</main>
${footer()}
`;
    const html = head({
      path: '/blog/' + a.slug, ogType: 'article',
      title: a.metaTitle, description: a.description, keywords: a.keywords, schema,
    }) + body + scripts();
    write('blog/' + a.slug + '.html', html);
  });
}

/* ================= 404 ================= */
function build404() {
  const body = `${header('')}
<main class="page"><div class="container" style="text-align:center;padding:60px 0">
  <div class="eyebrow">Error 404</div>
  <h1>This inbox doesn’t exist</h1>
  <p style="color:var(--text-2);max-width:520px;margin:0 auto 24px">The page you’re looking for may have expired or moved. But your free temp mail is always one click away.</p>
  <a class="btn btn-primary" href="/">Go to the inbox</a>
  <a class="btn btn-ghost" href="/blog" style="margin-left:8px">Read the blog</a>
</div></main>
${footer()}`;
  const html = head({ path: '/404', title: 'Page Not Found — TempMailGo', description: 'The page you requested could not be found.' }) + body + scripts();
  write('404.html', html);
}

/* ================= SITEMAP + ROBOTS ================= */
function buildSitemap() {
  const urls = [
    { loc: '/', pri: '1.0', freq: 'daily' },
    { loc: '/how-it-works', pri: '0.8', freq: 'monthly' },
    { loc: '/about', pri: '0.6', freq: 'monthly' },
    { loc: '/faq', pri: '0.8', freq: 'monthly' },
    { loc: '/contact', pri: '0.5', freq: 'yearly' },
    { loc: '/privacy', pri: '0.4', freq: 'yearly' },
    { loc: '/terms', pri: '0.4', freq: 'yearly' },
    { loc: '/blog', pri: '0.9', freq: 'weekly' },
    ...ARTICLES.map(a => ({ loc: '/blog/' + a.slug, pri: '0.7', freq: 'monthly', lastmod: a.date })),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>`;
  write('sitemap.xml', xml);

  write('robots.txt', `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);
}

/* ---- run ---- */
buildHome();
buildBlogIndex();
buildArticles();
build404();
buildSitemap();
console.log('\\nBuild complete.');
