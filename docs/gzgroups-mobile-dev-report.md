# GZGroups Module — Mobile Developer Reference
**Gigzito Platform · Updated April 23, 2026 (Kitty v2 + Admin Approve + Goals → Server + Image Uploads on All Walls)**

---

## 1. Overview

GZGroups is a private-group workspace feature. Each group is a self-contained community with a wall, projects, a kanban board, crypto wallets, social media links, a goals tracker, a calendar, and a members roster.

**Access gate:** A user must have `subscriptionTier >= "GZGroups"` OR have `groupsEnabled = true` on their user record. Without this, the GZGroups section is hidden entirely.

**Route:** `/groups` (list) → `/groups/:id` (detail)

---

## 2. Database Schema

### 2.1 `groups` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | auto-increment |
| `name` | text | required |
| `description` | text | defaults to `""` |
| `cover_url` | text | nullable — banner image URL |
| `invite_code` | text | unique random string, server-generated |
| `is_private` | boolean | default `true` |
| `created_by` | integer FK → users | owner |
| `created_at` | timestamp | auto |
| `link_x` | text | Twitter/X URL |
| `link_fb` | text | Facebook URL |
| `link_ig` | text | Instagram URL |
| `link_telegram` | text | Telegram URL |
| `link_youtube` | text | YouTube URL |
| `link_rumble` | text | Rumble URL |
| `link_reddit` | text | Reddit URL |
| `link_website` | text | General website URL |

### 2.2 `group_members` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `user_id` | integer FK → users | |
| `role` | text | `"admin"` or `"member"` |
| `status` | text | `"pending"`, `"accepted"`, `"declined"` |
| `invited_by` | integer FK → users | nullable |
| `created_at` | timestamp | |

Unique constraint: `(group_id, user_id)`.

### 2.3 `group_wall_posts` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `user_id` | integer FK → users | author |
| `content` | text | post body |
| `image_url` | text | nullable — path to attached image e.g. `/uploads/…` *(added April 23, 2026)* |
| `created_at` | timestamp | |

### 2.4 `group_wall_comments` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `post_id` | integer FK → group_wall_posts | |
| `user_id` | integer FK → users | |
| `content` | text | |
| `created_at` | timestamp | |

### 2.5 `group_endeavors` table (Projects)
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `title` | text | required |
| `description` | text | |
| `goal_progress` | integer | 0–100 |
| `link_x` | text | per-project social links |
| `link_fb` | text | |
| `link_ig` | text | |
| `link_telegram` | text | |
| `link_youtube` | text | |
| `link_rumble` | text | |
| `link_reddit` | text | |
| `created_by` | integer FK → users | |
| `created_at` | timestamp | |

### 2.6 `group_endeavor_comments` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `endeavor_id` | integer FK → group_endeavors | |
| `user_id` | integer FK → users | |
| `content` | text | |
| `created_at` | timestamp | |

### 2.7 `group_events` table (Calendar)
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `title` | text | |
| `description` | text | |
| `start_at` | timestamp | |
| `end_at` | timestamp | nullable |
| `all_day` | boolean | |
| `created_by` | integer FK → users | |
| `created_at` | timestamp | |

### 2.8 `group_kanban_cards` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer | |
| `title` | text | |
| `description` | text | nullable |
| `status` | text | column name — admin-configurable; default `"todo"` |
| `position` | integer | sort order within column |
| `priority` | text | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `deadline` | timestamp | nullable |
| `assigned_to` | integer FK → users | nullable |
| `impact_level` | text | nullable — for impact/effort matrix |
| `effort_level` | text | nullable |
| `endeavor_id` | integer FK → group_endeavors | nullable |
| `created_by` | integer | |
| `created_at` | timestamp | |

### 2.9 `group_retrospectives` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer | |
| `user_id` | integer | |
| `display_name` | text | snapshot of author's name |
| `avatar_url` | text | snapshot |
| `win` | text | "What went well" |
| `roadblock` | text | "What blocked us" |
| `created_at` | timestamp | |

### 2.10 `group_wallets` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `label` | text | display name for the wallet |
| `network` | text | `"ETH"`, `"BTC"`, `"SOL"`, `"MATIC"`, `"BNB"`, `"USDT"`, `"USDC"`, `"XRP"`, `"LINK"` |
| `address` | text | on-chain address or custom link |
| `link` | text | optional explorer/external URL |
| `goal_amount` | real | nullable funding goal |
| `goal_currency` | text | nullable |
| `goal_label` | text | nullable label for the goal |
| `created_by` | integer | |
| `created_at` | timestamp | |

### 2.11 `group_wallet_contributions` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `wallet_id` | integer FK → group_wallets | |
| `group_id` | integer | |
| `user_id` | integer | |
| `amount` | real | |
| `currency` | text | default `"USD"` |
| `tx_hash` | text | nullable |
| `note` | text | nullable |
| `display_name` | text | snapshot |
| `avatar_url` | text | snapshot |
| `verified` | boolean | admin-toggleable |
| `created_at` | timestamp | |

