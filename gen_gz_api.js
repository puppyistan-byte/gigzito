const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50, size: 'LETTER', info: { Title: 'Gigzito GZMusic API Reference', Author: 'Gigzito Engineering' } });
const out = fs.createWriteStream('/home/runner/workspace/GZMusic_API_Reference.pdf');
doc.pipe(out);

// Colors
const BLACK = '#000000';
const ORANGE = '#FF4500';
const DARK_GRAY = '#2b2b2b';
const MED_GRAY = '#555555';
const LIGHT_GRAY = '#e8e8e8';
const GREEN = '#1a7a3f';
const BLUE = '#1a3d7a';
const PURPLE = '#4a1a7a';
const RED = '#7a1a1a';

function drawCover() {
  doc.rect(0, 0, 612, 792).fill('#0a0a0a');
  doc.rect(0, 0, 612, 8).fill(ORANGE);
  doc.rect(0, 784, 612, 8).fill(ORANGE);
  doc.rect(0, 0, 8, 792).fill(ORANGE);
  doc.rect(604, 0, 8, 792).fill(ORANGE);
  
  doc.moveDown(6);
  doc.font('Helvetica-Bold').fontSize(42).fillColor(ORANGE).text('GIGZITO', { align: 'center' });
  doc.font('Helvetica').fontSize(18).fillColor('#cccccc').text('GZMusic + Bands Clubhouse', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#ffffff').text('API Reference', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(12).fillColor('#888888').text('For Mobile Development', { align: 'center' });
  
  doc.moveDown(2);
  doc.rect(120, doc.y, 372, 1).fill(ORANGE);
  doc.moveDown(1.5);
  
  const items = [
    '• Mobile Auth (JWT Bearer)',
    '• GZMusic Chart, Trending & Library',
    '• Track Submit, Like, Rate & Play',
    '• Comments System',
    '• Track Announcements',
    '• GZ Bands Clubhouse — Full API',
    '• Band Follow / Unfollow',
    '• Band Wall Posts, Likes & Comments',
    '• Band Members, Events, Gallery, TV',
    '• Admin Endpoints',
  ];
  doc.font('Helvetica').fontSize(13).fillColor('#cccccc');
  items.forEach(item => { doc.text(item, { align: 'center' }); });
  
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(10).fillColor('#666666').text(`Base URL: https://gigzito.com`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
  doc.text('Version 2.0 — Includes Band Clubhouse Social Features', { align: 'center' });
}

function newPage(title) {
  doc.addPage();
  doc.rect(0, 0, 612, 36).fill('#0a0a0a');
  doc.font('Helvetica-Bold').fontSize(10).fillColor(ORANGE).text('GIGZITO API REFERENCE', 50, 12);
  doc.font('Helvetica').fontSize(9).fillColor('#888888').text(title, { align: 'right', y: 12 });
  doc.y = 55;
}

function sectionHeader(text) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, 512, 28).fill('#1a1a1a');
  doc.font('Helvetica-Bold').fontSize(14).fillColor(ORANGE).text(text, 60, doc.y - 22);
  doc.moveDown(0.8);
}

function subHeader(text) {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK_GRAY).text(text);
  doc.rect(50, doc.y, 512, 0.5).fill('#cccccc');
  doc.moveDown(0.3);
}

function methodBadge(method, path, color) {
  const y = doc.y;
  doc.rect(50, y, 48, 16).fill(color);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text(method, 52, y + 4, { width: 44, align: 'center' });
  doc.font('Courier').fontSize(10).fillColor('#1a1a1a').text(path, 106, y + 2, { width: 456 });
  doc.y = y + 24;
}

function badge(label, color) {
  const y = doc.y;
  doc.rect(50, y, label.length * 5.5 + 8, 14).fill(color);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff').text(label, 54, y + 3);
  doc.y = y + 20;
}

function desc(text) {
  doc.font('Helvetica').fontSize(9.5).fillColor(MED_GRAY).text(text, 50, doc.y, { width: 512 });
  doc.moveDown(0.3);
}

function authNote(type) {
  const y = doc.y;
  const colors = { 'Bearer JWT': '#1a3d7a', 'Session Cookie': '#2d5a1a', 'Public': '#555555', 'Admin Only': '#7a1a1a' };
  const c = colors[type] || '#555';
  doc.rect(50, y, type.length * 5.8 + 12, 14).fill(c);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff').text(`Auth: ${type}`, 55, y + 3);
  doc.y = y + 20;
}

function param(name, type, required, description) {
  const y = doc.y;
  doc.font('Courier-Bold').fontSize(9).fillColor('#1a1a1a').text(name, 60, y, { width: 100 });
  doc.font('Helvetica').fontSize(8).fillColor('#888888').text(type, 165, y, { width: 70 });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(required ? '#c0392b' : '#27ae60').text(required ? 'required' : 'optional', 240, y + 1, { width: 55 });
  doc.font('Helvetica').fontSize(9).fillColor(MED_GRAY).text(description, 300, y, { width: 262 });
  doc.y = Math.max(doc.y, y + 16);
}

function responseField(name, type, description) {
  const y = doc.y;
  doc.font('Courier').fontSize(8.5).fillColor('#1a3d7a').text(name, 60, y, { width: 120 });
  doc.font('Helvetica').fontSize(8).fillColor('#888888').text(type, 185, y, { width: 65 });
  doc.font('Helvetica').fontSize(9).fillColor(MED_GRAY).text(description, 255, y, { width: 307 });
  doc.y = Math.max(doc.y, y + 14);
}

function jsonBlock(json) {
  const y = doc.y;
  const lines = json.trim().split('\n');
  const h = lines.length * 12 + 12;
  doc.rect(50, y, 512, h).fill('#f5f5f5').stroke('#e0e0e0');
  doc.font('Courier').fontSize(8).fillColor('#1a1a1a');
  lines.forEach((line, i) => {
    doc.text(line, 58, y + 6 + i * 12, { width: 496, lineBreak: false });
  });
  doc.y = y + h + 8;
}

function ensureSpace(needed) {
  if (doc.y + needed > 730) { doc.addPage(); doc.y = 55; }
}

// ─── COVER ───────────────────────────────────────────────────────────────────
drawCover();

