import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, serial, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const roleEnum = pgEnum("role", ["VISITOR", "PROVIDER", "ADMIN"]);
export const verticalEnum = pgEnum("vertical", ["MARKETING", "COACHING", "COURSES"]);
export const listingStatusEnum = pgEnum("listing_status", ["PENDING", "ACTIVE", "PAUSED", "REMOVED"]);

// === TABLES ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("VISITOR"),
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
  ctaUrl: text("cta_url"),
  status: listingStatusEnum("status").notNull().default("ACTIVE"),
  dropDate: date("drop_date").notNull(),
  pricePaidCents: integer("price_paid_cents").notNull().default(300),
  stripeSessionId: text("stripe_session_id"),
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
}));

export const videoListingsRelations = relations(videoListings, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [videoListings.providerId],
    references: [providerProfiles.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(providerProfiles).omit({ id: true });
export const insertListingSchema = createInsertSchema(videoListings).omit({ id: true, createdAt: true, updatedAt: true, dropDate: true, pricePaidCents: true, stripeSessionId: true, status: true });

// === API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type VideoListing = typeof videoListings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

// Listing with provider info
export interface ListingWithProvider extends VideoListing {
  provider: ProviderProfile & { user: User };
}

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

// Listing submission
export type CreateListingRequest = {
  vertical: "MARKETING" | "COACHING" | "COURSES";
  title: string;
  videoUrl: string;
  durationSeconds: number;
  description?: string;
  tags?: string[];
  ctaUrl?: string;
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
  vertical?: "MARKETING" | "COACHING" | "COURSES" | "ALL";
};
