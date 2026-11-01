# Brick Drop 🧱

A private, invite-only PWA that sends push alerts when new LEGO sets are
announced (and again when they go on sale) in the themes you follow.

Built by a dad and son. Installed from the iPhone/iPad home screen.

## Stack (and why)

| Piece | Choice | Why |
|---|---|---|
| App | Next.js (App Router, TypeScript) on Vercel | One codebase for pages + API; free HTTPS (push requires HTTPS) |
| Database + login | Supabase (Postgres + Auth) | Real Postgres, Row Level Security, generous free tier |
| Hourly check | Supabase `pg_cron` → our API route | Vercel's free cron is once/day; pg_cron can run hourly for free |
| Alerts | Web Push with VAPID keys | Works on iOS 16.4+ when installed to the home screen |
| LEGO data | Brickset API v3 | Has launch dates and a "released" flag, so we can tell *announced* from *on sale* |

Decisions: username + password login (no email collected), invite code **and**
admin approval to sign up, push is the only alert channel, quiet hours
9pm–7am Eastern.

## Milestones

- [x] **M0** Project setup, health check, deploy to Vercel
- [ ] **M1** PWA: manifest, icons, service worker, "Add to Home Screen" guide
- [ ] **M2** Push end-to-end: "Turn on alerts" → test notification on a real iPhone
- [ ] **M3** Username/password login, invite codes, admin approval, multi-device
- [ ] **M4** Brickset sync; browse + follow themes
- [ ] **M5** Hourly job: new + now-available sets → push (with quiet hours)
- [ ] **M6** In-app alerts inbox + "alerts are off on this device" banner
- [ ] **M7** Watchlist (stored; stock checks are Phase 2)
- [ ] **M8** Admin page, error handling, privacy page

Phase 2 (designed for, not built): back-in-stock alerts for watchlisted sets,
pending a review of feasibility and LEGO.com's terms of service.

## Local setup

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Check wiring at http://localhost:3000/api/health — you want `"ok": true`.

## One-time account setup

### 1. Supabase
1. Create a free account at https://supabase.com and a **New project**
   (name: `brick-drop`, region: East US). Save the database password somewhere safe.
2. Go to **Project Settings → API** and copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**never share this one**)

### 2. Vercel
1. Sign up at https://vercel.com **with your GitHub account**.
2. **Add New → Project**, import this repo. Framework is auto-detected (Next.js).
3. Before deploying, open **Environment Variables** and add every variable
   from `.env.local`.
4. Deploy. You'll get a URL like `https://brick-drop-xxxx.vercel.app`.
5. Open `https://<your-url>/api/health` on your iPhone.

Every push to the main branch redeploys automatically; other branches get
preview URLs.

### 3. Brickset (needed in M4)
Request a free API key at https://brickset.com/tools/webservices/requestkey.
It can take a little while to arrive, so request it early.

## Secrets

All secrets live in environment variables — `.env.local` (git-ignored) on your
machine and the Vercel dashboard in production. Only variables prefixed
`NEXT_PUBLIC_` are ever sent to the browser.