// ─── PAGE 2: Auth + Mobile Session ────────────────────────────────────────────
newPage('Authentication');
sectionHeader('🔐  Mobile Authentication (JWT Bearer)');
desc('All mobile endpoints use stateless JWT tokens. The two-step login flow: (1) POST credentials → receive MFA code by email; (2) POST code → receive Bearer token. Store the token in secure storage and attach it to every authenticated request.');

doc.moveDown(0.3);
subHeader('Step 1 — Login');
methodBadge('POST', '/api/mobile/login', '#1a7a3f');
authNote('Public');
desc('Submit email + password. Returns { mfaRequired: true, email }. A 6-digit code is emailed. In dev environments, the response also includes devCode for testing.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Request Body:', 50);
param('email', 'string', true, 'Registered account email');
param('password', 'string', true, 'Account password');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response:', 50);
jsonBlock(`{
  "mfaRequired": true,
  "email": "user@example.com",
  "devCode": "123456"   // dev mode only — omitted in production
}`);

ensureSpace(120);
subHeader('Step 2 — Verify MFA Code');
methodBadge('POST', '/api/mobile/mfa/verify', '#1a7a3f');
authNote('Public');
desc('Submit email + 6-digit MFA code received by email. Returns a 30-day JWT token + user object.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Request Body:', 50);
param('email', 'string', true, 'Same email from Step 1');
param('code', 'string', true, '6-digit code from email');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response:', 50);
jsonBlock(`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "email": "user@example.com",
    "role": "USER",
    "subscriptionTier": "GZLurker",
    "username": "djcool",
    "displayName": "DJ Cool",
    "avatarUrl": "https://gigzito.com/uploads/..."
  }
}`);

ensureSpace(100);
subHeader('Refresh Token');
methodBadge('POST', '/api/mobile/refresh', '#1a3d7a');
authNote('Bearer JWT');
desc('Pass existing token in Authorization header. Returns a fresh 30-day token + current user object. Call on app launch to validate session and get updated profile info.');
desc('Header: Authorization: Bearer <token>');

ensureSpace(100);
subHeader('Get Current User (Profile)');
methodBadge('GET', '/api/mobile/me', '#1a3d7a');
authNote('Bearer JWT');
desc('Returns full account object + GeeZee profile fields.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response fields (account):', 50);
responseField('id', 'number', 'User ID');
responseField('email', 'string', 'Account email');
responseField('role', 'string', 'USER | ADMIN | SUPER_ADMIN');
responseField('subscriptionTier', 'string', 'GZLurker | GZGroups | GZMarketer | GZMarketerPro | GZBusiness | GZEnterprise');
responseField('emailVerified', 'boolean', 'Whether email is verified');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response fields (profile):', 50);
responseField('username', 'string', 'Unique @handle');
responseField('displayName', 'string', 'Public display name');
responseField('bio', 'string', 'About text');
responseField('avatarUrl', 'string', 'Profile photo URL');
responseField('location', 'string', 'City/state/region');
responseField('contactEmail', 'string', 'Public contact email');
responseField('instagramUrl / tiktokUrl / youtubeUrl', 'string', 'Social links');
responseField('photo1Url … photo6Url', 'string', 'Gallery photos (up to 6)');

ensureSpace(80);
subHeader('Update Profile');
methodBadge('PUT', '/api/mobile/profile', '#e67e22');
authNote('Bearer JWT');
desc('Update any GeeZee profile fields. Send only fields you want to change. Protected fields (id, userId) are ignored.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Allowed fields:', 50);
param('displayName', 'string', false, 'Public name');
param('bio', 'string', false, 'About / bio');
param('avatarUrl', 'string', false, 'Profile photo URL');
param('username', 'string', false, 'Unique @handle (reserved names blocked)');
param('location', 'string', false, 'City, State');
param('contactEmail / contactPhone', 'string', false, 'Contact info');
param('instagramUrl / tiktokUrl / youtubeUrl / facebookUrl / discordUrl / twitterUrl', 'string', false, 'Social links');
param('photo1Url … photo6Url', 'string', false, 'Gallery photo URLs');
param('showPhone', 'boolean', false, 'Whether to publicly display phone number');

// ─── PAGE: GZMusic Overview ────────────────────────────────────────────────────
newPage('GZMusic API');
sectionHeader('🎵  GZMusic — Chart & Discovery');
desc('The GZMusic chart is Gigzito\'s music discovery engine. Tracks are scored by a composite of average star rating (0.5–6.0 scale), play count, and like count. All chart/trending/track-detail endpoints embed liked status and rating in the response when a session or Bearer token is present.');

doc.moveDown(0.3);
subHeader('Chart (Paginated, Filterable)');
methodBadge('GET', '/api/gz-music/chart', '#1a3d7a');
authNote('Public');
desc('Primary feed for the GZMusic jukebox. Supports full pagination, genre filtering, text search, and multiple sort modes.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Query Parameters:', 50);
param('page', 'number', false, 'Page number (default: 1)');
param('limit', 'number', false, 'Tracks per page, max 50 (default: 20)');
param('sort', 'string', false, '"chart" (default) | "new" | "plays" | "likes"');
param('genre', 'string', false, 'Filter by genre tag (exact, case-insensitive)');
param('q', 'string', false, 'Full-text search across title, artist, genre');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response:', 50);
jsonBlock(`{
  "tracks": [
    {
      "id": 14,
      "title": "Sunset Ride",
      "artist": "DJ Nova",
      "genre": "Hip-Hop",
      "coverUrl": "/uploads/gz-music/cover_abc.jpg",
      "fileUrl": "/uploads/gz-music/track_abc.mp3",
      "audioUrl": null,
      "downloadEnabled": true,
      "likeCount": 42,
      "playCount": 318,
      "avgRating": 4.5,
      "commentCount": 7,
      "liked": false,
      "myRating": null,
      "status": "active",
      "createdAt": "2025-11-01T14:22:00Z"
    }
  ],
  "total": 87,
  "page": 1,
  "limit": 20,
  "pages": 5
}`);

ensureSpace(80);
subHeader('Trending Tracks');
methodBadge('GET', '/api/gz-music/trending', '#1a3d7a');
authNote('Public');
desc('Returns top N tracks ranked by play count. Ideal for "What\'s Hot" widget or homepage carousel.');
param('limit', 'number', false, 'Max tracks to return, max 50 (default: 10)');
desc('Response: array of track objects (same shape as chart items).');

