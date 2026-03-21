import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import {
  Music, Heart, Trophy, Flame, Radio, Mic2, Headphones,
  ExternalLink, Play, ChevronUp, Upload, Download, Shield, FileBadge2,
  Star, StarHalf,
} from "lucide-react";
import type { GZMusicTrack } from "@shared/schema";

const ORANGE = "#ff7a00";
const ORANGE_DIM = "#ff7a0018";
const ORANGE_BORDER = "#ff7a0035";

type TrackWithRating = GZMusicTrack & { avgRating: number; ratingCount: number };

// ── Star helpers ──────────────────────────────────────────────────────────────

function renderStarIcon(position: number, value: number, color: string, sizeClass: string) {
  if (value >= position) {
    return <Star key={position} className={`${sizeClass} shrink-0`} style={{ fill: color, color }} />;
  }
  if (value >= position - 0.5) {
    return <StarHalf key={position} className={`${sizeClass} shrink-0`} style={{ fill: color, color }} />;
  }
  return <Star key={position} className={`${sizeClass} shrink-0`} style={{ fill: "none", color: "#2a2a2a" }} />;
}

function StarDisplay({ value, count }: { value: number; count: number }) {
  const displayVal = count === 0 ? 3.0 : value;
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {[1, 2, 3, 4, 5, 6].map((pos) => renderStarIcon(pos, displayVal, ORANGE, "h-3 w-3"))}
      <span className="text-[10px] font-black ml-1" style={{ color: ORANGE }}>
        {displayVal.toFixed(1)}
      </span>
      {count > 0 ? (
        <span className="text-[9px] text-[#444] ml-0.5">({count} rating{count !== 1 ? "s" : ""})</span>
      ) : (
        <span className="text-[9px] text-[#444] ml-0.5">(gifted starter)</span>
      )}
    </div>
  );
}

