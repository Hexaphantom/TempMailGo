# TempMailGo — Free Disposable Temporary Email (4 real providers)

An instant, no-signup temporary inbox that receives **real** emails and OTP codes,
plus a full SEO- and AdSense-ready content site (blog, About, How It Works, FAQ,
Privacy, Terms, Contact).

Mail delivery is powered by **four free public APIs**, each verified end-to-end to
receive real external OTP email:

| Provider | Domains | Auth | Notes |
|---|---|---|---|
| **[mail.tm](https://docs.mail.tm)** | its own (e.g. `@uberip.com`) | none | 8 QPS/IP, throttled |
| **[DropMail](https://dropmail.me/api/)** | `@dropmail.me`, `@10mail.org`, … | free `af_` token (auto) | GraphQL + real-time WebSocket |
| **[Mailinator](https://www.mailinator.com)** | `@mailinator.com` | none | **public** inboxes, no create step |
| **[Guerrilla Mail](https://www.guerrillamail.com/GuerrillaMailAPI.html)** | `@guerrillamailblock.com` | none | one domain from a server IP |

You do **not** need to own any domains, configure MX records, or run a mail server.
The providers own their domains and mail infrastructure; TempMailGo calls their APIs
on the user's behalf.

> **⚠ DropMail auth changed in 2026.** The old `GET /api/token` endpoint is gone and
> legacy string tokens are disabled. You now need a signed `af_…` token via
> `POST /api/token/generate` (`{"type":"af","lifetime":"1h"}`). A 1h/1d token needs
> **no captcha**; the server generates **one** token and **reuses** it across all
> sessions (regenerating too fast triggers a captcha). This is handled automatically
> in `src/dropmail.js`.

> **⚠ Mailinator inboxes are PUBLIC.** Anyone who knows the username can read the mail.
> That's fine for throwaway OTP testing — we generate long random usernames — but the
> UI already warns users never to use temp mail for anything sensitive.

> **Why only these domains?** A website can only read email for a domain it *owns*
> or has an API for. Domains like `gmail.com`, `googlemail.com`, or typo lookalikes
> (`gamil.com`, `yhoo.com`, …) belong to Google / Yahoo / unrelated third parties,
> so mail sent to them would **never** reach this app — offering them would just
> produce a permanently empty inbox. TempMailGo therefore lists only domains that
> genuinely deliver: mail.tm's live domains + Guerrilla's `@guerrillamailblock.com`.
> Both are verified end-to-end to receive real external OTP email.

---

## How the mail engine works now

```
                                        ┌─> mail.tm    REST  (real inboxes + mail)
Browser ──> TempMailGo backend ─────────┼─> DropMail   GraphQL (+ WebSocket push)
 (address + token)  (routes by token)   ├─> Mailinator public inboxes
                                        └─> Guerrilla  JSON API
```

The provider is chosen by the **domain** the user picks, and every inbox token is
**self-describing** so inbox/message polls route to the right backend with no
server-side lookup required:

| Prefix | Provider | Token payload |
|---|---|---|
| `mi:` | Mailinator | the public username |
| `d:`  | DropMail | base64url `{ sessionId, af_token }` |
| `g:`  | Guerrilla | base64url `{ sid, cookie }` |
| *(none)* | mail.tm | the raw JWT bearer token |

1. **GET /api/domains** → mail.tm `GET /domains` + a few DropMail domains +
   Mailinator + Guerrilla, merged into one dropdown.
2. **POST /api/generate** → routes by the chosen domain:
   - *mail.tm:* `POST /accounts` (random address+password) then `POST /token`.
   - *DropMail:* reuse the cached `af_` token → `introduceSession` mutation.
   - *Mailinator:* just pick a random `user…@mailinator.com` (no API call).
   - *Guerrilla:* `get_email_address` (+ optional `set_email_user`).
   The token is returned to the browser and also kept in a small in-memory cache.
3. **GET /api/inbox?address=** → routes by token prefix and maps each provider's
   message list into the **exact same** JSON shape the frontend expects.
4. **GET /api/message?address=&id=** → same routing; normalized to one message
   contract (subject/from/to/html/text/attachments + detected OTP).
5. The old `/api/inbound` webhook and the in-memory `MailStore` were **removed** —
   the providers receive and store all mail.

### Reusable standalone classes
`lib/MailinatorMail.js` and `lib/DropMail.js` are self-contained classes (browser +
Node) exposing `create()`, `checkInbox()`, `getOtp()`, `startPolling()` — and for
DropMail, `listen()` for real-time WebSocket push. They're independent of the Express
app so you can drop them into any project.

The OTP-highlighting, copy-to-clipboard, countdown timer, and QR/save modal all
work unchanged — only the data source behind them changed. `public/js/app.js` was
**not** modified for the inbox data flow.

### The "Send test email" button was removed
With a real API, we can't inject fake mail into a real mail.tm inbox, so the demo
button no longer makes sense and was removed. To test a live inbox, generate an
address and send it a real email from any account (or use a site's "verify your
email" flow).

---

## ⚠️ Important things to know about relying on these free providers

**Do you need an API key or signup?**
No signup for any of the four. mail.tm, Mailinator, and Guerrilla need no auth at
all. DropMail needs a free `af_` token that is generated automatically (no signup,
no captcha for 1h/1d lifetimes) and reused across sessions.

**A note on Guerrilla Mail domains:** from a datacenter/server IP (like Render's),
Guerrilla only serves the `@guerrillamailblock.com` domain — requests for
`sharklasers.com` / `grr.la` / etc. are ignored by its anti-abuse policy. That is
why the dropdown advertises the domain Guerrilla actually gives us. Custom
usernames on that domain are supported.

**A note on Mailinator rate limits:** the free public API rate-limits rapid
requests from a shared IP and will answer with an HTML page instead of JSON. The
client throttles calls (~1.2s spacing) and treats a throttled response as "no new
mail this poll," so it self-heals. Recommended client poll interval: ~3s.

**A note on DropMail tokens:** generating `af_` tokens too rapidly from one IP
returns HTTP 402 `captcha_required`. The server sidesteps this by generating **one**
token per lifetime window and reusing it for every session. If you deploy behind an
IP that DropMail throttles, set `DROPMAIL_LIFETIME=1d` to regenerate less often, or
pre-set a token — the DropMail domains simply drop out of the dropdown (the app
keeps working on the other providers) until a token is available.

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
No. The design is **stateless**: the provider token (mail.tm JWT, or Guerrilla
`sid` packed into a `g:` token) is the source of truth and is returned to the
browser (stored in `localStorage`, embedded in the save/QR restore link, and sent
back on every poll via the `x-mail-token` header). The server keeps a small
**in-memory** cache purely for the countdown timer; if the server restarts or you
run multiple instances, existing users keep working as long as their token is
valid — **verified**: after a full server restart with an empty cache, a mail.tm
inbox still returned its messages from the token alone. (Guerrilla `sid` sessions
are shorter-lived on their side, so a very old Guerrilla tab may need a new
address — mail.tm tokens are long-lived JWTs.) If you ever want durable sessions,
swap the in-memory `sessions` Map in `server.js` for Redis — but it is not required.

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
│  ├─ server.js      # Express app: static hosting + REST API (multi-provider router)
│  ├─ mailtm.js      # throttled mail.tm API client (native fetch, 8 QPS-safe)
│  ├─ guerrilla.js   # Guerrilla Mail API client (native fetch, stateless g: token)
│  ├─ mailinator.js  # Mailinator public-inbox client (throttled, HTML-tolerant)
│  ├─ dropmail.js    # DropMail GraphQL client (auto af_ token, cached + reused)
│  └─ store.js       # stateless helpers only (HTML strip + OTP detection)
├─ lib/              # standalone, framework-free classes (browser + Node)
│  ├─ MailinatorMail.js  # create/checkInbox/getOtp/startPolling
│  └─ DropMail.js        # create/checkInbox/getOtp/listen (WebSocket)
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
