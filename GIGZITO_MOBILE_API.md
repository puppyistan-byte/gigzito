# Gigzito Mobile API Reference
**Base URL:** `https://<your-gigzito-domain>`  
**Content-Type:** `application/json` (all requests and responses)  
**Auth:** Session cookie (`connect.sid`) — set automatically on login, must be sent with every protected request.

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Profile](#2-profile)
3. [Live Streaming — Zito.TV](#3-live-streaming--zitotv)
4. [Content Feed (Listings/Videos)](#4-content-feed)
5. [Activity & Notifications](#5-activity--notifications)
6. [GigJack Flash Events](#6-gigjack-flash-events)
7. [Engagement (Likes, Follows)](#7-engagement)
8. [Error Format](#8-error-format)

---

## 1. Authentication

### POST `/api/auth/register`
Create a new Gigzito account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword123!",
  "role": "PROVIDER"
}
```
> `role` options: `"PROVIDER"` (creator/seller) | `"USER"` (viewer/buyer)

**Response `201`:**
```json
{
  "id": 42,
  "email": "user@example.com",
  "role": "PROVIDER",
  "subscriptionTier": "GZLurker",
  "emailVerified": false
}
```

---

### POST `/api/auth/login`
Log in. Sets the session cookie.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword123!"
}
```

**Response `200`:**
```json
{
  "user": {
    "id": 42,
    "email": "user@example.com",
    "role": "PROVIDER",
    "subscriptionTier": "GZMarketerPro",
    "status": "active"
  },
  "profile": {
    "id": 7,
    "displayName": "DJ Kingpin",
    "username": "djkingpin",
    "avatarUrl": "https://...",
    "primaryCategory": "MUSIC_GIGS",
    "bio": "..."
  }
}
```
> If MFA is enabled, the response will be `{ "mfaRequired": true }` — follow up with `POST /api/auth/mfa/verify`.

---

### POST `/api/auth/logout`
🔒 Requires auth.  
Destroys the session.

**Response `200`:** `{ "success": true }`

---

### GET `/api/auth/me`
🔒 Requires auth.  
Get the current logged-in user + their profile.

**Response `200`:** Same shape as the login response above.

---

### POST `/api/auth/mfa/verify`
Verify a 6-digit MFA code after login.

**Body:**
```json
{ "code": "123456" }
```

**Response `200`:** Full user + profile (same as login).

---

### POST `/api/auth/mfa/resend`
Resend the MFA verification code.

**Response `200`:** `{ "success": true }`

---

### POST `/api/auth/change-password`
🔒 Requires auth.

**Body:**
```json
{
  "currentPassword": "OldPassword1!",
  "newPassword": "NewPassword2!"
}
```

**Response `200`:** `{ "success": true }`

---

## 2. Profile

### GET `/api/profile/me`
🔒 Requires auth.  
Get the current user's full provider profile.

**Response `200`:**
```json
{
  "id": 7,
  "userId": 42,
  "displayName": "DJ Kingpin",
  "username": "djkingpin",
  "bio": "Live DJ sets, hip-hop and afrobeats",
  "avatarUrl": "https://...",
  "primaryCategory": "MUSIC_GIGS",
  "location": "Atlanta, GA",
  "youtubeUrl": "https://youtube.com/@djkingpin",
  "tiktokUrl": null,
  "instagramUrl": null,
  "subscriptionTier": "GZMarketerPro"
}
```

---

### PATCH `/api/profile/me`
🔒 Requires auth.  
Update the current user's profile fields (any subset).

**Body (all fields optional):**
```json
{
  "displayName": "DJ Kingpin Official",
  "bio": "Updated bio",
  "avatarUrl": "https://...",
  "location": "Miami, FL",
  "primaryCategory": "MUSIC_GIGS",
  "youtubeUrl": "https://youtube.com/@djkingpin",
  "tiktokUrl": "https://tiktok.com/@djkingpin"
}
```

**Response `200`:** Updated profile object.

---

### GET `/api/profile/me/total-likes`
🔒 Requires auth.  
Total love/like count on all the current user's content.

**Response `200`:** `{ "total": 1240 }`

---

### GET `/api/profile/me/viewers`
🔒 Requires auth.  
People who recently viewed the current user's profile.

**Response `200`:**
```json
[
  {
    "viewerId": 12,
    "viewedAt": "2026-03-20T18:00:00.000Z",
    "viewer": { "displayName": "Maya Chen", "avatarUrl": "https://...", "username": "mayacoach" }
  }
]
```

---

### GET `/api/profile/me/who-loved-me`
🔒 Requires auth.  
Users who liked/loved the current user's content recently.

**Response `200`:**
```json
[
  {
    "likerId": 9,
    "likedAt": "2026-03-20T17:45:00.000Z",
    "liker": { "displayName": "Alex Rivera", "avatarUrl": "https://...", "username": "alexrivera" }
  }
]
```

---

## 3. Live Streaming — Zito.TV

All live streaming is powered by **Zito.TV**. Gigzito registers creators on Zito.TV and relays all session state to keep streams live.

---

### GET `/api/zito-live/streams`
Get all Zito.TV registered streamers — live ones first.

**Auth:** Not required.

**Response `200`:**
```json
[
  {
    "id": 1,
    "gigzitoUserId": "42",
    "username": "djkingpin",
    "name": "DJ Kingpin",
    "category": "Music",
    "description": "Live DJ sets, hip-hop and afrobeats",
    "avatarUrl": "https://...",
    "tags": ["Hip-Hop", "Afrobeats", "Live Mix"],
    "isLive": true,
    "streamUrl": "https://youtube.com/live/abc123",
    "title": "Friday Night Mix 🔥",
    "thumbnailUrl": "https://...",
    "viewerCount": 4230,
    "slotIndex": 0
  },
  {
    "id": 3,
    "username": "thegigtalk",
    "name": "The Gig Talk",
    "category": "Talk Show",
    "isLive": false,
    "viewerCount": 0,
    ...
  }
]
```

> `streamUrl` is only present when `isLive: true` and the stream has an embeddable source (YouTube, Twitch, direct HLS). If absent while live, redirect to Zito.TV: `https://zito.tv/watch/{username}`.

---

### POST `/api/zito-live/register`
🔒 Requires auth.  
Register the current Gigzito user as a streamer on Zito.TV. Call this once when onboarding a creator, or before going live for the first time.

**Body:**
```json
{
  "category": "Music",
  "tags": ["Hip-Hop", "Afrobeats"]
}
```

**Response `200`:**
```json
{
  "id": "stream_abc123",
  "username": "djkingpin",
  "name": "DJ Kingpin",
  "category": "Music",
  "isLive": false
}
```

---

### POST `/api/live/start`
🔒 Requires auth.  
Start a Gigzito live session **and** automatically register + go-live on Zito.TV.

**Body:**
```json
{
  "title": "Friday Night Mix 🔥",
  "category": "MUSIC_GIGS",
  "mode": "external",
  "streamUrl": "https://youtube.com/live/abc123",
  "thumbnailUrl": "https://...",
  "platform": "youtube"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✅ | 1–100 chars |
| `category` | ✅ | See category list below |
| `mode` | ✅ | `"external"` (YouTube/TikTok/etc.) or `"native"` (direct HLS/.m3u8) |
| `streamUrl` | ✅ | Full URL to your live stream |
| `thumbnailUrl` | ❌ | Preview image URL |
| `platform` | ❌ | Auto-detected if omitted: `youtube`, `twitch`, `facebook`, `instagram`, `tiktok`, `native` |

**Response `201`:**
```json
{
  "id": 88,
  "creatorUserId": 42,
  "providerId": 7,
  "title": "Friday Night Mix 🔥",
  "category": "MUSIC_GIGS",
  "mode": "external",
  "platform": "youtube",
  "streamUrl": "https://youtube.com/live/abc123",
  "thumbnailUrl": "https://...",
  "status": "live",
  "viewerCount": 0,
  "startedAt": "2026-03-20T20:00:00.000Z"
}
```

---

### POST `/api/live/:id/heartbeat`
🔒 Requires auth (session owner only).  
Keep the Zito.TV session marked as live. **Call every 30 seconds** while the creator is broadcasting. If heartbeats stop, Zito.TV will eventually mark the stream as offline.

**URL param:** `:id` — the session ID returned from `/api/live/start`

**Body:**
```json
{ "viewerCount": 312 }
```

**Response `200`:** `{ "ok": true }`

---

### PATCH `/api/live/:id/end`
🔒 Requires auth (session owner only).  
End the Gigzito live session and relay `end-stream` to Zito.TV.

**URL param:** `:id` — session ID

**Response `200`:** `{ "success": true }`

---

### GET `/api/live/active`
Get all currently active Gigzito-internal live sessions (separate from the Zito.TV roster).

**Auth:** Not required.

**Response `200`:** Array of live session objects (same shape as `/api/live/start` response), each with an embedded `provider` object.

---

### GET `/api/live/:id`
Get a single live session by ID, with provider info embedded.

**Auth:** Not required.

**Response `200`:** Full session object with `provider` nested.

---

**Live Stream Categories:**
```
INFLUENCER | MUSIC_GIGS | EVENTS | CORPORATE_DEALS
MARKETING | COACHING | COURSES | CRYPTO | PRODUCTS
```

---

## 4. Content Feed

### GET `/api/listings`
Get the main content feed (short-form videos + posts).

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `vertical` | string | Filter by category (e.g. `MARKETING`, `COACHING`) |
| `limit` | number | Items per page (default 20) |
| `offset` | number | Pagination offset |

**Response `200`:**
```json
[
  {
    "id": 14,
    "providerId": 3,
    "vertical": "MARKETING",
    "title": "5 Email Hacks That Tripled My Open Rates",
    "videoUrl": "https://youtube.com/embed/...",
    "description": "...",
    "tags": ["email", "marketing"],
    "likeCount": 342,
    "ctaUrl": "https://...",
    "ctaLabel": "Get the Guide",
    "postType": "VIDEO",
    "status": "ACTIVE",
    "provider": {
      "id": 3,
      "displayName": "Alex Rivera",
      "username": "alexrivera",
      "avatarUrl": "https://..."
    }
  }
]
```

---

### GET `/api/listings/:id/comments`
Get comments on a listing.

**Response `200`:** Array of comment objects.

---

### POST `/api/listings/:id/comments`
🔒 Requires auth.  
Post a comment.

**Body:** `{ "content": "Great content!" }`

**Response `201`:** Created comment object.

---

### POST `/api/listings/comments/:id/like`
🔒 Requires auth.  
Like/unlike a comment (toggle).

**Response `200`:** `{ "liked": true }` or `{ "liked": false }`

---

## 5. Activity & Notifications

### GET `/api/notifications/activity`
🔒 Requires auth.  
Unified activity feed: profile views, comment likes, who loved your content.

**Query params:** `?filter=all|views|likes|loves`

**Response `200`:**
```json
[
  {
    "type": "profile_view",
    "actorDisplayName": "Maya Chen",
    "actorUsername": "mayacoach",
    "actorAvatarUrl": "https://...",
    "createdAt": "2026-03-20T18:30:00.000Z"
  },
  {
    "type": "comment_like",
    "actorDisplayName": "Noah Kim",
    "commentSnippet": "Great content!",
    "createdAt": "2026-03-20T17:00:00.000Z"
  }
]
```

---

## 6. GigJack Flash Events

Flash-sale events with time-limited slots.

### GET `/api/gigjacks/active`
Get the currently active GigJack event.

### GET `/api/gigjacks/slots`
Get available GigJack slots.

### POST `/api/gigjacks/submit`
🔒 Requires auth.  
Submit a bid for a GigJack slot.

**Body:**
```json
{
  "slotIndex": 0,
  "title": "My Flash Deal",
  "category": "FLASH_SALE",
  "bidAmountCents": 5000,
  "streamUrl": "https://..."
}
```

### GET `/api/gigjacks/mine`
🔒 Requires auth.  
Get the current user's own GigJack submissions.

---

## 7. Engagement

### POST `/api/videos/:id/like`
🔒 Requires auth.  
Like/unlike a video (toggle).

**Response `200`:** `{ "liked": true, "likeCount": 143 }`

---

### GET `/api/engagement/leaderboard`
Top providers by engagement (loves + GeeZee reactions).

**Response `200`:**
```json
[
  {
    "providerId": 4,
    "displayName": "Sofia Martinez",
    "avatarUrl": "https://...",
    "username": "sofiamarketing",
    "loveCount": 312,
    "geezeeCount": 45,
    "totalEngagement": 357
  }
]
```

---

### POST `/api/geezee-follows/:userId`
🔒 Requires auth.  
Follow a user.

### DELETE `/api/geezee-follows/:userId`
🔒 Requires auth.  
Unfollow a user.

### GET `/api/geezee-follows/status/:userId`
🔒 Requires auth.  
Check if the current user follows `:userId`.

**Response `200`:** `{ "following": true }`

---

## 8. Error Format

All errors return a consistent JSON body:

```json
{
  "message": "Human-readable error description"
}
```

**Common status codes:**

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Not authenticated (login required) |
| `403` | Forbidden (wrong user or tier) |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Server error |
| `502 / 503` | Upstream service (Zito.TV) unavailable |

---

## Subscription Tiers

| Tier | Label | Price |
|------|-------|-------|
| `GZLurker` | Free | $0 |
| `GZMarketer` | Marketer | $12/mo |
| `GZMarketerPro` | Marketer Pro | $15/mo |
| `GZBusiness` | Business | $25/mo |
| `GZEnterprise` | Enterprise | Custom |

Access to GZFlash Ad Center requires `GZMarketerPro`, `GZBusiness`, or `GZEnterprise`.

---

## Mobile Integration Notes

1. **Session persistence:** Store the `connect.sid` cookie and send it with every request (`withCredentials: true` in Axios, or `credentials: "include"` in `fetch`).
2. **Heartbeat timer:** After calling `POST /api/live/start`, start a 30-second interval calling `POST /api/live/:id/heartbeat`. Clear the timer when the stream ends.
3. **Single active stream:** Only allow one stream to be in a "watching" state at a time in the UI. When the user taps Watch on a new card, stop the current one first.
4. **Zito.TV fallback:** If a live stream has no `streamUrl`, open `https://zito.tv/watch/{username}` in an in-app browser or external browser.
5. **Auto-refresh streams:** Poll `GET /api/zito-live/streams` every 20 seconds on the Live Now screen to reflect real-time status changes.
