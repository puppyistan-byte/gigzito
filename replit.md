# Gigzito

A TikTok-style vertical scrolling video directory for providers. Providers pay $3 to list a short promo video (20s max) across 11 categories. Includes Live streaming, guest access control, Zito TV public page, calendar-based GigJack flash event system, MFA email verification, admin console with user management, and Super Admin Override Control System.

## Roles

| Role | Level | Notes |
|------|-------|-------|
| VISITOR | 0 | Default on signup |
| MEMBER | 1 | |
| MARKETER | 1 | |
| INFLUENCER | 1 | |
| PROVIDER | 1 | Can list videos |
| CORPORATE | 2 | |
| COORDINATOR | 2 | New — content coordination |
| ADMIN | 3 | Content moderation + user management |
| SUPER_ADMIN | 4 | All admin + Override Control System |

Seeded super admin: `admin@gigzito.com` / `Arizona22` (auto-upgraded to SUPER_ADMIN on startup)

## Production Servers

| Server | IP | Location | Role |
|--------|-----|----------|------|
| Hillsboro | 5.78.128.185 | Oregon | Primary (production DNS, primary DB) |
| Ashburn | 5.161.102.88 | Virginia | Secondary |

- App lives at `/opt/gigzito` on both servers
- DB (Hillsboro): `postgresql://gigzito:postgres2626492@localhost:5432/gigzito`
- PM2 process name: `gigzito`

### Deploy Procedure (both servers)

With a valid GitHub token (`repo` + `workflow` scopes) set on the remote, push from Replit Shell then GitHub Actions auto-deploys. If push is blocked, use the **direct SHA deploy** instead:

```bash
cd /opt/gigzito
git fetch origin
git reset --hard <COMMIT_SHA>
npm run build && pm2 restart gigzito --update-env
```

Current Replit commit SHA is always in `.git/refs/heads/main` — or ask and I'll look it up. Run the same block on both servers to keep them in sync.

## Gigness Card System (Phase A — Complete)

- **4 tables live in DB**: `gigness_cards`, `card_messages`, `gigness_card_comments`, `listing_comments`
- **`subscriptionTier`** on `users` table: enum `GZLurker | GZ2 | GZ_PLUS | GZ_PRO` (default `GZLurker`)
- **`requireGZ2` middleware**: async — fetches user from DB via `storage.getUserById`, checks `subscriptionTier !== "GZLurker"`
- **Endpoints**: `GET /api/gigness-cards`, `GET /api/gigness-cards/mine`, `GET /api/gigness-cards/qr/:uuid`, `POST /api/gigness-cards`, `POST /api/gigness-cards/:id/engage` (GZ2+), `POST /api/gigness-cards/:id/message` (GZ2+), `GET /api/gigness-cards/inbox`, `POST /api/gigness-cards/broadcast`, `GET/POST /api/gigness-cards/:id/comments`
- **Admin tier toggle**: `PATCH /api/admin/users/:id/subscription-tier` — valid tiers: `GZLurker`, `GZ2`, `GZ_PLUS`, `GZ_PRO`

## Triage System & GigCard Directory

- **Triage action** (admin Content tab): Orange triangle button per listing pulls it from the video feed and moves it to TRIAGED status
- **Triage dialog**: Admin selects a reason (pre-filled "Non-video format") with 3 quick-select presets; the reason is included in the notification
- **Auto-email notification**: On triage, the provider is automatically emailed explaining why their listing was moved (uses same SMTP infrastructure as MFA; logs to console in dev mode)
- **GigCard Directory** at `/gigcard-directory`: Public page showing all TRIAGED listings as static business-card-style ads with provider contact info, tags, and CTA button
- `listing_status` enum now includes `TRIAGED` alongside `ACTIVE | PAUSED | REMOVED | PENDING`
- Main video feed (`GET /api/listings`) remains filtered to `ACTIVE` only — TRIAGED listings are fully excluded
- TRIAGED listings can be restored to ACTIVE via the Eye icon in the admin Content tab

