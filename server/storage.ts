import { db } from "./db";
import { users, providerProfiles, videoListings, gigJacks, type User, type InsertUser, type ProviderProfile, type InsertProfile, type VideoListing, type ListingWithProvider, type UpdateProfileRequest, type CreateListingRequest, type GigJack, type GigJackWithProvider, type CreateGigJackRequest } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

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

  // GigJacks
  createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null }): Promise<GigJack>;
  getGigJacksByProvider(providerId: number): Promise<GigJackWithProvider[]>;
  getAllPendingGigJacks(): Promise<GigJackWithProvider[]>;
  getAllGigJacks(): Promise<GigJackWithProvider[]>;
  reviewGigJack(id: number, status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT", reviewNote?: string): Promise<GigJack | undefined>;
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

  async createGigJack(data: CreateGigJackRequest & { providerId: number; botWarning: boolean; botWarningMessage: string | null }): Promise<GigJack> {
    const [gj] = await db
      .insert(gigJacks)
      .values({
        providerId: data.providerId,
        companyUrl: data.companyUrl,
        artworkUrl: data.artworkUrl,
        offerTitle: data.offerTitle,
        description: data.description,
        ctaLink: data.ctaLink,
        countdownMinutes: data.countdownMinutes,
        couponCode: data.couponCode ?? null,
        quantityLimit: data.quantityLimit ?? null,
        status: "PENDING_REVIEW",
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

  async reviewGigJack(id: number, status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT", reviewNote?: string): Promise<GigJack | undefined> {
    const [gj] = await db
      .update(gigJacks)
      .set({ status, reviewNote: reviewNote ?? null, updatedAt: new Date() })
      .where(eq(gigJacks.id, id))
      .returning();
    return gj;
  }
}

export const storage = new DatabaseStorage();