ensureSpace(80);
subHeader('Genre List');
methodBadge('GET', '/api/gz-music/genres', '#1a3d7a');
authNote('Public');
desc('Returns array of distinct genre strings currently in the catalog — use to populate filter chips in the UI.');
jsonBlock(`["Hip-Hop", "R&B", "Gospel", "Trap", "Jazz", "Soul", "Electronic", "Pop"]`);

ensureSpace(60);
subHeader('Single Track Detail');
methodBadge('GET', '/api/gz-music/tracks/:id', '#1a3d7a');
authNote('Public');
desc('Full track record with liked / myRating baked in. Ideal for track detail screen.');
param(':id', 'number', true, 'Track ID from chart or search');

ensureSpace(60);
subHeader('Find Track by Title (Fuzzy)');
methodBadge('GET', '/api/gz-music/find-by-title?title=Sunset+Ride', '#1a3d7a');
authNote('Public');
desc('Fuzzy-matches title against catalog. Returns single track object or null. Used by video cards to surface Download Now link.');
param('title', 'string', true, 'Partial or full track title');

ensureSpace(60);
subHeader('All Tracks (GZ100 Legacy List)');
methodBadge('GET', '/api/gz-music/tracks', '#1a3d7a');
authNote('Public');
desc('Returns the curated GZ100 list (up to 100 tracks). No pagination. Use /chart for the full paginated catalog.');

ensureSpace(60);
subHeader('Tracks by User');
methodBadge('GET', '/api/gz-music/tracks/by-user/:userId', '#1a3d7a');
authNote('Public');
desc('Returns all active tracks submitted by a specific user. Use on artist profile pages.');

// ─── PAGE: Track Actions ───────────────────────────────────────────────────────
newPage('GZMusic — Track Actions');
sectionHeader('🎵  GZMusic — Track Interaction');

subHeader('Record Play (Fire & Forget)');
methodBadge('POST', '/api/gz-music/tracks/:id/play', '#1a7a3f');
authNote('Public');
desc('Increments the play count. Call immediately when track starts playing. No auth required. Always returns 200.');

ensureSpace(80);
subHeader('Like / Unlike Track (Toggle)');
methodBadge('POST', '/api/gz-music/tracks/:id/like', '#1a7a3f');
authNote('Session Cookie');
desc('Toggles the like on a track. If already liked, it unlikes. Returns updated state.');
jsonBlock(`{ "liked": true, "likeCount": 43 }`);

ensureSpace(80);
subHeader('Rate Track');
methodBadge('POST', '/api/gz-music/tracks/:id/rate', '#1a7a3f');
authNote('Session Cookie');
desc('Submit or update a star rating. Gigzito uses a 0.5–6.0 scale in 0.5 increments (not 1–5). This is intentional — 6 stars is a "Certified Banger".');
param('stars', 'number', true, '0.5 to 6.0 in 0.5 increments (e.g. 4.5)');
jsonBlock(`{ "avgRating": 4.7, "myRating": 4.5, "ratingCount": 23 }`);

ensureSpace(80);
subHeader('Batch Like Status');
methodBadge('GET', '/api/gz-music/likes/batch?ids=1,2,3,4', '#1a3d7a');
authNote('Session Cookie');
desc('Check like status for multiple tracks at once. Efficient for rendering a list without N individual calls.');
param('ids', 'string', true, 'Comma-separated track IDs');
jsonBlock(`{ "1": true, "2": false, "3": true, "4": false }`);

ensureSpace(60);
subHeader('Batch Rating Status');
methodBadge('GET', '/api/gz-music/ratings/batch?ids=1,2,3', '#1a3d7a');
authNote('Session Cookie');
desc('Returns the authenticated user\'s ratings for multiple tracks at once.');
jsonBlock(`{ "1": 5.0, "2": null, "3": 4.5 }`);

ensureSpace(80);
subHeader('GZ Library (Shared Tracks)');
methodBadge('GET', '/api/gz-music/library?q=gospel', '#1a3d7a');
authNote('Public');
desc('Returns tracks that artists marked as "shared to library" — these can be used as background music in video posts. Optionally filter by search query.');

// ─── PAGE: Submit Track ─────────────────────────────────────────────────────────
newPage('GZMusic — Track Submission');
sectionHeader('🎵  GZMusic — Submit Track');
desc('Artists submit tracks via multipart/form-data. All file types are inspected server-side before storage.');

methodBadge('POST', '/api/gz-music/submit', '#1a7a3f');
authNote('Session Cookie');
desc('Upload a new track to the GZMusic catalog. Uses multipart/form-data with file fields.');

doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('File Fields (multipart):', 50);
param('audio', 'file (MP3)', true, 'The audio track. MP3 format, inspected server-side.');
param('cover', 'file (JPG/PNG)', false, 'Cover art image, square recommended.');
param('license', 'file (PDF/IMG)', false, 'License or release document (optional).');

doc.moveDown(0.2);
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Form Text Fields:', 50);
param('title', 'string', true, 'Track title (max 120 chars recommended)');
param('artist', 'string', true, 'Artist / performer name');
param('genre', 'string', true, 'Genre tag — should match a genre from /api/gz-music/genres');
param('downloadEnabled', '"true" | "false"', false, 'Allow fans to download. Default: false.');
param('sharedToLibrary', '"true" | "false"', false, 'Share to the GZ Library for video use. Default: true.');
param('authenticityConfirmed', '"true"', true, 'Must be "true" — user certifies they own the rights.');

doc.moveDown(0.3);
desc('Response (201): Full track object. File URLs follow the pattern /uploads/gz-music/<filename>.');

doc.moveDown(0.3);
doc.font('Helvetica-Bold').fontSize(9).fillColor(RED).text('Note on Content Inspection:', 50);
doc.font('Helvetica').fontSize(9).fillColor(MED_GRAY).text('Uploaded files are scanned before being moved to permanent storage. Suspect files (wrong MIME, executable signatures, etc.) are destroyed and a 422 is returned. This is non-negotiable.', 50, doc.y, { width: 512 });

doc.moveDown(0.5);
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Admin-only track creation (JSON, no file upload):', 50);
methodBadge('POST', '/api/gz-music/tracks', '#7a1a1a');
authNote('Admin Only');
param('title / artist / genre', 'string', true, 'Basic metadata');
param('coverUrl / audioUrl', 'string', false, 'External URLs (for pre-existing hosted files)');

