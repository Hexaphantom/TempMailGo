# TempMailGo — Free Disposable Temporary Email

A complete, deployable temp-mail (disposable email) service: an instant, no-signup
inbox that receives **real** emails and OTP codes, plus a full SEO- and AdSense-ready
content site (blog, About, How It Works, FAQ, Privacy, Terms, Contact).

Built with vanilla JS + a Node/Express backend — no framework lock-in, no build
step for the frontend beyond a static HTML generator.

---

## ⚠️ Read this first: what only YOU can set up

A live temp-mail service **cannot be pure front-end code.** To actually *receive*
real email you need three things that are outside the code and specific to you:

### 1. Domain(s) you own
Buy the domains you want to offer in the UI (Namecheap, Cloudflare, Porkbun, etc.).
The list currently in `src/server.js` (`DOMAINS`) is **placeholder** — replace it
with domains you actually control. Offer a variety: `.com`, `.net`, `.org`, `.xyz`,
`.online`, `.dev`, etc.

> You **cannot** offer `@gmail.com`, `@yahoo.com`, or `@outlook.com` — those are owned
> by Google/Yahoo/Microsoft and can't be spoofed. Real `.edu` addresses also can't be
> issued by you. Use your own custom domains only.

### 2. DNS / MX records
For each domain, add **MX records** pointing at your inbound email provider, so the
internet knows to route mail for that domain to them. (Your provider gives you the
exact records.) This is the single step that makes real delivery possible.

### 3. An inbound email provider (pick ONE)
Something that receives mail at your domains and **POSTs the parsed message to your
webhook** at `POST /api/inbound`:

| Option | Good for | Notes |
|---|---|---|
| **Mailgun** (Routes / Inbound) | Easiest managed option | Create a Route `catch_all()` → *forward* to `https://YOURDOMAIN/api/inbound`. Posts multipart form fields — already supported. |
| **ImprovMX** | Cheap/simple forwarding | Webhook add-on posts parsed mail — supported. |
| **SendGrid Inbound Parse** | High volume | Point the Parse webhook at `/api/inbound`. |
| **Self-hosted Postfix + parser** | Full control / no third party | Configure catch-all, pipe mail to a script that POSTs JSON to `/api/inbound`. |
| **Cloudflare Email Routing → Worker** | Free tier | Worker forwards JSON to `/api/inbound`. |

The webhook in `src/server.js` already understands **Mailgun/ImprovMX/SendGrid
form-field shapes AND a normalized JSON body**, so most providers work with zero code
changes. Set `INBOUND_SECRET` and pass it as the `x-webhook-secret` header (or
`?secret=`) to authenticate the webhook.

Until you complete steps 1–3, the app runs perfectly but only the **"Send test email"**
button (demo endpoint) puts mail in the inbox. Everything else — UI, SEO, content — is
fully live.

---

## What's already built for you (no external setup needed)

- ✅ Instant random address on load, "New address", custom username, 10+ domain picker
- ✅ Real-time inbox via 5-second polling (swap for WebSockets if you like)
- ✅ Full message view: HTML (sandboxed iframe) + plain text + attachments + sender/subject/time
- ✅ Automatic **OTP / verification-code detection** and highlighting
- ✅ Copy-to-clipboard, auto-expiry countdown, **extend** and **save via QR/restore-link**
- ✅ Collision-checked "never used before" address generation (crypto RNG)
- ✅ In-memory TTL store (drop-in replaceable with Redis — see below)
- ✅ Dark / light mode toggle (respects system preference, persists)
- ✅ Fully responsive, mobile-first, fast (system font + async webfont, lazy images)
- ✅ **SEO**: unique titles/descriptions, canonical URLs, OG + Twitter cards,
  Schema.org (WebApplication, FAQPage, BlogPosting, BreadcrumbList, Organization),
  semantic HTML5, `sitemap.xml`, `robots.txt`, alt text everywhere
- ✅ **AdSense-ready**: About, How It Works, FAQ, Privacy Policy, Terms, Contact,
  and **9 substantial blog articles**; clearly separated ad zones (header, sidebar,
  in-content, footer) that never overlap the app UI
- ✅ Trust signals + no-log privacy messaging

---

## Run it

```bash
npm install
npm run build     # generates all HTML pages into /public
npm start         # serves on http://localhost:3000
# or: npm run dev  (build + start)
```

Docker:
```bash
docker build -t tempmailgo .
docker run -p 3000:3000 --env-file .env tempmailgo
```

## Project structure

```
tempmailgo/
├─ src/
│  ├─ server.js      # Express app: static hosting + REST API + /api/inbound webhook
│  └─ store.js       # TTL mailbox store (swap for Redis in prod) + OTP extraction
├─ generator/
│  ├─ layout.js      # shared <head>/header/footer + SEO meta
│  ├─ blog-data.js   # blog article content
│  └─ build.js       # generates every static page + sitemap + robots
├─ public/           # generated site + assets + css/js (served statically)
│  ├─ css/style.css  ├─ js/app.js (inbox app)  ├─ js/common.js (theme/nav)
│  └─ assets/ , blog/img/
├─ Dockerfile , .env.example , package.json
```

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/domains` | List available domains |
| POST | `/api/generate` | Create a new address `{domain?, username?}` |
| GET | `/api/inbox?address=` | Poll inbox (list) |
| GET | `/api/message?address=&id=` | Full message |
| DELETE | `/api/message?address=&id=` | Delete a message |
| POST | `/api/extend` | Extend mailbox TTL `{address}` |
| POST | `/api/restore` | Restore saved mailbox `{address, token}` |
| GET | `/api/qr?data=` | SVG QR code (save/restore) |
| **POST** | **`/api/inbound`** | **Inbound webhook — point your provider here** |
| POST | `/api/demo-mail` | Inject a sample email (remove/disable in prod) |
| GET | `/api/health` | Health + stats |

## Going to production

1. **Replace `DOMAINS`** in `src/server.js` with your real domains.
2. Point MX records at your inbound provider; set the provider's webhook to
   `POST https://yourdomain.com/api/inbound` with `x-webhook-secret: <INBOUND_SECRET>`.
3. **Swap the store for Redis** so multiple instances share state and TTLs are native:
   `store.js` methods map 1:1 to Redis (`SET key val EX ttl`, `LPUSH`, `LRANGE`).
4. **Disable/remove `/api/demo-mail`** and the "Send test email" button.
5. Put it behind HTTPS (Caddy/Nginx/your host's TLS).
6. **AdSense:** apply only once the site is live with real content. Then uncomment the
   AdSense `<script>` in `generator/layout.js` (replace `ca-pub-XXXX`), rebuild, and place
   `<ins class="adsbygoogle">` units inside the existing `.ad-zone` containers.
7. Update the `SITE` constant in `generator/layout.js` and `generator/build.js` to your real
   canonical domain, then rebuild so canonical/OG/sitemap URLs are correct.

## Notes on legality & AdSense compliance

- The site contains only original, substantive content and clearly labels all ad zones.
- Privacy Policy discloses data handling and third-party ad cookies (required for AdSense).
- The product explicitly warns against misuse (banking, fraud) in Terms, FAQ, and footer.
- Do not place ads inside the functional inbox/message area — the provided `.ad-zone`
  slots are already separated from the app UI.
