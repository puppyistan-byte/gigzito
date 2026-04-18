# GZFlash — Mobile Dev Spec
**Gigzito · Feature: GZFlash Sales (Flash Ad Directory + Create Flow)**
*April 18, 2026 — Production: `https://gigzito.com` · VPS: `http://5.78.128.185`*

---

## 1. Feature Overview

GZFlash is a time-limited, ranked flash sale system. Eligible business members create flash ads with steep discounts; those ads appear in the GZFlash Sales directory sorted by **Potency Score** (highest score = top-left / first position). Buyers browse the directory, claim deals by entering their email, and receive a coupon code instantly on-screen and by email.

**Three core screens:**

| Screen | Route | Auth Required |
|---|---|---|
| GZFlash Directory | `/offer-center` | None (public) |
| Create/Manage Ads | `/gz-business` (embedded form) | Yes — GZMarketerPro / GZBusiness / GZEnterprise tier |
| Provider Dashboard | `/provider/dashboard` | Yes — owner |

---

## 2. Who Can Create Flash Ads

Only authenticated users with one of these subscription tiers can create flash ads:

```
GZMarketerPro | GZBusiness | GZEnterprise
```

Admins (`ADMIN`, `SUPER_ADMIN`, `SUPERUSER`) can also create and manage all ads.

Unauthenticated users → redirect to login/register.
Authenticated but wrong tier → show upgrade prompt linking to `/pricing`.

---

## 3. Data Model

### gz_flash_ads table

```json
{
  "id": 1,
  "userId": 42,
  "title": "Summer Sale – 50% off sneakers",
  "artworkUrl": "https://cdn.gigzito.com/uploads/abc123.jpg",   // nullable
  "retailPriceCents": 9999,
  "discountPercent": 50,
  "quantity": 10,
  "claimedCount": 3,
  "durationMinutes": 120,
  "potencyScore": 74.3,
  "status": "active",
  "displayMode": "countdown",   // "countdown" | "slots"
  "couponCode": "FLASH50",
  "couponExpiryHours": 48,
  "adminNote": null,
  "expiresAt": "2026-04-18T20:00:00Z",
  "createdAt": "2026-04-18T18:00:00Z"
}
```

**Extended type returned from API** (`GzFlashAdWithOwner`):
```json
{
  ...all fields above...,
  "displayName": "Joe's Sneaker Shop",
  "username": "joessneakers",
  "avatarUrl": "https://cdn.gigzito.com/avatars/xyz.jpg"
}
```

### gz_flash_claims table

```json
{
  "id": 1,
  "flashAdId": 42,
  "email": "buyer@example.com",
  "couponCode": "FLASH50",
  "claimedAt": "2026-04-18T19:15:00Z"
}
```

---

## 4. API Endpoints

### 4.1 Get Active Ads (Directory)

```
GET /api/gz-flash
Auth: None (public)

Response: GzFlashAdWithOwner[]
```

Only returns ads with `status = "active"` and `expiresAt > now`. Sort client-side by `potencyScore` descending.

Refresh interval: every 60 seconds on the directory page.

---

### 4.2 Get My Ads

```
GET /api/gz-flash/mine
Auth: Required — GZMarketerPro / GZBusiness / GZEnterprise

Response: GzFlashAd[]
```

Returns all ads created by the authenticated user, regardless of status.

---

### 4.3 Create Flash Ad

```
POST /api/gz-flash
Auth: Required — eligible tier
Content-Type: application/json

Body:
{
  "title": "string (1–120 chars, required)",
  "artworkUrl": "string | null (optional)",
  "retailPriceCents": "integer ≥ 1 (required)",
  "discountPercent": "integer 1–99 (required, auto-calculated from prices)",
  "quantity": "integer 1–9999 (required)",
  "durationMinutes": "integer 5–43200 (required)",
  "displayMode": "countdown | slots (default: countdown)",
  "couponCode": "string ≤ 60 chars | null (required for buyer to receive)",
  "couponExpiryHours": "integer 1–720 (default: 48)"
}

Response 201: GzFlashAd (created ad with computed expiresAt and initial potencyScore)
Response 400: Zod validation error
Response 403: Wrong subscription tier
```