## Inquiry / Lead Capture Flow

- **Info button removed** — video card action row now has only Inquire (primary CTA) + Share + Heart
- **Inquire is the main CTA** — clicking it opens the `InquireLeadModal` bottom sheet
- **Phone field removed** from the inquiry form; `leads.email` is nullable in DB
- **Email collection configurable** via `collectEmail` boolean on each listing (default: true)
- **Post-inquiry reveal logic** controlled per listing:
  - `revealUrl` (default true) — show the CTA destination link after submission
  - `revealEmail` (default false) — reveal the creator's contact email
  - `revealName` (default false) — reveal the creator's first name
- **New listing form** has an "Inquiry Settings" toggle section with all four settings
- Four new boolean columns added to `video_listings`: `reveal_url`, `reveal_email`, `reveal_name`, `collect_email`

## Super Admin Override Control System

- **Override Mode toggle** on admin console (SUPER_ADMIN only): bypasses 15-min GigJack spacing and 2-per-hour cap
- **Soft-delete / restore users**: sets `deletedAt` timestamp; restorable via restore button
- **Edit user profile**: modal to edit displayName, bio, avatarUrl, contactEmail, location
- **Audit Log tab**: records all privileged actions (role changes, soft-delete, restore, override actions)
- **Extended roles**: SUPER_ADMIN can assign SUPER_ADMIN and COORDINATOR roles
- **User search/filter**: search by name/email; filter by role, status (All/Active/Disabled/Deleted)

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui (via Vite)
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL (Replit built-in) via Drizzle ORM
- **Auth:** Session-based (express-session + connect-pg-simple) + email MFA (nodemailer)
- **Email:** nodemailer — configure SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Without SMTP, codes are logged to the server console and shown in a dev banner in the UI.
- **Payments:** Simulated — Stripe can be wired in via `STRIPE_SECRET_KEY` env var

## Architecture

- `shared/schema.ts` — Drizzle table definitions + Zod schemas + API types
- `shared/routes.ts` — API route contracts (paths, input/output schemas)
- `server/index.ts` — Express app entry point with session middleware
- `server/db.ts` — Drizzle + pg pool setup
- `server/storage.ts` — DatabaseStorage class (all DB queries)
- `server/routes.ts` — Express route handlers + seed data
- `server/config.ts` — `billingEnabled` flag + `LIVE_TIERS` config
- `server/email.ts` — MFA email sending via nodemailer (dev: logs to console + UI banner)
- `client/src/` — React frontend (pages, components, hooks)

## Pages

- `/` — Home feed (TikTok-style vertical scroll, filter by vertical)
- `/listing/:id` — Listing detail with video embed + provider card
- `/auth` — Login / Register (with participation disclaimer on sign-up)
- `/zito-tv` — Public read-only broadcast view (no auth required, CTAs locked for guests)
- `/provider/me` — Provider dashboard (profile status, my listings, stats)
- `/provider/profile` — Edit full creator profile
- `/provider/new` — Submit a new listing (simulated $3 payment)
- `/live` — Live Now page (all active sessions with cards)
- `/live/go` — Go Live form (authenticated providers only)
- `/live/:id` — Live view (YouTube/Twitch iframe, direct video HTML5, or external link)
- `/buy-live` — Buy a Live Show slot (3 tiers: 15min/$10, 30min/$20, 60min/$25)
- `/admin` — Admin panel (daily stats, manage listings)

## Demo Accounts

- Provider: `alex@gigzito.com` / `password123` (and 5 other providers)
- Admin: `admin@gigzito.com` / `Arizona22`

## Data Model

### users
id, email, password (hashed), role (VISITOR/PROVIDER/ADMIN), disclaimerAccepted (boolean)

### provider_profiles
- Core: displayName, bio, avatarUrl, thumbUrl
- Identity: username, primaryCategory, location
- Contact: contactEmail, contactPhone, contactTelegram, websiteUrl
- Social: instagramUrl, youtubeUrl, tiktokUrl, webhookUrl

