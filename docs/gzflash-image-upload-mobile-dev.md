# GZFlash Image Upload — Mobile Dev Note
**Gigzito · Issue Resolution + Integration Guide**
*April 18, 2026*

---

## What Was Happening (Root Cause)

The flash ad "Test 59" showed a broken or missing product image because:

**The ad was created with `artworkUrl: null`** — no image was uploaded when the ad was saved. The image zone on the card correctly displayed the "No Product Image" placeholder.

A second issue was found in the codebase: the `<img>` tag had no `onError` handler, meaning if an `artworkUrl` was stored but the file later became unavailable (e.g. a deleted file, expired URL), the element would fail silently — showing a broken native browser icon instead of the clean placeholder. **This has been fixed on both the ad card and the Claim modal.**

---

## How the Fix Was Applied to Test 59

The ad was patched directly on the VPS database to point to an existing uploaded image:

```sql
UPDATE gz_flash_ads
SET artwork_url = '/uploads/1776351665725-052adcd188b5b462.jpg'
WHERE id = 8;
```

The image file (305 KB JPEG) lives at `/opt/gigzito/uploads/1776351665725-052adcd188b5b462.jpg` and is served at:

```
http://5.78.128.185/uploads/1776351665725-052adcd188b5b462.jpg
→ HTTP 200  image/jpeg  312 KB
```

---

## The Correct Image Upload Flow (Mobile Must Follow This)

When a user attaches a product photo to a flash ad, the mobile app **must NOT** use a local file path, blob URL, or base64 string as the `artworkUrl`. Those are session-only or too large and will break.

**The required flow:**

### Step 1 — Upload the file to the server

```
POST /api/upload/image
Authorization: Bearer <jwt_token>          ← required
Content-Type: multipart/form-data

Body field name: "file"
Value: the image file (JPEG/PNG/WEBP)
```

**Response (200):**
```json
{ "url": "/uploads/1776351665725-052adcd188b5b462.jpg" }
```

The returned URL is a **permanent server path** — use it as `artworkUrl` in the next step.

### Step 2 — Save the ad with the returned URL

```
POST /api/gz-flash
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "My Flash Deal",
  "artworkUrl": "/uploads/1776351665725-052adcd188b5b462.jpg",  ← from step 1
  ...other fields...
}
```

---

## What Happens If You Skip Step 1

| What mobile sends | What happens |
|---|---|
| `null` (no image) | Placeholder shows — "No Product Image" icon |
| `blob:https://...` | URL is session-only. Dies when app closes. Image never loads for anyone else. |
| `file:///...` | Local device path. Inaccessible from server or other devices. |
| `data:image/...` | Large base64 string — rejected by DB or causes performance issues |
| `/uploads/abc.jpg` (from upload endpoint) | **Correct** — permanent, publicly accessible |

**The web form already blocks blob: and file: URLs.** Mobile must do the same.

---

## Image Error Handling (Now Fixed on Web)

The web ad card and Claim modal now both handle broken image URLs gracefully:

- If `artworkUrl` is **null** → placeholder shown immediately
- If `artworkUrl` is a **valid URL** → image loads normally
- If `artworkUrl` is **set but the file is gone** → `onError` fires, falls back to placeholder

Mobile should implement the same fallback:

```jsx
// React Native example
<Image
  source={{ uri: artworkUrl }}
  onError={() => setImgError(true)}
  style={styles.artworkImage}
/>
{(!artworkUrl || imgError) && <PlaceholderView />}
```

---

## Upload Endpoint Details

```
POST /api/upload/image

Auth:       Required (JWT Bearer token in Authorization header)
Body:       multipart/form-data, field name = "file"
Max size:   Server-configured (multer default ~10MB)
Accepted:   image/jpeg, image/png, image/webp, image/gif

Security:   Two-layer scan runs on every upload:
  Layer 1 — magic bytes + contraband signature check
  Layer 2 — Rocco AI Vision scan (checks for prohibited content)
  → If either layer fails: HTTP 422 returned, file is destroyed

Success:    HTTP 200  { "url": "/uploads/{timestamp}-{hash}.{ext}" }
Auth fail:  HTTP 401
Scan fail:  HTTP 422  { "message": "Upload declined: ..." }
```

**Why uploads may silently fail on mobile:** If the Bearer token is expired or missing from the multipart request, the server returns 401 and the image URL is never returned. Always confirm the token is being sent with the upload request, not just with the ad creation request.

---

## Testing Image Upload on the Mobile App

1. Log in as `josh@test.com` (or any GZMarketerPro/GZBusiness tier account)
2. Go to Create Flash Ad
3. Attach a product photo
4. Before submitting the form, verify the `artworkUrl` field contains `/uploads/...` (not `blob:`, `file://`, or empty)
5. Submit and confirm the ad appears in the directory with the image

On VPS, you can verify via:
```
curl -s http://5.78.128.185/api/gz-flash | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.forEach(a => console.log(a.id, a.title, a.artworkUrl))"
```
