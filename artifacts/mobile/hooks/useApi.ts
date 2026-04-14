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
    staleTime: 0,
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
    staleTime: 0,
  });
}

export function useSaveGeeZeeCard() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest<any>("/api/gigness-cards", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["geezee-card", "mine"] });
      qc.invalidateQueries({ queryKey: ["geezee-cards"] });
    },
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
    staleTime: 0,
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
    staleTime: 0,
  });
}

export function useProfileCompletion() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["profile", "completion"],
    queryFn: () => apiRequest<any>("/api/profile/me/completion"),
    staleTime: 0,
  });
}

export function useMyTotalLikes() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["profile", "total-likes"],
    queryFn: () => apiRequest<any>("/api/profile/me/total-likes"),
    staleTime: 0,
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

export function useProviderProfile(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["provider-profile", id],
    queryFn: () => apiRequest<any>(`/api/profile/${id}`),
    enabled: !!id,
  });
}

export function useProviderWall(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["provider-wall", id],
    queryFn: () => apiRequest<any[]>(`/api/profile/${id}/wall`),
    enabled: !!id,
  });
}

export function usePostToProviderWall(id: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(`/api/profile/${id}/wall`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-wall", id] }),
  });
}

export function useProviderLoveStatus(providerId: number | string) {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["provider-love-status", providerId],
    queryFn: () => apiRequest<{ loved: boolean; loveCount: number }>(`/api/love/${providerId}/status`),
    enabled: !!providerId && !!token,
  });
}

export function useToggleLoveProvider(providerId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<any>(`/api/love/${providerId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-love-status", providerId] });
      qc.invalidateQueries({ queryKey: ["provider-profile", providerId] });
    },
  });
}

export function useProviderListings(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["provider-listings", id],
    queryFn: () => apiRequest<any[]>(`/api/listings?providerId=${id}`),
    enabled: !!id,
  });
}

export function useGeeZeeInbox() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["geezee-inbox"],
    queryFn: () => apiRequest<any[]>("/api/gigness-cards/inbox"),
    enabled: !!token,
    staleTime: 0,
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
    staleTime: 0,
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
    staleTime: 0,
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

// ─── GZMusic ────────────────────────────────────────────────────────────────

export function useGZ100(opts?: { sort?: string; genre?: string; q?: string; limit?: number }) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-chart", opts],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(opts?.limit ?? 50), sort: opts?.sort ?? "chart" });
      if (opts?.genre) params.set("genre", opts.genre);
      if (opts?.q) params.set("q", opts.q);
      const res = await apiRequest<{ tracks: any[]; total: number; page: number; totalPages: number }>(
        `/api/gz-music/chart?${params}`
      );
      return res?.tracks ?? [];
    },
    staleTime: 60000,
  });
}

export function useGZLibrary(q?: string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-library", q],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", sort: "chart" });
      if (q) params.set("q", q);
      const res = await apiRequest<{ tracks: any[] }>(`/api/gz-music/chart?${params}`);
      return res?.tracks ?? [];
    },
    enabled: !!q,
    staleTime: 30000,
  });
}

export function useGZTrending(limit = 20) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-trending", limit],
    queryFn: () => apiRequest<any[]>(`/api/gz-music/trending?limit=${limit}`),
    staleTime: 60000,
  });
}

export function useGZGenres() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-genres"],
    queryFn: () => apiRequest<string[]>("/api/gz-music/genres"),
    staleTime: 300000,
  });
}

export function useGZTrackDetail(id: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-track", id],
    queryFn: () => apiRequest<any>(`/api/gz-music/tracks/${id}`),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useGZTracksByUser(userId: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-user", userId],
    queryFn: () => apiRequest<any[]>(`/api/gz-music/tracks/by-user/${userId}`),
    enabled: !!userId,
  });
}

export function useGZTrackComments(id: number) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["gz-music-comments", id],
    queryFn: () => apiRequest<any[]>(`/api/gz-music/tracks/${id}/comments`),
    enabled: !!id,
  });
}

export function useGZToggleLike() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<any>(`/api/gz-music/tracks/${id}/like`, { method: "POST" }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["gz-music-chart"] });
      qc.invalidateQueries({ queryKey: ["gz-music-track", id] });
    },
  });
}

export function useGZRateTrack() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stars }: { id: number; stars: number }) =>
      apiRequest<any>(`/api/gz-music/tracks/${id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["gz-music-chart"] });
      qc.invalidateQueries({ queryKey: ["gz-music-track", id] });
    },
  });
}

