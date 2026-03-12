import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, serial, date, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const roleEnum = pgEnum("role", ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "SUPERUSER", "ADMIN", "SUPER_ADMIN", "COORDINATOR"]);
export const verticalEnum = pgEnum("vertical", [
  "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
  "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
  "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS",
]);
export const listingStatusEnum = pgEnum("listing_status", ["PENDING", "ACTIVE", "PAUSED", "REMOVED", "TRIAGED"]);
export const gigJackStatusEnum = pgEnum("gig_jack_status", ["PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_IMPROVEMENT", "DENIED"]);

// === TABLES ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("VISITOR"),
  status: text("status").notNull().default("active"),
  disclaimerAccepted: boolean("disclaimer_accepted").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const providerProfiles = pgTable("provider_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  thumbUrl: text("thumb_url").notNull().default(""),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactTelegram: text("contact_telegram"),
  websiteUrl: text("website_url"),
  username: text("username"),
  primaryCategory: text("primary_category"),
  location: text("location"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  tiktokUrl: text("tiktok_url"),
  facebookUrl: text("facebook_url"),
  discordUrl: text("discord_url"),
  twitterUrl: text("twitter_url"),
  photo1Url: text("photo1_url"),
  photo2Url: text("photo2_url"),
  photo3Url: text("photo3_url"),
  photo4Url: text("photo4_url"),
  photo5Url: text("photo5_url"),
  photo6Url: text("photo6_url"),
  webhookUrl: text("webhook_url"),
});

export const videoListings = pgTable("video_listings", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  vertical: verticalEnum("vertical").notNull(),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  description: text("description"),
  tags: text("tags").array().notNull().default([]),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  ctaType: text("cta_type"),
  flashSaleEndsAt: timestamp("flash_sale_ends_at"),
  couponCode: text("coupon_code"),
  productPrice: text("product_price"),
  productPurchaseUrl: text("product_purchase_url"),
  productStock: text("product_stock"),
  status: listingStatusEnum("status").notNull().default("ACTIVE"),
  dropDate: date("drop_date").notNull(),
  pricePaidCents: integer("price_paid_cents").notNull().default(300),
  stripeSessionId: text("stripe_session_id"),
  triagedAt: timestamp("triaged_at"),
  triagedBy: integer("triaged_by").references(() => users.id, { onDelete: "set null" }),
  triagedReason: text("triaged_reason"),
  likeCount: integer("like_count").notNull().default(0),
  revealUrl: boolean("reveal_url").notNull().default(true),
  revealEmail: boolean("reveal_email").notNull().default(false),
  revealName: boolean("reveal_name").notNull().default(false),
  collectEmail: boolean("collect_email").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gigJacks = pgTable("gig_jacks", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  companyUrl: text("company_url").notNull(),
  artworkUrl: text("artwork_url").notNull(),
  offerTitle: text("offer_title").notNull(),
  description: text("description").notNull(),
  ctaLink: text("cta_link").notNull(),
  countdownMinutes: integer("countdown_minutes").notNull(),
  couponCode: text("coupon_code"),
  quantityLimit: integer("quantity_limit"),
  tagline: text("tagline"),
  category: text("category"),
  scheduledAt: timestamp("scheduled_at"),
  bookedDate: text("booked_date"),
  bookedHour: integer("booked_hour"),
  flashDurationSeconds: integer("flash_duration_seconds").default(7),
  offerDurationMinutes: integer("offer_duration_minutes").default(10),
  status: gigJackStatusEnum("status").notNull().default("PENDING_REVIEW"),
  displayState: text("display_state").notNull().default("hidden"),
  sirenEnabled: boolean("siren_enabled").notNull().default(true),
  reviewNote: text("review_note"),
  botWarning: boolean("bot_warning").notNull().default(false),
  botWarningMessage: text("bot_warning_message"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),
  deniedAt: timestamp("denied_at"),
  deniedBy: integer("denied_by"),
  removedAt: timestamp("removed_at"),
  removedBy: integer("removed_by"),
  flashStartedAt: timestamp("flash_started_at"),
  flashEndedAt: timestamp("flash_ended_at"),
  offerStartedAt: timestamp("offer_started_at"),
  offerEndsAt: timestamp("offer_ends_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ one }) => ({
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
}));

export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [providerProfiles.userId],
    references: [users.id],
  }),
  listings: many(videoListings),
  gigJacks: many(gigJacks),
}));

export const videoListingsRelations = relations(videoListings, ({ one, many }) => ({
  provider: one(providerProfiles, {
    fields: [videoListings.providerId],
    references: [providerProfiles.id],
  }),
  likes: many(videoLikes),
}));

