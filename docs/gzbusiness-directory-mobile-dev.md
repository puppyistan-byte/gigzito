# GZBusiness Directory — Mobile Dev Spec
**Gigzito · Feature Branch: GZBusiness Directory + Storefront**
*April 2026 — Production base URL: `https://gigzito.com` (or VPS: `http://5.78.128.185`)*

---

## 1. Feature Overview

GZBusiness gives business-tier Gigzito members a public storefront that shows in a global directory browsable by all users. It is accessed from the bottom navigation bar.

**Three core screens:**
| Screen | Route | Auth Required |
|---|---|---|
| GZBusiness Directory | `/gz-business-directory` | None (public) |
| Business Storefront | `/business/:id` | None (public) |
| Business Profile Setup | `/business-profile/settings` | Yes — GZBusiness tier |

---

## 2. Data Model

### BusinessProfile

```json
{
  "id": 1,
  "userId": 42,
  "businessName": "Joe's Auto Shop",
  "category": "Auto & Automotive",
  "industry": "HVAC",
  "address": "123 Main St",
  "city": "Hillsboro",
  "state": "OR",
  "zip": "97123",
  "country": "US",
  "phone": "(503) 555-0100",
  "email": "info@joesauto.com",
  "website": "https://joesauto.com",
  "description": "Family-owned auto shop serving the Portland metro since 1998.",
  "pointsOfContact": [
    { "title": "Owner", "name": "Joe Ramirez", "phone": "(503) 555-0101", "email": "joe@joesauto.com" },
    { "title": "Booking", "name": "Maria Lopez", "phone": "(503) 555-0102", "email": "" }
  ],
  "logoUrl": "https://cdn.example.com/logo.jpg",
  "coverUrl": "https://cdn.example.com/cover.jpg",
  "lat": 45.5229,
  "lng": -122.9898,
  "hours": null,
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-17T00:00:00.000Z",
  "username": "joeramirez",
  "displayName": "Joe Ramirez",
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

**Field notes:**
- `category` — one of a predefined list (see Section 6)
- `industry` — free text, e.g. "HVAC", "Hair", "SaaS"
- `pointsOfContact` — JSON array; `phone` and `email` inside each contact are optional
- `lat` / `lng` — set by geocoding the address via Nominatim; used to render a map pin
- `username`, `displayName`, `avatarUrl` — joined from the user/profile tables; available on directory listing and storefront

### BusinessWallPost

```json
{
  "id": 1,
  "businessProfileId": 1,
  "authorUserId": 7,
  "authorName": "Jane Doe",
  "authorAvatar": "https://cdn.example.com/jane.jpg",
  "message": "Great place! Highly recommend.",
  "imageUrl": null,
  "createdAt": "2026-04-17T12:00:00.000Z"
}
```

**Field notes:**
- `authorUserId` — `null` for unauthenticated guest posts
- `authorName` — for guests this is the name they typed; for members it is their `displayName`
- `imageUrl` — optional; reserved for future media posts

---

## 3. API Endpoints

All endpoints on `https://gigzito.com`. Session cookie authentication (`connect.sid`).

---

### 3.1 GET `/api/businesses/directory`
**Auth:** None

Returns all business profiles (joined with user info) for the global directory.

**Response:** `BusinessProfile[]` (array, see Section 2)

---

### 3.2 GET `/api/business/:id`
**Auth:** None

Returns a single business profile by its numeric ID.

**Path params:** `id` — integer

**Response:** `BusinessProfile` or `404 { message: "Business not found" }`

---

### 3.3 GET `/api/business/by-username/:username`
**Auth:** None

Returns a single business profile by the owner's username.

**Path params:** `username` — string

**Response:** `BusinessProfile` or `404 { message: "Not found" }`

---

### 3.4 GET `/api/business-profile/me`
**Auth:** Required (session)

Returns the authenticated user's own business profile.

**Response:** `BusinessProfile | null`

---

### 3.5 POST `/api/business-profile`
**Auth:** Required (GZBusiness tier or admin)

Create or update the authenticated user's business profile (upsert).

