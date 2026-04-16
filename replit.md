# Gigzito

## VPS Migration SQL (run in `psql gigzito` before next deploy)
```sql
-- Kanban strategic upgrades (new session):
ALTER TABLE group_kanban_cards ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE group_kanban_cards ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE group_kanban_cards ADD COLUMN IF NOT EXISTS assigned_to integer;
ALTER TABLE group_kanban_cards ADD COLUMN IF NOT EXISTS impact_level text;
ALTER TABLE group_kanban_cards ADD COLUMN IF NOT EXISTS effort_level text;
CREATE TABLE IF NOT EXISTS group_retrospectives (
  id serial PRIMARY KEY,
  group_id integer NOT NULL,
  user_id integer NOT NULL,
  display_name text,
  avatar_url text,
  win text NOT NULL,
  roadblock text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Group wallet goal fields (prior session):
ALTER TABLE group_wallets ADD COLUMN IF NOT EXISTS goal_amount real;
ALTER TABLE group_wallets ADD COLUMN IF NOT EXISTS goal_currency text;
ALTER TABLE group_wallets ADD COLUMN IF NOT EXISTS goal_label text;
ALTER TABLE group_wallet_contributions ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE group_wallet_contributions ADD COLUMN IF NOT EXISTS avatar_url text;
-- GZ Music (prior session):
ALTER TABLE video_listings ADD COLUMN IF NOT EXISTS bg_music_track_id INTEGER REFERENCES gz_music_tracks(id) ON DELETE SET NULL;
ALTER TABLE video_listings ADD COLUMN IF NOT EXISTS bg_music_volume INTEGER NOT NULL DEFAULT 70;
ALTER TABLE gz_music_tracks ADD COLUMN IF NOT EXISTS shared_to_library BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS gz_music_comments (id SERIAL PRIMARY KEY, track_id INTEGER NOT NULL REFERENCES gz_music_tracks(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
ALTER TABLE gz_music_tracks ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0;
-- GZ Bands / Band Clubhouse (current session):
ALTER TABLE gz_music_tracks ADD COLUMN IF NOT EXISTS band_id INTEGER;
CREATE TABLE IF NOT EXISTS gz_bands (id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, bio TEXT NOT NULL DEFAULT '', genre TEXT NOT NULL DEFAULT '', avatar_url TEXT, banner_url TEXT, city TEXT, state TEXT, website_url TEXT, instagram_url TEXT, tiktok_url TEXT, youtube_url TEXT, live_stream_url TEXT, is_live BOOLEAN NOT NULL DEFAULT FALSE, created_by INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS gz_band_members (id SERIAL PRIMARY KEY, band_id INTEGER NOT NULL REFERENCES gz_bands(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'member', instrument TEXT, joined_at TIMESTAMP DEFAULT NOW() NOT NULL, UNIQUE(band_id, user_id));
CREATE TABLE IF NOT EXISTS gz_band_wall_posts (id SERIAL PRIMARY KEY, band_id INTEGER NOT NULL REFERENCES gz_bands(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, content TEXT NOT NULL, image_url TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS gz_band_wall_comments (id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES gz_band_wall_posts(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS gz_band_events (id SERIAL PRIMARY KEY, band_id INTEGER NOT NULL REFERENCES gz_bands(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', venue TEXT, city TEXT, start_at TIMESTAMP NOT NULL, end_at TIMESTAMP, ticket_url TEXT, type TEXT NOT NULL DEFAULT 'show', created_by INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS gz_band_photos (id SERIAL PRIMARY KEY, band_id INTEGER NOT NULL REFERENCES gz_bands(id) ON DELETE CASCADE, url TEXT NOT NULL, caption TEXT, uploaded_by INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS gz_band_tv_shows (id SERIAL PRIMARY KEY, band_id INTEGER NOT NULL REFERENCES gz_bands(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', stream_url TEXT, thumbnail_url TEXT, type TEXT NOT NULL DEFAULT 'archived', scheduled_at TIMESTAMP, duration_seconds INTEGER, view_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
-- GZFlash missing columns fix:
ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'countdown';
ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS coupon_expiry_hours INTEGER NOT NULL DEFAULT 48;
ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS admin_note TEXT;
```

## Overview
Gigzito is a TikTok-style vertical scrolling video directory designed for providers to showcase their services. It enables providers to list short promotional videos (up to 20 seconds) across 11 distinct categories for a $3 fee. The platform aims to be a comprehensive ecosystem for service providers, offering features such as live streaming, a guest access control system, a public Zito TV page, and a dynamic GigJack flash event system. It includes robust administrative tools like an admin console with user management, MFA email verification, and a Super Admin Override Control System for enhanced platform governance.

The business vision is to create a vibrant marketplace where providers can easily reach their target audience through engaging video content and interactive features, fostering a dynamic community and facilitating direct engagement between providers and users.