### video_listings
vertical, title, videoUrl, durationSeconds, description, tags, ctaLabel, ctaUrl, status, dropDate, pricePaidCents

### live_sessions
providerId, title, description, category, mode, platform, streamUrl, thumbnailUrl, viewerCount, tierMinutes, tierPriceCents, status, startedAt, endedAt

### gig_jacks
providerId, artworkUrl, offerTitle, tagline, category, ctaLink, companyUrl, description, countdownMinutes, couponCode, quantityLimit, scheduledAt, bookedDate, bookedHour, flashDurationSeconds (default 7), offerDurationMinutes (default 60), status (PENDING_REVIEW/APPROVED/DENIED), displayState (hidden/flash/siren/expired), sirenEnabled, reviewNote, botWarning, botWarningMessage, approvedAt, approvedBy, flashStartedAt, flashEndedAt, offerStartedAt, offerEndsAt, completedAt

## GigJack Flash Event System

- **Submission page** — `/gigjack/new` — 3-step flow:
  1. **Date picker** — 14-day grid showing next 14 days; week-by-week navigation with prev/next
  2. **Hour picker** — 8am–9pm grid; per-slot shows approved count (capped at 2), pending count, availability; past hours hidden for today
  3. **Offer form** — Company URL, artwork URL, offer title, description, CTA link, countdown duration, flash duration (5s/7s/10s/15s/30s/60s), offer duration (10m–24h), optional coupon + quantity limit
- **2-per-hour cap** — Max 2 APPROVED GigJacks per hour slot; 15-min spacing enforced
- **Approval flow** — Admin reviews via `/admin` GigJacks tab; status: PENDING_REVIEW → APPROVED / DENIED
- **Admin bypass** — Admin role skips daily cap + bot detection; admin-submitted GigJacks auto-APPROVED
- **Availability API** — `GET /api/gigjacks/availability?date=YYYY-MM-DD` returns per-slot status
- **Live Event Lifecycle** (auto-advancing state machine via `GET /api/gigjacks/live-state` polled every 3s):
  1. **Flash phase** — Full-screen overlay fires when scheduledAt ≤ now; counts down flashDurationSeconds; plays screen-shake animation
  2. **Collapse animation** — Overlay shrinks and flies to top-right over 0.55s
  3. **Siren phase** — Persistent 240px top-right widget with red glow pulse, thumbnail, title, brand, live HH:MM:SS countdown from offerEndsAt, Claim Offer CTA
  4. **Expired phase** — Widget fades out with "Offer Ended" message
- **Today's GigJacks Queue** — `TodaysGigJacks` component (collapsible at bottom of home feed); polls every 15s; shows all today's flash/siren/expired events chronologically with Active/Expired badges
- **Admin force-expire** — `POST /api/admin/gigjacks/:id/force-expire` instantly sets displayState=expired; button shown on flash/siren cards
- **Admin edit** — Modal now includes Flash Duration + Offer Duration selects alongside date/time/status
- **billingEnabled = false** — in `server/config.ts`; slot reservations are free during beta

## Key Components

- `VideoCard` — TikTok-style card; Inquire/CTA gated for guests via `GuestCtaModal`
- `InquireLeadModal` — lead capture form → POST /api/leads with webhook support
- `GuestCtaModal` — modal shown to visitors attempting locked actions (reason: cta/live/inquire/general)
- `MiniLivePlayer` — always-visible top-right widget; Off Air state OR embedded stream (muted by default) with mute toggle
- `BottomNav` — 5-tab bottom navigation: Feed, Live, Create Post, Zito TV, Profile
- `CategoryCarousel` — scrollable pills + "👀 All Eyes On Me" CTA button (routes to `/all-eyes-on-me`)
- `AllEyesBanner` — compact strip below carousel; polls `/api/all-eyes/active` every 20s; shows avatar, title, countdown, dismiss; only renders when a slot is live