// === VIDEO LIKES TABLE ===
export const videoLikes = pgTable("video_likes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videoListings.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueVideoUser: unique().on(t.videoId, t.userId),
}));

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
  video: one(videoListings, { fields: [videoLikes.videoId], references: [videoListings.id] }),
  user: one(users, { fields: [videoLikes.userId], references: [users.id] }),
}));

export type VideoLike = typeof videoLikes.$inferSelect;

export const gigJacksRelations = relations(gigJacks, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [gigJacks.providerId],
    references: [providerProfiles.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(providerProfiles).omit({ id: true });
export const insertListingSchema = createInsertSchema(videoListings).omit({ id: true, createdAt: true, updatedAt: true, dropDate: true, pricePaidCents: true, stripeSessionId: true, status: true });
export const insertGigJackSchema = createInsertSchema(gigJacks).omit({ id: true, createdAt: true, updatedAt: true, status: true, displayState: true, reviewNote: true, botWarning: true, botWarningMessage: true, flashStartedAt: true, flashEndedAt: true, offerStartedAt: true, offerEndsAt: true, completedAt: true });

// === API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type VideoListing = typeof videoListings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type GigJack = typeof gigJacks.$inferSelect;
export type InsertGigJack = z.infer<typeof insertGigJackSchema>;

export interface ListingWithProvider extends VideoListing {
  provider: ProviderProfile & { user: User };
}

export interface GigJackWithProvider extends GigJack {
  provider: ProviderProfile & { user: User };
}

export type UserWithProfile = User & { profile: ProviderProfile | null };

export type EditUserProfileRequest = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  contactEmail?: string;
  location?: string;
  primaryCategory?: string;
  username?: string;
};

// Auth types
export type LoginRequest = { email: string; password: string };
export type RegisterRequest = { email: string; password: string };
export type AuthResponse = { user: User; profile: ProviderProfile | null };
export type CurrentUserResponse = { user: User; profile: ProviderProfile | null } | null;

// Profile update
export type UpdateProfileRequest = Partial<Omit<ProviderProfile, "id" | "userId">>;
export type ProfileCompletionStatus = {
  isComplete: boolean;
  missing: string[];
};

export type VerticalKey =
  | "MARKETING" | "COACHING" | "COURSES" | "MUSIC" | "CRYPTO"
  | "INFLUENCER" | "PRODUCTS" | "FLASH_SALE" | "FLASH_COUPON"
  | "MUSIC_GIGS" | "EVENTS" | "CORPORATE_DEALS";

export type CtaType = "Visit Offer" | "Shop Product" | "Join Event" | "Book Service" | "Join Guild";

// Listing submission
export type CreateListingRequest = {
  vertical: VerticalKey;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  description?: string;
  tags?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  ctaType?: CtaType | null;
  flashSaleEndsAt?: string | null;
  couponCode?: string | null;
  productPrice?: string | null;
  productPurchaseUrl?: string | null;
  productStock?: string | null;
};

// === LEADS TABLE ===
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videoListings.id, { onDelete: "cascade" }),
  creatorUserId: integer("creator_user_id").notNull(),
  firstName: text("first_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  videoTitle: text("video_title"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  video: one(videoListings, { fields: [leads.videoId], references: [videoListings.id] }),
}));

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type CreateLeadRequest = {
  videoId: number;
  creatorUserId: number;
  firstName: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  videoTitle?: string | null;
  category?: string | null;
};

