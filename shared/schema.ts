import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, serial, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const roleEnum = pgEnum("role", ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "ADMIN"]);
export const verticalEnum = pgEnum("vertical", [
  "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
  "INFLUENCER", "PRODUCTS", "FLASH_SALE", "FLASH_COUPON",
  "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS",
]);
export const listingStatusEnum = pgEnum("listing_status", ["PENDING", "ACTIVE", "PAUSED", "REMOVED"]);
export const gigJackStatusEnum = pgEnum("gig_jack_status", ["PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_IMPROVEMENT"]);

// === TABLES ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("VISITOR"),
  status: text("status").notNull().default("active"),
  disclaimerAccepted: boolean("disclaimer_accepted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  status: gigJackStatusEnum("status").notNull().default("PENDING_REVIEW"),
  reviewNote: text("review_note"),
  botWarning: boolean("bot_warning").notNull().default(false),
  botWarningMessage: text("bot_warning_message"),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),
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

export const videoListingsRelations = relations(videoListings, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [videoListings.providerId],
    references: [providerProfiles.id],
  }),
}));

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
export const insertGigJackSchema = createInsertSchema(gigJacks).omit({ id: true, createdAt: true, updatedAt: true, status: true, reviewNote: true, botWarning: true, botWarningMessage: true });

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
  email: text("email").notNull(),
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
  email: string;
  phone?: string;
  message?: string;
  videoTitle?: string;
  category?: string;
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

export type SlotAvailabilityResponse = {
  date: string;
  hours: HourSlot[];
};

export type ReviewGigJackRequest = {
  status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT";
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

export type UpdateListingStatusRequest = { status: "ACTIVE" | "PAUSED" | "REMOVED" };

// Filters
export type ListingsFilter = {
  vertical?: VerticalKey | "ALL" | "GIG_BLITZ" | "FLASH_COUPONS" | "INFLUENCERS";
};
