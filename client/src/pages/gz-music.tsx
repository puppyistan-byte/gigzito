import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import {
  Music, Heart, Trophy, Flame, Radio, Mic2, Headphones,
  ExternalLink, Play, ChevronUp,
} from "lucide-react";
import type { GZMusicTrack } from "@shared/schema";

const ORANGE = "#ff7a00";
const ORANGE_DIM = "#ff7a0018";
const ORANGE_BORDER = "#ff7a0035";
const ORANGE_MED = "#ff7a0060";

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

function TrackCard({ track, rank, liked, onLike }: {
  track: GZMusicTrack;
  rank: number;
  liked: boolean;
  onLike: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all border"
      style={{
        background: liked ? ORANGE_DIM : "#0b0b0b",
        borderColor: liked ? ORANGE_BORDER : "#1e1e1e",
      }}
      data-testid={`track-card-${track.id}`}
    >
      <RankBadge rank={rank} />

      {/* Cover art */}
      <div
        className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}
      >
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <Headphones className="h-5 w-5" style={{ color: ORANGE }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate" data-testid={`track-title-${track.id}`}>{track.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-[#888]">{track.artist}</p>
          {track.genre && (
            <Badge className="text-[9px] font-bold px-1.5 py-0 h-4 border-0" style={{ background: ORANGE_DIM, color: ORANGE }}>
              {track.genre}
            </Badge>
          )}
        </div>
        {track.audioUrl && (
          <button
            onClick={() => setExpanded((x) => !x)}
            className="flex items-center gap-1 mt-1 text-[10px] font-semibold transition-colors"
            style={{ color: expanded ? ORANGE : "#555" }}
          >
            <Play className="h-2.5 w-2.5" /> {expanded ? "Hide player" : "Play"}
          </button>
        )}
        {expanded && track.audioUrl && (
          <div className="mt-2">
            <iframe
              src={track.audioUrl}
              width="100%"
              height="80"
              allow="autoplay"
              className="rounded-lg border border-[#2a2a2a]"
              style={{ background: "#0a0a0a" }}
            />
          </div>
        )}
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
  );
}

export default function GZMusicPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery<GZMusicTrack[]>({
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

  const likeMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/gz-music/tracks/${trackId}/like`),
    onMutate: async (trackId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gz-music/tracks"] });
      const prevTracks = queryClient.getQueryData<GZMusicTrack[]>(["/api/gz-music/tracks"]);
      const wasLiked = likedMap[trackId] ?? false;
      queryClient.setQueryData<GZMusicTrack[]>(["/api/gz-music/tracks"], (old) =>
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

  const handleLike = (trackId: number) => {
    if (!user) {
      toast({ title: "Sign in to vote", description: "Create a free Gigzito account to vote for your favorites.", variant: "destructive" });
      return;
    }
    likeMutation.mutate(trackId);
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
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.12) 0%, transparent 70%)" }} />

          <div className="relative p-6 space-y-4">
            {/* Wordmark */}
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
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}` }}>
                <Radio className="h-3 w-3" style={{ color: ORANGE }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>Live Chart</span>
              </div>
            </div>

            <div className="space-y-2 text-sm leading-relaxed text-[#999]">
              <p>
                The old systems of control are fading. GZMusic is not just a platform — it is a{" "}
                <span className="font-semibold" style={{ color: ORANGE }}>declaration of independence</span>{" "}
                for the creator and the listener. We are reclaiming the frequency, stripping away the corporate filters, and returning the power of sound to the people who make it and the souls who feel it.
              </p>
            </div>

            {/* Pillars */}
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
            <p className="text-xs text-[#555]">The People's Pulse — ranked by your votes</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-black" style={{ color: ORANGE }}>{tracks.length}</p>
            <p className="text-[10px] text-[#444] uppercase tracking-widest">tracks</p>
          </div>
        </div>

        {/* What is the GZ100? */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">How the GZ100 works</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Democratic", desc: "100% community-driven. No paid placement." },
              { label: "Transparent", desc: "Real likes, real artists, real movement." },
              { label: "Living", desc: "Rankings shift daily as votes pour in." },
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
              />
            ))}
          </div>
        )}

        {/* ── Footer call-to-action ─────────────────────────────────────────── */}
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
