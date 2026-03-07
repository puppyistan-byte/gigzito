import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Radio, X, Eye, Volume2, VolumeX } from "lucide-react";
import type { LiveSessionWithProvider } from "@shared/schema";

function getEmbedUrl(url: string, muted: boolean): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.pathname.includes("/embed/")) {
        const eu = new URL(url);
        eu.searchParams.set("autoplay", "1");
        eu.searchParams.set("mute", muted ? "1" : "0");
        eu.searchParams.set("controls", "0");
        eu.searchParams.set("modestbranding", "1");
        eu.searchParams.set("rel", "0");
        return eu.toString();
      }
      let id = u.hostname === "youtu.be" ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? "");
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&modestbranding=1&rel=0`;
    }
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.slice(1);
      const parent = window.location.hostname;
      return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=${muted}&autoplay=true`;
    }
    if (url.endsWith(".m3u8") || url.endsWith(".mp4")) return null;
    return null;
  } catch { return null; }
}

function isDirectVideo(url: string): boolean {
  return url.endsWith(".m3u8") || url.endsWith(".mp4");
}

export function MiniLivePlayer() {
  const [dismissed, setDismissed] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, navigate] = useLocation();

  const { data: sessions = [] } = useQuery<LiveSessionWithProvider[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 30000,
  });

  const session = sessions[0];
  const hasSession = !!session && !dismissed;

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    } else {
      setMuted((m) => !m);
    }
  };

  const EMBED_H = 134;
  const CARD_W = 238;

  return (
    <div
      className="fixed z-50"
      style={{ bottom: "84px", left: "12px" }}
      data-testid="mini-live-player"
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: `${CARD_W}px`,
          background: "rgba(11,11,11,0.97)",
          border: hasSession
            ? "1px solid rgba(255,43,43,0.45)"
            : "1px solid rgba(255,43,43,0.18)",
          boxShadow: hasSession
            ? "0 4px 24px rgba(255,43,43,0.2), 0 2px 8px rgba(0,0,0,0.6)"
            : "0 2px 12px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* ZitoTV branding header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          borderBottom: "1px solid rgba(255,43,43,0.15)",
          background: "rgba(0,0,0,0.5)",
        }}>
          <span style={{
            fontSize: "10px",
            fontWeight: "800",
            letterSpacing: "0.06em",
            color: "#ff2b2b",
            textTransform: "uppercase",
          }}>
            ZitoTV
          </span>
          {hasSession && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
              className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              data-testid="button-dismiss-live"
            >
              <X className="w-2 h-2 text-white/70" />
            </button>
          )}
        </div>

        {hasSession ? (
          <>
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="absolute top-8 left-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(0,0,0,0.65)" }}
              data-testid="button-mini-mute"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted
                ? <VolumeX className="w-3 h-3 text-white/70" />
                : <Volume2 className="w-3 h-3 text-white" />
              }
            </button>

            {/* Stream area */}
            <div
              className="relative w-full cursor-pointer"
              style={{ height: `${EMBED_H}px` }}
              onClick={() => navigate(`/live/${session.id}`)}
            >
              {isDirectVideo(session.streamUrl) ? (
                <video
                  ref={videoRef}
                  src={session.streamUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted={muted}
                  loop
                  playsInline
                  style={{ pointerEvents: "none" }}
                />
              ) : getEmbedUrl(session.streamUrl, muted) ? (
                <iframe
                  key={`${session.id}-${muted}`}
                  src={getEmbedUrl(session.streamUrl, muted)!}
                  title={session.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={{ pointerEvents: "none" }}
                />
              ) : (
                session.thumbnailUrl ? (
                  <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover opacity-70" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0000, #0b0b0b)" }}>
                    <Radio className="w-6 h-6 text-[#ff2b2b]/40" />
                  </div>
                )
              )}

              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(11,11,11,0.85) 0%, transparent 50%)" }} />

              {/* LIVE badge */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5" style={{ background: "#ff2b2b" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white font-bold tracking-widest" style={{ fontSize: "9px" }}>LIVE</span>
              </div>

              {session.viewerCount > 0 && (
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5" style={{ background: "rgba(0,0,0,0.55)", borderRadius: "999px", padding: "2px 6px" }}>
                  <Eye style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.6)" }} />
                  <span style={{ fontSize: "9px", fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>{session.viewerCount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Info row */}
            <Link href={`/live/${session.id}`}>
              <div className="flex items-center gap-1.5 px-2 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", overflow: "hidden", background: "#c41414", flexShrink: 0 }}>
                  {session.provider.avatarUrl ? (
                    <img src={session.provider.avatarUrl} alt={session.provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "8px", fontWeight: "700" }}>
                      {session.provider.displayName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "L"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "10px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</p>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.provider.displayName}</p>
                </div>
              </div>
            </Link>

            {sessions.length > 1 && (
              <Link href="/live">
                <div className="text-center cursor-pointer hover:bg-white/5 transition-colors" style={{ borderTop: "1px solid rgba(255,43,43,0.2)", padding: "4px", fontSize: "9px", color: "rgba(255,43,43,0.8)", fontWeight: "600" }}>
                  +{sessions.length - 1} more live
                </div>
              </Link>
            )}
          </>
        ) : (
          /* Off Air */
          <Link href="/live">
            <div className="cursor-pointer" data-testid="mini-live-off-air">
              <div className="relative w-full flex flex-col items-center justify-center gap-1.5" style={{ height: `${EMBED_H}px`, background: "#000" }}>
                <Radio style={{ width: "32px", height: "32px", color: "#ff2b2b" }} strokeWidth={1.5} />
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#ff2b2b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Off Air
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