**Important:** `discountPercent` is computed from `retailPriceCents` and the flash price on the client — it is NOT sent as two separate prices. Calculate it before sending:
```
discountPercent = round(((retailPriceCents - flashPriceCents) / retailPriceCents) * 100)
```

The flash price itself is NOT stored — only `retailPriceCents` and `discountPercent`. Reconstruct flash price as:
```
flashPriceCents = retailPriceCents * (1 - discountPercent / 100)
```

---

### 4.4 Update Flash Ad

```
PUT /api/gz-flash/:id
Auth: Required — must be owner or admin
Body: same as POST

Response 200: GzFlashAd (updated)
```

---

### 4.5 Delete Flash Ad

```
DELETE /api/gz-flash/:id
Auth: Required — must be owner or admin

Response 200: { ok: true }
```

---

### 4.6 Claim a Deal

```
POST /api/gz-flash/:id/claim
Auth: None (public)
Content-Type: application/json

Body: { "email": "buyer@example.com" }

Response 200:
{
  "ad": GzFlashAd,
  "couponCode": "FLASH50",
  "couponExpiresAt": "2026-04-20T19:15:00Z"
}

Errors:
  400 — Sold out (claimedCount >= quantity)
  400 — Expired (expiresAt in past)
  400 — Invalid email
```

On claim:
1. `claimedCount` is incremented by 1.
2. A `gz_flash_claims` record is created.
3. A coupon email is sent to the buyer's address (async — fire and forget).
4. The buyer is added to the provider's Customer List.
5. `potencyScore` is recalculated immediately.

---

### 4.7 Image Upload (for artworkUrl)

```
POST /api/upload/image
Auth: Required
Content-Type: multipart/form-data
Field name: "file"

Response: { "url": "https://cdn.gigzito.com/uploads/abc123.jpg" }
```

Use this URL as `artworkUrl` when creating/editing an ad.

---

## 5. GZFlash Potency Score

The **Potency Score** (0–100) determines ad ranking. It is recalculated server-side every 60 seconds for all active ads.

### Formula

```
Score = Savings × TimePressure × Scarcity × PriceEase × 100

Where:
  Savings      = (retailPriceCents - flashPriceCents) / retailPriceCents
  TimePressure = 1 + (1 - min(timeRemaining / totalDuration, 1))     → 1.0 at launch, 2.0 at expiry
  Scarcity     = 1 + (1 - slotsRemaining / totalSlots)              → 1.0 at launch, 2.0 at sold-out
  PriceEase    = 1 / (1 + flashPriceDollars / 100)                  → higher for cheaper items
```

Score is clamped to [0, 100].

### Heat Zones (for UI theming)

| Zone | Score Range | Color |
|---|---|---|
| HOT | 90–100 | Red |
| TRENDING | 70–89 | Orange |
| ACTIVE | 40–69 | Yellow |
| COOL | 0–39 | Grey |

---

## 6. Create Flash Ad — Full Form Flow

### Step-by-step fields (in order)

| Field | Required | Type | Validation |
|---|---|---|---|
| **Ad Title** | Yes | Text | 1–120 chars |
| **Product Image** | No | File upload or URL | Image file; displayed prominently in directory |
| **Retail Price ($)** | Yes | Decimal | > 0 |
| **Flash Sale Price ($)** | Yes | Decimal | > 0 and < Retail Price |
| **Number of Offers (slots)** | Yes | Integer | 1–9,999 |
| **Duration** | Yes | Two modes (see below) | Min 5 minutes, max 30 days |
| **Ad Display Mode** | Yes | Toggle | "Countdown Clock" or "Number of Offers" |
| **Coupon Code** | Yes | Text (uppercase auto) | ≤ 60 chars — sent to buyer on claim |
| **Coupon Valid For** | Yes | Integer (hours) | 1–720 hours after claim (default: 48h) |

### Duration entry — two modes

**Mode 1: "Pick date & time"** (calendar)
- User picks an end date + time.
- `durationMinutes` is computed as `(endDatetime - now) / 60`.

**Mode 2: "From now"** (relative — default)
- User types hours and minutes from now.
- `durationMinutes = (hours × 60) + minutes`.
- Minimum 5 minutes enforced.

### Live Score Preview