**Request body:**
```json
{
  "businessName": "Joe's Auto Shop",
  "category": "Auto & Automotive",
  "industry": "Independent Repair",
  "address": "123 Main St",
  "city": "Hillsboro",
  "state": "OR",
  "zip": "97123",
  "phone": "(503) 555-0100",
  "email": "info@joesauto.com",
  "website": "https://joesauto.com",
  "description": "Family-owned since 1998.",
  "pointsOfContact": [
    { "title": "Owner", "name": "Joe Ramirez", "phone": "(503) 555-0101", "email": "joe@joesauto.com" }
  ],
  "logoUrl": null,
  "coverUrl": null,
  "lat": 45.5229,
  "lng": -122.9898
}
```

**Validation:** `businessName` is required. All other fields are optional.

**Response:** Saved `BusinessProfile`

---

### 3.6 GET `/api/business/:id/wall`
**Auth:** None

Returns all wall posts for a business.

**Response:** `BusinessWallPost[]` (newest first)

---

### 3.7 POST `/api/business/:id/wall`
**Auth:** None (guests allowed)

Post a message on a business wall.

**Request body:**
```json
{
  "message": "Love this shop!",
  "guestName": "Alex K."
}
```

- `message` — required, non-empty string
- `guestName` — optional; only used when not authenticated. Authenticated users' names are pulled from their profile automatically.

**Response:** `201 BusinessWallPost`

---

### 3.8 DELETE `/api/business/:id/wall/:postId`
**Auth:** Required (business owner or admin)

Delete a wall post.

**Response:** `{ ok: true }`

---

## 4. Screen Flows

### 4.1 Directory Screen

```
Bottom Nav → GZBusiness tab
  └─ Loads GET /api/businesses/directory
  └─ Displays card grid (all businesses)
  └─ Search bar filters by: businessName, category, industry, city, state, description (client-side)
  └─ Tap a card → Storefront Screen (/business/:id)
```

**Empty state:** "No businesses listed yet. GZBusiness members can create a storefront from their dashboard."

**Loading state:** Skeleton card grid (4 placeholder cards).

---

### 4.2 Business Storefront Screen

```
Directory → Tap card OR deep link /business/:id
  ├─ Loads GET /api/business/:id
  ├─ Loads GET /api/business/:id/wall
  ├─ Renders:
  │    Cover image (full-width, 160px tall)
  │    Logo (80×80 rounded square, overlapping cover)
  │    businessName + category badge + industry pill
  │    Contact strip: phone pill, email pill, website pill
  │    OpenStreetMap iframe (150px tall, if lat+lng present)
  │    Full address below map (or in contact strip if no map)
  │    "About" section (description)
  │    Points of Contact list (title, name, phone/email links)
  │    [OWNER ONLY] Marketing Tools panel (3 shortcuts)
  │    Business Wall composer (open to all users)
  │    Wall posts list (newest first)
  └─ Back → previous screen
```