### 2.12 `group_goals` table *(added April 21 2026)*
| Column | Type | Notes |
|---|---|---|
| `group_id` | integer PK FK → groups | One row per group, CASCADE delete |
| `data` | json | Full `GoalData` blob — see Section 11 |
| `updated_at` | timestamp | Auto-set on upsert |

### 2.13 `group_email_invites` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer FK → groups | |
| `email` | text | invitee email |
| `invited_by` | integer FK → users | |
| `token` | text | unique random string |
| `group_name` | text | snapshot |
| `inviter_name` | text | snapshot |
| `claimed_at` | timestamp | nullable — set when accepted |
| `created_at` | timestamp | |

---

## 3. API Endpoints

All endpoints require a valid authenticated session cookie. `isAdmin` in the descriptions below means the caller has `role = "admin"` in `group_members` for that group.

### 3.1 Group CRUD

| Method | Path | Auth | Body / Params | Returns |
|---|---|---|---|---|
| GET | `/api/groups` | member | — | Array of groups the current user belongs to |
| POST | `/api/groups` | any | `{ name, description?, coverUrl?, isPrivate? }` | New group object |
| GET | `/api/groups/:id` | member or public-group | — | Group object with `myRole`, `myStatus`, `memberCount` |
| PATCH | `/api/groups/:id` | admin | Any group fields incl. all `link_*` fields | Updated group |
| DELETE | `/api/groups/:id` | admin | — | `{ message: "Deleted" }` |

**PATCH `/api/groups/:id` — editable fields:**
```
name, description, coverUrl, isPrivate,
linkX, linkFb, linkIg, linkTelegram, linkYoutube, linkRumble, linkReddit, linkWebsite
```

### 3.2 Members & Invites

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/members` | member | Returns all members with `role`, `status`, `displayName`, `avatarUrl`, `username`, `email` |
| POST | `/api/groups/:id/invite` | admin | Body: `{ userId }` — invite by user ID. Sends in-app notification + email |
| POST | `/api/groups/:id/invite/email` | admin | Body: `{ email }` — invite by email. If user exists, invites directly; otherwise creates email invite + sends join link |
| GET | `/api/groups/join/:token` | any | Returns `{ groupId, groupName, inviterName, email }` for a token |
| POST | `/api/groups/join/:token` | logged-in | Claims email invite and joins the group |
| POST | `/api/groups/:id/invite/respond` | member | Body: `{ accept: boolean }` — accept or decline a pending invite |
| POST | `/api/groups/:id/join-request` | any | Request to join a public group |
| PATCH | `/api/groups/:id/members/:uid/approve` | admin | Approve a pending member — sets `status = "accepted"` |
| DELETE | `/api/groups/:id/members/:uid` | admin | Remove a member from the group |
| GET | `/api/groups/invites` | any | Returns pending invites for the current user |
| GET | `/api/groups/search-users` | admin | Query: `?q=...&groupId=...` — search users to invite |
| GET | `/api/groups/featured` | any | Returns up to 3 featured/public groups |

### 3.3 Wall

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/wall` | member | Returns posts with `commentCount`, `displayName`, `avatarUrl`, `username`, `imageUrl` |
| POST | `/api/groups/:id/wall` | member | Body: `{ content, imageUrl? }` — create post; `imageUrl` is optional |
| DELETE | `/api/groups/:id/wall/:postId` | admin or author | Delete a post |
| GET | `/api/groups/:id/wall/:postId/comments` | member | Returns comments for a post |
| POST | `/api/groups/:id/wall/:postId/comments` | member | Body: `{ content }` — add comment |
| DELETE | `/api/groups/:id/wall/:postId/comments/:commentId` | admin or author | Delete a comment |

### 3.4 Endeavors (Projects)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/endeavors` | member | Returns all endeavors |
| POST | `/api/groups/:id/endeavors` | admin | Body: `{ title, description?, goalProgress?, linkX?, linkFb?, linkIg?, linkTelegram?, linkYoutube?, linkRumble?, linkReddit? }` |
| PATCH | `/api/groups/:id/endeavors/:eid` | admin | Partial update of any endeavor field |
| DELETE | `/api/groups/:id/endeavors/:eid` | admin | |
| GET | `/api/groups/:id/endeavors/:eid/comments` | member | Project Updates comments |
| POST | `/api/groups/:id/endeavors/:eid/comments` | member | Body: `{ content }` — add update comment |

### 3.5 Calendar / Events

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/events` | member | Returns all events |
| POST | `/api/groups/:id/events` | admin | Body: `{ title, description?, startAt, endAt?, allDay? }` |
| PATCH | `/api/groups/:id/events/:eid` | admin | Partial update |
| DELETE | `/api/groups/:id/events/:eid` | admin | |

### 3.6 Kanban

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/kanban` | member | Returns all cards |
| POST | `/api/groups/:id/kanban` | admin | Body: `{ title, description?, status?, priority?, deadline?, assignedTo?, impactLevel?, effortLevel?, endeavorId? }` |
| PATCH | `/api/groups/:id/kanban/:cid` | admin | Partial update — also used for drag-to-reorder (`status` + `position`) |
| DELETE | `/api/groups/:id/kanban/:cid` | admin | |