As the user fills in prices, quantity, and duration, a **live score preview** appears showing:
- `At Launch` score (when `elapsedMinutes = 0`, `qtyClaimed = 0`)
- `At Peak (near expiry)` score (when time and slots are nearly exhausted)

This is purely client-side using the formula above. No API call needed for preview.

An "Explain Report" modal breaks down each factor with a grade (STRONG / GOOD / FAIR / WEAK) and improvement advice.

### Validation (client-side before submit)

```
- title not empty
- retailPriceCents ≥ 1
- flashPriceCents ≥ 1
- flashPriceCents < retailPriceCents
- discountPercent ≥ 1
- quantity ≥ 1
- durationMinutes ≥ 5
- couponCode not empty
```

### Submit

On valid submit → `POST /api/gz-flash` (create) or `PUT /api/gz-flash/:id` (edit).

Success → toast notification → refresh ad list.

---

## 7. GZFlash Directory — Ad Card Layout (Updated April 18, 2026)

Each ad card in the directory displays:

```
┌─────────────────────────────────┐
│ [HOT / TRENDING / ACTIVE / COOL]│  ← heat zone badge, top left
│                                 │
│  [Product Image — 160px tall]   │  ← ALWAYS shown (placeholder if none)
│                            X%OFF│  ← discount badge overlaid bottom-right
│                                 │
│  Ad Title (2-line clamp)        │
│  Provider name                  │
│                                 │
│  $FlashPrice  $RetailPrice ~~   │  ← prices (no badge here anymore)
│                                 │
│  [Countdown Clock OR Slots]     │  ← depends on displayMode
│                                 │
│  GZFlash Score bar ─────── 74  │
│                                 │
│  [Claim This Deal]              │  ← or [Sold Out] if exhausted
└─────────────────────────────────┘
```

### Product image rules

| Condition | Display |
|---|---|
| `artworkUrl` is non-null | Full-width image, `object-cover`, 160px tall |
| `artworkUrl` is null | Dark placeholder with broken-image icon + "No product image" label |

**The image zone is always rendered** — it never collapses. This prompts advertisers who forgot to upload an image to notice immediately.

The discount badge (`X% OFF`) is overlaid on the **bottom-right of the image** using absolute positioning.

### Rank fire number

Top 30 ads show their rank number as a large fire-gradient watermark in the top-right corner of the card:
- Rank 1 → `3.8rem` font, 95% opacity
- Rank 2–3 → `3.2rem`, 85% opacity
- Rank 4–10 → `2.6rem`, 70% opacity
- Rank 11–30 → `2.1rem`, 70% opacity

### Display mode widget

| `displayMode` | Widget shows |
|---|---|
| `countdown` | Clock icon + live countdown (`Xh Ym` or `Xs`) |
| `slots` | Users icon + `remaining / total` slots |

Both widgets pulse orange/red when urgency threshold is hit (< 10 min remaining OR ≤ 3 slots left).

---

## 8. Claim Flow

### Screen 1 — Claim modal (before submit)

Shows:
- Product image (160px, same placeholder logic)
- Ad title + provider name
- Flash price + crossed-out retail price
- Discount badge
- Email input field
- "Get My Coupon" CTA button

Validation: email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

On submit → `POST /api/gz-flash/:id/claim`

### Screen 2 — Success state (same modal)

Shows:
- "Deal Claimed!" header
- Confirmation that code was sent to the email
- Large coupon code (monospace, prominent)
- Copy button (clipboard)
- Expiry date/time of the coupon
- Close button

### Error cases

| Error | Message to show |
|---|---|
| Sold out | "Already sold out or expired" |
| Expired | "Already sold out or expired" |
| Invalid email | Client-side validation before submit |

---

## 9. Potency Score — Client-Side Calculation for Preview

Use this function on mobile to show a live score preview while the user fills in the form:

```javascript
const COMFORT_DOLLARS = 100;

function computeGZScore(
  retailDollars,     // full price in dollars
  flashDollars,      // sale price in dollars
  qtyTotal,          // total slots
  qtyClaimed,        // already claimed slots
  durationMinutes,   // total duration
  elapsedMinutes,    // time already elapsed
) {
  if (!retailDollars || !flashDollars || !qtyTotal || !durationMinutes) return 0;
  if (flashDollars >= retailDollars || flashDollars <= 0) return 0;

  const savingsIndex    = (retailDollars - flashDollars) / retailDollars;
  const tRemaining      = Math.max(durationMinutes - elapsedMinutes, 0);
  const timeFactor      = 1 + (1 - Math.min(tRemaining / durationMinutes, 1));
  const sRemaining      = Math.max(qtyTotal - qtyClaimed, 0);
  const scarcityFactor  = 1 + (1 - sRemaining / qtyTotal);
  const priceFriction   = 1 / (1 + flashDollars / COMFORT_DOLLARS);
  const raw             = savingsIndex * timeFactor * scarcityFactor * priceFriction;

  return Math.min(100, raw * 100);
}

// At launch score (for new ad preview):
const atLaunch = computeGZScore(retail, flash, qty, 0, duration, 0);

// Peak score (when nearly expired and nearly sold out):
const atPeak = computeGZScore(retail, flash, qty, qty - 1, duration, duration - 1);
```

---

## 10. Brand & Design Tokens

| Token | Value |
|---|---|
| Background | `#050505` |
| Card bg | `#070707` / `#090a05` |
| Border default | `#181818` |
| HOT border | `rgba(239,68,68,0.80)` |
| TRENDING border | `rgba(249,115,22,0.60)` |
| ACTIVE border | `rgba(161,120,0,0.40)` |
| HOT badge | `bg-red-600 text-white` |
| TRENDING badge | `bg-orange-600 text-white` |
| ACTIVE badge | `bg-yellow-800/60 text-yellow-300` |
| COOL badge | `bg-[#111] text-[#555]` |
| Score bar: HOT | `#ef4444` (red) |
| Score bar: TRENDING | `#f97316` (orange) |
| Score bar: ACTIVE | `#eab308` (yellow) |
| Score bar: COOL | `#333` |
| Price (flash) | `text-green-400` bold |
| Price (retail) | `text-[#444]` line-through |
| Claim CTA (HOT) | `bg-red-600` |
| Claim CTA (other) | `bg-blue-700` |

---

## 11. Test IDs (web reference)

| Element | test ID |
|---|---|
| Ad card | `card-ad-{id}` |
| Ad artwork image | `img-ad-artwork-{id}` |
| Rank fire number | `rank-fire-{id}` |
| Claim button | `btn-claim-{id}` |
| Claim modal | `modal-claim` |
| Claim modal artwork | `img-claim-modal-artwork` |
| Claim email input | `input-claim-email` |
| Claim submit | `btn-submit-claim` |
| Coupon code display | `text-coupon-code` |
| Form title input | `input-flash-title` |
| Form image upload btn | `btn-upload-image` |
| Form artwork URL input | `input-flash-artwork` |
| Form retail price | `input-flash-retail` |
| Form flash price | `input-flash-price` |
| Form quantity | `input-flash-qty` |
| Form duration (hours) | `input-flash-hours` |
| Form duration (mins) | `input-flash-mins` |
| Form display mode: countdown | `btn-mode-countdown` |
| Form display mode: slots | `btn-mode-slots` |
| Form coupon code | `input-coupon-code` |
| Form coupon expiry | `input-coupon-expiry` |
| Form launch button | `btn-launch-flash` |
| Score report modal | `score-report-modal` |

---

## 12. What Changed — April 18, 2026

| # | Change | Impact |
|---|---|---|
| 1 | **Product image zone is always rendered in ad card** | Was: image only shown when `artworkUrl` non-null (collapsed if missing). Now: 160px zone always present with placeholder. |
| 2 | **Image height increased** from 96px (`h-24`) to 160px (`h-40`) | Product is now a dominant visual on the card, not an afterthought. |
| 3 | **Discount badge moved to image overlay** (absolute, bottom-right) | Immediately visible before the buyer reads title or price. Was in the price row. |
| 4 | **Product image added to Claim modal** | When buyer taps "Claim This Deal", they now see the product image (same 160px zone with placeholder) at the top of the modal before entering their email. |

**Files changed:**
- `client/src/pages/offer-center.tsx` — `AdCard` component + claim modal

---

## 13. Deployment

Changes deployed April 18, 2026. Commit on Replit: `00c7a0d1`.
Web source: `client/src/pages/offer-center.tsx`, `client/src/components/gz-flash-form.tsx`
