import { db } from "./db";
import { users, providerProfiles, videoListings, gigJacks, leads, liveSessions, mfaCodes, auditLogs, type User, type InsertUser, type ProviderProfile, type InsertProfile, type VideoListing, type ListingWithProvider, type UpdateProfileRequest, type CreateListingRequest, type GigJack, type GigJackWithProvider, type CreateGigJackRequest, type GigJackSlot, type TimeSlot, type MfaCode, type AuditLog, type CreateAuditLogRequest, type Lead, type CreateLeadRequest, type LiveSession, type LiveSessionWithProvider, type CreateLiveSessionRequest, type UserWithProfile, type EditGigJackRequest, type EditUserProfileRequest } from "@shared/schema";
import { eq, and, sql, inArray, ne, gte, lte, or, between, isNull, desc } from "drizzle-orm";

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
  softDeleteUser(id: number): Promise<void>;
  restoreUser(id: number): Promise<void>;
  editUserProfile(userId: number, data: EditUserProfileRequest): Promise<ProviderProfile | undefined>;
  deleteListing(id: number): Promise<void>;

  // Audit logs
  createAuditLog(data: CreateAuditLogRequest): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Leads
  createLead(data: CreateLeadRequest): Promise<Lead>;
  getLeadsByProvider(creatorUserId: number): Promise<Lead[]>;

  // Live Sessions
  createLiveSession(data: CreateLiveSessionRequest & { creatorUserId: number; providerId: number; platform?: string }): Promise<LiveSession>;
  getActiveLiveSessions(): Promise<LiveSessionWithProvider[]>;
  getLiveSessionById(id: number): Promise<LiveSessionWithProvider | undefined>;
  endLiveSession(id: number): Promise<void>;

  // GigJacks
  createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null; initialStatus?: string; scheduledAt?: string | null }): Promise<{ gj: GigJack | undefined; error?: string }>;
  getGigJacksByProvider(providerId: number): Promise<GigJackWithProvider[]>;
  getAllPendingGigJacks(): Promise<GigJackWithProvider[]>;
  getAllGigJacks(): Promise<GigJackWithProvider[]>;
  reviewGigJack(id: number, status: "APPROVED" | "DENIED" | "NEEDS_IMPROVEMENT", reviewNote?: string, adminUserId?: number, override?: boolean): Promise<{ gj: GigJack | undefined; error?: string }>;
  editGigJack(id: number, data: EditGigJackRequest, adminUserId?: number, override?: boolean): Promise<{ gj: GigJack | undefined; error?: string }>;
  deleteGigJack(id: number, removedBy?: number): Promise<void>;
  getActiveGigJack(): Promise<GigJackWithProvider | null>;
  getAvailableSlots(): Promise<GigJackSlot[]>;
  getSlotAvailability(date: string): Promise<TimeSlot[]>;

  // MFA
  createMfaCode(userId: number, code: string, expiresAt: Date): Promise<MfaCode>;
  getLatestMfaCode(userId: number): Promise<MfaCode | undefined>;
  markMfaCodeUsed(id: number): Promise<void>;
  incrementMfaResend(id: number): Promise<void>;
  deleteOldMfaCodes(userId: number): Promise<void>;
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

  async softDeleteUser(id: number): Promise<void> {
    await db.update(users).set({ deletedAt: new Date(), status: "disabled" }).where(eq(users.id, id));
  }

  async restoreUser(id: number): Promise<void> {
    await db.update(users).set({ deletedAt: null, status: "active" }).where(eq(users.id, id));
  }

  async editUserProfile(userId: number, data: EditUserProfileRequest): Promise<ProviderProfile | undefined> {
    const setData: any = {};
    if (data.displayName !== undefined) setData.displayName = data.displayName;
    if (data.bio !== undefined) setData.bio = data.bio;
    if (data.avatarUrl !== undefined) setData.avatarUrl = data.avatarUrl;
    if (data.contactEmail !== undefined) setData.contactEmail = data.contactEmail;
    if (data.location !== undefined) setData.location = data.location;
    if (data.primaryCategory !== undefined) setData.primaryCategory = data.primaryCategory;
    if (data.username !== undefined) setData.username = data.username;
    const [profile] = await db.update(providerProfiles).set(setData).where(eq(providerProfiles.userId, userId)).returning();
    return profile;
  }

  async createAuditLog(data: CreateAuditLogRequest): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values({
      actorUserId: data.actorUserId ?? null,
      actionType: data.actionType,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
      usedOverride: data.usedOverride ?? false,
    }).returning();
    return row;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
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

  private async check15MinSpacing(scheduledAt: Date, excludeId?: number): Promise<string | null> {
    const windowStart = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 15 * 60 * 1000);
    const conditions = [
      eq(gigJacks.status, "APPROVED"),
      gte(gigJacks.scheduledAt, windowStart),
      lte(gigJacks.scheduledAt, windowEnd),
    ];
    if (excludeId !== undefined) conditions.push(sql`${gigJacks.id} != ${excludeId}` as any);
    const conflicts = await db.select({ id: gigJacks.id, scheduledAt: gigJacks.scheduledAt }).from(gigJacks).where(and(...conditions));
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const cTime = c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "another GigJack";
      return `GigJacks must be at least 15 minutes apart. Conflicts with one at ${cTime}.`;
    }
    return null;
  }

  private async check2PerHourCap(scheduledAt: Date, excludeId?: number): Promise<string | null> {
    const hourStart = new Date(scheduledAt);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(scheduledAt);
    hourEnd.setMinutes(59, 59, 999);
    const conditions = [
      eq(gigJacks.status, "APPROVED"),
      gte(gigJacks.scheduledAt, hourStart),
      lte(gigJacks.scheduledAt, hourEnd),
    ];
    if (excludeId !== undefined) conditions.push(sql`${gigJacks.id} != ${excludeId}` as any);
    const existing = await db.select({ id: gigJacks.id }).from(gigJacks).where(and(...conditions));
    if (existing.length >= 2) return "This hour already has 2 approved GigJacks. Please choose a different time.";
    return null;
  }

  async createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null; initialStatus?: string; scheduledAt?: string | null }): Promise<{ gj: GigJack | undefined; error?: string }> {
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const isAdmin = data.initialStatus === "APPROVED";

    if (scheduledAt && !isAdmin) {
      const spacingError = await this.check15MinSpacing(scheduledAt);
      if (spacingError) return { gj: undefined, error: spacingError };
      const capError = await this.check2PerHourCap(scheduledAt);
      if (capError) return { gj: undefined, error: capError };
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
        bookedDate: scheduledAt ? scheduledAt.toISOString().slice(0, 10) : null,
        bookedHour: scheduledAt ? scheduledAt.getHours() : null,
        flashDurationSeconds: data.flashDurationSeconds ?? 7,
        status: (data.initialStatus as any) ?? "PENDING_REVIEW",
        botWarning: data.botWarning,
        botWarningMessage: data.botWarningMessage,
      })
      .returning();
    return { gj };
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

  async reviewGigJack(id: number, status: "APPROVED" | "DENIED" | "NEEDS_IMPROVEMENT", reviewNote?: string, adminUserId?: number, override = false): Promise<{ gj: GigJack | undefined; error?: string }> {
    if (status === "APPROVED" && !override) {
      const [target] = await db.select().from(gigJacks).where(eq(gigJacks.id, id)).limit(1);
      if (target?.scheduledAt) {
        const spacingError = await this.check15MinSpacing(new Date(target.scheduledAt), id);
        if (spacingError) return { gj: undefined, error: spacingError };
        const capError = await this.check2PerHourCap(new Date(target.scheduledAt), id);
        if (capError) return { gj: undefined, error: capError };
      }
    }
    const now = new Date();
    const setData: any = { status, reviewNote: reviewNote ?? null, updatedAt: now };
    if (status === "APPROVED") {
      setData.approvedAt = now;
      setData.approvedBy = adminUserId ?? null;
    } else if (status === "DENIED") {
      setData.deniedAt = now;
      setData.deniedBy = adminUserId ?? null;
    }
    const [gj] = await db.update(gigJacks).set(setData).where(eq(gigJacks.id, id)).returning();
    return { gj };
  }

  async deleteGigJack(id: number, removedBy?: number): Promise<void> {
    await db.update(gigJacks).set({ status: "REJECTED" as any, removedAt: new Date(), removedBy: removedBy ?? null, updatedAt: new Date() }).where(eq(gigJacks.id, id));
    await db.delete(gigJacks).where(eq(gigJacks.id, id));
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

  async getSlotAvailability(date: string): Promise<TimeSlot[]> {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const rows = await db
      .select({ scheduledAt: gigJacks.scheduledAt, status: gigJacks.status })
      .from(gigJacks)
      .where(and(gte(gigJacks.scheduledAt, dayStart), lte(gigJacks.scheduledAt, dayEnd)));

    const approvedTimes: Date[] = [];
    const approvedPerHour = new Map<number, number>();
    for (const row of rows) {
      if (row.scheduledAt && row.status === "APPROVED") {
        const d = new Date(row.scheduledAt);
        approvedTimes.push(d);
        const h = d.getHours();
        approvedPerHour.set(h, (approvedPerHour.get(h) ?? 0) + 1);
      }
    }

    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let h = 8; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 21 && m > 0) continue;
        const slotDt = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
        if (slotDt <= now) continue;

        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const period = h < 12 ? "AM" : "PM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;
        const approvedInHour = approvedPerHour.get(h) ?? 0;

        let available = true;
        let reason: string | undefined;

        if (approvedInHour >= 2) {
          available = false;
          reason = "Hour is full (2/2 approved)";
        } else {
          for (const at of approvedTimes) {
            const diff = Math.abs(slotDt.getTime() - at.getTime());
            if (diff < 15 * 60 * 1000) {
              available = false;
              reason = "Within 15-min buffer of another GigJack";
              break;
            }
          }
        }

        slots.push({ time: timeStr, label, scheduledAt: slotDt.toISOString(), available, reason, approvedInHour });
      }
    }
    return slots;
  }

  async editGigJack(id: number, data: EditGigJackRequest, adminUserId?: number, override = false): Promise<{ gj: GigJack | undefined; error?: string }> {
    const setData: any = { updatedAt: new Date() };

    if (data.scheduledAt !== undefined) {
      const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
      if (scheduledAt && !override) {
        const spacingError = await this.check15MinSpacing(scheduledAt, id);
        if (spacingError) return { gj: undefined, error: spacingError };
        const capError = await this.check2PerHourCap(scheduledAt, id);
        if (capError) return { gj: undefined, error: capError };
      }
      setData.scheduledAt = scheduledAt;
      setData.bookedDate = scheduledAt ? scheduledAt.toISOString().slice(0, 10) : null;
      setData.bookedHour = scheduledAt ? scheduledAt.getHours() : null;
    }

    if (data.status !== undefined) {
      setData.status = data.status;
      const now = new Date();
      if (data.status === "APPROVED") {
        setData.approvedAt = now;
        setData.approvedBy = adminUserId ?? null;
      } else if (data.status === "DENIED") {
        setData.deniedAt = now;
        setData.deniedBy = adminUserId ?? null;
      }
    }

    if (data.providerId !== undefined) {
      setData.providerId = data.providerId;
    }

    const [gj] = await db.update(gigJacks).set(setData).where(eq(gigJacks.id, id)).returning();
    return { gj };
  }

  // MFA methods
  async createMfaCode(userId: number, code: string, expiresAt: Date): Promise<MfaCode> {
    const [row] = await db.insert(mfaCodes).values({ userId, code, expiresAt }).returning();
    return row;
  }

  async getLatestMfaCode(userId: number): Promise<MfaCode | undefined> {
    const [row] = await db
      .select()
      .from(mfaCodes)
      .where(eq(mfaCodes.userId, userId))
      .orderBy(sql`${mfaCodes.createdAt} DESC`)
      .limit(1);
    return row;
  }

  async markMfaCodeUsed(id: number): Promise<void> {
    await db.update(mfaCodes).set({ usedAt: new Date() }).where(eq(mfaCodes.id, id));
  }

  async incrementMfaResend(id: number): Promise<void> {
    await db
      .update(mfaCodes)
      .set({ resendCount: sql`${mfaCodes.resendCount} + 1`, lastResendAt: new Date() })
      .where(eq(mfaCodes.id, id));
  }

  async deleteOldMfaCodes(userId: number): Promise<void> {
    await db.delete(mfaCodes).where(eq(mfaCodes.userId, userId));
  }
}

export const storage = new DatabaseStorage();
