# Gigzito — Full Settings Backup
**Date:** March 10, 2026

---

## 1. Admin Credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Super Admin | `admin@gigzito.com` | `Arizona22` | SUPER_ADMIN |
| Demo Provider | `alex@gigzito.com` | `password123` | PROVIDER |

**MFA note:** `admin@gigzito.com` is in the `BYPASS_EMAILS` list in `server/email.ts` — the verification code prints to the server console and displays on screen. No email is sent.

---

## 2. VPS / Production Server

| Setting | Value |
|---------|-------|
| IP | `5.78.128.185` |
| Port | `5000` |
| PM2 process | `gigzito` |
| App directory | `/opt/gigzito` |
| Env file | `/opt/gigzito/.env` |
| Domain | `gigzito.com` |
| DNS provider | SiteGround (NOT GoDaddy) |
| DNS A record `@` | `5.78.128.185` |
| DNS A record `www` | `5.78.128.185` |

### VPS Database
| Setting | Value |
|---------|-------|
| DB name | `gigzito` |
| DB user | `gigzito` |
| DB password | `postgres2626492` |

---

## 3. Replit Environment Secrets (names only — values stored in Replit Secrets)

| Secret | Purpose |
|--------|---------|
| `SESSION_SECRET` | Express session signing key |
| `DATABASE_URL` | PostgreSQL connection string (Replit managed) |
| `PGDATABASE` | DB name (Replit managed) |
| `PGHOST` | DB host (Replit managed) |
| `PGPORT` | DB port (Replit managed) |
| `PGUSER` | DB user (Replit managed) |
| `PGPASSWORD` | DB password (Replit managed) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub integration |
| `REPLIT_DOMAINS` | Runtime managed |
| `REPLIT_DEV_DOMAIN` | Runtime managed |
| `REPL_ID` | Runtime managed |

**Optional SMTP secrets** (not currently set — dev mode logs codes to console):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Optional Stripe** (billing disabled — `billingEnabled = false` in `server/config.ts`):
- `STRIPE_SECRET_KEY`

---

## 4. Application Configuration

### Billing & Live Tiers (`server/config.ts`)
```
billingEnabled = false   // No charges during beta

LIVE_TIERS:
  Tier 1 — 15 Min Slot   $10.00
  Tier 2 — 30 Min Slot   $20.00
  Tier 3 — 60 Min Slot   $25.00
```

### Business Rules
- Daily listing cap: **100 ACTIVE listings** per calendar day
- Listing fee: **$3** (simulated; Stripe not connected)
- Max video duration: **20 seconds**
- Flash Sale listings float to top of ALL feed
- GigJack cap: **2 APPROVED** per hour slot, **15-min spacing** enforced

---

## 5. Role Hierarchy

| Role | Level | Notes |
|------|-------|-------|
| VISITOR | 0 | Default on signup |
| MEMBER | 1 | |
| MARKETER | 1 | Add-only access |
| INFLUENCER | 1 | |
| PROVIDER | 1 | Can list videos |
| CORPORATE | 2 | |
| COORDINATOR | 2 | Content coordination |
| SUPERUSER | 3 | Content/GigJacks/Live Injection — no Users tab; orange badge |
| ADMIN | 3 | Content moderation + user management |
| SUPER_ADMIN | 4 | All admin + Override Control System |

---

## 6. Workflow

| Name | Command |
|------|---------|
| Start application | `npm run dev` |

---

## 7. Key Architecture Notes

- **Session auth:** `req.session?.userId` and `req.session?.role` — always use these in routes
- **Frontend user object:** `user?.user?.role` (NOT `user?.role`) from `useAuth()`
- **YouTube embeds:** Always use `youtube-nocookie.com`, never `controls=0`, always include `origin=encodeURIComponent(window.location.origin)`, skip `loop/playlist` for `/live/` URLs
- **File uploads:** multer, stored in `/uploads/`, served as static, max 5MB images only
- **VPS layout:** ALL structural layout uses INLINE STYLES on VPS
- **SMTP bypass list:** `admin@gigzito.com` — bypasses real email, code shown on screen

---

## 8. Demo / Seed Accounts

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `admin@gigzito.com` | `Arizona22` | SUPER_ADMIN | Auto-upgraded on startup |
| `alex@gigzito.com` | `password123` | PROVIDER | Primary demo provider |
| `sofia@gigzito.com` | `password123` | PROVIDER | |
| `marcus@gigzito.com` | `password123` | PROVIDER | |
| `priya@gigzito.com` | `password123` | PROVIDER | |
| `jake@gigzito.com` | `password123` | PROVIDER | |
| `nina@gigzito.com` | `password123` | PROVIDER | |

---

## 9. Database Backup

Full PostgreSQL dump saved to:
```
backups/gigzito_db_backup_20260310_044006.sql   (57 KB)
```

To restore on VPS:
```bash
psql -U gigzito -d gigzito < gigzito_db_backup_20260310_044006.sql
```

To restore on Replit (replace with your DATABASE_URL):
```bash
psql "$DATABASE_URL" < backups/gigzito_db_backup_20260310_044006.sql
```

---

## 10. Important Files Reference

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Drizzle table definitions + Zod schemas |
| `server/index.ts` | Express app + session middleware |
| `server/db.ts` | Drizzle + pg pool |
| `server/storage.ts` | DatabaseStorage — all DB queries |
| `server/routes.ts` | All API route handlers |
| `server/config.ts` | billingEnabled + LIVE_TIERS |
| `server/email.ts` | MFA email (BYPASS_EMAILS list here) |
| `client/src/components/video-card.tsx` | Main video card + YouTube error detection |
| `client/src/components/mini-live-player.tsx` | Always-visible top-right live widget |
| `client/src/components/navbar.tsx` | Fixed top-right dropdown nav |
| `client/src/pages/admin.tsx` | Full admin console |
| `client/src/App.tsx` | Route definitions |
