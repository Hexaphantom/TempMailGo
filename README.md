# TempMailGo — Free Disposable Temporary Email (powered by mail.tm)

An instant, no-signup temporary inbox that receives **real** emails and OTP codes,
plus a full SEO- and AdSense-ready content site (blog, About, How It Works, FAQ,
Privacy, Terms, Contact).

Mail delivery is powered by the free **[mail.tm](https://docs.mail.tm) public API** —
so you do **not** need to own any domains, configure MX records, or run a mail
server. mail.tm owns the domains and the mail infrastructure; TempMailGo calls
their REST API on the user's behalf.

---

## How the mail engine works now

```
Browser ──> TempMailGo backend (Express) ──> mail.tm public API
  (address only)      (holds bearer token)     (real inboxes + real mail)
```

1. **GET /api/domains** → proxies mail.tm `GET /domains` (the dropdown shows
   whatever domains mail.tm currently has active).
2. **POST /api/generate** → creates a real mail.tm account (`POST /accounts` with
   a random address + server-generated random password), then gets a bearer token
   (`POST /token`). The token is cached server-side (keyed by address) and also
   returned to the browser.
3. **GET /api/inbox?address=** → calls mail.tm `GET /messages` with the stored
   token and returns the list in the exact JSON shape the frontend already expects.
4. **GET /api/message?address=&id=** → calls mail.tm `GET /messages/{id}` for the
   full HTML/text/attachments.
5. The old `/api/inbound` webhook and the in-memory `MailStore` were **removed** —
   mail.tm receives and stores all mail.

The OTP-highlighting, copy-to-clipboard, countdown timer, and QR/save modal all
work unchanged — only the data source behind them changed. `public/js/app.js` was
**not** modified for the inbox data flow.

### The "Send test email" button was removed
With a real API, we can't inject fake mail into a real mail.tm inbox, so the demo
button no longer makes sense and was removed. To test a live inbox, generate an
address and send it a real email from any account (or use a site's "verify your
email" flow).

---

## ⚠️ Important things to know about relying on mail.tm

**Do you need an API key or signup?**
No. mail.tm is completely free, anonymous, no API key, no signup, no paid tiers.

**Rate limits / reliability for a public site with real traffic:**
- mail.tm enforces **8 queries per second (QPS) per IP address**. Because your
  backend calls mail.tm from **one server IP**, that 8 QPS is **shared across all
  your visitors**. `src/mailtm.js` funnels every outgoing call through a single
  global throttle (spacing ~160 ms ≈ 6 req/s, under the cap) and honors `429
  Retry-After` with backoff.
- **This is the main scaling limit.** Each user polling every 5s uses ~0.2 req/s,
  so a handful of concurrent users is fine, but hundreds of simultaneous pollers
  will exceed 8 QPS and start seeing delays/429s. Mitigations if you grow:
  increase the client poll interval, add short-TTL caching of inbox results, or
  (best) run behind multiple egress IPs / a proxy pool. mail.tm is a free
  community service with **no uptime SLA**, so treat availability as best-effort.
- mail.tm **Terms of Use**: no illegal activity, **no reselling** it as a paid
  product, **no proxying/mirroring** the API under another domain, and
  **attribution is required** — we link to mail.tm in the footer. Keep that link.

**Session persistence — do you need a database?**
No. The design is **stateless**: the mail.tm bearer token is the source of truth
and is returned to the browser (stored in `localStorage` and embedded in the
save/QR restore link). The server keeps a small **in-memory** token cache purely
for convenience; if the server restarts or you run multiple instances, existing
users keep working as long as their token is valid. When a user's session ends
they simply stop polling; mail.tm expires idle accounts on its own. If you ever
want durable sessions across restarts, swap the in-memory `sessions` Map in
`server.js` for Redis — but it is not required.

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
docker run -p 3000:3000 tempmailgo
```

### Deploy on Render
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Render injects `PORT` automatically; `server.js` already reads `process.env.PORT`.
- No environment variables are required. (Optional: `MAILTM_MIN_SPACING_MS` to tune
  the throttle, `MAILTM_BASE` to point at a mirror.)

A `render.yaml` blueprint is included for one-click Blueprint deploys.

## Project structure

```
tempmailgo/
├─ src/
│  ├─ server.js      # Express app: static hosting + REST API (mail.tm-backed)
│  ├─ mailtm.js      # throttled mail.tm API client (native fetch, 8 QPS-safe)
│  └─ store.js       # stateless helpers only (HTML strip + OTP detection)
├─ generator/
│  ├─ layout.js      # shared <head>/header/footer + SEO meta
│  ├─ blog-data.js   # blog article content
│  └─ build.js       # generates every static page + sitemap + robots
├─ public/           # generated site + assets + css/js (served statically)
│  ├─ css/style.css  ├─ js/app.js (inbox app)  ├─ js/common.js (theme/nav)
│  └─ assets/ , blog/img/
├─ Dockerfile , render.yaml , .env.example , package.json
```

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/domains` | Active domains from mail.tm |
| POST | `/api/generate` | Create a mail.tm inbox `{domain?, username?}` → `{address, token, ...}` |
| GET | `/api/inbox?address=` | Poll inbox (uses cached token) |
| GET | `/api/message?address=&id=` | Full message |
| DELETE | `/api/message?id=` | Delete a message (best-effort) |
| POST | `/api/extend` | Push the soft UI expiry forward |
| POST | `/api/restore` | Re-accept a saved `{address, token}` |
| GET | `/api/qr?data=` | SVG QR code (save/restore) |
| GET | `/api/health` | Health + provider + domain count |

## Notes on legality & AdSense compliance

- Only original, substantive content; all ad zones are clearly labeled and separated
  from the functional inbox.
- Privacy Policy discloses data handling and third-party ad cookies (required for AdSense).
- Terms/FAQ warn against misuse (banking, fraud).
- mail.tm attribution link is in the footer per their Terms — do not remove it.