**Owner Marketing Tools Panel (only visible to the profile's owner):**
| Tool | Action | Status |
|---|---|---|
| Flash AD Creator | Navigate to `/gz-business` (Offer Center) | Live |
| Video AD Creator | Navigate to `/provider/new` (new listing upload) | Live |
| Preemptive AD Creator | Disabled button | "SOON" label |

---

### 4.3 Business Profile Setup Screen

```
Provider Dashboard → "Setup Storefront" button
  OR /business-profile/settings (logged-in, business tier)
  ├─ Loads GET /api/business-profile/me
  ├─ Pre-fills form with existing data
  ├─ Fields:
  │    Business Name (required)
  │    Category (dropdown)
  │    Industry (free text)
  │    Address, City, State, ZIP
  │    "Find on Map" button → geocodes via Nominatim → shows OSM iframe preview
  │    Phone, Email
  │    Website
  │    Points of Contact (dynamic list — add/remove contacts with title/name/phone/email)
  │    About / Description (textarea)
  ├─ Save → POST /api/business-profile → navigate to /business/:id
  └─ Marketing tool shortcuts shown below save button (once profile exists)
```

**Tier gate:** Non-GZBusiness users see an upgrade prompt instead of the form.

---

## 5. Geocoding

Address → lat/lng uses the **Nominatim OpenStreetMap API** (no key required):

```
GET https://nominatim.openstreetmap.org/search
  ?format=json
  &limit=1
  &q=<url-encoded address string>
  Accept-Language: en
```

Extract `data[0].lat` and `data[0].lon`. Pass these as `lat` and `lng` when saving the business profile.

Map display uses an OSM embed iframe (no SDK/key required):

```
https://www.openstreetmap.org/export/embed.html
  ?bbox={lng-0.006},{lat-0.004},{lng+0.006},{lat+0.004}
  &layer=mapnik
  &marker={lat},{lng}
```

For dark mode, apply CSS filter: `invert(0.88) hue-rotate(180deg) saturate(0.8)`.

---

## 6. Reference Data

### Business Categories (predefined dropdown)
```
Restaurant / Food
Retail / Shop
Health & Wellness
Beauty & Salon
Auto & Automotive
Real Estate
Legal Services
Financial Services
Entertainment
Music & Arts
Technology
Home Services
Education / Tutoring
Non-Profit
Other
```

### Membership Tier Check
A user may create/edit a storefront if:
- `user.subscriptionTier === "GZBusiness"` OR
- `user.subscriptionTier === "GZEnterprise"` OR
- `user.role === "ADMIN"` OR `"SUPER_ADMIN"`

---

## 7. Brand Colors

| Token | Hex | Usage |
|---|---|---|
| Amber primary | `#f59e0b` | Active states, buttons, badges |
| Amber light | `#fbbf24` | Industry pill text |
| Dark background | `#050505` | Page background |
| Card background | `#0b0b0b` | Card/panel fills |
| Border subtle | `#1a1a1a` | Card borders |
| Border active | `rgba(245,158,11,0.2)` | Highlighted borders |
| Blue (Flash AD) | `#3b82f6` | Flash AD Creator accent |
| Green (Video AD) | `#10b981` | Video AD Creator accent |
| Red (soon) | `#ff2b2b` | Live dot indicator |

---

## 8. Bottom Nav

The bottom navigation has **6 items** (left → right):

| Position | Label | Icon | Route | Active Color |
|---|---|---|---|---|
| 1 | Feed | Home | `/` | White |
| 2 | Live | Radio | `/live` | White + red dot if live session |
| 3 | Create Post | PlusSquare | `/provider/me` (auth gate) | White |
| 4 | GZMusic | Music | `/gz-music` | `#ff7a00` (orange) |
| 5 | GZBusiness | Store | `/gz-business-directory` | `#f59e0b` (amber) |
| 6 | Profile | User | `/provider/me` (auth gate) | White |

The GZBusiness tab is highlighted amber when the current route is `/gz-business-directory` OR starts with `/business`.

---

## 9. Test IDs (for QA / Automation)

| Element | `data-testid` |
|---|---|
| Directory search input | `input-biz-search` |
| Business card | `card-biz-{id}` |
| Back button (directory) | `btn-dir-back` |
| Back button (storefront) | `button-biz-back` |
| Edit button (storefront, owner) | `button-biz-edit` |
| Contact row | `biz-contact-{index}` |
| Wall message input | `input-biz-wall-message` |
| Wall guest name input | `input-biz-wall-guest-name` |
| Wall post button | `button-biz-wall-post` |
| Wall post card | `biz-wall-post-{id}` |
| Delete wall post | `delete-biz-post-{id}` |
| Setup: business name | `input-setup-biz-name` |
| Setup: category | `select-setup-category` |
| Setup: industry | `input-setup-industry` |
| Setup: address | `input-setup-address` |
| Setup: city | `input-setup-city` |
| Setup: state | `input-setup-state` |
| Setup: ZIP | `input-setup-zip` |
| Setup: geocode | `button-setup-geocode` |
| Setup: phone | `input-setup-phone` |
| Setup: email | `input-setup-email` |
| Setup: website | `input-setup-website` |
| Setup: description | `input-setup-description` |
| Setup: add contact | `btn-add-contact` |
| Setup: save | `button-save-business-profile` |
| Nav: GZBusiness | `nav-gz-business` |