**Kanban columns** (status values) are configurable by the admin. The default set is:
`todo`, `in-progress`, `blocked`, `done`
Admins can rename/add/remove columns via a column picker stored client-side in `localStorage` under key `gz-kanban-columns-{groupId}`.

### 3.7 Retrospectives

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/retrospectives` | member | Returns retros, newest first |
| POST | `/api/groups/:id/retrospectives` | member | Body: `{ win, roadblock }` — creates a retro entry |

### 3.8 Wallets & Contributions

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/wallets` | member | Returns all wallets for the group |
| POST | `/api/groups/:id/wallets` | admin | Body: `{ label, network, address, link?, goalAmount?, goalCurrency?, goalLabel? }` |
| DELETE | `/api/groups/:id/wallets/:wid` | admin | |
| GET | `/api/groups/:id/wallets/:wid/contributions` | member | Returns contributions for a wallet |
| POST | `/api/groups/:id/wallets/:wid/contributions` | member | Body: `{ amount, currency?, txHash?, note? }` — log a contribution |
| GET | `/api/groups/:id/wallets/:wid/balance` | member | Returns on-chain balance if applicable |
| PATCH | `/api/groups/:id/wallets/:wid/contributions/:cid/verify` | admin | Body: `{ verified: boolean }` — mark a contribution verified |

---

## 4. Page Layout

The group detail page (`/groups/:id`) is a two-column layout on desktop, single column on mobile.

```
┌──────────────────────────────────────────────────────────┐
│                    BANNER (coverUrl)                     │
│   [Lock/Globe icon]  [Admin badge]                       │
│   Group Name                              [← Back] [⚙]  │
│   Description · N members                               │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────┬───────────────────────────┐
│  [wall] [endeavors] [kanban] │   Goals Thermometer       │
│  [wallet] [links]            │   Calendar Sidebar        │
│                              │   Members Sidebar         │
│  TAB CONTENT                 │                           │
└──────────────────────────────┴───────────────────────────┘
```

On mobile: banner spans full width at top, right rail (Goals / Calendar / Members) stacks below tab content.

---

## 5. Banner (Group Wallpaper / Cover Photo)

### 5.1 Database Field

| Table | Column | Type | Nullable |
|---|---|---|---|
| `groups` | `cover_url` | `text` | yes |

Stores the server-relative path to the uploaded image, e.g. `/uploads/1776726745011-bcaf99a50c0c182a.png`.

**HotStove Ministries (group id=6) current file:**
```
/uploads/1776726745011-bcaf99a50c0c182a.png
```
- Filename format: `{unix-timestamp-ms}-{random-hex}.{ext}`
- Uploaded: April 20, 2026 at 23:12 UTC
- File size: 931 KB
- Full URL on VPS: `https://gigzito.com/uploads/1776726745011-bcaf99a50c0c182a.png`

---

### 5.2 Upload Flow (step by step)

1. **Admin taps/clicks the banner area** — a hover overlay (camera icon + "Change Banner Photo" label) appears over the banner. This overlay is **admin-only** and invisible to regular members.
2. **File picker opens** — hidden `<input type="file" accept="image/*">` triggered by the label click. Any image format is accepted.
3. **Upload to server:**
   ```
   POST /api/upload/image
   Content-Type: multipart/form-data
   Field name: "file"
   ```
   - The file is first saved to a **quarantine directory** and scanned for safety before being moved to `/uploads/`.
   - On success: returns `{ url: "/uploads/{timestamp}-{hash}.ext" }`
4. **Save URL to group:**
   ```
   PATCH /api/groups/:id
   Body: { "coverUrl": "/uploads/1776726745011-bcaf99a50c0c182a.png" }
   ```
   - Auth: must be group admin.
   - Returns the updated group object.
   - Frontend invalidates the `["/api/groups", groupId]` query cache so the new image loads immediately.
5. **Loading state:** During upload, the overlay shows "Uploading…" text instead of the camera icon.

**No removal endpoint exists.** There is no way to delete a banner and revert to the fallback gradient through the UI — only replace it with a new image.

---

### 5.3 Display / Rendering

| Property | Value |
|---|---|
| Height | 180px (fixed) |
| Width | Full container width |
| `object-fit` | `cover` (fills the box, crops edges) |
| `object-position` | default (center) |
| Gradient overlay | `linear-gradient(to top, black/70, black/20, transparent)` — bottom-heavy, so text is always readable |
| Fallback (no image) | `background: linear-gradient(135deg, red-600, red-900)` |
| Border radius | `border-radius: 1rem` (rounded-2xl) |
| Overflow | hidden |

**Overlay content (always visible, on top of image or gradient):**

Bottom-left stack:
- Privacy icon: 🔒 (Lock) if private, 🌐 (Globe) if public
- "Admin" badge (red pill) — only shown to the admin themselves
- Group name (white, 2xl bold)
- Group description (white/70, truncated to 1 line)
- Member count (white/60, xs)

Bottom-right buttons:
- **Back** (chevron-left) → navigates to `/groups`
- **Settings** (gear icon) → opens the Edit Group modal — **admin only**

---

### 5.4 Responsive Behavior