doc.moveDown(0.3);
methodBadge('DELETE', '/api/gz-music/tracks/:id', '#7a1a1a');
authNote('Admin Only');
desc('Permanently delete a track from the catalog.');

// ─── PAGE: Comments & Announcements ────────────────────────────────────────────
newPage('GZMusic — Comments & Announcements');
sectionHeader('💬  GZMusic — Comments');

subHeader('Get Comments');
methodBadge('GET', '/api/gz-music/tracks/:id/comments', '#1a3d7a');
authNote('Public');
desc('Returns all comments on a track, newest first.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response item fields:', 50);
responseField('id', 'number', 'Comment ID');
responseField('content', 'string', 'Comment text');
responseField('userId', 'number', 'Author user ID');
responseField('displayName', 'string', 'Author display name');
responseField('avatarUrl', 'string', 'Author avatar URL');
responseField('createdAt', 'string', 'ISO 8601 timestamp');

ensureSpace(80);
subHeader('Post Comment');
methodBadge('POST', '/api/gz-music/tracks/:id/comments', '#1a7a3f');
authNote('Session Cookie');
desc('Post a comment on a track. Max 500 characters.');
param('content', 'string', true, 'Comment text (1–500 chars)');
desc('Returns the created comment object (201).');

ensureSpace(60);
subHeader('Delete Comment');
methodBadge('DELETE', '/api/gz-music/comments/:id', '#c0392b');
authNote('Session Cookie');
desc('Delete a comment. Users can only delete their own; admins can delete any.');

doc.moveDown(0.8);
sectionHeader('📣  GZMusic — Track Announcements');
desc('Artists can announce their tracks via email — either to a single address or to their full Gigzito audience (subscribers who opted in to receive marketing from this user).');

ensureSpace(80);
subHeader('Announce to Single Email');
methodBadge('POST', '/api/gz-music/announce/single', '#1a7a3f');
authNote('Session Cookie');
desc('Send a branded email announcement for one of your tracks to any email address. Can be called multiple times (not rate-limited per se, but anti-spam applies).');
param('trackId', 'number', true, 'ID of one of your tracks (must be owned by you)');
param('toEmail', 'string', true, 'Valid recipient email address');
param('message', 'string', false, 'Optional personal message to include in the email');
jsonBlock(`{ "ok": true, "sent": 1 }`);

ensureSpace(80);
subHeader('Announce to Mailing List');
methodBadge('POST', '/api/gz-music/announce/mailing-list', '#1a7a3f');
authNote('Session Cookie');
desc('Blast a track announcement to all subscribers in your Gigzito audience who have an email address. Returns a count of emails sent.');
param('trackId', 'number', true, 'ID of one of your tracks');
param('message', 'string', false, 'Optional personal message');
jsonBlock(`{ "ok": true, "sent": 147, "total": 150 }`);

ensureSpace(60);
subHeader('Subscriber Count');
methodBadge('GET', '/api/gz-music/announce/subscriber-count', '#1a3d7a');
authNote('Session Cookie');
desc('Returns the number of audience members with email addresses who can receive announcements.');
jsonBlock(`{ "count": 150 }`);

// ─── PAGE: Bands Clubhouse Overview ────────────────────────────────────────────
newPage('GZ Bands Clubhouse API');
sectionHeader('🎸  GZ Bands Clubhouse — Overview');
desc('The Bands Clubhouse is Gigzito\'s artist community platform. Each Band or Artist page has a wall, gallery, jukebox, Zito.TV, calendar, and roster. Base path for all band endpoints: /api/bands/:id');

doc.moveDown(0.2);
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Band Types:', 50);
doc.font('Helvetica').fontSize(9).fillColor(MED_GRAY).text('"band" (displayed in orange) — for groups and bands', 60);
doc.font('Helvetica').fontSize(9).fillColor(MED_GRAY).text('"artist" (displayed in purple) — for solo artists', 60);
doc.moveDown(0.4);

subHeader('List All Bands');
methodBadge('GET', '/api/bands', '#1a3d7a');
authNote('Public');
desc('Returns all active bands/artists. Optionally filter by bandType query param.');
param('bandType', 'string', false, '"band" | "artist" — filter by type');

ensureSpace(100);
subHeader('Create a Band');
methodBadge('POST', '/api/bands', '#1a7a3f');
authNote('Session Cookie');
param('name', 'string', true, 'Band or artist name');
param('bio', 'string', false, 'About text');
param('genre', 'string', false, 'Primary genre');
param('city / state', 'string', false, 'Location');
param('avatarUrl / bannerUrl', 'string', false, 'Image URLs');
param('instagramUrl / tiktokUrl / youtubeUrl / websiteUrl', 'string', false, 'Social links');
param('bandType', 'string', false, '"band" (default) | "artist"');

ensureSpace(120);
subHeader('Get Band Detail');
methodBadge('GET', '/api/bands/:id', '#1a3d7a');
authNote('Public');
desc('Full band record with metadata baked in. If authenticated, isMember, memberRole, and isFollowing are included.');
doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_GRAY).text('Response fields:', 50);
responseField('id / name / bio / genre / city / state', 'mixed', 'Core profile fields');
responseField('avatarUrl / bannerUrl', 'string', 'Image URLs');
responseField('instagramUrl / tiktokUrl / youtubeUrl / websiteUrl', 'string', 'Social links');
responseField('bandType', 'string', '"band" | "artist"');
responseField('allowGuestPosts', 'boolean', 'Whether non-members can post to the wall');
responseField('memberCount', 'number', 'Number of active members');
responseField('followerCount', 'number', 'Number of followers');
responseField('isMember', 'boolean', 'Whether authenticated user is a member');
responseField('memberRole', 'string', '"member" | "admin" (null if not a member)');
responseField('isFollowing', 'boolean', 'Whether authenticated user is following this band');

ensureSpace(80);
subHeader('Update Band');
methodBadge('PATCH', '/api/bands/:id', '#e67e22');
authNote('Session Cookie — Admin of Band');
desc('Update any band fields. Only the band admin can call this.');
param('name / bio / genre / city / state', 'string', false, 'Core profile');
param('avatarUrl / bannerUrl', 'string', false, 'Images');
param('instagramUrl / tiktokUrl / youtubeUrl / websiteUrl', 'string', false, 'Social links');
param('bandType', 'string', false, '"band" | "artist"');
param('allowGuestPosts', 'boolean', false, 'Allow non-members to post on the wall');

