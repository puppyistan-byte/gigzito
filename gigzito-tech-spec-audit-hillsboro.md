# Gigzito — Tech Spec Audit for Hillsboro VPS Deployment
**Prepared for:** Jim (Hillsboro — 5.78.128.185)
**Date:** March 15, 2026
**Scope:** Audience Broadcast + Geo Campaign Manager + Admin Panel + Auth Bug Fixes

---

## 1. OVERVIEW OF CHANGES

This update adds two new provider-facing systems (Audience Broadcast and Preemptive Marketing Geo Campaigns), exposes a new admin panel tab for geo campaign oversight, and fixes two React/auth bugs that were causing the admin console to fail on direct URL navigation.

---

## 2. DATABASE CHANGES — ACTION REQUIRED ON VPS

Run the following SQL block against the Hillsboro Postgres database **once** after deploying the new code. It is fully idempotent (safe to re-run).

**Connection string (Hillsboro):**
```
psql postgresql://gigzito:postgres2626492@localhost:5432/gigzito
```

**SQL to execute:**

```sql
-- Step 1: Create geo_campaign_status enum (safe: ignores if already exists)
DO $$ BEGIN
  CREATE TYPE geo_campaign_status AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Audience broadcasts log table
CREATE TABLE IF NOT EXISTS audience_broadcasts (
  id                SERIAL PRIMARY KEY,
  provider_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject           TEXT NOT NULL,
  body              TEXT NOT NULL,
  recipient_count   INTEGER NOT NULL DEFAULT 0,
  sent_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 3: Geo target campaigns table
CREATE TABLE IF NOT EXISTS geo_target_campaigns (
  id                SERIAL PRIMARY KEY,
  provider_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  offer             TEXT NOT NULL,
  radius_miles      INTEGER NOT NULL DEFAULT 10,
  city              TEXT,
  state             TEXT,
  country           TEXT NOT NULL DEFAULT 'US',
  lat               TEXT,
  lng               TEXT,
  image_url         TEXT,
  status            geo_campaign_status NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Verify after running:**
```sql
\dt audience_broadcasts
\dt geo_target_campaigns
\dT geo_campaign_status
```

---

## 3. SCHEMA CHANGES (shared/schema.ts)

### 3a. New Enum
```
geo_campaign_status: ACTIVE | PAUSED | ENDED
```

### 3b. New Table: `audience_broadcasts`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | auto-increment |
| provider_user_id | integer FK → users.id | CASCADE delete |
| subject | text | email subject |
| body | text | email body |
| recipient_count | integer | snapshot of subscribers at send time |
| sent_at | timestamp | defaults to NOW() |

### 3c. New Table: `geo_target_campaigns`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | auto-increment |
| provider_user_id | integer FK → users.id | CASCADE delete |
| title | text | campaign name |
| offer | text | promo/offer text |
| radius_miles | integer | default 10 |
| city | text | nullable |
| state | text | nullable |
| country | text | default 'US' |
| lat | text | nullable decimal string |
| lng | text | nullable decimal string |
| image_url | text | nullable |
| status | geo_campaign_status enum | ACTIVE / PAUSED / ENDED |
| created_at | timestamp | auto |
| updated_at | timestamp | auto |

### 3d. New TypeScript Exports
```typescript
export type AudienceBroadcast = typeof audienceBroadcasts.$inferSelect;
export type InsertAudienceBroadcast = typeof audienceBroadcasts.$inferInsert;
export type GeoTargetCampaign = typeof geoTargetCampaigns.$inferSelect;
export type InsertGeoTargetCampaign = typeof geoTargetCampaigns.$inferInsert;
```

---

## 4. STORAGE LAYER CHANGES (server/storage.ts)

### New IStorage Interface Methods

```typescript
// Audience Broadcast
createAudienceBroadcast(data: {
  providerUserId: number;
  subject: string;
  body: string;
  recipientCount: number;
}): Promise<AudienceBroadcast>;

getAudienceBroadcasts(providerUserId: number): Promise<AudienceBroadcast[]>;