The banner exists in **two separate DOM instances** — both use the same `handleBannerUpload` function:

| Instance | CSS class | Shown when |
|---|---|---|
| Mobile banner | `lg:hidden` | viewport < 1024px |
| Desktop banner | `hidden lg:block` | viewport ≥ 1024px |

The desktop banner sits inside the main content column (left of the right rail). The mobile banner sits above the full content area. Both render identically except for their containing layout.

---

### 5.5 API Reference

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/upload/image` | any authenticated user | `multipart/form-data`, field `file`. Returns `{ url: "/uploads/..." }` |
| PATCH | `/api/groups/:id` | group admin only | Pass `{ coverUrl: "/uploads/..." }` to update the banner. Can be combined with other fields (name, description, etc.) |

---

### 5.6 Mobile Implementation Notes

- **No localStorage** — the banner URL is part of the `GET /api/groups/:id` response as `coverUrl`.
- For native mobile: use the platform's image picker, upload to `POST /api/upload/image` as `multipart/form-data` with the field named `file`, then call `PATCH /api/groups/:id` with the returned URL.
- The quarantine scan on the server is transparent — from the client's perspective it's a standard multipart upload that returns a URL.
- Show an uploading spinner/state during the two-step process (upload → patch).
- Only show the "change banner" control to group admins (`myRole === "admin"` in the group response).

---

## 6. Tab: Wall

**Purpose:** Group message board. Any member can post; admin and the original author can delete.

**API calls:**
- Load posts: `GET /api/groups/:id/wall`
- Create post (text only): `POST /api/groups/:id/wall` `{ content }`
- Create post (with image): `POST /api/groups/:id/wall` `{ content, imageUrl: "/uploads/..." }` — see Section 20 for the full two-step upload flow
- Delete post: `DELETE /api/groups/:id/wall/:postId`
- Load comments: `GET /api/groups/:id/wall/:postId/comments` (triggered on expand)
- Post comment: `POST /api/groups/:id/wall/:postId/comments` `{ content }`
- Delete comment: `DELETE /api/groups/:id/wall/:postId/comments/:commentId`

**Post object:**
```json
{
  "id": 1,
  "groupId": 5,
  "userId": 7,
  "content": "Hello everyone",
  "imageUrl": "/uploads/1776726745011-bcaf99a50c0c182a.png",
  "createdAt": "2026-04-20T10:00:00Z",
  "displayName": "Brandon",
  "avatarUrl": "https://...",
  "username": "brandon",
  "commentCount": 3
}
```
> `imageUrl` is `null` when no image was attached. Always render it if present.

**Comment object:**
```json
{
  "id": 12,
  "postId": 1,
  "userId": 9,
  "content": "Great post!",
  "createdAt": "...",
  "displayName": "Mike B",
  "avatarUrl": null,
  "username": "mikeb"
}
```

**UI details:**
- Compose textarea at top, "Post" button (red). Disabled when empty.
- Each post card shows: avatar, displayName, time-ago, content.
- Comment toggle button shows `N comments`. Expands inline comment thread.
- Delete button visible to admin and post author.

---

## 7. Tab: Endeavors (Projects)

**Purpose:** Track group projects/goals with a progress bar and a comments feed ("Project Updates").

**API calls:**
- Load: `GET /api/groups/:id/endeavors`
- Create: `POST /api/groups/:id/endeavors` (admin)
- Update progress: `PATCH /api/groups/:id/endeavors/:eid` `{ goalProgress: 0-100 }`
- Delete: `DELETE /api/groups/:id/endeavors/:eid` (admin)
- Load updates: `GET /api/groups/:id/endeavors/:eid/comments`
- Post update: `POST /api/groups/:id/endeavors/:eid/comments` `{ content }`

**Endeavor object:**
```json
{
  "id": 3,
  "groupId": 5,
  "title": "Launch website",
  "description": "Get v1 live before May",
  "goalProgress": 60,
  "linkX": null,
  "linkFb": null,
  "linkIg": null,
  "linkTelegram": "https://t.me/...",
  "linkYoutube": null,
  "linkRumble": null,
  "linkReddit": null,
  "createdAt": "..."
}
```

**UI details:**
- "+ Add" button (admin only) opens a modal: Title field, Description field, optional progress slider.
- Each endeavor card shows: title, description, progress bar (0–100%).
- Admin: inline slider to update progress, delete button.
- "Project Updates" button opens a slide-over comments panel for that endeavor.
- Each endeavor can have its own social media links (X, FB, IG, Telegram, YouTube, Rumble, Reddit) — shown as small icon chips under the card.

---

## 8. Tab: Kanban

**Purpose:** Task management board with drag-and-drop columns, priority, deadline, assignment, impact/effort matrix.

**API calls:**
- Load cards: `GET /api/groups/:id/kanban`
- Create card: `POST /api/groups/:id/kanban` (admin)
- Move/update card: `PATCH /api/groups/:id/kanban/:cid`
- Delete card: `DELETE /api/groups/:id/kanban/:cid` (admin)

**Card object:**
```json
{
  "id": 7,
  "groupId": 5,
  "title": "Build login page",
  "description": "Include OAuth",
  "status": "in-progress",
  "position": 2,
  "priority": "high",
  "deadline": "2026-05-01T00:00:00Z",
  "assignedTo": 7,
  "impactLevel": "high",
  "effortLevel": "medium",
  "endeavorId": 3,
  "createdBy": 7,
  "createdAt": "..."
}
```

**Columns (status values):**
- Stored in `localStorage` under key `gz-kanban-columns-{groupId}`.
- Default columns: `todo`, `in-progress`, `blocked`, `done`.
- Admin can add, rename, or remove columns via a column picker UI.
- When a column is renamed, all cards with the old `status` are migrated via `PATCH` calls.

**Card form fields:**
- Title (required)
- Description
- Priority: `low` (gray) / `medium` (blue) / `high` (orange) / `critical` (red)
- Deadline (date picker)
- Assigned To (member picker — dropdown of accepted members)
- Link to Endeavor (dropdown of group endeavors)
- Impact Level / Effort Level (for matrix view toggle)

**UI details:**
- Cards displayed in columns, sorted by `position`.
- Drag card to another column: fires `PATCH` with new `status` and updated `position`.
- Priority shown as colored badge.
- Deadline shown with countdown; turns red if past due.
- Assigned member shown as avatar.
- Matrix view toggle: switches from columns view to impact/effort 2×2 grid.

---

## 9. Tab: Wallet

**Purpose:** Log and track group crypto wallets and member contributions.

**API calls:**
- Load wallets: `GET /api/groups/:id/wallets`
- Add wallet: `POST /api/groups/:id/wallets` (admin)
- Delete wallet: `DELETE /api/groups/:id/wallets/:wid` (admin)
- Load contributions: `GET /api/groups/:id/wallets/:wid/contributions`
- Log contribution: `POST /api/groups/:id/wallets/:wid/contributions`
- Verify contribution: `PATCH /api/groups/:id/wallets/:wid/contributions/:cid/verify` (admin)

**Supported networks:**
| Value | Label | Color |
|---|---|---|
| ETH | Ethereum | indigo |
| BTC | Bitcoin | orange |
| SOL | Solana | purple |
| MATIC | Polygon | violet |
| BNB | BNB Chain | yellow |
| USDT | USDT | green |
| USDC | USDC | blue |
| XRP | XRP | cyan |
| LINK | Custom Link | gray |

**Wallet display:**
- Network colored badge + label
- Truncated address with copy-to-clipboard button
- "View on Explorer" link (network-specific, e.g., Etherscan for ETH)
- Goal bar if `goalAmount` is set: shows progress of total verified contributions
- Contributions list: contributor avatar + name, amount, currency, tx hash chip, verified checkmark

**Contribution form fields:** Amount, Currency (USD/crypto), Transaction Hash (optional), Note (optional).

---

## 10. Tab: Links

**Purpose:** Group-level social media directory. One set of links per group, not per project.

**Data source:** Fields on the `groups` table (`link_x`, `link_fb`, `link_ig`, `link_telegram`, `link_youtube`, `link_rumble`, `link_reddit`, `link_website`).

**Edit:** Admin-only "Edit Links" button opens a modal with 8 URL inputs. Saved via `PATCH /api/groups/:id`.

**Display:** Each configured link shown as a branded icon tile with platform name. Clicking opens the link in a new tab.

| Platform | Icon color | Field |
|---|---|---|
| X (Twitter) | black/white | `linkX` |
| Facebook | #1877F2 blue | `linkFb` |
| Instagram | gradient pink/purple | `linkIg` |
| Telegram | #2AABEE blue | `linkTelegram` |
| YouTube | #FF0000 red | `linkYoutube` |
| Rumble | #85C742 green | `linkRumble` |
| Reddit | #FF4500 orange | `linkReddit` |
| Website | neutral gray | `linkWebsite` |

If no links are set and the user is not admin, empty state message is shown. If admin, "Edit Links" prompt is shown.

---

## 11. Right Rail: Goals Thermometer

> ⚠️ **Breaking change — April 21 2026:** Goals data was migrated from `localStorage` to the server. See API endpoints below. The old `gz-group-goals-{groupId}` localStorage key is no longer used. Any existing localStorage data is auto-migrated to the server on first page load after the update.

**Data storage:** Server-side. One row per group in the `group_goals` table. All members of a group share the same Goals data.

**API endpoints:**
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/groups/:id/goals` | member | Returns the `GoalData` JSON object (or `{}` if not set) |
| PUT | `/api/groups/:id/goals` | member | Body: full `GoalData` object — replaces stored data |