export function useGZPostComment() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      apiRequest<any>(`/api/gz-music/tracks/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ["gz-music-comments", id] }),
  });
}

export function useGZDeleteComment() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) =>
      apiRequest<any>(`/api/gz-music/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gz-music-comments"] }),
  });
}

export function useGZRecordPlay() {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (id: number) => apiRequest<any>(`/api/gz-music/tracks/${id}/play`, { method: "POST" }),
  });
}

export function useGZBatchLikes(ids: number[]) {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["gz-music-likes-batch", ids.join(",")],
    queryFn: () => apiRequest<Record<string, boolean>>(`/api/gz-music/likes/batch?ids=${ids.join(",")}`),
    enabled: !!token && ids.length > 0,
  });
}

export function useGZAnnounceSingle() {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (body: { trackId: number; toEmail: string; message?: string }) =>
      apiRequest<any>("/api/gz-music/announce/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useGZAnnounceMailing() {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (body: { trackId: number; message?: string }) =>
      apiRequest<any>("/api/gz-music/announce/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useUserDashboard() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["user-dashboard"],
    queryFn: () => apiRequest<any>("/api/user/dashboard"),
    enabled: !!token,
    staleTime: 0,
    retry: 1,
  });
}

export function useFollowCounts() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["follow-counts"],
    queryFn: () => apiRequest<{ followerCount: number; followingCount: number }>("/api/follow/counts"),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useMyGroups() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["groups", "mine"],
    queryFn: () => apiRequest<any[]>("/api/groups"),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useMyComments() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["comments", "mine"],
    queryFn: () => apiRequest<any[]>("/api/listings/comments/mine"),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useGZSubscriberCount() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["gz-music-subscribers"],
    queryFn: () => apiRequest<{ count: number }>("/api/gz-music/announce/subscriber-count"),
    enabled: !!token,
  });
}

// ─── GZGroups ────────────────────────────────────────────────────────────────

export function useGroupInvites() {
  const { apiRequest, token } = useAuth();
  return useQuery({
    queryKey: ["groups", "invites"],
    queryFn: () => apiRequest<any[]>("/api/groups/invites"),
    enabled: !!token,
    staleTime: 0,
  });
}

export function useFeaturedGroups() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["groups", "featured"],
    queryFn: () => apiRequest<any[]>("/api/groups/featured"),
    staleTime: 5 * 60_000,
  });
}

export function useGroup(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => apiRequest<any>(`/api/groups/${id}`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupMembers(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "members"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/members`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupWall(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "wall"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/wall`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupWallComments(groupId: number | string, postId: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", groupId, "wall", postId, "comments"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${groupId}/wall/${postId}/comments`),
    enabled: !!groupId && !!postId,
    staleTime: 0,
  });
}

export function useGroupKanban(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "kanban"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/kanban`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupEvents(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "events"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/events`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupEndeavors(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "endeavors"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/endeavors`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupRetrospectives(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "retrospectives"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/retrospectives`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupWallets(id: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", id, "wallets"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${id}/wallets`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useGroupWalletBalance(groupId: number | string, walletId: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", groupId, "wallet", walletId, "balance"],
    queryFn: () => apiRequest<any>(`/api/groups/${groupId}/wallets/${walletId}/balance`),
    enabled: !!groupId && !!walletId,
    staleTime: 5 * 60_000,
  });
}

export function useGroupWalletContributions(groupId: number | string, walletId: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", groupId, "wallet", walletId, "contributions"],
    queryFn: () => apiRequest<any[]>(`/api/groups/${groupId}/wallets/${walletId}/contributions`),
    enabled: !!groupId && !!walletId,
    staleTime: 0,
  });
}

export function useSearchGroupUsers(q: string, groupId: number | string) {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["group", groupId, "search-users", q],
    queryFn: () => apiRequest<any[]>(`/api/groups/search-users?q=${encodeURIComponent(q)}&groupId=${groupId}`),
    enabled: q.length >= 2 && !!groupId,
    staleTime: 30_000,
  });
}

