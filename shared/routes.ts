import { z } from "zod";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  capReached: z.object({ message: z.string(), count: z.number(), max: z.number() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  // Auth
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      responses: { 201: z.object({ user: z.any(), profile: z.any().nullable() }), 400: errorSchemas.validation, 409: z.object({ message: z.string() }) },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      responses: { 200: z.object({ user: z.any(), profile: z.any().nullable() }), 401: errorSchemas.unauthorized },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: { 200: z.object({ message: z.string() }) },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
      responses: { 200: z.object({ user: z.any(), profile: z.any().nullable() }).nullable() },
    },
  },

  // Listings
  listings: {
    list: {
      method: "GET" as const,
      path: "/api/listings" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/listings/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    myListings: {
      method: "GET" as const,
      path: "/api/listings/mine" as const,
      responses: { 200: z.array(z.any()), 401: errorSchemas.unauthorized },
    },
    submitWithPayment: {
      method: "POST" as const,
      path: "/api/listings/submit" as const,
      responses: {
        201: z.object({ success: z.boolean(), listingId: z.number() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        402: z.object({ message: z.string() }),
        429: errorSchemas.capReached,
      },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/listings/:id/status" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
  },

  // Profiles
  profiles: {
    getMyProfile: {
      method: "GET" as const,
      path: "/api/profile/me" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    updateProfile: {
      method: "PUT" as const,
      path: "/api/profile/me" as const,
      responses: { 200: z.any(), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
    },
    profileCompletion: {
      method: "GET" as const,
      path: "/api/profile/me/completion" as const,
      responses: { 200: z.object({ isComplete: z.boolean(), missing: z.array(z.string()) }), 401: errorSchemas.unauthorized },
    },
    getProvider: {
      method: "GET" as const,
      path: "/api/profile/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
  },

  // Stats / Cap
  stats: {
    daily: {
      method: "GET" as const,
      path: "/api/stats/daily" as const,
      responses: { 200: z.object({ date: z.string(), count: z.number(), capReached: z.boolean(), maxCap: z.number() }) },
    },
  },

  // Admin
  admin: {
    stats: {
      method: "GET" as const,
      path: "/api/admin/stats" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    updateListing: {
      method: "PATCH" as const,
      path: "/api/admin/listings/:id/status" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
