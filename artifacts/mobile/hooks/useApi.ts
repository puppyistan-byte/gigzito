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
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["follow-status", userId],
    queryFn: () => apiRequest<{ following: boolean }>(`/api/geezee-follows/status/${userId}`),
    enabled: !!userId,
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

export function useGeeZeeInbox() {
  const { apiRequest } = useAuth();
  return useQuery({
    queryKey: ["geezee-inbox"],
    queryFn: () => apiRequest<any[]>("/api/gigness-cards/inbox"),
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