**GoalData structure:**
```json
{
  "dailyGoal": 67,
  "investments": [
    {
      "id": "uuid-string",
      "name": "Unimine",
      "amount": 370,
      "dailyEarnings": 3.44,
      "risk": "medium-low",
      "trackingStartedAt": "2026-04-01T00:00:00.000Z"
    }
  ],
  "contributions": [
    { "id": "uuid", "name": "Brandon", "amount": 320 },
    { "id": "uuid", "name": "Mike B", "amount": 50 }
  ],
  "kitty": {
    "startDate": "2026-04-21",
    "startTime": "17:00",
    "dailyAmount": 3.44
  }
}
```

**Thermometer display:**
- Vertical bar fill: `totalDailyEarnings / dailyGoal` percentage (green ≥ 66%, amber ≥ 33%, red otherwise).
- Figures shown: Daily Goal, Earning Now, Still Needed, Total Invested.
- Break-Even card: `Math.ceil(totalInvested / totalDailyEarnings)` days → also shown in months and years.
- When tracking is active for any investment: break-even card turns green and shows "X days left" based on remaining amount.
- Overall portfolio risk badge (weighted average across investments): Volatile / High / Medium / Med-Low / Low / No Risk.

**Per-investment tracking:**
- Each investment has a toggle button (pulsing green dot when active).
- When active, `trackingStartedAt` is set to current ISO timestamp.
- Calculates: `daysElapsed`, `accumulated = daysElapsed × dailyEarnings`, `remaining = amount - accumulated`, `pct`.
- Progress bar fills green as `accumulated` approaches `amount`.
- Shows: "X recouped (Yd)" in green.

