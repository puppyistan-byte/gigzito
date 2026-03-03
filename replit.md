# Gigzito

A TikTok-style vertical scrolling video directory for providers. Providers pay $3 to list a short promo video (20s max). Three verticals: Marketing, Coaching, Courses. Max 100 paid video listings per day.

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
- `/provider/me` — Provider dashboard (profile status, my listings)
- `/provider/profile` — Edit profile (required before posting)
- `/provider/new` — Submit a new listing (simulated $3 payment)
- `/admin` — Admin panel (daily stats, manage listings)

## Demo Accounts

- Provider: `alex@gigzito.com` / `password123` (and 5 other providers)
- Admin: `admin@gigzito.com` / `admin123`

## Data Model

- `users` — id, email, password (hashed), role (VISITOR/PROVIDER/ADMIN)
- `provider_profiles` — displayName, bio, avatarUrl, thumbUrl, contact info
- `video_listings` — vertical, title, videoUrl, durationSeconds, tags, status, dropDate

## Business Rules

1. Daily cap: 100 ACTIVE listings per calendar day
2. Listing fee: $3 (simulated; Stripe not yet connected)
3. Video duration: max 20 seconds (honor system with warning)
4. Profile must be complete before listing submission (displayName, bio, avatarUrl, thumbUrl, + 1 contact method)

## Stripe Integration

Stripe is not yet connected. To add real payments:
1. Set `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` env vars
2. Update `/api/listings/submit` to create a Stripe Checkout session
3. Add a `/api/stripe/webhook` handler to activate listings after payment
4. Note: Stripe integration was dismissed during initial setup; ask user to reconnect via integrations

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — Session signing secret (set in Replit secrets)
