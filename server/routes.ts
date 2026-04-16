import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { getIO } from "./socket";
import { api } from "@shared/routes";
import { z } from "zod";
import sharp from "sharp";
import { scrypt, randomBytes, createHash, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { sendMfaCode, sendTriageNotification, sendVerificationEmail, sendContentDisabledNotification, sendContentDeletedNotification, sendAdInquiryNotification, sendAudienceBroadcast, sendEmail, sendInvitationEmail, sendMassNotification, sendGZMusicAnnouncement, sendGroupInviteEmail, sendGZFlashCoupon } from "./email";
import fs from "fs";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import { inspectFileSync, roccoScan, moveToFinalDest, destroyContraband } from "./inspector";

// ── Safe Haven directories — created at startup, never wiped by Rocco ─────────
const SAFE_HAVENS = ["uploads", "uploads/videos", "uploads/gz-music", "ads", "quarantine"];
SAFE_HAVENS.forEach((d) => {
  const dir = path.join(process.cwd(), d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Quarantine storage — ALL disk uploads land here first ──────────────────────
const quarantineDir = path.join(process.cwd(), "quarantine");
const quarantineStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, quarantineDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
  },
});

// ── Inspector helper — run after multer saves to quarantine ───────────────────
function runInspector(
  req: any, res: any,
  finalDir: string,
  fileField: string = "file",
  expectedCategory: "image" | "video" | "audio" | "any" = "any"
): { ok: true; finalPath: string; filename: string } | { ok: false } {
  const file: Express.Multer.File | undefined = req.file ?? req.files?.[fileField]?.[0] ?? req.files?.[fileField];
  if (!file) { res.status(400).json({ message: "No file received" }); return { ok: false }; }

  const result = inspectFileSync(file.path, file.mimetype);
  if (!result.pass) {
    destroyContraband(file.path, result.reason ?? "failed inspection");
    console.warn(`[Inspector] Upload DECLINED for user ${req.session?.userId ?? "unknown"}: ${result.reason}`);
    res.status(422).json({ message: `Upload declined: ${result.reason}` });
    return { ok: false };
  }

  const finalPath = moveToFinalDest(file.path, finalDir, file.filename);
  console.log(`[Inspector] PASS → ${finalPath} (${result.detectedType})`);
  return { ok: true, finalPath, filename: file.filename };
}

const upload = multer({
  storage: quarantineStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const adImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const videoUpload = multer({
  storage: quarantineStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/ogg", "video/3gpp", "video/mpeg", "video/x-m4v"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

const gzMusicUpload = multer({
  storage: quarantineStorage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.fieldname === "audio" &&
      (file.mimetype.startsWith("audio/") || file.originalname.toLowerCase().endsWith(".mp3"))
    ) { cb(null, true); return; }
    if (
      file.fieldname === "license" &&
      (file.mimetype.startsWith("image/") || ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.mimetype))
    ) { cb(null, true); return; }
    if (file.fieldname === "cover" && file.mimetype.startsWith("image/")) { cb(null, true); return; }
    cb(new Error(`Invalid file type for field: ${file.fieldname}`));
  },
});

// === BIF REPUTATION SCANNER ===
const BIF_SCAN_STATUSES = ["SCANNING", "CLEAN", "FLAGGED", "APPEAL_PENDING", "APPEAL_DENIED", "HUMAN_REVIEW"];

async function callBif(listingId: number, videoUrl: string, ownerUserId: number): Promise<void> {
  const bifUrl = process.env.BIF_API_URL;
  if (!bifUrl) {
    // Bif not configured — auto-pass
    await storage.updateScanStatus(listingId, "CLEAN", null);
    try { getIO().emit("SCAN_UPDATE", { listingId, status: "CLEAN", ownerUserId }); } catch (_) {}
    return;
  }
  const callbackUrl = `${process.env.APP_BASE_URL || "http://localhost:5000"}/api/scan/callback`;
  const secret = process.env.BIF_WEBHOOK_SECRET || "";
  try {
    const fullVideoUrl = videoUrl.startsWith("/") ? `${process.env.APP_BASE_URL || "http://localhost:5000"}${videoUrl}` : videoUrl;
    await fetch(bifUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, videoUrl: fullVideoUrl, ownerUserId, callbackUrl, secret }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(`[Bif] Failed to dispatch scan for listing ${listingId}:`, err);
    // Don't block the user — leave as SCANNING, Jim's team handles manual resolution
  }
}

// === BOT CHECKS ===
function runBotChecks(data: {
  offerTitle: string;
  description: string;
  couponCode?: string | null;
  ctaLink: string;
  companyUrl: string;
}): { warning: boolean; message: string | null } {
  const WEAK_MSG = "This offer may not qualify as a GigJack. GigJacks should be high-impact limited-time offers. Consider increasing the discount or adding scarcity.";

  // URL validation
  try { new URL(data.ctaLink); new URL(data.companyUrl); } catch {
    return { warning: true, message: "Please provide valid HTTPS URLs for company and CTA link." };
  }

  const fullText = `${data.offerTitle} ${data.description}`;

  // Discount strength detection
  const discountMatch = fullText.match(/(\d+)\s*%\s*off/i);
  if (discountMatch && parseInt(discountMatch[1]) < 10) {
    return { warning: true, message: WEAK_MSG };
  }

  // Generic coupon detection
  if (data.couponCode) {
    const genericPatterns = ["SAVE10", "DISCOUNT", "COUPON", "PROMO", "OFF10", "DEAL", "CODE", "OFFER"];
    if (genericPatterns.some((p) => data.couponCode!.toUpperCase() === p)) {
      return { warning: true, message: WEAK_MSG };
    }
  }

  // Spam detection: excessive exclamation marks
  const exclamations = (fullText.match(/!/g) || []).length;
  if (exclamations > 4) {
    return { warning: true, message: WEAK_MSG };
  }

  // Spam detection: mostly caps
  const words = fullText.split(/\s+/).filter((w) => w.length > 3);
  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (words.length > 3 && capsWords.length / words.length > 0.6) {
    return { warning: true, message: WEAK_MSG };
  }

  return { warning: false, message: null };
}

const scryptAsync = promisify(scrypt);

const DAILY_CAP = 100;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split(".");
  const hashBuf = Buffer.from(hash, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuf, suppliedBuf);
}

const JWT_SECRET = process.env.SESSION_SECRET ?? "gigzito-dev-secret";

/** Populate req.session from a JWT Bearer token when no cookie session exists */
function injectJwtSession(req: any): void {
  if (req.session?.userId) return; // already authenticated via cookie
  const auth = req.headers["authorization"] ?? "";
  if (!auth.startsWith("Bearer ")) return;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    req.session = req.session ?? {};
    req.session.userId = payload.userId;
    req.session.role = payload.role;
    req.session.subscriptionTier = payload.subscriptionTier;
  } catch {
    // invalid / expired token — leave session empty, requireAuth will reject
  }
}

function requireAuth(req: any, res: any): boolean {
  injectJwtSession(req);
  if (!req.session?.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  return true;
}

function requireAdmin(req: any, res: any): boolean {
  injectJwtSession(req);
  if (!req.session?.userId || !["ADMIN", "SUPER_ADMIN"].includes(req.session?.role)) {
    res.status(401).json({ message: "Admin only" });
    return false;
  }
  return true;
}

function requireContentAdmin(req: any, res: any): boolean {
  injectJwtSession(req);
  if (!req.session?.userId || !["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(req.session?.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
}

function requireSuperAdmin(req: any, res: any): boolean {
  injectJwtSession(req);
  if (!req.session?.userId || req.session?.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Super Admin only" });
    return false;
  }
  return true;
}

async function requirePaidTier(req: any, res: any): Promise<boolean> {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  const user = await storage.getUserById(req.session.userId);
  const tier = user?.subscriptionTier ?? "GZLurker";
  if (tier === "GZLurker") {
    res.status(403).json({ message: "Upgrade to GZMarketer to engage!", upgradeRequired: true });
    return false;
  }
  return true;
}

// GZ-Bot: Phase 1 regex naughty list (OpenAI wires in once OPENAI_API_KEY is set)
const GZ_NAUGHTY_LIST = /\b(fuck|shit|ass|bitch|cunt|dick|pussy|nigger|faggot|whore|slut)\b/gi;
async function gzBotScrub(text: string): Promise<{ clean: boolean; reason?: string }> {
  if (GZ_NAUGHTY_LIST.test(text)) {
    GZ_NAUGHTY_LIST.lastIndex = 0;
    return { clean: false, reason: "Contains prohibited language." };
  }
  GZ_NAUGHTY_LIST.lastIndex = 0;
  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ input: text }),
        signal: AbortSignal.timeout(4000),
      });
      const data = await resp.json() as any;
      if (data.results?.[0]?.flagged) return { clean: false, reason: "Content flagged by GZ-Bot." };
    } catch {
      // OpenAI unavailable — pass through to regex-only
    }
  }
  return { clean: true };
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

const SEEDED_ADMIN_EMAIL = "admin@gigzito.com";

async function ensureAdminUser() {
  try {
    let adminUser = await storage.getUserByEmail(SEEDED_ADMIN_EMAIL);
    if (!adminUser) {
      const hashed = await hashPassword("Arizona22");
      adminUser = await storage.createUser({ email: SEEDED_ADMIN_EMAIL, password: hashed, role: "SUPER_ADMIN" });
      console.log("Super Admin account created: admin@gigzito.com");
    } else if (adminUser.role === "ADMIN") {
      await storage.updateUserRole(adminUser.id, "SUPER_ADMIN");
      console.log("Admin upgraded to SUPER_ADMIN");
    }
    // Ensure a minimal profile exists (username only, no social media)
    const existingProfile = await storage.getProfileByUserId(adminUser.id);
    if (!existingProfile) {
      await storage.createProfile({
        userId: adminUser.id,
        username: "gzadmin",
        displayName: "Gigzito Admin",
        bio: "",
        avatarUrl: "",
        thumbUrl: "",
        contactEmail: null,
        contactPhone: null,
        contactTelegram: null,
        websiteUrl: null,
        primaryCategory: null,
        location: null,
        instagramUrl: null,
        youtubeUrl: null,
        tiktokUrl: null,
      });
      console.log("Admin profile created");
    } else if (existingProfile.username === "admin") {
      // Migrate legacy "admin" username to non-reserved "gzadmin"
      await storage.updateProfile(adminUser.id, { username: "gzadmin", displayName: "Gigzito Admin" });
      console.log("Admin username migrated from 'admin' to 'gzadmin'");
    }
  } catch (err) {
    console.error("ensureAdminUser error:", err);
  }
}

async function ensureJoshProfile() {
  try {
    const joshUser = await storage.getUserByEmail("josh@gigzito.com");
    if (!joshUser) return;
    const existingProfile = await storage.getProfileByUserId(joshUser.id);
    if (!existingProfile) {
      await storage.createProfile({
        userId: joshUser.id,
        username: "josh",
        displayName: "Josh",
        bio: "",
        avatarUrl: "",
        thumbUrl: "",
        contactEmail: null,
        contactPhone: null,
        contactTelegram: null,
        websiteUrl: null,
        primaryCategory: null,
        location: null,
        instagramUrl: null,
        youtubeUrl: null,
        tiktokUrl: null,
      });
      console.log("Josh profile created");
    }
  } catch (err) {
    console.error("ensureJoshProfile error:", err);
  }
}

// Usernames that are reserved and can never be claimed by regular users
const RESERVED_USERNAMES = new Set([
  "admin", "gzadmin", "gigzito", "zito", "root", "support", "help",
  "api", "www", "mail", "static", "assets", "cdn", "app", "dev",
  "staff", "mod", "moderator", "system", "official", "gigzito_admin",
  "me", "new", "profile", "provider", "settings", "dashboard",
]);

function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase().trim());
}

