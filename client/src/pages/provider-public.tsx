import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import MoreBelow from "@/components/more-below";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Globe, Instagram, Youtube, Mail, Phone, MessageCircle, Megaphone, CreditCard, LayoutGrid } from "lucide-react";
import { SiTiktok, SiFacebook, SiDiscord, SiX } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProviderProfile, ListingWithProvider, LoveLeaderboardEntry } from "@shared/schema";

type LoveStatus = { voteCount: number; hasVoted: boolean };

export default function ProviderPublicPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery<ProviderProfile>({
    queryKey: ["/api/profile", id],
    queryFn: () => fetch(`/api/profile/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings/provider", id],
    queryFn: () => fetch(`/api/listings?provider=${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: loveStatus } = useQuery<LoveStatus>({
    queryKey: ["/api/love/status", id],
    queryFn: () => fetch(`/api/love/${id}/status`).then((r) => r.json()),
    enabled: !!id,
  });

  // GeeZee card — fetch once we have the profile's userId
  const profileUserId = (profile as any)?.userId as number | undefined;
  const { data: geezeeCard } = useQuery<{ id: number; isPublic: boolean } | null>({
    queryKey: ["/api/gigness-cards/user", profileUserId],
    queryFn: () =>
      fetch(`/api/gigness-cards/user/${profileUserId}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!profileUserId,
    staleTime: 60_000,
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
        toast({ title: "Already voted 😍", description: "You can only show love once per month. Come back next month!", variant: "destructive" });
      } else if (msg.includes("Login") || msg.includes("Unauthorized")) {
        toast({ title: "Sign in to show love", description: "Create a free account to vote for your favourite creator.", variant: "destructive" });
      } else if (msg.includes("yourself")) {
        toast({ title: "Nice try 😄", description: "You can't vote for yourself.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    },
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

  return (
    <>
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="link-back-to-main">
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Main
          </Link>
          <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff1a1a] hover:text-[#ff4444] transition-colors" data-testid="link-leaderboard">
            👑 Marketer of the Month
          </Link>
        </div>

        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-[#111] rounded-2xl" />
            <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
          </div>
        ) : !profile || (profile as any).message === "Not found" ? (
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center">
            <p className="text-[#555]">Creator not found.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
              {profile.thumbUrl && (
                <div className="h-40 w-full overflow-hidden">
                  <img src={profile.thumbUrl} alt="" className="w-full h-full object-cover opacity-60" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-end gap-4 -mt-2">

                  {/* Avatar with Show Love button */}
                  <div className="relative shrink-0 group" style={{ width: "72px", height: "72px" }}>
                    <div
                      style={{
                        width: "72px", height: "72px", borderRadius: "50%",
                        border: hasVoted ? "3px solid #ff69b4" : "3px solid #ff2b2b",
                        overflow: "hidden", background: "#1a1a1a",
                        transition: "border-color 0.3s",
                      }}
                      data-testid="img-provider-avatar"
                    >
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "20px", fontWeight: "700" }}>
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Show Love overlay on hover */}
                    <button
                      onClick={() => loveMutation.mutate()}
                      disabled={loveMutation.isPending}
                      className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title={hasVoted ? "Already shown love this month" : "Show Love"}
                      data-testid="button-show-love-avatar"
                    >
                      <span className="text-2xl" style={{ filter: hasVoted ? "none" : "grayscale(0.3)" }}>
                        {hasVoted ? "😍" : "🤍"}
                      </span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <h1 className="text-lg font-bold text-white truncate" data-testid="text-provider-name">{profile.displayName}</h1>
                    {profile.username && (
                      <p className="text-xs text-[#555]">@{profile.username}</p>
                    )}
                  </div>
                  {profile.primaryCategory && (
                    <Badge className="bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/25 text-xs shrink-0">
                      {profile.primaryCategory.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-sm text-[#aaa] mt-3 leading-relaxed">{profile.bio}</p>
                )}

                {profile.location && (
                  <p className="flex items-center gap-1.5 text-xs text-[#555] mt-2">
                    <MapPin className="h-3 w-3" /> {profile.location}
                  </p>
                )}

                {/* Show Love + Promote action bar */}
                <div className="mt-4 flex items-start flex-wrap gap-3">
                  <div className="flex items-center flex-wrap gap-3 flex-1">
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
                        <Megaphone className="h-3.5 w-3.5" />
                        Promote My Business
                      </a>
                    </Link>
                    {voteCount > 0 && (
                      <span className="text-xs text-[#555] w-full" data-testid="text-vote-count">
                        {voteCount} {voteCount === 1 ? "person" : "people"} showed love this month
                      </span>
                    )}
                  </div>

                  {/* GeeZee panel */}
                  <div className="flex flex-col gap-2 shrink-0 w-[148px]">
                    {/* GeeZee Card — always shown */}
                    {geezeeCard?.isPublic && profileUserId ? (
                      <Link href={`/geezee/${profileUserId}`}>
                        <a
                          className="flex flex-col items-center justify-center gap-1 w-full h-[72px] rounded-xl border border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/80 transition-all active:scale-95 cursor-pointer"
                          data-testid="link-geezee-card"
                        >
                          <CreditCard className="h-5 w-5 shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide">GeeZee Card</span>
                          <span className="text-[10px] text-violet-400/70">Tap to view</span>
                        </a>
                      </Link>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-1 w-full h-[72px] rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] text-[#444]"
                        data-testid="geezee-card-placeholder"
                      >
                        <CreditCard className="h-5 w-5 shrink-0" />
                        <span className="text-[11px] font-semibold">GeeZee Card</span>
                        <span className="text-[10px] text-[#333]">Not published</span>
                      </div>
                    )}
                    {/* GeeZee Rolodex */}
                    <Link href="/geezees">
                      <a
                        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/8 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 hover:border-violet-500/60 hover:text-violet-300 transition-all active:scale-95"
                        data-testid="link-geezee-rolodex"
                      >
                        <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        GeeZee Rolodex
                      </a>
                    </Link>
                  </div>
                </div>

                {/* Contact links */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.websiteUrl && (
                    <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-website">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                  {profile.contactEmail && (
                    <a href={`mailto:${profile.contactEmail}`}
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-email">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                  )}
                  {profile.contactPhone && (profile as any).showPhone && (
                    <a href={`tel:${profile.contactPhone}`}
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-phone">
                      <Phone className="h-3.5 w-3.5" /> {profile.contactPhone}
                    </a>
                  )}
                  {profile.contactTelegram && (
                    <a href={`https://t.me/${profile.contactTelegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-telegram">
                      <MessageCircle className="h-3.5 w-3.5" /> Telegram
                    </a>
                  )}
                </div>

                {/* Social icons row */}
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

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
                <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Photos</h2>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-[#111] block border border-[#1e1e1e] hover:border-[#333] transition-colors"
                      data-testid={`img-gallery-${i + 1}`}>
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Listings */}
            {listingsLoading ? (
              <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
            ) : listings.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Videos</h2>
                {listings.map((l) => (
                  <div key={l.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid={`listing-card-${l.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{l.title}</p>
                        {l.description && <p className="text-xs text-[#666] mt-1 line-clamp-2">{l.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className="bg-[#ff2b2b]/10 text-[#ff2b2b] border border-[#ff2b2b]/20 text-xs">
                            {l.vertical.replace(/_/g, " ")}
                          </Badge>
                          {l.tags?.map((tag) => (
                            <span key={tag} className="text-xs text-[#555]">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
    <MoreBelow />
    </>
  );
}
