# Gigzito — Web Developer Summary
**Updated: April 23, 2026**

---

## 1. Project Overview

Gigzito is a full-stack social commerce platform styled as a TikTok-style vertical scrolling video directory. Providers list short promotional videos across 11 service categories. The platform is built on a unified Express + React codebase, deployed to a VPS behind PM2.

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui, TanStack Query v5, Wouter |
| Backend | Node.js, Express (compiled to `dist/index.cjs`) |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | Session-based (`SESSION_SECRET`), email verification |
| File storage | Local disk at `/opt/gigzito/uploads/` served as `/uploads/*` |
| Hosting | VPS `5.78.128.185`, PM2 process `gigzito`, port 3000 |
| Deploy | Replit → `bash scripts/deploy.sh` → GitHub → VPS |

---

## 2. Repository Layout

```
client/src/
  pages/           ← all route-level page components
  components/      ← shared UI components (Navbar, etc.)
  lib/             ← auth.ts, queryClient.ts
  hooks/           ← use-toast.ts etc.

server/
  routes.ts        ← all API route handlers
  storage.ts       ← all DB CRUD (IStorage interface)
  index.ts         ← Express app entry point

shared/
  schema.ts        ← Drizzle schema + Zod insert schemas + TS types

scripts/
  deploy.sh        ← full build → package → upload → restart pipeline

docs/              ← per-feature mobile & web dev reference docs
```

---

## 3. Deploy Pipeline

```
bash scripts/deploy.sh
```

1. Builds frontend (`vite build`) + backend (`esbuild → dist/index.cjs`)
2. Verifies required assets exist locally
3. Packages `dist/public/` + `dist/index.cjs` into a tarball
4. SCPs tarball to `/tmp/gz-full.tar.gz` on VPS
5. SSH remote: wipes `dist/public/assets/`, extracts tarball, verifies assets, restarts PM2

**Important:** The `uploads/` directory on VPS is **never touched** by the deploy script. Images uploaded by users persist across deploys.

**Secrets required on VPS:** `SESSION_SECRET`, `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`

---

## 4. Image Upload System

All user-uploaded images (wall posts, banners, profile photos, gallery photos) follow the same two-step pattern.

### Step 1 — Upload file to get a URL

```
POST /api/upload/image
Content-Type: multipart/form-data
field name: "file"
```

Response:
```json
{ "url": "/uploads/1776726745011-bcaf99a50c0c182a.png" }
```

- **Max size: 15 MB** — server returns HTTP 413 with `{ "message": "Image is too large. Maximum size is 15 MB." }` if exceeded.
- A legacy alias `/api/upload-image` also exists (identical behaviour).
- Files are saved at `/opt/gigzito/uploads/<timestamp>-<random>.ext`.

### Step 2 — Post the URL with your payload

Send the returned URL as `imageUrl` in your request body. See per-surface details in `docs/gzgroups-mobile-dev-report.md` Section 20.

### Image Error Handling (Frontend)

All `<img>` tags that display uploaded content must handle broken URLs gracefully:

```tsx
// Profile picture — use state
const [imgError, setImgError] = useState(false);
{src && !imgError ? (
  <img src={src} alt="" onError={() => setImgError(true)} />
) : (
  <FallbackIcon />
)}

// Gallery / grid photos — hide the whole container
onError={(e) => {
  const box = (e.target as HTMLImageElement).closest(".aspect-square") as HTMLElement | null;
  if (box) box.style.display = "none";
}}
```

---

## 5. Platform Surfaces

| Surface | Route | Wall Post Table | Key File |
|---|---|---|---|
| GZCards Rolodex | `/geezees` | — | `pages/geezees.tsx` |
| GZCard Profile (public) | `/geezee/:userId` | `profile_wall_posts` | `pages/geezee-profile.tsx` |
| GZCard Editor (dashboard) | `/card-editor` | — | `pages/card-editor.tsx` |
| GZCard Directory | `/gigcard-directory` | — | `pages/gigcard-directory.tsx` |
| Provider Dashboard | `/dashboard` | `profile_wall_posts` | `pages/provider-dashboard.tsx` |
| GZGroups List | `/groups` | — | `pages/gz-groups.tsx` |
| GZGroups Detail | `/groups/:id` | `group_wall_posts` | `pages/group-detail.tsx` |
| GZBands List | `/bands` | — | `pages/gz-bands.tsx` |
| Band Clubhouse | `/bands/:slug` | `gz_band_wall_posts` | `pages/band-clubhouse.tsx` |
| GZBusiness | `/gz-business` | `business_wall_posts` | `pages/gz-business.tsx` |
| Home (video feed) | `/` | — | `pages/home.tsx` |
| Admin Console | `/admin` | — | `pages/admin.tsx` |