async function seedDatabase() {
  try {
    const count = await storage.getTodayListingCount();
    const existing = await storage.getAllListingsWithProviders();
    if (existing.length > 0) return;

    const sampleProviders = [
      { email: "alex@gigzito.com", displayName: "Alex Rivera", username: "alexrivera", bio: "Digital marketing strategist with 10+ years helping brands grow online.", avatarUrl: "https://i.pravatar.cc/150?img=1", thumbUrl: "https://picsum.photos/seed/alex/400/300", contactEmail: "alex@gigzito.com", websiteUrl: "https://alexrivera.com", primaryCategory: "MARKETING", location: "New York, NY", instagramUrl: "https://instagram.com/alexrivera", youtubeUrl: "https://youtube.com/@alexrivera" },
      { email: "maya@gigzito.com", displayName: "Maya Chen", username: "mayacoach", bio: "Life & business coach. I help entrepreneurs unlock their full potential.", avatarUrl: "https://i.pravatar.cc/150?img=5", thumbUrl: "https://picsum.photos/seed/maya/400/300", contactEmail: "maya@gigzito.com", contactTelegram: "@mayacoach", primaryCategory: "COACHING", location: "San Francisco, CA", instagramUrl: "https://instagram.com/mayacoach" },
      { email: "james@gigzito.com", displayName: "James Okafor", username: "jamesokafor", bio: "Course creator & e-learning expert. Built 20+ online courses.", avatarUrl: "https://i.pravatar.cc/150?img=8", thumbUrl: "https://picsum.photos/seed/james/400/300", contactEmail: "james@gigzito.com", websiteUrl: "https://jamesokafor.io", primaryCategory: "COURSES", location: "London, UK", youtubeUrl: "https://youtube.com/@jamesokafor" },
      { email: "sofia@gigzito.com", displayName: "Sofia Martinez", username: "sofiamarketing", bio: "SEO & content marketing specialist. Ranked 500+ pages #1 on Google.", avatarUrl: "https://i.pravatar.cc/150?img=9", thumbUrl: "https://picsum.photos/seed/sofia/400/300", contactEmail: "sofia@gigzito.com", contactPhone: "+1-555-0101", primaryCategory: "MARKETING", location: "Miami, FL", instagramUrl: "https://instagram.com/sofiamarketing" },
      { email: "noah@gigzito.com", displayName: "Noah Kim", username: "noahkimcoach", bio: "Mindset coach & NLP practitioner. Transforming lives one session at a time.", avatarUrl: "https://i.pravatar.cc/150?img=12", thumbUrl: "https://picsum.photos/seed/noah/400/300", contactEmail: "noah@gigzito.com", websiteUrl: "https://noahkimcoach.com", primaryCategory: "COACHING", location: "Austin, TX", youtubeUrl: "https://youtube.com/@noahkimcoach" },
      { email: "priya@gigzito.com", displayName: "Priya Patel", username: "priyateaches", bio: "Full-stack developer turned educator. Teaching web dev to 50k+ students.", avatarUrl: "https://i.pravatar.cc/150?img=16", thumbUrl: "https://picsum.photos/seed/priya/400/300", contactEmail: "priya@gigzito.com", contactTelegram: "@priyateaches", primaryCategory: "COURSES", location: "Toronto, CA", youtubeUrl: "https://youtube.com/@priyateaches" },
    ];

    const profiles: any[] = [];
    for (const p of sampleProviders) {
      const hashed = await hashPassword("password123");
      const user = await storage.createUser({ email: p.email, password: hashed, role: "PROVIDER" });
      const profile = await storage.createProfile({
        userId: user.id,
        displayName: p.displayName,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        thumbUrl: p.thumbUrl,
        contactEmail: p.contactEmail ?? null,
        contactPhone: p.contactPhone ?? null,
        contactTelegram: p.contactTelegram ?? null,
        websiteUrl: p.websiteUrl ?? null,
        username: (p as any).username ?? null,
        primaryCategory: (p as any).primaryCategory ?? null,
        location: (p as any).location ?? null,
        instagramUrl: (p as any).instagramUrl ?? null,
        youtubeUrl: (p as any).youtubeUrl ?? null,
        tiktokUrl: null,
      });
      profiles.push(profile);
    }

    const sampleListings = [
      { providerId: profiles[0].id, vertical: "MARKETING" as const, title: "5 Email Hacks That Tripled My Open Rates", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 18, description: "Learn the exact subject line formulas I use to get 50%+ open rates.", tags: ["email", "marketing", "growth"], ctaUrl: "https://alexrivera.com/email-course" },
      { providerId: profiles[0].id, vertical: "MARKETING" as const, title: "How I Got 10k Instagram Followers in 30 Days", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 20, description: "Organic growth strategies that actually work in 2025.", tags: ["instagram", "social-media", "growth"], ctaUrl: "https://alexrivera.com/ig-guide" },
      { providerId: profiles[3].id, vertical: "MARKETING" as const, title: "SEO in 2025: What's Actually Working", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 19, description: "The three ranking factors that matter most right now.", tags: ["seo", "google", "content"], ctaUrl: "https://sofiamarketingpro.com" },
      { providerId: profiles[3].id, vertical: "MARKETING" as const, title: "Content Strategy for B2B Brands", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 17, description: "Build a content machine that generates leads on autopilot.", tags: ["b2b", "content", "strategy"] },
      { providerId: profiles[5].id, vertical: "MARKETING" as const, title: "Facebook Ads That Convert: My Formula", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 20, description: "The ad structure I use to get $0.05 clicks and 8x ROAS.", tags: ["facebook-ads", "paid-traffic", "ecommerce"] },
      { providerId: profiles[1].id, vertical: "COACHING" as const, title: "Stop Playing Small: A 10-Minute Exercise", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 14, description: "This quick journaling exercise rewires your subconscious for success.", tags: ["mindset", "coaching", "productivity"], ctaUrl: "https://mayacoachingco.com" },
      { providerId: profiles[1].id, vertical: "COACHING" as const, title: "Work-Life Balance is a Myth — Here's What to Do Instead", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 16, description: "Reframing work-life integration for ambitious founders.", tags: ["work-life", "burnout", "wellness"] },
      { providerId: profiles[4].id, vertical: "COACHING" as const, title: "Overcome Imposter Syndrome for Good", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 18, description: "NLP technique to rewire limiting beliefs in under 10 minutes.", tags: ["imposter-syndrome", "nlp", "confidence"], ctaUrl: "https://noahkimcoach.com/nlp" },
      { providerId: profiles[4].id, vertical: "COACHING" as const, title: "Morning Routine of High Performers", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 20, description: "The 5-step morning routine that transformed my productivity.", tags: ["morning-routine", "habits", "performance"] },
      { providerId: profiles[0].id, vertical: "COACHING" as const, title: "How to Set Goals You'll Actually Achieve", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 15, description: "The SMART goal framework evolved for modern entrepreneurs.", tags: ["goals", "planning", "entrepreneur"] },
      { providerId: profiles[2].id, vertical: "COURSES" as const, title: "Build Your First SaaS in 30 Days", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 19, description: "Step-by-step course: idea to launch with real paying customers.", tags: ["saas", "startup", "coding"], ctaUrl: "https://jamesokafor.io/saas-course" },
      { providerId: profiles[2].id, vertical: "COURSES" as const, title: "Notion Mastery: Build Your Second Brain", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 17, description: "Complete Notion system for creators and entrepreneurs.", tags: ["notion", "productivity", "pkm"] },
      { providerId: profiles[5].id, vertical: "COURSES" as const, title: "React & TypeScript: Zero to Hired", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 20, description: "The only React course you need to land a $100k+ dev job.", tags: ["react", "typescript", "webdev"], ctaUrl: "https://priyateaches.dev/react" },
      { providerId: profiles[5].id, vertical: "COURSES" as const, title: "AI Prompt Engineering Masterclass", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 18, description: "Master ChatGPT, Claude, and Gemini to 10x your output.", tags: ["ai", "chatgpt", "prompts"] },
      { providerId: profiles[1].id, vertical: "COURSES" as const, title: "The Mindful Leader: Emotional Intelligence Course", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 16, description: "Develop EQ skills that make teams love working with you.", tags: ["leadership", "eq", "management"] },
      { providerId: profiles[3].id, vertical: "COURSES" as const, title: "Copywriting Crash Course: Write to Sell", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 14, description: "Persuasive writing frameworks used by 8-figure marketers.", tags: ["copywriting", "sales", "writing"] },
      { providerId: profiles[4].id, vertical: "COURSES" as const, title: "Meditation for Busy People: 5-Minute Practice", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 12, description: "Science-backed techniques that fit any schedule.", tags: ["meditation", "wellness", "stress"] },
      { providerId: profiles[2].id, vertical: "COURSES" as const, title: "YouTube Growth Formula: 0 to 100k Subs", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", durationSeconds: 20, description: "Exact system used to grow from 0 to 100k YouTube subscribers.", tags: ["youtube", "content-creation", "growth"], ctaUrl: "https://jamesokafor.io/yt-course" },
    ];

    for (const listing of sampleListings) {
      await storage.createListing({ ...listing, dropDate: getTodayDate(), pricePaidCents: 300 });
    }

    console.log("Database seeded with sample data");
  } catch (err) {
    console.error("Seed error:", err);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();
  await ensureAdminUser();
  await ensureJoshProfile();

  // === AUTH ===
  const verifyEmailLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many verification attempts. Please wait a minute and try again." },
  });

  const resendVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many resend requests. Please wait a few minutes." },
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const { email, password, disclaimerAccepted, tier } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      if (!disclaimerAccepted) return res.status(400).json({ message: "You must accept the participation disclaimer to register." });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already registered" });
      const hashed = await hashPassword(password);
      const verificationToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(verificationToken).digest("hex");
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const emailResult = await sendVerificationEmail(
        email,
        `${req.protocol}://${req.get("host")}/verify-email?token=${verificationToken}`
      );
      const autoVerified = emailResult.devMode && !emailResult.verifyUrl;
      const validTiers = ["GZLurker", "GZGroups", "GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];
      const selectedTier = tier && validTiers.includes(tier) ? tier : "GZLurker";
      const user = await storage.createUser({
        email, password: hashed, role: "PROVIDER", disclaimerAccepted: true,
        subscriptionTier: selectedTier,
        emailVerified: autoVerified,
        emailVerificationToken: autoVerified ? null : tokenHash,
        emailVerificationExpiresAt: autoVerified ? null : tokenExpiresAt,
      });
      await storage.createProfile({ userId: user.id, displayName: "", bio: "", avatarUrl: "", thumbUrl: "", contactEmail: null, contactPhone: null, contactTelegram: null, websiteUrl: null, username: null, primaryCategory: null, location: null, instagramUrl: null, youtubeUrl: null, tiktokUrl: null });
      if (autoVerified) {
        (req.session as any).userId = user.id;
        (req.session as any).role = user.role;
        (req.session as any).subscriptionTier = user.subscriptionTier ?? "GZLurker";
      }
      const resp: any = { requiresVerification: !autoVerified, email };
      if (emailResult.verifyUrl) resp.devVerifyUrl = emailResult.verifyUrl;
      return res.status(201).json(resp);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/auth/verify-email", verifyEmailLimiter, async (req, res) => {
    try {
      const { token } = req.query as { token?: string };
      if (!token) return res.status(400).json({ message: "Verification link invalid or expired." });
      const user = await storage.getUserByVerificationToken(token);
      if (!user) return res.status(400).json({ message: "Verification link invalid or expired." });
      if (user.emailVerified) return res.json({ alreadyVerified: true });
      await storage.verifyUserEmail(user.id);
      return res.json({ verified: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/resend-verification", resendVerifyLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const user = await storage.getUserByEmail(email);
      if (!user || user.emailVerified) {
        return res.json({ sent: true });
      }
      const verificationToken = randomBytes(32).toString("hex");
      await storage.updateVerificationToken(user.id, verificationToken);
      const emailResult = await sendVerificationEmail(
        email,
        `${req.protocol}://${req.get("host")}/verify-email?token=${verificationToken}`
      );
      return res.json({ sent: true, devMode: emailResult.devMode });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await verifyPassword(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      if (user.status === "disabled") return res.status(403).json({ message: "Your account has been disabled. Please contact support." });
      if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email before logging in.", emailNotVerified: true, email: user.email });
      // Generate MFA code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.deleteOldMfaCodes(user.id);
      await storage.createMfaCode(user.id, code, expiresAt);
      const resp: any = { mfaRequired: true, email: user.email };
      try {
        const emailResult = await sendMfaCode(user.email, code);
        if (emailResult.devMode) resp.devCode = emailResult.previewCode;
      } catch (emailErr: any) {
        console.error("[MFA] Email send failed:", emailErr?.message ?? emailErr);
        // Log the code to server logs as fallback so admins can retrieve it
        console.warn(`[MFA FALLBACK] Code for ${user.email}: ${code}`);
        resp.emailError = true;
      }
      return res.json(resp);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/mfa/verify", async (req, res) => {
    try {
      const { email, code, rememberMe } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid verification code." });
      const mfa = await storage.getLatestMfaCode(user.id);
      if (!mfa) return res.status(401).json({ message: "Invalid verification code." });
      if (mfa.usedAt) return res.status(401).json({ message: "This code has already been used." });
      if (new Date() > new Date(mfa.expiresAt)) return res.status(401).json({ message: "This code has expired. Please log in again." });
      if (mfa.code !== String(code).trim()) return res.status(401).json({ message: "Invalid verification code." });
      await storage.markMfaCodeUsed(mfa.id);
      const profile = await storage.getProfileByUserId(user.id);
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      (req.session as any).subscriptionTier = user.subscriptionTier ?? "GZLurker";
      // If "Remember me" checked, persist the session for 30 days; otherwise it expires when the browser closes
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }
      return res.json({ user: { ...user, password: undefined }, profile: profile ?? null });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/mfa/resend", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(200).json({ message: "If the email exists, a new code was sent." });
      const existing = await storage.getLatestMfaCode(user.id);
      if (existing) {
        const RESEND_COOLDOWN_MS = 30 * 1000;
        const lastResend = existing.lastResendAt ?? existing.createdAt;
        if (Date.now() - new Date(lastResend).getTime() < RESEND_COOLDOWN_MS) {
          const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(lastResend).getTime())) / 1000);
          return res.status(429).json({ message: `Please wait ${waitSec} seconds before resending.` });
        }
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.deleteOldMfaCodes(user.id);
      await storage.createMfaCode(user.id, code, expiresAt);
      const emailResult = await sendMfaCode(user.email, code);
      const resp: any = { message: "Code resent." };
      if (emailResult.devMode) resp.devCode = emailResult.previewCode;
      return res.json(resp);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  // GET /logout — navigating to this URL in any browser clears the session and redirects home
  app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/?signedout=1"));
  });

  // =====================================================================
  // MOBILE API — JWT-based auth (same credentials, returns Bearer token)
  // =====================================================================

  // Step 1: email + password → sends MFA code, returns { mfaRequired: true }
  app.post("/api/mobile/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await verifyPassword(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      if (user.status === "disabled") return res.status(403).json({ message: "Account disabled." });
      if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email first.", emailNotVerified: true });
      // Send MFA code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.deleteOldMfaCodes(user.id);
      await storage.createMfaCode(user.id, code, expiresAt);
      const emailResult = await sendMfaCode(user.email, code);
      const resp: any = { mfaRequired: true, email: user.email };
      if (emailResult.devMode) resp.devCode = emailResult.previewCode;
      return res.json(resp);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Step 2: email + MFA code → returns JWT access token
  app.post("/api/mobile/mfa/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid verification code." });
      const mfa = await storage.getLatestMfaCode(user.id);
      if (!mfa) return res.status(401).json({ message: "Invalid verification code." });
      if (mfa.usedAt) return res.status(401).json({ message: "Code already used." });
      if (new Date() > new Date(mfa.expiresAt)) return res.status(401).json({ message: "Code expired." });
      const clean = code.replace(/\s/g, "");
      if (mfa.code !== clean) return res.status(401).json({ message: "Invalid verification code." });
      await storage.markMfaCodeUsed(mfa.id);
      const profile = await storage.getProfileByUserId(user.id);
      const token = jwt.sign(
        { userId: user.id, role: user.role, subscriptionTier: user.subscriptionTier ?? "GZLurker" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscriptionTier: user.subscriptionTier ?? "GZLurker",
          username: profile?.username ?? null,
          displayName: profile?.displayName ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Refresh / validate token → returns new token + current user
  app.post("/api/mobile/refresh", async (req, res) => {
    try {
      const auth = req.headers["authorization"] ?? "";
      if (!auth.startsWith("Bearer ")) return res.status(401).json({ message: "Bearer token required" });
      let payload: any;
      try { payload = jwt.verify(auth.slice(7), JWT_SECRET); }
      catch { return res.status(401).json({ message: "Invalid or expired token" }); }
      const user = await storage.getUserById(payload.userId);
      if (!user || user.status === "disabled") return res.status(401).json({ message: "Account unavailable" });
      const profile = await storage.getProfileByUserId(user.id);
      const token = jwt.sign(
        { userId: user.id, role: user.role, subscriptionTier: user.subscriptionTier ?? "GZLurker" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscriptionTier: user.subscriptionTier ?? "GZLurker",
          username: profile?.username ?? null,
          displayName: profile?.displayName ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ── Shared JWT resolver for mobile endpoints ──────────────────────────────
  function resolveMobileUser(req: any, res: any): number | null {
    const auth = (req.headers["authorization"] as string) ?? "";
    if (!auth.startsWith("Bearer ")) { res.status(401).json({ message: "Bearer token required" }); return null; }
    try {
      const payload: any = jwt.verify(auth.slice(7), JWT_SECRET);
      return payload.userId as number;
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
      return null;
    }
  }

  // GET /api/mobile/me — full account + GeeZee profile (Bearer token)
  app.get("/api/mobile/me", async (req, res) => {
    try {
      const userId = resolveMobileUser(req, res);
      if (userId === null) return;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const profile = await storage.getProfileByUserId(user.id);
      return res.json({
        account: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscriptionTier: user.subscriptionTier ?? "GZLurker",
          status: user.status,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        profile: profile
          ? {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              bio: profile.bio,
              avatarUrl: profile.avatarUrl,
              thumbUrl: profile.thumbUrl,
              primaryCategory: profile.primaryCategory,
              location: profile.location,
              contactEmail: profile.contactEmail,
              contactPhone: profile.contactPhone,
              contactTelegram: profile.contactTelegram,
              websiteUrl: profile.websiteUrl,
              instagramUrl: profile.instagramUrl,
              youtubeUrl: profile.youtubeUrl,
              tiktokUrl: profile.tiktokUrl,
              facebookUrl: profile.facebookUrl,
              discordUrl: profile.discordUrl,
              twitterUrl: profile.twitterUrl,
              photo1Url: profile.photo1Url,
              photo2Url: profile.photo2Url,
              photo3Url: profile.photo3Url,
              photo4Url: profile.photo4Url,
              photo5Url: profile.photo5Url,
              photo6Url: profile.photo6Url,
              showPhone: profile.showPhone,
            }
          : null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // PUT /api/mobile/profile — update GeeZee profile (Bearer token)
  // Any field from the GeeZee profile can be sent; only provided fields are updated.
  // Available regardless of subscription tier.
  app.put("/api/mobile/profile", async (req, res) => {
    try {
      const userId = resolveMobileUser(req, res);
      if (userId === null) return;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Strip protected fields so callers cannot spoof them
      const { id: _id, userId: _uid, ...editable } = req.body as any;

      const ALLOWED_PROFILE_FIELDS = new Set([
        "displayName", "bio", "avatarUrl", "thumbUrl", "primaryCategory", "location",
        "contactEmail", "contactPhone", "contactTelegram", "websiteUrl", "username",
        "instagramUrl", "youtubeUrl", "tiktokUrl", "facebookUrl", "discordUrl", "twitterUrl",
        "photo1Url", "photo2Url", "photo3Url", "photo4Url", "photo5Url", "photo6Url",
        "showPhone",
      ]);
      const filtered: Record<string, any> = {};
      for (const key of Object.keys(editable)) {
        if (ALLOWED_PROFILE_FIELDS.has(key)) filtered[key] = editable[key];
      }
      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ message: "No valid profile fields provided" });
      }
      if (filtered.username && isReservedUsername(filtered.username)) {
        return res.status(400).json({ message: `"${filtered.username}" is a reserved username and cannot be used.` });
      }

      const profile = await storage.updateProfile(userId, filtered);
      if (!profile) return res.status(404).json({ message: "Profile not found — create one via the web app first" });
      return res.json({ ok: true, profile });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // PATCH /api/mobile/account — update account-level info (email) (Bearer token)
  app.patch("/api/mobile/account", async (req, res) => {
    try {
      const userId = resolveMobileUser(req, res);
      if (userId === null) return;
      const { email } = req.body as { email?: string };
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "email is required" });
      }
      const emailTrimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      // Check if email is already taken by another user
      const existing = await storage.getUserByEmail(emailTrimmed);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Email already in use" });
      }
      const updated = await storage.updateUserEmail(userId, emailTrimmed);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({
        ok: true,
        account: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          subscriptionTier: updated.subscriptionTier,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // GET /api/mobile/admin/dashboard — Super-admin dashboard summary (Bearer token, SUPER_ADMIN only)
  app.get("/api/mobile/admin/dashboard", async (req, res) => {
    try {
      if (!requireSuperAdmin(req, res)) return;

      const [allUsers, allListings, allGigJacks, auditLogs, todayCount, todayRevenue, flashAds] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllListingsWithProviders(),
        storage.getAllGigJacks(),
        storage.getAuditLogs(20),
        storage.getTodayListingCount(),
        storage.getTodayRevenue(),
        storage.adminGetAllGzFlashAds(),
      ]);

      // Users
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter((u) => u.status !== "disabled" && !u.deletedAt).length;
      const disabledUsers = allUsers.filter((u) => u.status === "disabled").length;
      const deletedUsers = allUsers.filter((u) => !!u.deletedAt).length;
      const byTier = {
        GZLurker: allUsers.filter((u) => (u.subscriptionTier ?? "GZLurker") === "GZLurker").length,
        GZMarketer: allUsers.filter((u) => u.subscriptionTier === "GZMarketer").length,
        GZMarketerPro: allUsers.filter((u) => u.subscriptionTier === "GZMarketerPro").length,
        GZBusiness: allUsers.filter((u) => u.subscriptionTier === "GZBusiness").length,
      };
      const byRole: Record<string, number> = {};
      for (const u of allUsers) { byRole[u.role] = (byRole[u.role] ?? 0) + 1; }

      // Listings
      const listingsByStatus: Record<string, number> = {};
      for (const l of allListings) { listingsByStatus[l.status] = (listingsByStatus[l.status] ?? 0) + 1; }

      // GigJacks
      const gigJacksByStatus: Record<string, number> = {};
      for (const g of allGigJacks) { gigJacksByStatus[g.reviewStatus ?? "UNKNOWN"] = (gigJacksByStatus[g.reviewStatus ?? "UNKNOWN"] ?? 0) + 1; }

      // GZFlash
      const flashByStatus: Record<string, number> = {};
      for (const f of flashAds) { flashByStatus[f.status] = (flashByStatus[f.status] ?? 0) + 1; }
      const activeFlash = flashAds.filter((f: any) => f.status === "active").length;
      const hotFlash = flashAds.filter((f: any) => (f.potencyScore ?? 0) >= 90).length;

      // Recent 10 users
      const recentUsers = allUsers
        .filter((u) => u.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10)
        .map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          subscriptionTier: u.subscriptionTier ?? "GZLurker",
          status: u.status,
          createdAt: u.createdAt,
          profile: u.profile
            ? { displayName: u.profile.displayName, username: u.profile.username, avatarUrl: u.profile.avatarUrl }
            : null,
        }));

      return res.json({
        users: { total: totalUsers, active: activeUsers, disabled: disabledUsers, deleted: deletedUsers, byTier, byRole },
        listings: { total: allListings.length, today: todayCount, byStatus: listingsByStatus },
        gigJacks: { total: allGigJacks.length, byStatus: gigJacksByStatus },
        gzFlash: { total: flashAds.length, active: activeFlash, hot: hotFlash, byStatus: flashByStatus },
        revenue: { todayCents: todayRevenue, todayDollars: (todayRevenue / 100).toFixed(2) },
        recentUsers,
        recentAuditLog: auditLogs.slice(0, 20),
      });
    } catch (err) {
      console.error("[admin/dashboard]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/invite/send — Public invitation email (no auth required)
  // Rate limited to 5 invitations per IP per hour
  const inviteRateLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { message: "Too many invitations sent. Please wait an hour." } });
  app.post("/api/invite/send", inviteRateLimiter, async (req, res) => {
    try {
      const schema = z.object({
        senderName: z.string().min(1).max(80).trim(),
        senderEmail: z.string().email().max(150).trim(),
        targetName: z.string().min(1).max(80).trim(),
        targetEmail: z.string().email().max(150).trim(),
      });
      let body: z.infer<typeof schema>;
      try { body = schema.parse(req.body); }
      catch (err: any) {
        return res.status(400).json({ message: err.errors?.[0]?.message ?? "Invalid input" });
      }
      const APP_URL = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const landingUrl = `${APP_URL}/gz-invite`;
      await sendInvitationEmail({ ...body, landingUrl });
      return res.json({ ok: true, devMode: !process.env.SMTP_HOST });
    } catch (err) {
      console.error("[invite/send]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // =====================================================================

  app.post("/api/auth/change-password", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both current and new password are required." });
    if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters." });
    const userId = (req.session as any).userId;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect." });
    const hashed = await hashPassword(newPassword);
    await storage.updateUserPassword(userId, hashed);
    return res.json({ message: "Password updated successfully." });
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.json(null);
    const user = await storage.getUserById(userId);
    if (!user) return res.json(null);
    const profile = await storage.getProfileByUserId(user.id);
    return res.json({ user: { ...user, password: undefined }, profile: profile ?? null });
  });

  // === PROFILE ===
  app.get(api.profiles.getMyProfile.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const profile = await storage.getProfileByUserId(userId);
    return res.json(profile ?? null);
  });

  app.put(api.profiles.updateProfile.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      if (req.body.username && isReservedUsername(req.body.username)) {
        return res.status(400).json({ message: `"${req.body.username}" is a reserved username and cannot be used.` });
      }
      const profile = await storage.updateProfile(userId, req.body);
      return res.json(profile);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/upload/image", upload.single("file"), async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    // Layer 1 — magic bytes + contraband signatures
    const layer1 = inspectFileSync(req.file.path, req.file.mimetype);
    if (!layer1.pass) {
      destroyContraband(req.file.path, layer1.reason ?? "failed layer-1 inspection");
      return res.status(422).json({ message: `Upload declined: ${layer1.reason}` });
    }
    // Layer 2 — Rocco AI Vision scan
    const layer2 = await roccoScan(req.file.path, req.file.mimetype);
    if (!layer2.pass) {
      destroyContraband(req.file.path, layer2.reason ?? "failed Rocco AI scan");
      console.warn(`[Rocco] Blocked upload from userId=${(req.session as any)?.userId} — ${layer2.reason}`);
      return res.status(422).json({ message: layer2.reason ?? "Content not permitted on Gigzito" });
    }
    // Both layers passed — move from quarantine to safe haven
    const filename = req.file.filename;
    moveToFinalDest(req.file.path, path.join(process.cwd(), "uploads"), filename);
    return res.json({ url: `/uploads/${filename}` });
  });

  app.post("/api/upload/video", videoUpload.single("file"), async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const inspection = runInspector(req, res, path.join(process.cwd(), "uploads", "videos"), "file", "video");
    if (!inspection.ok) return;
    const url = `/uploads/videos/${inspection.filename}`;
    return res.json({ url, size: req.file.size, originalName: req.file.originalname });
  });

  app.get(api.profiles.profileCompletion.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json({ isComplete: false, missing: ["profile"] });
    const missing: string[] = [];
    if (!profile.displayName) missing.push("display name");
    if (!profile.bio) missing.push("bio");
    if (!profile.avatarUrl) missing.push("avatar");
    if (!profile.primaryCategory) missing.push("primary category");
    const hasContact = profile.contactEmail || profile.contactPhone || profile.contactTelegram || profile.websiteUrl;
    if (!hasContact) missing.push("contact method");
    return res.json({ isComplete: missing.length === 0, missing });
  });

  app.get(api.profiles.getProvider.path, async (req, res) => {
    const rawId = req.params.id;
    const numId = parseInt(rawId);
    const profile = !isNaN(numId)
      ? await storage.getProfileById(numId)
      : await storage.getProfileByUsername(rawId);
    if (!profile) return res.status(404).json({ message: "Provider not found" });
    const user = await storage.getUserById(profile.userId);
    // Track profile view — only when a different logged-in user views this profile
    const viewerUserId = (req.session as any)?.userId;
    if (viewerUserId && viewerUserId !== profile.userId) {
      storage.trackProfileView(viewerUserId, profile.id).catch(() => {});
    }
    return res.json({ ...profile, user: { ...user, password: undefined } });
  });

  // Public: listings for a given provider profile ID or username
  app.get("/api/profile/:id/listings", async (req, res) => {
    const rawId = req.params.id;
    const numId = parseInt(rawId);
    let profileId: number;
    if (!isNaN(numId)) {
      profileId = numId;
    } else {
      const p = await storage.getProfileByUsername(rawId);
      if (!p) return res.json([]);
      profileId = p.id;
    }
    const listings = await storage.getListingsByProvider(profileId);
    return res.json(listings ?? []);
  });

  // === LISTINGS ===
  app.get(api.listings.myListings.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json([]);
    const listings = await storage.getListingsByProvider(profile.id);
    return res.json(listings ?? []);
  });

  app.get(api.listings.list.path, async (req, res) => {
    const vertical = req.query.vertical as string | undefined;
    const listings = await storage.getListings(vertical);
    return res.json(listings ?? []);
  });

  app.get(api.listings.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const listing = await storage.getListingById(id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    return res.json(listing);
  });

  app.post(api.listings.submitWithPayment.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const currentUser = await storage.getUserById(userId);
    if (currentUser?.status === "disabled") return res.status(403).json({ message: "Your account has been disabled." });

    const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      const todayCount = await storage.getTodayListingCount();
      if (todayCount >= DAILY_CAP) {
        return res.status(429).json({ message: "Daily cap of 100 listings reached. Try again tomorrow.", count: todayCount, max: DAILY_CAP });
      }
    }

    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Provider profile not found" });

    if (!isAdmin) {
      const hasContact = profile.contactEmail || profile.contactPhone || profile.contactTelegram || profile.websiteUrl;
      const isProfileComplete = profile.displayName && profile.bio && profile.avatarUrl && profile.primaryCategory && hasContact;
      if (!isProfileComplete) {
        return res.status(400).json({ message: "Please complete your provider profile before submitting a listing" });
      }
    }

    const schema = z.object({
      vertical: z.enum([
        "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
        "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
        "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS", "FOR_SALE",
        "LAIH", "RANDOMNESS",
      ]),
      title: z.string().min(1).max(200),
      postType: z.enum(["VIDEO", "TEXT"]).optional().default("VIDEO"),
      videoUrl: z.union([z.string().url(), z.string().startsWith("/uploads/"), z.literal("")]).optional(),
      durationSeconds: z.coerce.number().int().min(1).max(180).optional(),
      description: z.string().max(1000).optional(),
      tags: z.array(z.string()).max(10).optional(),
      ctaLabel: z.string().max(60).optional(),
      ctaUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
      ctaType: z.enum(["Visit Offer", "Shop Product", "Join Event", "Book Service", "Join Guild"]).optional().nullable(),
      flashSaleEndsAt: z.string().datetime().optional().nullable(),
      couponCode: z.string().max(40).optional().nullable(),
      productPrice: z.string().max(30).optional().nullable(),
      productPurchaseUrl: z.string().url().optional().or(z.literal("")).nullable(),
      productStock: z.string().max(50).optional().nullable(),
      bgMusicTrackId: z.coerce.number().int().positive().optional().nullable(),
      bgMusicVolume: z.coerce.number().int().min(0).max(100).optional(),
      customVertical: z.string().max(60).optional().nullable(),
    });

    try {
      const data = schema.parse(req.body);
      const postType = data.postType ?? "VIDEO";
      if (postType === "VIDEO" && !data.videoUrl) {
        return res.status(400).json({ message: "Video URL is required for video posts." });
      }
      const isUploadedVideo = postType === "VIDEO" && !!data.videoUrl && data.videoUrl.startsWith("/uploads/videos/");
      const listing = await storage.createListing({
        ...data,
        videoUrl: data.videoUrl || null,
        durationSeconds: data.durationSeconds ?? (postType === "VIDEO" ? 180 : null),
        postType,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        ctaType: data.ctaType ?? null,
        bgMusicTrackId: data.bgMusicTrackId ?? null,
        bgMusicVolume: data.bgMusicVolume ?? 70,
        customVertical: data.customVertical ?? null,
        providerId: profile.id,
        dropDate: getTodayDate(),
        pricePaidCents: 300,
      } as any);
      // Set scan status + kick off Bif asynchronously for uploaded videos
      if (isUploadedVideo && data.videoUrl) {
        await storage.updateScanStatus(listing.id, "SCANNING", null);
        callBif(listing.id, data.videoUrl, userId).catch((err) => {
          console.error("[Bif] async call failed:", err);
        });
      }
      return res.status(201).json({
        success: true,
        listingId: listing.id,
        scanStatus: isUploadedVideo ? "SCANNING" : "CLEAN",
        user: { id: currentUser!.id, email: currentUser!.email, role: currentUser!.role, subscriptionTier: currentUser!.subscriptionTier ?? "GZLurker" },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch(api.listings.updateStatus.path, async (req, res) => {
    if (!requireAuth(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const { status } = req.body;
    if (!["ACTIVE", "PAUSED", "REMOVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const listing = await storage.updateListingStatus(id, status);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    return res.json(listing);
  });

  // Edit listing text fields (owner only)
  app.patch("/api/listings/:id/fields", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });

    // Resolve provider profile for this user
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(403).json({ message: "Provider profile not found" });

    const { title, description, tags, ctaLabel, ctaUrl, ctaType, vertical } = req.body;
    if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }

    const updated = await storage.updateListingFields(id, profile.id, {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(ctaLabel !== undefined && { ctaLabel: ctaLabel || null }),
      ...(ctaUrl !== undefined && { ctaUrl: ctaUrl || null }),
      ...(ctaType !== undefined && { ctaType: ctaType || null }),
      ...(vertical !== undefined && { vertical }),
    });
    if (!updated) return res.status(404).json({ message: "Listing not found or not yours" });
    return res.json(updated);
  });

  // Helper: permanently delete an uploaded video file from disk
  function deleteUploadedFile(videoUrl: string | null | undefined) {
    if (!videoUrl) return;
    if (!videoUrl.startsWith("/uploads/videos/")) return;
    try {
      const filePath = path.join(process.cwd(), videoUrl.slice(1));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error("[deleteUploadedFile] failed to remove file:", videoUrl, err);
    }
  }

  // User: permanently delete own listing + video file
  app.delete("/api/listings/:id", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(403).json({ message: "Provider profile not found" });
    try {
      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.providerId !== profile.id) return res.status(403).json({ message: "Not your listing" });
      deleteUploadedFile(listing.videoUrl);
      await storage.deleteListing(id);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[delete listing]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // === BIF SCAN ROUTES ===
  // Bif webhook callback — called by the VPS bot after scanning
  app.post("/api/scan/callback", async (req, res) => {
    const secret = req.headers["bif-webhook-secret"] || req.headers["x-bif-secret"];
    const expected = process.env.BIF_WEBHOOK_SECRET || "";
    if (expected && secret !== expected) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { listingId, status, scanNote, ownerUserId } = req.body;
    if (!listingId || !status) return res.status(400).json({ message: "Missing listingId or status" });
    if (!BIF_SCAN_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
    await storage.updateScanStatus(Number(listingId), status, scanNote ?? null);
    try {
      getIO().emit("SCAN_UPDATE", { listingId: Number(listingId), status, ownerUserId: Number(ownerUserId) });
    } catch (_) {}
    return res.json({ ok: true });
  });

  // Poll scan status for a single listing
  app.get("/api/listings/:id/scan-status", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const listing = await storage.getListingById(id);
    if (!listing) return res.status(404).json({ message: "Not found" });
    return res.json({ listingId: id, scanStatus: listing.scanStatus, scanNote: listing.scanNote });
  });

  // Appeal a FLAGGED listing
  app.post("/api/listings/:id/appeal", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const listing = await storage.getListingById(id);
    if (!listing) return res.status(404).json({ message: "Not found" });
    if (listing.provider.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (listing.scanStatus !== "FLAGGED") {
      return res.status(400).json({ message: "Can only appeal FLAGGED listings" });
    }
    await storage.updateScanStatus(id, "APPEAL_PENDING", listing.scanNote);
    try {
      getIO().emit("SCAN_UPDATE", { listingId: id, status: "APPEAL_PENDING", ownerUserId: userId });
    } catch (_) {}
    return res.json({ ok: true, status: "APPEAL_PENDING" });
  });

  // === STATS ===
  app.get(api.stats.daily.path, async (req, res) => {
    const count = await storage.getTodayListingCount();
    return res.json({
      date: getTodayDate(),
      count,
      capReached: count >= DAILY_CAP,
      maxCap: DAILY_CAP,
    });
  });

  // === ADMIN ===
  app.get(api.admin.stats.path, async (req, res) => {
    if (!requireContentAdmin(req, res)) return;
    const count = await storage.getTodayListingCount();
    const revenue = await storage.getTodayRevenue();
    const listings = await storage.getAllListingsWithProviders();
    return res.json({ todayCount: count, todayRevenueCents: revenue, capReached: count >= DAILY_CAP, listings });
  });

  app.patch(api.admin.updateListing.path, async (req, res) => {
    if (!requireContentAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const { status, reason, sendEmail } = req.body;
    if (!["ACTIVE", "PAUSED", "REMOVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const listing = await storage.updateListingStatus(id, status);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    // Send email notification if requested and status is disabling
    if (sendEmail && reason && ["PAUSED", "REMOVED"].includes(status)) {
      try {
        const fullListing = await storage.getListingById(id);
        const contactEmail = fullListing?.provider?.contactEmail;
        const displayName = fullListing?.provider?.displayName || "Provider";
        if (contactEmail) {
          await sendContentDisabledNotification(contactEmail, displayName, fullListing.title, reason);
        }
      } catch (err) {
        console.error("[disable] email notification failed:", err);
      }
    }
    return res.json(listing);
  });

  // Triage a listing (pull from video feed → GigCard Directory) + notify provider
  app.patch("/api/admin/listings/:id/triage", async (req, res) => {
    if (!requireContentAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const schema = z.object({ reason: z.string().min(1).max(300) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Reason required" });

    const listing = await storage.triageListing(id, (req as any).session?.userId, parsed.data.reason);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    // Look up the provider's email and name to send the notification
    try {
      const fullListing = await storage.getListingById(id);
      if (fullListing?.provider?.contactEmail) {
        await sendTriageNotification(
          fullListing.provider.contactEmail,
          fullListing.provider.displayName || "Provider",
          fullListing.title,
          parsed.data.reason,
        );
      }
    } catch (err) {
      console.error("[triage] email notification failed:", err);
    }

    return res.json(listing);
  });

  // GigCard Directory — publicly browsable triaged listings
  app.get("/api/gigcard-directory", async (_req, res) => {
    const listings = await storage.getTriagedListings();
    return res.json(listings ?? []);
  });

  // === LEADS ===
  app.post("/api/leads", async (req, res) => {
    // safeInt: coerces strings/numbers to int, returns undefined on NaN/null/missing
    const safeInt = z.preprocess(
      (v) => { const n = Number(v); return isNaN(n) || n <= 0 ? undefined : Math.floor(n); },
      z.number().int().positive().optional()
    );
    const schema = z.object({
      videoId: safeInt,
      creatorUserId: safeInt,
      firstName: z.string().min(1).max(60),
      email: z.string().email().optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      message: z.string().max(500).optional().nullable(),
      videoTitle: z.string().max(200).optional().nullable(),
      category: z.string().max(50).optional().nullable(),
      viewerUsername: z.string().max(80).optional().nullable(),
      viewerCity: z.string().max(100).optional().nullable(),
      viewerState: z.string().max(100).optional().nullable(),
      viewerCountry: z.string().max(100).optional().nullable(),
    });
    try {
      const data = schema.parse(req.body);
      // If no viewerUsername provided but session is active, auto-resolve from profile
      let viewerUsername = data.viewerUsername ?? null;
      if (!viewerUsername && req.session?.userId) {
        const vProfile = await storage.getProfileByUserId(req.session.userId);
        viewerUsername = vProfile?.username ?? null;
      }
      // Use client-sent geo if available; fall back to server-side IP lookup
      let viewerCity: string | null = data.viewerCity ?? null;
      let viewerState: string | null = data.viewerState ?? null;
      let viewerCountry: string | null = data.viewerCountry ?? null;
      if (!viewerCity) {
        try {
          const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
          const ip = rawIp.replace("::ffff:", "");
          if (ip && ip !== "127.0.0.1" && ip !== "::1" && !/^10\./.test(ip) && !/^192\.168\./.test(ip)) {
            const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`);
            if (geoRes.ok) {
              const geo = await geoRes.json() as { status: string; city?: string; regionName?: string; country?: string };
              if (geo.status === "success") { viewerCity = geo.city ?? null; viewerState = geo.regionName ?? null; viewerCountry = geo.country ?? null; }
            }
          }
        } catch { /* geo best-effort */ }
      }
      const lead = await storage.createLead({
        videoId: data.videoId,
        creatorUserId: data.creatorUserId,
        firstName: data.firstName,
        email: data.email,
        phone: data.phone ?? undefined,
        message: data.message ?? undefined,
        videoTitle: data.videoTitle ?? undefined,
        category: data.category ?? undefined,
        viewerUsername: viewerUsername ?? undefined,
        viewerCity,
        viewerState,
        viewerCountry,
      });
      // Auto-aggregate into marketer's audience if an email was provided
      if (data.email && data.creatorUserId) {
        storage.upsertMarketerAudience({
          providerUserId: data.creatorUserId,
          leadName: data.firstName,
          leadEmail: data.email,
          leadPhone: data.phone ?? null,
          sourceListingId: data.videoId ?? undefined,
        }).catch((err) => console.warn("Audience upsert failed:", err.message));
      }
      // Fire webhook if the creator has one configured
      if (data.creatorUserId) {
        const creatorProfile = await storage.getProfileById(data.creatorUserId);
        if (creatorProfile?.webhookUrl) {
          fetch(creatorProfile.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "new_lead",
              leadId: lead.id,
              videoId: lead.videoId,
              videoTitle: lead.videoTitle,
              category: lead.category,
              name: lead.firstName,
              email: lead.email,
              phone: lead.phone,
              message: lead.message,
              createdAt: lead.createdAt,
            }),
            signal: AbortSignal.timeout(5000),
          }).catch((err) => console.warn("Webhook delivery failed:", err.message));
        }
      }
      return res.status(201).json({
        success: true,
        leadId: lead.id,
        consent: `Your name${data.email ? " and email" : ""} have been shared with this presenter. They may contact you regarding your inquiry.`,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/leads/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const leads = await storage.getLeadsByProvider(userId);
    return res.json(leads);
  });

  // Listing comments inbox for the logged-in provider
  app.get("/api/listings/comments/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      const comments = await storage.getListingCommentsByProvider(userId);
      return res.json(comments);
    } catch (err) {
      console.error("[comments/mine]", err);
      return res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Marketer audience
  app.get("/api/my-audience", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const [count, members] = await Promise.all([
      storage.getMarketerAudienceCount(userId),
      storage.getMarketerAudience(userId),
    ]);
    return res.json({ count, members });
  });

  // Audience broadcast — send email to all subscribers
  app.post("/api/my-audience/broadcast", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const { subject, body } = req.body as { subject: string; body: string };
    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "Subject and body are required" });
    }
    try {
      const [profile, members] = await Promise.all([
        storage.getProfileByUserId(userId),
        storage.getMarketerAudience(userId),
      ]);
      const senderName = profile?.displayName ?? "Your Provider";
      // Fire-and-forget emails (don't await each one)
      let sent = 0;
      const emailPromises = members.map(async (m) => {
        try {
          await sendAudienceBroadcast({ toEmail: m.leadEmail, senderName, subject: subject.trim(), body: body.trim() });
          sent++;
        } catch { /* individual failures silently swallowed */ }
      });
      await Promise.all(emailPromises);
      const broadcast = await storage.createAudienceBroadcast({ providerUserId: userId, subject: subject.trim(), body: body.trim(), recipientCount: sent });
      return res.json({ ok: true, recipientCount: sent, broadcast });
    } catch (e) {
      console.error("[broadcast]", e);
      return res.status(500).json({ message: "Failed to send broadcast" });
    }
  });

  // Get past broadcasts
  app.get("/api/my-audience/broadcasts", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      const broadcasts = await storage.getAudienceBroadcasts(userId);
      return res.json(broadcasts);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch broadcasts" });
    }
  });

  // === GEO TARGET CAMPAIGNS ===

  app.post("/api/geo-campaigns", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const { title, offer, radiusMiles, city, state, country, lat, lng, imageUrl } = req.body as {
      title: string; offer: string; radiusMiles?: number; city?: string; state?: string; country?: string; lat?: string; lng?: string; imageUrl?: string;
    };
    if (!title?.trim() || !offer?.trim()) {
      return res.status(400).json({ message: "Title and offer are required" });
    }
    try {
      const campaign = await storage.createGeoTargetCampaign({
        providerUserId: userId,
        title: title.trim(),
        offer: offer.trim(),
        radiusMiles: radiusMiles ?? 10,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || "US",
        lat: lat?.trim() || null,
        lng: lng?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      });
      return res.json(campaign);
    } catch (e) {
      console.error("[geo-campaigns]", e);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.get("/api/geo-campaigns", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      const campaigns = await storage.getGeoTargetCampaignsByProvider(userId);
      return res.json(campaigns);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.patch("/api/geo-campaigns/:id/status", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: "ACTIVE" | "PAUSED" | "ENDED" };
    if (!["ACTIVE", "PAUSED", "ENDED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    try {
      const campaign = await storage.updateGeoTargetCampaignStatus(id, userId, status);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      return res.json(campaign);
    } catch (e) {
      return res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // === GIGNESS CARDS ===

  // Public Rolodex feed — filtered by ageBracket, gender, intent, tier
  app.get("/api/gigness-cards", async (req, res) => {
    const { ageBracket, gender, intent, tier } = req.query as Record<string, string>;
    const cards = await storage.getPublicGignessCards({
      ageBracket: ageBracket || undefined,
      gender: gender || undefined,
      intent: intent || undefined,
      tier: tier || undefined,
    });
    return res.json(cards);
  });

  // Own card (auth)
  app.get("/api/gigness-cards/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const card = await storage.getGignessCardByUserId(userId);
    return res.json(card ?? null);
  });

  // Public: look up a GeeZee card by the owner's userId, enriched with provider profile
  app.get("/api/gigness-cards/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
    const card = await storage.getGignessCardByUserId(userId);
    if (!card || !card.isPublic) return res.status(404).json({ message: "Card not found" });
    const profile = await storage.getProfileByUserId(userId);
    return res.json({
      ...card,
      displayName: profile?.displayName ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      instagramUrl: profile?.instagramUrl ?? null,
      tiktokUrl: profile?.tiktokUrl ?? null,
      facebookUrl: profile?.facebookUrl ?? null,
      twitterUrl: profile?.twitterUrl ?? null,
      discordUrl: profile?.discordUrl ?? null,
    });
  });

  // QR Master Card lookup by UUID (public)
  app.get("/api/gigness-cards/qr/:uuid", async (req, res) => {
    const card = await storage.getGignessCardByQrUuid(req.params.uuid);
    if (!card) return res.status(404).json({ message: "Card not found" });
    return res.json(card);
  });

  // Create / update own card (auth)
  app.post("/api/gigness-cards", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const schema = z.object({
      slogan: z.string().max(120).optional(),
      profilePic: z.string().nullable().optional(),
      gallery: z.array(z.string()).max(9).optional(),
      isPublic: z.boolean().optional(),
      locationServicesEnabled: z.boolean().optional(),
      allowMessaging: z.boolean().optional(),
      ageBracket: z.enum(["18-25", "25-40", "40+"]).nullable().optional(),
      gender: z.enum(["Male", "Female", "Other"]).nullable().optional(),
      intent: z.enum(["marketing", "social", "activity"]).nullable().optional(),
    });
    try {
      const data = schema.parse(req.body);
      const card = await storage.upsertGignessCard(userId, data);
      return res.json(card);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("[gigness-card save] Zod errors:", JSON.stringify(err.errors));
        console.error("[gigness-card save] body:", JSON.stringify(req.body));
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[gigness-card save] unexpected error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Engage — available to all authenticated users
  app.post("/api/gigness-cards/:id/engage", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) return res.status(400).json({ message: "Invalid card id" });
    await storage.incrementGignessEngagement(cardId);
    return res.json({ success: true });
  });

  // Send message — available to all authenticated users (GZLurker+)
  app.post("/api/gigness-cards/:id/message", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const fromUserId = (req.session as any).userId;
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) return res.status(400).json({ message: "Invalid card id" });

    const schema = z.object({
      messageText: z.string().max(500).optional().nullable(),
      emojiReaction: z.string().max(8).optional().nullable(),
    });
    try {
      const { messageText, emojiReaction } = schema.parse(req.body);
      if (!messageText && !emojiReaction) return res.status(400).json({ message: "Provide a message or emoji reaction." });

      // GZ-Bot scrub on text messages
      let isClean = true;
      if (messageText) {
        const scrub = await gzBotScrub(messageText);
        if (!scrub.clean) {
          return res.status(400).json({ message: "Hey! GeeZee stays PG. Clean up your pitch to engage with this card." });
        }
      }

      // Find the card owner
      const targetCard = await storage.getGignessCardById(cardId);
      if (!targetCard) return res.status(404).json({ message: "Card not found" });

      const msg = await storage.createCardMessage({
        fromUserId,
        toUserId: targetCard.userId,
        gignessCardId: cardId,
        messageText: messageText ?? null,
        emojiReaction: emojiReaction ?? null,
        isClean,
      });
      await storage.incrementGignessEngagement(cardId);
      // Real-time delivery via Socket.io
      try {
        getIO().to(`user:${targetCard.userId}`).emit("GZ_MESSAGE", { from: fromUserId, cardId, emojiReaction, preview: messageText?.slice(0, 60) });
      } catch (_) {}
      return res.status(201).json({ success: true, messageId: msg.id });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // GZ Inbox (auth)
  app.get("/api/gigness-cards/inbox", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const messages = await storage.getCardMessages(userId);
    return res.json(messages);
  });

  // Broadcast — quick toggle isPublic=true (auth required)
  app.post("/api/gigness-cards/broadcast", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      const card = await storage.upsertGignessCard(userId, { isPublic: true });
      return res.json({ success: true, card });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Comments — GET (public)
  app.get("/api/gigness-cards/:id/comments", async (req, res) => {
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) return res.status(400).json({ message: "Invalid card id" });
    try {
      const comments = await storage.getGignessComments(cardId);
      return res.json(comments);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Comments — POST (requires auth; GZ-Bot scrub; advisory: joining mailing list)
  app.post("/api/gigness-cards/:id/comments", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const authorUserId = (req.session as any).userId;
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) return res.status(400).json({ message: "Invalid card id" });

    const schema = z.object({
      commentText: z.string().min(1).max(300),
      authorName: z.string().max(60).optional(),
    });
    try {
      const { commentText } = schema.parse(req.body);
      const card = await storage.getGignessCardById(cardId);
      if (!card) return res.status(404).json({ message: "Card not found" });

      const scrub = await gzBotScrub(commentText);
      if (!scrub.clean) {
        return res.status(400).json({ message: "GZ-Bot flagged your comment. Keep it respectful and on-topic." });
      }

      const authorProfile = await storage.getProfileByUserId(authorUserId);
      const resolvedName = authorProfile?.username ?? authorProfile?.displayName ?? "Anonymous";

      const comment = await storage.createGignessComment({
        cardId,
        authorUserId,
        authorName: resolvedName,
        commentText,
        isClean: true,
      });
      return res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // === LISTING COMMENTS ===
  app.get("/api/listings/:id/comments", async (req, res) => {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ message: "Invalid listing id" });
    try {
      const comments = await storage.getListingComments(listingId);
      return res.json(comments);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/listings/:id/comments", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const authorUserId = (req.session as any).userId;
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ message: "Invalid listing id" });
    const schema = z.object({
      commentText: z.string().min(1).max(300),
    });
    try {
      const { commentText } = schema.parse(req.body);
      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      // Auto-resolve name and email from the logged-in user's account — no manual input needed
      let resolvedAuthorName = "";
      let viewerEmail: string | null = null;
      let viewerUsername: string | null = null;
      const [profile, authorUser] = await Promise.all([
        storage.getProfileByUserId(authorUserId),
        storage.getUserById(authorUserId),
      ]);
      if (profile?.username) viewerUsername = profile.username;
      if (profile?.displayName) resolvedAuthorName = profile.displayName;
      else resolvedAuthorName = authorUser?.email?.split("@")[0] || "Anonymous";
      viewerEmail = authorUser?.email ?? null;
      // Geo lookup from IP
      let viewerCity: string | undefined;
      let viewerState: string | undefined;
      let viewerCountry: string | undefined;
      try {
        const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
        const ip = rawIp.replace("::ffff:", "");
        if (ip && ip !== "127.0.0.1" && ip !== "::1" && !/^10\./.test(ip) && !/^192\.168\./.test(ip)) {
          const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`);
          if (geoRes.ok) {
            const geo = await geoRes.json() as { status: string; city?: string; regionName?: string; country?: string };
            if (geo.status === "success") { viewerCity = geo.city; viewerState = geo.regionName; viewerCountry = geo.country; }
          }
        }
      } catch { /* geo best-effort */ }
      const comment = await storage.createListingComment({
        listingId,
        authorUserId,
        authorName: resolvedAuthorName,
        commentText,
        viewerUsername,
        viewerEmail: viewerEmail || null,
        viewerCity,
        viewerState,
        viewerCountry,
      });
      return res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // === LIVE SESSIONS ===
  const LIVE_ALLOWED_CATEGORIES = ["INFLUENCER", "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS", "MARKETING", "COACHING", "COURSES", "CRYPTO", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON"];

  function detectPlatform(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return "youtube";
      if (u.hostname.includes("twitch.tv")) return "twitch";
      if (u.hostname.includes("facebook.com")) return "facebook";
      if (u.hostname.includes("instagram.com")) return "instagram";
      if (u.hostname.includes("tiktok.com")) return "tiktok";
      return "native";
    } catch { return "native"; }
  }

  // ── Zito.TV API proxy ───────────────────────────────────────────────────────
  const ZITOTV_BASE = "https://1d2776d5-bf1b-41f5-a23d-4647c201aecb-00-25m6h440wdpa3.kirk.replit.dev";
  const ZITOTV_TOKEN = process.env.ZITO_API_TOKEN ?? "";

  async function zitoFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${ZITOTV_BASE}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${ZITOTV_TOKEN}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  }

  // GET all Zito.TV streamers (live ones first)
  app.get("/api/zito-live/streams", async (_req, res) => {
    try {
      const r = await zitoFetch("/api/streams");
      if (!r.ok) return res.status(r.status).json({ message: "Zito.TV error" });
      return res.json(await r.json());
    } catch (err) {
      console.error("[zito-live/streams]", err);
      return res.status(502).json({ message: "Cannot reach Zito.TV" });
    }
  });

  // Register a Gigzito user with Zito.TV
  app.post("/api/zito-live/register", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Profile required" });
    try {
      const r = await zitoFetch("/api/streams/register", {
        method: "POST",
        body: JSON.stringify({
          gigzitoUserId: String(userId),
          username: profile.username ?? `user${userId}`,
          name: profile.displayName ?? profile.username ?? `User ${userId}`,
          category: req.body.category ?? profile.primaryCategory ?? "Other",
          description: profile.bio ?? undefined,
          avatarUrl: profile.avatarUrl ?? undefined,
          tags: req.body.tags ?? [],
        }),
      });
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(data);
    } catch (err) {
      console.error("[zito-live/register]", err);
      return res.status(502).json({ message: "Cannot reach Zito.TV" });
    }
  });

  app.get("/api/live/active", async (_req, res) => {
    const sessions = await storage.getActiveLiveSessions();
    return res.json(sessions);
  });

  app.get("/api/live/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const session = await storage.getLiveSessionById(id);
    if (!session) return res.status(404).json({ message: "Not found" });
    return res.json(session);
  });

  app.post("/api/live/start", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const currentUser = await storage.getUserById(userId);
    if (currentUser?.status === "disabled") return res.status(403).json({ message: "Your account has been disabled." });
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Creator profile required" });

    const schema = z.object({
      title: z.string().min(1).max(100),
      category: z.string().min(1),
      mode: z.enum(["external", "native"]),
      streamUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional().nullable(),
      platform: z.string().optional().nullable(),
    });
    try {
      const data = schema.parse(req.body);
      const platform = data.platform ?? detectPlatform(data.streamUrl);
      const session = await storage.createLiveSession({
        creatorUserId: userId,
        providerId: profile.id,
        title: data.title,
        category: data.category,
        mode: data.mode,
        platform,
        streamUrl: data.streamUrl,
        thumbnailUrl: data.thumbnailUrl ?? undefined,
      });

      // Register + go-live on Zito.TV (fire-and-forget, don't block response)
      zitoFetch("/api/streams/register", {
        method: "POST",
        body: JSON.stringify({
          gigzitoUserId: String(userId),
          username: profile.username ?? `user${userId}`,
          name: profile.displayName ?? `User ${userId}`,
          category: data.category,
          description: profile.bio ?? undefined,
          avatarUrl: profile.avatarUrl ?? undefined,
        }),
      }).then(() => zitoFetch("/api/streams/go-live", {
        method: "POST",
        body: JSON.stringify({
          gigzitoUserId: String(userId),
          streamUrl: data.streamUrl,
          title: data.title,
          thumbnailUrl: data.thumbnailUrl ?? undefined,
          viewerCount: 0,
        }),
      })).then(r => r.json()).then(zitoData => {
        // Store the Zito.TV stream ID in session metadata for heartbeat/end
        if (zitoData?.id) {
          storage.updateLiveSessionZitoId?.(session.id, zitoData.id).catch(() => {});
        }
      }).catch((err) => console.error("[zito go-live]", err));

      return res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Heartbeat relay to Zito.TV
  app.post("/api/live/:id/heartbeat", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const session = await storage.getLiveSessionById(id);
    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.creatorUserId !== userId) return res.status(403).json({ message: "Forbidden" });
    const viewerCount = typeof req.body.viewerCount === "number" ? req.body.viewerCount : 0;

    // Relay to Zito.TV using session's zitoStreamId if available
    const zitoId = (session as any).zitoStreamId;
    if (zitoId) {
      zitoFetch(`/api/streams/${zitoId}/heartbeat`, {
        method: "POST",
        body: JSON.stringify({ viewerCount }),
      }).catch(() => {});
    }
    return res.json({ ok: true });
  });

  app.patch("/api/live/:id/end", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const session = await storage.getLiveSessionById(id);
    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.creatorUserId !== userId) return res.status(403).json({ message: "Forbidden" });
    await storage.endLiveSession(id);

    // End stream on Zito.TV (fire-and-forget)
    zitoFetch("/api/streams/end-stream", {
      method: "POST",
      body: JSON.stringify({ gigzitoUserId: String(userId) }),
    }).catch(() => {});

    return res.json({ success: true });
  });

  // === GIGJACKS ===
  app.get("/api/gigjacks/active", async (req, res) => {
    const active = await storage.getActiveGigJack();
    return res.json(active ?? null);
  });

  app.get("/api/gigjacks/slots", async (req, res) => {
    const slots = await storage.getAvailableSlots();
    return res.json(slots ?? []);
  });

  app.post("/api/gigjacks/submit", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const currentUser = await storage.getUserById(userId);
    if (currentUser?.status === "disabled") return res.status(403).json({ message: "Your account has been disabled." });

    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Provider profile not found" });

    const schema = z.object({
      artworkUrl: z.union([z.string().url(), z.string().startsWith("/uploads/")]),
      offerTitle: z.string().min(5).max(120),
      ctaLink: z.union([z.string().url(), z.string().startsWith("/uploads/")]),
      scheduledAt: z.string().datetime({ message: "A valid date and time is required" }),
      tagline: z.string().max(120).optional().nullable(),
      category: z.string().max(60).optional().nullable(),
      flashDurationSeconds: z.coerce.number().int().min(5).max(60).optional().nullable(),
      offerDurationMinutes: z.coerce.number().int().min(10).max(1440).optional().nullable(),
      companyUrl: z.union([z.string().url(), z.string().startsWith("/uploads/"), z.literal("")]).optional().nullable(),
      description: z.string().optional(),
      countdownMinutes: z.coerce.number().int().optional(),
      couponCode: z.string().max(40).optional().nullable(),
      quantityLimit: z.coerce.number().int().min(1).max(100000).optional().nullable(),
    });

    const isAdminGj = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

    try {
      const data = schema.parse(req.body);

      // ── Role-based minimum lead time ─────────────────────────────────────
      const role = currentUser?.role ?? "PROVIDER";
      const minLeadMinutes =
        (role === "ADMIN" || role === "SUPER_ADMIN") ? 1 :
        role === "CORPORATE" ? 30 : 60;

      const scheduledDate = new Date(data.scheduledAt);
      const earliestAllowed = new Date(Date.now() + minLeadMinutes * 60 * 1000);

      if (scheduledDate < earliestAllowed) {
        const msg =
          (role === "ADMIN" || role === "SUPER_ADMIN")
            ? "GigJacks must be scheduled at least 1 minute in advance."
            : role === "CORPORATE"
              ? "Corporate GigJacks must be scheduled at least 30 minutes in advance."
              : "GigJacks must be scheduled at least 1 hour in advance.";
        return res.status(400).json({ message: msg });
      }

      const botResult = isAdminGj
        ? { warning: false, message: null }
        : runBotChecks({
            offerTitle: data.offerTitle,
            description: data.tagline ?? data.offerTitle,
            couponCode: data.couponCode,
            ctaLink: data.ctaLink,
            companyUrl: data.companyUrl ?? data.ctaLink,
          });

      const result = await storage.createGigJack({
        artworkUrl: data.artworkUrl,
        offerTitle: data.offerTitle,
        ctaLink: data.ctaLink,
        tagline: data.tagline ?? null,
        category: data.category ?? null,
        scheduledAt: data.scheduledAt,
        flashDurationSeconds: data.flashDurationSeconds ?? 7,
        offerDurationMinutes: data.offerDurationMinutes ?? 60,
        companyUrl: data.companyUrl || data.ctaLink,
        description: data.description ?? data.tagline ?? data.offerTitle,
        countdownMinutes: data.countdownMinutes ?? 0,
        couponCode: data.couponCode ?? null,
        quantityLimit: data.quantityLimit ?? null,
        providerId: profile.id,
        botWarning: botResult.warning,
        botWarningMessage: botResult.message,
        initialStatus: isAdminGj ? "APPROVED" : "PENDING_REVIEW",
      });

      if (result.error) return res.status(409).json({ message: result.error });
      return res.status(201).json({ success: true, gigJackId: result.gj!.id, botWarning: botResult.warning, botWarningMessage: botResult.message });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/gigjacks/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json([]);
    const gigjacks = await storage.getGigJacksByProvider(profile.id);
    return res.json(gigjacks);
  });

  app.get("/api/admin/gigjacks", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const gigjacks = await storage.getAllGigJacks();
    return res.json(gigjacks);
  });

  app.get("/api/gigjacks/availability", async (req, res) => {
    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
    }
    const nowMs = req.query.nowMs ? parseInt(req.query.nowMs as string) : undefined;
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string) : undefined;
    const slots = await storage.getSlotAvailability(date, nowMs, tzOffset);
    return res.json({ date, slots });
  });

  app.patch("/api/admin/gigjacks/:id/review", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const adminUserId = (req.session as any).userId;

    const schema = z.object({
      status: z.enum(["APPROVED", "DENIED", "NEEDS_IMPROVEMENT"]),
      reviewNote: z.string().max(500).optional(),
    });

    try {
      const { status, reviewNote } = schema.parse(req.body);
      const result = await storage.reviewGigJack(id, status, reviewNote, adminUserId);
      if (result.error) return res.status(409).json({ message: result.error });
      if (!result.gj) return res.status(404).json({ message: "GigJack not found" });
      // Socket.io instant push — fires GIGJACK_START to all clients the moment admin approves
      if (status === "APPROVED") {
        try {
          getIO().emit("GIGJACK_START", { id: result.gj.id });
        } catch (_) {}
      }
      return res.json(result.gj);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/gigjacks/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const adminUserId = (req.session as any).userId;
    await storage.deleteGigJack(id, adminUserId);
    return res.json({ success: true });
  });

  // === ADMIN: USER MANAGEMENT ===
  app.get("/api/admin/users", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const allUsers = await storage.getAllUsers();
    return res.json(allUsers.map((u) => ({ ...u, password: undefined })));
  });

  app.get("/api/admin/users/:id/listings", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid id" });
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json([]);
    const listings = await storage.getListingsByProvider(profile.id);
    return res.json(listings);
  });

  app.patch("/api/admin/users/:id/status", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { status } = req.body;
    if (!["active", "disabled"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const user = await storage.updateUserStatus(id, status);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ ...user, password: undefined });
  });

  app.patch("/api/admin/users/:id/role", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { role } = req.body;
    const validRoles = ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "SUPERUSER", "ADMIN", "COORDINATOR"];
    const actorRole = (req.session as any).role;
    if (actorRole === "SUPER_ADMIN") validRoles.push("SUPER_ADMIN");
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
    const user = await storage.updateUserRole(id, role);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ ...user, password: undefined });
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const adminUserId = (req.session as any).userId;
    if (id === adminUserId) return res.status(400).json({ message: "Cannot delete your own admin account" });
    const targetUser = await storage.getUserById(id);
    if (targetUser?.email === SEEDED_ADMIN_EMAIL) return res.status(400).json({ message: "The seeded admin account cannot be deleted" });
    await storage.deleteUser(id);
    return res.json({ success: true });
  });

  app.post("/api/admin/test-smtp", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const adminUserId = (req.session as any).userId;
    const adminUser = await storage.getUserById(adminUserId);
    if (!adminUser) return res.status(404).json({ message: "User not found" });
    const toEmail = req.body?.email || adminUser.email;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPort = process.env.SMTP_PORT ?? "587";
    if (!smtpHost) {
      return res.json({
        ok: false,
        devMode: true,
        message: "No SMTP configured — running in dev mode. Set SMTP_HOST, SMTP_USER, SMTP_PASS secrets to enable real email.",
        config: { host: null, port: smtpPort, user: null },
      });
    }
    try {
      await sendEmail({
        toEmail,
        subject: "Gigzito SMTP Test",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
          <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
          <h2 style="color:#ff2b2b;margin:0 0 12px;">SMTP Test</h2>
          <p style="color:#aaa;font-size:14px;margin:0 0 8px;">This is a test email sent from the Gigzito admin panel.</p>
          <p style="color:#555;font-size:12px;margin:0;">Sent at ${new Date().toISOString()} via ${smtpHost}:${smtpPort} (user: ${smtpUser ?? "n/a"})</p>
        </div>`,
        text: `Gigzito SMTP test email sent at ${new Date().toISOString()} via ${smtpHost}`,
      });
      return res.json({ ok: true, devMode: false, toEmail, config: { host: smtpHost, port: smtpPort, user: smtpUser } });
    } catch (err: any) {
      console.error("[test-smtp] Error:", err);
      return res.status(500).json({ ok: false, message: err.message, config: { host: smtpHost, port: smtpPort, user: smtpUser } });
    }
  });

  app.delete("/api/admin/listings/:id", async (req, res) => {
    if (!requireContentAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { reason, sendEmail } = req.body ?? {};
    // Look up listing before deleting (need videoUrl for file cleanup + email notification)
    let contactEmail: string | null = null;
    let displayName = "Provider";
    let listingTitle = "Your listing";
    let videoUrlToDelete: string | null = null;
    try {
      const fullListing = await storage.getListingById(id);
      if (fullListing) {
        listingTitle = fullListing.title;
        contactEmail = fullListing.provider?.contactEmail ?? null;
        displayName = fullListing.provider?.displayName || "Provider";
        videoUrlToDelete = fullListing.videoUrl ?? null;
      }
    } catch {}
    deleteUploadedFile(videoUrlToDelete);
    await storage.deleteListing(id);
    if (sendEmail && reason && contactEmail) {
      try {
        await sendContentDeletedNotification(contactEmail, displayName, listingTitle, reason);
      } catch (err) {
        console.error("[delete] email notification failed:", err);
      }
    }
    return res.json({ success: true });
  });

  app.patch("/api/admin/gigjacks/:id/edit", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const adminUserId = (req.session as any).userId;
    const actorRole = (req.session as any).role;
    const { scheduledAt, status, providerId, override, offerDurationMinutes, flashDurationSeconds } = req.body;
    const useOverride = override === true && actorRole === "SUPER_ADMIN";
    const result = await storage.editGigJack(id, { scheduledAt, status, providerId, offerDurationMinutes, flashDurationSeconds }, adminUserId, useOverride);
    if (result.error) return res.status(409).json({ message: result.error });
    if (!result.gj) return res.status(404).json({ message: "GigJack not found" });
    if (useOverride) {
      await storage.createAuditLog({ actorUserId: adminUserId, actionType: "GIGJACK_EDIT_OVERRIDE", targetType: "GIGJACK", targetId: id, usedOverride: true });
    }
    return res.json(result.gj);
  });

  app.get("/api/gigjacks/live-state", async (req, res) => {
    try {
      const state = await storage.getLiveGigJackState();
      return res.json(state);
    } catch (err) {
      console.error("live-state error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/gigjacks/today", async (req, res) => {
    try {
      const list = await storage.getTodaysGigJacks();
      return res.json(list);
    } catch (err) {
      console.error("today gigjacks error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/gigjacks/:id/force-expire", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const adminUserId = (req.session as any).userId;
    await storage.forceExpireGigJack(id, adminUserId);
    await storage.createAuditLog({ actorUserId: adminUserId, actionType: "GIGJACK_FORCE_EXPIRE", targetType: "GIGJACK", targetId: id, usedOverride: false });
    return res.json({ success: true });
  });

  // Update review route to support override
  app.patch("/api/admin/gigjacks/:id/review-override", async (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const adminUserId = (req.session as any).userId;
    const { status, reviewNote } = req.body;
    if (!["APPROVED", "DENIED", "NEEDS_IMPROVEMENT"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const result = await storage.reviewGigJack(id, status, reviewNote, adminUserId, true);
    if (result.error) return res.status(409).json({ message: result.error });
    if (!result.gj) return res.status(404).json({ message: "GigJack not found" });
    await storage.createAuditLog({ actorUserId: adminUserId, actionType: `GIGJACK_${status}_OVERRIDE`, targetType: "GIGJACK", targetId: id, usedOverride: true });
    if (status === "APPROVED") {
      try { getIO().emit("GIGJACK_START", { id: result.gj.id }); } catch (_) {}
    }
    return res.json(result.gj);
  });

  // === SUPER ADMIN: USER MANAGEMENT ===
  app.post("/api/admin/users/:id/soft-delete", async (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const actorUserId = (req.session as any).userId;
    if (id === actorUserId) return res.status(400).json({ message: "Cannot delete your own account" });
    const targetUser = await storage.getUserById(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    await storage.softDeleteUser(id);
    await storage.createAuditLog({ actorUserId, actionType: "USER_SOFT_DELETE", targetType: "USER", targetId: id, newValue: "deleted", usedOverride: false });
    return res.json({ success: true });
  });

  app.post("/api/admin/users/:id/restore", async (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const actorUserId = (req.session as any).userId;
    const targetUser = await storage.getUserById(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    await storage.restoreUser(id);
    await storage.createAuditLog({ actorUserId, actionType: "USER_RESTORE", targetType: "USER", targetId: id, newValue: "active", usedOverride: false });
    return res.json({ success: true });
  });

  app.patch("/api/admin/users/:id/profile", async (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const actorUserId = (req.session as any).userId;
    const { displayName, bio, avatarUrl, contactEmail, location, primaryCategory, username } = req.body;
    const profile = await storage.editUserProfile(id, { displayName, bio, avatarUrl, contactEmail, location, primaryCategory, username });
    await storage.createAuditLog({ actorUserId, actionType: "USER_PROFILE_EDIT", targetType: "USER", targetId: id, usedOverride: false });
    return res.json(profile ?? { success: true });
  });

  // Admin: manually set subscription tier (Phase D → Stripe; for now admin-only toggle)
  app.patch("/api/admin/users/:id/subscription-tier", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { tier } = req.body;
    const VALID_TIERS = ["GZLurker", "GZGroups", "GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];
    if (!VALID_TIERS.includes(tier)) return res.status(400).json({ message: "Invalid tier. Must be one of: " + VALID_TIERS.join(", ") });
    await storage.updateSubscriptionTier(id, tier);
    const actorUserId = (req.session as any).userId;
    await storage.createAuditLog({ actorUserId, actionType: "SUBSCRIPTION_TIER_CHANGE", targetType: "USER", targetId: id, usedOverride: false });
    return res.json({ success: true, userId: id, tier });
  });

  app.patch("/api/admin/users/:id/groups-enabled", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ message: "enabled must be boolean" });
    await storage.updateGroupsEnabled(id, enabled);
    const actorUserId = (req.session as any).userId;
    await storage.createAuditLog({ actorUserId, actionType: "GROUPS_ENABLED_CHANGE", targetType: "USER", targetId: id, usedOverride: false });
    return res.json({ success: true, userId: id, groupsEnabled: enabled });
  });

  // Admin: all geo campaigns
  app.get("/api/admin/geo-campaigns", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const campaigns = await storage.getAllGeoTargetCampaigns();
      return res.json(campaigns);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // === SUPER ADMIN: AUDIT LOG ===
  app.get("/api/admin/audit-log", async (req, res) => {
    if (!requireSuperAdmin(req, res)) return;
    const limit = parseInt((req.query.limit as string) ?? "100");
    const logs = await storage.getAuditLogs(isNaN(limit) ? 100 : limit);
    return res.json(logs);
  });

  // === INJECTED FEEDS (PUBLIC) ===
  app.get("/api/injected-feed/active", async (req, res) => {
    const feed = await storage.getActiveInjectedFeed();
    return res.json(feed ?? null);
  });

  // === INJECTED FEEDS (ADMIN) ===
  app.get("/api/admin/injected-feeds", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const feeds = await storage.getInjectedFeeds();
    return res.json(feeds);
  });

  app.post("/api/admin/injected-feeds", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const createdBy = (req.session as any).userId as number | undefined;
    const { platform, sourceUrl, displayTitle, category, injectMode, status, startsAt, endsAt } = req.body;
    if (!platform || !sourceUrl || !injectMode) {
      return res.status(400).json({ message: "platform, sourceUrl, and injectMode are required" });
    }
    const feed = await storage.createInjectedFeed({ platform, sourceUrl, displayTitle, category, injectMode, status: status ?? "inactive", startsAt: startsAt ?? null, endsAt: endsAt ?? null, createdBy });
    return res.json(feed);
  });

  app.patch("/api/admin/injected-feeds/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const feed = await storage.updateInjectedFeed(id, req.body);
    if (!feed) return res.status(404).json({ message: "Not found" });
    return res.json(feed);
  });

  app.delete("/api/admin/injected-feeds/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteInjectedFeed(id);
    return res.json({ success: true });
  });

  // === VIDEO LIKES ===
  app.get("/api/videos/likes/batch", async (req, res) => {
    const raw = req.query.ids as string;
    if (!raw) return res.json({});
    const ids = raw.split(",").map(Number).filter(n => !isNaN(n) && n > 0);
    if (ids.length === 0) return res.json({});
    const userId = req.session?.userId ?? null;
    const result = await storage.getBatchVideoLikeStatus(ids, userId);
    return res.json(result);
  });

  app.post("/api/videos/:id/like", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required to like videos" });
    const videoId = parseInt(req.params.id);
    if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video id" });
    const result = await storage.toggleVideoLike(videoId, req.session.userId);
    return res.json(result);
  });

  app.get("/api/videos/:id/likes", async (req, res) => {
    const videoId = parseInt(req.params.id);
    if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video id" });
    const userId = req.session?.userId ?? null;
    const result = await storage.getVideoLikeStatus(videoId, userId);
    return res.json(result);
  });

  app.get("/api/profile/me/total-likes", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await storage.getProfileByUserId(req.session.userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    const total = await storage.getProviderTotalLikes(profile.id);
    return res.json({ totalLikes: total });
  });

  // ─── USER DASHBOARD ──────────────────────────────────────────────────────────
  // GET /api/user/dashboard  — Single-call snapshot for the mobile home screen.
  // Returns user info, profile, tier unlocks, stats, GeeZee card, recent listings,
  // and groups — all filtered to what the session user's tier actually has access to.
  app.get("/api/user/dashboard", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const [user, profile] = await Promise.all([
        storage.getUserById(userId),
        storage.getProfileByUserId(userId),
      ]);
      if (!user) return res.status(404).json({ message: "User not found" });

      const tier = user.subscriptionTier ?? "GZLurker";

      // Tier hierarchy helpers
      const atLeast = (t: string) => {
        const order = ["GZLurker", "GZGroups", "GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];
        return order.indexOf(tier) >= order.indexOf(t);
      };

      const unlocks = {
        canBrowse:       true,                           // everyone
        canLike:         true,                           // everyone
        canComment:      true,                           // everyone
        canMessage:      true,                           // everyone
        canPost:         atLeast("GZMarketer"),          // GZMarketer+
        canPresent:      atLeast("GZMarketer"),          // Preemptive Marketing geo push
        canBroadcast:    atLeast("GZMarketer"),          // broadcast to followers
        hasGeeZeeCard:   atLeast("GZMarketer"),          // GeeZee card + Geemotion
        hasGroups:       atLeast("GZGroups"),            // GZGroups workspace
        canFlash:        atLeast("GZMarketerPro"),       // GigJack flash events
        hasAdCenter:     atLeast("GZBusiness"),          // GZBusiness Ad Center
        hasEnterprise:   atLeast("GZEnterprise"),        // GZEnterprise perks
      };

      // Parallel fetches gated by what the tier unlocks
      const [totalLikes, followerCount, listings, geeZeeCard, groups] = await Promise.all([
        profile ? storage.getProviderTotalLikes(profile.id) : Promise.resolve(0),
        storage.getFollowerCount(userId),
        profile ? storage.getListingsByProvider(profile.id) : Promise.resolve([]),
        unlocks.hasGeeZeeCard ? storage.getGignessCardByUserId(userId) : Promise.resolve(undefined),
        unlocks.hasGroups     ? storage.getMyGroups(userId)            : Promise.resolve([]),
      ]);

      const activeListings = listings.filter((l: any) => l.status === "ACTIVE");

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscriptionTier: tier,
          emailVerified: user.emailVerified ?? false,
          disclaimerAccepted: user.disclaimerAccepted ?? false,
        },
        profile: profile
          ? {
              id: profile.id,
              displayName: profile.displayName,
              username: profile.username,
              bio: profile.bio,
              avatarUrl: profile.avatarUrl,
              thumbUrl: profile.thumbUrl,
              location: profile.location,
              primaryCategory: profile.primaryCategory,
              websiteUrl: profile.websiteUrl,
              contactEmail: profile.contactEmail,
              contactPhone: profile.contactPhone,
              contactTelegram: profile.contactTelegram,
              instagramUrl: profile.instagramUrl,
              youtubeUrl: profile.youtubeUrl,
              tiktokUrl: profile.tiktokUrl,
            }
          : null,
        stats: {
          totalLikes,
          followerCount,
          totalListings: listings.length,
          activeListings: activeListings.length,
        },
        unlocks,
        // GeeZee card — only present when hasGeeZeeCard is true
        geeZeeCard: unlocks.hasGeeZeeCard && geeZeeCard
          ? {
              id: geeZeeCard.id,
              slogan: (geeZeeCard as any).slogan ?? null,
              profilePic: (geeZeeCard as any).profilePic ?? null,
              ageBracket: (geeZeeCard as any).ageBracket ?? null,
              gender: (geeZeeCard as any).gender ?? null,
              intent: (geeZeeCard as any).intent ?? null,
              qrUuid: (geeZeeCard as any).qrUuid ?? null,
              engageCount: (geeZeeCard as any).engageCount ?? 0,
            }
          : null,
        // Recent active listings (latest 5)
        recentListings: unlocks.canPost
          ? activeListings.slice(0, 5).map((l: any) => ({
              id: l.id,
              title: l.title,
              vertical: l.vertical,
              videoUrl: l.videoUrl,
              status: l.status,
              likeCount: l.likeCount ?? 0,
              dropDate: l.dropDate,
            }))
          : [],
        // Groups — only present when hasGroups is true
        groups: unlocks.hasGroups
          ? (groups as any[]).slice(0, 10).map((g) => ({
              id: g.id,
              name: g.name,
              description: g.description,
              coverUrl: g.coverUrl,
              isPrivate: g.isPrivate,
              memberCount: g.memberCount ?? null,
            }))
          : [],
      });
    } catch (err) {
      console.error("[user/dashboard]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // === LOVE VOTES ===
  const currentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  app.post("/api/love/:providerId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login to show love" });
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider" });
    const voter = await storage.getUserById(req.session.userId);
    const voterProfile = await storage.getProfileByUserId(req.session.userId);
    if (voterProfile && voterProfile.id === providerId) {
      return res.status(400).json({ message: "You can't vote for yourself" });
    }
    const result = await storage.castLoveVote(req.session.userId, providerId, currentMonthKey());
    if (result.alreadyVoted) return res.status(409).json({ message: "You've already shown love this month" });
    return res.json({ success: true });
  });

  app.get("/api/love/:providerId/status", async (req, res) => {
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ message: "Invalid provider" });
    const userId = req.session?.userId ?? null;
    const result = await storage.getLoveVoteStatus(userId, providerId, currentMonthKey());
    return res.json(result);
  });

  app.get("/api/love/leaderboard", async (req, res) => {
    const entries = await storage.getLoveLeaderboard(currentMonthKey());
    return res.json(entries ?? []);
  });

  // === ACTIVITY FEED (who viewed / loved / liked my comments) ================

  // Unified activity feed for the authenticated user's provider profile
  app.get("/api/notifications/activity", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      const feed = await storage.getMyActivityFeed(profile.id, 60);
      return res.json(feed);
    } catch (err) {
      console.error("[activity-feed]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Who viewed my profile
  app.get("/api/profile/me/viewers", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      const viewers = await storage.getProfileViewers(profile.id, 100);
      return res.json(viewers);
    } catch (err) {
      console.error("[profile/viewers]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Who showed me love
  app.get("/api/profile/me/who-loved-me", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      // Re-use getMyActivityFeed filtered to love only
      const feed = await storage.getMyActivityFeed(profile.id, 100);
      return res.json(feed.filter(e => e.type === "love"));
    } catch (err) {
      console.error("[who-loved-me]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ── Profile Wall Posts ──────────────────────────────────────────────────────
  app.get("/api/profile/:id/wall", async (req, res) => {
    const rawId = req.params.id;
    const numId = parseInt(rawId);
    let profileId: number;
    if (!isNaN(numId)) {
      profileId = numId;
    } else {
      const p = await storage.getProfileByUsername(rawId);
      if (!p) return res.json([]);
      profileId = p.id;
    }
    try {
      const posts = await storage.getProfileWallPosts(profileId);
      return res.json(Array.isArray(posts) ? posts : []);
    } catch (err) {
      console.error("[profile/wall/get]", err);
      return res.json([]);
    }
  });

  app.post("/api/profile/:id/wall", async (req, res) => {
    const rawId = req.params.id;
    const numId = parseInt(rawId);
    let profileId: number;
    if (!isNaN(numId)) {
      profileId = numId;
    } else {
      const p = await storage.getProfileByUsername(rawId);
      if (!p) return res.status(404).json({ message: "Profile not found" });
      profileId = p.id;
    }
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
    if (message.trim().length > 500) return res.status(400).json({ message: "Message too long (max 500 chars)" });
    try {
      const userId = (req.session as any)?.userId;
      let authorName = "Anonymous";
      let authorAvatar: string | null = null;
      if (userId) {
        const profile = await storage.getProfileByUserId(userId);
        if (profile) {
          authorName = profile.displayName || profile.username || authorName;
          authorAvatar = profile.avatarUrl || null;
        }
      }
      const post = await storage.createProfileWallPost({
        profileId,
        authorUserId: userId ?? null,
        authorName,
        authorAvatar,
        message: message.trim(),
      });
      return res.json(post);
    } catch (err) {
      console.error("[profile/wall/post]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/profile/wall/:postId", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required" });
    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post id" });
    try {
      await storage.deleteProfileWallPost(postId);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[profile/wall/delete]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Toggle like on a listing comment
  app.post("/api/listings/comments/:id/like", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Login required to like comments" });
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ message: "Invalid comment id" });
    try {
      const result = await storage.toggleCommentLike(commentId, req.session.userId);
      return res.json(result);
    } catch (err) {
      console.error("[comment-like]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Who liked a specific comment
  app.get("/api/listings/comments/:id/likers", async (req, res) => {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ message: "Invalid comment id" });
    try {
      const likers = await storage.getCommentLikers(commentId, 50);
      return res.json(likers);
    } catch (err) {
      console.error("[comment-likers]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/stats/user-count", async (_req, res) => {
    try {
      const count = await storage.getUserCount();
      return res.json({ count });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/engagement/leaderboard", async (_req, res) => {
    try {
      const entries = await storage.getTotalEngagementLeaderboard(20);
      return res.json(entries);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/geezee/engage-leaderboard", async (_req, res) => {
    const entries = await storage.getGeeZeeEngageLeaderboard(20);
    return res.json(entries);
  });

  // ── All Eyes On Me ──────────────────────────────────────────────────────────

  app.get("/api/all-eyes/active", async (_req, res) => {
    const slot = await storage.getActiveAllEyesSlot();
    return res.json(slot ?? null);
  });

  app.get("/api/all-eyes/upcoming", async (_req, res) => {
    const slots = await storage.getUpcomingAllEyesSlots();
    return res.json(slots ?? []);
  });

  app.get("/api/all-eyes/all", async (req, res) => {
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.session?.role ?? "")) return res.status(403).json({ message: "Admin only" });
    const slots = await storage.getAllAllEyesSlots();
    return res.json(slots ?? []);
  });

  app.post("/api/all-eyes/book", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Authentication required" });
    const profile = await storage.getProfileByUserId(req.session.userId);
    if (!profile) return res.status(400).json({ message: "Provider profile required" });
    const { durationMinutes, videoListingId, customTitle, startAt } = req.body;
    if (![15, 30, 60].includes(durationMinutes)) return res.status(400).json({ message: "Duration must be 15, 30, or 60 minutes" });
    if (!startAt) return res.status(400).json({ message: "Start time is required" });
    const result = await storage.bookAllEyesSlot(profile.id, req.session.userId, { durationMinutes, videoListingId, customTitle, startAt });
    if (result.error) return res.status(409).json({ message: result.error });
    return res.json(result.slot);
  });

  // ── ZitoTV ──────────────────────────────────────────────────────────────────

  app.get("/api/zitotv/events", async (req, res) => {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const events = await storage.getZitoTVEvents({ from, to });
    return res.json(events ?? []);
  });

  app.get("/api/zitotv/events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const event = await storage.getZitoTVEvent(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    return res.json(event);
  });

  app.post("/api/zitotv/events", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Authentication required" });
    const { title, description, hostName, category, liveUrl, ctaUrl, durationMinutes, startAt } = req.body;
    if (!title || !hostName || !startAt || !durationMinutes) return res.status(400).json({ message: "title, hostName, startAt and durationMinutes are required" });
    const event = await storage.createZitoTVEvent(req.session.userId, { title, description, hostName, category: category ?? "OTHER", liveUrl, ctaUrl, durationMinutes, startAt });
    return res.json(event);
  });

  app.patch("/api/zitotv/events/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Authentication required" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const event = await storage.getZitoTVEvent(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.session?.role ?? "");
    const isOwner = event.hostUserId === req.session.userId;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });
    const updated = await storage.updateZitoTVEvent(id, req.body);
    return res.json(updated);
  });

  app.delete("/api/zitotv/events/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Authentication required" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const event = await storage.getZitoTVEvent(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.session?.role ?? "");
    const isOwner = event.hostUserId === req.session.userId;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });
    await storage.deleteZitoTVEvent(id);
    return res.json({ success: true });
  });

  app.patch("/api/all-eyes/:id/cancel", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Authentication required" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const slots = await storage.getAllAllEyesSlots();
    const slot = slots.find(s => s.id === id);
    if (!slot) return res.status(404).json({ message: "Slot not found" });
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.session?.role ?? "");
    const profile = await storage.getProfileByUserId(req.session.userId);
    const isOwner = profile?.id === slot.providerId;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });
    await storage.cancelAllEyesSlot(id);
    return res.json({ success: true });
  });

  app.get("/get-setup", (_req, res) => {
    const filePath = path.resolve("client/public/vps_setup.sh");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("vps_setup.sh not found");
    }
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", 'attachment; filename="vps_setup.sh"');
    res.sendFile(filePath);
  });

  app.get("/get-deploy", (_req, res) => {
    const filePath = path.resolve("client/public/deploy_all.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("deploy_all.js not found");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="deploy_all.js"');
    res.sendFile(filePath);
  });

  app.get("/get-mini-player", (_req, res) => {
    const filePath = path.resolve("client/public/deploy_mini_player.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("deploy_mini_player.js not found");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="deploy_mini_player.js"');
    res.sendFile(filePath);
  });

  app.get("/get-video-card", (_req, res) => {
    const filePath = path.resolve("client/public/deploy_video_card.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("deploy_video_card.js not found");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="deploy_video_card.js"');
    res.sendFile(filePath);
  });

  app.get("/get-home", (_req, res) => {
    const filePath = path.resolve("client/public/deploy_home.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("deploy_home.js not found");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="deploy_home.js"');
    res.sendFile(filePath);
  });

  app.get("/get-css", (_req, res) => {
    const filePath = path.resolve("client/public/deploy_css.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("deploy_css.js not found");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="deploy_css.js"');
    res.sendFile(filePath);
  });

  // === SPONSOR ADS: ADMIN IMAGE UPLOAD ===
  app.post("/api/admin/upload-ad-image", (req, res) => {
    if (!requireAdmin(req, res)) return;
    adImageUpload.single("image")(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message ?? "Upload failed" });
      if (!req.file) return res.status(400).json({ message: "No file received" });
      try {
        const adsDir = path.join(process.cwd(), "ads");
        if (!fs.existsSync(adsDir)) fs.mkdirSync(adsDir, { recursive: true });
        const filename = `ad-${Date.now()}-${randomBytes(4).toString("hex")}.png`;
        const outPath = path.join(adsDir, filename);
        await sharp(req.file.buffer)
          .resize(760, 520, { fit: "cover", position: "centre" })
          .png({ quality: 90 })
          .toFile(outPath);
        return res.json({ url: `/ads/${filename}` });
      } catch (e: any) {
        return res.status(500).json({ message: e.message ?? "Image processing failed" });
      }
    });
  });

  // === AD AVAILABILITY (PUBLIC) ===
  app.get("/api/ads/availability", async (req, res) => {
    try {
      const { start, end } = req.query as { start?: string; end?: string };
      if (!start || !end) return res.status(400).json({ message: "start and end date params required (YYYY-MM-DD)" });
      const booked = await storage.getAvailabilityForRange(start, end);
      const allSlots = [1, 2, 3, 4, 5];
      const result: Record<string, { slot: number; available: boolean }[]> = {};
      const cursor = new Date(start);
      const endD = new Date(end);
      while (cursor <= endD) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const taken = booked[dateStr] ?? [];
        result[dateStr] = allSlots.map((slot) => ({ slot, available: !taken.includes(slot) }));
        cursor.setDate(cursor.getDate() + 1);
      }
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // === SPONSOR ADS (PUBLIC) ===
  app.get("/api/sponsor-ads", async (req, res) => {
    try {
      const { date } = req.query as { date?: string };
      const ads = date ? await storage.getAdsForDate(date) : await storage.getActiveSponsorAds();
      return res.json(ads);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch ads" });
    }
  });

  // Public: submit an inquiry from a contact-profile ad
  app.post("/api/ad-inquiries", async (req, res) => {
    try {
      const schema = z.object({
        adId: z.number().int().positive(),
        advertiserUsername: z.string().optional(),
        viewerName: z.string().min(1).max(80),
        viewerEmail: z.string().email().optional().or(z.literal("")),
        viewerMessage: z.string().min(1).max(500),
        viewerUsername: z.string().optional(),
      });
      const data = schema.parse(req.body);

      // Geo lookup from IP
      let viewerCity: string | undefined;
      let viewerState: string | undefined;
      let viewerCountry: string | undefined;
      try {
        const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
        const ip = rawIp.replace("::ffff:", "");
        if (ip && ip !== "127.0.0.1" && ip !== "::1" && !/^10\./.test(ip) && !/^192\.168\./.test(ip)) {
          const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`);
          if (geoRes.ok) {
            const geo = await geoRes.json() as { status: string; city?: string; regionName?: string; country?: string };
            if (geo.status === "success") {
              viewerCity = geo.city;
              viewerState = geo.regionName;
              viewerCountry = geo.country;
            }
          }
        }
      } catch { /* geo is best-effort */ }

      const inquiry = await storage.createAdInquiry({
        ...data,
        viewerEmail: data.viewerEmail || undefined,
        viewerUsername: data.viewerUsername || undefined,
        viewerCity,
        viewerState,
        viewerCountry,
      });

      // Send email notification to the ad owner
      try {
        const ad = await storage.getSponsorAdById(data.adId);
        if (ad) {
          // Prefer explicit contactEmail; fall back to the ad creator's account email
          let toEmail = ad.contactEmail ?? null;
          if (!toEmail && ad.createdBy) {
            const creator = await storage.getUserById(ad.createdBy);
            toEmail = creator?.email ?? null;
          }
          if (toEmail) {
            sendAdInquiryNotification({
              toEmail,
              advertiserUsername: ad.contactUsername ?? data.advertiserUsername ?? "",
              viewerName: data.viewerName,
              viewerEmail: data.viewerEmail || undefined,
              viewerMessage: data.viewerMessage,
              viewerUsername: data.viewerUsername,
              viewerCity,
              viewerState,
              viewerCountry,
              adTitle: ad.title,
            }).catch((e) => console.error("[ad-inquiry email]", e));
          } else {
            console.warn("[ad-inquiry email] no email address found for ad", ad.id);
          }
        }
      } catch (e) { console.error("[ad-inquiry email lookup]", e); }

      return res.json(inquiry);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to submit inquiry" });
    }
  });

  // Get ad inquiries for the logged-in user's username
  app.get("/api/ad-inquiries", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile?.username) return res.json([]);
      const inquiries = await storage.getAdInquiries(profile.username);
      return res.json(inquiries);
    } catch (e) {
      console.error("[ad-inquiries GET]", e);
      return res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Mark inbox items as read
  app.patch("/api/ad-inquiries/:id/read", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.markAdInquiryRead(parseInt(req.params.id));
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/ad-inquiries/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile?.username) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteAdInquiry(parseInt(req.params.id), profile.username);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/ad-inquiries/bulk-delete", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { ids } = req.body as { ids?: number[] };
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      if (!profile?.username) return res.status(403).json({ message: "Forbidden" });
      await storage.bulkDeleteAdInquiries(ids, profile.username);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/ad-inquiries/:id/reply", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { replyText } = req.body as { replyText?: string };
    if (!replyText?.trim()) return res.status(400).json({ message: "Reply text required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      const inquiries = await storage.getAdInquiries(profile?.username ?? "");
      const inq = inquiries.find((i) => i.id === parseInt(req.params.id));
      if (!inq) return res.status(404).json({ message: "Not found" });
      if (!inq.viewerEmail) return res.status(400).json({ message: "No email on record for this inquiry" });
      await sendEmail({
        toEmail: inq.viewerEmail,
        subject: `Reply from ${profile?.displayName ?? "Gigzito Provider"}`,
        html: `<p>${replyText.trim().replace(/\n/g, "<br>")}</p>`,
      });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed to send reply" }); }
  });

  app.patch("/api/listings/comments/:id/read", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.markListingCommentRead(parseInt(req.params.id));
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/listings/comments/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.deleteListingComment(parseInt(req.params.id), req.session.userId);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/listings/comments/bulk-delete", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { ids } = req.body as { ids?: number[] };
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    try {
      await storage.bulkDeleteListingComments(ids, req.session.userId);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/listings/comments/:id/reply", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { replyText } = req.body as { replyText?: string };
    if (!replyText?.trim()) return res.status(400).json({ message: "Reply text required" });
    try {
      const profile = await storage.getProfileByUserId(req.session.userId);
      const allComments = await storage.getListingCommentsByProvider(req.session.userId);
      const comment = allComments.find((c) => c.id === parseInt(req.params.id));
      if (!comment) return res.status(404).json({ message: "Not found" });
      const viewerEmail = (comment as any).viewerEmail as string | null;
      if (!viewerEmail) return res.status(400).json({ message: "No email on record for this comment" });
      await sendEmail({
        toEmail: viewerEmail,
        subject: `Reply from ${profile?.displayName ?? "Gigzito Provider"}`,
        html: `<p>${replyText.trim().replace(/\n/g, "<br>")}</p>`,
      });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed to send reply" }); }
  });

  app.patch("/api/gigness-cards/messages/:id/read", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.markCardMessageRead(parseInt(req.params.id));
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/gigness-cards/messages/:id", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.deleteCardMessage(parseInt(req.params.id), req.session.userId);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/gigness-cards/messages/bulk-delete", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { ids } = req.body as { ids?: number[] };
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    try {
      await storage.bulkDeleteCardMessages(ids, req.session.userId);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/gigness-cards/messages/:id/reply", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const { replyText } = req.body as { replyText?: string };
    if (!replyText?.trim()) return res.status(400).json({ message: "Reply text required" });
    try {
      const messages = await storage.getCardMessages(req.session.userId);
      const msg = messages.find((m) => m.id === parseInt(req.params.id));
      if (!msg) return res.status(404).json({ message: "Not found" });
      const sender = await storage.getUserById(msg.fromUserId);
      if (!sender?.email) return res.status(400).json({ message: "No email on record for this sender" });
      const profile = await storage.getProfileByUserId(req.session.userId);
      await sendEmail({
        toEmail: sender.email,
        subject: `Reply from ${profile?.displayName ?? "Gigzito Provider"}`,
        html: `<p>${replyText.trim().replace(/\n/g, "<br>")}</p>`,
      });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed to send reply" }); }
  });

  // === ZEE MOTION ===
  app.post("/api/zee-motions", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const schema = z.object({
      text: z.string().max(500).nullable().optional(),
      mediaUrl: z.string().nullable().optional(),
      mediaType: z.enum(["image", "gif", "sticker"]).nullable().optional(),
    });
    try {
      const data = schema.parse(req.body);
      if (!data.text?.trim() && !data.mediaUrl) return res.status(400).json({ message: "Add some text or media" });
      const motion = await storage.createZeeMotion(userId, data);
      return res.json(motion);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/zee-motions/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const motions = await storage.getMyZeeMotions(userId);
    return res.json(motions);
  });

  app.get("/api/zee-motions/feed", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const feed = await storage.getZeeMotionFeed(userId);
    return res.json(feed);
  });

  app.get("/api/zee-motions/user/:userId", async (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(targetUserId)) return res.status(400).json({ message: "Invalid userId" });
    const motions = await storage.getUserZeeMotions(targetUserId);
    return res.json(motions);
  });

  app.get("/api/zee-motions/:id/comments", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const comments = await storage.getZeeMotionComments(id);
    return res.json(comments);
  });

  app.post("/api/zee-motions/:id/comments", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const schema = z.object({ commentText: z.string().min(1).max(500), authorName: z.string().min(1).max(80) });
    try {
      const data = schema.parse(req.body);
      const authorUserId = (req.session as any)?.userId ?? null;
      const comment = await storage.createZeeMotionComment({ motionId: id, authorUserId, authorName: data.authorName, commentText: data.commentText });
      return res.json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/zee-motions/:id", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteZeeMotion(id, userId);
    return res.json({ ok: true });
  });

  // === GEEZEE FOLLOWS ===
  app.post("/api/geezee-follows/:userId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const followerId = (req.session as any).userId;
    const followingUserId = parseInt(req.params.userId);
    if (isNaN(followingUserId)) return res.status(400).json({ message: "Invalid userId" });
    if (followerId === followingUserId) return res.status(400).json({ message: "Cannot follow yourself" });
    await storage.followUser(followerId, followingUserId);
    return res.json({ ok: true });
  });

  app.delete("/api/geezee-follows/:userId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const followerId = (req.session as any).userId;
    const followingUserId = parseInt(req.params.userId);
    if (isNaN(followingUserId)) return res.status(400).json({ message: "Invalid userId" });
    await storage.unfollowUser(followerId, followingUserId);
    return res.json({ ok: true });
  });

  app.get("/api/geezee-follows/status/:userId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const followerId = (req.session as any).userId;
    const followingUserId = parseInt(req.params.userId);
    if (isNaN(followingUserId)) return res.status(400).json({ message: "Invalid userId" });
    const [following, followerCount, followingCount] = await Promise.all([
      storage.isFollowing(followerId, followingUserId),
      storage.getFollowerCount(followingUserId),
      storage.getFollowingCount(followingUserId),
    ]);
    return res.json({ following, followerCount, followingCount });
  });

  app.get("/api/geezee-follows/counts/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
    const [followerCount, followingCount] = await Promise.all([
      storage.getFollowerCount(userId),
      storage.getFollowingCount(userId),
    ]);
    return res.json({ followerCount, followingCount });
  });

  // === PRESENTER CONTACTS (Engage Opt-In) ===
  const PAID_TIERS = ["GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];

  app.post("/api/presenter-contacts/opt-in/:presenterUserId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const memberUserId = (req.session as any).userId;
    const presenterUserId = parseInt(req.params.presenterUserId);
    if (isNaN(presenterUserId)) return res.status(400).json({ message: "Invalid presenter ID" });
    if (memberUserId === presenterUserId) return res.status(400).json({ message: "Cannot opt into yourself" });
    const presenter = await storage.getUserById(presenterUserId);
    if (!presenter || !PAID_TIERS.includes(presenter.subscriptionTier)) return res.status(403).json({ message: "Presenter is not a paid marketer" });
    await storage.optInToPresenter(presenterUserId, memberUserId);
    return res.json({ ok: true });
  });

  app.delete("/api/presenter-contacts/opt-out/:presenterUserId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const memberUserId = (req.session as any).userId;
    const presenterUserId = parseInt(req.params.presenterUserId);
    if (isNaN(presenterUserId)) return res.status(400).json({ message: "Invalid presenter ID" });
    await storage.optOutFromPresenter(presenterUserId, memberUserId);
    return res.json({ ok: true });
  });

  app.get("/api/presenter-contacts/status/:presenterUserId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const memberUserId = (req.session as any).userId;
    const presenterUserId = parseInt(req.params.presenterUserId);
    if (isNaN(presenterUserId)) return res.status(400).json({ message: "Invalid presenter ID" });
    const optedIn = await storage.getOptInStatus(presenterUserId, memberUserId);
    return res.json({ optedIn });
  });

  app.get("/api/presenter-contacts/mine", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const memberUserId = (req.session as any).userId;
    const optIns = await storage.getMemberOptIns(memberUserId);
    return res.json(optIns);
  });

  app.get("/api/presenter-contacts/my-list", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const presenterUserId = (req.session as any).userId;
    const presenter = await storage.getUserById(presenterUserId);
    if (!presenter || !PAID_TIERS.includes(presenter.subscriptionTier)) {
      return res.status(403).json({ message: "Only paid presenters can view their contact list" });
    }
    const contacts = await storage.getPresenterContacts(presenterUserId);
    return res.json(contacts);
  });

  app.get("/api/presenter-contacts/my-contacts", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const presenterUserId = (req.session as any).userId;
    const presenter = await storage.getUserById(presenterUserId);
    if (!presenter || !PAID_TIERS.includes(presenter.subscriptionTier)) {
      return res.json([]);
    }
    const contacts = await storage.getPresenterContacts(presenterUserId);
    return res.json(contacts);
  });

  app.get("/api/presenter-contacts/lookup", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const username = req.query.username as string;
    if (!username) return res.status(400).json({ message: "username required" });
    const presenter = await storage.getPresenterByUsername(username);
    if (!presenter) return res.status(404).json({ message: "Presenter not found" });
    if (!PAID_TIERS.includes(presenter.subscriptionTier)) return res.status(404).json({ message: "No paid presenter found with that username" });
    return res.json(presenter);
  });

  // === SPONSOR ADS (ADMIN) ===
  app.get("/api/admin/sponsor-ads", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const ads = await storage.getSponsorAds();
      return res.json(ads);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch ads" });
    }
  });

  app.post("/api/admin/sponsor-ads", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { title, body, imageUrl, targetUrl, ctaMode, contactUsername, contactEmail, contactMessage, cta, sortOrder } = req.body;
      if (!title || !imageUrl) return res.status(400).json({ message: "title and imageUrl are required" });
      const ad = await storage.createSponsorAd({
        title,
        body: body ?? "",
        imageUrl,
        targetUrl: targetUrl || null,
        ctaMode: ctaMode ?? "url",
        contactUsername: contactUsername || null,
        contactEmail: contactEmail || null,
        contactMessage: contactMessage || null,
        cta: cta ?? "Learn More",
        active: true,
        sortOrder: sortOrder ?? 0,
        createdBy: (req.session as any).userId,
      });
      return res.status(201).json(ad);
    } catch (e: any) {
      console.error("[create ad error]", e?.message ?? e);
      return res.status(500).json({ message: e?.message ?? "Failed to create ad" });
    }
  });

  app.patch("/api/admin/sponsor-ads/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { title, body, imageUrl, targetUrl, ctaMode, contactUsername, contactEmail, contactMessage, cta, sortOrder, active } = req.body;
      const ad = await storage.updateSponsorAd(id, { title, body, imageUrl, targetUrl, ctaMode, contactUsername, contactEmail, contactMessage, cta, sortOrder, active });
      return res.json(ad);
    } catch (e) {
      return res.status(500).json({ message: "Failed to update ad" });
    }
  });

  app.patch("/api/admin/sponsor-ads/:id/toggle", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const ad = await storage.toggleSponsorAd(id, !!active);
      return res.json(ad);
    } catch (e) {
      return res.status(500).json({ message: "Failed to toggle ad" });
    }
  });

  app.delete("/api/admin/sponsor-ads/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSponsorAd(id);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Failed to delete ad" });
    }
  });

  // === AD BOOKINGS (PUBLIC SELF-SERVE) ===
  app.post("/api/ads/book", async (req, res) => {
    try {
      const { sponsorAdId, bookingDate, slotNumber, advertiserName, advertiserEmail, amountCents, notes } = req.body;
      if (!bookingDate || !slotNumber || !advertiserName || !advertiserEmail) {
        return res.status(400).json({ message: "bookingDate, slotNumber, advertiserName and advertiserEmail are required" });
      }
      if (slotNumber < 1 || slotNumber > 5) {
        return res.status(400).json({ message: "slotNumber must be 1-5" });
      }
      const existing = await storage.getBookingsForDate(bookingDate);
      const confirmedCount = existing.filter((b) => b.status === "confirmed").length;
      if (confirmedCount >= 5) {
        return res.status(409).json({ message: "Sold out — all 5 slots are booked for this date." });
      }
      const slotTaken = existing.some((b) => b.slotNumber === slotNumber && b.status === "confirmed");
      if (slotTaken) {
        return res.status(409).json({ message: `Slot ${slotNumber} is already taken for this date.` });
      }
      const booking = await storage.createAdBooking({
        sponsorAdId: sponsorAdId ?? null,
        bookingDate,
        slotNumber,
        advertiserName,
        advertiserEmail,
        status: "pending",
        amountCents: amountCents ?? 0,
        notes: notes ?? null,
      });
      return res.status(201).json(booking);
    } catch (e) {
      return res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // === AD BOOKINGS (ADMIN) ===
  app.get("/api/admin/ad-bookings", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const bookings = await storage.getAdBookings();
      return res.json(bookings);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/admin/ad-bookings/:id/status", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!["pending", "confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      if (status === "confirmed") {
        const booking = await storage.getBookingsForDate(req.body.bookingDate ?? "");
        const confirmedCount = booking.filter((b) => b.id !== id && b.status === "confirmed").length;
        if (confirmedCount >= 5) {
          return res.status(409).json({ message: "Cannot confirm — 5 slots already confirmed for this date." });
        }
      }
      const updated = await storage.updateAdBookingStatus(id, status);
      return res.json(updated);
    } catch (e) {
      return res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.delete("/api/admin/ad-bookings/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAdBooking(id);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // === GZ FLASH ADS ===
  const gzFlashSchema = z.object({
    title: z.string().min(1).max(120),
    artworkUrl: z.string().nullable().optional(),
    retailPriceCents: z.coerce.number().int().min(1),
    discountPercent: z.coerce.number().int().min(1).max(99),
    quantity: z.coerce.number().int().min(1).max(9999),
    durationMinutes: z.coerce.number().int().min(5).max(43200),
    displayMode: z.enum(["countdown", "slots"]).default("countdown"),
    couponCode: z.string().max(60).nullable().optional(),
    couponExpiryHours: z.coerce.number().int().min(1).max(720).default(48),
  });

  app.get("/api/gz-flash", async (req, res) => {
    try {
      const ads = await storage.getActiveGzFlashAds();
      return res.json(ads);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch GZFlash ads" });
    }
  });

  const GZ_FLASH_TIERS = ["GZMarketerPro", "GZBusiness", "GZEnterprise"];

  app.get("/api/gz-flash/mine", async (req, res) => {
    injectJwtSession(req);
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUserById(session.userId);
    const isAdminRole = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(user?.role ?? "");
    if (!GZ_FLASH_TIERS.includes(user?.subscriptionTier ?? "") && !isAdminRole) {
      return res.status(403).json({ message: "GZMarketerPro, GZBusiness, or GZEnterprise tier required" });
    }
    try {
      const ads = await storage.getMyGzFlashAds(session.userId);
      return res.json(ads);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch your GZFlash ads" });
    }
  });

  app.post("/api/gz-flash", async (req, res) => {
    injectJwtSession(req);
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUserById(session.userId);
    const isAdminRole = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(user?.role ?? "");
    if (!GZ_FLASH_TIERS.includes(user?.subscriptionTier ?? "") && !isAdminRole) {
      return res.status(403).json({ message: "GZMarketerPro, GZBusiness, or GZEnterprise tier required" });
    }
    try {
      const data = gzFlashSchema.parse(req.body);
      const ad = await storage.createGzFlashAd(session.userId, data);
      return res.status(201).json(ad);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, fields: err.errors });
      console.error("[gz-flash/create]", err);
      return res.status(500).json({ message: "Failed to create GZFlash ad", detail: (err as any)?.message });
    }
  });

  app.put("/api/gz-flash/:id", async (req, res) => {
    injectJwtSession(req);
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUserById(session.userId);
    const isAdminRole = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(user?.role ?? "");
    if (!GZ_FLASH_TIERS.includes(user?.subscriptionTier ?? "") && !isAdminRole) {
      return res.status(403).json({ message: "GZMarketerPro, GZBusiness, or GZEnterprise tier required" });
    }
    try {
      const id = parseInt(req.params.id);
      const data = gzFlashSchema.parse(req.body);
      const ad = await storage.updateGzFlashAd(id, session.userId, data);
      return res.json(ad);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to update GZFlash ad" });
    }
  });

  app.delete("/api/gz-flash/:id", async (req, res) => {
    injectJwtSession(req);
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGzFlashAd(id, session.userId);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Failed to delete GZFlash ad" });
    }
  });

  app.post("/api/gz-flash/:id/claim", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { email } = z.object({ email: z.string().email("Valid email required") }).parse(req.body);
      const { ad, couponCode, couponExpiresAt } = await storage.claimGzFlashAd(id, email);
      const adWithOwner = (await storage.getActiveGzFlashAds()).find((a) => a.id === id) ??
        { displayName: null, username: null } as any;
      const providerName = (adWithOwner as any).displayName ?? (adWithOwner as any).username ?? "the provider";
      const salePrice = ((ad.retailPriceCents * (1 - ad.discountPercent / 100)) / 100).toFixed(2);
      const originalPrice = (ad.retailPriceCents / 100).toFixed(2);
      if (couponCode) {
        sendGZFlashCoupon({
          toEmail: email,
          adTitle: ad.title,
          providerName,
          couponCode,
          salePrice,
          originalPrice,
          discountPercent: ad.discountPercent,
          couponExpiresAt,
        }).catch((e) => console.warn("GZFlash coupon email failed:", e.message));
      }
      return res.json({ ad, couponCode, couponExpiresAt });
    } catch (e: any) {
      return res.status(400).json({ message: e.message ?? "Failed to claim" });
    }
  });

  // Recalculate all GZFlash potency scores every 60 seconds
  setInterval(() => {
    storage.recalculateGzFlashScores().catch((e) => console.warn("GZFlash score recalculation failed:", e.message));
  }, 60_000);

  // === ADMIN: GZ FLASH ===
  app.get("/api/admin/gz-flash", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const ads = await storage.adminGetAllGzFlashAds();
      return res.json(ads);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch GZFlash ads" });
    }
  });

  app.patch("/api/admin/gz-flash/:id/status", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.enum(["active", "paused", "expired"]) }).parse(req.body);
      const ad = await storage.adminSetGzFlashStatus(id, status);
      return res.json(ad);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to update ad status" });
    }
  });

  app.delete("/api/admin/gz-flash/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      await storage.adminDeleteGzFlashAd(id);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Failed to delete ad" });
    }
  });

  app.post("/api/admin/gz-flash/:id/message", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { note } = z.object({ note: z.string().min(1).max(1000) }).parse(req.body);
      const ad = await storage.adminSetGzFlashNote(id, note);
      return res.json(ad);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Failed to save note" });
    }
  });

  // ── Mass Notification (SUPER_ADMIN only) ────────────────────────────────────
  app.get("/api/admin/notifications/recipients", async (req, res) => {
    injectJwtSession(req);
    if (!requireSuperAdmin(req, res)) return;
    try {
      const users = await storage.getAllUsers();
      const eligible = users.filter((u: any) => u.email && u.emailVerified && u.status !== "disabled");
      return res.json({ count: eligible.length, emails: eligible.map((u: any) => ({ id: u.id, email: u.email, name: u.profile?.displayName ?? u.email.split("@")[0] })) });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load recipients" });
    }
  });

  app.post("/api/admin/notifications/send", async (req, res) => {
    injectJwtSession(req);
    if (!requireSuperAdmin(req, res)) return;
    try {
      const schema = z.object({
        subject: z.string().min(1).max(200),
        message: z.string().min(1).max(10000),
        recipientGroup: z.enum(["all"]),
      });
      const { subject, message, recipientGroup } = schema.parse(req.body);

      const users = await storage.getAllUsers();
      const eligible = users.filter((u: any) => u.email && u.emailVerified && u.status !== "disabled");

      let sent = 0;
      let failed = 0;
      let devMode = false;

      for (const u of eligible) {
        try {
          const result = await sendMassNotification({
            toEmail: u.email,
            toName: (u as any).profile?.displayName ?? u.email.split("@")[0],
            subject,
            message,
          });
          if (result.devMode) devMode = true;
          sent++;
        } catch (err) {
          console.error(`[notifications] failed to send to user ${u.id}:`, err instanceof Error ? err.message : String(err));
          failed++;
        }
      }

      // Audit log
      const senderUserId = (req.session as any)?.userId;
      await storage.createAuditLog({
        userId: senderUserId,
        action: "MASS_NOTIFICATION_SENT",
        details: `Subject: "${subject}" | Recipients: ${sent} | Failed: ${failed}`,
      }).catch(() => {});

      return res.json({ sent, failed, total: eligible.length, devMode });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("[notifications/send]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ─── GZMusic ─────────────────────────────────────────────────────────────────

  // ── Mobile-optimised GZMusic endpoints ──────────────────────────────────────
  // Single track detail — with liked/myRating/commentCount baked in
  app.get("/api/gz-music/tracks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid track id" });
    const userId = (req.session as any)?.userId as number | undefined;
    try {
      const track = await storage.getGZMusicTrackById(id, userId);
      if (!track) return res.status(404).json({ message: "Track not found" });
      return res.json(track);
    } catch (err) {
      console.error("[gz-music/tracks/:id]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Find a GZMusic track by title (fuzzy) — used by GZ_MUSIC video cards to show Download Now
  app.get("/api/gz-music/find-by-title", async (req, res) => {
    const q = ((req.query.title as string) ?? "").toLowerCase().trim();
    if (!q) return res.json(null);
    try {
      const tracks = await storage.getGZMusicTracks();
      const match = tracks.find(
        (t) => t.title.toLowerCase() === q ||
               t.title.toLowerCase().includes(q) ||
               q.includes(t.title.toLowerCase())
      );
      return res.json(match ?? null);
    } catch (err) {
      console.error("[gz-music/find-by-title]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Paginated chart — liked/myRating/commentCount baked in, supports sort/genre/search/page
  // GET /api/gz-music/chart?page=1&limit=20&sort=chart|new|plays|likes&genre=hip-hop&q=search
  app.get("/api/gz-music/chart", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1")));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const sort  = String(req.query.sort  ?? "chart");
    const genre = String(req.query.genre ?? "").trim() || undefined;
    const q     = String(req.query.q     ?? "").trim() || undefined;
    try {
      const result = await storage.getGZMobileChart({ page, limit, userId, q, genre, sort });
      return res.json(result);
    } catch (err) {
      console.error("[gz-music/chart]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Trending — top by play count, with user context
  // GET /api/gz-music/trending?limit=10
  app.get("/api/gz-music/trending", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const limit  = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"))));
    try {
      const tracks = await storage.getGZMusicTrending(limit, userId);
      return res.json(tracks);
    } catch (err) {
      console.error("[gz-music/trending]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Genres — distinct list of genre tags for mobile filter UI
  app.get("/api/gz-music/genres", async (req, res) => {
    try {
      const genres = await storage.getGZMusicGenres();
      return res.json(genres);
    } catch (err) {
      console.error("[gz-music/genres]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });
  // ────────────────────────────────────────────────────────────────────────────

  // User track submission (any authenticated user, any tier)
  app.post(
    "/api/gz-music/submit",
    gzMusicUpload.fields([
      { name: "audio", maxCount: 1 },
      { name: "license", maxCount: 1 },
      { name: "cover", maxCount: 1 },
    ]),
    async (req, res) => {
      if (!requireAuth(req, res)) return;
      const userId = (req.session as any).userId;
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const audioFile = files?.["audio"]?.[0];
      if (!audioFile) return res.status(400).json({ message: "MP3 audio file is required." });
      const { title, artist, genre, downloadEnabled, authenticityConfirmed, sharedToLibrary } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Track title is required." });
      if (!artist?.trim()) return res.status(400).json({ message: "Artist name is required." });
      if (!genre?.trim()) return res.status(400).json({ message: "Genre is required." });
      if (authenticityConfirmed !== "true") return res.status(400).json({ message: "Certificate of authenticity must be confirmed." });

      const gzMusicFinalDir = path.join(process.cwd(), "uploads", "gz-music");

      // Inspector: audio
      const audioInspection = inspectFileSync(audioFile.path, audioFile.mimetype);
      if (!audioInspection.pass) {
        destroyContraband(audioFile.path, audioInspection.reason ?? "failed audio inspection");
        return res.status(422).json({ message: `Audio upload declined: ${audioInspection.reason}` });
      }
      moveToFinalDest(audioFile.path, gzMusicFinalDir, audioFile.filename);

      const licenseFile = files?.["license"]?.[0];
      const coverFile = files?.["cover"]?.[0];

      // Inspector: license (optional)
      if (licenseFile) {
        const licInspection = inspectFileSync(licenseFile.path, licenseFile.mimetype);
        if (!licInspection.pass) {
          destroyContraband(licenseFile.path, licInspection.reason ?? "failed license inspection");
          return res.status(422).json({ message: `License upload declined: ${licInspection.reason}` });
        }
        moveToFinalDest(licenseFile.path, gzMusicFinalDir, licenseFile.filename);
      }

      // Inspector: cover image (optional)
      if (coverFile) {
        const covInspection = inspectFileSync(coverFile.path, coverFile.mimetype);
        if (!covInspection.pass) {
          destroyContraband(coverFile.path, covInspection.reason ?? "failed cover inspection");
          return res.status(422).json({ message: `Cover image declined: ${covInspection.reason}` });
        }
        moveToFinalDest(coverFile.path, gzMusicFinalDir, coverFile.filename);
      }

      const fileUrl = `/uploads/gz-music/${audioFile.filename}`;
      const licenseFileUrl = licenseFile ? `/uploads/gz-music/${licenseFile.filename}` : null;
      const coverUrl = coverFile ? `/uploads/gz-music/${coverFile.filename}` : null;

      try {
        let track: any;
        try {
          // Full insert (requires new DB columns)
          track = await storage.createGZMusicTrack({
            title: title.trim(),
            artist: artist.trim(),
            genre: genre.trim(),
            coverUrl,
            audioUrl: null,
            fileUrl,
            licenseFileUrl,
            downloadEnabled: downloadEnabled === "true",
            authenticityConfirmed: true,
            sharedToLibrary: sharedToLibrary !== "false",
            uploaderUserId: userId,
            submittedBy: userId,
            likeCount: 0,
            status: "active",
          });
        } catch (innerErr: any) {
          // If the error is a missing column (VPS not yet migrated), fall back to legacy insert
          const msg = String(innerErr?.message ?? "");
          if (msg.includes("column") || msg.includes("42703") || msg.includes("does not exist")) {
            console.warn("[gz-music/submit] falling back to legacy insert — run ALTER TABLE on the DB to add new columns");
            track = await storage.createGZMusicTrack({
              title: title.trim(),
              artist: artist.trim(),
              genre: genre.trim(),
              coverUrl,
              audioUrl: fileUrl ?? null,
              submittedBy: userId,
              likeCount: 0,
              status: "active",
            } as any);
          } else {
            throw innerErr;
          }
        }
        return res.status(201).json(track);
      } catch (err) {
        console.error("[gz-music/submit]", err);
        return res.status(500).json({ message: "Failed to save track." });
      }
    }
  );

  // GZMusic — announce track to a single email (repeatable)
  app.post("/api/gz-music/announce/single", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const { trackId, toEmail, message } = req.body as { trackId: number; toEmail: string; message?: string };
    if (!trackId || !toEmail?.trim()) return res.status(400).json({ message: "trackId and toEmail are required." });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail.trim())) return res.status(400).json({ message: "Invalid email address." });
    try {
      const [profile, tracks] = await Promise.all([
        storage.getProfileByUserId(userId),
        storage.getGZMusicTracksByUser(userId),
      ]);
      const track = tracks.find((t) => t.id === Number(trackId));
      if (!track) return res.status(404).json({ message: "Track not found or not owned by you." });
      const senderName = profile?.displayName ?? "A GZMusic Artist";
      await sendGZMusicAnnouncement({
        toEmail: toEmail.trim(),
        senderName,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackGenre: track.genre,
        coverUrl: track.coverUrl,
        fileUrl: (track as any).fileUrl,
        downloadEnabled: !!(track as any).downloadEnabled,
        message: message?.trim() || null,
      });
      return res.json({ ok: true, sent: 1 });
    } catch (err) {
      console.error("[gz-music/announce/single]", err);
      return res.status(500).json({ message: "Failed to send announcement." });
    }
  });

  // GZMusic — announce track to full mailing list
  app.post("/api/gz-music/announce/mailing-list", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    const { trackId, message } = req.body as { trackId: number; message?: string };
    if (!trackId) return res.status(400).json({ message: "trackId is required." });
    try {
      const [profile, tracks, audience] = await Promise.all([
        storage.getProfileByUserId(userId),
        storage.getGZMusicTracksByUser(userId),
        storage.getMarketerAudience(userId),
      ]);
      const track = tracks.find((t) => t.id === Number(trackId));
      if (!track) return res.status(404).json({ message: "Track not found or not owned by you." });
      const senderName = profile?.displayName ?? "A GZMusic Artist";
      const withEmail = audience.filter((m) => m.leadEmail?.includes("@"));
      if (withEmail.length === 0) return res.json({ ok: true, sent: 0, message: "No subscribers with email addresses." });
      let sent = 0;
      await Promise.all(withEmail.map(async (m) => {
        try {
          await sendGZMusicAnnouncement({
            toEmail: m.leadEmail,
            senderName,
            trackTitle: track.title,
            trackArtist: track.artist,
            trackGenre: track.genre,
            coverUrl: track.coverUrl,
            fileUrl: (track as any).fileUrl,
            downloadEnabled: !!(track as any).downloadEnabled,
            message: message?.trim() || null,
          });
          sent++;
        } catch { /* silent */ }
      }));
      return res.json({ ok: true, sent, total: withEmail.length });
    } catch (err) {
      console.error("[gz-music/announce/mailing-list]", err);
      return res.status(500).json({ message: "Failed to send to mailing list." });
    }
  });

  // GZMusic — subscriber count for current user
  app.get("/api/gz-music/announce/subscriber-count", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId;
    try {
      const count = await storage.getMarketerAudienceCount(userId);
      return res.json({ count });
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // GZLibrary search — returns tracks shared to library for the music picker
  app.get("/api/gz-music/library", async (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    try {
      const tracks = await storage.getGZLibraryTracks(q);
      return res.json(tracks);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/gz-music/tracks/by-user/:userId", async (req, res) => {
    const uid = parseInt(req.params.userId);
    if (isNaN(uid)) return res.json([]);
    try {
      const tracks = await storage.getGZMusicTracksByUser(uid);
      return res.json(Array.isArray(tracks) ? tracks : []);
    } catch (err) {
      console.error(err);
      return res.json([]);
    }
  });

  app.get("/api/gz-music/tracks", async (req, res) => {
    try {
      const tracks = await storage.getGZ100();
      return res.json(tracks);
    } catch (err) {
      console.error("[gz-music/tracks]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/gz-music/likes/batch", async (req, res) => {
    const userId = (req.session as any)?.userId;
    const ids = String(req.query.ids ?? "").split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
    if (!userId || !ids.length) return res.json({});
    const result = await storage.getGZMusicLikesBatch(ids, userId);
    return res.json(result);
  });

  // GZMusic — batch fetch user's ratings
  app.get("/api/gz-music/ratings/batch", async (req, res) => {
    const userId = (req.session as any)?.userId;
    const ids = String(req.query.ids ?? "").split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
    if (!userId || !ids.length) return res.json({});
    const result = await storage.getGZMusicRatingsBatch(userId, ids);
    return res.json(result);
  });

  // GZMusic — rate a track
  app.post("/api/gz-music/tracks/:id/rate", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const trackId = parseInt(req.params.id);
    if (isNaN(trackId)) return res.status(400).json({ message: "Invalid track id" });
    const stars = Number(req.body?.stars);
    if (!stars || stars < 0.5 || stars > 6.0 || (stars * 2) % 1 !== 0) {
      return res.status(400).json({ message: "stars must be 0.5–6.0 in 0.5 increments" });
    }
    const userId = (req.session as any).userId;
    try {
      const result = await storage.rateGZMusicTrack(userId, trackId, stars);
      return res.json(result);
    } catch (err) {
      console.error("[gz-music/rate]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/gz-music/tracks/:id/like", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const trackId = parseInt(req.params.id);
    if (isNaN(trackId)) return res.status(400).json({ message: "Invalid track id" });
    const userId = (req.session as any).userId;
    try {
      const result = await storage.toggleGZMusicLike(trackId, userId);
      return res.json(result);
    } catch (err) {
      console.error("[gz-music/like]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/gz-music/tracks", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, artist, genre, coverUrl, audioUrl } = req.body;
    if (!title?.trim() || !artist?.trim()) return res.status(400).json({ message: "title and artist are required" });
    const userId = (req.session as any).userId;
    try {
      const track = await storage.createGZMusicTrack({ title: title.trim(), artist: artist.trim(), genre: genre?.trim() ?? "", coverUrl: coverUrl ?? null, audioUrl: audioUrl ?? null, submittedBy: userId, likeCount: 0, status: "active" });
      return res.status(201).json(track);
    } catch (err) {
      console.error("[gz-music/create]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/gz-music/tracks/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteGZMusicTrack(id);
    return res.json({ message: "Deleted" });
  });

  // GZMusic — play count (fire-and-forget, no auth needed)
  app.post("/api/gz-music/tracks/:id/play", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      await storage.incrementGZMusicPlayCount(id);
      return res.json({ message: "ok" });
    } catch (err) {
      console.error("[gz-music/play]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // GZMusic — comments
  app.get("/api/gz-music/tracks/:id/comments", async (req, res) => {
    const trackId = parseInt(req.params.id);
    if (isNaN(trackId)) return res.status(400).json({ message: "Invalid id" });
    try {
      const comments = await storage.getGZMusicComments(trackId);
      return res.json(comments);
    } catch (err) {
      console.error("[gz-music/comments/get]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/gz-music/tracks/:id/comments", async (req, res) => {
    const userId = (req.session as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Login required to comment" });
    const trackId = parseInt(req.params.id);
    if (isNaN(trackId)) return res.status(400).json({ message: "Invalid id" });
    const content = (req.body.content ?? "").trim();
    if (!content) return res.status(400).json({ message: "Comment cannot be empty" });
    if (content.length > 500) return res.status(400).json({ message: "Comment too long (max 500 chars)" });
    try {
      const comment = await storage.createGZMusicComment(trackId, userId, content);
      return res.status(201).json(comment);
    } catch (err) {
      console.error("[gz-music/comments/post]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/gz-music/comments/:id", async (req, res) => {
    const userId = (req.session as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const role = (req.session as any).role as string | undefined;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(role ?? "");
    try {
      await storage.deleteGZMusicComment(id, userId, isAdmin);
      return res.json({ message: "Deleted" });
    } catch (err) {
      console.error("[gz-music/comments/delete]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ─── GZGroups ────────────────────────────────────────────────────────────────

  app.get("/api/groups/invites", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try { return res.json(await storage.getPendingGroupInvites(userId)); } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/search-users", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const q = String(req.query.q ?? "").trim();
    const groupId = parseInt(String(req.query.groupId ?? "0"));
    if (!q || q.length < 2) return res.json([]);
    try { return res.json(await storage.searchUsersForInvite(q, groupId)); } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/featured", async (req, res) => {
    try { return res.json(await storage.getFeaturedGroups(3)); } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    try { return res.json(await storage.getMyGroups(userId)); } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { name, description, coverUrl, isPrivate } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    try { return res.status(201).json(await storage.createGroup({ name: name.trim(), description, coverUrl, isPrivate }, userId)); }
    catch (e: any) { console.error("[createGroup error]", e?.message, e?.stack?.split("\n")[1]); return res.status(500).json({ message: e?.message ?? "Server error" }); }
  });

  app.get("/api/groups/:id", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      const group = await storage.getGroupById(id, userId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.isPrivate && !group.myRole) return res.status(403).json({ message: "Private group" });
      return res.json(group);
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { return res.json(await storage.updateGroup(id, req.body)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { await storage.deleteGroup(id); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupMembers(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/invite", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { inviteeUserId } = req.body;
    if (!inviteeUserId) return res.status(400).json({ message: "inviteeUserId required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
      const result = await storage.inviteToGroup(id, inviteeUserId, userId);
      // Send in-app notification to invited user
      try {
        const group = await storage.getGroupById(id);
        const inviterProfile = await storage.getProviderProfile(userId);
        const inviterName = inviterProfile?.displayName ?? "Someone";
        const groupName = group?.name ?? "a group";
        await storage.createNotification(
          inviteeUserId,
          "group_invite",
          `You've been invited to ${groupName}`,
          `${inviterName} invited you to join ${groupName}. Go to Groups to accept.`,
          `/groups/${id}`
        );
      } catch (_) {}
      return res.status(201).json(result);
    }
    catch (e: any) { return res.status(400).json({ message: e.message }); }
  });

  // POST /api/groups/:id/invite/email — invite a non-registered user by email
  app.post("/api/groups/:id/invite/email", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { email } = req.body;
    if (!email || !email.includes("@")) return res.status(400).json({ message: "Valid email required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
      const group = await storage.getGroupById(id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const inviterProfile = await storage.getProviderProfile(userId);
      const inviterName = inviterProfile?.displayName ?? "A Gigzito member";
      // Check if user already registered
      const existingUser = await storage.getUserByEmail(email);
      const token = randomBytes(32).toString("hex");
      const APP_URL = process.env.APP_URL || "https://gigzito.com";
      if (existingUser) {
        // Invite them directly by userId and send a notification
        try { await storage.inviteToGroup(id, existingUser.id, userId); } catch (_) {}
        await storage.createNotification(
          existingUser.id,
          "group_invite",
          `You've been invited to ${group.name}`,
          `${inviterName} invited you to join ${group.name}. Go to Groups to accept.`,
          `/groups/${id}`
        );
        await sendGroupInviteEmail({ toEmail: email, groupName: group.name, inviterName, joinUrl: `${APP_URL}/groups/${id}`, isNewUser: false });
        return res.json({ ok: true, registered: true });
      } else {
        // Create email invite record
        await storage.createGroupEmailInvite(id, email.toLowerCase(), userId, token, group.name, inviterName);
        const joinUrl = `${APP_URL}/join-group/${token}`;
        await sendGroupInviteEmail({ toEmail: email, groupName: group.name, inviterName, joinUrl, isNewUser: true });
        return res.json({ ok: true, registered: false });
      }
    } catch (e: any) {
      console.error("[group invite/email]", e);
      return res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // GET /api/groups/join/:token — get info about an email invite token
  app.get("/api/groups/join/:token", async (req, res) => {
    const invite = await storage.getGroupEmailInviteByToken(req.params.token);
    if (!invite || invite.expiresAt < new Date()) return res.status(404).json({ message: "Invite not found or expired" });
    if (invite.claimedBy) return res.status(410).json({ message: "Invite already claimed" });
    return res.json({ groupId: invite.groupId, groupName: invite.groupName, inviterName: invite.inviterName, email: invite.email });
  });

  // POST /api/groups/join/:token — claim an email invite (must be logged in)
  app.post("/api/groups/join/:token", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Login required" });
    try {
      const invite = await storage.claimGroupEmailInvite(req.params.token, userId);
      if (!invite) return res.status(410).json({ message: "Invite not found, expired, or already claimed" });
      // Add user directly to group as accepted member
      try { await storage.inviteToGroup(invite.groupId, userId, invite.invitedBy); } catch (_) {}
      try { await storage.respondToGroupInvite(invite.groupId, userId, true); } catch (_) {}
      return res.json({ ok: true, groupId: invite.groupId, groupName: invite.groupName });
    } catch (e) {
      return res.status(500).json({ message: "Failed to claim invite" });
    }
  });

  app.post("/api/groups/:id/invite/respond", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { accept } = req.body;
    try { await storage.respondToGroupInvite(id, userId, !!accept); return res.json({ message: "Done" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/join-request", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { message } = req.body as { message?: string };
    if (!message || message.trim().length < 50) {
      return res.status(400).json({ message: "Please provide at least 50 characters describing why you want to join." });
    }
    try {
      const group = await storage.getGroupById(id, userId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.myStatus === "accepted") return res.status(409).json({ message: "Already a member" });
      if (group.myStatus === "pending") return res.status(409).json({ message: "Request already sent" });
      const user = await storage.getUserById(userId);
      const senderName = (user as any)?.email || "A user";
      const trimmedMsg = message.trim();
      await storage.createNotification(
        group.createdBy,
        "join_request",
        `Membership request for "${group.name}"`,
        `${senderName} wants to join your group "${group.name}".\n\nTheir message:\n"${trimmedMsg}"\n\nVisit your group to review and invite them.`,
        `/groups/${id}`,
      );
      return res.json({ message: "Request sent" });
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/members/:uid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const uid = parseInt(req.params.uid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { await storage.removeGroupMember(id, uid); return res.json({ message: "Removed" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/:id/wall", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupWallPosts(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/wall", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.status(201).json(await storage.createGroupWallPost(id, userId, content.trim())); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/wall/:postId", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const postId = parseInt(req.params.postId);
    const mem = await storage.getUserGroupRole(id, userId);
    const isAdmin = mem?.role === "admin";
    try { await storage.deleteGroupWallPost(postId, userId, isAdmin); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/:id/wall/:postId/comments", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const postId = parseInt(req.params.postId);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupWallComments(postId)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/wall/:postId/comments", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.status(201).json(await storage.createGroupWallComment(postId, userId, content.trim())); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/wall/:postId/comments/:commentId", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    const mem = await storage.getUserGroupRole(id, userId);
    const isAdmin = mem?.role === "admin";
    try { await storage.deleteGroupWallComment(commentId, userId, isAdmin); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/:id/endeavors", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupEndeavors(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/endeavors", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { return res.status(201).json(await storage.createGroupEndeavor(id, { title: title.trim(), description })); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/groups/:id/endeavors/:eid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const eid = parseInt(req.params.eid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
      if (req.body.goalProgress !== undefined) return res.json(await storage.updateGroupEndeavorProgress(eid, req.body.goalProgress));
      return res.json(await storage.updateGroupEndeavor(eid, req.body));
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/endeavors/:eid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { await storage.deleteGroupEndeavor(parseInt(req.params.eid)); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/groups/:id/events", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupEvents(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/events", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const { title, description, startAt, endAt, allDay } = req.body;
    if (!title?.trim() || !startAt) return res.status(400).json({ message: "Title and startAt required" });
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try {
      return res.status(201).json(await storage.createGroupEvent(id, userId, { title: title.trim(), description, startAt: new Date(startAt), endAt: endAt ? new Date(endAt) : undefined, allDay }));
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/groups/:id/events/:eid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const eid = parseInt(req.params.eid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try {
      const data: any = { ...req.body };
      if (data.startAt) data.startAt = new Date(data.startAt);
      if (data.endAt) data.endAt = new Date(data.endAt);
      return res.json(await storage.updateGroupEvent(eid, data));
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/events/:eid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { await storage.deleteGroupEvent(parseInt(req.params.eid)); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // ─── GZGroups Kanban ───────────────────────────────────────────────────────

  app.get("/api/groups/:id/kanban", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupKanbanCards(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/kanban", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    const { title, description, status, priority, deadline, assignedTo, impactLevel, effortLevel } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });
    try { return res.status(201).json(await storage.createGroupKanbanCard(id, userId, { title: title.trim(), description, status, priority, deadline, assignedTo, impactLevel, effortLevel })); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/groups/:id/kanban/:cid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    const { title, description, status, priority, deadline, assignedTo, impactLevel, effortLevel } = req.body;
    try { return res.json(await storage.updateGroupKanbanCard(parseInt(req.params.cid), { title, description, status, priority, deadline, assignedTo, impactLevel, effortLevel })); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/kanban/:cid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { await storage.deleteGroupKanbanCard(parseInt(req.params.cid)); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // ─── GZGroups Retrospectives ───────────────────────────────────────────────
  app.get("/api/groups/:id/retrospectives", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupRetrospectives(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/retrospectives", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    const { win, roadblock } = req.body;
    if (!win?.trim() || !roadblock?.trim()) return res.status(400).json({ message: "Win and roadblock required" });
    try {
      const profile = await storage.getProfileByUserId(userId);
      return res.status(201).json(await storage.createGroupRetrospective(id, userId, profile?.displayName ?? null, profile?.avatarUrl ?? null, { win: win.trim(), roadblock: roadblock.trim() }));
    } catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // Group Wallets
  app.get("/api/groups/:id/wallets", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getGroupWallets(id)); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/wallets", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted" || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { label, network, address, link } = req.body;
    if (!label || !network || !address) return res.status(400).json({ message: "label, network, address required" });
    try { return res.json(await storage.createGroupWallet(id, userId, { label, network, address, link })); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/groups/:id/wallets/:wid", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted" || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try { await storage.deleteGroupWallet(parseInt(req.params.wid)); return res.json({ message: "Deleted" }); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // Wallet Contributions
  app.get("/api/groups/:id/wallets/:wid/contributions", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    try { return res.json(await storage.getWalletContributions(parseInt(req.params.wid))); }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/groups/:id/wallets/:wid/contributions", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const wid = parseInt(req.params.wid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });
    const { amount, currency, txHash, note } = req.body;
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ message: "Valid amount required" });
    const profile = await storage.getProviderProfileByUserId(userId).catch(() => null);
    const displayName = (profile as any)?.displayName ?? null;
    const avatarUrl = (profile as any)?.avatarUrl ?? null;

    // Attempt on-chain verification for ETH-based tx hashes
    let verified = false;
    if (txHash && txHash.startsWith("0x") && txHash.length >= 60) {
      try {
        const wallets = await storage.getGroupWallets(id);
        const wallet = wallets.find((w) => w.id === wid);
        if (wallet) {
          const apiRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`);
          const apiData = await apiRes.json() as any;
          if (apiData?.result?.to && wallet.address) {
            verified = apiData.result.to.toLowerCase() === wallet.address.toLowerCase();
          }
        }
      } catch (_) { /* verification failed silently */ }
    }

    try {
      return res.json(await storage.createWalletContribution(wid, id, userId, displayName, {
        amount: Number(amount), currency: currency ?? "USD", txHash, note, avatarUrl, verified
      }));
    }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  app.put("/api/groups/:id/wallets/:wid/goal", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const wid = parseInt(req.params.wid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { goalAmount, goalCurrency, goalLabel } = req.body;
    try {
      await storage.setWalletGoal(wid, {
        goalAmount: goalAmount ? Number(goalAmount) : null,
        goalCurrency: goalCurrency || null,
        goalLabel: goalLabel || null,
      });
      return res.json({ ok: true });
    }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // ── Live on-chain balance ────────────────────────────────────────────────
  const _balanceCache = new Map<number, { balance: number; currency: string; cachedAt: number; unsupported?: boolean }>();
  const _CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const EVM_RPCS: Record<string, string> = {
    ETH:  "https://eth.llamarpc.com",
    MATIC:"https://polygon-rpc.com",
    BNB:  "https://bsc-dataseed.binance.org/",
    AVAX: "https://api.avax.network/ext/bc/C/rpc",
    ARB:  "https://arb1.arbitrum.io/rpc",
    OP:   "https://mainnet.optimism.io",
    BASE: "https://mainnet.base.org",
  };

  async function fetchOnChainBalance(network: string, address: string): Promise<{ balance: number; currency: string; unsupported?: boolean }> {
    // EVM chains — native token balance
    if (EVM_RPCS[network]) {
      const rpc = EVM_RPCS[network];
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] });
      const r = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(8000) });
      const d = await r.json() as any;
      const weiHex = d?.result as string;
      if (!weiHex) throw new Error("No result from RPC");
      const wei = BigInt(weiHex);
      const balance = Number(wei) / 1e18;
      const nativeCurrency: Record<string, string> = { ETH: "ETH", MATIC: "MATIC", BNB: "BNB", AVAX: "AVAX", ARB: "ETH", OP: "ETH", BASE: "ETH" };
      return { balance, currency: nativeCurrency[network] ?? network };
    }
    // Bitcoin via Blockstream
    if (network === "BTC") {
      const r = await fetch(`https://blockstream.info/api/address/${address}`, { signal: AbortSignal.timeout(8000) });
      const d = await r.json() as any;
      const funded = (d?.chain_stats?.funded_txo_sum ?? 0) + (d?.mempool_stats?.funded_txo_sum ?? 0);
      const spent  = (d?.chain_stats?.spent_txo_sum  ?? 0) + (d?.mempool_stats?.spent_txo_sum  ?? 0);
      return { balance: (funded - spent) / 1e8, currency: "BTC" };
    }
    // Solana via public RPC
    if (network === "SOL") {
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] });
      const r = await fetch("https://api.mainnet-beta.solana.com", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(8000) });
      const d = await r.json() as any;
      const lamports = d?.result?.value ?? 0;
      return { balance: lamports / 1e9, currency: "SOL" };
    }
    // USDC / USDT — ERC-20 on Ethereum, balanceOf via eth_call
    if (network === "USDC" || network === "USDT") {
      const tokenContracts: Record<string, string> = {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      };
      const contract = tokenContracts[network];
      const paddedAddr = address.replace("0x", "").padStart(64, "0");
      const data = `0x70a08231000000000000000000000000${paddedAddr}`;
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data }, "latest"] });
      const r = await fetch("https://eth.llamarpc.com", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(8000) });
      const d = await r.json() as any;
      const hex = d?.result as string;
      if (!hex || hex === "0x") return { balance: 0, currency: network };
      const raw = BigInt(hex);
      return { balance: Number(raw) / 1e6, currency: network }; // USDC/USDT use 6 decimals
    }
    return { balance: 0, currency: network, unsupported: true };
  }

  app.get("/api/groups/:id/wallets/:wid/balance", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id  = parseInt(req.params.id);
    const wid = parseInt(req.params.wid);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.status !== "accepted") return res.status(403).json({ message: "Members only" });

    const cached = _balanceCache.get(wid);
    if (cached && Date.now() - cached.cachedAt < _CACHE_TTL) {
      return res.json({ ...cached, cached: true, nextRefreshAt: new Date(cached.cachedAt + _CACHE_TTL).toISOString() });
    }

    const wallets = await storage.getGroupWallets(id);
    const wallet = wallets.find((w) => w.id === wid);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    try {
      const result = await fetchOnChainBalance(wallet.network, wallet.address);
      const entry = { ...result, cachedAt: Date.now() };
      _balanceCache.set(wid, entry);
      return res.json({ ...entry, cached: false, nextRefreshAt: new Date(entry.cachedAt + _CACHE_TTL).toISOString() });
    } catch (e: any) {
      return res.status(502).json({ message: "Balance fetch failed", detail: e?.message ?? "unknown" });
    }
  });

  app.patch("/api/groups/:id/wallets/:wid/contributions/:cid/verify", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    const mem = await storage.getUserGroupRole(id, userId);
    if (!mem || mem.role !== "admin") return res.status(403).json({ message: "Admins only" });
    try {
      await storage.verifyContribution(parseInt(req.params.cid));
      return res.json({ ok: true });
    }
    catch (e) { return res.status(500).json({ message: "Server error" }); }
  });

  // Self-service tier selection (Brand Build promo — all tiers free)
  app.post("/api/user/set-tier", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { tier } = req.body;
    const validTiers = ["GZLurker", "GZGroups", "GZMarketer", "GZMarketerPro", "GZBusiness"];
    if (!validTiers.includes(tier)) return res.status(400).json({ message: "Invalid tier" });
    await storage.updateSubscriptionTier(userId, tier);
    (req.session as any).subscriptionTier = tier;
    return res.json({ ok: true, tier });
  });

  // ── GZ BANDS ─────────────────────────────────────────────────────────────────

  // Generic image upload — used by band enrollment form for avatar / banner
  app.post("/api/upload-image", upload.single("file"), async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const layer1 = inspectFileSync(req.file.path, req.file.mimetype);
    if (!layer1.pass) { destroyContraband(req.file.path, layer1.reason!); return res.status(422).json({ message: layer1.reason }); }
    const layer2 = await roccoScan(req.file.path, req.file.mimetype);
    if (!layer2.pass) { destroyContraband(req.file.path, layer2.reason!); return res.status(422).json({ message: layer2.reason }); }
    moveToFinalDest(req.file.path, path.join(process.cwd(), "uploads"), req.file.filename);
    return res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });

  app.get("/api/bands", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    return res.json(await storage.listGzBands(userId));
  });

  app.post("/api/bands", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const { name, slug, bio, genre, city, state, websiteUrl, instagramUrl, tiktokUrl, youtubeUrl, avatarUrl, bannerUrl } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Band name is required" });
    const autoSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const band = await storage.createGzBand({ name, slug: autoSlug, bio: bio ?? "", genre: genre ?? "", city, state, websiteUrl, instagramUrl, tiktokUrl, youtubeUrl, avatarUrl, bannerUrl }, userId);
      return res.status(201).json(band);
    } catch (e: any) {
      if (e?.message?.includes("unique")) return res.status(409).json({ message: "A band with that name/slug already exists" });
      throw e;
    }
  });

  app.get("/api/bands/:id", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const band = await storage.getGzBand(parseInt(req.params.id), userId);
    if (!band) return res.status(404).json({ message: "Band not found" });
    return res.json(band);
  });

  const updateBandHandler = async (req: any, res: any) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Must be band admin to edit" });
    const { name, bio, genre, city, state, websiteUrl, instagramUrl, tiktokUrl, youtubeUrl, avatarUrl, bannerUrl, liveStreamUrl, bandType, allowGuestPosts } = req.body;
    const updated = await storage.updateGzBand(bandId, { name, bio, genre, city, state, websiteUrl, instagramUrl, tiktokUrl, youtubeUrl, avatarUrl, bannerUrl, liveStreamUrl, bandType, allowGuestPosts: allowGuestPosts === true || allowGuestPosts === "true" });
    return res.json(updated);
  };
  app.put("/api/bands/:id", updateBandHandler);
  app.patch("/api/bands/:id", updateBandHandler);

  app.get("/api/bands/:id/members", async (req, res) => {
    return res.json(await storage.getGzBandMembers(parseInt(req.params.id)));
  });

  app.post("/api/bands/:id/join", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.joinGzBand(bandId, userId, req.body.instrument);
    return res.json(member);
  });

  app.delete("/api/bands/:id/leave", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const band = await storage.getGzBand(bandId);
    if (band?.createdBy === userId) return res.status(400).json({ message: "Band creator cannot leave — transfer ownership first" });
    await storage.leaveGzBand(bandId, userId);
    return res.json({ ok: true });
  });

  // Band wall
  app.get("/api/bands/:id/wall", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    return res.json(await storage.getGzBandWallPosts(parseInt(req.params.id), userId));
  });

  app.post("/api/bands/:id/wall", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const bandId = parseInt(req.params.id);
    const { content, imageUrl, guestName, guestEmail } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });

    if (!userId) {
      const band = await storage.getGzBand(bandId);
      if (!band?.allowGuestPosts) return res.status(403).json({ message: "Sign in to post on this wall" });
      if (!guestName?.trim()) return res.status(400).json({ message: "Name is required for guest posts" });
      const post = await storage.createGzBandWallPost(bandId, null, content, imageUrl, guestName.trim(), guestEmail?.trim());
      return res.status(201).json(post);
    }

    const post = await storage.createGzBandWallPost(bandId, userId, content, imageUrl);
    return res.status(201).json(post);
  });

  app.delete("/api/bands/:id/wall/:postId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member) return res.status(403).json({ message: "Must be a band member" });
    await storage.deleteGzBandWallPost(parseInt(req.params.postId));
    return res.json({ ok: true });
  });

  app.post("/api/bands/:id/wall/:postId/like", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    await storage.likeGzBandWallPost(parseInt(req.params.postId), userId);
    return res.json({ ok: true });
  });

  app.delete("/api/bands/:id/wall/:postId/like", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    await storage.unlikeGzBandWallPost(parseInt(req.params.postId), userId);
    return res.json({ ok: true });
  });

  // Band followers (mailing list)
  app.post("/api/bands/:id/follow", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    const bandId = parseInt(req.params.id);
    const { email, displayName } = req.body;
    if (!userId && !email?.trim()) return res.status(400).json({ message: "Email is required to follow" });
    let followEmail = email?.trim();
    let followName = displayName?.trim();
    if (userId) {
      const user = await storage.getUser(userId);
      followEmail = followEmail || user?.email;
      const profile = await storage.getProviderProfile(userId);
      followName = followName || profile?.displayName || user?.email;
    }
    if (!followEmail) return res.status(400).json({ message: "Email is required" });
    const follow = await storage.followGzBand(bandId, userId ?? null, followEmail, followName);
    return res.status(201).json(follow);
  });

  app.delete("/api/bands/:id/follow", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    await storage.unfollowGzBand(parseInt(req.params.id), userId);
    return res.json({ ok: true });
  });

  app.get("/api/bands/:id/followers", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Admin only" });
    return res.json(await storage.getGzBandFollowers(bandId));
  });

  app.get("/api/bands/:id/wall/:postId/comments", async (req, res) => {
    return res.json(await storage.getGzBandWallComments(parseInt(req.params.postId)));
  });

  app.post("/api/bands/:id/wall/:postId/comments", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });
    const comment = await storage.createGzBandWallComment(parseInt(req.params.postId), userId, content);
    return res.status(201).json(comment);
  });

  // Band events (calendar)
  app.get("/api/bands/:id/events", async (req, res) => {
    return res.json(await storage.getGzBandEvents(parseInt(req.params.id)));
  });

  app.post("/api/bands/:id/events", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member) return res.status(403).json({ message: "Must be a band member to add events" });
    const { title, description, venue, city, startAt, endAt, ticketUrl, type } = req.body;
    if (!title?.trim() || !startAt) return res.status(400).json({ message: "Title and start date required" });
    const event = await storage.createGzBandEvent(bandId, { title, description: description ?? "", venue, city, startAt: new Date(startAt), endAt: endAt ? new Date(endAt) : undefined, ticketUrl, type: type ?? "show" }, userId);
    return res.status(201).json(event);
  });

  app.delete("/api/bands/:id/events/:eid", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const member = await storage.getGzBandMember(parseInt(req.params.id), userId);
    if (!member) return res.status(403).json({ message: "Must be a band member" });
    await storage.deleteGzBandEvent(parseInt(req.params.eid));
    return res.json({ ok: true });
  });

  // Band photos
  app.get("/api/bands/:id/photos", async (req, res) => {
    return res.json(await storage.getGzBandPhotos(parseInt(req.params.id)));
  });

  app.post("/api/bands/:id/photos", upload.single("file"), async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member) return res.status(403).json({ message: "Must be a band member to upload photos" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const layer1 = inspectFileSync(req.file.path, req.file.mimetype);
    if (!layer1.pass) { destroyContraband(req.file.path, layer1.reason!); return res.status(422).json({ message: layer1.reason }); }
    const layer2 = await roccoScan(req.file.path, req.file.mimetype);
    if (!layer2.pass) { destroyContraband(req.file.path, layer2.reason!); return res.status(422).json({ message: layer2.reason }); }
    const filename = req.file.filename;
    moveToFinalDest(req.file.path, path.join(process.cwd(), "uploads"), filename);
    const photo = await storage.addGzBandPhoto(bandId, `/uploads/${filename}`, req.body.caption ?? null, userId);
    return res.status(201).json(photo);
  });

  app.delete("/api/bands/:id/photos/:pid", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const member = await storage.getGzBandMember(parseInt(req.params.id), userId);
    if (!member) return res.status(403).json({ message: "Must be a band member" });
    await storage.deleteGzBandPhoto(parseInt(req.params.pid));
    return res.json({ ok: true });
  });

  // Band Zito TV
  app.get("/api/bands/:id/tv", async (req, res) => {
    return res.json(await storage.getGzBandTvShows(parseInt(req.params.id)));
  });

  app.post("/api/bands/:id/tv", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member) return res.status(403).json({ message: "Must be a band member to add shows" });
    const { title, description, streamUrl, thumbnailUrl, type, scheduledAt, durationSeconds } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });
    const show = await storage.createGzBandTvShow(bandId, { title, description: description ?? "", streamUrl, thumbnailUrl, type: type ?? "archived", scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, durationSeconds });
    return res.status(201).json(show);
  });

  app.delete("/api/bands/:id/tv/:sid", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const member = await storage.getGzBandMember(parseInt(req.params.id), userId);
    if (!member) return res.status(403).json({ message: "Must be a band member" });
    await storage.deleteGzBandTvShow(parseInt(req.params.sid));
    return res.json({ ok: true });
  });

  // Band tracks (Tracks tab)
  app.get("/api/bands/:id/tracks", async (req, res) => {
    return res.json(await storage.getGzBandTracks(parseInt(req.params.id)));
  });

  // Search unclaimed tracks by artist name (admin only)
  app.get("/api/bands/:id/tracks/search", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    const artistName = String(req.query.artist ?? "").trim();
    if (!artistName) return res.json([]);
    return res.json(await storage.searchTracksByArtistForUser(artistName, userId));
  });

  // Claim a track for this band (admin only)
  app.post("/api/bands/:id/claim-track/:trackId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const trackId = parseInt(req.params.trackId);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    try {
      const track = await storage.claimTrackForBand(trackId, bandId, userId);
      res.json(track);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Remove a track from band (unclaim, admin only)
  app.post("/api/bands/:id/unclaim-track/:trackId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const trackId = parseInt(req.params.trackId);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    try {
      const track = await storage.unclaimTrackFromBand(trackId, bandId, userId);
      res.json(track);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Band go-live toggle
  // ── Band Roster ────────────────────────────────────────────────────────────
  app.get("/api/bands/:id/roster", async (req, res) => {
    return res.json(await storage.getGzBandRoster(parseInt(req.params.id)));
  });

  app.post("/api/bands/:id/roster", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    const roster = await storage.getGzBandRoster(bandId);
    if (roster.length >= 8) return res.status(400).json({ message: "Maximum 8 band mates allowed" });
    const { name, thumbUrl, bio, role } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const entry = await storage.addGzBandRosterMember(bandId, { name, thumbUrl: thumbUrl || null, bio: bio || null, role: role || null, sortOrder: roster.length });
    return res.status(201).json(entry);
  });

  app.put("/api/bands/:id/roster/:rid", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    const { name, thumbUrl, bio, role } = req.body;
    const updated = await storage.updateGzBandRosterMember(parseInt(req.params.rid), { name, thumbUrl: thumbUrl ?? null, bio: bio ?? null, role: role ?? null });
    return res.json(updated);
  });

  app.delete("/api/bands/:id/roster/:rid", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Band admin only" });
    await storage.deleteGzBandRosterMember(parseInt(req.params.rid));
    return res.json({ ok: true });
  });

  app.post("/api/bands/:id/live", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const userId = (req.session as any).userId as number;
    const bandId = parseInt(req.params.id);
    const member = await storage.getGzBandMember(bandId, userId);
    if (!member || member.role !== "admin") return res.status(403).json({ message: "Must be band admin" });
    const { isLive, streamUrl } = req.body;
    const band = await storage.setGzBandLive(bandId, !!isLive, streamUrl);
    return res.json(band);
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    return res.json(await storage.getNotifications(userId));
  });

  app.get("/api/notifications/count", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.json({ count: 0 });
    return res.json({ count: await storage.getUnreadNotificationCount(userId) });
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await storage.markNotificationRead(parseInt(req.params.id), userId);
    return res.json({ ok: true });
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await storage.markAllNotificationsRead(userId);
    return res.json({ ok: true });
  });

  return httpServer;
}
