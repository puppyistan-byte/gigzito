# Gigzito — Master API Reference

**Base URL (Dev):** `http://localhost:5000`
**Base URL (Production):** `https://gigzito.com` (Hillsboro: 5.78.128.185 | Ashburn: 5.161.102.88)
**Authentication:** Session cookie (`connect.sid`) — all protected routes require an active session.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Profiles](#2-profiles)
3. [Listings (Zito TV Feed)](#3-listings-zito-tv-feed)
4. [Likes](#4-likes)
5. [Comments](#5-comments)
6. [Ad Inquiries](#6-ad-inquiries)
7. [Leads](#7-leads)
8. [Sponsor Ads (Right Rail)](#8-sponsor-ads-right-rail)
9. [GigJacks (Flash Events)](#9-gigjacks-flash-events)
10. [Gigness Cards](#10-gigness-cards)
11. [Geo Campaigns (Preemptive Marketing)](#11-geo-campaigns-preemptive-marketing)
12. [All-Eyes Banner Ads](#12-all-eyes-banner-ads)
13. [Injected Feed (Live Broadcasts)](#13-injected-feed-live-broadcasts)
14. [Live Streams](#14-live-streams)
15. [Love / Provider Leaderboard](#15-love--provider-leaderboard)
16. [Audience Aggregator](#16-audience-aggregator)
17. [Zito TV Events](#17-zito-tv-events)
18. [Ad Bookings (Calendar)](#18-ad-bookings-calendar)
19. [File Uploads](#19-file-uploads)
20. [Admin — Users](#20-admin--users)
21. [Admin — Listings](#21-admin--listings)
22. [Admin — GigJacks](#22-admin--gigjacks)
23. [Admin — Sponsor Ads](#23-admin--sponsor-ads)
24. [Admin — Injected Feeds](#24-admin--injected-feeds)
25. [Admin — Geo Campaigns](#25-admin--geo-campaigns)
26. [Admin — Ad Bookings](#26-admin--ad-bookings)
27. [Admin — Stats & Audit Log](#27-admin--stats--audit-log)
28. [Data Models](#28-data-models)

---

## 1. Authentication

### POST `/api/auth/register`
Register a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "disclaimerAccepted": true
}
```
**Response `201`:**
```json
{ "id": 1, "email": "user@example.com", "role": "VISITOR" }
```

---

### POST `/api/auth/login`
Log in with email and password. Returns session cookie.

**Body:**
```json
{ "email": "user@example.com", "password": "securepassword" }
```
**Response `200`:** User object + sets `connect.sid` cookie.

**MFA Flow:** If MFA is enabled, returns `{ "mfaRequired": true }` — follow with `/api/auth/mfa/verify`.

---

### POST `/api/auth/logout`
Destroy current session.

**Response `200`:** `{ "message": "Logged out" }`

---

### GET `/api/auth/me`
Get the currently authenticated user.

**Response `200`:**
```json
{
  "user": { "id": 1, "email": "...", "role": "PROVIDER", "subscriptionTier": "GZ_PLUS" },
  "profile": { "username": "joesmith", "displayName": "Joe Smith", "avatarUrl": "..." }
}
```
**Response `401`:** Not authenticated.

---

### GET `/api/auth/verify-email`
Verify email address via token link.

**Query:** `?token=<verification_token>`

**Response `200`:** `{ "message": "Email verified" }`

---

### POST `/api/auth/resend-verification`
Resend the email verification link.

**Body:** `{ "email": "user@example.com" }`

---

### POST `/api/auth/mfa/verify`
Submit MFA code after login.

**Body:** `{ "code": "123456" }`

---

### POST `/api/auth/mfa/resend`
Resend MFA code.

---

## 2. Profiles

### GET `/api/profiles/me`
Get the authenticated user's full provider profile.

**Auth:** Required

**Response `200`:** Full `ProviderProfile` object.

---

### GET `/api/profiles/completion`
Get profile completion status (percentage + missing fields).

**Auth:** Required

**Response `200`:**
```json
{
  "percent": 75,
  "missing": ["bio", "avatarUrl"],
  "complete": false
}
```

---

### PUT `/api/profiles/me`
Update the authenticated provider's profile.

**Auth:** Required

**Body (all optional):**
```json
{
  "displayName": "Joe Smith",
  "bio": "Marketing expert",
  "avatarUrl": "https://...",
  "username": "joesmith",
  "location": "Phoenix, AZ",
  "primaryCategory": "Marketing",
  "contactEmail": "joe@example.com",
  "contactPhone": "555-0100",
  "websiteUrl": "https://joesmith.com",
  "instagramUrl": "https://instagram.com/joesmith",
  "youtubeUrl": "...",
  "tiktokUrl": "...",
  "facebookUrl": "...",
  "twitterUrl": "...",
  "discordUrl": "...",
  "photo1Url": "...",
  "webhookUrl": "https://mywebhook.com/hook"
}
```

---

### GET `/api/profiles/:username`
Get a provider's public profile by username.

**Response `200`:** Provider profile + their active listings.

---

### GET `/api/profile/me/total-likes`
Get the total like count across all the authenticated provider's listings.

**Auth:** Required

**Response `200`:** `{ "totalLikes": 142 }`

---

## 3. Listings (Zito TV Feed)

### GET `/api/listings`
Get all active listings for the feed.

**Query (optional):**
- `vertical=MARKETING` — filter by category
- `search=keyword` — keyword search

**Response `200`:** Array of listing objects with embedded provider profile.

---

### GET `/api/listings/mine`
Get listings belonging to the authenticated user.

**Auth:** Required

**Response `200`:** Array of the user's listings.

---

### GET `/api/listings/:id`
Get a single listing by ID.

**Response `200`:** Full listing object.

---

### POST `/api/listings`
Create a new listing (video or text ad).

**Auth:** Required

**Body:**
```json
{
  "vertical": "MARKETING",
  "title": "My Promo",
  "postType": "VIDEO",
  "videoUrl": "https://youtube.com/watch?v=...",
  "durationSeconds": 120,
  "description": "Optional description",
  "tags": ["marketing", "growth"],
  "ctaLabel": "Learn More",
  "ctaUrl": "https://example.com",
  "ctaType": "url",
  "revealUrl": true,
  "collectEmail": true
}
```

**Text Ad (postType = "TEXT") — omit videoUrl/durationSeconds:**
```json
{
  "vertical": "MARKETING",
  "title": "My Text Ad",
  "postType": "TEXT",
  "description": "Ad body copy here",
  "ctaLabel": "Contact Us",
  "ctaType": "contact"
}
```

**Response `201`:**
```json
{ "success": true, "listingId": 42, "scanStatus": "SCANNING" }
```

**scanStatus values:** `SCANNING` (uploaded video, Bif AI scanning) | `CLEAN`

---

### PATCH `/api/listings/:id/status`
Update listing status (pause, activate, remove).

**Auth:** Required (must own listing)

**Body:** `{ "status": "PAUSED" }`

**Status values:** `ACTIVE` | `PAUSED` | `REMOVED`

---

### GET `/api/listings/:id/scan-status`
Poll the AI scan status for an uploaded video.

**Response `200`:** `{ "scanStatus": "CLEAN" | "SCANNING" | "FLAGGED", "scanNote": "..." }`

---

### POST `/api/listings/:id/appeal`
Appeal a triaged or flagged listing.

**Auth:** Required

**Body:** `{ "reason": "My appeal explanation" }`

---

## 4. Likes

### POST `/api/videos/:id/like`
Toggle like on a listing.

**Auth:** Required

**Response `200`:** `{ "liked": true, "likeCount": 47 }`

---

### GET `/api/videos/:id/likes`
Get like count and whether the current user has liked.

**Response `200`:** `{ "liked": false, "likeCount": 47 }`

---

### GET `/api/videos/likes/batch`
Get like data for multiple listings at once.

**Query:** `?ids=1,2,3,4`

**Response `200`:** `{ "1": { "liked": true, "likeCount": 12 }, ... }`

---

## 5. Comments

### GET `/api/listings/:id/comments`
Get comments on a listing.

**Response `200`:** Array of comment objects.

---

### POST `/api/listings/:id/comments`
Post a comment on a listing.

**Auth:** Required

**Body:**
```json
{
  "body": "Great video!",
  "viewerUsername": "janesmith",
  "viewerEmail": "jane@example.com",
  "viewerCity": "Phoenix",
  "viewerState": "AZ",
  "viewerCountry": "USA"
}
```

---

### GET `/api/listings/comments/mine`
Get all comments received on the authenticated user's listings.

**Auth:** Required

---

### POST `/api/listings/comments/:id/reply`
Reply to a comment.

**Auth:** Required

**Body:** `{ "body": "Thanks for your comment!" }`

---

### PATCH `/api/listings/comments/:id/read`
Mark a comment as read.

**Auth:** Required

---

### DELETE `/api/listings/comments/:id`
Delete a comment.

**Auth:** Required (must own the listing)

---

### POST `/api/listings/comments/bulk-delete`
Delete multiple comments at once.

**Auth:** Required

**Body:** `{ "ids": [1, 2, 3] }`

---

## 6. Ad Inquiries

Inquiries submitted by viewers through right-rail sponsor ad CTAs.

### GET `/api/ad-inquiries`
Get all ad inquiries received by the authenticated provider.

**Auth:** Required

---

### POST `/api/ad-inquiries`
Submit an inquiry on a sponsor ad.

**Body:**
```json
{
  "adId": 5,
  "advertiserUsername": "joesmith",
  "viewerName": "Jane Doe",
  "viewerEmail": "jane@example.com",
  "viewerMessage": "I'm interested in your service",
  "viewerUsername": "janedoe"
}
```

---

### POST `/api/ad-inquiries/:id/reply`
Reply to an inquiry.

**Auth:** Required

**Body:** `{ "body": "Thanks for reaching out!" }`

---

### PATCH `/api/ad-inquiries/:id/read`
Mark an inquiry as read.

**Auth:** Required

---

### DELETE `/api/ad-inquiries/:id`
Delete an inquiry.

**Auth:** Required

---

### POST `/api/ad-inquiries/bulk-delete`
Delete multiple inquiries.

**Auth:** Required

**Body:** `{ "ids": [1, 2, 3] }`

---

## 7. Leads

Leads captured when a viewer interacts with a listing CTA.

### POST `/api/leads`
Submit a lead from a listing CTA interaction.

**Body:**
```json
{
  "listingId": 42,
  "viewerName": "Jane Doe",
  "viewerEmail": "jane@example.com",
  "viewerCity": "Scottsdale",
  "viewerState": "AZ",
  "viewerCountry": "USA"
}
```

---

### GET `/api/leads/mine`
Get all leads captured for the authenticated provider's listings.

**Auth:** Required

---

## 8. Sponsor Ads (Right Rail)

### GET `/api/sponsor-ads`
Get active sponsor ads for the right-rail display. Rotates every 5 seconds client-side.

**Query:** `?date=2026-03-16` (optional, for date-filtered slots)

**Response `200`:** Array of active `SponsorAd` objects.

---

## 9. GigJacks (Flash Events)

GigJacks are timed flash-sale events that interrupt the feed with a countdown overlay.

### GET `/api/gigjacks/live-state`
Get the current live GigJack state (polled every 3s by the client).

**Response `200`:**
```json
{
  "phase": "flash" | "offer" | "hidden",
  "gj": { ...GigJackObject },
  "flashSecondsRemaining": 45,
  "offerEndsAt": "2026-03-16T14:30:00Z"
}
```

---

### GET `/api/gigjacks/today`
Get all GigJacks scheduled for today.

---

### GET `/api/gigjacks/active`
Get currently active/approved GigJacks.

---

### GET `/api/gigjacks/mine`
Get all GigJacks submitted by the authenticated provider.

**Auth:** Required

---

### GET `/api/gigjacks/availability`
Get available time slots for booking a GigJack.

**Query:** `?date=2026-03-16`

---

### GET `/api/gigjacks/slots`
Get all booked slot times.

---

### POST `/api/gigjacks/submit`
Submit a GigJack for review.

**Auth:** Required

**Body:**
```json
{
  "companyUrl": "https://example.com",
  "artworkUrl": "https://cdn.example.com/artwork.png",
  "offerTitle": "50% Off Today Only",
  "description": "Flash deal on our flagship product",
  "ctaLink": "https://example.com/buy",
  "countdownMinutes": 15,
  "couponCode": "FLASH50",
  "quantityLimit": 100,
  "tagline": "Don't miss it",
  "category": "PRODUCTS",
  "scheduledAt": "2026-03-16T14:00:00Z",
  "bookedDate": "2026-03-16",
  "bookedHour": 14,
  "flashDurationSeconds": 7,
  "offerDurationMinutes": 10
}
```

---

## 10. Gigness Cards

The digital networking identity card system (GeeZee Cards / Rolodex).

### GET `/api/gigness-cards/mine`
Get the authenticated user's GeeZee Card.

**Auth:** Required

---

### GET `/api/gigness-cards`
Get all public GeeZee Cards (directory).

---

### GET `/api/gigcard-directory`
Get the full public GeeZee Card directory.

---

### GET `/api/gigness-cards/qr/:uuid`
Resolve a GeeZee Card by its QR UUID.

**Response `200`:** Full card object.

---

### POST `/api/gigness-cards`
Create or update the authenticated user's GeeZee Card.

**Auth:** Required

**Body:**
```json
{
  "displayName": "Joe Smith",
  "tagline": "Marketing Expert",
  "bio": "10 years experience...",
  "avatarUrl": "https://...",
  "primaryCategory": "Marketing",
  "location": "Phoenix, AZ",
  "contactEmail": "joe@example.com",
  "websiteUrl": "https://joesmith.com",
  "instagramUrl": "...",
  "youtubeUrl": "...",
  "tiktokUrl": "..."
}
```

---

### POST `/api/gigness-cards/broadcast`
Send a broadcast message to all connections.

**Auth:** Required

**Body:** `{ "message": "Check out my new offer!" }`

---

### GET `/api/gigness-cards/:id/comments`
Get comments on a GeeZee Card.

---

### POST `/api/gigness-cards/:id/comments`
Post a comment on a GeeZee Card.

**Auth:** Required

**Body:** `{ "body": "Great profile!" }`

---

### POST `/api/gigness-cards/:id/engage`
Engage with (like/follow) a GeeZee Card.

**Auth:** Required

---

### POST `/api/gigness-cards/:id/message`
Send a direct message via a GeeZee Card.

**Body:**
```json
{
  "senderName": "Jane Doe",
  "senderEmail": "jane@example.com",
  "body": "I'd love to connect"
}
```

---

### GET `/api/gigness-cards/inbox`
Get all messages received on the authenticated user's GeeZee Card.

**Auth:** Required

---

### POST `/api/gigness-cards/messages/:id/reply`
Reply to a card message.

**Auth:** Required

**Body:** `{ "body": "Thanks for reaching out!" }`

---

### PATCH `/api/gigness-cards/messages/:id/read`
Mark a card message as read.

**Auth:** Required

---

### DELETE `/api/gigness-cards/messages/:id`
Delete a card message.

**Auth:** Required

---

### POST `/api/gigness-cards/messages/bulk-delete`
Delete multiple card messages.

**Auth:** Required

**Body:** `{ "ids": [1, 2, 3] }`

---

## 11. Geo Campaigns (Preemptive Marketing)

Location-targeted push notification campaigns.

### GET `/api/geo-campaigns`
Get geo campaigns for the authenticated provider.

**Auth:** Required

---

### POST `/api/geo-campaigns`
Create a new geo campaign.

**Auth:** Required

**Body:**
```json
{
  "title": "Phoenix Flash Sale",
  "offer": "20% off today",
  "radiusMiles": 25,
  "city": "Phoenix",
  "state": "AZ",
  "country": "USA",
  "lat": "33.4484",
  "lng": "-112.0740",
  "imageUrl": "https://..."
}
```

---

### PATCH `/api/geo-campaigns/:id/status`
Activate or deactivate a geo campaign.

**Auth:** Required

**Body:** `{ "status": "active" | "paused" }`

---

### GET `/api/admin/geo-campaigns`
Admin: get all geo campaigns across all providers.

**Auth:** Admin required

---

## 12. All-Eyes Banner Ads

Full-width timed banner ad slots.

### GET `/api/all-eyes/active`
Get the currently active All-Eyes banner.

---

### GET `/api/all-eyes/upcoming`
Get upcoming All-Eyes slots.

---

### GET `/api/all-eyes/all`
Get all All-Eyes bookings.

**Auth:** Required

---

### POST `/api/all-eyes/book`
Book an All-Eyes banner slot.

**Auth:** Required

**Body:**
```json
{
  "title": "Big Sale Banner",
  "imageUrl": "https://...",
  "targetUrl": "https://example.com",
  "startsAt": "2026-03-16T10:00:00Z",
  "endsAt": "2026-03-16T11:00:00Z"
}
```

---

### PATCH `/api/all-eyes/:id/cancel`
Cancel an All-Eyes booking.

**Auth:** Required

---

## 13. Injected Feed (Live Broadcasts)

Admin-controlled feed injection to override the main feed with a live stream.

### GET `/api/injected-feed/active`
Get the currently active injected feed, if any.

**Response `200`:** Injected feed object or `null`.

---

### GET `/api/admin/injected-feeds`
Admin: get all injected feeds.

**Auth:** Admin required

---

### POST `/api/admin/injected-feeds`
Admin: create an injected feed entry.

**Auth:** Admin required

**Body:**
```json
{
  "platform": "YouTube",
  "sourceUrl": "https://youtube.com/live/...",
  "displayTitle": "Admin Live Feed",
  "injectMode": "immediate",
  "status": "active"
}
```

---

### PATCH `/api/admin/injected-feeds/:id`
Admin: update an injected feed.

**Auth:** Admin required

---

### DELETE `/api/admin/injected-feeds/:id`
Admin: delete an injected feed.

**Auth:** Admin required

---

## 14. Live Streams

Provider-initiated live sessions.

### GET `/api/live/active`
Get all currently active live streams.

---

### GET `/api/live/:id`
Get a specific live stream by ID.

---

### POST `/api/live/start`
Start a live stream session.

**Auth:** Required

**Body:** `{ "title": "My Live", "platform": "YouTube", "streamUrl": "https://..." }`

---

### PATCH `/api/live/:id/end`
End a live stream session.

**Auth:** Required

---

## 15. Love / Provider Leaderboard

### GET `/api/love/leaderboard`
Get the top-voted providers leaderboard.

**Response `200`:**
```json
[
  { "providerId": 4, "displayName": "Sofia Martinez", "voteCount": 12, "username": "sofia", "avatarUrl": "..." }
]
```

---

### POST `/api/love/:providerId`
Cast a love vote for a provider.

**Auth:** Required

---

### GET `/api/love/:providerId/status`
Check if the authenticated user has voted for a provider.

**Auth:** Required

**Response `200`:** `{ "voted": true }`

---

## 16. Audience Aggregator

Manage and broadcast to your audience list.

### GET `/api/my-audience`
Get the authenticated provider's audience members.

**Auth:** Required

---

### POST `/api/my-audience/broadcast`
Send a broadcast to all audience members.

**Auth:** Required

**Body:** `{ "subject": "New Drop!", "message": "Check out my latest..." }`

---

### GET `/api/my-audience/broadcasts`
Get broadcast history.

**Auth:** Required

---

## 17. Zito TV Events

Scheduled events in the Zito TV calendar.

### GET `/api/zitotv/events`
Get all Zito TV events.

---

### GET `/api/zitotv/events/:id`
Get a single event by ID.

---

### POST `/api/zitotv/events`
Create a Zito TV event.

**Auth:** Required

**Body:**
```json
{
  "title": "Product Launch Live",
  "description": "Watch us launch our new product",
  "startsAt": "2026-03-20T18:00:00Z",
  "endsAt": "2026-03-20T19:00:00Z",
  "category": "EVENTS"
}
```

---

### PATCH `/api/zitotv/events/:id`
Update an event.

**Auth:** Required

---

### DELETE `/api/zitotv/events/:id`
Delete an event.

**Auth:** Required

---

## 18. Ad Bookings (Calendar)

Paid sponsor ad slot bookings.

### GET `/api/ads/availability`
Check availability of ad slots for a date range.

**Query:** `?start=2026-03-01&end=2026-03-31`

**Response `200`:**
```json
{
  "2026-03-16": [
    { "slot": 1, "available": true },
    { "slot": 2, "available": false }
  ]
}
```

---

### POST `/api/ads/book`
Book an ad slot.

**Auth:** Required

**Body:**
```json
{
  "slot": 1,
  "date": "2026-03-20",
  "title": "My Campaign",
  "imageUrl": "https://...",
  "targetUrl": "https://example.com"
}
```

---

## 19. File Uploads

### POST `/api/upload/image`
Upload an image file. Returns a served URL.

**Auth:** Required

**Content-Type:** `multipart/form-data`
**Field:** `file` (image file, max 8MB)

**Response `200`:** `{ "url": "/uploads/filename.jpg" }`

---

### POST `/api/upload/video`
Upload a video file for a listing. Triggers Bif AI scan.

**Auth:** Required

**Content-Type:** `multipart/form-data`
**Field:** `file` (video file)

**Response `200`:** `{ "url": "/uploads/videos/filename.mp4" }`

---

### POST `/api/admin/upload-ad-image`
Admin: upload and process a sponsor ad image (auto-resized to 760×520).

**Auth:** Admin required

**Content-Type:** `multipart/form-data`
**Field:** `image`

**Response `200`:** `{ "url": "/ads/filename.png" }`

---

## 20. Admin — Users

### GET `/api/admin/users`
Get all users.

**Auth:** Admin required

---

### GET `/api/admin/users/:id/listings`
Get all listings for a specific user.

**Auth:** Admin required

---

### PATCH `/api/admin/users/:id/role`
Update a user's role.

**Auth:** Admin required

**Body:** `{ "role": "PROVIDER" }`

**Role values:** `VISITOR | PROVIDER | MEMBER | MARKETER | INFLUENCER | CORPORATE | SUPERUSER | ADMIN | SUPER_ADMIN | COORDINATOR`

---

### PATCH `/api/admin/users/:id/subscription-tier`
Update a user's subscription tier.

**Auth:** Admin required

**Body:** `{ "subscriptionTier": "GZ_PLUS" }`

**Tier values:** `GZLurker | GZ2 | GZ_PLUS | GZ_PRO`

---

### PATCH `/api/admin/users/:id/status`
Set a user's status (active/suspended).

**Auth:** Admin required

**Body:** `{ "status": "suspended" }`

---

### PATCH `/api/admin/users/:id/profile`
Admin: update a user's provider profile.

**Auth:** Admin required

---

### POST `/api/admin/users/:id/soft-delete`
Soft-delete a user account (sets deletedAt).

**Auth:** Admin required

---

### POST `/api/admin/users/:id/restore`
Restore a soft-deleted user.

**Auth:** Admin required

---

### DELETE `/api/admin/users/:id`
Hard-delete a user and all associated data.

**Auth:** Admin required

---

## 21. Admin — Listings

### PATCH `/api/admin/listings/:id/triage`
Flag a listing for review (triage).

**Auth:** Admin required

**Body:** `{ "reason": "Violates community guidelines" }`

---

### DELETE `/api/admin/listings/:id`
Hard-delete a listing.

**Auth:** Admin required

---

## 22. Admin — GigJacks

### GET `/api/admin/gigjacks`
Get all GigJack submissions.

**Auth:** Admin required

---

### PATCH `/api/admin/gigjacks/:id/review`
Approve or reject a GigJack.

**Auth:** Admin required

**Body:** `{ "status": "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT", "note": "Optional note" }`

---

### PATCH `/api/admin/gigjacks/:id/review-override`
Override a GigJack review decision.

**Auth:** Admin required

---

### PATCH `/api/admin/gigjacks/:id/edit`
Edit a GigJack's details before approval.

**Auth:** Admin required

---

### POST `/api/admin/gigjacks/:id/force-expire`
Force-expire an active GigJack immediately.

**Auth:** Admin required

---

### DELETE `/api/admin/gigjacks/:id`
Delete a GigJack submission.

**Auth:** Admin required

---

## 23. Admin — Sponsor Ads

### GET `/api/admin/sponsor-ads`
Get all sponsor ads.

**Auth:** Admin required

---

### POST `/api/admin/sponsor-ads`
Create a sponsor ad.

**Auth:** Admin required

**Body:**
```json
{
  "title": "Big Brand Ad",
  "body": "Ad copy text here",
  "imageUrl": "/ads/filename.png",
  "videoUrl": null,
  "adFormat": "TEXT",
  "targetUrl": "https://example.com",
  "ctaMode": "url",
  "contactUsername": "joesmith",
  "contactEmail": "joe@example.com",
  "contactMessage": "Pre-filled inquiry message",
  "cta": "Learn More",
  "sortOrder": 1
}
```

**adFormat values:** `TEXT` | `VIDEO`
**ctaMode values:** `url` | `contact` | `email`

---

### PATCH `/api/admin/sponsor-ads/:id`
Update a sponsor ad.

**Auth:** Admin required

---

### PATCH `/api/admin/sponsor-ads/:id/toggle`
Toggle a sponsor ad active/inactive.

**Auth:** Admin required

**Body:** `{ "active": true }`

---

### DELETE `/api/admin/sponsor-ads/:id`
Delete a sponsor ad.

**Auth:** Admin required

---

## 24. Admin — Injected Feeds

See [Section 13](#13-injected-feed-live-broadcasts).

---

## 25. Admin — Geo Campaigns

### GET `/api/admin/geo-campaigns`
Get all geo campaigns across all providers.

**Auth:** Admin required

---

## 26. Admin — Ad Bookings

### GET `/api/admin/ad-bookings`
Get all ad slot bookings.

**Auth:** Admin required

---

### PATCH `/api/admin/ad-bookings/:id/status`
Update booking status.

**Auth:** Admin required

**Body:** `{ "status": "approved" | "rejected" | "pending" }`

---

### DELETE `/api/admin/ad-bookings/:id`
Delete an ad booking.

**Auth:** Admin required

---

## 27. Admin — Stats & Audit Log

### GET `/api/admin/stats`
Platform-wide stats dashboard.

**Auth:** Admin required

**Response `200`:**
```json
{
  "totalUsers": 312,
  "totalListings": 891,
  "activeGigJacks": 2,
  "totalLeads": 504
}
```

---

### GET `/api/stats/daily`
Get the authenticated user's daily posting stats and limits.

**Auth:** Required

**Response `200`:**
```json
{
  "count": 1,
  "maxCap": 1,
  "canPost": false
}
```

---

### GET `/api/admin/audit-log`
Get the admin audit log (all admin actions).

**Auth:** Admin required

---

### POST `/api/scan/callback`
Internal webhook called by Bif AI scanner when a video scan completes.

**Body:** `{ "listingId": 42, "status": "CLEAN" | "FLAGGED", "note": "..." }`

---

## 28. Data Models

### User
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| email | text | Unique |
| role | enum | See role values below |
| subscriptionTier | enum | GZLurker / GZ2 / GZ_PLUS / GZ_PRO |
| status | text | active / suspended |
| emailVerified | boolean | |
| createdAt | timestamp | |

**Role values:** `VISITOR | PROVIDER | MEMBER | MARKETER | INFLUENCER | CORPORATE | SUPERUSER | ADMIN | SUPER_ADMIN | COORDINATOR`

---

### ProviderProfile
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| userId | integer | FK → users |
| username | text | Unique handle |
| displayName | text | |
| bio | text | |
| avatarUrl | text | |
| primaryCategory | text | |
| location | text | |
| contactEmail | text | |
| contactPhone | text | |
| websiteUrl | text | |
| instagramUrl / youtubeUrl / tiktokUrl / facebookUrl / twitterUrl / discordUrl | text | Social links |
| photo1Url–photo6Url | text | Gallery photos |
| webhookUrl | text | Outbound webhook for leads |
| adFormat | text | TEXT / VIDEO preference |

---

### VideoListing
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| providerId | integer | FK → provider_profiles |
| vertical | enum | Category |
| title | text | |
| postType | text | VIDEO / TEXT |
| videoUrl | text | Nullable — null for text ads |
| durationSeconds | integer | Nullable |
| description | text | |
| tags | text[] | |
| ctaLabel / ctaUrl / ctaType | text | Call to action |
| status | enum | ACTIVE / PAUSED / REMOVED / TRIAGED |
| scanStatus | text | CLEAN / SCANNING / FLAGGED |
| likeCount | integer | |
| dropDate | date | |
| collectEmail / revealUrl / revealEmail | boolean | Lead capture settings |

**Vertical values:** `MARKETING | COACHING | COURSES | MUSIC | CRYPTO | INFLUENCER | PRODUCTS | FLASH_SALE | FLASH_COUPON | MUSIC_GIGS | EVENTS | CORPORATE_DEALS | ARTISTS | BUSINESS | FOR_SALE`

---

### GigJack
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| providerId | integer | FK → provider_profiles |
| offerTitle | text | Flash event headline |
| description | text | |
| ctaLink | text | Action URL |
| countdownMinutes | integer | Flash countdown length |
| couponCode | text | Optional |
| scheduledAt | timestamp | When the flash fires |
| flashDurationSeconds | integer | Default 7s |
| offerDurationMinutes | integer | Default 10min |
| status | enum | PENDING_REVIEW / APPROVED / REJECTED / NEEDS_IMPROVEMENT / DENIED |

---

### SponsorAd
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| title | text | |
| body | text | Ad copy |
| imageUrl | text | Served from `/ads/` |
| videoUrl | text | Nullable |
| adFormat | text | TEXT / VIDEO |
| targetUrl | text | Click destination |
| ctaMode | text | url / contact / email |
| cta | text | Button label |
| active | boolean | |
| sortOrder | integer | Rotation order |

---

*Document generated: March 2026 — Gigzito Platform v1*
