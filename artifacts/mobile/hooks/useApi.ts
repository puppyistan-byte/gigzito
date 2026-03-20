import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useListings(category?: string, search?: string) {
  const { apiRequest } = useAuth();
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const query = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["listings", category, search],
    queryFn: () => apiRequest<any[]>(`/api/listings${query}`),
  });
}

export function useListing(id: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => apiRequest<any>(`/api/listings/${id}`),
    enabled: !!id,
  });
}

export function useMyListings() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["listings", "mine"],
    queryFn: () => apiRequest<any[]>("/api/listings/mine"),
  });
}

export function useListingComments(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["listing-comments", id],
    queryFn: () => apiRequest<any[]>(`/api/listings/${id}/comments`),
    enabled: !!id,
  });
}

export function useVideoLikes(id: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["video-likes", id],
    queryFn: () => apiRequest<any>(`/api/videos/${id}/likes`),
    enabled: !!id,
  });
}

export function useToggleLike(id: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<any>(`/api/videos/${id}/like`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-likes", id] }),
  });
}

export function useGeeZeeCards() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geezee-cards"],
    queryFn: () => apiRequest<any[]>("/api/gigness-cards"),
  });
}

export function useMyGeeZeeCard() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geezee-card", "mine"],
    queryFn: () => apiRequest<any>("/api/gigness-cards/mine"),
  });
}

export function useGeeZeeCardByUser(userId: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geezee-card", "user", userId],
    queryFn: () => apiRequest<any>(`/api/gigness-cards/user/${userId}`),
    enabled: !!userId,
  });
}

export function useGeemotionsFeed() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geemotions-feed"],
    queryFn: () => apiRequest<any[]>("/api/zee-motions/feed"),
  });
}

export function useMyGeemotions() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geemotions", "mine"],
    queryFn: () => apiRequest<any[]>("/api/zee-motions/mine"),
  });
}

export function useGigJacksActive() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gigjacks", "active"],
    queryFn: () => apiRequest<any[]>("/api/gigjacks/active"),
    refetchInterval: 30000,
  });
}

export function useGigJacksToday() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gigjacks", "today"],
    queryFn: () => apiRequest<any[]>("/api/gigjacks/today"),
    refetchInterval: 60000,
  });
}

export function useLiveState() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gigjacks", "live-state"],
    queryFn: () => apiRequest<any>("/api/gigjacks/live-state"),
    refetchInterval: 15000,
  });
}

export function useZitoLiveStreams() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["zito-live-streams"],
    queryFn: () => apiRequest<any[]>("/api/zito-live/streams"),
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

export function useStartLive() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      category: string;
      mode: string;
      streamUrl: string;
      thumbnailUrl?: string;
      platform?: string;
    }) => apiRequest<any>("/api/live/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zito-live-streams"] }),
  });
}

export function useLiveHeartbeat() {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: ({ id, viewerCount }: { id: number; viewerCount?: number }) =>
      apiRequest<any>(`/api/live/${id}/heartbeat`, {
        method: "POST",
        body: JSON.stringify({ viewerCount: viewerCount ?? 0 }),
      }),
  });
}

export function useEndLive() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<any>(`/api/live/${id}/end`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zito-live-streams"] }),
  });
}

export function useRegisterZitoTV() {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (body: { category: string; tags?: string[] }) =>
      apiRequest<any>("/api/zito-live/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useActiveStreams() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["live", "active"],
    queryFn: () => apiRequest<any[]>("/api/live/active"),
    refetchInterval: 20000,
  });
}

export function useLoveLeaderboard() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["love-leaderboard"],
    queryFn: () => apiRequest<any[]>("/api/love/leaderboard"),
  });
}

export function useAllEyesUpcoming() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["all-eyes", "upcoming"],
    queryFn: () => apiRequest<any[]>("/api/all-eyes/upcoming"),
  });
}

export function useZitoTvEvents() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["zitotv"],
    queryFn: () => apiRequest<any[]>("/api/zitotv/events"),
  });
}

export function useSponsorAds() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["sponsor-ads"],
    queryFn: () => apiRequest<any[]>("/api/sponsor-ads"),
  });
}

export function useMyProfile() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => apiRequest<any>("/api/profile/me"),
  });
}

export function useProfileCompletion() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["profile", "completion"],
    queryFn: () => apiRequest<any>("/api/profile/me/completion"),
  });
}

export function useMyTotalLikes() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["profile", "total-likes"],
    queryFn: () => apiRequest<any>("/api/profile/me/total-likes"),
  });
}