// Geo Target Campaigns
createGeoTargetCampaign(data: {
  providerUserId: number;
  title: string;
  offer: string;
  radiusMiles: number;
  city?: string | null;
  state?: string | null;
  country: string;
  lat?: string | null;
  lng?: string | null;
  imageUrl?: string | null;
}): Promise<GeoTargetCampaign>;

getGeoTargetCampaignsByProvider(providerUserId: number): Promise<GeoTargetCampaign[]>;

updateGeoTargetCampaignStatus(
  id: number,
  providerUserId: number,
  status: "ACTIVE" | "PAUSED" | "ENDED"
): Promise<GeoTargetCampaign>;

// Admin: all campaigns across all providers
getAllGeoTargetCampaigns(): Promise<GeoTargetCampaign[]>;
```

---

## 5. NEW API ROUTES (server/routes.ts)

### Audience Broadcast Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/my-audience/broadcast` | session required | Send email to all audience subscribers; stores broadcast record |
| GET | `/api/my-audience/broadcasts` | session required | Returns this provider's broadcast history |

**POST `/api/my-audience/broadcast` request body:**
```json
{ "subject": "string (required)", "body": "string (required)" }
```

**POST response:**
```json
{ "success": true, "recipientCount": 12 }
```

---

### Geo Campaign Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/geo-campaigns` | session (GZ2+) | Create a new geo campaign |
| GET | `/api/geo-campaigns` | session required | List caller's own campaigns |
| PATCH | `/api/geo-campaigns/:id/status` | session required | Update status (ACTIVE/PAUSED/ENDED) |
| GET | `/api/admin/geo-campaigns` | admin required | All campaigns across all providers |

**POST `/api/geo-campaigns` request body:**
```json
{
  "title": "string (required)",
  "offer": "string (required)",
  "radiusMiles": 25,
  "city": "Portland",
  "state": "OR",
  "country": "US",
  "lat": "45.5231",
  "lng": "-122.6765",
  "imageUrl": "https://..."
}
```

**PATCH `/api/geo-campaigns/:id/status` request body:**
```json
{ "status": "PAUSED" }
```

---

## 6. EMAIL LAYER (server/email.ts)

### New Function: `sendAudienceBroadcast`

```typescript
sendAudienceBroadcast(opts: {
  to: string;       // subscriber email
  from: string;     // provider display name
  subject: string;
  body: string;
}): Promise<void>
```

