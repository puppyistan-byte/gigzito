import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

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
  if (!req.session?.userId || req.session?.role !== "ADMIN") {
    res.status(401).json({ message: "Admin only" });
    return false;
  }
  return true;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
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

    // Create admin user
    const adminPass = await hashPassword("admin123");
    await storage.createUser({ email: "admin@gigzito.com", password: adminPass, role: "ADMIN" });

    console.log("Database seeded with sample data");
  } catch (err) {
    console.error("Seed error:", err);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  // === AUTH ===
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already registered" });
      const hashed = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashed, role: "PROVIDER" });
      const profile = await storage.createProfile({ userId: user.id, displayName: "", bio: "", avatarUrl: "", thumbUrl: "", contactEmail: null, contactPhone: null, contactTelegram: null, websiteUrl: null, username: null, primaryCategory: null, location: null, instagramUrl: null, youtubeUrl: null, tiktokUrl: null });
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      return res.status(201).json({ user: { ...user, password: undefined }, profile });
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
      const profile = await storage.getProfileByUserId(user.id);
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      return res.json({ user: { ...user, password: undefined }, profile: profile ?? null });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
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
    return res.json(listings);
  });

  app.get(api.listings.list.path, async (req, res) => {
    const vertical = req.query.vertical as string | undefined;
    const listings = await storage.getListings(vertical);
    return res.json(listings);
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

    const todayCount = await storage.getTodayListingCount();
    if (todayCount >= DAILY_CAP) {
      return res.status(429).json({ message: "Daily cap of 100 listings reached. Try again tomorrow.", count: todayCount, max: DAILY_CAP });
    }

    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Provider profile not found" });

    const hasContact = profile.contactEmail || profile.contactPhone || profile.contactTelegram || profile.websiteUrl;
    const isProfileComplete = profile.displayName && profile.bio && profile.avatarUrl && profile.primaryCategory && hasContact;
    if (!isProfileComplete) {
      return res.status(400).json({ message: "Please complete your provider profile before submitting a listing" });
    }

    const schema = z.object({
      vertical: z.enum([
        "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
        "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
        "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS",
      ]),
      title: z.string().min(1).max(200),
      videoUrl: z.string().url(),
      durationSeconds: z.coerce.number().int().min(1).max(20),
      description: z.string().max(1000).optional(),
      tags: z.array(z.string()).max(10).optional(),
      ctaLabel: z.string().max(60).optional(),
      ctaUrl: z.string().url().optional().or(z.literal("")),
      flashSaleEndsAt: z.string().datetime().optional().nullable(),
      couponCode: z.string().max(40).optional().nullable(),
      productPrice: z.string().max(30).optional().nullable(),
      productPurchaseUrl: z.string().url().optional().or(z.literal("")).nullable(),
      productStock: z.string().max(50).optional().nullable(),
    });

    try {
      const data = schema.parse(req.body);
      const listing = await storage.createListing({
        ...data,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        providerId: profile.id,
        dropDate: getTodayDate(),
        pricePaidCents: 300,
      });
      return res.status(201).json({ success: true, listingId: listing.id });
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
    if (!requireAdmin(req, res)) return;
    const count = await storage.getTodayListingCount();
    const revenue = await storage.getTodayRevenue();
    const listings = await storage.getAllListingsWithProviders();
    return res.json({ todayCount: count, todayRevenueCents: revenue, capReached: count >= DAILY_CAP, listings });
  });

  app.patch(api.admin.updateListing.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
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

  return httpServer;
}
