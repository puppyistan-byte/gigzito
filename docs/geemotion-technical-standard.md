# Geemotions — Technical Standard
**Gigzito Platform | GeeZee Card Subsystem**
Version 1.0 · March 2026

---

## 1. Overview

A **Geemotion** is a short-form status update posted by a GeeZee card owner. Geemotions are attached to the author's GeeZee card identity — not to a video listing or provider profile. They are the real-time expression layer of the GeeZee card system, visible to any authenticated user who follows the card.

Geemotions are ephemeral by design: lightweight, high-frequency updates that function like public micro-broadcasts tied to card identity.

---

## 2. Eligibility

| Rule | Detail |
|---|---|
| **Poster** | Any authenticated user who owns a GeeZee card (`gigness_cards.user_id`) |
| **Visibility** | All Geemotions from a card are visible if the card's `is_public = true`. Private cards suppress the author's Geemotions from all feeds. |
| **Viewer** | Any authenticated user. Unauthenticated users cannot view the feed. |
| **Feed delivery** | Only users who have followed the card's owner (`geezee_follows`) receive Geemotions in their dashboard feed. |

---

## 3. Content Specification

### 3.1 Text

| Field | Rule |
|---|---|
| `text` | Optional. Plain text only — no HTML or markdown. |
| **Max length** | 500 characters |
| **Min requirement** | At least one of `text` or `mediaUrl` must be present. An empty Geemotion is rejected. |
| Encoding | UTF-8. Emoji are valid characters and count toward the 500-character limit. |
| Line breaks | Preserved as-is. Max 10 line breaks per post. |

### 3.2 Media

| Field | Rule |
|---|---|
| `mediaUrl` | Optional. Absolute URL (external GIF or CDN) or a Gigzito upload path (`/uploads/…`). |
| `mediaType` | Required when `mediaUrl` is set. Must be one of: `image`, `gif`, `sticker`. |
| **Accepted image formats** | PNG, JPEG, WEBP |
| **Max upload file size** | 10 MB per file (enforced at `POST /api/upload/image`) |
| **External GIF URLs** | Must begin with `https://`. HTTP (non-secure) URLs are rejected. |
| **Stickers** | Preset sticker URLs served from Gigzito CDN. Custom sticker URLs from third-party hosts are not permitted. |
| Video | Not supported in v1.0. Video Geemotions are reserved for a future tier. |

### 3.3 Combined Posts

A Geemotion may include both `text` and `mediaUrl`. There is no penalty or format distinction — both fields render in the feed together.

---

## 4. Rate Limits

| Tier | Posts per 24 h |
|---|---|
| GZ Lurker | 5 |
| GZ2 | 15 |
| GZ+ | 50 |
| GZ PRO | Unlimited |

> Rate limits are enforced at the API layer (`POST /api/zee-motions`). Requests beyond the limit receive `429 Too Many Requests`.

*Note: Rate limiting is specified here but not yet enforced in v1.0. It must be implemented before any public Geemotion feature launch.*

---

## 5. Retention & Deletion

| Rule | Detail |
|---|---|
| **Retention** | Geemotions are kept indefinitely until deleted by the author or the account is removed. |
| **Author delete** | `DELETE /api/zee-motions/:id` — only the original author (matching `user_id`) may delete. |
| **Cascade delete** | Deleting a GeeZee card or user account cascades and removes all associated Geemotions. |
| **Admin delete** | SUPER_ADMIN may delete any Geemotion via the admin panel (planned). |
| **Feed appearance** | Deleted Geemotions disappear from all follower feeds immediately on next query — no soft-delete or grace period. |

---

## 6. Follow System

Geemotions reach viewers through the GeeZee follow graph (`geezee_follows` table).

| Rule | Detail |
|---|---|
| **Follow target** | A `user_id` (the GeeZee card owner), not a card `id`. One user = one card = one follow target. |
| **Unique constraint** | A user may follow a given card owner only once (`UNIQUE (follower_id, following_user_id)`). |
| **Self-follow** | Prohibited. `POST /api/geezee-follows/:userId` rejects if `followerId === followingUserId`. |
| **Unfollow** | `DELETE /api/geezee-follows/:userId` — hard delete, no archive. |
| **Follow required tier** | Any authenticated user may follow. No tier restriction. |