// ─── PAGE: Band Membership ────────────────────────────────────────────────────────
newPage('GZ Bands Clubhouse — Membership');
sectionHeader('👥  Band Membership');

subHeader('Get Members');
methodBadge('GET', '/api/bands/:id/members', '#1a3d7a');
authNote('Public');
desc('Returns array of member profiles with role and instrument.');
responseField('userId / displayName / avatarUrl', 'mixed', 'Member identity');
responseField('role', 'string', '"member" | "admin"');
responseField('instrument', 'string', 'Self-reported instrument/role in the band');
responseField('joinedAt', 'string', 'ISO 8601 timestamp');

ensureSpace(80);
subHeader('Join Band');
methodBadge('POST', '/api/bands/:id/join', '#1a7a3f');
authNote('Session Cookie');
desc('Authenticated user requests to join. First member automatically becomes admin.');
param('instrument', 'string', false, 'Your instrument or role (e.g. "Drums", "Producer")');
jsonBlock(`{ "ok": true, "role": "member" }`);

ensureSpace(60);
subHeader('Leave Band');
methodBadge('DELETE', '/api/bands/:id/leave', '#c0392b');
authNote('Session Cookie');
desc('Authenticated user leaves. The last admin cannot leave while other members exist — they must transfer admin first.');

doc.moveDown(0.8);
sectionHeader('🔔  Band Follow System');
desc('Anyone — logged-in or guest — can follow a band to get event notifications. Logged-in users are identified by userId; guests by email. Each band+email combination is unique.');

ensureSpace(80);
subHeader('Follow Band');
methodBadge('POST', '/api/bands/:id/follow', '#1a7a3f');
authNote('Public (Session Cookie optional)');
desc('Follow a band. If logged in, the user\'s email is pulled automatically. Guests must supply an email. displayName is optional for guests.');
param('email', 'string', false, 'Guest email (required for guests; ignored for logged-in users)');
param('displayName', 'string', false, 'Display name for guest followers');
jsonBlock(`{ "ok": true }`);

ensureSpace(60);
subHeader('Unfollow Band');
methodBadge('DELETE', '/api/bands/:id/follow', '#c0392b');
authNote('Session Cookie');
desc('Logged-in user unfollows. Returns 200 even if not currently following (idempotent).');

ensureSpace(60);
subHeader('Get Followers (Admin)');
methodBadge('GET', '/api/bands/:id/followers', '#7a1a1a');
authNote('Admin of Band');
desc('Returns the full follower list. Access restricted to band admins. Includes email for marketing/event notifications.');
responseField('id', 'number', 'Follow record ID');
responseField('userId', 'number | null', 'User ID (null for guest followers)');
responseField('email', 'string', 'Follower email');
responseField('displayName', 'string | null', 'Display name');
responseField('followedAt', 'string', 'ISO 8601 timestamp');

// ─── PAGE: Band Wall ─────────────────────────────────────────────────────────────
newPage('GZ Bands Clubhouse — Wall');
sectionHeader('📝  Band Wall Posts');

subHeader('Get Wall Posts');
methodBadge('GET', '/api/bands/:id/wall', '#1a3d7a');
authNote('Public');
desc('Returns all wall posts for the band, newest first. If authenticated, hasLiked is included per post.');
responseField('id', 'number', 'Post ID');
responseField('bandId', 'number', 'Band ID');
responseField('userId', 'number | null', 'Author user ID (null for guest posts)');
responseField('guestName', 'string | null', 'Guest poster name');
responseField('guestEmail', 'string | null', 'Guest poster email (masked in response)');
responseField('content', 'string', 'Post text');
responseField('imageUrl', 'string | null', 'Attached image URL');
responseField('likeCount', 'number', 'Number of likes on this post');
responseField('hasLiked', 'boolean', 'Whether authenticated user has liked this post');
responseField('commentCount', 'number', 'Number of comments');
responseField('displayName', 'string', 'Author name (from profile or guestName)');
responseField('avatarUrl', 'string | null', 'Author avatar (null for guests)');
responseField('createdAt', 'string', 'ISO 8601 timestamp');

ensureSpace(120);
subHeader('Post to Wall');
methodBadge('POST', '/api/bands/:id/wall', '#1a7a3f');
authNote('Session Cookie OR guest (if allowGuestPosts = true)');
desc('Create a wall post. Members post freely. If the band has allowGuestPosts enabled, unauthenticated visitors can post with a name (and optionally email).');
param('content', 'string', true, 'Post text (required)');
param('guestName', 'string', false, 'Required for guest posters when allowGuestPosts is true');
param('guestEmail', 'string', false, 'Optional for guest posters');
param('imageUrl', 'string', false, 'URL of an image to attach');
desc('Returns the created post object (201).');

ensureSpace(60);
subHeader('Delete Wall Post');
methodBadge('DELETE', '/api/bands/:id/wall/:postId', '#c0392b');
authNote('Session Cookie');
desc('Post author or band admin can delete any post. Returns 200.');

ensureSpace(80);
subHeader('Like a Wall Post');
methodBadge('POST', '/api/bands/:id/wall/:postId/like', '#1a7a3f');
authNote('Session Cookie');
desc('Like a post. Idempotent — calling again on an already-liked post is a no-op (does not toggle).');
jsonBlock(`{ "ok": true }`);

ensureSpace(60);
subHeader('Unlike a Wall Post');
methodBadge('DELETE', '/api/bands/:id/wall/:postId/like', '#c0392b');
authNote('Session Cookie');
desc('Remove a like from a post.');

ensureSpace(80);
subHeader('Wall Post Comments');
methodBadge('GET', '/api/bands/:id/wall/:postId/comments', '#1a3d7a');
authNote('Public');
desc('Returns all comments on a specific wall post.');

methodBadge('POST', '/api/bands/:id/wall/:postId/comments', '#1a7a3f');
authNote('Session Cookie');
desc('Comment on a wall post. Requires authentication.');
param('content', 'string', true, 'Comment text');

// ─── PAGE: Events / Gallery / Tracks ───────────────────────────────────────────
newPage('GZ Bands Clubhouse — Events, Gallery & More');
sectionHeader('📅  Band Events');