**Member Contributions section:**
- Each contributor shows: name, dollar amount, share % of total invested, daily dividend ($X/day of current earnings), % of daily goal.
- Progress bar per contributor showing their share %.

**Kitty section (daily savings pool):**
- Configured in Goals settings: **Start Date + Start Time + USD per Day**.
- `startTime` is a `"HH:MM"` 24-hour string (e.g. `"17:00"`). Defaults to `"00:00"` if absent.
- **Counting logic:** Day 1 is added **immediately** when the kitty starts. Each additional `+1` day is added at every 24-hour mark from the exact start timestamp.
  - Formula: `days = Math.floor((now - startMs) / 86_400_000) + 1`
  - `accumulated = days × dailyAmount`
- **Critical — local time parsing:** The start timestamp must be parsed as **local time**, not UTC:
  - ✅ Correct: `new Date("2026-04-21T17:00:00")` — no trailing `Z`, parses in device local timezone
  - ❌ Wrong: `new Date("2026-04-21")` — bare date strings parse as UTC midnight, causing a timezone offset error
- Displays: accumulated total, "since" date/time, rate formula (`$X/day × N days`), and a "Next $X at [datetime]" hint showing when the next day flips.
- Kitty is independent — it does not compare to or include investments/contributions.

**Configure Goals dialog fields:**
1. Daily Income Goal (USD)
2. Investments: Name, $ Amount, $ Daily Earnings, Risk level
3. Member Contributions: Name, $ Amount
4. Kitty: **Start Date**, **Start Time** (HH:MM), USD / Day
5. Live Preview (updates as you type)

**Risk levels:**
| Value | Label | Color |
|---|---|---|
| volatile | Volatile | red #dc2626 |
| high | High | orange #f97316 |
| medium | Medium | yellow #eab308 |
| medium-low | Med-Low | sky #38bdf8 |
| low | Low | green #22c55e |
| none | No Risk | gray #6b7280 |

---

## 12. Right Rail: Calendar Sidebar

**Purpose:** View and manage group events in a monthly calendar.

**API calls:**
- Load events: `GET /api/groups/:id/events`
- Create event: `POST /api/groups/:id/events` (admin)
- Update event: `PATCH /api/groups/:id/events/:eid` (admin)
- Delete event: `DELETE /api/groups/:id/events/:eid` (admin)

**Event object:**
```json
{
  "id": 2,
  "groupId": 5,
  "title": "Sprint Review",
  "description": "End of sprint demo",
  "startAt": "2026-04-28T15:00:00Z",
  "endAt": "2026-04-28T16:00:00Z",
  "allDay": false,
  "createdBy": 7
}
```

**UI details:**
- Monthly grid with prev/next arrows.
- Days with events show a red dot indicator.
- Clicking a day: shows events on that day below the grid.
- Admin: "+ Add Event" button and per-event delete button.
- Add event form: Title, Description, Start date/time, End date/time, All-day toggle.

---

## 13. Right Rail: Members Sidebar

**API calls:**
- Load members: `GET /api/groups/:id/members`
- **Approve pending member:** `PATCH /api/groups/:id/members/:uid/approve` (admin) — sets `status = "accepted"`
- Remove member: `DELETE /api/groups/:id/members/:uid` (admin)
- Invite by user ID: `POST /api/groups/:id/invite` (admin)
- Invite by email: `POST /api/groups/:id/invite/email` (admin)
- Search users: `GET /api/groups/search-users?q=...&groupId=...` (admin)

**Sections:**
1. **Invite Code** — displays the group's unique invite code. Copy button. Admin only.
2. **Invite by Search** (admin) — type-ahead search for existing platform users; click to send invite.
3. **Invite by Email** (admin) — send invite to any email address. If the email is registered, sends in-app notification + email. If not registered, sends a join link.
4. **Accepted Members list** — avatar, displayName (or username), role badge.
   - Admin can remove members (trash icon).
   - Admin can message any member (speech-bubble icon → posts to wall mentioning the member).
