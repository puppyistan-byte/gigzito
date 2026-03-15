# Gigzito

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