methodBadge('GET', '/api/bands/:id/events', '#1a3d7a');
authNote('Public');
desc('List all events for this band, sorted by date.');
responseField('id / bandId', 'number', 'IDs');
responseField('title', 'string', 'Event name');
responseField('date', 'string', 'ISO date string');
responseField('venue / city / state', 'string', 'Location info');
responseField('description', 'string | null', 'Event details');
responseField('ticketUrl', 'string | null', 'Link to buy tickets');

ensureSpace(80);
methodBadge('POST', '/api/bands/:id/events', '#1a7a3f');
authNote('Session Cookie — Band Admin');
param('title', 'string', true, 'Event name');
param('date', 'string', true, 'ISO date string (YYYY-MM-DD)');
param('venue / city / state', 'string', false, 'Location');
param('description', 'string', false, 'Details');
param('ticketUrl', 'string', false, 'Ticket purchase URL');

ensureSpace(40);
methodBadge('DELETE', '/api/bands/:id/events/:eid', '#c0392b');
authNote('Session Cookie — Band Admin');

doc.moveDown(0.8);
sectionHeader('🖼️  Band Gallery (Photos)');
methodBadge('GET', '/api/bands/:id/photos', '#1a3d7a');
authNote('Public');
desc('Returns all gallery photos for the band.');

ensureSpace(60);
methodBadge('POST', '/api/bands/:id/photos', '#1a7a3f');
authNote('Session Cookie — Band Member');
desc('Upload a photo. Multipart/form-data with a file field named "file". Returns the created photo object.');
param('file', 'image file', true, 'Photo to upload (JPG/PNG)');
param('caption', 'string', false, 'Optional caption');

ensureSpace(40);
methodBadge('DELETE', '/api/bands/:id/photos/:pid', '#c0392b');
authNote('Session Cookie — Band Admin');

doc.moveDown(0.8);
sectionHeader('🎵  Band Tracks (GZMusic Link)');
methodBadge('GET', '/api/bands/:id/tracks', '#1a3d7a');
authNote('Public');
desc('Returns GZMusic tracks submitted by members of this band. Useful for the Jukebox tab.');

doc.moveDown(0.8);
sectionHeader('📺  Zito.TV Shows');
methodBadge('GET', '/api/bands/:id/tv', '#1a3d7a');
authNote('Public');
desc('Returns TV show entries for this band (YouTube/stream embeds).');

ensureSpace(80);
methodBadge('POST', '/api/bands/:id/tv', '#1a7a3f');
authNote('Session Cookie — Band Admin');
param('title', 'string', true, 'Show title');
param('videoUrl', 'string', true, 'YouTube or streaming URL');
param('description', 'string', false, 'Show description');
param('thumbnailUrl', 'string', false, 'Preview thumbnail');

ensureSpace(40);
methodBadge('DELETE', '/api/bands/:id/tv/:sid', '#c0392b');
authNote('Session Cookie — Band Admin');

// ─── PAGE: Band Roster ───────────────────────────────────────────────────────────
newPage('GZ Bands Clubhouse — Roster & Admin');
sectionHeader('🎤  Band Roster (Public Showcase)');
desc('The roster is a curated public showcase of performers — distinct from members. Think of it as the "official lineup" for the band\'s public page.');

methodBadge('GET', '/api/bands/:id/roster', '#1a3d7a');
authNote('Public');
responseField('id', 'number', 'Roster entry ID');
responseField('name', 'string', 'Performer name');
responseField('role', 'string', 'Instrument or role');
responseField('avatarUrl', 'string | null', 'Photo URL');
responseField('bio', 'string | null', 'Short bio');
responseField('socialUrl', 'string | null', 'Link to personal profile');
responseField('sortOrder', 'number', 'Display order');

ensureSpace(80);
methodBadge('POST', '/api/bands/:id/roster', '#1a7a3f');
authNote('Session Cookie — Band Admin');
param('name', 'string', true, 'Performer name');
param('role', 'string', false, 'Instrument / role title');
param('avatarUrl / bio / socialUrl', 'string', false, 'Optional profile fields');
param('sortOrder', 'number', false, 'Display ordering (default: 0)');

ensureSpace(40);
methodBadge('PUT', '/api/bands/:id/roster/:rid', '#e67e22');
authNote('Session Cookie — Band Admin');
desc('Update a roster entry.');

ensureSpace(40);
methodBadge('DELETE', '/api/bands/:id/roster/:rid', '#c0392b');
authNote('Session Cookie — Band Admin');

// ─── PAGE: Auth Notes / Error Reference ──────────────────────────────────────────
newPage('Authentication Notes & Error Reference');
sectionHeader('🔑  Authentication Notes');

doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK_GRAY).text('Mobile (Bearer Token) vs Web (Session Cookie):', 50);
doc.moveDown(0.3);
const authRows = [
  ['Endpoint Prefix', 'Auth Mechanism', 'How to Pass'],
  ['/api/mobile/*', 'Bearer JWT', 'Authorization: Bearer <token>'],
  ['/api/gz-music/*', 'Session Cookie', 'Cookie: connect.sid=... (handled by browser)'],
  ['/api/bands/*', 'Session Cookie', 'Cookie: connect.sid=... (handled by browser)'],
  ['/api/groups/*', 'Session Cookie', 'Cookie: connect.sid=...'],
];

let ty = doc.y;
authRows.forEach((row, ri) => {
  const bgColor = ri === 0 ? '#1a1a1a' : (ri % 2 === 0 ? '#f9f9f9' : '#ffffff');
  doc.rect(50, ty, 512, 18).fill(bgColor);
  const textColor = ri === 0 ? '#ffffff' : '#333333';
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(textColor);
  doc.text(row[0], 55, ty + 4, { width: 148 });
  doc.text(row[1], 208, ty + 4, { width: 120 });
  doc.text(row[2], 333, ty + 4, { width: 229 });
  ty += 18;
});
doc.y = ty + 8;

desc('For mobile apps: after verifying MFA, store the JWT securely (Keychain on iOS, EncryptedSharedPreferences on Android). Attach it as "Authorization: Bearer <token>" to all /api/mobile/* requests. The token is valid for 30 days; refresh proactively on launch via POST /api/mobile/refresh.');

doc.moveDown(0.5);
desc('For web-based endpoints (/api/gz-music/*, /api/bands/*) accessed from a mobile app using a WebView: session cookies are handled automatically. For native apps hitting these endpoints directly, you will need to manage the session cookie manually (extract Set-Cookie from login response, attach on subsequent requests).');