---

## 6. GZCards — Theming & Layout (Updated April 23, 2026)

All GZCard surfaces switched from purple to **red** to match the GZ website brand.

### Color Map (Purple → Red)

| Old class | New class |
|---|---|
| `text-purple-400` | `text-red-400` |
| `text-purple-300` | `text-red-300` |
| `bg-purple-700` | `bg-red-700` |
| `bg-purple-600` | `bg-red-600` |
| `bg-purple-900/20` | `bg-red-900/20` |
| `border-purple-700` | `border-red-700` |
| `border-purple-600` | `border-red-600` |
| `from-purple-500` | `from-red-600` |
| `hover:bg-purple-700` | `hover:bg-red-700` |
| `focus:border-purple-600` | `focus:border-red-600` |
| QR color `a855f7` | QR color `ef4444` |

### Rolodex Page — White Backdrop (Rolodex Only)

The GZCards Rolodex (`/geezees`) uses a **white** page background for an elegant card-presentation feel. No other page is affected.

| Property | Value |
|---|---|
| Page background | `#ffffff` |
| Page text | `#111111` |
| Heading | `text-[#111]` |
| Subtitle / help text | `text-[#777]` |
| Back button | `text-[#999] hover:text-red-600` |
| Filter pill borders (inactive) | `border-[#d0d0d0]` |
| Filter pill text (inactive) | `text-[#777]` |
| Filter dividers | `bg-[#ddd]` |
| Loading skeleton | `bg-[#f0f0f0] border-[#e8e8e8]` |
| Scrollbar color | `#ddd` |
| Cards themselves | Still dark (`bg-[#0d0d0d]`) |

---

## 7. GZCard Data Model

### `gigness_cards` table (key columns)

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | integer FK → users | one card per user |
| `display_name` | text | |
| `slogan` | text | one-liner shown on rolodex tile |
| `bio` | text | long description on profile |
| `intent` | text | `marketing`, `social`, or `activity` |
| `gender` | text | `Male`, `Female`, `Other` |
| `age_bracket` | text | `18-25`, `25-40`, `40+` |
| `profile_pic` | text | `/uploads/…` path |
| `photo1_url` | text | gallery image 1 |
| `photo2_url` | text | gallery image 2 |
| `photo3_url` | text | gallery image 3 |
| `avatar_url` | text | fallback if no `profile_pic` |
| `qr_uuid` | text | UUID for QR code generation |
| `instagram_url` | text | social links |
| `tiktok_url` | text | |
| `facebook_url` | text | |
| `twitter_url` | text | |
| `discord_url` | text | |
| `youtube_url` | text | |
| `engagement_count` | integer | ❤️ engage count |

### Tier System

| Tier key | Label | Color |
|---|---|---|
| `GZLurker` | GZ Lurker | zinc |
| `GZMarketer` | GZMarketer | blue |
| `GZMarketerPro` | GZMarketerPro | **red** (was purple) |
| `GZBusiness` | GZBusiness | amber |

---

## 8. Key API Routes

### GZCards

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/gigness-cards` | List all cards (query params: `ageBracket`, `gender`, `intent`, `tier`) |
| `GET` | `/api/gigness-cards/:userId` | Single card by userId |
| `POST` | `/api/gigness-cards` | Create card (auth required) |
| `PUT` | `/api/gigness-cards/:id` | Update card (owner only) |
| `POST` | `/api/gigness-cards/:id/engage` | Add an engagement (auth required) |

### Profile Wall

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/profile/:id/wall` | Get wall posts for a user |
| `POST` | `/api/profile/:id/wall` | Post to wall (`{ content, imageUrl? }`) |
| `DELETE` | `/api/profile/wall/:postId` | Delete post (owner or author) |