---

## 7. Feed Behavior

- The feed (`GET /api/zee-motions/feed`) returns all Geemotions from every user the caller follows, ordered by `created_at DESC`.
- Each feed entry includes: `id`, `userId`, `text`, `mediaUrl`, `mediaType`, `createdAt`, `username`, `displayName`, `avatarUrl`.
- The feed does **not** paginate in v1.0 — the full result set is returned. Pagination must be added before the follow graph grows beyond ~200 connections per user.
- Feed entries from users whose GeeZee card is private (`is_public = false`) are excluded from the result set at the query layer.

---

## 8. Database Schema

```sql
-- Geemotions
CREATE TABLE zee_motions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT,
  media_url   TEXT,
  media_type  TEXT,                           -- 'image' | 'gif' | 'sticker'
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GeeZee Follow graph
CREATE TABLE geezee_follows (
  id                SERIAL PRIMARY KEY,
  follower_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT geezee_follows_unique UNIQUE (follower_id, following_user_id)
);
```

---

## 9. API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/zee-motions` | Required | Create a Geemotion |
| `GET` | `/api/zee-motions/mine` | Required | List caller's own Geemotions |
| `GET` | `/api/zee-motions/feed` | Required | Geemotion feed from followed users |
| `DELETE` | `/api/zee-motions/:id` | Required | Delete own Geemotion |
| `POST` | `/api/geezee-follows/:userId` | Required | Follow a GeeZee card owner |
| `DELETE` | `/api/geezee-follows/:userId` | Required | Unfollow a GeeZee card owner |
| `GET` | `/api/geezee-follows/status/:userId` | Required | Check follow status — returns `{ following: boolean }` |

### POST /api/zee-motions — Request Body

```json
{
  "text": "string (optional, max 500 chars)",
  "mediaUrl": "string (optional)",
  "mediaType": "image | gif | sticker (required if mediaUrl present)"
}
```

### Error Codes

| Code | Scenario |
|---|---|
| `400` | Missing both text and media; mediaUrl present but mediaType missing; text exceeds 500 chars |
| `401` | Not authenticated |
| `403` | Attempting to delete another user's Geemotion; attempting self-follow |
| `404` | Geemotion or follow target not found |
| `429` | Rate limit exceeded (when enforced) |

---

## 10. UI Constraints

| Element | Rule |
|---|---|
| Text area | `maxLength={500}`. Character counter displayed (`n/500`). |
| Slogan (card-level) | Separate field, `maxLength={120}`. Not a Geemotion field. |
| Emoji picker | Inserts at cursor position. Counts toward 500-char limit. |
| GIF picker | Inserts external HTTPS URL. Sets `mediaType = 'gif'`. |
| Sticker picker | Inserts preset CDN URL. Sets `mediaType = 'sticker'`. |
| Image upload | Calls `POST /api/upload/image`. Returns `/uploads/…` path. Sets `mediaType = 'image'`. |
| Preview in feed | Text renders with whitespace preserved. Media renders as `<img>` with `onError` fallback (hidden). |
| Max media per post | 1 (single media attachment per Geemotion in v1.0) |

---

## 11. Open Items (v1.0 → v1.1)

| # | Item | Priority |
|---|---|---|
| 1 | Enforce per-tier rate limits at API layer | High |
| 2 | Paginate feed endpoint (cursor-based) | High |
| 3 | Reactions on Geemotions (emoji react, not engagement count) | Medium |
| 4 | Geemotion video support (GZ PRO tier only) | Medium |
| 5 | Push notification to followers on new Geemotion | Medium |
| 6 | Admin moderation panel (flag, delete, ban from posting) | Medium |
| 7 | Geemotion expiry setting (24 h / 72 h / permanent) | Low |
| 8 | Multi-media attachments (up to 4 images) | Low |