doc.moveDown(0.8);
sectionHeader('⚠️  Error Response Reference');
const errors = [
  ['Status', 'Meaning', 'Common Causes'],
  ['400', 'Bad Request', 'Missing required field, invalid param format'],
  ['401', 'Unauthorized', 'No session / invalid or expired token'],
  ['403', 'Forbidden', 'Authenticated but insufficient permissions / account disabled / email not verified'],
  ['404', 'Not Found', 'Resource does not exist or was deleted'],
  ['422', 'Unprocessable Entity', 'File inspection failed (bad MIME, suspicious content)'],
  ['429', 'Too Many Requests', 'Rate limit hit (login attempts, email sends, invites)'],
  ['500', 'Server Error', 'Unexpected server-side failure'],
];

let ey = doc.y;
errors.forEach((row, ri) => {
  const bgColor = ri === 0 ? '#1a1a1a' : (ri % 2 === 0 ? '#f9f9f9' : '#fff8f8');
  doc.rect(50, ey, 512, 18).fill(bgColor);
  const textColor = ri === 0 ? '#ffffff' : (ri > 0 && ri < errors.length ? '#7a1a1a' : '#333333');
  const statusColor = ri === 0 ? '#ffffff' : '#c0392b';
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Courier-Bold').fontSize(8.5).fillColor(ri === 0 ? '#ffffff' : '#c0392b');
  doc.text(row[0], 55, ey + 4, { width: 50 });
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica-Bold').fontSize(8.5).fillColor(ri === 0 ? '#ffffff' : '#333333');
  doc.text(row[1], 110, ey + 4, { width: 130 });
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(ri === 0 ? '#ffffff' : MED_GRAY);
  doc.text(row[2], 245, ey + 4, { width: 317 });
  ey += 18;
});
doc.y = ey + 8;

desc('All error responses follow the shape: { "message": "Human-readable reason" }');