export function useCreateGroup() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; coverUrl?: string; isPrivate?: boolean }) =>
      apiRequest<any>("/api/groups", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", "mine"] }),
  });
}

export function useUpdateGroup(id: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string; coverUrl?: string; isPrivate?: boolean }) =>
      apiRequest<any>(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      qc.invalidateQueries({ queryKey: ["groups", "mine"] });
    },
  });
}

export function useDeleteGroup() {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) =>
      apiRequest<any>(`/api/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", "mine"] }),
  });
}

export function useInviteToGroup(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteeUserId: number) =>
      apiRequest<any>(`/api/groups/${groupId}/invite`, {
        method: "POST",
        body: JSON.stringify({ inviteeUserId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "members"] }),
  });
}

export function useInviteEmailToGroup(groupId: number | string) {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<any>(`/api/groups/${groupId}/invite/email`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  });
}

export function useRespondToGroupInvite(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accept: boolean) =>
      apiRequest<any>(`/api/groups/${groupId}/invite/respond`, {
        method: "POST",
        body: JSON.stringify({ accept }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", "invites"] });
      qc.invalidateQueries({ queryKey: ["groups", "mine"] });
    },
  });
}

export function useJoinRequestGroup(groupId: number | string) {
  const { apiRequest } = useAuth();
  return useMutation({
    mutationFn: (message: string) =>
      apiRequest<any>(`/api/groups/${groupId}/join-request`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  });
}

export function useRemoveGroupMember(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uid: number) =>
      apiRequest<any>(`/api/groups/${groupId}/members/${uid}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "members"] }),
  });
}

export function usePostToGroupWall(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(`/api/groups/${groupId}/wall`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "wall"] }),
  });
}

export function useDeleteGroupWallPost(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) =>
      apiRequest<any>(`/api/groups/${groupId}/wall/${postId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "wall"] }),
  });
}

export function useCommentOnWallPost(groupId: number | string, postId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiRequest<any>(`/api/groups/${groupId}/wall/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "wall", postId, "comments"] }),
  });
}

export function useCreateKanbanCard(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; status?: string; priority?: string; deadline?: string; assignedTo?: number; impactLevel?: string; effortLevel?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/kanban`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "kanban"] }),
  });
}

export function useUpdateKanbanCard(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cid, ...body }: { cid: number; status?: string; priority?: string; title?: string; description?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/kanban/${cid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "kanban"] }),
  });
}

export function useDeleteKanbanCard(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cid: number) =>
      apiRequest<any>(`/api/groups/${groupId}/kanban/${cid}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "kanban"] }),
  });
}

export function useCreateGroupEvent(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; startAt: string; endAt?: string; allDay?: boolean; description?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/events`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "events"] }),
  });
}

export function useDeleteGroupEvent(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eid: number) =>
      apiRequest<any>(`/api/groups/${groupId}/events/${eid}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "events"] }),
  });
}

export function useCreateEndeavor(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/endeavors`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "endeavors"] }),
  });
}

export function useUpdateEndeavor(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eid, ...body }: { eid: number; goalProgress?: number; title?: string; description?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/endeavors/${eid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "endeavors"] }),
  });
}

export function useDeleteEndeavor(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eid: number) =>
      apiRequest<any>(`/api/groups/${groupId}/endeavors/${eid}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "endeavors"] }),
  });
}

export function useSubmitRetrospective(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { win: string; roadblock: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/retrospectives`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "retrospectives"] }),
  });
}

export function useCreateGroupWallet(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { label: string; network: string; address: string; link?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/wallets`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "wallets"] }),
  });
}

export function useDeleteGroupWallet(groupId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wid: number) =>
      apiRequest<any>(`/api/groups/${groupId}/wallets/${wid}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId, "wallets"] }),
  });
}

export function useLogContribution(groupId: number | string, walletId: number | string) {
  const { apiRequest } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { amount: number; currency?: string; txHash?: string; note?: string }) =>
      apiRequest<any>(`/api/groups/${groupId}/wallets/${walletId}/contributions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", groupId, "wallet", walletId, "contributions"] });
      qc.invalidateQueries({ queryKey: ["group", groupId, "wallet", walletId, "balance"] });
    },
  });
}