5. **Pending Members** (admin) — list of members with `status = "pending"`. Each row shows:
   - **Approve button** (checkmark icon) → calls `PATCH .../approve` to immediately accept the member.
   - **Remove button** (X icon) → calls `DELETE` to reject and remove.
   - A member lands in Pending when invited by admin (they haven't accepted yet) or when they arrive via invite link/code and the system places them pending. Admin can approve directly without waiting for the invitee to click Accept.

**Member object:**
```json
{
  "id": 11,
  "groupId": 5,
  "userId": 7,
  "role": "admin",
  "status": "accepted",
  "displayName": "Brandon",
  "avatarUrl": "https://...",
  "username": "brandon",
  "email": "brandon@example.com"
}
```

---

## 14. Retrospectives Modal

**Purpose:** "Sprint retro" — each member submits a Win and a Roadblock. Shown inside the Endeavors tab.

**API calls:**
- Load: `GET /api/groups/:id/retrospectives`
- Submit: `POST /api/groups/:id/retrospectives` `{ win, roadblock }`

**Retro object:**
```json
{
  "id": 4,
  "groupId": 5,
  "userId": 7,
  "displayName": "Brandon",
  "avatarUrl": null,
  "win": "Shipped the wallet feature",
  "roadblock": "VPS deploys were flaky",
  "createdAt": "..."
}
```

---

## 15. Access Control Summary

| Action | Admin | Member | Non-member |
|---|---|---|---|
| View group (public) | ✅ | ✅ | ✅ |
| View group (private) | ✅ | ✅ | ❌ |
| View any tab content | ✅ | ✅ | ❌ |
| Post to Wall | ✅ | ✅ | ❌ |
| Comment on Wall | ✅ | ✅ | ❌ |
| Delete own post/comment | ✅ | ✅ | ❌ |
| Delete any post/comment | ✅ | ❌ | ❌ |
| Add Endeavor | ✅ | ❌ | ❌ |
| Update Endeavor progress | ✅ | ❌ | ❌ |
| Post Project Update comment | ✅ | ✅ | ❌ |
| Add/delete Kanban card | ✅ | ❌ | ❌ |
| Move Kanban card | ✅ | ❌ | ❌ |
| Add/delete Calendar event | ✅ | ❌ | ❌ |
| Add/delete Wallet | ✅ | ❌ | ❌ |
| Log Wallet contribution | ✅ | ✅ | ❌ |
| Verify Wallet contribution | ✅ | ❌ | ❌ |
| Edit Links | ✅ | ❌ | ❌ |
| Edit group name/description/banner | ✅ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ |
| Configure Goals / Kitty | any member | any member | ❌ |
| Submit Retro | ✅ | ✅ | ❌ |

> **Note (updated April 21 2026):** Goals Thermometer data is now stored server-side in `group_goals` and is **shared across all members** of the group. Any member can configure Goals. The last save wins.

---

## 16. Group Lifecycle

### Create a Group
```
POST /api/groups
{ "name": "My Group", "description": "...", "isPrivate": true }
```
Server generates a unique `invite_code` automatically. The creator is added as `role = "admin"`, `status = "accepted"`.

### Edit a Group
```
PATCH /api/groups/:id
{ "name": "New Name", "coverUrl": "https://...", "linkX": "https://x.com/...", ... }
```

### Upload Banner
Upload the image file to your existing image upload endpoint, get back a URL, then PATCH the group with `{ coverUrl: "..." }`.

### Delete a Group
```
DELETE /api/groups/:id
```
Cascades to all child records (members, wall, endeavors, kanban, wallets, events, etc.).

---

## 17. Invite Flow (Full)

### Flow A — Invite existing user by ID
1. Admin searches: `GET /api/groups/search-users?q=brandon&groupId=5`
2. Admin selects result: `POST /api/groups/:id/invite` `{ userId: 7 }`
3. Invitee receives in-app notification + email with link to `/groups/:id`
4. Invitee opens group, sees "Accept / Decline" prompt
5. Invitee clicks Accept: `POST /api/groups/:id/invite/respond` `{ accept: true }`

### Flow B — Invite by email (non-user)
1. Admin sends: `POST /api/groups/:id/invite/email` `{ email: "newuser@example.com" }`
2. Server creates token, emails a join link: `/join-group/{token}`
3. New user registers/logs in, lands on join page
4. `GET /api/groups/join/:token` returns group info
5. `POST /api/groups/join/:token` claims the invite → user is added as accepted member

---

## 18. Data That Lives in localStorage (Not on Server)

The following data is still stored in the browser's `localStorage` and is **not synced to the server**. It is per-device.

| Key | Data | Mobile action needed |
|---|---|---|
| `gz-kanban-columns-{groupId}` | Custom kanban column names for the group | Replace with server API |

> ✅ **Goals data (`gz-group-goals-{groupId}`) was migrated to server on April 21, 2026.** It now lives in the `group_goals` table and is served via `GET/PUT /api/groups/:id/goals`. No localStorage involved. Any pre-migration localStorage data is automatically migrated to the server on the user's first page load.

---

## 19. Color & Branding Notes

- **Primary action color:** `red-600` (#dc2626) — buttons, active tabs, borders
- **Success / goals / kitty:** `green-500` / `emerald-400`
- **Warning / break-even:** `amber-500`
- **Danger / overdue:** `red-400`
- **Background:** Dark theme — `bg-card`, `bg-muted`, zinc-based neutrals
- **Typography:** All labels use `text-xs` or `text-sm`; section headers use `text-[10px] uppercase tracking-wider text-muted-foreground`
- **Brand name:** "GZGroups" (not "GeeZee Groups")

---

## 20. Image Uploads on Wall Posts (All Surfaces)

> **Added April 23, 2026.** All four wall-enabled surfaces — GZGroups, GZCards (provider profile), GZMusic Bands, and GZBusiness — now support attaching a single image to a wall post. The mechanism is identical on every surface: a two-step process (upload first, post second).

---

### 20.1 The Two-Step Pattern

The same pattern is used for banner/wallpaper images and now also for wall post images.

**Step 1 — Upload the file**

```
POST /api/upload/image
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{ "url": "/uploads/1776726745011-bcaf99a50c0c182a.png" }
```

- The file is scanned before being accepted.
- Max file size follows the server's multer limit.
- Accepted types: any image (JPEG, PNG, WebP, GIF, etc.).
- Show a loading/uploading indicator during this request.

**Step 2 — Send the post with the URL**

Send the URL returned in step 1 as `imageUrl` in the wall post body (see per-surface details below).

---

### 20.2 GZGroups Wall

| | |
|---|---|
| **DB table** | `group_wall_posts` |
| **Column** | `image_url text` (nullable) |
| **POST endpoint** | `POST /api/groups/:id/wall` |
| **Request body** | `{ "content": "...", "imageUrl": "/uploads/..." }` |
| **Response field** | `imageUrl` (string or `null`) |
| **Who can post** | Any group member |
| **Who can delete** | Group admin OR post author |

---

### 20.3 GZCards — Provider Profile Wall

| | |
|---|---|
| **DB table** | `profile_wall_posts` |
| **Column** | `image_url text` (nullable) |
| **POST endpoint** | `POST /api/profile/:id/wall` |
| **Request body** | `{ "content": "...", "imageUrl": "/uploads/..." }` |
| **Response field** | `imageUrl` (string or `null`) |
| **Who can post** | Any authenticated user |
| **Who can delete** | Profile owner OR post author |

> The GZCard public profile page (`/provider/:id`) and the private dashboard both show the same wall. The public page is read-only for visitors; authenticated users can post.

---

### 20.4 GZMusic Bands — Band Clubhouse Wall

| | |
|---|---|
| **DB table** | `band_wall_posts` |
| **Column** | `image_url text` (nullable) — existed before April 23 |
| **POST endpoint** | `POST /api/bands/:id/wall` |
| **Request body** | `{ "content": "...", "imageUrl": "/uploads/..." }` |
| **Response field** | `imageUrl` (string or `null`) |
| **Who can post** | Any authenticated user |
| **Who can delete** | Band admin OR post author |

---

### 20.5 GZBusiness — Business Storefront Wall

| | |
|---|---|
| **DB table** | `business_wall_posts` |
| **Column** | `image_url text` (nullable) — existed before April 23 |
| **POST endpoint** | `POST /api/business/:id/wall` |
| **Request body** | `{ "content": "...", "imageUrl": "/uploads/..." }` |
| **Response field** | `imageUrl` (string or `null`) |
| **Who can post** | Any authenticated user |
| **Who can delete** | Business owner OR post author |

---

### 20.6 Sample Post Object (all surfaces follow this shape)

```json
{
  "id": 42,
  "content": "Check out this photo from last night!",
  "imageUrl": "/uploads/1776726745011-bcaf99a50c0c182a.png",
  "createdAt": "2026-04-23T01:00:00Z",
  "displayName": "Josh K",
  "avatarUrl": "/uploads/avatar-abc123.png",
  "username": "joshk"
}
```

- `imageUrl` is `null` (not absent) when no image is attached. Always handle `null` — do not assume the field is present.
- Render the image below the post text. Recommended style: rounded corners, `max-height: 200–300 dp`, `width: 100%`, `object-fit: cover`.

---

### 20.7 Mobile Implementation Checklist

1. **Composer UI** — add an attachment button (paperclip icon) beside the Post button.
2. **File picker** — launch the native image picker on tap. Limit selection to one image at a time.
3. **Preview** — show a small thumbnail above the Post button once an image is selected, with an ✕ to remove it.
4. **Upload** — on tap of Post (if an image is attached), first `POST /api/upload/image` with the file as `multipart/form-data`. Show a spinner.
5. **Post** — once the upload returns `{ url }`, include `imageUrl: url` in the wall post body. If no image, omit `imageUrl` entirely (or pass `null`).
6. **Display** — in the post list, render `imageUrl` below the post text whenever it is non-null.
7. **Error handling** — if the upload fails, surface an error toast/snackbar and do NOT submit the post.
8. **Loading state** — disable the Post button during both the upload step and the post step.

---

*End of report. All API paths are relative to the Gigzito API base URL.*
