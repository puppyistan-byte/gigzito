# Gigzito

A TikTok-style vertical scrolling video directory for providers. Providers pay $3 to list a short promo video (20s max) across 11 categories. Includes Live streaming feature supporting YouTube/Twitch embeds and native video streams. Max 100 paid video listings per day.

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
- `client/src/` — React frontend (pages, components, hooks)

## Pages

- `/` — Home feed (TikTok-style vertical scroll, filter by vertical)
- `/listing/:id` — Listing detail with video embed + provider card
- `/auth` — Login / Register
- `/provider/me` — Provider dashboard (profile status, my listings, stats)
- `/provider/profile` — Edit full creator profile
- `/provider/new` — Submit a new listing (simulated $3 payment)
- `/live` — Live Now page (all active sessions with cards)
- `/live/go` — Go Live form (any authenticated provider)
- `/live/:id` — Live view (YouTube/Twitch iframe embed, direct video HTML5, or external link)
- `/admin` — Admin panel (daily stats, manage listings)

## Demo Accounts

- Provider: `alex@gigzito.com` / `password123` (and 5 other providers)
- Admin: `admin@gigzito.com` / `admin123`

## Data Model

### users
id, email, password (hashed), role (VISITOR/PROVIDER/ADMIN)

### provider_profiles
- Core: displayName, bio, avatarUrl, thumbUrl
- Identity: username, primaryCategory (MARKETING/COACHING/COURSES/MUSIC/CRYPTO), location
- Contact: contactEmail, contactPhone, contactTelegram, websiteUrl
- Social: instagramUrl, youtubeUrl, tiktokUrl

### video_listings
vertical, title, videoUrl, durationSeconds, description, tags, ctaLabel, ctaUrl, status, dropDate, pricePaidCents

## Key Components

- `ProfileCard` (`client/src/components/profile-card.tsx`) — reusable compact/full card with category badge, location, username, edit link
- `VideoCard` (`client/src/components/video-card.tsx`) — TikTok-style card with floating bottom-right avatar, Inquire/Info/Share action row
- `InquireLeadModal` (`client/src/components/inquire-lead-modal.tsx`) — lead capture form (firstName, email, phone, message) → POST /api/leads
- `VideoInfoModal` (`client/src/components/video-info-modal.tsx`) — full offer details sheet with creator contact info, quick Inquire button
- `GigJackCard` (`client/src/components/gigjack-card.tsx`) — GigJack offer card with countdown, coupon, admin action buttons

## Business Rules

1. Daily cap: 100 ACTIVE listings per calendar day
2. Listing fee: $3 (simulated; Stripe not yet connected)
3. Video duration: max 20 seconds (honor system with warning)
4. Profile completion required: displayName + bio + avatarUrl + primaryCategory + at least one contact method
5. Eleven postable verticals: INFLUENCER, MARKETING, COACHING, COURSES, PRODUCTS, FLASH_SALE, FLASH_COUPON, MUSIC_GIGS, EVENTS, CRYPTO, CORPORATE_DEALS (+ legacy MUSIC)
6. Flash Sale listings float to the top of the ALL feed
7. Frontend-only carousel keys: GIG_BLITZ (→ MUSIC_GIGS), FLASH_COUPONS (→ FLASH_COUPON), INFLUENCERS (→ INFLUENCER)

## Category Special Features

- **Flash Sale**: countdown timer (flashSaleEndsAt), red glowing card border, priority in ALL feed
- **Flash Coupon**: coupon code display (couponCode), copy-to-clipboard, green glowing border
- **Products**: price display (productPrice), stock indicator (productStock), purchase link (productPurchaseUrl)

## Category Carousel

Regular chips: All, Music Gigs, Events, Influencers, Marketing, Courses, Products, Crypto
Highlighted buttons: 🔥 Gig Blitz (red), ⚡ Flash Sale (bright red), 💰 Flash Coupons (green)

## Styling

- Pure black UI: `#000000` page background, `#0b0b0b` elevated cards
- Accent: `--gigzito-red: #ff1a1a`
- Logo: `/gigzito-logo-v3.png` in `client/public/`