## User Preferences
I prefer the agent to be proactive in identifying and implementing solutions, especially regarding the GigJack Flash Event System and the Gigness Card System, ensuring that all specified functionalities and business rules are met.
I want iterative development, with clear communication on changes and potential impacts.
Do not make changes to the folder `node_modules`.
I prefer detailed explanations of complex architectural decisions or significant code changes.
I expect the agent to use the provided `replit.md` as the primary source of truth for all project requirements and configurations.

## System Architecture

### UI/UX Decisions
The platform features a pure black UI (`#000000` page background, `#0b0b0b` elevated cards) with `--gigzito-red: #ff2b2b` as the accent color. The logo is located at `/gigzito-logo-v3.png`. The main feed utilizes a TikTok-style vertical scroll.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, Tailwind CSS, and shadcn/ui via Vite.
- **Backend:** Powered by Express.js (Node.js).
- **Database:** PostgreSQL, accessed via Drizzle ORM.
- **Authentication:** Session-based using `express-session` and `connect-pg-simple`, with email-based Multi-Factor Authentication (MFA) via Nodemailer.
- **Email:** Nodemailer handles email services; configurable via SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). In development, MFA codes are logged to the console and displayed in a UI banner.
- **Payments:** Currently simulated; Stripe integration is planned and can be enabled via `STRIPE_SECRET_KEY`.

### Feature Specifications
- **Roles & Access Control:** A multi-level role system (VISITOR, MEMBER, MARKETER, INFLUENCER, PROVIDER, CORPORATE, COORDINATOR, ADMIN, SUPER_ADMIN) governs access. Guest users have limited browsing capabilities, while logged-in members have full access. A `GuestCtaModal` prompts visitors for registration/login on interactive actions.
- **Gigness Card System:** A social networking feature with distinct subscription tiers (GZLurker, GZ2, GZ_PLUS, GZ_PRO) offering varying engagement capabilities. Includes user-generated cards, messaging with GZ-Bot moderation, and a public "Rolodex" directory.
- **Video Card Counters:** Heart/like count is always displayed (shows 0 when no likes). Comment count badge is displayed under the comment bubble on every video card, sourced via a single batch subquery in `enrichListings()`.
- **Phone Privacy:** `showPhone` boolean column (default `false`) on `provider_profiles`. Phone number is hidden everywhere (video-info-modal, provider-public, gigcard-directory, listing-detail) unless the provider explicitly opts in from their profile settings page, which shows a prominent warning before the checkbox.
- **Triage System & GigCard Directory:** Allows admins to remove inappropriate listings from the main feed into a "TRIAGED" status, making them visible in a public `gigcard-directory` as static business-card-style ads. Providers are notified via email upon triage.
- **Inquiry / Lead Capture Flow:** Redesigned video card action row with "Inquire" as the primary CTA, leading to a `InquireLeadModal`. Configurable options for revealing provider's URL, email, or name post-inquiry.
- **Super Admin Override Control System:** Grants SUPER_ADMINs capabilities like bypassing GigJack event caps, soft-deleting/restoring users, editing user profiles, and accessing an audit log of privileged actions.
- **GigJack Flash Event System:** A calendar-based system for providers to schedule flash events. Features a 3-step submission flow, 2-per-hour slot cap with 15-min spacing, admin approval workflow, and a dynamic "Live Event Lifecycle" with flash, siren, and expired phases.
- **Live Streaming:** Supports various live content types with tiered slot durations and pricing (currently `billingEnabled = false` for beta). Features a `MiniLivePlayer` and dedicated live viewing pages.
- **Video Listings:** Max 20-second videos, a $3 listing fee (simulated), 13 vertical categories, and specific rules for profile completion. Flash Sale listings float to the top of the ALL feed.

### System Design Choices
- **Code Structure:**
    - `shared/schema.ts`: Drizzle table definitions, Zod schemas, API types.
    - `shared/routes.ts`: API route contracts.
    - `server/index.ts`: Express app entry point.
    - `server/db.ts`: Drizzle and PostgreSQL pool setup.
    - `server/storage.ts`: `DatabaseStorage` class for all DB queries.
    - `server/routes.ts`: Express route handlers.
    - `server/config.ts`: Configuration settings like `billingEnabled`.
    - `server/email.ts`: Nodemailer integration.
    - `client/src/`: React frontend components, pages, and hooks.
- **Database Schema Highlights:** `users`, `provider_profiles`, `video_listings`, `live_sessions`, `gig_jacks`, `gigness_cards`, `card_messages`, `ad_inquiries`, `sponsor_ads`.

## External Dependencies
- **PostgreSQL:** Primary database.
- **Nodemailer:** For email sending, including MFA verification.
- **Stripe:** Planned for payment processing (`STRIPE_SECRET_KEY` env var for configuration).
- **OpenAI Moderation API:** Optional integration for enhanced content moderation in the Gigness Card System, activated by `OPENAI_API_KEY` env var.