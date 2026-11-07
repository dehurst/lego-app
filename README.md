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
| LEGO data | Rebrickable API v3 (now) + Brickset (later) | Rebrickable: instant free key, themes/sets/images. Brickset adds launch dates so we can tell *announced* from *on sale* |

Decisions: username + password login (no email collected), invite code **and**
admin approval to sign up, push is the only alert channel, quiet hours
9pm–7am Eastern.

## Milestones

- [x] **M0** Project setup, health check, deploy to Vercel
- [x] **M1** PWA: manifest, icons, service worker, "Add to Home Screen" guide
- [x] **M2** Push end-to-end: "Turn on alerts" → test notification on a real iPhone
- [x] **M3** Username/password login, invite codes, admin approval, multi-device
- [x] **M4** Catalog sync (Rebrickable); browse + follow themes
- [x] **M5** Hourly job: new sets → push (with quiet hours)
- [x] **M5b** Brickset: on sale / coming / retired, prices, "now in stores" alerts
- [x] **M6** In-app alerts inbox + "alerts are off on this device" banner
- [x] **M7** Watchlist (stored; stock checks are Phase 2)
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

### 3. Database tables
In Supabase → **SQL Editor** → **New query**, paste and **Run** each file in
`supabase/migrations/`, in order. (Each is safe to re-run.)

### 4. Web Push keys
```bash
npx web-push generate-vapid-keys
```
Add to Vercel (and `.env.local`): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` (secret), `VAPID_SUBJECT` (`mailto:you@example.com`), and
`ADMIN_SECRET` (used once, as the invite code for the first admin account), then redeploy.

### Logins (M3)
1. Supabase → **Authentication → Sign In / Providers** → turn **off**
   "Allow new users to sign up". Accounts are only created by our server
   after checking an invite code, so nobody can go around the invites.
2. Open the app, tap **I have an invite code**, and use your `ADMIN_SECRET`
   as the code. That first account becomes the admin, already approved.
3. Make invite codes for everyone else from the **Admin** page.

Usernames + passwords only — no emails are collected. Behind the scenes each
username maps to a never-used address like `name@users.brickdrop.invalid`
because Supabase logins need an email-shaped name.

### 5. Rebrickable (M4)
1. Free account at https://rebrickable.com → **Settings → API → Generate new key**.
2. Add it to Vercel as `REBRICKABLE_API_KEY` (type Secret) and redeploy.
3. Admin page → **Sync catalog now** loads themes and sets (about 10 seconds).

The catalog keeps last year's sets onward. Merchandise (keychains, shoe
charms), books and promo items are filtered out by theme. Rules for what's
hidden and friendlier theme names live in `src/lib/catalog/themes.ts`.

### 6. Hourly check (M5)
1. Run `supabase/migrations/0004_notifications.sql` (see step 3).
2. Add `CRON_SECRET` to Vercel (Secret; `openssl rand -base64 32`), redeploy.
3. Open `supabase/schedule-hourly-check.sql`, replace the app URL and
   secret placeholders, and run it in the Supabase SQL Editor.
4. Admin page → **Test an alert** sends a real alert end to end.

How it works: every hour Supabase calls `/api/cron/hourly`, which syncs the
catalog, records an alert for each follower of each brand-new set (one per
person per set, ever), and sends each person a single grouped push.
9pm–7am Eastern is quiet: alerts wait and go out after 7am.

### 7. Brickset (optional: availability, prices, "now in stores" alerts)
1. Request a free key at https://brickset.com/tools/webservices/requestkey
   (approval can take days). Check it with
   `https://brickset.com/api/v3.asmx/checkKey?apiKey=YOUR-KEY`.
2. Add `BRICKSET_API_KEY` to Vercel (Secret), redeploy.
3. Run `supabase/migrations/0005_brickset_availability.sql`.
4. Admin → **Fetch from Brickset now**.

How it works: every 6 hours (Brickset limits daily calls) we fetch launch
dates, retirement dates and US prices for last year → next year into
`brickset_sets`. Every hour, the SQL function `refresh_set_availability`
recomputes each set's status from those dates (no API calls), so a set flips
to "on sale" on its launch day. A set going from *coming* to *available*
sends followers a "Now in stores" alert. Brickset failures never block
new-set alerts.

## Secrets

All secrets live in environment variables — `.env.local` (git-ignored) on your
machine and the Vercel dashboard in production. Only variables prefixed
`NEXT_PUBLIC_` are ever sent to the browser.

## Project layout

```
design/logo-original.png   The Brick Drop logo (source for all icons)
design/make-icons.py       Rebuilds every icon size: python3 design/make-icons.py
public/sw.js               Service worker: shows push notifications, handles taps
public/icon-*.png          Manifest icons (192, 512, maskable 512)
src/app/manifest.ts        Web app manifest (name, icon, standalone display)
src/app/apple-icon.png     iOS Home Screen icon (180x180)
src/app/api/health/        GET /api/health wiring check
src/components/            Install guide, device check panel, SW registration
src/lib/                   Env, Supabase admin client, device detection, push sender
src/app/api/push/          Save/remove a device subscription; send a test push
src/app/admin/             Approvals, invite codes, password resets
src/app/login, signup/     Login (in the browser) and invite-code signup (server action)
src/lib/auth.ts            Who is logged in? The one place that decides
src/proxy.ts               Keeps login sessions fresh on every request
src/lib/catalog/           LEGO data: source (Rebrickable), theme rules, sync
src/app/themes/            Browse themes, follow them, see a theme's sets
src/lib/alerts/            Hourly job: queue alerts, quiet hours, grouped messages, inbox counts
src/app/alerts/            Alerts inbox
src/app/watchlist/         Watched sets (and the watch action)
src/components/set-card.tsx  One set as shown everywhere (badge, LEGO.com link)
src/app/api/cron/hourly/   The endpoint Supabase's scheduler calls
supabase/migrations/       SQL to run in Supabase, in order
```
