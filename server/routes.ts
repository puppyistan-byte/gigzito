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
import { sendMfaCode, sendTriageNotification, sendVerificationEmail, sendContentDisabledNotification, sendContentDeletedNotification, sendAdInquiryNotification, sendAudienceBroadcast } from "./email";
import fs from "fs";
import path from "path";
import multer from "multer";

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
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

const videoUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "videos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
  },
});
const videoUpload = multer({
  storage: videoUploadStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/ogg", "video/3gpp", "video/mpeg", "video/x-m4v"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
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

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  return true;
}

function requireAdmin(req: any, res: any): boolean {
  if (!req.session?.userId || !["ADMIN", "SUPER_ADMIN"].includes(req.session?.role)) {
    res.status(401).json({ message: "Admin only" });
    return false;
  }
  return true;
}

function requireContentAdmin(req: any, res: any): boolean {
  if (!req.session?.userId || !["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(req.session?.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
}

function requireSuperAdmin(req: any, res: any): boolean {
  if (!req.session?.userId || req.session?.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Super Admin only" });
    return false;
  }
  return true;
}

async function requireGZ2(req: any, res: any): Promise<boolean> {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  const user = await storage.getUserById(req.session.userId);
  const tier = user?.subscriptionTier ?? "GZLurker";
  if (tier === "GZLurker") {
    res.status(403).json({ message: "Upgrade to GZ2 to engage!", upgradeRequired: true });
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
        username: "admin",
        displayName: "Admin",
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
    }
  } catch (err) {
    console.error("ensureAdminUser error:", err);
  }
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
      const { email, password, disclaimerAccepted } = req.body;
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
      const user = await storage.createUser({
        email, password: hashed, role: "PROVIDER", disclaimerAccepted: true,
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
      const emailResult = await sendMfaCode(user.email, code);
      const resp: any = { mfaRequired: true, email: user.email };
      if (emailResult.devMode) resp.devCode = emailResult.previewCode;
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
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  });

  app.post("/api/upload/video", videoUpload.single("file"), async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/videos/${req.file.filename}`;
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Not found" });
    const profile = await storage.getProfileById(id);
    if (!profile) return res.status(404).json({ message: "Provider not found" });
    const user = await storage.getUserById(profile.userId);
    return res.json({ ...profile, user: { ...user, password: undefined } });
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
        "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS",
      ]),
      title: z.string().min(1).max(200),
      videoUrl: z.string().url(),
      durationSeconds: z.coerce.number().int().min(1).max(60),
      description: z.string().max(1000).optional(),
      tags: z.array(z.string()).max(10).optional(),
      ctaLabel: z.string().max(60).optional(),
      ctaUrl: z.string().url().optional().or(z.literal("")),
      ctaType: z.enum(["Visit Offer", "Shop Product", "Join Event", "Book Service", "Join Guild"]).optional().nullable(),
      flashSaleEndsAt: z.string().datetime().optional().nullable(),
      couponCode: z.string().max(40).optional().nullable(),
      productPrice: z.string().max(30).optional().nullable(),
      productPurchaseUrl: z.string().url().optional().or(z.literal("")).nullable(),
      productStock: z.string().max(50).optional().nullable(),
    });

    try {
      const data = schema.parse(req.body);
      const isUploadedVideo = data.videoUrl.startsWith("/uploads/videos/");
      const listing = await storage.createListing({
        ...data,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        ctaType: data.ctaType ?? null,
        providerId: profile.id,
        dropDate: getTodayDate(),
        pricePaidCents: 300,
      });
      // Set scan status + kick off Bif asynchronously for uploaded videos
      if (isUploadedVideo) {
        await storage.updateScanStatus(listing.id, "SCANNING", null);
        callBif(listing.id, data.videoUrl, userId).catch((err) => {
          console.error("[Bif] async call failed:", err);
        });
      }
      return res.status(201).json({ success: true, listingId: listing.id, scanStatus: isUploadedVideo ? "SCANNING" : "CLEAN" });
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

  // === BIF SCAN ROUTES ===
  // Bif webhook callback — called by the Ashburn VPS bot after scanning
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
    const schema = z.object({
      videoId: z.coerce.number().int().positive(),
      creatorUserId: z.coerce.number().int().positive(),
      firstName: z.string().min(1).max(60),
      email: z.string().email().optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      message: z.string().max(500).optional().nullable(),
      videoTitle: z.string().max(200).optional().nullable(),
      category: z.string().max(50).optional().nullable(),
      viewerUsername: z.string().max(80).optional().nullable(),
    });
    try {
      const data = schema.parse(req.body);
      // If no viewerUsername provided but session is active, auto-resolve from profile
      let viewerUsername = data.viewerUsername ?? null;
      if (!viewerUsername && req.session?.userId) {
        const vProfile = await storage.getProfileByUserId(req.session.userId);
        viewerUsername = vProfile?.username ?? null;
      }
      // Geo lookup from IP
      let viewerCity: string | null = null;
      let viewerState: string | null = null;
      let viewerCountry: string | null = null;
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
      if (data.email) {
        storage.upsertMarketerAudience({
          providerUserId: data.creatorUserId,
          leadName: data.firstName,
          leadEmail: data.email,
          leadPhone: data.phone ?? null,
          sourceListingId: data.videoId,
        }).catch((err) => console.warn("Audience upsert failed:", err.message));
      }
      // Fire webhook if the creator has one configured
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
      return res.status(201).json({ success: true, leadId: lead.id });
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

  // Public Rolodex feed — filtered by ageBracket, gender, intent
  app.get("/api/gigness-cards", async (req, res) => {
    const { ageBracket, gender, intent } = req.query as Record<string, string>;
    const cards = await storage.getPublicGignessCards({
      ageBracket: ageBracket || undefined,
      gender: gender || undefined,
      intent: intent || undefined,
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
      profilePic: z.string().url().nullable().optional(),
      gallery: z.array(z.string().url()).max(6).optional(),
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
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Engage (requires GZ2+) — increments engagement count
  app.post("/api/gigness-cards/:id/engage", async (req, res) => {
    if (!await requireGZ2(req, res)) return;
    const cardId = parseInt(req.params.id);
    if (isNaN(cardId)) return res.status(400).json({ message: "Invalid card id" });
    await storage.incrementGignessEngagement(cardId);
    return res.json({ success: true });
  });

  // Send message or emoji (requires GZ2+) with GZ-Bot scrub
  app.post("/api/gigness-cards/:id/message", async (req, res) => {
    if (!await requireGZ2(req, res)) return;
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
      const { commentText, authorName } = schema.parse(req.body);
      const card = await storage.getGignessCardById(cardId);
      if (!card) return res.status(404).json({ message: "Card not found" });

      const scrub = await gzBotScrub(commentText);
      if (!scrub.clean) {
        return res.status(400).json({ message: "GZ-Bot flagged your comment. Keep it respectful and on-topic." });
      }

      const comment = await storage.createGignessComment({
        cardId,
        authorUserId,
        authorName: authorName?.trim() || "Anonymous",
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
      authorName: z.string().max(60).optional(),
      viewerEmail: z.string().email().optional().or(z.literal("")),
    });
    try {
      const { commentText, authorName, viewerEmail } = schema.parse(req.body);
      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      // Resolve display name: prefer passed authorName, then provider profile, then user email prefix
      let resolvedAuthorName = authorName?.trim() || "";
      let viewerUsername: string | null = null;
      const profile = await storage.getProfileByUserId(authorUserId);
      if (profile?.username) viewerUsername = profile.username;
      if (!resolvedAuthorName) {
        if (profile?.displayName) resolvedAuthorName = profile.displayName;
        else {
          const user = await storage.getUserById(authorUserId);
          resolvedAuthorName = user?.email?.split("@")[0] || "Anonymous";
        }
      }
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
    const profile = await storage.getProfileById(userId);
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
      return res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
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
      artworkUrl: z.string().url(),
      offerTitle: z.string().min(5).max(120),
      ctaLink: z.string().url(),
      scheduledAt: z.string().datetime({ message: "A valid date and time is required" }),
      tagline: z.string().max(120).optional().nullable(),
      category: z.string().max(60).optional().nullable(),
      flashDurationSeconds: z.coerce.number().int().min(5).max(60).optional().nullable(),
      offerDurationMinutes: z.coerce.number().int().min(10).max(1440).optional().nullable(),
      companyUrl: z.string().url().optional().or(z.literal("")),
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
    const validRoles = ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "ADMIN", "COORDINATOR"];
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

  app.delete("/api/admin/listings/:id", async (req, res) => {
    if (!requireContentAdmin(req, res)) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { reason, sendEmail } = req.body ?? {};
    // Look up listing before deleting so we can send the notification
    let contactEmail: string | null = null;
    let displayName = "Provider";
    let listingTitle = "Your listing";
    if (sendEmail && reason) {
      try {
        const fullListing = await storage.getListingById(id);
        if (fullListing) {
          listingTitle = fullListing.title;
          contactEmail = fullListing.provider?.contactEmail ?? null;
          displayName = fullListing.provider?.displayName || "Provider";
        }
      } catch {}
    }
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
    const VALID_TIERS = ["GZLurker", "GZ2", "GZ_PLUS", "GZ_PRO"];
    if (!VALID_TIERS.includes(tier)) return res.status(400).json({ message: "Invalid tier. Must be one of: " + VALID_TIERS.join(", ") });
    await storage.updateSubscriptionTier(id, tier);
    const actorUserId = (req.session as any).userId;
    await storage.createAuditLog({ actorUserId, actionType: "SUBSCRIPTION_TIER_CHANGE", targetType: "USER", targetId: id, usedOverride: false });
    return res.json({ success: true, userId: id, tier });
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
        const adsDir = path.join(process.cwd(), "client", "public", "ads");
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

  app.patch("/api/listings/comments/:id/read", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.markListingCommentRead(parseInt(req.params.id));
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
  });

  app.patch("/api/gigness-cards/messages/:id/read", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      await storage.markCardMessageRead(parseInt(req.params.id));
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ message: "Failed" }); }
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

  return httpServer;
}
