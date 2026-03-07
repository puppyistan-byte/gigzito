# Gigzito

A TikTok-style vertical scrolling video directory for providers. Providers pay $3 to list a short promo video (20s max) across 11 categories. Includes Live streaming, guest access control, Zito TV public page, and calendar-based GigJack flash event system.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui (via Vite)
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL (Replit built-in) via Drizzle ORM
- **Auth:** Session-based (express-session + connect-pg-simple)
- **Payments:** Simulated — Stripe can be wired in via `STRIPE_SECRET_KEY` env var

## Architecture

- `shared/schema.ts` — Drizzle table definitions + Zod schemas + API types
- `shared/routes.ts` — API route contracts (paths, input/output schemas)
- `server/index.ts` — Express app entry point with session middleware
- `server/db.ts` — Drizzle + pg pool setup
- `server/storage.ts` — DatabaseStorage class (all DB queries)
- `server/routes.ts` — Express route handlers + seed data
- `server/config.ts` — `billingEnabled` flag + `LIVE_TIERS` config
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
- Admin: `admin@gigzito.com` / `admin123`

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
providerId, artworkUrl, offerTitle, tagline, category, ctaLink, scheduledAt (timestamp), flashDurationSeconds (5–10, default 7), status (PENDING_REVIEW/APPROVED/REJECTED/NEEDS_IMPROVEMENT), reviewNote, botWarning

## GigJack Flash Event System

- **GigJack Center** — Section inside `/provider/me` creator dashboard (not a separate page)
- **Submission form** — Artwork URL, offer title, tagline, category, offer URL, flash duration (5–10s), and calendar slot picker (hourly slots, 8am–9pm, 7 days ahead)
- **Slot system** — Platform-wide; one GigJack fires at a time; slots are hourly; booked by any PENDING_REVIEW or APPROVED GigJack
- **Approval flow** — Admin reviews via `/admin` panel; status: PENDING_REVIEW → APPROVED / REJECTED
- **Flash overlay** — `GigJackFlashOverlay` component on home feed polls `GET /api/gigjacks/active` every 5s; when an APPROVED GigJack fires (scheduledAt within last 10s), shows full-screen card with screen-shake animation, "GIG JACK" badge, artwork, offer title, tagline, and clickable CTA link; auto-dismisses after `flashDurationSeconds`
- **billingEnabled = false** — in `server/config.ts`; slot reservations are free during beta

## Key Components

- `VideoCard` — TikTok-style card; Inquire/CTA gated for guests via `GuestCtaModal`
- `InquireLeadModal` — lead capture form → POST /api/leads with webhook support
- `GuestCtaModal` — modal shown to visitors attempting locked actions (reason: cta/live/inquire/general)
- `MiniLivePlayer` — always-visible top-right widget; Off Air state OR embedded stream (muted by default) with mute toggle
- `BottomNav` — 5-tab bottom navigation: Feed, Live, Create Post, Zito TV, Profile
- `CategoryCarousel` — scrollable pills + "📡 Buy Live Show" CTA button

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

## Business Rules

1. Daily cap: 100 ACTIVE listings per calendar day
2. Listing fee: $3 (simulated; Stripe not yet connected)
3. Video duration: max 20 seconds (honor system with warning)
4. Profile completion required: displayName + bio + avatarUrl + primaryCategory + at least one contact method
5. Eleven postable verticals: INFLUENCER, MARKETING, COACHING, COURSES, PRODUCTS, FLASH_SALE, FLASH_COUPON, MUSIC_GIGS, EVENTS, CRYPTO, CORPORATE_DEALS
6. Flash Sale listings float to the top of the ALL feed

## Styling

- Pure black UI: `#000000` page background, `#0b0b0b` elevated cards
- Accent: `--gigzito-red: #ff2b2b`
- Logo: `/gigzito-logo-v3.png` in `client/public/`