**Behavior in current environment:**
- In dev mode (no SMTP configured): logs to console only — no emails sent
- In production: requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` environment variables to be set on the VPS for live email delivery

**To activate email on Hillsboro VPS**, add these to the server environment:
```
SMTP_HOST=<your-smtp-host>
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
```

---

## 7. FRONTEND CHANGES

### 7a. Provider Dashboard (client/src/pages/provider-dashboard.tsx)

**Audience Broadcast section:**
- "Broadcast" button appears in the "Your Audience" section header (only visible when `audienceData.count > 0`)
- Opens a modal overlay with Subject + Message textareas
- On submit: calls `POST /api/my-audience/broadcast`, shows toast with recipient count
- Past broadcasts list rendered below audience members (date, subject, N recipients)

**Geo Campaigns section:**
- New section below Audience in the provider dashboard
- Campaign creation form: title, offer text, radius (miles), city, state, country, optional image URL
- Campaign cards display status badge (ACTIVE=green / PAUSED=yellow / ENDED=gray)
- Per-card controls: Activate / Pause / End buttons via `PATCH /api/geo-campaigns/:id/status`
- Empty state shown when provider has no campaigns yet

### 7b. Admin Console (client/src/pages/admin.tsx)

- New `"geo"` tab added to `AdminTab` type union
- New `MapPin` icon imported from `lucide-react`
- New `useQuery` for `/api/admin/geo-campaigns` (enabled only when geo tab is active)
- New **"Geo Campaigns"** tab button added after the "Ads" tab in the tab bar
- Tab content (`data-testid="section-admin-geo"`):
  - Shows count of all campaigns in the platform
  - Loading state while fetching
  - Empty state: "No geo campaigns yet."
  - Campaign cards showing: title, status badge, offer text, location, radius, provider ID, created date, optional image thumbnail

---

## 8. BUG FIXES

### 8a. React Hooks Violation in Admin Console
**File:** `client/src/pages/admin.tsx`

**Root cause:** The admin page had a conditional `return null` at line ~270 (inside an `if (shouldRedirect)` block) that executed *before* more than 30 `useQuery` and `useMutation` hooks further down the component. React requires hooks to always be called in the same order on every render — an early return before hooks violates this rule and causes a "Rendered fewer hooks than expected" crash.

**Fix:**
- Removed the in-render `return null`
- Replaced with `useEffect(() => { if (shouldRedirect) navigate("/"); }, [shouldRedirect])`
- Added `useEffect` import to the file
- Added a post-hooks guard block (`if (authLoading || authFetching || shouldRedirect) return <LoadingScreen />`) that fires only after all hooks have been called unconditionally

### 8b. Auth Race Condition (Post-Login Redirect)
**Files:** `client/src/lib/auth.tsx`, `client/src/pages/admin.tsx`

**Root cause:** TanStack Query's `isLoading` is only `true` during the *initial* fetch (when no cached data exists). After a user logs in, the auth query fires a *background refetch* — during which `isLoading = false` and the stale (pre-login) cached value of `null` is returned. The admin page saw `authLoading = false` + `user = null` → set `shouldRedirect = true` → navigated away before the fresh auth response arrived.

**Fix:**
- Added `isFetching: boolean` to the `AuthContextType` interface
- Exposed `isFetching` from the `useQuery` call inside `AuthProvider`
- The admin page now reads `isFetching: authFetching` from `useAuth()`
- `shouldRedirect` is now: `!authLoading && !authFetching && !isAdmin`
- Loading guard is: `if (authLoading || authFetching || shouldRedirect)`

This ensures the admin page waits for both the initial load *and* any background refetch to settle before deciding whether to redirect.

---

## 9. FILE CHANGE SUMMARY

| File | Change Type | Summary |
|---|---|---|
| `shared/schema.ts` | Added | `geo_campaign_status` enum, `audienceBroadcasts` table, `geoTargetCampaigns` table, 4 new types |
| `server/storage.ts` | Added | 5 new IStorage interface methods + implementations |
| `server/routes.ts` | Added | 5 new API routes (broadcast ×2, geo ×3 provider + 1 admin) |
| `server/email.ts` | Added | `sendAudienceBroadcast` function |
| `client/src/lib/auth.tsx` | Modified | Exposed `isFetching` in context type and provider |
| `client/src/pages/admin.tsx` | Modified | Geo Campaigns tab; hooks bug fix; auth race fix; `useEffect` import; `MapPin` icon |
| `client/src/pages/provider-dashboard.tsx` | Modified | Audience Broadcast modal + history; Geo Campaigns section |

---

## 10. DEPLOYMENT CHECKLIST FOR HILLSBORO

- [ ] Pull latest code from GitHub to `/var/www/gigzito` (or equivalent)
- [ ] Run `npm install` (no new npm packages; all deps already present)
- [ ] Run `npm run build` to compile frontend
- [ ] Execute the SQL block from Section 2 against `gigzito` database
- [ ] Restart the Node.js process (`pm2 restart gigzito` or equivalent)
- [ ] Verify `/api/admin/geo-campaigns` returns `[]` (empty array, not 404)
- [ ] Verify `/api/geo-campaigns` returns `[]` for an authenticated provider
- [ ] Optional: set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` to enable live email broadcasts
- [ ] Confirm admin console loads at `/admin` without React errors

---

## 11. NO-CHANGE ITEMS

The following were **not** modified and require no action:

- Existing auth/session logic (beyond `isFetching` exposure)
- Existing inbox (GeeZees / Comments / Inquiries) — unchanged
- GigJack flash event system — unchanged
- Sponsor ad rail — unchanged (`gigzito-sponsor-zone` class preserved)
- Drizzle config, Vite config, package.json — unchanged
- Ashburn VPS (5.161.102.88) — same SQL applies if it runs its own DB instance

---

*Generated from commit `405b9dff` — March 15, 2026*