export function useFollowStatus(userId: number) {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["follow-status", userId],
    queryFn: () => apiRequest<{ following: boolean; followerCount: number }>(`/api/geezee-follows/status/${userId}`),
    enabled: !!userId && !!token,
  });
}

export function useToggleFollow(userId: number) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (following: boolean) =>
      following
        ? apiRequest(`/api/geezee-follows/${userId}`, { method: "DELETE" })
        : apiRequest(`/api/geezee-follows/${userId}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-status", userId] }),
  });
}

export function useEngageLeaderboard() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["engage-leaderboard"],
    queryFn: () => apiRequest<any[]>("/api/geezee/engage-leaderboard"),
  });
}

export function useMyAudience() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["audience"],
    queryFn: () => apiRequest<any[]>("/api/my-audience"),
  });
}

export function useActivityFeed() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => apiRequest<any[]>("/api/notifications/activity"),
    enabled: !!token,
    refetchInterval: 30000,
  });
}

export function useProfileViewers() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["profile-viewers"],
    queryFn: () => apiRequest<any[]>("/api/profile/me/viewers"),
    enabled: !!token,
  });
}

export function useWhoLovedMe() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["who-loved-me"],
    queryFn: () => apiRequest<any[]>("/api/profile/me/who-loved-me"),
    enabled: !!token,
  });
}

export function useGeeZeeInbox() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["geezee-inbox"],
    queryFn: () => apiRequest<any[]>("/api/gigness-cards/inbox"),
    enabled: !!token,
  });
}

export function useMarkMessageRead() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/gigness-cards/messages/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geezee-inbox"] }),
  });
}

export function useDeleteMessage() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/gigness-cards/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geezee-inbox"] }),
  });
}

export function useReplyMessage() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, replyText }: { id: number; replyText: string }) =>
      apiRequest(`/api/gigness-cards/messages/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ replyText }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geezee-inbox"] }),
  });
}

export function useCreateListing() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      vertical: string;
      postType?: string;
      videoUrl?: string;
      durationSeconds?: number;
      description?: string;
      tags?: string[];
      ctaType?: string;
      ctaUrl?: string;
      ctaLabel?: string;
    }) =>
      apiRequest<any>("/api/listings/submit", {
        method: "POST",
        body: JSON.stringify({ postType: "VIDEO", ...data }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings", "mine"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useAdminDashboard() {
  const { apiRequest, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiRequest<any>("/api/mobile/admin/dashboard"),
    enabled: isAdmin,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAdminUsers(page = 1, search = "") {
  const { apiRequest, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  return useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => apiRequest<any>(`/api/admin/users?${params.toString()}`),
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminFlash() {
  const { apiRequest, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  return useQuery({
    queryKey: ["admin-flash"],
    queryFn: () => apiRequest<any[]>("/api/gzflash"),
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminActionMutation() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ method, path, body }: { method: string; path: string; body?: object }) =>
      apiRequest<any>(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-flash"] });
    },
  });
}

export function useFullProfile() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["full-profile"],
    queryFn: () => apiRequest<any>("/api/mobile/me"),
    enabled: !!token,
  });
}

export function useUpdateProfile() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest<any>("/api/mobile/profile", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["full-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["geezee-cards"] });
    },
  });
}

export function useUpdateAccount() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiRequest<any>("/api/mobile/account", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["full-profile"] }),
  });
}

export function useGZFlash() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-flash"],
    queryFn: () => apiRequest<any[]>("/api/gz-flash"),
    refetchInterval: 60000,
  });
}

export function useClaimFlash() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<any>(`/api/gz-flash/${id}/claim`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gz-flash"] }),
  });
}

export function useMyFlash() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["gz-flash-mine"],
    queryFn: () => apiRequest<any[]>("/api/gz-flash/mine"),
    enabled: !!token,
    refetchInterval: 60000,
  });
}

export function useCreateFlash() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest<any>("/api/gz-flash", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gz-flash-mine"] });
      qc.invalidateQueries({ queryKey: ["gz-flash"] });
    },
  });
}

export function useUpdateFlash() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, any> }) =>
      apiRequest<any>(`/api/gz-flash/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gz-flash-mine"] });
      qc.invalidateQueries({ queryKey: ["gz-flash"] });
    },
  });
}

export function useDeleteFlash() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<any>(`/api/gz-flash/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gz-flash-mine"] });
      qc.invalidateQueries({ queryKey: ["gz-flash"] });
    },
  });
}
