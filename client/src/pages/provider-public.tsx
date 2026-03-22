import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import MoreBelow from "@/components/more-below";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, MapPin, Globe, Instagram, Youtube, Mail, Phone, MessageCircle,
  Megaphone, CreditCard, LayoutGrid, User, Image, ShoppingBag, MessageSquare,
  Clock, Store, ExternalLink, Play, Tag, Loader2, Trash2, Send,
  Music, Upload, Headphones, Download, FileBadge2, Shield, UserPlus, UserCheck,
} from "lucide-react";
import { SiTiktok, SiFacebook, SiDiscord, SiX } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProviderProfile, ListingWithProvider, GignessCard, GZMusicTrack } from "@shared/schema";

type LoveStatus = { voteCount: number; hasVoted: boolean };
type WallPost = { id: number; profileId: number; authorUserId: number | null; authorName: string; authorAvatar: string | null; message: string; createdAt: string };

type Tab = "about" | "photos" | "store" | "wall" | "geezee" | "music";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "about",   label: "About",      icon: User },
  { key: "photos",  label: "Photos",     icon: Image },
  { key: "store",   label: "Store Front",icon: Store },
  { key: "wall",    label: "Wall",       icon: MessageSquare },
  { key: "geezee",  label: "GeeZee",     icon: CreditCard },
  { key: "music",   label: "GZMusic",    icon: Music },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProviderPublicPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [wallMessage, setWallMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<ProviderProfile & { user?: { subscriptionTier?: string; role?: string } }>({
    queryKey: ["/api/profile", id],
    queryFn: () => fetch(`/api/profile/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/profile", id, "listings"],
    queryFn: () => fetch(`/api/profile/${id}/listings`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: loveStatus } = useQuery<LoveStatus>({
    queryKey: ["/api/love/status", id],
    queryFn: () => fetch(`/api/love/${id}/status`).then((r) => r.json()),
    enabled: !!id,
  });

  const profileUserId = (profile as any)?.userId as number | undefined;

  const { data: followCounts, refetch: refetchCounts } = useQuery<{ followerCount: number; followingCount: number }>({
    queryKey: ["/api/geezee-follows/counts", profileUserId],
    queryFn: () => fetch(`/api/geezee-follows/counts/${profileUserId}`).then((r) => r.json()),
    enabled: !!profileUserId,
    staleTime: 30_000,
  });

  const { data: followStatus, refetch: refetchStatus } = useQuery<{ following: boolean; followerCount: number; followingCount: number }>({
    queryKey: ["/api/geezee-follows/status", profileUserId],
    queryFn: () => fetch(`/api/geezee-follows/status/${profileUserId}`).then((r) => r.json()),
    enabled: !!profileUserId && !!(user as any)?.user?.id && (user as any)?.user?.id !== profileUserId,
    staleTime: 30_000,
  });

  const followMutation = useMutation({
    mutationFn: async (isNowFollowing: boolean) => {
      const method = isNowFollowing ? "DELETE" : "POST";
      const res = await apiRequest(method, `/api/geezee-follows/${profileUserId}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      refetchStatus();
      refetchCounts();
      queryClient.invalidateQueries({ queryKey: ["/api/geezee-follows/counts", profileUserId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Could not update follow status", variant: "destructive" });
    },
  });

  const { data: geezeeCard } = useQuery<GignessCard | null>({
    queryKey: ["/api/gigness-cards/user", profileUserId],
    queryFn: () =>
      fetch(`/api/gigness-cards/user/${profileUserId}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!profileUserId,
    staleTime: 60_000,
  });

  const { data: wallPosts = [], isLoading: wallLoading } = useQuery<WallPost[]>({
    queryKey: ["/api/profile", id, "wall"],
    queryFn: () => fetch(`/api/profile/${id}/wall`).then((r) => r.json()),
    enabled: !!id && activeTab === "wall",
  });

  const { data: gzTracks = [], isLoading: gzTracksLoading } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/gz-music/tracks/by-user", profileUserId],
    queryFn: () => fetch(`/api/gz-music/tracks/by-user/${profileUserId}`).then((r) => r.json()),
    enabled: !!profileUserId && activeTab === "music",
    staleTime: 30_000,
  });

  const loveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/love/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/love/status", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/love/leaderboard"] });
      toast({ title: "Love sent! 😍", description: "Your vote has been counted for this month." });
    },
    onError: async (err: any) => {
      const msg = err?.message ?? "Something went wrong";
      if (msg.includes("already")) {
        toast({ title: "Already voted 😍", description: "You can only show love once per month.", variant: "destructive" });
      } else if (msg.includes("Login") || msg.includes("Unauthorized")) {
        toast({ title: "Sign in to show love", description: "Create a free account to vote.", variant: "destructive" });
      } else if (msg.includes("yourself")) {
        toast({ title: "Nice try 😄", description: "You can't vote for yourself.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    },
  });

  const wallMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/profile/${id}/wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: wallMessage, guestName: guestName || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      setWallMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/profile", id, "wall"] });
      toast({ title: "Message posted!", description: "Your message has been added to the wall." });
    },
    onError: (err: any) => toast({ title: "Failed to post", description: err.message, variant: "destructive" }),
  });

  const deleteWallMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(`/api/profile/wall/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile", id, "wall"] }),
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const p = profile as any;
  const photos = profile
    ? [p.photo1Url, p.photo2Url, p.photo3Url, p.photo4Url, p.photo5Url, p.photo6Url].filter(Boolean)
    : [];

  const hasVoted = loveStatus?.hasVoted ?? false;
  const voteCount = loveStatus?.voteCount ?? 0;
  const ownerTier = (profile as any)?.user?.subscriptionTier ?? "GZLurker";
  const isGZLurker = ownerTier === "GZLurker";
  const myUserId = (user as any)?.user?.id;
  const myRole = (user as any)?.user?.role ?? "";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(myRole);

  return (
    <>
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Nav bar */}
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="link-back-to-main">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Main
            </Link>
            <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff1a1a] hover:text-[#ff4444] transition-colors" data-testid="link-leaderboard">
              👑 Marketer of the Month
            </Link>
          </div>

          {profileLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full bg-[#111] rounded-2xl" />
              <Skeleton className="h-10 w-full bg-[#111] rounded-xl" />
            </div>
          ) : !profile || (profile as any).message || !(profile as any).id ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center">
              <p className="text-[#555]">Creator not found.</p>
            </div>
          ) : (
            <>
              {/* ── Hero Card ──────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
                {/* Cover banner */}
                <div className="h-36 w-full overflow-hidden bg-gradient-to-br from-[#1a0505] to-[#0a0a12] relative">
                  {profile.thumbUrl && (
                    <img src={profile.thumbUrl} alt="" className="w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
                </div>

                <div className="px-5 pb-5">
                  <div className="flex items-end gap-4 -mt-9">
                    {/* Avatar */}
                    <div className="relative shrink-0 group" style={{ width: "72px", height: "72px" }}>
                      <div
                        style={{
                          width: "72px", height: "72px", borderRadius: "50%",
                          border: hasVoted ? "3px solid #ff69b4" : "3px solid #ff2b2b",
                          overflow: "hidden", background: "#1a1a1a", zIndex: 10, position: "relative",
                        }}
                        data-testid="img-provider-avatar"
                      >
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "22px", fontWeight: "700" }}>
                            {initials}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => loveMutation.mutate()}
                        disabled={loveMutation.isPending}
                        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                        style={{ zIndex: 20 }}
                        title={hasVoted ? "Already shown love" : "Show Love"}
                        data-testid="button-show-love-avatar"
                      >
                        <span className="text-2xl">{hasVoted ? "😍" : "🤍"}</span>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <h1 className="text-lg font-bold text-white truncate" data-testid="text-provider-name">{profile.displayName}</h1>
                      {profile.username && <p className="text-xs text-[#555]">@{profile.username}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[#666]" data-testid="text-follower-count">
                          <span className="text-white font-semibold">{(followStatus?.followerCount ?? followCounts?.followerCount ?? 0).toLocaleString()}</span>
                          {" "}<span className="text-[#555]">followers</span>
                        </span>
                        <span className="text-xs text-[#666]" data-testid="text-following-count">
                          <span className="text-white font-semibold">{(followStatus?.followingCount ?? followCounts?.followingCount ?? 0).toLocaleString()}</span>
                          {" "}<span className="text-[#555]">following</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 pb-1">
                      {profile.primaryCategory && (
                        <Badge className="bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/25 text-xs">
                          {profile.primaryCategory.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <span className="text-[9px] font-bold text-[#444] uppercase tracking-widest">{ownerTier}</span>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-[#aaa] mt-3 leading-relaxed">{profile.bio}</p>
                  )}
                  {profile.location && (
                    <p className="flex items-center gap-1.5 text-xs text-[#555] mt-1.5">
                      <MapPin className="h-3 w-3" /> {profile.location}
                    </p>
                  )}

                  {/* Action row */}
                  <div className="mt-4 flex items-start gap-3 flex-wrap">
                    {/* Follow button — only show when logged in and viewing someone else */}
                    {myUserId && myUserId !== profileUserId && (
                      <button
                        onClick={() => followMutation.mutate(followStatus?.following ?? false)}
                        disabled={followMutation.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border active:scale-95 ${
                          followStatus?.following
                            ? "bg-[#ff2b2b]/10 border-[#ff2b2b]/30 text-[#ff2b2b] hover:bg-red-900/20 hover:border-red-500/50"
                            : "bg-[#ff2b2b] border-[#ff2b2b] text-white hover:bg-[#cc2222] hover:border-[#cc2222]"
                        }`}
                        data-testid="button-follow-user"
                      >
                        {followMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : followStatus?.following ? (
                          <UserCheck className="h-3.5 w-3.5" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        {followStatus?.following ? "Following" : "Follow"}
                      </button>
                    )}

                    <button
                      onClick={() => loveMutation.mutate()}
                      disabled={loveMutation.isPending || hasVoted}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                        hasVoted
                          ? "bg-pink-500/10 border-pink-500/30 text-pink-400 cursor-default"
                          : "bg-[#1a1a1a] border-[#333] text-white hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-300 active:scale-95"
                      }`}
                      data-testid="button-show-love"
                    >
                      <span className="text-base">{hasVoted ? "😍" : "🤍"}</span>
                      {hasVoted ? "Love shown!" : "Show Love"}
                    </button>

                    <Link href={`/advertise?ref=${profile?.username ?? id}`}>
                      <a
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[#ff2b2b]/40 bg-[#ff2b2b]/10 text-[#ff2b2b] hover:bg-[#ff2b2b]/20 hover:border-[#ff2b2b]/70 transition-all active:scale-95"
                        data-testid="link-promote-business"
                      >
                        <Megaphone className="h-3.5 w-3.5" /> Promote My Business
                      </a>
                    </Link>

                    <button
                      onClick={() => setActiveTab("wall")}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[#2a2a2a] bg-[#111] text-[#888] hover:text-white hover:border-[#444] transition-all active:scale-95"
                      data-testid="button-write-on-wall"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Write on Wall
                    </button>
                  </div>

                  {voteCount > 0 && (
                    <p className="text-xs text-[#555] mt-2" data-testid="text-vote-count">
                      {voteCount} {voteCount === 1 ? "person" : "people"} showed love this month
                    </p>
                  )}

                  {/* Social row */}
                  {(profile.instagramUrl || profile.youtubeUrl || profile.tiktokUrl || p.facebookUrl || p.discordUrl || p.twitterUrl) && (
                    <div className="flex items-center gap-1 mt-3">
                      {profile.instagramUrl && (
                        <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#E1306C]"
                          title="Instagram" data-testid="link-instagram">
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                      {profile.youtubeUrl && (
                        <a href={profile.youtubeUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#FF0000]"
                          title="YouTube" data-testid="link-youtube">
                          <Youtube className="h-4 w-4" />
                        </a>
                      )}
                      {profile.tiktokUrl && (
                        <a href={profile.tiktokUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-white"
                          title="TikTok" data-testid="link-tiktok">
                          <SiTiktok className="h-4 w-4" />
                        </a>
                      )}
                      {p.facebookUrl && (
                        <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#1877F2]"
                          title="Facebook" data-testid="link-facebook">
                          <SiFacebook className="h-4 w-4" />
                        </a>
                      )}
                      {p.discordUrl && (
                        <a href={p.discordUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#5865F2]"
                          title="Discord" data-testid="link-discord">
                          <SiDiscord className="h-4 w-4" />
                        </a>
                      )}
                      {p.twitterUrl && (
                        <a href={p.twitterUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-white"
                          title="X / Twitter" data-testid="link-twitter">
                          <SiX className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tab Bar ─────────────────────────────────────────────────── */}
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
                <div className="flex overflow-x-auto scrollbar-none">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 ${
                          isActive
                            ? "border-[#ff2b2b] text-white bg-[#ff2b2b]/5"
                            : "border-transparent text-[#555] hover:text-[#aaa] hover:bg-[#111]"
                        }`}
                        data-testid={`tab-${tab.key}`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Tab Content ─────────────────────────────────────────────── */}

              {/* ABOUT */}
              {activeTab === "about" && (
                <div className="space-y-4">
                  {/* Contact links */}
                  {(profile.websiteUrl || profile.contactEmail || (profile.contactPhone && p.showPhone) || profile.contactTelegram) && (
                    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
                      <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Contact</p>
                      <div className="flex flex-wrap gap-3">
                        {profile.websiteUrl && (
                          <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
                            data-testid="link-website">
                            <Globe className="h-4 w-4 text-[#ff2b2b]" /> Website
                          </a>
                        )}
                        {profile.contactEmail && (
                          <a href={`mailto:${profile.contactEmail}`}
                            className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
                            data-testid="link-email">
                            <Mail className="h-4 w-4 text-[#ff2b2b]" /> {profile.contactEmail}
                          </a>
                        )}
                        {profile.contactPhone && p.showPhone && (
                          <a href={`tel:${profile.contactPhone}`}
                            className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
                            data-testid="link-phone">
                            <Phone className="h-4 w-4 text-[#ff2b2b]" /> {profile.contactPhone}
                          </a>
                        )}
                        {profile.contactTelegram && (
                          <a href={`https://t.me/${profile.contactTelegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
                            data-testid="link-telegram">
                            <MessageCircle className="h-4 w-4 text-[#ff2b2b]" /> Telegram
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GeeZee quick links */}
                  <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-2">
                    <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-3">GeeZee</p>
                    <div className="flex gap-2">
                      {geezeeCard?.isPublic && profileUserId ? (
                        <button
                          onClick={() => setActiveTab("geezee")}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 h-[80px] rounded-xl border border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/80 transition-all active:scale-95 cursor-pointer"
                          data-testid="btn-view-geezee-tab"
                        >
                          <CreditCard className="h-5 w-5 shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide">GeeZee Card</span>
                          <span className="text-[10px] text-violet-400/70">Tap to view</span>
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 h-[80px] rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] text-[#444]" data-testid="geezee-card-placeholder">
                          <CreditCard className="h-5 w-5 shrink-0" />
                          <span className="text-[11px] font-semibold">GeeZee Card</span>
                          <span className="text-[10px] text-[#333]">Not published</span>
                        </div>
                      )}
                      <Link href="/geezees">
                        <a className="flex-1 flex flex-col items-center justify-center gap-1.5 h-[80px] rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-400 hover:bg-violet-500/15 hover:border-violet-500/60 hover:text-violet-300 transition-all active:scale-95" data-testid="link-geezee-rolodex">
                          <LayoutGrid className="h-5 w-5 shrink-0" />
                          <span className="text-[11px] font-bold">GeeZee Rolodex</span>
                          <span className="text-[10px] text-violet-400/60">Browse all</span>
                        </a>
                      </Link>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Offerings", value: listings.length },
                      { label: "Love votes", value: voteCount },
                      { label: "Photos", value: photos.length },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3 text-center">
                        <p className="text-lg font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-[#444] uppercase tracking-widest mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PHOTOS */}
              {activeTab === "photos" && (
                <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4">
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-[#111] block border border-[#1e1e1e] hover:border-[#ff2b2b]/40 transition-colors group"
                          data-testid={`img-gallery-${i + 1}`}>
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 flex flex-col items-center gap-3 text-center">
                      <Image className="w-10 h-10 text-[#222]" />
                      <p className="text-[#555] text-sm font-semibold">No photos yet</p>
                      <p className="text-[#333] text-xs">This creator hasn't added any photos to their profile.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STORE FRONT */}
              {activeTab === "store" && (
                <div className="space-y-3">
                  {isGZLurker ? (
                    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 flex flex-col items-center gap-3 text-center">
                      <Store className="w-10 h-10 text-[#222]" />
                      <p className="text-[#555] text-sm font-semibold">No store front yet</p>
                      <p className="text-[#333] text-xs max-w-[220px] leading-relaxed">
                        This creator hasn't set up their marketing center yet. Check back soon!
                      </p>
                    </div>
                  ) : listingsLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map((i) => <Skeleton key={i} className="h-28 w-full bg-[#111] rounded-xl" />)}
                    </div>
                  ) : listings.length === 0 ? (
                    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 flex flex-col items-center gap-3 text-center">
                      <ShoppingBag className="w-10 h-10 text-[#222]" />
                      <p className="text-[#555] text-sm font-semibold">No offerings yet</p>
                      <p className="text-[#333] text-xs">This creator hasn't posted any offerings.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-1">
                        <Store className="h-4 w-4 text-[#ff2b2b]" />
                        <p className="text-xs font-bold text-[#555] uppercase tracking-widest">
                          {profile.displayName}'s Store Front
                        </p>
                        <span className="ml-auto text-[10px] text-[#333]">{listings.length} offering{listings.length !== 1 ? "s" : ""}</span>
                      </div>
                      {listings.map((l) => (
                        <Link key={l.id} href={`/listings/${l.id}`}>
                          <a
                            className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] hover:border-[#ff2b2b]/30 hover:bg-[#0f0f0f] transition-all block p-4"
                            data-testid={`listing-card-${l.id}`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#111] shrink-0 flex items-center justify-center border border-[#2a2a2a]">
                                {l.provider?.thumbUrl || l.provider?.avatarUrl ? (
                                  <img src={l.provider.thumbUrl || l.provider.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Play className="w-5 h-5 text-[#333]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white leading-snug line-clamp-2">{l.title}</p>
                                {l.description && (
                                  <p className="text-xs text-[#555] mt-1 line-clamp-2">{l.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge className="bg-[#ff2b2b]/10 text-[#ff2b2b] border border-[#ff2b2b]/20 text-[10px] font-semibold">
                                    {l.vertical.replace(/_/g, " ")}
                                  </Badge>
                                  {l.ctaLabel && (
                                    <span className="flex items-center gap-1 text-[10px] text-[#888] font-medium">
                                      <ExternalLink className="h-2.5 w-2.5" /> {l.ctaLabel}
                                    </span>
                                  )}
                                  {l.tags?.slice(0, 2).map((tag) => (
                                    <span key={tag} className="flex items-center gap-0.5 text-[10px] text-[#444]">
                                      <Tag className="h-2.5 w-2.5" />#{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-[#333] shrink-0 mt-1" />
                            </div>
                          </a>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* WALL */}
              {activeTab === "wall" && (
                <div className="space-y-3">
                  {/* Write a message */}
                  <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
                    <p className="text-xs font-bold text-[#444] uppercase tracking-widest">Write on the Wall</p>
                    {!user && (
                      <Input
                        placeholder="Your name (optional)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] text-sm h-9"
                        data-testid="input-wall-guest-name"
                      />
                    )}
                    <Textarea
                      placeholder={`Leave a message for ${profile.displayName}...`}
                      value={wallMessage}
                      onChange={(e) => setWallMessage(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] text-sm resize-none focus:border-[#ff2b2b]"
                      data-testid="textarea-wall-message"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#333]">{wallMessage.length}/500</span>
                      <Button
                        size="sm"
                        onClick={() => wallMutation.mutate()}
                        disabled={!wallMessage.trim() || wallMutation.isPending}
                        className="bg-[#ff2b2b]/20 hover:bg-[#ff2b2b]/35 text-white border border-[#ff2b2b]/60 hover:border-[#ff2b2b] rounded-xl h-8 px-4 text-xs font-bold backdrop-blur-sm transition-colors"
                        data-testid="button-post-wall"
                      >
                        {wallMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Post
                      </Button>
                    </div>
                  </div>

                  {/* Wall posts */}
                  {wallLoading ? (
                    <div className="space-y-2">
                      {[1,2].map((i) => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
                    </div>
                  ) : wallPosts.length === 0 ? (
                    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-10 flex flex-col items-center gap-3 text-center">
                      <MessageSquare className="w-8 h-8 text-[#222]" />
                      <p className="text-[#555] text-sm">No messages yet</p>
                      <p className="text-[#333] text-xs">Be the first to write on {profile.displayName}'s wall!</p>
                    </div>
                  ) : (
                    wallPosts.map((post) => (
                      <div key={post.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid={`wall-post-${post.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] shrink-0 flex items-center justify-center text-xs font-bold text-[#555]">
                            {post.authorAvatar ? (
                              <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                            ) : (
                              post.authorName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-white">{post.authorName}</p>
                              <p className="flex items-center gap-1 text-[10px] text-[#444]">
                                <Clock className="h-2.5 w-2.5" /> {timeAgo(post.createdAt)}
                              </p>
                            </div>
                            <p className="text-sm text-[#aaa] mt-1.5 leading-relaxed">{post.message}</p>
                          </div>
                          {(isAdmin || post.authorUserId === myUserId) && (
                            <button
                              onClick={() => deleteWallMutation.mutate(post.id)}
                              disabled={deleteWallMutation.isPending}
                              className="shrink-0 p-1.5 rounded-lg text-[#333] hover:text-[#ff2b2b] hover:bg-[#ff2b2b]/10 transition-colors"
                              data-testid={`btn-delete-wall-${post.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* GZMUSIC TAB */}
              {activeTab === "music" && (
                <div className="space-y-4">
                  {/* Upload button — visible only to profile owner */}
                  {myUserId === profileUserId && (
                    <button
                      onClick={() => navigate("/gz-music/upload")}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #ff7a00, #cc5200)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(255,122,0,0.4)",
                      }}
                      data-testid="button-profile-upload-gz-music"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Track to GZMusic
                    </button>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 px-1">
                    <Music className="h-4 w-4" style={{ color: "#ff7a00" }} />
                    <p className="text-sm font-black text-white">
                      {myUserId === profileUserId ? "My GZMusic Tracks" : `${profile.displayName}'s Tracks`}
                    </p>
                    {gzTracks.length > 0 && (
                      <span className="ml-auto text-[10px] font-bold text-[#555]">{gzTracks.length} track{gzTracks.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {gzTracksLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
                    </div>
                  ) : gzTracks.length === 0 ? (
                    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-10 flex flex-col items-center gap-3 text-center">
                      <Music className="w-8 h-8" style={{ color: "#2a2a2a" }} />
                      <p className="text-[#555] text-sm font-semibold">No tracks yet</p>
                      {myUserId === profileUserId ? (
                        <button
                          onClick={() => navigate("/gz-music/upload")}
                          className="mt-1 px-4 py-2 rounded-xl text-xs font-black text-white"
                          style={{ background: "linear-gradient(135deg, #ff7a00, #cc5200)" }}
                          data-testid="button-empty-upload-gz-music"
                        >
                          Upload your first track
                        </button>
                      ) : (
                        <p className="text-[#333] text-xs">{profile.displayName} hasn't uploaded any music yet.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gzTracks.map((track) => {
                        const hasFile = !!(track as any).fileUrl;
                        const hasLicense = !!(track as any).licenseFileUrl;
                        const downloadOk = !!(track as any).downloadEnabled;
                        const isExpanded = expandedTrackId === track.id;
                        return (
                          <div
                            key={track.id}
                            className="rounded-xl border overflow-hidden"
                            style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}
                            data-testid={`profile-track-${track.id}`}
                          >
                            <div className="flex items-center gap-3 p-3">
                              {/* Cover */}
                              <div
                                className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                                style={{ background: "#111", border: "1px solid #2a2a2a" }}
                              >
                                {track.coverUrl ? (
                                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Headphones className="h-5 w-5" style={{ color: "#ff7a00" }} />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-white truncate">{track.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <p className="text-xs text-[#888]">{track.artist}</p>
                                  {track.genre && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ff7a0018", color: "#ff7a00" }}>
                                      {track.genre}
                                    </span>
                                  )}
                                </div>
                                {/* Badges */}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {hasLicense && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#3b82f610", borderColor: "#3b82f630", color: "#3b82f6" }}>
                                      <FileBadge2 className="h-2.5 w-2.5" /> Licensed
                                    </span>
                                  )}
                                  {(track as any).authenticityConfirmed && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#22c55e10", borderColor: "#22c55e30", color: "#22c55e" }}>
                                      <Shield className="h-2.5 w-2.5" /> Certified
                                    </span>
                                  )}
                                  {downloadOk ? (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#ff7a0018", borderColor: "#ff7a0035", color: "#ff7a00" }}>
                                      <Download className="h-2.5 w-2.5" /> Download OK
                                    </span>
                                  ) : hasFile ? (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#1a1a1a", borderColor: "#2a2a2a", color: "#555" }}>
                                      <Shield className="h-2.5 w-2.5" /> Stream Only
                                    </span>
                                  ) : null}
                                </div>
                                {/* Controls */}
                                <div className="flex items-center gap-3 mt-1">
                                  {(hasFile || track.audioUrl) && (
                                    <button
                                      onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                                      className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                                      style={{ color: isExpanded ? "#ff7a00" : "#555" }}
                                      data-testid={`btn-play-profile-track-${track.id}`}
                                    >
                                      <Play className="h-2.5 w-2.5" /> {isExpanded ? "Hide" : "Play"}
                                    </button>
                                  )}
                                  {downloadOk && hasFile && (
                                    <a
                                      href={(track as any).fileUrl}
                                      download
                                      className="flex items-center gap-1 text-[10px] font-semibold text-[#888]"
                                      data-testid={`link-download-profile-track-${track.id}`}
                                    >
                                      <Download className="h-2.5 w-2.5" /> Download
                                    </a>
                                  )}
                                  {hasLicense && (
                                    <a
                                      href={(track as any).licenseFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[10px] font-semibold"
                                      style={{ color: "#3b82f6" }}
                                      data-testid={`link-license-profile-track-${track.id}`}
                                    >
                                      <FileBadge2 className="h-2.5 w-2.5" /> License
                                    </a>
                                  )}
                                  <Link href="/gz-music">
                                    <a className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#ff7a00" }}>
                                      <Music className="h-2.5 w-2.5" /> GZ100
                                    </a>
                                  </Link>
                                </div>
                              </div>

                              {/* Like count */}
                              <div
                                className="flex flex-col items-center gap-0.5 shrink-0 px-2 py-1.5 rounded-xl"
                                style={{ background: "#111", border: "1px solid #2a2a2a" }}
                              >
                                <Music className="h-4 w-4" style={{ color: "#ff7a00" }} />
                                <span className="text-[10px] font-bold" style={{ color: "#ff7a00" }}>{track.likeCount}</span>
                              </div>
                            </div>

                            {/* Inline player */}
                            {isExpanded && (hasFile || track.audioUrl) && (
                              <div className="px-3 pb-3">
                                {hasFile ? (
                                  <audio ref={(el) => { if (el) el.play().catch(() => {}); }} controls src={(track as any).fileUrl} className="w-full rounded-lg" style={{ height: "40px" }} />
                                ) : track.audioUrl ? (
                                  <iframe src={track.audioUrl} width="100%" height="80" allow="autoplay" className="rounded-lg border border-[#2a2a2a]" style={{ background: "#0a0a0a" }} />
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Link to full GZ100 chart */}
                  <Link href="/gz-music">
                    <a
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-bold transition-all"
                      style={{ borderColor: "#ff7a0035", background: "#ff7a0010", color: "#ff7a00" }}
                      data-testid="link-view-gz100"
                    >
                      <Music className="h-4 w-4" /> View Full GZ100 Chart
                    </a>
                  </Link>
                </div>
              )}

              {/* GEEZEE CARD */}
              {activeTab === "geezee" && (
                <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
                  {!geezeeCard || !geezeeCard.isPublic ? (
                    <div className="p-12 flex flex-col items-center gap-3 text-center">
                      <CreditCard className="w-10 h-10 text-[#222]" />
                      <p className="text-[#555] text-sm font-semibold">No GeeZee card published</p>
                      <p className="text-[#333] text-xs">{profile.displayName} hasn't published their GeeZee card yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {/* Card header */}
                      <div className="relative bg-gradient-to-br from-violet-900/40 to-violet-950/60 border-b border-violet-500/20 p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-violet-500/50 bg-[#1a1a1a] shrink-0">
                            {geezeeCard.profilePic || profile.avatarUrl ? (
                              <img src={(geezeeCard.profilePic || profile.avatarUrl)!} alt={profile.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-violet-300 font-bold text-lg">{initials}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-base">{profile.displayName}</p>
                            {profile.username && <p className="text-xs text-violet-400">@{profile.username}</p>}
                            {geezeeCard.slogan && (
                              <p className="text-xs text-violet-300/70 mt-1 italic">"{geezeeCard.slogan}"</p>
                            )}
                          </div>
                          <div className="shrink-0">
                            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 uppercase tracking-widest">GeeZee</span>
                          </div>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-5 space-y-4">
                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3">
                          {geezeeCard.intent && (
                            <div className="rounded-lg bg-[#111] border border-[#1e1e1e] p-3">
                              <p className="text-[9px] text-[#444] uppercase tracking-widest mb-1">Intent</p>
                              <p className="text-sm text-white font-semibold">{geezeeCard.intent}</p>
                            </div>
                          )}
                          {geezeeCard.gender && (
                            <div className="rounded-lg bg-[#111] border border-[#1e1e1e] p-3">
                              <p className="text-[9px] text-[#444] uppercase tracking-widest mb-1">Gender</p>
                              <p className="text-sm text-white font-semibold">{geezeeCard.gender}</p>
                            </div>
                          )}
                          {geezeeCard.ageBracket && (
                            <div className="rounded-lg bg-[#111] border border-[#1e1e1e] p-3">
                              <p className="text-[9px] text-[#444] uppercase tracking-widest mb-1">Age bracket</p>
                              <p className="text-sm text-white font-semibold">{geezeeCard.ageBracket}</p>
                            </div>
                          )}
                          {geezeeCard.engagementCount > 0 && (
                            <div className="rounded-lg bg-[#111] border border-[#1e1e1e] p-3">
                              <p className="text-[9px] text-[#444] uppercase tracking-widest mb-1">Engagements</p>
                              <p className="text-sm text-white font-semibold">{geezeeCard.engagementCount}</p>
                            </div>
                          )}
                        </div>

                        {/* Gallery */}
                        {geezeeCard.gallery && geezeeCard.gallery.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Gallery</p>
                            <div className="grid grid-cols-3 gap-2">
                              {geezeeCard.gallery.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="aspect-square rounded-lg overflow-hidden bg-[#111] border border-[#1e1e1e] hover:border-violet-500/40 transition-colors block"
                                  data-testid={`geezee-gallery-${i}`}>
                                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full card link */}
                        {profileUserId && (
                          <Link href={`/geezee/${profileUserId}`}>
                            <a
                              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/70 text-sm font-bold transition-all"
                              data-testid="link-view-full-geezee"
                            >
                              <ExternalLink className="h-4 w-4" /> View Full GeeZee Profile
                            </a>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <MoreBelow />
    </>
  );
}
