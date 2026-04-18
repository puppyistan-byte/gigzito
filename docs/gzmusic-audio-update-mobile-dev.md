# GZMusic Audio — Mobile Dev Update Spec
**Gigzito · Update: Jukebox Audio Fixes + Shuffle / Play All**
*April 18, 2026 — Production: `https://gigzito.com` · VPS: `http://5.78.128.185`*

---

## 1. What Changed

Three changes shipped to the GZMusic page (`/gz-music`):

| # | Change | Where it shows |
|---|---|---|
| 1 | **Dual audio bug fixed** | Jukebox bar |
| 2 | **Play All button** | GZ100 header (next to track count) |
| 3 | **Shuffle button** | GZ100 header + jukebox bar |

---

## 2. Dual Audio Bug — Root Cause & Fix

### What was happening
Two separate `<audio>` elements were playing at the same time:

1. **Jukebox player** — a hidden `<audio ref={audioRef}>` singleton managed by the page, shown as the floating bar at the bottom.
2. **Expanded row player** — when a user tapped a track row to expand it, an embedded `<audio controls>` element was mounted in the expanded drawer and **immediately auto-played** via a `ref` callback: `ref={(el) => { if (el) el.play() }}`.

Both audio elements played independently with no awareness of each other.

### Fix applied (web)
- Removed the auto-play `ref` callback from the expanded row player. The embedded mini-player now only plays when the user manually taps its native controls.
- Added `audioRef.current.pause()` + `audioRef.current.load()` to `jukeboxPlay()` before setting a new `src`, so the previous track is fully stopped and the element is reset before the new one loads.

### Mobile implementation guidance
On mobile you will likely have a single audio/media player singleton. Ensure:
- Only **one** active player instance exists at a time.
- If you show an inline mini-player within an expanded track card, **do not auto-play** it on mount. Render it paused.
- When the user triggers the jukebox (full-screen player / mini-bar) for a track, **stop and release** any inline player that was playing before handing off to the singleton.
- Use `MediaSession` API (Android) or `AVAudioSession` (iOS) properly to manage audio focus so tracks don't bleed.

---

## 3. Play All Button

### Behaviour
- Appears in the GZ100 header row, to the right of the "The GZ100" title, **only** when at least one track has an uploaded audio file (`fileUrl` is non-null).
- Tapping it starts playback from **rank 1** (the top-rated file-track).
- Shuffle mode is reset to OFF when Play All is triggered.
- Auto-advances through all file-tracks in ranked order when each track ends.

### Data condition
```
fileTracks = tracks.filter(t => t.fileUrl !== null)
// Play All only renders if fileTracks.length > 0
```

### Web test ID
```
data-testid="button-play-all"
```

### Mobile implementation guidance
- Mirror as a prominent CTA button in the chart header row.
- Tap → build a sequential playlist from all `fileUrl` tracks ordered by chart rank → start at index 0.
- Expose via a "Play All" label with a Play icon.

---

## 4. Shuffle Button

### Behaviour overview
Two entry points, same shuffle state:

| Entry point | Action |
|---|---|
| **Shuffle button in GZ100 header** | Turns shuffle ON + immediately starts playback at a random file-track |
| **Shuffle button in jukebox bar** | Toggles shuffle ON/OFF mid-session (does not restart track) |

### Shuffle algorithm (stateful, no-repeat)
```
shuffleHistory = Set<fileIdx>   // persists across track changes, clears on toggle or Play All

onTrackEnd():
  if shuffleMode:
    available = fileTracks.indices
                  .filter(i ≠ currentIdx)
                  .filter(i ∉ shuffleHistory)

    if available is empty:
      // All tracks played — reset history, start new cycle
      shuffleHistory = { currentIdx }
      available = fileTracks.indices.filter(i ≠ currentIdx)

    nextIdx = available[random(0, available.length)]
    shuffleHistory.add(currentIdx)
    play(fileTracks[nextIdx])
  else:
    play(fileTracks[currentIdx + 1])  // sequential
```

Key properties:
- **No immediate repeat** — current track is always excluded from the pool.
- **Full-cycle coverage** — every track is played before any repeats.
- **Cycle reset** — after the full pool is exhausted, history clears and a new random order begins.
- **History clears** when the user toggles shuffle off/on or hits Play All / Shuffle All.

### Visual states

| State | GZ100 header button | Jukebox bar icon |
|---|---|---|
| Shuffle OFF | Dark background, grey text/icon | Grey icon, no border |
| Shuffle ON | Orange-tinted background, orange border, orange text | Orange icon, orange-tinted bg, orange border |

### Web test IDs
```
data-testid="button-shuffle-all"   // GZ100 header
data-testid="jukebox-shuffle"      // jukebox bar
```

### Mobile implementation guidance
- Track the shuffle history as a Set of already-played IDs in the session.
- Show the shuffle icon in both the chart header (next to Play All) and in the playback controls bar.
- Use a visually distinct active state (orange highlight, filled icon) so the user knows shuffle is on.
- Skip Forward button: when shuffle is ON, tapping it should also use the shuffle algorithm (pick next random unplayed) rather than advancing sequentially.

---

## 5. Jukebox Bar — Control Layout (updated)

After this update the jukebox bar controls row reads left → right:

```
[ ⏮ Prev ] [ ⏯ Play/Pause ] [ ⏭ Next ] [ 🔀 Shuffle ] [ ✕ Close ]
```

- **Prev / Next** — always sequential (prev: index - 1, next: shuffle-aware when shuffle is ON).
- **Shuffle** — toggle; resets history on toggle.
- **Close** — pauses audio, destroys jukebox state.

### Skip forward opacity rule
- Shuffle OFF + current track is last in the list → Skip Forward dims to 30% opacity (no next track).
- Shuffle ON → Skip Forward is always full opacity (there is always a random next track available).

---

## 6. API — No Changes

No backend or API changes were made in this update. All logic is client-side state management. The relevant endpoint remains:

```
GET /api/gz-music/tracks
→ Array of GZMusicTrack (see schema below)
```

### Track fields relevant to audio playback
```json
{
  "id": 1,
  "title": "Freedom Frequency",
  "artist": "Asha Waves",
  "fileUrl": "https://cdn.gigzito.com/tracks/xyz.mp3",   // null = no uploadable file
  "audioUrl": "https://soundcloud.com/...",               // null = no external link
  "coverUrl": "https://cdn.gigzito.com/covers/xyz.jpg",  // null = show headphone icon
  "downloadEnabled": false,
  "authenticityConfirmed": true,
  "bandId": null
}
```

**Priority rule for playback:**
- If `fileUrl` is non-null → use the jukebox (singleton player). This track is in the `fileTracks` pool.
- If `fileUrl` is null but `audioUrl` is non-null → display inline iframe / external link (SoundCloud, YouTube, or fallback link). Not part of jukebox / Play All / Shuffle.

---

## 7. Brand & Design Tokens (no change)

| Token | Value |
|---|---|
| Primary orange | `#ff7a00` |
| Orange dim bg | `rgba(255,122,0,0.094)` |
| Orange border | `rgba(255,122,0,0.208)` |
| Background | `#000000` |
| Card bg | `#0b0b0b` / `#0d0d0d` alternating |
| Jukebox bar bg | `linear-gradient(135deg, #0f0800, #1c1000)` |

---

## 8. Deployment

Changes deployed to VPS April 18, 2026 via PM2 restart. Commit on Replit: `20e43535`.

Web source: `client/src/pages/gz-music.tsx`