// === LIVE SESSIONS TABLE ===
export const liveSessions = pgTable("live_sessions", {
  id: serial("id").primaryKey(),
  creatorUserId: integer("creator_user_id").notNull(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("INFLUENCER"),
  mode: text("mode").notNull().default("external"),
  platform: text("platform"),
  streamUrl: text("stream_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  viewerCount: integer("viewer_count").notNull().default(0),
  tierMinutes: integer("tier_minutes").notNull().default(60),
  tierPriceCents: integer("tier_price_cents").notNull().default(2500),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const liveSessionsRelations = relations(liveSessions, ({ one }) => ({
  provider: one(providerProfiles, { fields: [liveSessions.providerId], references: [providerProfiles.id] }),
}));

export const insertLiveSessionSchema = createInsertSchema(liveSessions).omit({ id: true, startedAt: true, endedAt: true });
export type LiveSession = typeof liveSessions.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;

export type LiveSessionWithProvider = LiveSession & {
  provider: ProviderProfile;
};

export type CreateLiveSessionRequest = {
  title: string;
  category: string;
  mode: "external" | "native";
  streamUrl: string;
  thumbnailUrl?: string;
};

// GigJack submission
export type CreateGigJackRequest = {
  artworkUrl: string;
  offerTitle: string;
  ctaLink: string;
  tagline?: string | null;
  category?: string | null;
  scheduledAt?: string | null;
  flashDurationSeconds?: number | null;
  offerDurationMinutes?: number | null;
  companyUrl?: string;
  description?: string;
  countdownMinutes?: number;
  couponCode?: string | null;
  quantityLimit?: number | null;
};

export type GigJackSlot = {
  dateLabel: string;
  iso: string;
  available: boolean;
};

export type HourSlot = {
  hour: number;
  label: string;
  approvedCount: number;
  pendingCount: number;
  available: boolean;
};

export type TimeSlot = {
  time: string;
  label: string;
  scheduledAt: string;
  available: boolean;
  reason?: string;
  approvedInHour: number;
};

export type SlotAvailabilityResponse = {
  date: string;
  slots: TimeSlot[];
};

export type ReviewGigJackRequest = {
  status: "APPROVED" | "DENIED" | "NEEDS_IMPROVEMENT";
  reviewNote?: string;
};

// Simulated payment
export type SimulatePaymentRequest = { listingData: CreateListingRequest };
export type SimulatePaymentResponse = { success: boolean; listingId: number };

// Daily cap
export type DailyStatsResponse = { date: string; count: number; capReached: boolean; maxCap: number };

// Admin
export type AdminStatsResponse = {
  todayCount: number;
  todayRevenueCents: number;
  capReached: boolean;
  listings: ListingWithProvider[];
};

export type UpdateListingStatusRequest = { status: "ACTIVE" | "PAUSED" | "REMOVED" | "TRIAGED" };
export type TriageListingRequest = { reason: string };

// Filters
export type ListingsFilter = {
  vertical?: VerticalKey | "ALL" | "GIG_BLITZ" | "FLASH_COUPONS" | "INFLUENCERS";
};

// === INJECTED FEEDS TABLE ===
export const injectedFeeds = pgTable("injected_feeds", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // "TikTok" | "Instagram" | "Facebook" | "YouTube"
  sourceUrl: text("source_url").notNull(),
  displayTitle: text("display_title"),
  category: text("category"),
  injectMode: text("inject_mode").notNull().default("fallback"), // "immediate" | "fallback"
  status: text("status").notNull().default("inactive"), // "active" | "inactive"
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInjectedFeedSchema = createInsertSchema(injectedFeeds).omit({ id: true, createdAt: true, updatedAt: true });
export type InjectedFeed = typeof injectedFeeds.$inferSelect;
export type InsertInjectedFeed = z.infer<typeof insertInjectedFeedSchema>;

export type CreateInjectedFeedRequest = {
  platform: string;
  sourceUrl: string;
  displayTitle?: string;
  category?: string;
  injectMode: "immediate" | "fallback";
  status?: "active" | "inactive";
  startsAt?: string | null;
  endsAt?: string | null;
};

export type UpdateInjectedFeedRequest = Partial<CreateInjectedFeedRequest>;

// === AUDIT LOGS TABLE ===
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  usedOverride: boolean("used_override").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

export type CreateAuditLogRequest = {
  actorUserId?: number | null;
  actionType: string;
  targetType: "USER" | "GIGJACK" | "LISTING";
  targetId?: number;
  oldValue?: string;
  newValue?: string;
  usedOverride?: boolean;
};

// === ALL EYES ON ME SLOTS TABLE ===
export const allEyesSlots = pgTable("all_eyes_slots", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  videoListingId: integer("video_listing_id").references(() => videoListings.id, { onDelete: "set null" }),
  customTitle: text("custom_title"),
  durationMinutes: integer("duration_minutes").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").notNull().default("scheduled"),
  priceCents: integer("price_cents").notNull().default(0),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const allEyesSlotsRelations = relations(allEyesSlots, ({ one }) => ({
  provider: one(providerProfiles, { fields: [allEyesSlots.providerId], references: [providerProfiles.id] }),
  videoListing: one(videoListings, { fields: [allEyesSlots.videoListingId], references: [videoListings.id] }),
}));

export const insertAllEyesSlotSchema = createInsertSchema(allEyesSlots).omit({ id: true, createdAt: true });
export type AllEyesSlot = typeof allEyesSlots.$inferSelect;
export type InsertAllEyesSlot = z.infer<typeof insertAllEyesSlotSchema>;

export type AllEyesSlotWithProvider = AllEyesSlot & {
  provider: ProviderProfile;
  videoListing?: VideoListing | null;
};

export type BookAllEyesRequest = {
  durationMinutes: 15 | 30 | 60;
  videoListingId?: number;
  customTitle?: string;
  startAt: string;
};

// === LOVE VOTES TABLE ===
export const loveVotes = pgTable("love_votes", {
  id: serial("id").primaryKey(),
  voterUserId: integer("voter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").notNull().references(() => providerProfiles.id, { onDelete: "cascade" }),
  monthKey: text("month_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.voterUserId, t.monthKey)]);

export type LoveVote = typeof loveVotes.$inferSelect;

export type LoveLeaderboardEntry = {
  providerId: number;
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  voteCount: number;
};

// === MFA CODES TABLE ===
export const mfaCodes = pgTable("mfa_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  resendCount: integer("resend_count").notNull().default(0),
  lastResendAt: timestamp("last_resend_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MfaCode = typeof mfaCodes.$inferSelect;

// MFA API types
export type MfaRequiredResponse = { mfaRequired: true; email: string };
export type MfaVerifyRequest = { email: string; code: string };
export type MfaResendRequest = { email: string };

// Admin GigJack edit
export type EditGigJackRequest = {
  scheduledAt?: string | null;
  status?: "PENDING_REVIEW" | "APPROVED" | "DENIED";
  providerId?: number;
  offerDurationMinutes?: number | null;
  flashDurationSeconds?: number | null;
};

// GigJack live event state
export type GigJackDisplayState = "hidden" | "flash" | "siren" | "expired";

export type GigJackLiveState = {
  phase: GigJackDisplayState;
  gj: GigJackWithProvider | null;
  flashSecondsRemaining: number | null;
  offerEndsAt: string | null;
};

export type TodayGigJack = {
  id: number;
  offerTitle: string;
  artworkUrl: string;
  ctaLink: string;
  category: string | null;
  displayName: string;
  scheduledAt: string | null;
  displayState: GigJackDisplayState;
  offerEndsAt: string | null;
};

// === SPONSOR ADS TABLE ===
export const sponsorAds = pgTable("sponsor_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  targetUrl: text("target_url").notNull(),
  cta: text("cta").notNull().default("Learn More"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SponsorAd = typeof sponsorAds.$inferSelect;
export const insertSponsorAdSchema = createInsertSchema(sponsorAds).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSponsorAd = z.infer<typeof insertSponsorAdSchema>;

// === AD BOOKINGS TABLE ===
export const AD_BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type AdBookingStatus = typeof AD_BOOKING_STATUSES[number];

export const adBookings = pgTable("ad_bookings", {
  id: serial("id").primaryKey(),
  sponsorAdId: integer("sponsor_ad_id").references(() => sponsorAds.id, { onDelete: "cascade" }),
  bookingDate: text("booking_date").notNull(),  // YYYY-MM-DD
  slotNumber: integer("slot_number").notNull(),  // 1-5
  advertiserName: text("advertiser_name").notNull(),
  advertiserEmail: text("advertiser_email").notNull(),
  status: text("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdBooking = typeof adBookings.$inferSelect;
export type AdBookingWithAd = AdBooking & { ad: SponsorAd | null };
export const insertAdBookingSchema = createInsertSchema(adBookings).omit({ id: true, createdAt: true });
export type InsertAdBooking = z.infer<typeof insertAdBookingSchema>;

// === ZITO TV EVENTS TABLE ===
export const ZITO_TV_CATEGORIES = [
  "INTERVIEW", "COACHING", "PRESENTATION", "DEMO", "MUSIC",
  "CLASS", "DISCUSSION", "BROADCAST", "OTHER",
] as const;
export type ZitoTVCategory = typeof ZITO_TV_CATEGORIES[number];

export const zitoTvEvents = pgTable("zito_tv_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  hostName: text("host_name").notNull(),
  hostUserId: integer("host_user_id").references(() => users.id, { onDelete: "set null" }),
  category: text("category").notNull().default("OTHER"),
  liveUrl: text("live_url"),
  ctaUrl: text("cta_url"),
  coverImageUrl: text("cover_image_url"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ZitoTVEvent = typeof zitoTvEvents.$inferSelect;
export const insertZitoTVEventSchema = createInsertSchema(zitoTvEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZitoTVEvent = z.infer<typeof insertZitoTVEventSchema>;

export type ZitoTVEventWithHost = ZitoTVEvent & {
  host: {
    displayName: string | null;
    avatarUrl: string | null;
    username: string | null;
  } | null;
};

export type CreateZitoTVEventRequest = {
  title: string;
  description?: string;
  hostName: string;
  category: ZitoTVCategory;
  liveUrl?: string;
  ctaUrl?: string;
  durationMinutes: number;
  startAt: string;
};
