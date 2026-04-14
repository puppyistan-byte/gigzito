# GZGroups API Reference
**Base URL:** `https://gigzito.com`  
**Auth:** Session cookie (`connect.sid`) — required on all endpoints unless noted.  
**Content-Type:** `application/json`

---

## Entitlement Gate

GZGroups is locked to the **GZGroups tier and above** (`$8/mo`).

Before rendering any Groups UI, check the dashboard's `unlocks` block:

```http
GET /api/user/dashboard
```

```json
{
  "unlocks": {
    "hasGroups": true   ← show Groups nav/tab when true
  },
  "groups": [ ... ]    ← up to 10 of their groups (preview)
}
```

When `hasGroups === false`, show an upgrade prompt. Do **not** silently hide Groups — the user should know it exists and what tier unlocks it.

---

## Table of Contents

1. [Dashboard Integration](#1-dashboard-integration)
2. [Groups Main Page](#2-groups-main-page)
3. [Group Detail Page](#3-group-detail-page)
4. [Members & Invites](#4-members--invites)
5. [Wall (Group Feed)](#5-wall-group-feed)
6. [Endeavors (Goals)](#6-endeavors-goals)
7. [Events (Calendar)](#7-events-calendar)
8. [Kanban Board](#8-kanban-board)
9. [Retrospectives](#9-retrospectives)
10. [Group Wallets & Contributions](#10-group-wallets--contributions)
11. [Join via Email Invite Link](#11-join-via-email-invite-link)
12. [Roles & Permission Matrix](#12-roles--permission-matrix)
13. [Error Reference](#13-error-reference)

---

## 1. Dashboard Integration

The dashboard delivers a lightweight Groups preview so the mobile app can render the Groups section of the home screen without a separate call.

```http
GET /api/user/dashboard
```

Relevant fields from the response:

```json
{
  "unlocks": {
    "hasGroups": true
  },
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

**Mobile usage:**
- Render a horizontal "My Groups" strip on the dashboard home screen when `hasGroups === true`
- Tapping a group card navigates to the Group Detail page and calls `GET /api/groups/:id`
- Tapping "See All" navigates to the Groups Main Page and calls `GET /api/groups`
- Also check `GET /api/groups/invites` on launch to show a pending invite badge

---

## 2. Groups Main Page

This screen is the full Groups workspace. Load three calls in parallel on mount:

```
GET /api/groups           → my groups (sidebar list)
GET /api/groups/invites   → pending invites (badge count)
GET /api/groups/featured  → featured public groups (discovery section)
```

---

### GET `/api/groups`
My groups — all groups where the session user is an accepted member or admin.

**Response `200`:**
```json
[
  {
    "id": 5,
    "name": "Phoenix Marketers",
    "description": "Local marketing pros networking group.",
    "coverUrl": null,
    "isPrivate": false,
    "createdBy": 35,
    "createdAt": "2026-03-10T14:00:00.000Z",
    "myRole": "admin",
    "myStatus": "accepted",
    "memberCount": 12
  }
]
```

---

### GET `/api/groups/invites`
Pending group invites for the session user.

**Response `200`:**
```json
[
  {
    "groupId": 7,
    "groupName": "AZ Real Estate Circle",
    "invitedBy": 42,
    "inviterName": "Maria Lopez",
    "status": "pending"
  }
]
```

Use this to show a badge count on the Groups nav item and a dedicated "Invitations" section at the top of the Groups main page.

---

### GET `/api/groups/featured`
Up to 3 featured public groups for discovery. **No auth required.**

**Response `200`:**
```json
[
  {
    "id": 3,
    "name": "GZMarketer Mastermind",
    "description": "Weekly accountability and strategy.",
    "coverUrl": "https://cdn.gigzito.com/groups/gz-mastermind.jpg",
    "isPrivate": false,
    "memberCount": 47
  }
]
```

---

### GET `/api/groups/search-users`
Search platform users to invite to a group. Returns up to 10 matches.

**Query params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `q` | string | Yes | Min 2 chars — matches username or display name |
| `groupId` | number | Yes | Excludes users already in this group |

**Response `200`:**
```json
[
  {
    "userId": 44,
    "displayName": "Tanya Brooks",
    "username": "tanyab",
    "avatarUrl": null
  }
]
```

---

### POST `/api/groups`
Create a new group. Caller becomes the group admin.

**Body:**
```json
{
  "name": "Phoenix Marketers",
  "description": "Local marketing pros networking group.",
  "coverUrl": null,
  "isPrivate": false
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `description` | string | No |
| `coverUrl` | string (URL) | No |
| `isPrivate` | boolean | No — defaults `false` |

**Response `201`:**
```json
{
  "id": 5,
  "name": "Phoenix Marketers",
  "isPrivate": false,
  "createdBy": 35,
  "createdAt": "2026-04-14T12:00:00.000Z"
}
```

---

## 3. Group Detail Page

On tap of any group, load the group and its members in parallel:

```
GET /api/groups/:id          → group info + caller's role
GET /api/groups/:id/members  → member list (members only)
```

Then load sub-sections lazily as the user scrolls to them (wall, kanban, events, etc).

---

### GET `/api/groups/:id`
Single group with the caller's membership context.

**Response `200`:**
```json
{
  "id": 5,
  "name": "Phoenix Marketers",
  "description": "Local marketing pros networking group.",
  "coverUrl": null,
  "isPrivate": false,
  "createdBy": 35,
  "createdAt": "2026-03-10T14:00:00.000Z",
  "memberCount": 12,
  "myRole": "admin",
  "myStatus": "accepted"
}
```

**`myRole`** values: `"admin"` | `"member"` | `null` (not a member)  
**`myStatus`** values: `"accepted"` | `"pending"` | `null`

> If `isPrivate: true` and `myRole` is `null`, the API returns **`403 Private group`**. Show a "Request to Join" screen instead.

---

### PATCH `/api/groups/:id`
Update group details. **Group admin only.**

**Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "description": "Updated bio",
  "coverUrl": "https://cdn.gigzito.com/groups/new-cover.jpg",
  "isPrivate": true
}
```

**Response `200`:** Updated group object.

---

### DELETE `/api/groups/:id`
Delete the group permanently. **Group admin only.**

**Response `200`:** `{ "message": "Deleted" }`

---

## 4. Members & Invites

### GET `/api/groups/:id/members`
Full member list. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "userId": 35,
    "displayName": "Josh",
    "username": "josh",
    "avatarUrl": null,
    "role": "admin",
    "status": "accepted",
    "joinedAt": "2026-03-10T14:00:00.000Z"
  },
  {
    "userId": 44,
    "displayName": "Tanya Brooks",
    "username": "tanyab",
    "avatarUrl": null,
    "role": "member",
    "status": "accepted",
    "joinedAt": "2026-03-12T09:30:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/invite`
Invite an existing platform user by their `userId`. **Group admin only.**

**Body:**
```json
{ "inviteeUserId": 44 }
```

**Response `201`:** Invite record. An in-app notification is sent to the invitee.

---

### POST `/api/groups/:id/invite/email`
Invite someone by email. If they're already a Gigzito user, they get an in-app notification. If not, they receive an email with a signup+join link. **Group admin only.**

**Body:**
```json
{ "email": "newperson@example.com" }
```

**Response `200`:**
```json
{
  "ok": true,
  "registered": false   ← true if user already has an account
}
```

---

### POST `/api/groups/:id/invite/respond`
Accept or decline a pending group invite.

**Body:**
```json
{ "accept": true }
```

**Response `200`:** `{ "message": "Done" }`

---

### POST `/api/groups/:id/join-request`
Request to join a private group. The group admin gets an in-app notification with the message.

**Body:**
```json
{
  "message": "I'm a Phoenix-based marketer with 5 years experience and would love to connect with the group."
}
```

> `message` must be at least **50 characters.**

**Response `200`:** `{ "message": "Request sent" }`

---

### DELETE `/api/groups/:id/members/:uid`
Remove a member from the group. **Group admin only.**

**Response `200`:** `{ "message": "Removed" }`

---

## 5. Wall (Group Feed)

The group's social feed. Members can post and comment. Load on the Group Detail page's "Wall" tab.

---

### GET `/api/groups/:id/wall`
All wall posts, newest first. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 101,
    "groupId": 5,
    "authorUserId": 35,
    "authorName": "Josh",
    "authorAvatar": null,
    "content": "Big week — closed two new clients from the group's referral network!",
    "createdAt": "2026-04-13T18:00:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/wall`
Post to the wall. **Accepted members only.**

**Body:**
```json
{ "content": "Quick reminder — our weekly call is Thursday at 6 PM MST." }
```

**Response `201`:** The new wall post object.

---

### DELETE `/api/groups/:id/wall/:postId`
Delete a wall post. Author can delete their own; group admin can delete any.

**Response `200`:** `{ "message": "Deleted" }`

---

### GET `/api/groups/:id/wall/:postId/comments`
Comments on a wall post. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 55,
    "wallPostId": 101,
    "authorUserId": 44,
    "authorName": "Tanya Brooks",
    "content": "That's awesome, congrats!",
    "createdAt": "2026-04-13T18:22:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/wall/:postId/comments`
Comment on a wall post. **Accepted members only.**

**Body:**
```json
{ "content": "Great work!" }
```

**Response `201`:** New comment object.

---

### DELETE `/api/groups/:id/wall/:postId/comments/:commentId`
Delete a comment. Author or group admin only.

**Response `200`:** `{ "message": "Deleted" }`

---

## 6. Endeavors (Goals)

Group-level goals with progress tracking. Admins create endeavors; all members can view.

---

### GET `/api/groups/:id/endeavors`
All endeavors for the group. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 10,
    "groupId": 5,
    "title": "Onboard 5 new members by June",
    "description": "Grow the group through warm referrals only.",
    "goalProgress": 2,
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/endeavors`
Create a new endeavor. **Group admin only.**

**Body:**
```json
{
  "title": "Hit $10k in wallet contributions",
  "description": "Community pooling goal for Q2."
}
```

**Response `201`:** New endeavor object.

---

### PATCH `/api/groups/:id/endeavors/:eid`
Update an endeavor's details or progress. **Group admin only.**

To update progress only:
```json
{ "goalProgress": 3 }
```

To update other fields:
```json
{
  "title": "Updated title",
  "description": "Updated description"
}
```

**Response `200`:** Updated endeavor object.

---

### DELETE `/api/groups/:id/endeavors/:eid`
Delete an endeavor. **Group admin only.**

**Response `200`:** `{ "message": "Deleted" }`

---

## 7. Events (Calendar)

Group calendar events. All accepted members can create and update events.

---

### GET `/api/groups/:id/events`
All events for the group. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 20,
    "groupId": 5,
    "createdBy": 35,
    "title": "Weekly Strategy Call",
    "description": "Zoom link in the wall post.",
    "startAt": "2026-04-17T23:00:00.000Z",
    "endAt": "2026-04-18T00:00:00.000Z",
    "allDay": false,
    "createdAt": "2026-04-13T00:00:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/events`
Create a group event. **Accepted members only.**

**Body:**
```json
{
  "title": "Weekly Strategy Call",
  "description": "Zoom link in the wall.",
  "startAt": "2026-04-17T23:00:00.000Z",
  "endAt": "2026-04-18T00:00:00.000Z",
  "allDay": false
}
```

| Field | Type | Required |
|-------|------|----------|
| `title` | string | Yes |
| `startAt` | ISO 8601 datetime | Yes |
| `endAt` | ISO 8601 datetime | No |
| `allDay` | boolean | No — defaults `false` |
| `description` | string | No |

**Response `201`:** New event object.

---

### PATCH `/api/groups/:id/events/:eid`
Update an event. **Accepted members only.**

Same fields as POST, all optional.

**Response `200`:** Updated event object.

---

### DELETE `/api/groups/:id/events/:eid`
Delete an event. **Accepted members only.**

**Response `200`:** `{ "message": "Deleted" }`

---

## 8. Kanban Board

Task board for the group. All members can create and move cards.

---

### GET `/api/groups/:id/kanban`
All kanban cards for the group. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 30,
    "groupId": 5,
    "createdBy": 35,
    "title": "Design group logo",
    "description": null,
    "status": "todo",
    "priority": "high",
    "deadline": "2026-04-30",
    "assignedTo": 44,
    "impactLevel": "high",
    "effortLevel": "medium",
    "createdAt": "2026-04-10T00:00:00.000Z"
  }
]
```

**`status`** values: `"todo"` | `"in_progress"` | `"done"`  
**`priority`** values: `"low"` | `"medium"` | `"high"`  
**`impactLevel`** / **`effortLevel`**: `"low"` | `"medium"` | `"high"`

---

### POST `/api/groups/:id/kanban`
Create a kanban card. **Accepted members only.**

**Body:**
```json
{
  "title": "Write onboarding guide",
  "description": "Cover the group rules and weekly call format.",
  "status": "todo",
  "priority": "medium",
  "deadline": "2026-04-25",
  "assignedTo": 44,
  "impactLevel": "high",
  "effortLevel": "low"
}
```

Only `title` is required. All other fields are optional.

**Response `201`:** New kanban card object.

---

### PATCH `/api/groups/:id/kanban/:cid`
Update a card (e.g. drag to a new column → update `status`). **Accepted members only.**

```json
{ "status": "in_progress" }
```

**Response `200`:** Updated card object.

---

### DELETE `/api/groups/:id/kanban/:cid`
Delete a card. **Accepted members only.**

**Response `200`:** `{ "message": "Deleted" }`

---

## 9. Retrospectives

Members share wins and roadblocks. Great for weekly accountability check-ins.

---

### GET `/api/groups/:id/retrospectives`
All retrospective entries. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 7,
    "groupId": 5,
    "authorUserId": 44,
    "authorName": "Tanya Brooks",
    "authorAvatar": null,
    "win": "Landed my first $5k consulting contract.",
    "roadblock": "Still struggling with cold outreach response rates.",
    "createdAt": "2026-04-13T20:00:00.000Z"
  }
]
```

---

### POST `/api/groups/:id/retrospectives`
Submit a retrospective. **Accepted members only.**

**Body:**
```json
{
  "win": "Closed two clients this week.",
  "roadblock": "Proposal template needs updating — losing deals at that stage."
}
```

Both `win` and `roadblock` are required.

**Response `201`:** New retrospective object.

---

## 10. Group Wallets & Contributions

Groups can hold community wallets for pooling crypto contributions toward shared goals.

---

### GET `/api/groups/:id/wallets`
All wallets for the group. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 1,
    "groupId": 5,
    "label": "Q2 Growth Fund",
    "network": "ETH",
    "address": "0xABC123...",
    "link": "https://etherscan.io/address/0xABC123",
    "goalAmount": 5000,
    "goalCurrency": "USD",
    "goalLabel": "Fund 5 group events",
    "createdBy": 35,
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
]
```

**Supported `network` values:**  
`ETH`, `BTC`, `SOL`, `MATIC`, `BNB`, `AVAX`, `ARB`, `OP`, `BASE`, `USDC`, `USDT`

---

### POST `/api/groups/:id/wallets`
Add a wallet. **Group admin only.**

**Body:**
```json
{
  "label": "Q2 Growth Fund",
  "network": "ETH",
  "address": "0xABC123...",
  "link": "https://etherscan.io/address/0xABC123"
}
```

`label`, `network`, and `address` are required. `link` is optional.

**Response `200`:** New wallet object.

---

### DELETE `/api/groups/:id/wallets/:wid`
Remove a wallet. **Group admin only.**

**Response `200`:** `{ "message": "Deleted" }`

---

### PUT `/api/groups/:id/wallets/:wid/goal`
Set or update the funding goal on a wallet. **Group admin only.**

**Body:**
```json
{
  "goalAmount": 5000,
  "goalCurrency": "USD",
  "goalLabel": "Fund 5 group events"
}
```

All fields optional — send `null` to clear a goal. **Response `200`:** `{ "ok": true }`

---

### GET `/api/groups/:id/wallets/:wid/balance`
Live on-chain balance for the wallet. Cached for 5 minutes.

**Response `200`:**
```json
{
  "balance": 1.42,
  "currency": "ETH",
  "cached": false,
  "nextRefreshAt": "2026-04-14T12:05:00.000Z"
}
```

When `cached: true`, the balance is from the cache. Show `nextRefreshAt` as a "Refreshes in…" countdown.

---

### GET `/api/groups/:id/wallets/:wid/contributions`
All contribution records for a wallet. **Accepted members only.**

**Response `200`:**
```json
[
  {
    "id": 9,
    "walletId": 1,
    "groupId": 5,
    "userId": 44,
    "displayName": "Tanya Brooks",
    "avatarUrl": null,
    "amount": 0.25,
    "currency": "ETH",
    "txHash": "0xDEF456...",
    "note": "Happy to contribute!",
    "verified": true,
    "createdAt": "2026-04-12T11:00:00.000Z"
  }
]
```

**`verified: true`** means the tx hash was confirmed on-chain via the Etherscan API. Show a green checkmark badge when verified.

---

### POST `/api/groups/:id/wallets/:wid/contributions`
Log a contribution. **Accepted members only.**

**Body:**
```json
{
  "amount": 0.25,
  "currency": "ETH",
  "txHash": "0xDEF456...",
  "note": "Happy to contribute!"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amount` | number | Yes | Any positive value |
| `currency` | string | No | Defaults to `"USD"` |
| `txHash` | string | No | For ETH-based chains — auto-verified on-chain if provided |
| `note` | string | No | |

**Response `200`:** New contribution object with `verified` flag.

---

### PATCH `/api/groups/:id/wallets/:wid/contributions/:cid/verify`
Manually mark a contribution as verified. **Group admin only.**

**Response `200`:** Updated contribution object.

---

## 11. Join via Email Invite Link

When a non-registered user receives an email invite, they land on a token-based join URL.

---

### GET `/api/groups/join/:token`
Fetch invite info from the token. **No auth required.**

**Response `200`:**
```json
{
  "groupId": 5,
  "groupName": "Phoenix Marketers",
  "inviterName": "Josh",
  "email": "newperson@example.com"
}
```

**`410`** — Token already claimed.  
**`404`** — Token invalid or expired (tokens expire after 7 days).

Use this to pre-fill the registration screen with the group context.

---

### POST `/api/groups/join/:token`
Claim the invite and join the group. **Auth required** (user must be logged in or just registered).

**Response `200`:**
```json
{
  "ok": true,
  "groupId": 5,
  "groupName": "Phoenix Marketers"
}
```

After success, navigate directly to the group's detail page.

---

## 12. Roles & Permission Matrix

| Action | Member | Admin |
|--------|--------|-------|
| View group info | ✅ | ✅ |
| View wall / events / kanban / retros / wallets | ✅ | ✅ |
| Post to wall | ✅ | ✅ |
| Comment on wall posts | ✅ | ✅ |
| Delete own wall post/comment | ✅ | ✅ |
| Create events | ✅ | ✅ |
| Create/update kanban cards | ✅ | ✅ |
| Submit a retrospective | ✅ | ✅ |
| Log a contribution | ✅ | ✅ |
| Delete anyone's wall post/comment | ❌ | ✅ |
| Invite users (platform or email) | ❌ | ✅ |
| Remove members | ❌ | ✅ |
| Create endeavors | ❌ | ✅ |
| Update endeavor progress | ❌ | ✅ |
| Create/delete wallets | ❌ | ✅ |
| Set wallet goal | ❌ | ✅ |
| Manually verify contributions | ❌ | ✅ |
| Edit group settings (name, cover, etc.) | ❌ | ✅ |
| Delete the group | ❌ | ✅ |

---

## 13. Error Reference

| Status | Meaning | Common cause |
|--------|---------|--------------|
| `401` | Unauthorized | Not logged in |
| `403 Members only` | Membership required | User not accepted into this group |
| `403 Admins only` | Admin required | User is a member but not the group admin |
| `403 Private group` | Private access denied | Non-member tried to view a private group |
| `404` | Not found | Group/wallet/event/card doesn't exist |
| `409 Already a member` | Duplicate join | User tried to request to join a group they're already in |
| `409 Request already sent` | Duplicate request | Pending join request already exists |
| `410` | Gone | Email invite token already claimed or expired |
| `500` | Server error | Generic — show retry UI |

---

## Recommended Mobile Screen Flow

```
Groups Tab Loads
  ├── GET /api/user/dashboard          → check unlocks.hasGroups
  │     ├── false → show upgrade prompt
  │     └── true  → show Groups tab
  │
  ├── GET /api/groups                  → my groups list
  ├── GET /api/groups/invites          → badge on tab + invitations section
  └── GET /api/groups/featured         → discovery section

User taps a group card
  ├── GET /api/groups/:id              → group info + my role
  └── GET /api/groups/:id/members     → member list
      │
      └── (lazy load on tab switch)
          ├── /api/groups/:id/wall
          ├── /api/groups/:id/kanban
          ├── /api/groups/:id/events
          ├── /api/groups/:id/endeavors
          ├── /api/groups/:id/retrospectives
          └── /api/groups/:id/wallets

User taps a wallet
  ├── GET /api/groups/:id/wallets/:wid/balance       → live on-chain balance
  └── GET /api/groups/:id/wallets/:wid/contributions → contribution ledger
```

---

*Last updated: April 2026*
