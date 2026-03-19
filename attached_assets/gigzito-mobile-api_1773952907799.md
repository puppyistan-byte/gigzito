# Gigzito Mobile API Reference

**Base URL:** `https://gigzito.com` (or your dev server)  
**API Prefix:** `/api`  
**Auth:** JWT Bearer token — include `Authorization: Bearer <token>` on all protected endpoints.  
**Content-Type:** `application/json` unless noted otherwise.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Video Feed](#2-video-feed)
3. [Video Upload](#3-video-upload)
4. [Submit a Video Post](#4-submit-a-video-post)
5. [Video Actions (Like, Comments, Views)](#5-video-actions)
6. [My Listings](#6-my-listings)
7. [User Profile (Mobile)](#7-user-profile-mobile)
8. [Invitations](#8-invitations)
9. [GZFlash / Admin Dashboard](#9-gzflash--admin-dashboard)
10. [Error Reference](#10-error-reference)

---

## 1. Authentication

All mobile auth uses JWT — tokens last **30 days**. Login is a **2-step flow** (password → MFA code → token).

---

### POST `/api/mobile/login`

**Step 1** — Validate credentials, trigger 6-digit MFA email.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword1"
}
```

**Success `200`:**
```json
{
  "mfaRequired": true,
  "email": "user@example.com",
  "devCode": "123456"   // ← only present in dev/no-SMTP mode, omit in prod
}
```

**Errors:**
| Status | Meaning |
|--------|---------|
| `400` | Missing email or password |
| `401` | Wrong credentials |
| `403` | Account disabled OR email not verified |

---

### POST `/api/mobile/mfa/verify`

**Step 2** — Submit MFA code → receive JWT token.

**Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "email": "user@example.com",
    "role": "USER",
    "subscriptionTier": "GZMarketer",
    "username": "creator_jane",
    "displayName": "Jane Creator",
    "avatarUrl": "https://..."
  }
}
```

**Errors:**
| Status | Meaning |
|--------|---------|
| `401` | Invalid code, expired code, or already used |

---

### POST `/api/mobile/refresh`

Exchange a valid (or recently expired) token for a fresh 30-day token.

**Headers:** `Authorization: Bearer <token>`  
**Body:** _(empty)_

**Success `200`:** Same shape as MFA verify response.

---

## 2. Video Feed

### GET `/api/listings`

The main TikTok-style feed. Returns all active listings sorted by hot score (descending).

**Auth:** Optional (liked status only returned if authenticated)  
**Query params:**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `vertical` | string | `MUSIC_GIGS` | Filter by category (see verticals below) |

**Verticals:**
```
MARKETING · COACHING · COURSES · MUSIC · CRYPTO
INFLUENCER · PRODUCTS · FLASH_SALE · FLASH_COUPON
MUSIC_GIGS · EVENTS · CORPORATE_DEALS · FOR_SALE
```

**Success `200`** — Array of listing objects:
```json
[
  {
    "id": 101,
    "title": "My First Video",
    "vertical": "MUSIC_GIGS",
    "postType": "VIDEO",
    "videoUrl": "https://www.tiktok.com/@user/video/123",
    "description": "Check out this beat",
    "tags": ["music", "hiphop"],
    "ctaType": "Visit Offer",
    "ctaUrl": "https://example.com/offer",
    "ctaLabel": "Book Me",
    "flashSaleEndsAt": null,
    "couponCode": null,
    "productPrice": null,
    "productPurchaseUrl": null,
    "productStock": null,
    "hotScore": 87,
    "trendLabel": "TRENDING",
    "likeCount": 142,
    "viewCount": 2890,
    "dropDate": "2026-03-19",
    "status": "ACTIVE",
    "scanStatus": "CLEAN",
    "provider": {
      "id": 7,
      "displayName": "Jane Creator",
      "username": "creator_jane",
      "avatarUrl": "https://...",
      "bio": "Music producer",
      "primaryCategory": "MUSIC_GIGS",
      "subscriptionTier": "GZMarketer"
    }
  }
]
```

**trendLabel values:** `HOT` (score ≥90) · `TRENDING` (≥70) · `ACTIVE` (≥40) · `COOL` (<40)

---

### GET `/api/listings/:id`

Single listing by ID.

**Auth:** Optional  
**Success `200`:** Same shape as above (single object, not array).  
**Error `404`:** Listing not found.

---

## 3. Video Upload

Use this to upload a video file directly (MP4, MOV, WebM). Returns a hosted URL you then pass to [Submit a Video Post](#4-submit-a-video-post).

### POST `/api/upload/video`

**Auth:** Required  
**Content-Type:** `multipart/form-data`  
**Field name:** `file`

**Constraints:**
- Max size: **200 MB**
- Max duration: **60 seconds** _(enforced client-side before upload; server does not re-check duration)_
- Formats: MP4, MOV, WebM, AVI

**Success `200`:**
```json
{
  "url": "/uploads/videos/1742589123456-myfile.mp4",
  "size": 12345678,
  "originalName": "myfile.mp4"
}
```

Store the returned `url` — pass it as `videoUrl` when submitting.

**Note on scanning:** When you submit a video using a `/uploads/videos/...` URL, Gigzito's Bif AI scanner automatically queues it. The listing goes live immediately with `scanStatus: "SCANNING"` and updates to `CLEAN` or `FLAGGED` once Bif finishes.

---

## 4. Submit a Video Post

### POST `/api/listings/submit`

**Auth:** Required  
**Rate limit:** 100 listings/day platform-wide (Admins are exempt)

**Prerequisites:**
- Profile must be complete (displayName, bio, avatar, primaryCategory, at least one contact method)
- Check profile completion via `GET /api/profile/me/completion`

**Body:**
```json
{
  "vertical": "MUSIC_GIGS",
  "title": "My Live Set Recap",
  "postType": "VIDEO",
  "videoUrl": "/uploads/videos/1742589123456-myvideo.mp4",
  "durationSeconds": 45,
  "description": "Full recap of last night's show",
  "tags": ["live", "music", "hiphop"],
  "ctaType": "Book Service",
  "ctaUrl": "https://example.com/book",
  "ctaLabel": "Book Me",
  "flashSaleEndsAt": null,
  "couponCode": null,
  "productPrice": null,
  "productPurchaseUrl": null,
  "productStock": null
}
```

**Field reference:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `vertical` | string | Yes | One of the 12 verticals above |
| `title` | string | Yes | Max 200 chars |
| `postType` | `"VIDEO"` \| `"TEXT"` | No | Default: `"VIDEO"` |
| `videoUrl` | string (URL) | Yes if VIDEO | Hosted URL from `/api/upload/video` or external URL (TikTok, YouTube Shorts, Instagram Reels) |
| `durationSeconds` | number | No | 1–60, default 60 |
| `description` | string | No | Max 1000 chars |
| `tags` | string[] | No | Max 10 tags |
| `ctaType` | string | No | `"Visit Offer"` \| `"Shop Product"` \| `"Join Event"` \| `"Book Service"` \| `"Join Guild"` |
| `ctaUrl` | string (URL) | If ctaType set | Must be a valid URL |
| `ctaLabel` | string | No | Max 60 chars |
| `flashSaleEndsAt` | ISO datetime | Flash Sale only | e.g. `"2026-03-25T23:59:00Z"` |
| `couponCode` | string | Flash Coupon only | Max 40 chars |
| `productPrice` | string | Products only | e.g. `"$29.99"` |
| `productPurchaseUrl` | string (URL) | Products only | Direct buy link |
| `productStock` | string | Products only | e.g. `"5 left"` |

**Success `201`:**
```json
{
  "success": true,
  "listingId": 101,
  "scanStatus": "SCANNING"
}
```

`scanStatus` is `"SCANNING"` for uploaded videos (Bif is running), `"CLEAN"` for external URL posts (no scan needed).

**Errors:**
| Status | Meaning |
|--------|---------|
| `400` | Validation error — `message` + `field` indicate the problem |
| `400` | Profile incomplete |
| `401` | Not authenticated |
| `429` | Daily cap reached |

---

### GET `/api/listings/:id/scan-status`

Poll to check Bif scan result for an uploaded video.

**Auth:** Required  
**Success `200`:**
```json
{
  "scanStatus": "SCANNING",
  "scanNote": null
}
```

`scanStatus` values: `SCANNING` · `CLEAN` · `FLAGGED` · `MANUAL_REVIEW` · `BYPASSED`

---

### GET `/api/profile/me/completion`

Check if the current user's profile is complete enough to post.

**Auth:** Required  
**Success `200`:**
```json
{
  "isComplete": false,
  "missing": ["bio", "avatar", "contact method"]
}
```

---

## 5. Video Actions

### POST `/api/videos/:id/like`

Toggle a like on a listing. Returns the new state.

**Auth:** Required  
**Body:** _(empty)_

**Success `200`:**
```json
{
  "liked": true,
  "totalLikes": 143
}
```

---

### GET `/api/videos/:id/likes`

Get like count and whether the current user has liked it.

**Auth:** Optional  
**Success `200`:**
```json
{
  "liked": false,
  "totalLikes": 142
}
```

---

### GET `/api/videos/likes/batch`

Efficiently fetch like status for multiple listings at once (for feed pre-loading).

**Auth:** Optional  
**Query:** `?ids=101,102,103`

**Success `200`:**
```json
{
  "101": true,
  "102": false,
  "103": false
}
```

---

### POST `/api/listings/:id/comments`

Post a comment on a listing.

**Auth:** Required  
**Body:**
```json
{
  "body": "Great content! 🔥"
}
```

**Success `201`:**
```json
{
  "id": 55,
  "body": "Great content! 🔥",
  "createdAt": "2026-03-19T22:00:00.000Z",
  "user": {
    "id": 42,
    "username": "creator_jane",
    "avatarUrl": "https://..."
  }
}
```

---

### GET `/api/listings/:id/comments`

Fetch all comments for a listing.

**Auth:** Optional  
**Success `200`:** Array of comment objects (same shape as above).

---

## 6. My Listings

### GET `/api/listings/mine`

All listings posted by the authenticated user.

**Auth:** Required  
**Success `200`:** Array of listing objects (same as feed, but includes all statuses: ACTIVE, PAUSED, REMOVED).

---

### PATCH `/api/listings/:id/status`

Pause, resume, or remove one of your listings.

**Auth:** Required  
**Body:**
```json
{
  "status": "PAUSED"
}
```

`status` values: `"ACTIVE"` · `"PAUSED"` · `"REMOVED"`

**Success `200`:** Updated listing object.

---

## 7. User Profile (Mobile)

### GET `/api/mobile/me`

Full account + GeeZee profile for the authenticated user.

**Auth:** Required (Bearer)

**Success `200`:**
```json
{
  "user": {
    "id": 42,
    "email": "user@example.com",
    "role": "USER",
    "subscriptionTier": "GZMarketer",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "profile": {
    "id": 7,
    "username": "creator_jane",
    "displayName": "Jane Creator",
    "bio": "Music producer from Hillsboro",
    "avatarUrl": "https://...",
    "primaryCategory": "MUSIC_GIGS",
    "contactEmail": "jane@example.com",
    "contactPhone": null,
    "contactTelegram": null,
    "websiteUrl": "https://janecreator.com",
    "instagramUrl": null,
    "tiktokUrl": "https://tiktok.com/@jane",
    "youtubeUrl": null,
    "facebookUrl": null,
    "discordUrl": null,
    "twitterUrl": null,
    "zeeCardStyle": "CLASSIC",
    "zeeCardColor": "#ff1a1a",
    "geemotionDefault": "🔥",
    "geemotionUnlocked": ["🔥","💎","🎵"],
    "totalLikes": 284,
    "loveVotes": 12
  }
}
```

---

### PUT `/api/mobile/profile`

Update the GeeZee creator profile fields.

**Auth:** Required (Bearer)  
**Body** (all fields optional — only send what you want to change):
```json
{
  "displayName": "Jane Creator",
  "bio": "Music producer. Booking open.",
  "avatarUrl": "https://cdn.example.com/avatar.jpg",
  "primaryCategory": "MUSIC_GIGS",
  "contactEmail": "jane@example.com",
  "contactPhone": "+15031234567",
  "contactTelegram": "@janecreates",
  "websiteUrl": "https://janecreator.com",
  "instagramUrl": "https://instagram.com/janecreates",
  "tiktokUrl": "https://tiktok.com/@janecreates",
  "youtubeUrl": null,
  "facebookUrl": null,
  "discordUrl": null,
  "twitterUrl": null,
  "zeeCardStyle": "NEON",
  "zeeCardColor": "#9b59b6",
  "geemotionDefault": "💎"
}
```

**Success `200`:** Updated profile object.

---

### PATCH `/api/mobile/account`

Update the user's email address.

**Auth:** Required (Bearer)  
**Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Success `200`:**
```json
{ "ok": true }
```

---

## 8. Invitations

### POST `/api/invite/send`

Send a Gigzito ecosystem invite email to a prospect.

**Auth:** Not required  
**Rate limit:** 5 invites per IP per hour

**Body:**
```json
{
  "senderName": "Jane Creator",
  "senderEmail": "jane@example.com",
  "targetName": "Mike Business",
  "targetEmail": "mike@example.com"
}
```

**Success `200`:**
```json
{
  "ok": true,
  "devMode": false
}
```

`devMode: true` means SMTP is not configured — the email was logged to the server console instead of sent.

---

## 9. GZFlash / Admin Dashboard

All admin endpoints accept the same Bearer token as regular users — the user's role must be `ADMIN` or `SUPER_ADMIN`.

### GET `/api/mobile/admin/dashboard`

Full platform stats for the super admin dashboard.

**Auth:** Required (Bearer, SUPER_ADMIN only)

**Success `200`:**
```json
{
  "stats": {
    "totalUsers": 400,
    "activeListings": 87,
    "gigJackEvents": 3,
    "gzFlashAds": 12,
    "revenueThisMonth": "$1,240.00"
  },
  "recentUsers": [...],
  "auditLog": [...]
}
```

---

## 10. Error Reference

All errors return JSON with at minimum a `message` string:

```json
{ "message": "Human-readable error description" }
```

Validation errors also include a `field` key:

```json
{
  "message": "String must contain at most 200 character(s)",
  "field": "title"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request / validation failed |
| `401` | Not authenticated — missing or invalid token |
| `403` | Forbidden — account disabled, email not verified, or role insufficient |
| `404` | Resource not found |
| `409` | Conflict — duplicate action (e.g. voted twice) |
| `429` | Rate limited or daily cap reached |
| `500` | Server error |

---

## Quick Start Cheat-Sheet (Mobile)

```
1. POST /api/mobile/login          { email, password }
   → { mfaRequired: true, email, devCode? }

2. POST /api/mobile/mfa/verify     { email, code }
   → { token, user }

   Store token. Add header: Authorization: Bearer <token>

3. GET  /api/mobile/me             → full profile
4. GET  /api/profile/me/completion → { isComplete, missing[] }

   If not complete → PUT /api/mobile/profile to fill in fields

5. POST /api/upload/video          multipart: file=<video>
   → { url: "/uploads/videos/..." }

6. POST /api/listings/submit       { vertical, title, postType:"VIDEO", videoUrl }
   → { listingId, scanStatus }

7. GET  /api/listings              → feed array (vertical filter optional)
8. POST /api/videos/:id/like       → { liked, totalLikes }
9. POST /api/listings/:id/comments { body }
```

---

*Generated: 2026-03-19 — Gigzito v1 Mobile API*