doc.moveDown(0.8);
sectionHeader('📋  Subscription Tiers');
const tiers = [
  ['Tier', 'Price', 'Key GZMusic Features'],
  ['GZLurker', 'Free', 'Browse chart, play tracks, rate, like, comment'],
  ['GZGroups', '$8/mo', 'All above + GZGroups access'],
  ['GZMarketer', '$12/mo', 'All above + audience tools, mailing list announcements'],
  ['GZMarketerPro', '$15/mo', 'All above + expanded marketing features'],
  ['GZBusiness', '$25/mo', 'All above + Ad Center, full business tools'],
  ['GZEnterprise', 'Custom', 'Enterprise support + custom integrations'],
];
let sy = doc.y;
tiers.forEach((row, ri) => {
  const bg = ri === 0 ? '#0a0a0a' : (row[0].includes('Business') ? '#1a0a00' : (row[0].includes('Pro') ? '#0a0a1a' : (ri % 2 === 0 ? '#f9f9f9' : '#ffffff')));
  doc.rect(50, sy, 512, 18).fill(bg);
  const tc = ri === 0 ? '#ff4500' : '#333333';
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica-Bold').fontSize(8.5).fillColor(ri === 0 ? ORANGE : DARK_GRAY);
  doc.text(row[0], 55, sy + 4, { width: 140 });
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(ri === 0 ? '#ffffff' : GREEN);
  doc.text(row[1], 200, sy + 4, { width: 80 });
  doc.font(ri === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(ri === 0 ? '#aaaaaa' : MED_GRAY);
  doc.text(row[2], 285, sy + 4, { width: 277 });
  sy += 18;
});
doc.y = sy + 8;

// ─── FINAL PAGE: Quick Reference ──────────────────────────────────────────────
newPage('Quick Reference Cheat Sheet');
sectionHeader('⚡  Quick Reference — All GZMusic Endpoints');

const endpoints = [
  ['Method', 'Path', 'Auth', 'Description'],
  ['GET', '/api/gz-music/chart', 'Public', 'Paginated chart (sort/genre/search)'],
  ['GET', '/api/gz-music/trending', 'Public', 'Top tracks by play count'],
  ['GET', '/api/gz-music/genres', 'Public', 'List of genre tags'],
  ['GET', '/api/gz-music/tracks', 'Public', 'GZ100 curated list'],
  ['GET', '/api/gz-music/tracks/:id', 'Public', 'Single track with liked/rating baked in'],
  ['GET', '/api/gz-music/tracks/by-user/:userId', 'Public', 'Artist\'s submitted tracks'],
  ['GET', '/api/gz-music/find-by-title?title=X', 'Public', 'Fuzzy title search → single track'],
  ['GET', '/api/gz-music/library?q=X', 'Public', 'Shared-to-library tracks'],
  ['GET', '/api/gz-music/likes/batch?ids=1,2,3', 'Session', 'Batch like status check'],
  ['GET', '/api/gz-music/ratings/batch?ids=1,2,3', 'Session', 'Batch rating check'],
  ['POST', '/api/gz-music/tracks/:id/play', 'Public', 'Record play (fire & forget)'],
  ['POST', '/api/gz-music/tracks/:id/like', 'Session', 'Toggle like'],
  ['POST', '/api/gz-music/tracks/:id/rate', 'Session', 'Rate track (0.5–6.0 stars)'],
  ['GET', '/api/gz-music/tracks/:id/comments', 'Public', 'Get comments'],
  ['POST', '/api/gz-music/tracks/:id/comments', 'Session', 'Post comment'],
  ['DELETE', '/api/gz-music/comments/:id', 'Session', 'Delete comment'],
  ['POST', '/api/gz-music/submit', 'Session', 'Upload track (multipart)'],
  ['POST', '/api/gz-music/announce/single', 'Session', 'Announce to one email'],
  ['POST', '/api/gz-music/announce/mailing-list', 'Session', 'Announce to all subscribers'],
  ['GET', '/api/gz-music/announce/subscriber-count', 'Session', 'Count email subscribers'],
  ['POST', '/api/gz-music/tracks', 'Admin', 'Create track (JSON, no file)'],
  ['DELETE', '/api/gz-music/tracks/:id', 'Admin', 'Delete track'],
];

const methodColors = { GET: '#1a3d7a', POST: '#1a7a3f', DELETE: '#7a1a1a', PATCH: '#7a4a00', PUT: '#4a1a7a' };

let qy = doc.y;
endpoints.forEach((row, ri) => {
  const h = ri === 0 ? 18 : 15;
  const bg = ri === 0 ? '#0a0a0a' : (ri % 2 === 0 ? '#f5f5f5' : '#ffffff');
  doc.rect(50, qy, 512, h).fill(bg);
  if (ri > 0) {
    const mc = methodColors[row[0]] || '#333';
    doc.rect(50, qy, 40, h).fill(mc);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff').text(row[0], 52, qy + 4, { width: 36, align: 'center' });
    doc.font('Courier').fontSize(7.5).fillColor('#1a1a1a').text(row[1], 95, qy + 4, { width: 220 });
    const authColor = row[2] === 'Public' ? '#555' : (row[2] === 'Admin' ? '#7a1a1a' : '#1a3d7a');
    doc.font('Helvetica-Bold').fontSize(7).fillColor(authColor).text(row[2], 318, qy + 4, { width: 55 });
    doc.font('Helvetica').fontSize(7.5).fillColor(MED_GRAY).text(row[3], 378, qy + 4, { width: 184 });
  } else {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text(row[0], 52, qy + 5, { width: 40 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[1], 95, qy + 5, { width: 220 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[2], 318, qy + 5, { width: 55 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[3], 378, qy + 5, { width: 184 });
  }
  qy += h;
});
doc.y = qy + 12;

sectionHeader('⚡  Quick Reference — Bands Clubhouse Endpoints');
const bandEndpoints = [
  ['Method', 'Path', 'Auth', 'Description'],
  ['GET', '/api/bands', 'Public', 'List all bands/artists'],
  ['POST', '/api/bands', 'Session', 'Create band'],
  ['GET', '/api/bands/:id', 'Public', 'Band detail + isMember + isFollowing'],
  ['PATCH', '/api/bands/:id', 'Admin', 'Update band (incl. allowGuestPosts)'],
  ['GET', '/api/bands/:id/members', 'Public', 'List members'],
  ['POST', '/api/bands/:id/join', 'Session', 'Join band'],
  ['DELETE', '/api/bands/:id/leave', 'Session', 'Leave band'],
  ['POST', '/api/bands/:id/follow', 'Public', 'Follow band (guests allowed)'],
  ['DELETE', '/api/bands/:id/follow', 'Session', 'Unfollow band'],
  ['GET', '/api/bands/:id/followers', 'Admin', 'Get followers list (admin only)'],
  ['GET', '/api/bands/:id/wall', 'Public', 'Get wall posts (hasLiked baked in)'],
  ['POST', '/api/bands/:id/wall', 'Session/Guest', 'Post to wall (guests if enabled)'],
  ['DELETE', '/api/bands/:id/wall/:postId', 'Session', 'Delete wall post'],
  ['POST', '/api/bands/:id/wall/:postId/like', 'Session', 'Like a wall post'],
  ['DELETE', '/api/bands/:id/wall/:postId/like', 'Session', 'Unlike a wall post'],
  ['GET', '/api/bands/:id/wall/:postId/comments', 'Public', 'Get post comments'],
  ['POST', '/api/bands/:id/wall/:postId/comments', 'Session', 'Comment on post'],
  ['GET', '/api/bands/:id/events', 'Public', 'List events'],
  ['POST', '/api/bands/:id/events', 'Admin', 'Create event'],
  ['DELETE', '/api/bands/:id/events/:eid', 'Admin', 'Delete event'],
  ['GET', '/api/bands/:id/photos', 'Public', 'Gallery photos'],
  ['POST', '/api/bands/:id/photos', 'Session', 'Upload photo (multipart)'],
  ['DELETE', '/api/bands/:id/photos/:pid', 'Admin', 'Delete photo'],
  ['GET', '/api/bands/:id/tracks', 'Public', 'Band\'s GZMusic tracks'],
  ['GET', '/api/bands/:id/tv', 'Public', 'Zito.TV shows'],
  ['POST', '/api/bands/:id/tv', 'Admin', 'Add TV show'],
  ['DELETE', '/api/bands/:id/tv/:sid', 'Admin', 'Delete TV show'],
  ['GET', '/api/bands/:id/roster', 'Public', 'Public roster'],
  ['POST', '/api/bands/:id/roster', 'Admin', 'Add roster member'],
  ['PUT', '/api/bands/:id/roster/:rid', 'Admin', 'Update roster member'],
  ['DELETE', '/api/bands/:id/roster/:rid', 'Admin', 'Remove from roster'],
];

let by = doc.y;
bandEndpoints.forEach((row, ri) => {
  if (by > 720) { doc.addPage(); by = 55; }
  const h = ri === 0 ? 18 : 14;
  const bg = ri === 0 ? '#0a0a0a' : (ri % 2 === 0 ? '#f0f5ff' : '#ffffff');
  doc.rect(50, by, 512, h).fill(bg);
  if (ri > 0) {
    const mc = methodColors[row[0]] || '#333';
    doc.rect(50, by, 40, h).fill(mc);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff').text(row[0], 52, by + 3.5, { width: 36, align: 'center' });
    doc.font('Courier').fontSize(7.5).fillColor('#1a1a1a').text(row[1], 95, by + 3.5, { width: 215 });
    const authColor = row[2] === 'Public' ? '#555' : (row[2] === 'Admin' ? '#7a1a1a' : (row[2].includes('Guest') ? '#4a7a00' : '#1a3d7a'));
    doc.font('Helvetica-Bold').fontSize(7).fillColor(authColor).text(row[2], 315, by + 3.5, { width: 65 });
    doc.font('Helvetica').fontSize(7.5).fillColor(MED_GRAY).text(row[3], 385, by + 3.5, { width: 177 });
  } else {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(ORANGE).text(row[0], 52, by + 5, { width: 40 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[1], 95, by + 5, { width: 215 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[2], 315, by + 5, { width: 65 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#aaaaaa').text(row[3], 385, by + 5, { width: 177 });
  }
  by += h;
});
doc.y = by + 8;

// Footer on last page
doc.moveDown(1);
doc.rect(50, doc.y, 512, 0.5).fill(ORANGE);
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(8).fillColor('#888888').text('Gigzito Engineering · gigzito.com · Confidential — For internal/partner development use only', { align: 'center' });
doc.font('Helvetica').fontSize(8).fillColor('#555555').text('API subject to change. All endpoints served from https://gigzito.com', { align: 'center' });

doc.end();
out.on('finish', () => console.log('PDF written: GZMusic_API_Reference.pdf'));