### Follow System

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/geezee-follows/status/:userId` | Check follow status |
| `POST` | `/api/geezee-follows/:userId` | Follow a card |
| `DELETE` | `/api/geezee-follows/:userId` | Unfollow |

### Upload

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/upload/image` | Upload image, returns `{ url }` |
| `POST` | `/api/upload-image` | Alias (legacy) |

---

## 9. `users` Table — Critical Notes

The `users` table holds **only** authentication data. It does **not** have an `avatarUrl` column in use. Avatars live on:

- `providerProfiles.avatarUrl` — for provider profiles
- `gignessCards.profilePic` and `gignessCards.avatarUrl` — for GZCards

**Do not** attempt to read `users.avatarUrl` — the column technically exists on the VPS but is unused and always null.

---

## 10. Band Clubhouse Banner

The band banner uses an `<img>` tag (not a background-image div):

```tsx
<img
  src={band.bannerUrl}
  className="w-full object-cover h-56"
  alt=""
  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
/>
```

- Height: `h-56` (224 px)
- Top padding: `pt-8` on the content below
- Recommended upload dimensions: **1200 × 400 px**

---

## 11. Recent Changes Log

| Date | Change | Files |
|---|---|---|
| April 23, 2026 | GZCard theme purple → red, Rolodex white backdrop | `geezees.tsx`, `geezee-profile.tsx`, `card-editor.tsx`, `gigcard-directory.tsx`, `provider-dashboard.tsx` |
| April 23, 2026 | Broken profile pic shows placeholder icon; gallery hides empty boxes | `geezee-profile.tsx` |
| April 23, 2026 | "GeeZees" → "GZCards" rename across UI | multiple pages, navbar |
| April 23, 2026 | Wall image upload on all 4 surfaces (Groups, GZCards, Bands, Business) | `routes.ts`, `storage.ts`, wall page components |
| April 23, 2026 | Upload limit raised 5 MB → 15 MB with clean JSON 413 error | `routes.ts` |
| April 23, 2026 | Band Clubhouse banner upgraded (`<img>` tag, `h-56`, "Best: 1200×400 px" hint) | `band-clubhouse.tsx`, `gz-bands.tsx` |

---

## 12. Branding & Color System

| Role | Tailwind class | Hex |
|---|---|---|
| **GZCard primary** | `red-600` | `#dc2626` |
| **GZCard accent** | `red-400` | `#f87171` |
| **GZCard hover** | `red-700` | `#b91c1c` |
| **Engage / heart** | `pink-400` | `#f472b6` |
| **GZGroups primary** | `red-600` | `#dc2626` |
| **GZBusiness** | `amber-500` | `#f59e0b` |
| **GZMarketer (blue tier)** | `blue-400` | `#60a5fa` |
| **Success** | `green-500` | `#22c55e` |
| **Warning** | `amber-500` | `#f59e0b` |
| **App background (dark)** | — | `#080808` |
| **Rolodex background (white)** | — | `#ffffff` |
| **Card surface** | — | `#0d0d0d` |
| **Card border** | — | `#1e1e1e` |

---

## 13. Data-TestID Convention

Every interactive element and key display element carries a `data-testid` attribute for E2E testing.

Pattern:
- Interactive: `{action}-{target}` → `btn-submit`, `input-email`, `link-profile`
- Dynamic lists: `{type}-{description}-{id}` → `card-geezee-42`, `btn-follow-7`

---

## 14. Known Issues / Gotchas

- **Uploaded files can be lost on VPS reset.** The `uploads/` directory is local disk only. There is no S3 / object storage. If the VPS is reprovisioned, all previously uploaded files are gone even though their URLs remain in the database. Always use `onError` fallbacks on `<img>` tags.
- **One GZCard per user.** The `gigness_cards` table has a unique constraint on `user_id`. Attempting to create a second card will fail at the DB level.
- **`users` table has no usable `avatarUrl`.** See Section 9.
- **PM2 processes `gigzito-bot` and `gigzito-sandbox` show `errored` status** on VPS — these are separate services not required for the main app.
- **CSS warnings during build** (`Unexpected "{"`) are harmless — they come from a third-party library's CSS and do not affect the build output.
