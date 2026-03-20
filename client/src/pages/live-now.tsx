import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Eye, Play, Square, Users, Radio, ExternalLink } from "lucide-react";

// ── Types from Zito.TV ────────────────────────────────────────────────────────
type ZitoStream = {
  id: string;
  gigzitoUserId: string;
  username: string;
  name: string;
  category: string;
  description?: string;
  avatarUrl?: string;
  tags?: string[];
  isLive: boolean;
  streamUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  viewerCount?: number;
  slotIndex?: number;
};

// ── Category colors ───────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { ring: string; badge: string }> = {
  Music:      { ring: "ring-pink-500/40",   badge: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  Comedy:     { ring: "ring-yellow-500/40", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  Sports:     { ring: "ring-blue-500/40",   badge: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  "Talk Show":{ ring: "ring-purple-500/40", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  Events:     { ring: "ring-amber-500/40",  badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  Gaming:     { ring: "ring-green-500/40",  badge: "bg-green-500/20 text-green-300 border-green-500/30" },
};
const defaultColor = { ring: "ring-red-500/30", badge: "bg-red-500/20 text-red-300 border-red-500/30" };

const ZITOTV_BASE = "https://1d2776d5-bf1b-41f5-a23d-4647c201aecb-00-25m6h440wdpa3.kirk.replit.dev";

// ── Stream embed resolver ─────────────────────────────────────────────────────
function resolveEmbed(url: string): { canEmbed: boolean; src: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      else if (u.searchParams.get("v")) id = u.searchParams.get("v")!;
      else if (u.pathname.includes("/live/")) id = u.pathname.split("/live/")[1]?.split("?")[0];
      if (id) return { canEmbed: true, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&modestbranding=1&rel=0` };
    }
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.slice(1).split("/")[0];
      if (channel) return { canEmbed: true, src: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true` };
    }
    if (url.includes(".m3u8") || url.includes(".mp4") || url.includes(".webm")) {
      return { canEmbed: true, src: url };
    }
    return { canEmbed: false, src: url };
  } catch {
    return { canEmbed: false, src: url };
  }
}

// Build the Zito.TV watch URL for a streamer (fallback when no streamUrl in API)
function zitoWatchUrl(stream: ZitoStream): string {
  return `${ZITOTV_BASE}/watch/${stream.username}`;
}

// ── Single streamer card ──────────────────────────────────────────────────────
function StreamCard({
  stream,
  isWatching,
  onWatch,
  onStop,
}: {
  stream: ZitoStream;
  isWatching: boolean;
  onWatch: () => void;
  onStop: () => void;
}) {
  const cat = CAT_COLOR[stream.category] ?? defaultColor;
  const initials = stream.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const embed = stream.streamUrl ? resolveEmbed(stream.streamUrl) : null;

  return (
    <div
      className={`rounded-2xl bg-[#0b0b0b] border overflow-hidden transition-all ${
        isWatching ? "border-[#ff2b2b]/60 ring-1 ring-[#ff2b2b]/30" : "border-[#1e1e1e] hover:border-[#2a2a2a]"
      }`}
      data-testid={`card-stream-${stream.id}`}
    >
      {/* Placeholder / Player area */}
      <div className="relative aspect-video bg-[#0a0a0a]">
        {isWatching ? (
          // ── Active stream ────────────────────────────────────────────────
          <>
            {stream.streamUrl && embed?.canEmbed ? (
              embed.src.includes(".m3u8") || embed.src.includes(".mp4") ? (
                <video
                  key={stream.id}
                  src={embed.src}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  controls
                  playsInline
                  data-testid={`video-live-${stream.id}`}
                />
              ) : (
                <iframe
                  key={stream.id}
                  src={embed.src}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={stream.title ?? stream.name}
                  data-testid={`iframe-live-${stream.id}`}
                />
              )
            ) : (
              // No embeddable URL → show Zito.TV redirect panel
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#070d10]"
                data-testid={`panel-watch-zito-${stream.id}`}>
                <div className="space-y-1">
                  <p className="text-white font-bold text-sm">{stream.name}</p>
                  <p className="text-[#555] text-xs">is streaming live on Zito.TV</p>
                </div>
                <a
                  href={zitoWatchUrl(stream)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors shadow-lg shadow-cyan-900/30"
                    data-testid={`btn-watch-zitotv-${stream.id}`}
                  >
                    <ExternalLink className="w-4 h-4" /> Watch on Zito.TV
                  </button>
                </a>
                <p className="text-[#333] text-xs">Opens Zito.TV in a new tab</p>
              </div>
            )}

            {/* Stop button overlay */}
            <button
              onClick={onStop}
              className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 hover:bg-black/90 border border-white/10 text-white text-xs font-semibold rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors z-10"
              data-testid={`btn-stop-${stream.id}`}
            >
              <Square className="w-3 h-3 fill-white" /> Stop
            </button>
          </>
        ) : (
          // ── Dormant placeholder ──────────────────────────────────────────
          <>
            {/* Background thumbnail or gradient */}
            {stream.thumbnailUrl ? (
              <img
                src={stream.thumbnailUrl}
                alt={stream.name}
                className="w-full h-full object-cover opacity-70"
              />
            ) : stream.avatarUrl ? (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0f0f0f, #1a0000)" }}>
                <img
                  src={stream.avatarUrl}
                  alt={stream.name}
                  className="w-24 h-24 rounded-full object-cover opacity-50 blur-[1px]"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0f0f0f, #1a0000)" }}>
                <span className="text-4xl font-black text-white/10">{initials}</span>
              </div>
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* LIVE badge */}
            {stream.isLive && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#ff2b2b] rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white text-[10px] font-black tracking-widest uppercase">Live</span>
              </div>
            )}

            {/* Viewer count */}
            {stream.isLive && (stream.viewerCount ?? 0) > 0 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 border border-white/10 rounded-full px-2 py-1 backdrop-blur-sm">
                <Eye className="w-3 h-3 text-white/60" />
                <span className="text-white/80 text-[10px] font-semibold">{(stream.viewerCount ?? 0).toLocaleString()}</span>
              </div>
            )}

            {/* Watch button — center of card, only if live */}
            {stream.isLive && (
              <button
                onClick={onWatch}
                className="absolute inset-0 flex items-center justify-center group"
                data-testid={`btn-watch-${stream.id}`}
              >
                <div className="flex items-center gap-2 bg-[#ff2b2b] group-hover:bg-[#e01e1e] text-white font-bold rounded-full px-5 py-2.5 text-sm shadow-lg shadow-red-900/40 transition-all group-hover:scale-105">
                  <Play className="w-4 h-4 fill-white" />
                  Watch
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full shrink-0 overflow-hidden border-2 ${stream.isLive ? cat.ring : "border-[#2a2a2a]"} ring-1`}>
          {stream.avatarUrl ? (
            <img src={stream.avatarUrl} alt={stream.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a0000] text-[10px] font-bold text-[#ff2b2b]">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate" data-testid={`text-streamer-name-${stream.id}`}>
            {stream.isLive && stream.title ? stream.title : stream.name}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {stream.name}{stream.isLive && stream.title ? ` · @${stream.username}` : ""}
          </p>
        </div>

        {/* Category badge */}
        <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${cat.badge}`}>
          {stream.category}
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LiveNowPage() {
  const { user } = useAuth();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  const { data: streams = [], isLoading, isError } = useQuery<ZitoStream[]>({
    queryKey: ["/api/zito-live/streams"],
    refetchInterval: 20000,
    retry: 3,
    retryDelay: 5000,
  });

  const liveStreams = streams.filter((s) => s.isLive);
  const offlineStreams = streams.filter((s) => !s.isLive);

  const handleWatch = (id: string) => setActiveStreamId(id);
  const handleStop = () => setActiveStreamId(null);

  // If the active stream goes offline, stop it automatically
  useEffect(() => {
    if (activeStreamId && !streams.find((s) => s.id === activeStreamId && s.isLive)) {
      setActiveStreamId(null);
    }
  }, [streams, activeStreamId]);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Navbar />

      {/* Hero header */}
      <div className="border-b border-[#111] bg-gradient-to-b from-[#0a0000] to-black">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2b2b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff2b2b]" />
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight" data-testid="text-live-heading">
                  Live on Zito.TV
                </h1>
              </div>
              <p className="text-sm text-[#555]">
                {liveStreams.length > 0
                  ? `${liveStreams.length} stream${liveStreams.length > 1 ? "s" : ""} live right now — tap Watch to tune in`
                  : "Your live marketplace — tune in when creators go live"}
              </p>
            </div>

            {liveStreams.length > 0 && (
              <div className="shrink-0 flex items-center gap-2 bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
                <span className="text-[#ff2b2b] text-sm font-bold">{liveStreams.length} Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* Go live CTA */}
        <Link href="/live/go">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] hover:border-[#ff2b2b]/40 transition-colors cursor-pointer group" data-testid="link-go-live-cta">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 flex items-center justify-center">
                <Radio className="w-4 h-4 text-[#ff2b2b]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Are you a creator?</p>
                <p className="text-xs text-[#555]">Go live on Zito.TV directly from Gigzito</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#333] group-hover:text-[#ff2b2b] transition-colors shrink-0" />
          </div>
        </Link>

        {/* One-at-a-time notice */}
        {activeStreamId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 text-[#ff2b2b] text-xs font-semibold" data-testid="notice-one-stream">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse shrink-0" />
            You're watching a stream. Click another card's Watch button to switch — the current one will stop automatically.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden animate-pulse">
                <div className="aspect-video bg-[#111]" />
                <div className="p-3 flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#1a1a1a] rounded w-32" />
                    <div className="h-2.5 bg-[#111] rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center space-y-4" data-testid="error-streams">
            <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/5 border border-cyan-500/10" />
              <Radio className="w-6 h-6 text-[#333]" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-1">Zito.TV is starting up</p>
              <p className="text-[#555] text-xs max-w-xs mx-auto">
                The streaming platform is spinning up — this usually takes a few seconds. The page will refresh automatically.
              </p>
            </div>
            <a href="https://zito.tv/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-500 text-xs hover:text-cyan-400 transition-colors">
              <ExternalLink className="w-3 h-3" /> Visit Zito.TV directly
            </a>
          </div>
        )}

        {/* Live streams */}
        {!isLoading && liveStreams.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest px-0.5">🔴 Live Now</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="grid-live-streams">
              {liveStreams.map((s) => (
                <StreamCard
                  key={s.id}
                  stream={s}
                  isWatching={activeStreamId === s.id}
                  onWatch={() => handleWatch(s.id)}
                  onStop={handleStop}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty live state */}
        {!isLoading && !isError && liveStreams.length === 0 && (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-14 text-center space-y-4" data-testid="text-no-live">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#ff2b2b]/5 border border-[#ff2b2b]/10" />
              <span className="text-3xl">📡</span>
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">No one is live right now</p>
              <p className="text-[#555] text-sm max-w-xs mx-auto">
                Creators, musicians, and event hosts go live here via Zito.TV.<br />Check back soon or start your own stream.
              </p>
            </div>
            <Link href="/live/go">
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 text-[#ff2b2b] text-sm font-semibold hover:bg-[#ff2b2b]/20 transition-colors cursor-pointer">
                <Radio className="w-4 h-4" /> Go Live Now
              </div>
            </Link>
          </div>
        )}

        {/* Offline/registered streamers */}
        {!isLoading && !isError && offlineStreams.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest px-0.5">Registered Streamers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="grid-offline-streams">
              {offlineStreams.map((s) => (
                <StreamCard
                  key={s.id}
                  stream={s}
                  isWatching={false}
                  onWatch={() => {}}
                  onStop={handleStop}
                />
              ))}
            </div>
          </div>
        )}

        {/* Auto-refresh note */}
        {!isLoading && streams.length > 0 && (
          <p className="text-center text-xs text-[#2a2a2a]">Updates every 20 seconds</p>
        )}
      </div>
    </div>
  );
}
