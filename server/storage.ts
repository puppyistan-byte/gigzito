import { db } from "./db";
import { createHash } from "crypto";
import { users, providerProfiles, videoListings, videoLikes, gigJacks, leads, liveSessions, mfaCodes, auditLogs, injectedFeeds, loveVotes, allEyesSlots, zitoTvEvents, sponsorAds, adBookings, adInquiries, marketerAudiences, audienceBroadcasts, geoTargetCampaigns, gignessCards, cardMessages, gignessCardComments, listingComments, zeeMotions, zeeMotionComments, geezeeFollows, presenterContacts, type User, type InsertUser, type ProviderProfile, type InsertProfile, type VideoListing, type ListingWithProvider, type UpdateProfileRequest, type CreateListingRequest, type GigJack, type GigJackWithProvider, type CreateGigJackRequest, type GigJackSlot, type TimeSlot, type MfaCode, type AuditLog, type CreateAuditLogRequest, type Lead, type CreateLeadRequest, type LiveSession, type LiveSessionWithProvider, type CreateLiveSessionRequest, type UserWithProfile, type EditGigJackRequest, type EditUserProfileRequest, type GigJackLiveState, type TodayGigJack, type InjectedFeed, type CreateInjectedFeedRequest, type UpdateInjectedFeedRequest, type AllEyesSlot, type AllEyesSlotWithProvider, type BookAllEyesRequest, type ZitoTVEvent, type ZitoTVEventWithHost, type CreateZitoTVEventRequest, type SponsorAd, type InsertSponsorAd, type AdBooking, type AdBookingWithAd, type InsertAdBooking, type MarketerAudience, type AudienceBroadcast, type GeoTargetCampaign, type InsertGeoTargetCampaign, type GignessCard, type CardMessage, type GignessCardComment, type ListingComment, type AdInquiry, type ZeeMotion, type ZeeMotionComment, type GeezeeFollow, type PresenterContact } from "@shared/schema";
import { eq, and, sql, inArray, ne, gte, lte, or, between, isNull, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: number): Promise<void>;
  updateVerificationToken(userId: number, token: string | null): Promise<void>;
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
  updateScanStatus(listingId: number, status: string, scanNote?: string | null): Promise<void>;
  triageListing(id: number, adminUserId: number, reason: string): Promise<VideoListing | undefined>;
  getTriagedListings(): Promise<ListingWithProvider[]>;

  // Daily cap
  getTodayListingCount(): Promise<number>;

  // Admin
  getAllListingsWithProviders(): Promise<ListingWithProvider[]>;
  getTodayRevenue(): Promise<number>;
  getAllUsers(): Promise<UserWithProfile[]>;
  updateUserStatus(id: number, status: "active" | "disabled"): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;
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

  // Marketer Audiences
  upsertMarketerAudience(data: { providerUserId: number; leadName: string; leadEmail: string; leadPhone?: string | null; sourceListingId?: number | null }): Promise<void>;
  getMarketerAudienceCount(providerUserId: number): Promise<number>;
  getMarketerAudience(providerUserId: number): Promise<MarketerAudience[]>;

  // Audience Broadcasts
  createAudienceBroadcast(data: { providerUserId: number; subject: string; body: string; recipientCount: number }): Promise<AudienceBroadcast>;
  getAudienceBroadcasts(providerUserId: number): Promise<AudienceBroadcast[]>;

  // Geo Target Campaigns
  createGeoTargetCampaign(data: { providerUserId: number; title: string; offer: string; radiusMiles: number; city?: string | null; state?: string | null; country: string; lat?: string | null; lng?: string | null; imageUrl?: string | null }): Promise<GeoTargetCampaign>;
  getGeoTargetCampaignsByProvider(providerUserId: number): Promise<GeoTargetCampaign[]>;
  updateGeoTargetCampaignStatus(id: number, providerUserId: number, status: "ACTIVE" | "PAUSED" | "ENDED"): Promise<GeoTargetCampaign>;
  getAllGeoTargetCampaigns(): Promise<GeoTargetCampaign[]>;

  // Gigness Cards
  upsertGignessCard(userId: number, data: { slogan?: string; profilePic?: string | null; gallery?: string[]; isPublic?: boolean; locationServicesEnabled?: boolean; allowMessaging?: boolean; ageBracket?: string | null; gender?: string | null; intent?: string | null }): Promise<GignessCard>;
  getGignessCardByUserId(userId: number): Promise<GignessCard | undefined>;
  getGignessCardById(cardId: number): Promise<GignessCard | undefined>;
  getGignessCardByQrUuid(qrUuid: string): Promise<GignessCard | undefined>;
  getPublicGignessCards(filters?: { ageBracket?: string; gender?: string; intent?: string }): Promise<GignessCard[]>;
  incrementGignessEngagement(cardId: number): Promise<void>;
  optInToPresenter(presenterUserId: number, memberUserId: number): Promise<void>;
  optOutFromPresenter(presenterUserId: number, memberUserId: number): Promise<void>;
  getPresenterContacts(presenterUserId: number): Promise<{ id: number; memberUserId: number; email: string; displayName: string | null; username: string | null; optedInAt: Date }[]>;
  getMemberOptIns(memberUserId: number): Promise<{ id: number; presenterUserId: number; displayName: string | null; username: string | null; avatarUrl: string | null; optedInAt: Date }[]>;
  getOptInStatus(presenterUserId: number, memberUserId: number): Promise<boolean>;
  getPresenterByUsername(username: string): Promise<{ userId: number; displayName: string | null; username: string; avatarUrl: string | null; subscriptionTier: string } | null>;
  updateSubscriptionTier(userId: number, tier: string): Promise<void>;

  // Card Messages
  createCardMessage(data: { fromUserId: number; toUserId: number; gignessCardId: number; messageText?: string | null; emojiReaction?: string | null; isClean: boolean }): Promise<CardMessage>;
  getCardMessages(toUserId: number): Promise<CardMessage[]>;
  deleteCardMessage(id: number, toUserId: number): Promise<void>;
  bulkDeleteCardMessages(ids: number[], toUserId: number): Promise<void>;

  // Card Comments
  createGignessComment(data: { cardId: number; authorUserId?: number | null; authorName: string; commentText: string; isClean: boolean }): Promise<GignessCardComment>;
  getGignessComments(cardId: number): Promise<GignessCardComment[]>;

  // ZeeMotion
  createZeeMotion(userId: number, data: { text?: string | null; mediaUrl?: string | null; mediaType?: string | null }): Promise<ZeeMotion>;
  getMyZeeMotions(userId: number): Promise<ZeeMotion[]>;
  getUserZeeMotions(userId: number): Promise<ZeeMotion[]>;
  deleteZeeMotion(id: number, userId: number): Promise<void>;
  getZeeMotionFeed(userId: number): Promise<(ZeeMotion & { username: string | null; displayName: string | null; avatarUrl: string | null })[]>;
  createZeeMotionComment(data: { motionId: number; authorUserId: number | null; authorName: string; commentText: string }): Promise<ZeeMotionComment>;
  getZeeMotionComments(motionId: number): Promise<ZeeMotionComment[]>;

  // GeeZee Follows
  followUser(followerId: number, followingUserId: number): Promise<void>;
  unfollowUser(followerId: number, followingUserId: number): Promise<void>;
  isFollowing(followerId: number, followingUserId: number): Promise<boolean>;
  getFollowingIds(followerId: number): Promise<number[]>;
  getFollowerCount(userId: number): Promise<number>;

  // Listing Comments
  createListingComment(data: { listingId: number; authorUserId?: number | null; authorName: string; commentText: string; viewerUsername?: string | null; viewerEmail?: string | null; viewerCity?: string | null; viewerState?: string | null; viewerCountry?: string | null }): Promise<ListingComment>;
  getListingComments(listingId: number): Promise<ListingComment[]>;
  getListingCommentsByProvider(providerUserId: number): Promise<(ListingComment & { listingTitle: string | null })[]>;
  deleteListingComment(id: number, providerUserId: number): Promise<void>;

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
  getLiveGigJackState(): Promise<GigJackLiveState>;
  getTodaysGigJacks(): Promise<TodayGigJack[]>;
  forceExpireGigJack(id: number, adminUserId?: number): Promise<void>;
  getAvailableSlots(): Promise<GigJackSlot[]>;
  getSlotAvailability(date: string, nowMs?: number, tzOffset?: number): Promise<TimeSlot[]>;

  // MFA
  createMfaCode(userId: number, code: string, expiresAt: Date): Promise<MfaCode>;
  getLatestMfaCode(userId: number): Promise<MfaCode | undefined>;
  markMfaCodeUsed(id: number): Promise<void>;
  incrementMfaResend(id: number): Promise<void>;
  deleteOldMfaCodes(userId: number): Promise<void>;

  // Injected Feeds
  getInjectedFeeds(): Promise<InjectedFeed[]>;
  getActiveInjectedFeed(): Promise<InjectedFeed | null>;
  createInjectedFeed(data: CreateInjectedFeedRequest & { createdBy?: number }): Promise<InjectedFeed>;
  updateInjectedFeed(id: number, data: UpdateInjectedFeedRequest): Promise<InjectedFeed | undefined>;
  deleteInjectedFeed(id: number): Promise<void>;

  // Video Likes
  toggleVideoLike(videoId: number, userId: number): Promise<{ liked: boolean; likeCount: number }>;
  getVideoLikeStatus(videoId: number, userId: number | null): Promise<{ likeCount: number; isLiked: boolean }>;
  getBatchVideoLikeStatus(videoIds: number[], userId: number | null): Promise<Record<number, boolean>>;
  getProviderTotalLikes(providerId: number): Promise<number>;

  // Love Votes
  castLoveVote(voterUserId: number, providerId: number, monthKey: string): Promise<{ success: boolean; alreadyVoted: boolean }>;
  getLoveVoteStatus(voterUserId: number | null, providerId: number, monthKey: string): Promise<{ voteCount: number; hasVoted: boolean }>;
  getLoveLeaderboard(monthKey: string): Promise<import("@shared/schema").LoveLeaderboardEntry[]>;

  // All Eyes On Me
  bookAllEyesSlot(providerId: number, userId: number, data: BookAllEyesRequest): Promise<{ slot?: AllEyesSlot; error?: string }>;
  getActiveAllEyesSlot(): Promise<AllEyesSlotWithProvider | null>;
  getUpcomingAllEyesSlots(): Promise<AllEyesSlotWithProvider[]>;
  getAllAllEyesSlots(): Promise<AllEyesSlotWithProvider[]>;
  cancelAllEyesSlot(id: number): Promise<void>;
  // ZitoTV
  createZitoTVEvent(userId: number, data: CreateZitoTVEventRequest): Promise<ZitoTVEvent>;
  getZitoTVEvents(opts?: { from?: Date; to?: Date }): Promise<ZitoTVEventWithHost[]>;
  getZitoTVEvent(id: number): Promise<ZitoTVEventWithHost | null>;
  updateZitoTVEvent(id: number, data: Partial<CreateZitoTVEventRequest & { status: string }>): Promise<ZitoTVEvent>;
  deleteZitoTVEvent(id: number): Promise<void>;

  // Sponsor Ads
  getSponsorAds(): Promise<SponsorAd[]>;
  getSponsorAdById(id: number): Promise<SponsorAd | undefined>;
  getActiveSponsorAds(): Promise<SponsorAd[]>;
  getAdsForDate(date: string): Promise<SponsorAd[]>;
  createSponsorAd(data: InsertSponsorAd): Promise<SponsorAd>;
  updateSponsorAd(id: number, data: Partial<InsertSponsorAd>): Promise<SponsorAd>;
  toggleSponsorAd(id: number, active: boolean): Promise<SponsorAd>;
  deleteSponsorAd(id: number): Promise<void>;
  // Ad inquiries
  createAdInquiry(data: { adId: number; advertiserUsername?: string; viewerName: string; viewerEmail?: string; viewerMessage: string; viewerUsername?: string; viewerCity?: string; viewerState?: string; viewerCountry?: string }): Promise<AdInquiry>;
  getAdInquiries(advertiserUsername: string): Promise<AdInquiry[]>;
  markAdInquiryRead(id: number): Promise<void>;
  deleteAdInquiry(id: number, advertiserUsername: string): Promise<void>;
  bulkDeleteAdInquiries(ids: number[], advertiserUsername: string): Promise<void>;
  bulkDeleteListingComments(ids: number[], providerUserId: number): Promise<void>;
  // Inbox read tracking
  markListingCommentRead(id: number): Promise<void>;
  markCardMessageRead(id: number): Promise<void>;
  // Ad bookings
  getBookingsForDate(date: string): Promise<AdBookingWithAd[]>;
  getAvailabilityForRange(startDate: string, endDate: string): Promise<Record<string, number[]>>;
  createAdBooking(data: InsertAdBooking): Promise<AdBooking>;
  updateAdBookingStatus(id: number, status: string): Promise<AdBooking>;
  getAdBookings(): Promise<AdBookingWithAd[]>;
  deleteAdBooking(id: number): Promise<void>;
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

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const hash = createHash("sha256").update(token).digest("hex");
    const [user] = await db.select().from(users).where(
      and(
        eq(users.emailVerificationToken, hash),
        gte(users.emailVerificationExpiresAt, new Date())
      )
    );
    return user;
  }

  async verifyUserEmail(userId: number): Promise<void> {
    await db.update(users).set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    }).where(eq(users.id, userId));
  }

  async updateVerificationToken(userId: number, token: string): Promise<void> {
    const hash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(users).set({
      emailVerificationToken: hash,
      emailVerificationExpiresAt: expiresAt,
    }).where(eq(users.id, userId));
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
      "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS", "ARTISTS", "BUSINESS",
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
        postType: data.postType ?? "VIDEO",
        videoUrl: data.videoUrl ?? null,
        durationSeconds: data.durationSeconds ?? null,
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

  async updateScanStatus(listingId: number, status: string, scanNote?: string | null): Promise<void> {
    await db
      .update(videoListings)
      .set({ scanStatus: status, ...(scanNote !== undefined && { scanNote: scanNote ?? null }), updatedAt: new Date() })
      .where(eq(videoListings.id, listingId));
  }

  async triageListing(id: number, adminUserId: number, reason: string): Promise<VideoListing | undefined> {
    const [listing] = await db
      .update(videoListings)
      .set({ status: "TRIAGED", triagedAt: new Date(), triagedBy: adminUserId, triagedReason: reason, updatedAt: new Date() })
      .where(eq(videoListings.id, id))
      .returning();
    return listing;
  }

  async getTriagedListings(): Promise<ListingWithProvider[]> {
    const rows = await db
      .select()
      .from(videoListings)
      .where(eq(videoListings.status, "TRIAGED"))
      .orderBy(sql`${videoListings.createdAt} DESC`);
    return this.enrichListings(rows);
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

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
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
        viewerUsername: data.viewerUsername ?? null,
        viewerCity: data.viewerCity ?? null,
        viewerState: data.viewerState ?? null,
        viewerCountry: data.viewerCountry ?? null,
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

  async upsertMarketerAudience(data: { providerUserId: number; leadName: string; leadEmail: string; leadPhone?: string | null; sourceListingId?: number | null }): Promise<void> {
    await db
      .insert(marketerAudiences)
      .values({
        providerUserId: data.providerUserId,
        leadName: data.leadName,
        leadEmail: data.leadEmail,
        leadPhone: data.leadPhone ?? null,
        sourceListingId: data.sourceListingId ?? null,
      })
      .onConflictDoNothing();
  }

  async getMarketerAudienceCount(providerUserId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketerAudiences)
      .where(eq(marketerAudiences.providerUserId, providerUserId));
    return row?.count ?? 0;
  }

  async getMarketerAudience(providerUserId: number): Promise<MarketerAudience[]> {
    return db
      .select()
      .from(marketerAudiences)
      .where(eq(marketerAudiences.providerUserId, providerUserId))
      .orderBy(sql`${marketerAudiences.createdAt} DESC`);
  }

  // ── Gigness Cards ──────────────────────────────────────────────────────────

  async upsertGignessCard(userId: number, data: { slogan?: string; profilePic?: string | null; gallery?: string[]; isPublic?: boolean; locationServicesEnabled?: boolean; allowMessaging?: boolean; ageBracket?: string | null; gender?: string | null; intent?: string | null }): Promise<GignessCard> {
    const [card] = await db
      .insert(gignessCards)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: gignessCards.userId,
        set: {
          ...(data.slogan !== undefined && { slogan: data.slogan }),
          ...(data.profilePic !== undefined && { profilePic: data.profilePic }),
          ...(data.gallery !== undefined && { gallery: data.gallery }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.locationServicesEnabled !== undefined && { locationServicesEnabled: data.locationServicesEnabled }),
          ...(data.allowMessaging !== undefined && { allowMessaging: data.allowMessaging }),
          ...(data.ageBracket !== undefined && { ageBracket: data.ageBracket }),
          ...(data.gender !== undefined && { gender: data.gender }),
          ...(data.intent !== undefined && { intent: data.intent }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return card;
  }

  async getGignessCardByUserId(userId: number): Promise<GignessCard | undefined> {
    const [card] = await db.select().from(gignessCards).where(eq(gignessCards.userId, userId));
    return card;
  }

  async getGignessCardById(cardId: number): Promise<GignessCard | undefined> {
    const [card] = await db.select().from(gignessCards).where(eq(gignessCards.id, cardId));
    return card;
  }

  async getGignessCardByQrUuid(qrUuid: string): Promise<GignessCard | undefined> {
    const [card] = await db.select().from(gignessCards).where(eq(gignessCards.qrUuid, qrUuid));
    return card;
  }

  async getPublicGignessCards(filters?: { ageBracket?: string; gender?: string; intent?: string }): Promise<(GignessCard & { username: string | null; displayName: string | null; userTier: string | null })[]> {
    const conditions = [eq(gignessCards.isPublic, true)];
    if (filters?.ageBracket) conditions.push(eq(gignessCards.ageBracket, filters.ageBracket));
    if (filters?.gender) conditions.push(eq(gignessCards.gender, filters.gender));
    if (filters?.intent) conditions.push(eq(gignessCards.intent, filters.intent));
    const rows = await db
      .select({
        card: gignessCards,
        username: providerProfiles.username,
        displayName: providerProfiles.displayName,
        instagramUrl: providerProfiles.instagramUrl,
        tiktokUrl: providerProfiles.tiktokUrl,
        facebookUrl: providerProfiles.facebookUrl,
        twitterUrl: providerProfiles.twitterUrl,
        discordUrl: providerProfiles.discordUrl,
        youtubeUrl: providerProfiles.youtubeUrl,
        userTier: users.subscriptionTier,
      })
      .from(gignessCards)
      .leftJoin(providerProfiles, eq(providerProfiles.userId, gignessCards.userId))
      .leftJoin(users, eq(users.id, gignessCards.userId))
      .where(and(...conditions))
      .orderBy(sql`${gignessCards.engagementCount} DESC, ${gignessCards.createdAt} DESC`);
    return rows.map((r) => ({
      ...r.card,
      username:     r.username     ?? null,
      displayName:  r.displayName  ?? null,
      instagramUrl: r.instagramUrl ?? null,
      tiktokUrl:    r.tiktokUrl    ?? null,
      facebookUrl:  r.facebookUrl  ?? null,
      twitterUrl:   r.twitterUrl   ?? null,
      discordUrl:   r.discordUrl   ?? null,
      youtubeUrl:   r.youtubeUrl   ?? null,
      userTier:     r.userTier     ?? null,
    }));
  }

  async incrementGignessEngagement(cardId: number): Promise<void> {
    await db
      .update(gignessCards)
      .set({ engagementCount: sql`${gignessCards.engagementCount} + 1` })
      .where(eq(gignessCards.id, cardId));
  }

  async optInToPresenter(presenterUserId: number, memberUserId: number): Promise<void> {
    await db
      .insert(presenterContacts)
      .values({ presenterUserId, memberUserId, active: true, optedInAt: new Date(), optedOutAt: null })
      .onConflictDoUpdate({
        target: [presenterContacts.presenterUserId, presenterContacts.memberUserId],
        set: { active: true, optedInAt: new Date(), optedOutAt: null },
      });
  }

  async optOutFromPresenter(presenterUserId: number, memberUserId: number): Promise<void> {
    await db
      .update(presenterContacts)
      .set({ active: false, optedOutAt: new Date() })
      .where(and(eq(presenterContacts.presenterUserId, presenterUserId), eq(presenterContacts.memberUserId, memberUserId)));
  }

  async getPresenterContacts(presenterUserId: number): Promise<{ id: number; memberUserId: number; email: string; displayName: string | null; username: string | null; optedInAt: Date }[]> {
    const rows = await db
      .select({
        id: presenterContacts.id,
        memberUserId: presenterContacts.memberUserId,
        email: users.email,
        displayName: providerProfiles.displayName,
        username: providerProfiles.username,
        optedInAt: presenterContacts.optedInAt,
      })
      .from(presenterContacts)
      .innerJoin(users, eq(users.id, presenterContacts.memberUserId))
      .leftJoin(providerProfiles, eq(providerProfiles.userId, presenterContacts.memberUserId))
      .where(and(eq(presenterContacts.presenterUserId, presenterUserId), eq(presenterContacts.active, true)))
      .orderBy(desc(presenterContacts.optedInAt));
    return rows.map((r) => ({ ...r, email: r.email }));
  }

  async getMemberOptIns(memberUserId: number): Promise<{ id: number; presenterUserId: number; displayName: string | null; username: string | null; avatarUrl: string | null; optedInAt: Date }[]> {
    const rows = await db
      .select({
        id: presenterContacts.id,
        presenterUserId: presenterContacts.presenterUserId,
        displayName: providerProfiles.displayName,
        username: providerProfiles.username,
        avatarUrl: providerProfiles.avatarUrl,
        optedInAt: presenterContacts.optedInAt,
      })
      .from(presenterContacts)
      .leftJoin(providerProfiles, eq(providerProfiles.userId, presenterContacts.presenterUserId))
      .where(and(eq(presenterContacts.memberUserId, memberUserId), eq(presenterContacts.active, true)))
      .orderBy(desc(presenterContacts.optedInAt));
    return rows;
  }

  async getOptInStatus(presenterUserId: number, memberUserId: number): Promise<boolean> {
    const [row] = await db
      .select({ active: presenterContacts.active })
      .from(presenterContacts)
      .where(and(eq(presenterContacts.presenterUserId, presenterUserId), eq(presenterContacts.memberUserId, memberUserId)));
    return row?.active === true;
  }

  async getPresenterByUsername(username: string): Promise<{ userId: number; displayName: string | null; username: string; avatarUrl: string | null; subscriptionTier: string } | null> {
    const [row] = await db
      .select({
        userId: providerProfiles.userId,
        displayName: providerProfiles.displayName,
        username: providerProfiles.username,
        avatarUrl: providerProfiles.avatarUrl,
        subscriptionTier: users.subscriptionTier,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(users.id, providerProfiles.userId))
      .where(eq(providerProfiles.username, username));
    if (!row) return null;
    return row;
  }

  async updateSubscriptionTier(userId: number, tier: string): Promise<void> {
    await db
      .update(users)
      .set({ subscriptionTier: tier as any })
      .where(eq(users.id, userId));
  }

  // ── Card Messages ──────────────────────────────────────────────────────────

  async createCardMessage(data: { fromUserId: number; toUserId: number; gignessCardId: number; messageText?: string | null; emojiReaction?: string | null; isClean: boolean }): Promise<CardMessage> {
    const [msg] = await db
      .insert(cardMessages)
      .values({
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        gignessCardId: data.gignessCardId,
        messageText: data.messageText ?? null,
        emojiReaction: data.emojiReaction ?? null,
        isClean: data.isClean,
      })
      .returning();
    return msg;
  }

  async getCardMessages(toUserId: number): Promise<CardMessage[]> {
    return db
      .select()
      .from(cardMessages)
      .where(eq(cardMessages.toUserId, toUserId))
      .orderBy(sql`${cardMessages.createdAt} DESC`);
  }

  async deleteCardMessage(id: number, toUserId: number): Promise<void> {
    await db.delete(cardMessages).where(and(eq(cardMessages.id, id), eq(cardMessages.toUserId, toUserId)));
  }

  async bulkDeleteCardMessages(ids: number[], toUserId: number): Promise<void> {
    if (!ids.length) return;
    await db.delete(cardMessages).where(and(inArray(cardMessages.id, ids), eq(cardMessages.toUserId, toUserId)));
  }

  async createGignessComment(data: { cardId: number; authorUserId?: number | null; authorName: string; commentText: string; isClean: boolean }): Promise<GignessCardComment> {
    const [comment] = await db
      .insert(gignessCardComments)
      .values({
        cardId: data.cardId,
        authorUserId: data.authorUserId ?? null,
        authorName: data.authorName,
        commentText: data.commentText,
        isClean: data.isClean,
      })
      .returning();
    return comment;
  }

  async getGignessComments(cardId: number): Promise<GignessCardComment[]> {
    return db
      .select()
      .from(gignessCardComments)
      .where(and(eq(gignessCardComments.cardId, cardId), eq(gignessCardComments.isClean, true)))
      .orderBy(desc(gignessCardComments.createdAt))
      .limit(50);
  }

  async createListingComment(data: { listingId: number; authorUserId?: number | null; authorName: string; commentText: string; viewerUsername?: string | null; viewerEmail?: string | null; viewerCity?: string | null; viewerState?: string | null; viewerCountry?: string | null }): Promise<ListingComment> {
    const [comment] = await db
      .insert(listingComments)
      .values({
        listingId: data.listingId,
        authorUserId: data.authorUserId ?? null,
        authorName: data.authorName,
        commentText: data.commentText,
        isClean: true,
        viewerUsername: data.viewerUsername ?? null,
        viewerEmail: data.viewerEmail ?? null,
        viewerCity: data.viewerCity ?? null,
        viewerState: data.viewerState ?? null,
        viewerCountry: data.viewerCountry ?? null,
      })
      .returning();
    return comment;
  }

  async getListingComments(listingId: number): Promise<ListingComment[]> {
    return db
      .select()
      .from(listingComments)
      .where(and(eq(listingComments.listingId, listingId), eq(listingComments.isClean, true)))
      .orderBy(desc(listingComments.createdAt))
      .limit(100);
  }

  async getListingCommentsByProvider(providerUserId: number): Promise<(ListingComment & { listingTitle: string | null })[]> {
    const [profile] = await db.select({ id: providerProfiles.id }).from(providerProfiles).where(eq(providerProfiles.userId, providerUserId)).limit(1);
    if (!profile) return [];
    const myListings = await db.select({ id: videoListings.id, title: videoListings.title }).from(videoListings).where(eq(videoListings.providerId, profile.id));
    if (!myListings.length) return [];
    const listingIds = myListings.map((l) => l.id);
    const titleMap = new Map(myListings.map((l) => [l.id, l.title]));
    const comments = await db
      .select()
      .from(listingComments)
      .where(and(inArray(listingComments.listingId, listingIds), eq(listingComments.isClean, true)))
      .orderBy(desc(listingComments.createdAt))
      .limit(200);
    return comments.map((c) => ({ ...c, listingTitle: titleMap.get(c.listingId) ?? null }));
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
        offerDurationMinutes: data.offerDurationMinutes ?? 60,
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

  async getSlotAvailability(date: string, nowMs?: number, tzOffset?: number): Promise<TimeSlot[]> {
    // tzOffset: minutes west of UTC (JS getTimezoneOffset() convention)
    // e.g. MST = 420 means UTC-7; UTC = local + tzOffset minutes
    const offsetMs = (tzOffset ?? 0) * 60 * 1000;

    // Query the full UTC day — add a generous buffer for any timezone
    const dayStart = new Date(new Date(`${date}T00:00:00Z`).getTime() - 14 * 60 * 60 * 1000);
    const dayEnd = new Date(new Date(`${date}T23:59:59Z`).getTime() + 14 * 60 * 60 * 1000);

    const rows = await db
      .select({ scheduledAt: gigJacks.scheduledAt, status: gigJacks.status })
      .from(gigJacks)
      .where(and(gte(gigJacks.scheduledAt, dayStart), lte(gigJacks.scheduledAt, dayEnd)));

    const approvedTimes: Date[] = [];
    // Track approved count by LOCAL hour
    const approvedPerLocalHour = new Map<number, number>();
    for (const row of rows) {
      if (row.scheduledAt && row.status === "APPROVED") {
        const d = new Date(row.scheduledAt);
        approvedTimes.push(d);
        // Convert UTC to local hour
        const localMs = d.getTime() - offsetMs;
        const localH = new Date(localMs).getUTCHours();
        approvedPerLocalHour.set(localH, (approvedPerLocalHour.get(localH) ?? 0) + 1);
      }
    }

    const slots: TimeSlot[] = [];
    const now = nowMs ? new Date(nowMs) : new Date();

    // Generate slots in LOCAL hours (0–23 local)
    for (let localH = 0; localH <= 23; localH++) {
      for (let m = 0; m < 60; m += 15) {
        // Convert local h:m to UTC for this date
        const localMs = new Date(`${date}T${String(localH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`).getTime() + offsetMs;
        const slotDt = new Date(localMs);
        if (slotDt <= now) continue;

        const h = localH;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const period = h < 12 ? "AM" : "PM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;
        const approvedInHour = approvedPerLocalHour.get(h) ?? 0;

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

    if (data.offerDurationMinutes !== undefined) {
      setData.offerDurationMinutes = data.offerDurationMinutes;
    }

    if (data.flashDurationSeconds !== undefined) {
      setData.flashDurationSeconds = data.flashDurationSeconds;
    }

    const [gj] = await db.update(gigJacks).set(setData).where(eq(gigJacks.id, id)).returning();
    return { gj };
  }

  async getLiveGigJackState(): Promise<GigJackLiveState> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const rows = await db
      .select()
      .from(gigJacks)
      .where(
        and(
          eq(gigJacks.status, "APPROVED"),
          lte(gigJacks.scheduledAt, now),
          gte(gigJacks.scheduledAt, todayStart)
        )
      )
      .orderBy(sql`${gigJacks.scheduledAt} DESC`)
      .limit(5);

    for (const row of rows) {
      if (!row.scheduledAt) continue;
      const displayState = row.displayState as string;

      if (displayState === "expired" || displayState === "removed") continue;

      if (displayState === "hidden") {
        const [updated] = await db
          .update(gigJacks)
          .set({ displayState: "flash", flashStartedAt: now, updatedAt: now })
          .where(eq(gigJacks.id, row.id))
          .returning();
        const enriched = await this.enrichGigJacks([updated]);
        return {
          phase: "flash",
          gj: enriched[0] ?? null,
          flashSecondsRemaining: updated.flashDurationSeconds ?? 7,
          offerEndsAt: null,
        };
      }

      if (displayState === "flash") {
        const flashStart = row.flashStartedAt ? new Date(row.flashStartedAt) : new Date(row.scheduledAt);
        const elapsed = (now.getTime() - flashStart.getTime()) / 1000;
        const flashDuration = row.flashDurationSeconds ?? 7;
        if (elapsed >= flashDuration) {
          const offerDuration = (row.offerDurationMinutes ?? 60) * 60 * 1000;
          const offerEndsAt = new Date(now.getTime() + offerDuration);
          const [updated] = await db
            .update(gigJacks)
            .set({ displayState: "siren", flashEndedAt: now, offerStartedAt: now, offerEndsAt, updatedAt: now })
            .where(eq(gigJacks.id, row.id))
            .returning();
          const enriched = await this.enrichGigJacks([updated]);
          return {
            phase: "siren",
            gj: enriched[0] ?? null,
            flashSecondsRemaining: null,
            offerEndsAt: offerEndsAt.toISOString(),
          };
        }
        const enriched = await this.enrichGigJacks([row]);
        return {
          phase: "flash",
          gj: enriched[0] ?? null,
          flashSecondsRemaining: Math.max(0, Math.ceil(flashDuration - elapsed)),
          offerEndsAt: null,
        };
      }

      if (displayState === "siren") {
        const offerEndsAt = row.offerEndsAt ? new Date(row.offerEndsAt) : null;
        if (offerEndsAt && now >= offerEndsAt) {
          const [updated] = await db
            .update(gigJacks)
            .set({ displayState: "expired", completedAt: now, updatedAt: now })
            .where(eq(gigJacks.id, row.id))
            .returning();
          const enriched = await this.enrichGigJacks([updated]);
          return { phase: "expired", gj: enriched[0] ?? null, flashSecondsRemaining: null, offerEndsAt: null };
        }
        const enriched = await this.enrichGigJacks([row]);
        return {
          phase: "siren",
          gj: enriched[0] ?? null,
          flashSecondsRemaining: null,
          offerEndsAt: offerEndsAt ? offerEndsAt.toISOString() : null,
        };
      }
    }

    return { phase: "hidden", gj: null, flashSecondsRemaining: null, offerEndsAt: null };
  }

  async getTodaysGigJacks(): Promise<TodayGigJack[]> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select()
      .from(gigJacks)
      .where(
        and(
          eq(gigJacks.status, "APPROVED"),
          gte(gigJacks.scheduledAt, todayStart),
          lte(gigJacks.scheduledAt, todayEnd),
          sql`${gigJacks.displayState} IN ('flash', 'siren', 'expired')`
        )
      )
      .orderBy(sql`${gigJacks.scheduledAt} ASC`);

    const enriched = await this.enrichGigJacks(rows);
    return enriched.map((gj) => ({
      id: gj.id,
      offerTitle: gj.offerTitle,
      artworkUrl: gj.artworkUrl,
      ctaLink: gj.ctaLink,
      category: gj.category,
      displayName: gj.provider?.displayName ?? gj.provider?.username ?? "Unknown",
      scheduledAt: gj.scheduledAt ? gj.scheduledAt.toISOString() : null,
      displayState: gj.displayState as any,
      offerEndsAt: gj.offerEndsAt ? gj.offerEndsAt.toISOString() : null,
    }));
  }

  async forceExpireGigJack(id: number, adminUserId?: number): Promise<void> {
    const now = new Date();
    await db
      .update(gigJacks)
      .set({ displayState: "expired", completedAt: now, updatedAt: now })
      .where(eq(gigJacks.id, id));
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

  async getInjectedFeeds(): Promise<InjectedFeed[]> {
    return db.select().from(injectedFeeds).orderBy(desc(injectedFeeds.createdAt));
  }

  async getActiveInjectedFeed(): Promise<InjectedFeed | null> {
    const now = new Date();
    const rows = await db
      .select()
      .from(injectedFeeds)
      .where(eq(injectedFeeds.status, "active"))
      .orderBy(desc(injectedFeeds.createdAt));
    const valid = rows.filter((f) => {
      if (f.endsAt && f.endsAt < now) return false;
      if (f.startsAt && f.startsAt > now) return false;
      return true;
    });
    return valid[0] ?? null;
  }

  async createInjectedFeed(data: CreateInjectedFeedRequest & { createdBy?: number }): Promise<InjectedFeed> {
    const [row] = await db.insert(injectedFeeds).values({
      platform: data.platform,
      sourceUrl: data.sourceUrl,
      displayTitle: data.displayTitle ?? null,
      category: data.category ?? null,
      injectMode: data.injectMode,
      status: data.status ?? "inactive",
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      createdBy: data.createdBy ?? null,
    }).returning();
    return row;
  }

  async updateInjectedFeed(id: number, data: UpdateInjectedFeedRequest): Promise<InjectedFeed | undefined> {
    const updates: Partial<typeof injectedFeeds.$inferInsert> = { updatedAt: new Date() };
    if (data.platform !== undefined) updates.platform = data.platform;
    if (data.sourceUrl !== undefined) updates.sourceUrl = data.sourceUrl;
    if (data.displayTitle !== undefined) updates.displayTitle = data.displayTitle ?? null;
    if (data.category !== undefined) updates.category = data.category ?? null;
    if (data.injectMode !== undefined) updates.injectMode = data.injectMode;
    if (data.status !== undefined) updates.status = data.status;
    if (data.startsAt !== undefined) updates.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) updates.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    const [row] = await db.update(injectedFeeds).set(updates).where(eq(injectedFeeds.id, id)).returning();
    return row;
  }

  async deleteInjectedFeed(id: number): Promise<void> {
    await db.delete(injectedFeeds).where(eq(injectedFeeds.id, id));
  }

  async toggleVideoLike(videoId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    const existing = await db.select().from(videoLikes).where(
      and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId))
    );
    if (existing.length > 0) {
      await db.delete(videoLikes).where(
        and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId))
      );
      const [updated] = await db.update(videoListings)
        .set({ likeCount: sql`GREATEST(like_count - 1, 0)` })
        .where(eq(videoListings.id, videoId))
        .returning({ likeCount: videoListings.likeCount });
      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    } else {
      await db.insert(videoLikes).values({ videoId, userId });
      const [updated] = await db.update(videoListings)
        .set({ likeCount: sql`like_count + 1` })
        .where(eq(videoListings.id, videoId))
        .returning({ likeCount: videoListings.likeCount });
      return { liked: true, likeCount: updated?.likeCount ?? 0 };
    }
  }

  async getVideoLikeStatus(videoId: number, userId: number | null): Promise<{ likeCount: number; isLiked: boolean }> {
    const [listing] = await db.select({ likeCount: videoListings.likeCount }).from(videoListings).where(eq(videoListings.id, videoId));
    if (!listing) return { likeCount: 0, isLiked: false };
    if (!userId) return { likeCount: listing.likeCount, isLiked: false };
    const [like] = await db.select().from(videoLikes).where(
      and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId))
    );
    return { likeCount: listing.likeCount, isLiked: !!like };
  }

  async getBatchVideoLikeStatus(videoIds: number[], userId: number | null): Promise<Record<number, boolean>> {
    const result: Record<number, boolean> = {};
    for (const id of videoIds) result[id] = false;
    if (!userId || videoIds.length === 0) return result;
    const likes = await db.select({ videoId: videoLikes.videoId })
      .from(videoLikes)
      .where(and(inArray(videoLikes.videoId, videoIds), eq(videoLikes.userId, userId)));
    for (const like of likes) result[like.videoId] = true;
    return result;
  }

  async getProviderTotalLikes(providerId: number): Promise<number> {
    const [result] = await db.select({ total: sql<number>`COALESCE(SUM(like_count), 0)` })
      .from(videoListings)
      .where(eq(videoListings.providerId, providerId));
    return Number(result?.total ?? 0);
  }

  async castLoveVote(voterUserId: number, providerId: number, monthKey: string): Promise<{ success: boolean; alreadyVoted: boolean }> {
    try {
      await db.insert(loveVotes).values({ voterUserId, providerId, monthKey });
      return { success: true, alreadyVoted: false };
    } catch {
      return { success: false, alreadyVoted: true };
    }
  }

  async getLoveVoteStatus(voterUserId: number | null, providerId: number, monthKey: string): Promise<{ voteCount: number; hasVoted: boolean }> {
    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(loveVotes)
      .where(and(eq(loveVotes.providerId, providerId), eq(loveVotes.monthKey, monthKey)));
    const voteCount = Number(countResult?.count ?? 0);
    if (!voterUserId) return { voteCount, hasVoted: false };
    const [existing] = await db.select().from(loveVotes)
      .where(and(eq(loveVotes.voterUserId, voterUserId), eq(loveVotes.monthKey, monthKey)));
    return { voteCount, hasVoted: !!existing };
  }

  async getLoveLeaderboard(monthKey: string): Promise<import("@shared/schema").LoveLeaderboardEntry[]> {
    const rows = await db.select({
      providerId: loveVotes.providerId,
      displayName: providerProfiles.displayName,
      avatarUrl: providerProfiles.avatarUrl,
      username: providerProfiles.username,
      voteCount: sql<number>`COUNT(*)`,
    })
      .from(loveVotes)
      .innerJoin(providerProfiles, eq(loveVotes.providerId, providerProfiles.id))
      .where(eq(loveVotes.monthKey, monthKey))
      .groupBy(loveVotes.providerId, providerProfiles.displayName, providerProfiles.avatarUrl, providerProfiles.username)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);
    return rows.map(r => ({ ...r, voteCount: Number(r.voteCount) }));
  }

  // ── All Eyes On Me ─────────────────────────────────────────────────────────

  private async enrichAllEyesSlot(slot: AllEyesSlot): Promise<AllEyesSlotWithProvider> {
    const [provider] = await db.select().from(providerProfiles).where(eq(providerProfiles.id, slot.providerId));
    let videoListing = undefined;
    if (slot.videoListingId) {
      const [vl] = await db.select().from(videoListings).where(eq(videoListings.id, slot.videoListingId));
      videoListing = vl ?? null;
    }
    return { ...slot, provider, videoListing };
  }

  async bookAllEyesSlot(providerId: number, userId: number, data: BookAllEyesRequest): Promise<{ slot?: AllEyesSlot; error?: string }> {
    const startAt = new Date(data.startAt);
    const endAt = new Date(startAt.getTime() + data.durationMinutes * 60 * 1000);

    const PRICES: Record<number, number> = { 15: 1000, 30: 2000, 60: 2500 };
    const priceCents = PRICES[data.durationMinutes] ?? 1500;

    const [conflict] = await db.select({ id: allEyesSlots.id })
      .from(allEyesSlots)
      .where(and(
        ne(allEyesSlots.status, "cancelled"),
        ne(allEyesSlots.status, "ended"),
        lte(allEyesSlots.startAt, endAt),
        gte(allEyesSlots.endAt, startAt),
      ));

    if (conflict) return { error: "That time slot is already booked. Please choose a different time." };

    const [slot] = await db.insert(allEyesSlots).values({
      providerId,
      videoListingId: data.videoListingId ?? null,
      customTitle: data.customTitle ?? null,
      durationMinutes: data.durationMinutes,
      startAt,
      endAt,
      status: "scheduled",
      priceCents,
      createdBy: userId,
    }).returning();

    return { slot };
  }

  async getActiveAllEyesSlot(): Promise<AllEyesSlotWithProvider | null> {
    const now = new Date();
    const [slot] = await db.select().from(allEyesSlots)
      .where(and(
        ne(allEyesSlots.status, "cancelled"),
        ne(allEyesSlots.status, "ended"),
        lte(allEyesSlots.startAt, now),
        gte(allEyesSlots.endAt, now),
      ))
      .orderBy(allEyesSlots.startAt)
      .limit(1);
    if (!slot) return null;
    return this.enrichAllEyesSlot(slot);
  }

  async getUpcomingAllEyesSlots(): Promise<AllEyesSlotWithProvider[]> {
    const now = new Date();
    const slots = await db.select().from(allEyesSlots)
      .where(and(
        ne(allEyesSlots.status, "cancelled"),
        ne(allEyesSlots.status, "ended"),
        gte(allEyesSlots.endAt, now),
      ))
      .orderBy(allEyesSlots.startAt)
      .limit(20);
    return Promise.all(slots.map(s => this.enrichAllEyesSlot(s)));
  }

  async getAllAllEyesSlots(): Promise<AllEyesSlotWithProvider[]> {
    const slots = await db.select().from(allEyesSlots)
      .orderBy(desc(allEyesSlots.createdAt))
      .limit(100);
    return Promise.all(slots.map(s => this.enrichAllEyesSlot(s)));
  }

  async cancelAllEyesSlot(id: number): Promise<void> {
    await db.update(allEyesSlots).set({ status: "cancelled" }).where(eq(allEyesSlots.id, id));
  }

  // ── ZitoTV ─────────────────────────────────────────────────────────────────

  private async enrichZitoTVEvent(event: ZitoTVEvent): Promise<ZitoTVEventWithHost> {
    let host = null;
    if (event.hostUserId) {
      const [profile] = await db.select({
        displayName: providerProfiles.displayName,
        avatarUrl: providerProfiles.avatarUrl,
        username: providerProfiles.username,
      }).from(providerProfiles).where(eq(providerProfiles.userId, event.hostUserId));
      host = profile ?? null;
    }
    return { ...event, host };
  }

  async createZitoTVEvent(userId: number, data: CreateZitoTVEventRequest): Promise<ZitoTVEvent> {
    const startAt = new Date(data.startAt);
    const endAt = new Date(startAt.getTime() + data.durationMinutes * 60 * 1000);
    const [event] = await db.insert(zitoTvEvents).values({
      title: data.title,
      description: data.description ?? null,
      hostName: data.hostName,
      hostUserId: userId,
      category: data.category,
      liveUrl: data.liveUrl ?? null,
      ctaUrl: data.ctaUrl ?? null,
      durationMinutes: data.durationMinutes,
      startAt,
      endAt,
      status: "scheduled",
      createdBy: userId,
    }).returning();
    return event;
  }

  async getZitoTVEvents(opts?: { from?: Date; to?: Date }): Promise<ZitoTVEventWithHost[]> {
    const conditions = [ne(zitoTvEvents.status, "cancelled")];
    if (opts?.from) conditions.push(gte(zitoTvEvents.startAt, opts.from));
    if (opts?.to) conditions.push(lte(zitoTvEvents.startAt, opts.to));
    const events = await db.select().from(zitoTvEvents)
      .where(and(...conditions))
      .orderBy(zitoTvEvents.startAt);
    return Promise.all(events.map(e => this.enrichZitoTVEvent(e)));
  }

  async getZitoTVEvent(id: number): Promise<ZitoTVEventWithHost | null> {
    const [event] = await db.select().from(zitoTvEvents).where(eq(zitoTvEvents.id, id));
    if (!event) return null;
    return this.enrichZitoTVEvent(event);
  }

  async updateZitoTVEvent(id: number, data: Partial<CreateZitoTVEventRequest & { status: string }>): Promise<ZitoTVEvent> {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.hostName !== undefined) updates.hostName = data.hostName;
    if (data.category !== undefined) updates.category = data.category;
    if (data.liveUrl !== undefined) updates.liveUrl = data.liveUrl;
    if (data.ctaUrl !== undefined) updates.ctaUrl = data.ctaUrl;
    if (data.durationMinutes !== undefined) updates.durationMinutes = data.durationMinutes;
    if (data.startAt !== undefined) {
      const startAt = new Date(data.startAt);
      updates.startAt = startAt;
      updates.endAt = new Date(startAt.getTime() + (data.durationMinutes ?? 60) * 60 * 1000);
    }
    if (data.status !== undefined) updates.status = data.status;
    const [event] = await db.update(zitoTvEvents).set(updates).where(eq(zitoTvEvents.id, id)).returning();
    return event;
  }

  async deleteZitoTVEvent(id: number): Promise<void> {
    await db.delete(zitoTvEvents).where(eq(zitoTvEvents.id, id));
  }

  // ── Sponsor Ads ─────────────────────────────────────────────────────────────
  async getSponsorAdById(id: number): Promise<SponsorAd | undefined> {
    const [ad] = await db.select().from(sponsorAds).where(eq(sponsorAds.id, id)).limit(1);
    return ad;
  }

  async getSponsorAds(): Promise<SponsorAd[]> {
    return db.select().from(sponsorAds).orderBy(sponsorAds.sortOrder, sponsorAds.createdAt);
  }

  async getActiveSponsorAds(): Promise<SponsorAd[]> {
    return db.select().from(sponsorAds)
      .where(eq(sponsorAds.active, true))
      .orderBy(sponsorAds.sortOrder, sponsorAds.createdAt);
  }

  async createSponsorAd(data: InsertSponsorAd): Promise<SponsorAd> {
    const [ad] = await db.insert(sponsorAds).values({ ...data, updatedAt: new Date() }).returning();
    return ad;
  }

  async updateSponsorAd(id: number, data: Partial<InsertSponsorAd>): Promise<SponsorAd> {
    const [ad] = await db.update(sponsorAds).set({ ...data, updatedAt: new Date() }).where(eq(sponsorAds.id, id)).returning();
    return ad;
  }

  async toggleSponsorAd(id: number, active: boolean): Promise<SponsorAd> {
    const [ad] = await db.update(sponsorAds).set({ active, updatedAt: new Date() }).where(eq(sponsorAds.id, id)).returning();
    return ad;
  }

  async deleteSponsorAd(id: number): Promise<void> {
    await db.delete(sponsorAds).where(eq(sponsorAds.id, id));
  }

  async createAdInquiry(data: { adId: number; advertiserUsername?: string; viewerName: string; viewerEmail?: string; viewerMessage: string; viewerUsername?: string; viewerCity?: string; viewerState?: string; viewerCountry?: string }): Promise<AdInquiry> {
    const [inquiry] = await db.insert(adInquiries).values(data).returning();
    return inquiry;
  }

  async getAdInquiries(advertiserUsername: string): Promise<AdInquiry[]> {
    return db.select().from(adInquiries)
      .where(eq(adInquiries.advertiserUsername, advertiserUsername))
      .orderBy(desc(adInquiries.createdAt));
  }

  async markAdInquiryRead(id: number): Promise<void> {
    await db.update(adInquiries).set({ isRead: true }).where(eq(adInquiries.id, id));
  }

  async deleteAdInquiry(id: number, advertiserUsername: string): Promise<void> {
    await db.delete(adInquiries).where(and(eq(adInquiries.id, id), eq(adInquiries.advertiserUsername, advertiserUsername)));
  }

  async bulkDeleteAdInquiries(ids: number[], advertiserUsername: string): Promise<void> {
    if (!ids.length) return;
    await db.delete(adInquiries).where(and(inArray(adInquiries.id, ids), eq(adInquiries.advertiserUsername, advertiserUsername)));
  }

  async bulkDeleteListingComments(ids: number[], providerUserId: number): Promise<void> {
    if (!ids.length) return;
    const [profile] = await db.select({ id: providerProfiles.id }).from(providerProfiles).where(eq(providerProfiles.userId, providerUserId)).limit(1);
    if (!profile) return;
    const myListingIds = await db.select({ id: videoListings.id }).from(videoListings).where(eq(videoListings.providerId, profile.id));
    const listingIds = myListingIds.map((l) => l.id);
    if (!listingIds.length) return;
    await db.delete(listingComments).where(and(inArray(listingComments.id, ids), inArray(listingComments.listingId, listingIds)));
  }

  async markListingCommentRead(id: number): Promise<void> {
    await db.update(listingComments).set({ isRead: true }).where(eq(listingComments.id, id));
  }

  async deleteListingComment(id: number, providerUserId: number): Promise<void> {
    const [profile] = await db.select({ id: providerProfiles.id }).from(providerProfiles).where(eq(providerProfiles.userId, providerUserId)).limit(1);
    if (!profile) return;
    const myListingIds = await db.select({ id: videoListings.id }).from(videoListings).where(eq(videoListings.providerId, profile.id));
    const ids = myListingIds.map((l) => l.id);
    if (!ids.length) return;
    await db.delete(listingComments).where(and(eq(listingComments.id, id), inArray(listingComments.listingId, ids)));
  }

  async markCardMessageRead(id: number): Promise<void> {
    await db.update(cardMessages).set({ isRead: true }).where(eq(cardMessages.id, id));
  }

  async getAdsForDate(date: string): Promise<SponsorAd[]> {
    const bookings = await db
      .select({ sponsorAdId: adBookings.sponsorAdId })
      .from(adBookings)
      .where(and(eq(adBookings.bookingDate, date), eq(adBookings.status, "confirmed")));
    const adIds = bookings.map((b) => b.sponsorAdId).filter((id): id is number => id !== null);
    if (adIds.length === 0) {
      return db.select().from(sponsorAds).where(eq(sponsorAds.active, true)).orderBy(sponsorAds.sortOrder);
    }
    return db.select().from(sponsorAds).where(and(inArray(sponsorAds.id, adIds), eq(sponsorAds.active, true))).orderBy(sponsorAds.sortOrder);
  }

  async getBookingsForDate(date: string): Promise<AdBookingWithAd[]> {
    const rows = await db.select().from(adBookings).where(eq(adBookings.bookingDate, date)).orderBy(adBookings.slotNumber);
    return Promise.all(rows.map(async (b) => {
      const ad = b.sponsorAdId ? (await db.select().from(sponsorAds).where(eq(sponsorAds.id, b.sponsorAdId)))[0] ?? null : null;
      return { ...b, ad };
    }));
  }

  async getAvailabilityForRange(startDate: string, endDate: string): Promise<Record<string, number[]>> {
    const rows = await db
      .select({ bookingDate: adBookings.bookingDate, slotNumber: adBookings.slotNumber })
      .from(adBookings)
      .where(and(gte(adBookings.bookingDate, startDate), lte(adBookings.bookingDate, endDate), eq(adBookings.status, "confirmed")));
    const result: Record<string, number[]> = {};
    for (const row of rows) {
      if (!result[row.bookingDate]) result[row.bookingDate] = [];
      result[row.bookingDate].push(row.slotNumber);
    }
    return result;
  }

  async createAdBooking(data: InsertAdBooking): Promise<AdBooking> {
    const [booking] = await db.insert(adBookings).values(data).returning();
    return booking;
  }

  async updateAdBookingStatus(id: number, status: string): Promise<AdBooking> {
    const [booking] = await db.update(adBookings).set({ status }).where(eq(adBookings.id, id)).returning();
    return booking;
  }

  async getAdBookings(): Promise<AdBookingWithAd[]> {
    const rows = await db.select().from(adBookings).orderBy(desc(adBookings.createdAt));
    return Promise.all(rows.map(async (b) => {
      const ad = b.sponsorAdId ? (await db.select().from(sponsorAds).where(eq(sponsorAds.id, b.sponsorAdId)))[0] ?? null : null;
      return { ...b, ad };
    }));
  }

  async deleteAdBooking(id: number): Promise<void> {
    await db.delete(adBookings).where(eq(adBookings.id, id));
  }

  // ─── Audience Broadcasts ───────────────────────────────────────────────────
  async createAudienceBroadcast(data: { providerUserId: number; subject: string; body: string; recipientCount: number }): Promise<AudienceBroadcast> {
    const [row] = await db.insert(audienceBroadcasts).values(data).returning();
    return row;
  }

  async getAudienceBroadcasts(providerUserId: number): Promise<AudienceBroadcast[]> {
    return db.select().from(audienceBroadcasts)
      .where(eq(audienceBroadcasts.providerUserId, providerUserId))
      .orderBy(desc(audienceBroadcasts.sentAt));
  }

  // ─── Geo Target Campaigns ──────────────────────────────────────────────────
  async createGeoTargetCampaign(data: { providerUserId: number; title: string; offer: string; radiusMiles: number; city?: string | null; state?: string | null; country: string; lat?: string | null; lng?: string | null; imageUrl?: string | null }): Promise<GeoTargetCampaign> {
    const [row] = await db.insert(geoTargetCampaigns).values(data).returning();
    return row;
  }

  async getGeoTargetCampaignsByProvider(providerUserId: number): Promise<GeoTargetCampaign[]> {
    return db.select().from(geoTargetCampaigns)
      .where(eq(geoTargetCampaigns.providerUserId, providerUserId))
      .orderBy(desc(geoTargetCampaigns.createdAt));
  }

  async updateGeoTargetCampaignStatus(id: number, providerUserId: number, status: "ACTIVE" | "PAUSED" | "ENDED"): Promise<GeoTargetCampaign> {
    const [row] = await db.update(geoTargetCampaigns)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(geoTargetCampaigns.id, id), eq(geoTargetCampaigns.providerUserId, providerUserId)))
      .returning();
    return row;
  }

  async getAllGeoTargetCampaigns(): Promise<GeoTargetCampaign[]> {
    return db.select().from(geoTargetCampaigns).orderBy(desc(geoTargetCampaigns.createdAt));
  }

  async createZeeMotion(userId: number, data: { text?: string | null; mediaUrl?: string | null; mediaType?: string | null }): Promise<ZeeMotion> {
    const [row] = await db.insert(zeeMotions).values({ userId, ...data }).returning();
    return row;
  }

  async getMyZeeMotions(userId: number): Promise<ZeeMotion[]> {
    return db.select().from(zeeMotions).where(eq(zeeMotions.userId, userId)).orderBy(desc(zeeMotions.createdAt)).limit(20);
  }

  async getUserZeeMotions(userId: number): Promise<ZeeMotion[]> {
    return db.select().from(zeeMotions).where(eq(zeeMotions.userId, userId)).orderBy(desc(zeeMotions.createdAt)).limit(50);
  }

  async createZeeMotionComment(data: { motionId: number; authorUserId: number | null; authorName: string; commentText: string }): Promise<ZeeMotionComment> {
    const [row] = await db.insert(zeeMotionComments).values(data).returning();
    return row;
  }

  async getZeeMotionComments(motionId: number): Promise<ZeeMotionComment[]> {
    return db.select().from(zeeMotionComments).where(eq(zeeMotionComments.motionId, motionId)).orderBy(zeeMotionComments.createdAt);
  }

  async deleteZeeMotion(id: number, userId: number): Promise<void> {
    await db.delete(zeeMotions).where(and(eq(zeeMotions.id, id), eq(zeeMotions.userId, userId)));
  }

  async getZeeMotionFeed(userId: number): Promise<(ZeeMotion & { username: string | null; displayName: string | null; avatarUrl: string | null })[]> {
    const followingIds = await this.getFollowingIds(userId);
    if (!followingIds.length) return [];
    const rows = await db
      .select({
        id: zeeMotions.id,
        userId: zeeMotions.userId,
        text: zeeMotions.text,
        mediaUrl: zeeMotions.mediaUrl,
        mediaType: zeeMotions.mediaType,
        createdAt: zeeMotions.createdAt,
        username: providerProfiles.username,
        displayName: providerProfiles.displayName,
        avatarUrl: providerProfiles.avatarUrl,
      })
      .from(zeeMotions)
      .leftJoin(providerProfiles, eq(providerProfiles.userId, zeeMotions.userId))
      .where(inArray(zeeMotions.userId, followingIds))
      .orderBy(desc(zeeMotions.createdAt))
      .limit(50);
    return rows;
  }

  async followUser(followerId: number, followingUserId: number): Promise<void> {
    await db.insert(geezeeFollows).values({ followerId, followingUserId }).onConflictDoNothing();
  }

  async getGeeZeeEngageLeaderboard(limit = 20): Promise<{ userId: number; displayName: string | null; avatarUrl: string | null; username: string | null; engagementCount: number }[]> {
    const rows = await db
      .select({
        userId: gignessCards.userId,
        engagementCount: gignessCards.engagementCount,
        displayName: providerProfiles.displayName,
        avatarUrl: providerProfiles.avatarUrl,
        username: providerProfiles.username,
      })
      .from(gignessCards)
      .leftJoin(providerProfiles, eq(providerProfiles.userId, gignessCards.userId))
      .where(eq(gignessCards.isPublic, true))
      .orderBy(sql`${gignessCards.engagementCount} DESC`)
      .limit(limit);
    return rows.map(r => ({
      userId: r.userId,
      engagementCount: r.engagementCount,
      displayName: r.displayName ?? null,
      avatarUrl: r.avatarUrl ?? null,
      username: r.username ?? null,
    }));
  }

  async unfollowUser(followerId: number, followingUserId: number): Promise<void> {
    await db.delete(geezeeFollows).where(and(eq(geezeeFollows.followerId, followerId), eq(geezeeFollows.followingUserId, followingUserId)));
  }

  async isFollowing(followerId: number, followingUserId: number): Promise<boolean> {
    const [row] = await db.select().from(geezeeFollows).where(and(eq(geezeeFollows.followerId, followerId), eq(geezeeFollows.followingUserId, followingUserId)));
    return !!row;
  }

  async getFollowingIds(followerId: number): Promise<number[]> {
    const rows = await db.select({ followingUserId: geezeeFollows.followingUserId }).from(geezeeFollows).where(eq(geezeeFollows.followerId, followerId));
    return rows.map((r) => r.followingUserId);
  }

  async getFollowerCount(userId: number): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(geezeeFollows).where(eq(geezeeFollows.followingUserId, userId));
    return row?.count ?? 0;
  }
}

export const storage = new DatabaseStorage();