## Access Control

- **Visitors (guest):** Can browse home feed, Zito TV, provider profiles; cannot Inquire, click CTAs, join Live events
- **Members (logged in):** Full access to all interactive features
- **Guest CTA Modal:** Shown when visitors try to interact; offers Register or Log in
- **Registration disclaimer:** "This platform does not provide medical, financial, or legal advice. All interactions are voluntary promotional communications." — must be accepted to create account

## Live Streaming

- **billingEnabled = false** in `server/config.ts` — tiers recorded but payment not charged
- **LIVE_TIERS:** 15min/$10, 30min/$20, 60min/$25
- Mini player: embedded iframe (muted autoplay) with mute/unmute button; clicking navigates to full /live/:id view
- Supports: music performances, product demos, influencer streams, coaching, corporate, flash sales, general

## Gigness Card System (Phase A + B complete)

### Subscription Tiers
| Tier | Level | Abilities |
|------|-------|-----------|
| GZLurker | 0 | Create a card, view Rolodex (can't engage) |
| GZ2 | 1 | Engage cards, send GZ-Bot-scrubbed messages |
| GZ_PLUS | 2 | Priority Rolodex placement |
| GZ_PRO | 3 | Featured VIP row (Phase C) |

- Stored in `users.subscription_tier` column (enum); loaded into session on login as `req.session.subscriptionTier`
- Admin toggle: `PATCH /api/admin/users/:id/subscription-tier` (ADMIN+ required)

### Database Tables
- `gigness_cards` — one per user; `qr_uuid` (gen_random_uuid), slogan, profilePic, gallery TEXT[], ageBracket, gender, intent, engagementCount, isPublic
- `card_messages` — fromUserId, toUserId, gignessCardId, messageText, emojiReaction, isClean (GZ-Bot flag)

### API Endpoints
| Method | Route | Auth |
|--------|-------|------|
| GET | /api/gigness-cards | Public (optional filters: ageBracket, gender, intent) |
| GET | /api/gigness-cards/mine | Auth |
| GET | /api/gigness-cards/qr/:uuid | Public |
| POST | /api/gigness-cards | Auth — upsert own card |
| POST | /api/gigness-cards/:id/engage | GZ2+ |
| POST | /api/gigness-cards/:id/message | GZ2+ + GZ-Bot scrub |
| GET | /api/gigness-cards/inbox | Auth |

### GZ-Bot Content Moderation
- Phase 1: regex naughty-word list (active now)
- Phase 2: OpenAI Moderation API auto-activates when `OPENAI_API_KEY` env var is set

### Frontend Pages
- `/geezees` — Public Rolodex with filter chips (age, gender, intent), engagement button, QR icon, tier badge
- `/card-editor` — Auth-gated editor: slogan, profile photo, 6-photo gallery, isPublic toggle, metadata pickers, live card preview, QR code display
- Both routes registered in `App.tsx`; "GeeZees Rolodex" + "GeeZee Social Cards" (styled red) added to navbar dropdown

## Business Rules

1. Daily cap: 100 ACTIVE listings per calendar day
2. Listing fee: $3 (simulated; Stripe not yet connected)
3. Video duration: max 20 seconds (honor system with warning)
4. Profile completion required: displayName + bio + avatarUrl + primaryCategory + at least one contact method
5. Thirteen postable verticals: INFLUENCER, MARKETING, COACHING, COURSES, PRODUCTS, FLASH_SALE, FLASH_COUPON, MUSIC_GIGS, EVENTS, CRYPTO, CORPORATE_DEALS, ARTISTS, BUSINESS
6. Flash Sale listings float to the top of the ALL feed

## Styling

- Pure black UI: `#000000` page background, `#0b0b0b` elevated cards
- Accent: `--gigzito-red: #ff2b2b`
- Logo: `/gigzito-logo-v3.png` in `client/public/`