function HalfStarRating({
  value,
  onRate,
  disabled,
}: {
  value: number;
  onRate: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number>(0);
  const display = hovered || value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
      data-testid="half-star-rating"
    >
      {[1, 2, 3, 4, 5, 6].map((pos) => (
        <div
          key={pos}
          className="relative"
          style={{ width: 18, height: 18, cursor: disabled ? "default" : "pointer" }}
        >
          {renderStarIcon(pos, display, ORANGE, "h-[18px] w-[18px]")}
          {!disabled && (
            <>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(pos - 0.5)}
                onClick={() => onRate(pos - 0.5)}
              />
              <div
                className="absolute inset-y-0 right-0"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(pos)}
                onClick={() => onRate(pos)}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #ffd700, #ffa500)", color: "#000", boxShadow: "0 0 12px rgba(255,165,0,0.6)" }}>
      <Trophy className="h-4 w-4" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #c0c0c0, #a8a8a8)", color: "#000" }}>
      2
    </div>
  );
  if (rank === 3) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #cd7f32, #a0522d)", color: "#fff" }}>
      3
    </div>
  );
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-xs"
      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#555" }}>
      {rank}
    </div>
  );
}

// ── Track card ────────────────────────────────────────────────────────────────

function TrackCard({
  track,
  rank,
  liked,
  onLike,
  myRating,
  onRate,
  ratingPending,
}: {
  track: TrackWithRating;
  rank: number;
  liked: boolean;
  onLike: () => void;
  myRating: number;
  onRate: (stars: number) => void;
  ratingPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFile = !!(track as any).fileUrl;
  const hasLicense = !!(track as any).licenseFileUrl;
  const downloadOk = (track as any).downloadEnabled;

  return (
    <div
      className="rounded-xl transition-all border overflow-hidden"
      style={{
        background: liked ? ORANGE_DIM : "#0b0b0b",
        borderColor: liked ? ORANGE_BORDER : "#1e1e1e",
      }}
      data-testid={`track-card-${track.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <RankBadge rank={rank} />

        {/* Cover art */}
        <div
          className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "#111", border: "1px solid #2a2a2a" }}
        >
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Headphones className="h-5 w-5" style={{ color: ORANGE }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate" data-testid={`track-title-${track.id}`}>{track.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-[#888]">{track.artist}</p>
            {track.genre && (
              <Badge className="text-[9px] font-bold px-1.5 py-0 h-4 border-0" style={{ background: ORANGE_DIM, color: ORANGE }}>
                {track.genre}
              </Badge>
            )}
          </div>

          {/* Avg community rating */}
          <div className="mt-1">
            <StarDisplay value={track.avgRating} count={track.ratingCount} />
          </div>

          {/* Badges row */}
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
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: ORANGE_DIM, borderColor: ORANGE_BORDER, color: ORANGE }}>
                <Download className="h-2.5 w-2.5" /> Download OK
              </span>
            ) : hasFile ? (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#1a1a1a", borderColor: "#2a2a2a", color: "#555" }}>
                <Shield className="h-2.5 w-2.5" /> Stream Only
              </span>
            ) : null}
          </div>

          {/* Play controls */}
          <div className="flex items-center gap-3 mt-1">
            {(track.audioUrl || hasFile) && (
              <button
                onClick={() => setExpanded((x) => !x)}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: expanded ? ORANGE : "#555" }}
              >
                <Play className="h-2.5 w-2.5" /> {expanded ? "Hide" : "Play"}
              </button>
            )}
            {downloadOk && hasFile && (
              <a
                href={(track as any).fileUrl}
                download
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: "#888" }}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-download-track-${track.id}`}
              >
                <Download className="h-2.5 w-2.5" /> Download
              </a>
            )}
            {hasLicense && (
              <a
                href={(track as any).licenseFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: "#3b82f6" }}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-license-track-${track.id}`}
              >
                <FileBadge2 className="h-2.5 w-2.5" /> View License
              </a>
            )}
          </div>
        </div>

        {/* Like button */}
        <button
          onClick={onLike}
          className="flex flex-col items-center gap-0.5 shrink-0 px-2 py-1.5 rounded-xl transition-all active:scale-90"
          style={{
            background: liked ? ORANGE_DIM : "#111",
            border: `1px solid ${liked ? ORANGE_BORDER : "#2a2a2a"}`,
          }}
          data-testid={`button-like-track-${track.id}`}
        >
          <Heart
            className="h-4 w-4"
            style={{ color: liked ? ORANGE : "#555", fill: liked ? ORANGE : "none" }}
          />
          <span className="text-[10px] font-bold" style={{ color: liked ? ORANGE : "#555" }}>
            {track.likeCount}
          </span>
        </button>
      </div>

      {/* Rating row */}
      <div
        className="px-3 pb-2.5 flex items-center gap-2"
        style={{ borderTop: "1px solid #111" }}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#444] shrink-0">
          {myRating ? "Your rating:" : "Rate:"}
        </span>
        <HalfStarRating
          value={myRating}
          onRate={ratingPending ? () => {} : onRate}
          disabled={ratingPending}
        />
        {myRating > 0 && (
          <span className="text-[10px] font-black ml-1" style={{ color: ORANGE }}>
            {myRating.toFixed(1)} ★
          </span>
        )}
      </div>

      {/* Embedded player */}
      {expanded && (track.audioUrl || hasFile) && (
        <div className="px-3 pb-3">
          {hasFile ? (
            <audio
              controls
              src={(track as any).fileUrl}
              className="w-full rounded-lg"
              style={{ height: "40px" }}
            />
          ) : track.audioUrl ? (
            <>
              {track.audioUrl.includes("soundcloud.com") ? (
                <iframe
                  width="100%"
                  height="80"
                  allow="autoplay"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.audioUrl)}&color=%23ff7a00&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
                  className="rounded-lg"
                  style={{ border: "none" }}
                />
              ) : track.audioUrl.includes("youtube.com") || track.audioUrl.includes("youtu.be") ? (
                <iframe
                  width="100%"
                  height="120"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(track.audioUrl)}?autoplay=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                  style={{ border: "none" }}
                />
              ) : (
                <a
                  href={track.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: ORANGE }}
                >
                  <ExternalLink className="h-3 w-3" /> Open in new tab
                </a>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GZMusicPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery<TrackWithRating[]>({
    queryKey: ["/api/gz-music/tracks"],
  });

  const userId = (user as any)?.user?.id as number | undefined;

  const { data: likedMap = {} } = useQuery<Record<number, boolean>>({
    queryKey: ["/api/gz-music/likes/batch", tracks.map((t) => t.id).join(",")],
    queryFn: () => {
      const ids = tracks.map((t) => t.id).join(",");
      return fetch(`/api/gz-music/likes/batch?ids=${ids}`).then((r) => r.json());
    },
    enabled: !!userId && tracks.length > 0,
    staleTime: 30_000,
  });

  const { data: ratingsMap = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/gz-music/ratings/batch", tracks.map((t) => t.id).join(",")],
    queryFn: () => {
      const ids = tracks.map((t) => t.id).join(",");
      return fetch(`/api/gz-music/ratings/batch?ids=${ids}`).then((r) => r.json());
    },
    enabled: !!userId && tracks.length > 0,
    staleTime: 30_000,
  });

  const likeMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/gz-music/tracks/${trackId}/like`),
    onMutate: async (trackId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gz-music/tracks"] });
      const prevTracks = queryClient.getQueryData<TrackWithRating[]>(["/api/gz-music/tracks"]);
      const wasLiked = likedMap[trackId] ?? false;
      queryClient.setQueryData<TrackWithRating[]>(["/api/gz-music/tracks"], (old) =>
        old?.map((t) => t.id === trackId ? { ...t, likeCount: t.likeCount + (wasLiked ? -1 : 1) } : t)
      );
      return { prevTracks };
    },
    onError: (err: any, _trackId, ctx) => {
      if (ctx?.prevTracks) queryClient.setQueryData(["/api/gz-music/tracks"], ctx.prevTracks);
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        toast({ title: "Sign in to vote", description: "Create a free account to like tracks.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Couldn't update your vote.", variant: "destructive" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/likes/batch"] });
    },
  });

  const [ratingPending, setRatingPending] = useState<number | null>(null);

  const rateMutation = useMutation({
    mutationFn: ({ trackId, stars }: { trackId: number; stars: number }) =>
      apiRequest("POST", `/api/gz-music/tracks/${trackId}/rate`, { stars }),
    onMutate: ({ trackId }) => setRatingPending(trackId),
    onSuccess: (data: any, { trackId, stars }) => {
      setRatingPending(null);
      // Optimistically update avg in track list
      queryClient.setQueryData<TrackWithRating[]>(["/api/gz-music/tracks"], (old) =>
        old?.map((t) => t.id === trackId
          ? { ...t, avgRating: data?.avgRating ?? t.avgRating, ratingCount: data?.ratingCount ?? t.ratingCount }
          : t)
      );
      // Update ratings batch cache
      queryClient.setQueryData<Record<number, number>>(
        ["/api/gz-music/ratings/batch", tracks.map((t) => t.id).join(",")],
        (old) => ({ ...(old ?? {}), [trackId]: stars })
      );
      toast({ title: "Rated!", description: `You gave this track ${stars} star${stars !== 1 ? "s" : ""}.` });
    },
    onError: (err: any) => {
      setRatingPending(null);
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        toast({ title: "Sign in to rate", description: "Create a free Gigzito account to rate tracks.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Couldn't save your rating.", variant: "destructive" });
      }
    },
  });

  const handleLike = (trackId: number) => {
    if (!user) {
      toast({ title: "Sign in to vote", description: "Create a free Gigzito account to vote for your favorites.", variant: "destructive" });
      return;
    }
    likeMutation.mutate(trackId);
  };

  const handleRate = (trackId: number, stars: number) => {
    if (!user) {
      toast({ title: "Sign in to rate", description: "Create a free Gigzito account to rate tracks.", variant: "destructive" });
      return;
    }
    rateMutation.mutate({ trackId, stars });
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-6">

        {/* ── Hero / Manifesto ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0f0800 0%, #1a0c00 50%, #0a0a0a 100%)",
            border: `1px solid ${ORANGE_BORDER}`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.12) 0%, transparent 70%)" }} />

          <div className="relative p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, boxShadow: `0 4px 20px rgba(255,122,0,0.5)` }}
              >
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: ORANGE, textShadow: `0 0 20px rgba(255,122,0,0.5)` }}>
                  GZMusic
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">The Sound of Autonomy</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}` }}>
                  <Radio className="h-3 w-3" style={{ color: ORANGE }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>Live Chart</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(user ? "/gz-music/upload" : "/auth")}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`,
                color: "#fff",
                boxShadow: `0 4px 20px rgba(255,122,0,0.4)`,
              }}
              data-testid="button-upload-track-hero"
            >
              <Upload className="h-4 w-4" />
              Upload Your Track to the GZ100
            </button>

            <div className="space-y-2 text-sm leading-relaxed text-[#999]">
              <p>
                The old systems of control are fading. GZMusic is not just a platform — it is a{" "}
                <span className="font-semibold" style={{ color: ORANGE }}>declaration of independence</span>{" "}
                for the creator and the listener. We are reclaiming the frequency, stripping away the corporate filters, and returning the power of sound to the people who make it and the souls who feel it.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Mic2, label: "Our Artist", sub: "Our Way" },
                { icon: Flame, label: "Pure Engagement", sub: "No gatekeepers" },
                { icon: ChevronUp, label: "Real Talent", sub: "Rises to the top" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl p-3 text-center space-y-1" style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}` }}>
                    <Icon className="h-4 w-4 mx-auto" style={{ color: ORANGE }} />
                    <p className="text-[10px] font-black text-white">{item.label}</p>
                    <p className="text-[9px] text-[#555]">{item.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── GZ100 Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)` }}
          >
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">The GZ100</h2>
            <p className="text-xs text-[#555]">Ranked by star ratings + community likes</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-black" style={{ color: ORANGE }}>{tracks.length}</p>
            <p className="text-[10px] text-[#444] uppercase tracking-widest">tracks</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">How the GZ100 works</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "6-Star Rating", desc: "Each track starts at 3★ gifted. Your rating shifts the rank." },
              { label: "Transparent", desc: "Real ratings, real artists, real movement." },
              { label: "Living", desc: "Rankings shift live as votes and ratings pour in." },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-bold" style={{ color: ORANGE }}>{item.label}</p>
                <p className="text-[10px] text-[#444] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chart ────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" style={{ background: "#111" }} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div
            className="rounded-2xl p-16 flex flex-col items-center gap-4 text-center"
            style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}
          >
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ background: ORANGE_DIM, border: `2px solid ${ORANGE_BORDER}` }}
            >
              <Music className="h-7 w-7" style={{ color: ORANGE }} />
            </div>
            <div className="space-y-1.5">
              <p className="font-black text-white text-lg">No tracks yet</p>
              <p className="text-sm text-[#555] max-w-[240px] leading-relaxed">
                The GZ100 is being built. Artists are loading their sound. Check back soon — the movement is coming.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                rank={index + 1}
                liked={likedMap[track.id] ?? false}
                onLike={() => handleLike(track.id)}
                myRating={ratingsMap[track.id] ?? 0}
                onRate={(stars) => handleRate(track.id, stars)}
                ratingPending={ratingPending === track.id}
              />
            ))}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 text-center space-y-3"
          style={{
            background: `linear-gradient(135deg, #0f0800, #1a0c00)`,
            border: `1px solid ${ORANGE_BORDER}`,
          }}
        >
          <p className="font-black text-white text-base">Break the cycle. Find your frequency.</p>
          <p className="text-sm text-[#888]">
            This is more than a library of tracks — it is an endeavor to shift the paradigm. Whether we are pushing code to ash or hills, the goal remains the same: a total replacement of the outdated structures that limit our potential.
          </p>
          <p className="font-black text-lg" style={{ color: ORANGE }}>This is GZMusic.</p>
        </div>
      </div>
    </div>
  );
}
