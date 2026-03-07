import { db } from "./db";
import { users, providerProfiles, videoListings, gigJacks, leads, liveSessions, type User, type InsertUser, type ProviderProfile, type InsertProfile, type VideoListing, type ListingWithProvider, type UpdateProfileRequest, type CreateListingRequest, type GigJack, type GigJackWithProvider, type CreateGigJackRequest, type GigJackSlot, type Lead, type CreateLeadRequest, type LiveSession, type LiveSessionWithProvider, type CreateLiveSessionRequest, type UserWithProfile } from "@shared/schema";
import { eq, and, sql, inArray, ne, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;

  // Profiles
  getProfileByUserId(userId: number): Promise<ProviderProfile | undefined>;
  getProfileById(id: number): Promise<ProviderProfile | undefined>;
  createProfile(data: InsertProfile): Promise<ProviderProfile>;
  updateProfile(userId: number, data: UpdateProfileRequest): Promise<ProviderProfile>;

  // Listings
  getListings(vertical?: string): Promise<ListingWithProvider[]>;
  getListingById(id: number): Promise<ListingWithProvider | undefined>;
  getListingsByProvider(providerId: number): Promise<ListingWithProvider[]>;
  createListing(data: CreateListingRequest & { providerId: number; dropDate: string; pricePaidCents: number }): Promise<VideoListing>;
  updateListingStatus(id: number, status: "ACTIVE" | "PAUSED" | "REMOVED"): Promise<VideoListing | undefined>;

  // Daily cap
  getTodayListingCount(): Promise<number>;

  // Admin
  getAllListingsWithProviders(): Promise<ListingWithProvider[]>;
  getTodayRevenue(): Promise<number>;
  getAllUsers(): Promise<UserWithProfile[]>;
  updateUserStatus(id: number, status: "active" | "disabled"): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  deleteListing(id: number): Promise<void>;

  // Leads
  createLead(data: CreateLeadRequest): Promise<Lead>;
  getLeadsByProvider(creatorUserId: number): Promise<Lead[]>;

  // Live Sessions
  createLiveSession(data: CreateLiveSessionRequest & { creatorUserId: number; providerId: number; platform?: string }): Promise<LiveSession>;
  getActiveLiveSessions(): Promise<LiveSessionWithProvider[]>;
  getLiveSessionById(id: number): Promise<LiveSessionWithProvider | undefined>;
  endLiveSession(id: number): Promise<void>;

  // GigJacks
  createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null; initialStatus?: string; bookedDate?: string; bookedHour?: number }): Promise<GigJack>;
  getGigJacksByProvider(providerId: number): Promise<GigJackWithProvider[]>;
  getAllPendingGigJacks(): Promise<GigJackWithProvider[]>;
  getAllGigJacks(): Promise<GigJackWithProvider[]>;
  reviewGigJack(id: number, status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT", reviewNote?: string, approvedBy?: number): Promise<{ gj: GigJack | undefined; error?: string }>;
  getActiveGigJack(): Promise<GigJackWithProvider | null>;
  getAvailableSlots(): Promise<GigJackSlot[]>;
  getSlotAvailability(date: string): Promise<import("@shared/schema").HourSlot[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getProfileByUserId(userId: number): Promise<ProviderProfile | undefined> {
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId));
    return profile;
  }

  async getProfileById(id: number): Promise<ProviderProfile | undefined> {
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.id, id));
    return profile;
  }

  async createProfile(data: InsertProfile): Promise<ProviderProfile> {
    const [profile] = await db.insert(providerProfiles).values(data).returning();
    return profile;
  }

  async updateProfile(userId: number, data: UpdateProfileRequest): Promise<ProviderProfile> {
    const [profile] = await db
      .update(providerProfiles)
      .set(data)
      .where(eq(providerProfiles.userId, userId))
      .returning();
    return profile;
  }

  private async enrichListings(rows: VideoListing[]): Promise<ListingWithProvider[]> {
    if (rows.length === 0) return [];
    const providerIds = [...new Set(rows.map((r) => r.providerId))];
    const profiles = await db.select().from(providerProfiles).where(inArray(providerProfiles.id, providerIds));
    const userIds = [...new Set(profiles.map((p) => p.userId))];
    const userRows = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const profileMap = new Map(
      profiles.map((p) => [p.id, { ...p, user: userMap.get(p.userId)! }])
    );
    return rows.map((listing) => ({
      ...listing,
      provider: profileMap.get(listing.providerId)!,
    }));
  }

  private async enrichGigJacks(rows: GigJack[]): Promise<GigJackWithProvider[]> {
    if (rows.length === 0) return [];
    const providerIds = [...new Set(rows.map((r) => r.providerId))];
    const profiles = await db.select().from(providerProfiles).where(inArray(providerProfiles.id, providerIds));
    const userIds = [...new Set(profiles.map((p) => p.userId))];
    const userRows = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const profileMap = new Map(
      profiles.map((p) => [p.id, { ...p, user: userMap.get(p.userId)! }])
    );
    return rows.map((gj) => ({
      ...gj,
      provider: profileMap.get(gj.providerId)!,
    }));
  }

  async getListings(vertical?: string): Promise<ListingWithProvider[]> {
    const DB_VERTICALS = new Set([
      "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
      "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
      "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS",
    ]);
    const FRONTEND_MAP: Record<string, string> = {
      GIG_BLITZ:    "MUSIC_GIGS",
      FLASH_COUPONS: "FLASH_COUPON",
      INFLUENCERS:  "INFLUENCER",
    };

    let rows: VideoListing[];
    if (vertical && vertical !== "ALL") {
      const dbVertical = FRONTEND_MAP[vertical] ?? vertical;
      if (!DB_VERTICALS.has(dbVertical)) return [];
      rows = await db
        .select()
        .from(videoListings)
        .where(and(eq(videoListings.status, "ACTIVE"), eq(videoListings.vertical, dbVertical as any)))
        .orderBy(sql`${videoListings.createdAt} DESC`);
    } else {
      rows = await db
        .select()
        .from(videoListings)
        .where(eq(videoListings.status, "ACTIVE"))
        .orderBy(
          sql`CASE WHEN ${videoListings.vertical} = 'FLASH_SALE' THEN 0 ELSE 1 END`,
          sql`${videoListings.createdAt} DESC`
        );
    }
    return this.enrichListings(rows);
  }

  async getListingById(id: number): Promise<ListingWithProvider | undefined> {
    const [row] = await db.select().from(videoListings).where(eq(videoListings.id, id));
    if (!row) return undefined;
    const enriched = await this.enrichListings([row]);
    return enriched[0];
  }

  async getListingsByProvider(providerId: number): Promise<ListingWithProvider[]> {
    const rows = await db
      .select()
      .from(videoListings)
      .where(eq(videoListings.providerId, providerId))
      .orderBy(sql`${videoListings.createdAt} DESC`);
    return this.enrichListings(rows);
  }

  async createListing(data: CreateListingRequest & { providerId: number; dropDate: string; pricePaidCents: number }): Promise<VideoListing> {
    const [listing] = await db
      .insert(videoListings)
      .values({
        providerId: data.providerId,
        vertical: data.vertical as any,
        title: data.title,
        videoUrl: data.videoUrl,
        durationSeconds: data.durationSeconds,
        description: data.description ?? null,
        tags: data.tags ?? [],
        ctaLabel: data.ctaLabel ?? null,
        ctaUrl: data.ctaUrl ?? null,
        ctaType: data.ctaType ?? null,
        flashSaleEndsAt: data.flashSaleEndsAt ? new Date(data.flashSaleEndsAt) : null,
        couponCode: data.couponCode ?? null,
        productPrice: data.productPrice ?? null,
        productPurchaseUrl: data.productPurchaseUrl ?? null,
        productStock: data.productStock ?? null,
        status: "ACTIVE",
        dropDate: data.dropDate,
        pricePaidCents: data.pricePaidCents,
        stripeSessionId: null,
      })
      .returning();
    return listing;
  }

  async updateListingStatus(id: number, status: "ACTIVE" | "PAUSED" | "REMOVED"): Promise<VideoListing | undefined> {
    const [listing] = await db
      .update(videoListings)
      .set({ status, updatedAt: new Date() })
      .where(eq(videoListings.id, id))
      .returning();
    return listing;
  }

  async getTodayListingCount(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoListings)
      .where(and(eq(videoListings.dropDate, today), eq(videoListings.status, "ACTIVE")));
    return result?.count ?? 0;
  }

  async getAllListingsWithProviders(): Promise<ListingWithProvider[]> {
    const rows = await db
      .select()
      .from(videoListings)
      .orderBy(sql`${videoListings.createdAt} DESC`);
    return this.enrichListings(rows);
  }

  async getTodayRevenue(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(price_paid_cents), 0)::int` })
      .from(videoListings)
      .where(and(eq(videoListings.dropDate, today), eq(videoListings.status, "ACTIVE")));
    return result?.total ?? 0;
  }

  async getAllUsers(): Promise<UserWithProfile[]> {
    const rows = await db
      .select()
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`);
    const profiles = await db.select().from(providerProfiles);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    return rows.map((u) => ({ ...u, profile: profileMap.get(u.id) ?? null }));
  }

  async updateUserStatus(id: number, status: "active" | "disabled"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role: role as any })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteListing(id: number): Promise<void> {
    await db.delete(videoListings).where(eq(videoListings.id, id));
  }

  async createLead(data: CreateLeadRequest): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values({
        videoId: data.videoId,
        creatorUserId: data.creatorUserId,
        firstName: data.firstName,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
        videoTitle: data.videoTitle ?? null,
        category: data.category ?? null,
      })
      .returning();
    return lead;
  }

  async getLeadsByProvider(creatorUserId: number): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(eq(leads.creatorUserId, creatorUserId))
      .orderBy(sql`${leads.createdAt} DESC`);
  }

  async createLiveSession(data: CreateLiveSessionRequest & { creatorUserId: number; providerId: number; platform?: string }): Promise<LiveSession> {
    const [session] = await db
      .insert(liveSessions)
      .values({
        creatorUserId: data.creatorUserId,
        providerId: data.providerId,
        title: data.title,
        category: data.category,
        mode: data.mode,
        platform: data.platform ?? null,
        streamUrl: data.streamUrl,
        thumbnailUrl: data.thumbnailUrl ?? null,
        viewerCount: 0,
        status: "active",
      })
      .returning();
    return session;
  }

  async getActiveLiveSessions(): Promise<LiveSessionWithProvider[]> {
    const sessions = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.status, "active"))
      .orderBy(sql`${liveSessions.startedAt} DESC`);
    if (!sessions.length) return [];
    const providerIds = [...new Set(sessions.map((s) => s.providerId))];
    const profiles = await db.select().from(providerProfiles).where(inArray(providerProfiles.id, providerIds));
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    return sessions
      .filter((s) => profileMap[s.providerId])
      .map((s) => ({ ...s, provider: profileMap[s.providerId] }));
  }

  async getLiveSessionById(id: number): Promise<LiveSessionWithProvider | undefined> {
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    if (!session) return undefined;
    const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.id, session.providerId));
    if (!profile) return undefined;
    return { ...session, provider: profile };
  }

  async endLiveSession(id: number): Promise<void> {
    await db
      .update(liveSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(liveSessions.id, id));
  }

  async createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null; initialStatus?: string; bookedDate?: string; bookedHour?: number }): Promise<GigJack> {
    // Build scheduledAt from bookedDate + bookedHour if provided
    let scheduledAt: Date | null = null;
    if (data.bookedDate && data.bookedHour !== undefined) {
      scheduledAt = new Date(`${data.bookedDate}T${String(data.bookedHour).padStart(2, "0")}:00:00`);
    } else if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
    }
    const [gj] = await db
      .insert(gigJacks)
      .values({
        providerId: data.providerId,
        companyUrl: data.companyUrl ?? data.ctaLink,
        artworkUrl: data.artworkUrl,
        offerTitle: data.offerTitle,
        description: data.description ?? data.offerTitle,
        ctaLink: data.ctaLink,
        countdownMinutes: data.countdownMinutes ?? 0,
        couponCode: data.couponCode ?? null,
        quantityLimit: data.quantityLimit ?? null,
        tagline: data.tagline ?? null,
        category: data.category ?? null,
        scheduledAt,
        bookedDate: data.bookedDate ?? null,
        bookedHour: data.bookedHour ?? null,
        flashDurationSeconds: data.flashDurationSeconds ?? 7,
        status: (data.initialStatus as any) ?? "PENDING_REVIEW",
        botWarning: data.botWarning,
        botWarningMessage: data.botWarningMessage,
      })
      .returning();
    return gj;
  }

  async getGigJacksByProvider(providerId: number): Promise<GigJackWithProvider[]> {
    const rows = await db
      .select()
      .from(gigJacks)
      .where(eq(gigJacks.providerId, providerId))
      .orderBy(sql`${gigJacks.createdAt} DESC`);
    return this.enrichGigJacks(rows);
  }

  async getAllPendingGigJacks(): Promise<GigJackWithProvider[]> {
    const rows = await db
      .select()
      .from(gigJacks)
      .where(eq(gigJacks.status, "PENDING_REVIEW"))
      .orderBy(sql`${gigJacks.createdAt} DESC`);
    return this.enrichGigJacks(rows);
  }

  async getAllGigJacks(): Promise<GigJackWithProvider[]> {
    const rows = await db
      .select()
      .from(gigJacks)
      .orderBy(sql`${gigJacks.createdAt} DESC`);
    return this.enrichGigJacks(rows);
  }

  async reviewGigJack(id: number, status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT", reviewNote?: string, approvedBy?: number): Promise<{ gj: GigJack | undefined; error?: string }> {
    if (status === "APPROVED") {
      // Enforce 2-per-hour cap: check how many approved GigJacks share the same bookedDate + bookedHour
      const target = await db.select().from(gigJacks).where(eq(gigJacks.id, id)).limit(1);
      if (target.length > 0 && target[0].bookedDate && target[0].bookedHour !== null) {
        const { bookedDate, bookedHour } = target[0];
        const approvedInSlot = await db
          .select()
          .from(gigJacks)
          .where(
            and(
              eq(gigJacks.bookedDate, bookedDate!),
              eq(gigJacks.bookedHour, bookedHour!),
              eq(gigJacks.status, "APPROVED"),
              sql`${gigJacks.id} != ${id}`
            )
          );
        if (approvedInSlot.length >= 2) {
          return { gj: undefined, error: `This hour slot already has 2 approved GigJacks. Cannot approve more.` };
        }
      }
    }
    const setData: any = { status, reviewNote: reviewNote ?? null, updatedAt: new Date() };
    if (status === "APPROVED") {
      setData.approvedAt = new Date();
      setData.approvedBy = approvedBy ?? null;
    }
    const [gj] = await db
      .update(gigJacks)
      .set(setData)
      .where(eq(gigJacks.id, id))
      .returning();
    return { gj };
  }

  async getActiveGigJack(): Promise<GigJackWithProvider | null> {
    const now = new Date();
    const rows = await db
      .select()
      .from(gigJacks)
      .where(
        and(
          eq(gigJacks.status, "APPROVED"),
          lte(gigJacks.scheduledAt, now),
          gte(gigJacks.scheduledAt, new Date(now.getTime() - 10_000))
        )
      )
      .orderBy(sql`${gigJacks.scheduledAt} DESC`)
      .limit(1);
    if (rows.length === 0) return null;
    const enriched = await this.enrichGigJacks(rows);
    return enriched[0] ?? null;
  }

  async getAvailableSlots(): Promise<GigJackSlot[]> {
    const now = new Date();
    const booked = await db
      .select({ scheduledAt: gigJacks.scheduledAt })
      .from(gigJacks)
      .where(
        and(
          or(eq(gigJacks.status, "PENDING_REVIEW"), eq(gigJacks.status, "APPROVED")),
          gte(gigJacks.scheduledAt, now)
        )
      );
    const bookedSet = new Set(
      booked
        .filter((r) => r.scheduledAt)
        .map((r) => r.scheduledAt!.toISOString().slice(0, 16))
    );
    const slots: GigJackSlot[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);
      day.setSeconds(0, 0);
      const dateLabel = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      for (let h = 8; h <= 21; h++) {
        const slot = new Date(day);
        slot.setHours(h, 0, 0, 0);
        if (slot <= now) continue;
        const iso = slot.toISOString();
        const key = iso.slice(0, 16);
        slots.push({ dateLabel, iso, available: !bookedSet.has(key) });
      }
    }
    return slots;
  }

  async getSlotAvailability(date: string): Promise<import("@shared/schema").HourSlot[]> {
    const rows = await db
      .select({ bookedHour: gigJacks.bookedHour, status: gigJacks.status })
      .from(gigJacks)
      .where(eq(gigJacks.bookedDate, date));

    const approvedPerHour = new Map<number, number>();
    const pendingPerHour = new Map<number, number>();
    for (const row of rows) {
      if (row.bookedHour === null) continue;
      if (row.status === "APPROVED") {
        approvedPerHour.set(row.bookedHour, (approvedPerHour.get(row.bookedHour) ?? 0) + 1);
      } else if (row.status === "PENDING_REVIEW") {
        pendingPerHour.set(row.bookedHour, (pendingPerHour.get(row.bookedHour) ?? 0) + 1);
      }
    }

    const hours: import("@shared/schema").HourSlot[] = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    for (let h = 8; h <= 21; h++) {
      // Skip past hours for today
      if (date === todayStr && h <= now.getHours()) continue;
      const approvedCount = approvedPerHour.get(h) ?? 0;
      const pendingCount = pendingPerHour.get(h) ?? 0;
      const period = h < 12 ? "AM" : "PM";
      const display = h === 12 ? 12 : h > 12 ? h - 12 : h;
      hours.push({
        hour: h,
        label: `${display}:00 ${period}`,
        approvedCount,
        pendingCount,
        available: approvedCount < 2,
      });
    }
    return hours;
  }
}

export const storage = new DatabaseStorage();
