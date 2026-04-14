# Gigzito — User Dashboard API

**Endpoint:** `GET /api/user/dashboard`  
**Auth required:** Yes (session cookie `connect.sid`)  
**Returns:** A single aggregated snapshot of everything the logged-in user has access to, based on their subscription tier.

---

## Overview for the Mobile Dev

The dashboard is **tier-aware**. The response shape is always the same, but certain blocks will be `null` or `[]` depending on what the user's tier has unlocked. Use the `unlocks` object — it tells you exactly what to show or hide in the UI without any client-side logic needed.

**Never hardcode tier checks on the client.** Read `unlocks.*` from this response instead. As tiers evolve, the server will handle the rules and the client just reacts.

---

## Tier Reference

| Tier | Price | What it unlocks |
|------|-------|-----------------|
| **GZLurker** | Free | Browse feed, like, comment, basic messaging |
| **GZGroups** | $8/mo | Everything in GZLurker + GZGroups workspace |
| **GZMarketer** | $12/mo | Everything in GZGroups + post listings, GeeZee card, Preemptive Marketing geo push, broadcast to followers |
| **GZMarketerPro** | $15/mo | Everything in GZMarketer + GigJack flash events |
| **GZBusiness** | $25/mo | Everything in GZMarketerPro + GZBusiness Ad Center |
| **GZEnterprise** | TBD | Full enterprise access |

---

## Request

```http
GET /api/user/dashboard
Cookie: connect.sid=<session>
```

No query parameters needed.

---

## Response `200`

```json
{
  "user": {
    "id": 42,
    "email": "user@gigzito.com",
    "role": "PROVIDER",
    "subscriptionTier": "GZMarketer",
    "emailVerified": true,
    "disclaimerAccepted": true
  },

  "profile": {
    "id": 7,
    "displayName": "Josh Rivera",
    "username": "joshrivera",
    "bio": "Marketing strategist and content creator.",
    "avatarUrl": "https://cdn.gigzito.com/avatars/josh.jpg",
    "thumbUrl": "https://cdn.gigzito.com/thumbs/josh.jpg",
    "location": "Phoenix, AZ",
    "primaryCategory": "MARKETING",
    "websiteUrl": "https://joshrivera.com",
    "contactEmail": "josh@joshrivera.com",
    "contactPhone": null,
    "contactTelegram": null,
    "instagramUrl": "https://instagram.com/joshrivera",
    "youtubeUrl": null,
    "tiktokUrl": null
  },

  "stats": {
    "totalLikes": 214,
    "followerCount": 38,
    "totalListings": 4,
    "activeListings": 3
  },

  "unlocks": {
    "canBrowse":     true,
    "canLike":       true,
    "canComment":    true,
    "canMessage":    true,
    "canPost":       true,
    "canPresent":    true,
    "canBroadcast":  true,
    "hasGeeZeeCard": true,
    "hasGroups":     true,
    "canFlash":      false,
    "hasAdCenter":   false,
    "hasEnterprise": false
  },

  "geeZeeCard": {
    "id": 3,
    "slogan": "Marketing that moves people.",
    "profilePic": "https://cdn.gigzito.com/geezee/josh.jpg",
    "ageBracket": "25-34",
    "gender": "male",
    "intent": "network",
    "qrUuid": "a1b2c3d4-...",
    "engageCount": 17
  },

  "recentListings": [
    {
      "id": 101,
      "title": "5 Email Hacks That Tripled My Open Rates",
      "vertical": "MARKETING",
      "videoUrl": "https://cdn.gigzito.com/videos/101.mp4",
      "status": "ACTIVE",
      "likeCount": 42,
      "dropDate": "2026-04-01"
    }
  ],

  "groups": [
    {
      "id": 5,
      "name": "Phoenix Marketers",
      "description": "Local marketing pros networking group.",
      "coverUrl": null,
      "isPrivate": false,
      "memberCount": 12
    }
  ]
}
```

---

## Field-by-field notes

### `user`
Standard account info. `role` will be `"PROVIDER"`, `"USER"`, `"ADMIN"`, or `"SUPER_ADMIN"`.

### `profile`
The public-facing provider profile. May be `null` if the user hasn't set one up yet — show an onboarding prompt in this case.

### `stats`
- `totalLikes` — sum of likes across all their video listings
- `followerCount` — users who follow this account
- `totalListings` — all listings ever created (any status)
- `activeListings` — currently live listings only

### `unlocks`

This is the most important block for the mobile client. Use it to gate every feature:

| Field | Gate | What to show when `true` |
|-------|------|--------------------------|
| `canBrowse` | Always true | Main feed |
| `canLike` | Always true | Like button on videos |
| `canComment` | Always true | Comment section |
| `canMessage` | Always true | Message button on GeeZee cards |
| `canPost` | GZMarketer+ | "New Post" button, provider dashboard |
| `canPresent` | GZMarketer+ | Preemptive Marketing geo push tab |
| `canBroadcast` | GZMarketer+ | Broadcast button in dashboard |
| `hasGeeZeeCard` | GZMarketer+ | GeeZee card editor, Geemotion picker |
| `hasGroups` | GZGroups+ | GZGroups section in nav |
| `canFlash` | GZMarketerPro+ | GigJack Flash Events tab |
| `hasAdCenter` | GZBusiness+ | GZBusiness Ad Center tab |
| `hasEnterprise` | GZEnterprise | Enterprise-only features |

When a feature is locked, show an **upgrade prompt** with the minimum tier required (see the table above). Do not silently hide locked features — users need to know they exist.

### `geeZeeCard`
Present only when `unlocks.hasGeeZeeCard === true` **and** the user has actually created a GeeZee card. Will be `null` if they haven't set one up yet — show a "Create Your GeeZee Card" CTA.

### `recentListings`
The user's 5 most recent **active** listings. Empty array `[]` when `unlocks.canPost === false`. Each item includes enough data to render a compact listing card in the dashboard.

### `groups`
The user's groups (up to 10, most recently active first). Empty array `[]` when `unlocks.hasGroups === false`.

---

## Error responses

| Status | Meaning |
|--------|---------|
| `401` | Not logged in — redirect to login |
| `404` | User record not found (shouldn't happen in normal flow) |
| `500` | Server error — show generic retry UI |

---

## Companion endpoints

The dashboard is a snapshot. For real-time sub-screens, use these:

| What | Endpoint |
|------|----------|
| Full listing list | `GET /api/listings/mine` |
| Full groups list | `GET /api/groups` |
| GeeZee card inbox | `GET /api/gigness-cards/inbox` |
| Follower/following counts | `GET /api/follow/counts` |
| Profile wall | `GET /api/profile/:id/wall` |
| Notifications/comments | `GET /api/listings/comments/mine` |
| Total likes (standalone) | `GET /api/profile/me/total-likes` |
| GigJack flash events | `GET /api/gigjack/events` *(GZMarketerPro+ only)* |
| Ad Center | `GET /api/ads/mine` *(GZBusiness+ only)* |

---

## Recommended mobile usage

1. **On app launch / tab focus** — call `GET /api/user/dashboard` to hydrate the dashboard state
2. **Cache TTL** — 60 seconds is fine; the data doesn't change second-to-second
3. **Pull-to-refresh** — re-call this endpoint
4. **Feature gating** — always read from `unlocks`, never hardcode tier strings
5. **Upgrade flows** — when `unlocks.<feature>` is `false`, show a modal or banner pointing to the upgrade page

---

*Last updated: April 2026*
