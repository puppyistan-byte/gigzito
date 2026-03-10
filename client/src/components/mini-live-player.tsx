import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Radio, X, Eye, Volume2, VolumeX, ExternalLink,
  Minimize2, Maximize2, Settings, ChevronDown, Zap,
  Square, Trash2, Wifi
} from "lucide-react";
import type { LiveSessionWithProvider, InjectedFeed } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  YouTube:   { bg: "#ff0000",   text: "#fff", label: "YouTube" },
  TikTok:    { bg: "#010101",   text: "#fff", label: "TikTok" },
  Instagram: { bg: "#c13584",   text: "#fff", label: "Instagram" },
  Facebook:  { bg: "#1877f2",   text: "#fff", label: "Facebook" },
};

function detectPlatform(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return "YouTube";
    if (u.hostname.includes("tiktok.com")) return "TikTok";
    if (u.hostname.includes("instagram.com")) return "Instagram";
    if (u.hostname.includes("facebook.com") || u.hostname.includes("fb.watch")) return "Facebook";
  } catch {}
  return "YouTube";
}

function getYouTubeVideoId(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.includes("/embed/")) return u.pathname.split("/embed/")[1].split("?")[0];
    if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
    if (u.pathname.includes("/live/")) return u.pathname.split("/live/")[1].split("?")[0];
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v") ?? "";
  } catch { return ""; }
}

function getInjectedEmbedUrl(feed: InjectedFeed, muted = true): string | null {
  try {
    const u = new URL(feed.sourceUrl);
    if (feed.platform === "YouTube" || u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = getYouTubeVideoId(feed.sourceUrl);
      if (!id) return null;
      const mt = muted ? 1 : 0;
      const isShorts = u.pathname.includes("/shorts/");
      if (isShorts) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${mt}&enablejsapi=1&modestbranding=1&rel=0&playsinline=1`;
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${mt}&enablejsapi=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${id}`;
    }
    return null;
  } catch { return null; }
}

function getEmbedUrl(url: string, muted: boolean): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = getYouTubeVideoId(url);
      if (!id) return null;
      const mt = muted ? 1 : 0;
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${mt}&enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1`;
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

type ViewState = "normal" | "minimized" | "focused";

export function MiniLivePlayer() {
  const [viewState, setViewState] = useState<ViewState>("normal");
  const [muted, setMuted] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [adminUrl, setAdminUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [, navigate] = useLocation();

  const { user: authData } = useAuth();
  const role = authData?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const { data: sessions = [] } = useQuery<LiveSessionWithProvider[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 30000,
  });

  const { data: activeInj, refetch: refetchInj } = useQuery<InjectedFeed | null>({
    queryKey: ["/api/injected-feed/active"],
    refetchInterval: 60000,
  });

  const { data: adminFeeds = [] } = useQuery<InjectedFeed[]>({
    queryKey: ["/api/admin/injected-feeds"],
    enabled: isAdmin && showAdminPanel,
    refetchInterval: 15000,
  });

  const session = sessions[0];
  const hasSession = !!session;
  const hasInjectedFeed = !hasSession && !!activeInj;
  const hasContent = hasSession || hasInjectedFeed;

  const detectedPlatform = adminUrl ? detectPlatform(adminUrl) : "YouTube";

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        platform: detectedPlatform,
        sourceUrl: adminUrl,
        displayTitle: "Admin Live Feed",
        injectMode: "immediate",
        status: "active",
      };
      await apiRequest("POST", "/api/admin/injected-feeds", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      refetchInj();
    },
  });

  const stopLiveMutation = useMutation({
    mutationFn: async () => {
      const active = adminFeeds.find(f => f.status === "active");
      if (active) await apiRequest("PATCH", `/api/admin/injected-feeds/${active.id}`, { status: "inactive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      refetchInj();
    },
  });

  const clearSourceMutation = useMutation({
    mutationFn: async () => {
      const active = adminFeeds.find(f => f.status === "active");
      if (active) await apiRequest("DELETE", `/api/admin/injected-feeds/${active.id}`);
    },
    onSuccess: () => {
      setAdminUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      refetchInj();
    },
  });

  const stopAudio = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
    }
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    setMuted(true);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopAudio();
    setViewState("minimized");
  };

  const handleFocus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewState("focused");
  };

  const handleReturnToFeed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewState("normal");
  };

  const handleRestoreFromMinimized = () => {
    setViewState("normal");
  };

  const focusedIframeRef = useRef<HTMLIFrameElement>(null);

  const sendMuteCmd = (iframe: HTMLIFrameElement | null, nextMuted: boolean) => {
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: nextMuted ? "mute" : "unMute", args: [] }),
        "*"
      );
    } catch (_) {}
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextMuted = !muted;
    if (videoRef.current) videoRef.current.muted = nextMuted;
    sendMuteCmd(iframeRef.current, nextMuted);
    sendMuteCmd(focusedIframeRef.current, nextMuted);
    if (!nextMuted) {
      window.dispatchEvent(new CustomEvent("zitotv-unmuted"));
    }
    setMuted(nextMuted);
  };

  const CARD_W = 298;
  const EMBED_H = 168;
  const FOCUSED_W = Math.min(window.innerWidth * 0.92, 560);
  const FOCUSED_H = Math.round(FOCUSED_W * 0.5625);

  if (viewState === "minimized") {
    return (
      <div
        className="fixed z-50"
        style={{ bottom: "84px", left: "12px" }}
        data-testid="mini-live-minimized"
      >
        <button
          onClick={handleRestoreFromMinimized}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
          style={{
            background: "rgba(11,11,11,0.95)",
            border: "1px solid rgba(255,43,43,0.45)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
          data-testid="button-live-restore"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
          <span style={{ fontSize: "10px", fontWeight: "800", color: "#ff2b2b", letterSpacing: "0.1em" }}>LIVE</span>
          <Maximize2 style={{ width: "10px", height: "10px", color: "rgba(255,43,43,0.7)" }} />
        </button>
      </div>
    );
  }

  if (viewState === "focused") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
        data-testid="mini-live-focused"
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: `${FOCUSED_W}px`,
            background: "rgba(11,11,11,0.98)",
            border: "1px solid rgba(255,43,43,0.5)",
            boxShadow: "0 8px 48px rgba(255,43,43,0.25), 0 4px 24px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,43,43,0.2)",
            background: "rgba(0,0,0,0.6)",
          }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff2b2b] animate-pulse" />
              <span style={{ fontSize: "12px", fontWeight: "800", letterSpacing: "0.08em", color: "#ff2b2b" }}>ZITO TV — FOCUSED</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 transition-colors"
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}
                data-testid="button-live-focus-minimize"
              >
                <Minimize2 style={{ width: "11px", height: "11px" }} />
                Minimize
              </button>
              <button
                onClick={handleReturnToFeed}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 transition-colors"
                style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}
                data-testid="button-live-return-feed"
              >
                <ChevronDown style={{ width: "11px", height: "11px" }} />
                Return to Feed
              </button>
            </div>
          </div>

          <div className="relative w-full" style={{ height: `${FOCUSED_H}px` }}>
            {hasSession && session ? (
              <>
                {isDirectVideo(session.streamUrl) ? (
                  <video
                    ref={videoRef}
                    src={session.streamUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={muted}
                    loop
                    playsInline
                  />
                ) : getEmbedUrl(session.streamUrl, muted) ? (
                  <iframe
                    ref={focusedIframeRef}
                    key={`focused-${session.id}-${muted}`}
                    src={getEmbedUrl(session.streamUrl, muted)!}
                    title={session.title}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "#000" }}>
                    <Radio style={{ width: "48px", height: "48px", color: "#ff2b2b" }} strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: "#ff2b2b" }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-white font-bold tracking-widest" style={{ fontSize: "10px" }}>LIVE</span>
                </div>
              </>
            ) : hasInjectedFeed && activeInj ? (
              (() => {
                const embedUrl = getInjectedEmbedUrl(activeInj, muted);
                const ps = PLATFORM_COLORS[activeInj.platform] ?? { bg: "#ff2b2b", text: "#fff", label: activeInj.platform };
                return embedUrl ? (
                  <iframe
                    ref={focusedIframeRef}
                    key={`focused-inj-${activeInj.id}-${muted}`}
                    src={embedUrl}
                    title={activeInj.displayTitle ?? "Live Feed"}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <a href={activeInj.sourceUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ display: "flex", background: ps.bg + "22" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: ps.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ExternalLink style={{ width: "24px", height: "24px", color: ps.text }} />
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#fff", textAlign: "center" }}>{activeInj.displayTitle ?? ps.label + " Live"}</p>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Tap to watch on {ps.label}</span>
                  </a>
                );
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: "#000" }}>
                <Radio style={{ width: "48px", height: "48px", color: "#ff2b2b" }} strokeWidth={1.5} />
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#ff2b2b", letterSpacing: "0.12em" }}>OFF AIR</span>
              </div>
            )}
            {(hasSession || hasInjectedFeed) && (
              <button
                onClick={toggleMute}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.12)" }}
                data-testid="button-focused-mute"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}
          </div>

          {hasSession && session && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "#c41414", flexShrink: 0 }}>
                {session.provider.avatarUrl
                  ? <img src={session.provider.avatarUrl} alt={session.provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>
                      {session.provider.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{session.provider.displayName}</p>
              </div>
              <button onClick={() => navigate(`/live/${session.id}`)} style={{ padding: "5px 12px", background: "#ff2b2b", borderRadius: "8px", fontSize: "11px", fontWeight: "700", color: "#fff", border: "none", cursor: "pointer" }}>
                Full View
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          borderBottom: "1px solid rgba(255,43,43,0.15)",
          background: "rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.06em", color: "#ff2b2b", textTransform: "uppercase" }}>
            ZitoTV
          </span>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setShowAdminPanel(p => !p); }}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Admin Live Controls"
                data-testid="button-admin-live-panel-toggle"
                style={{ color: showAdminPanel ? "#ff2b2b" : "rgba(255,255,255,0.45)" }}
              >
                <Settings style={{ width: "11px", height: "11px" }} />
              </button>
            )}
            <button
              onClick={handleFocus}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors"
              title="Pop Out / Focus Live"
              data-testid="button-live-focus"
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "8px", fontWeight: "600", letterSpacing: "0.04em" }}
            >
              <Maximize2 style={{ width: "10px", height: "10px" }} />
              POP OUT
            </button>
            <button
              onClick={handleMinimize}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Minimize Live"
              data-testid="button-live-minimize"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              <Minimize2 style={{ width: "11px", height: "11px" }} />
            </button>
          </div>
        </div>

        {hasSession ? (
          <>
            <button
              onClick={toggleMute}
              className="absolute top-8 left-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(0,0,0,0.65)" }}
              data-testid="button-mini-mute"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-3 h-3 text-white/70" /> : <Volume2 className="w-3 h-3 text-white" />}
            </button>

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
                  ref={iframeRef}
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

            <Link href={`/live/${session.id}`}>
              <div className="flex items-center gap-1.5 px-2 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", overflow: "hidden", background: "#c41414", flexShrink: 0 }}>
                  {session.provider.avatarUrl ? (
                    <img src={session.provider.avatarUrl} alt={session.provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "8px", fontWeight: "700" }}>
                      {session.provider.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "L"}
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
        ) : hasInjectedFeed && activeInj ? (
          (() => {
            const embedUrl = getInjectedEmbedUrl(activeInj, muted);
            const platformStyle = PLATFORM_COLORS[activeInj.platform] ?? { bg: "#ff2b2b", text: "#fff", label: activeInj.platform };
            return (
              <div data-testid="mini-live-injected">
                <div style={{ position: "absolute", top: "30px", left: "6px", zIndex: 20, display: "flex", alignItems: "center", gap: "4px", background: platformStyle.bg, borderRadius: "999px", padding: "2px 7px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: platformStyle.text, opacity: 0.85 }} />
                  <span style={{ fontSize: "8px", fontWeight: "700", color: platformStyle.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>{platformStyle.label}</span>
                </div>
                {embedUrl ? (
                  <div
                    className="relative w-full"
                    style={{ height: `${EMBED_H}px`, background: "#000", cursor: "pointer" }}
                    onClick={() => window.open(activeInj.sourceUrl, "_blank")}
                  >
                    <iframe
                      ref={iframeRef}
                      key={`normal-inj-${activeInj.id}-${muted}`}
                      src={embedUrl}
                      title={activeInj.displayTitle ?? "Injected Feed"}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      style={{ pointerEvents: "none" }}
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(11,11,11,0.7) 0%, transparent 55%)" }} />
                    <button
                      onClick={e => { e.stopPropagation(); toggleMute(e); }}
                      className="absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: "rgba(0,0,0,0.65)" }}
                      data-testid="button-mini-mute-injected"
                      title={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX className="w-3 h-3 text-white/70" /> : <Volume2 className="w-3 h-3 text-white" />}
                    </button>
                    <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "3px 6px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <ExternalLink style={{ width: "8px", height: "8px", color: "rgba(255,255,255,0.6)" }} />
                      <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Open</span>
                    </div>
                  </div>
                ) : (
                  <a href={activeInj.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
                    <div
                      className="relative w-full flex flex-col items-center justify-center gap-2"
                      style={{ height: `${EMBED_H}px`, background: platformStyle.bg + "22", cursor: "pointer" }}
                    >
                      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: platformStyle.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ExternalLink style={{ width: "20px", height: "20px", color: platformStyle.text }} />
                      </div>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#fff", textAlign: "center", padding: "0 12px", lineHeight: 1.3 }}>
                        {activeInj.displayTitle ?? platformStyle.label + " Live"}
                      </p>
                      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)" }}>Tap to watch</span>
                    </div>
                  </a>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "10px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {activeInj.displayTitle ?? platformStyle.label + " Feed"}
                    </p>
                    {activeInj.category && (
                      <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        #{activeInj.category}
                      </p>
                    )}
                  </div>
                  <a href={activeInj.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, padding: "4px 8px", background: platformStyle.bg, borderRadius: "6px", fontSize: "9px", fontWeight: "700", color: platformStyle.text, textDecoration: "none" }}>
                    Watch
                  </a>
                </div>
              </div>
            );
          })()
        ) : (
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

        {isAdmin && showAdminPanel && (
          <div
            style={{
              borderTop: "1px solid rgba(255,43,43,0.25)",
              background: "rgba(0,0,0,0.7)",
              padding: "8px",
            }}
            data-testid="admin-live-panel"
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,43,43,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Admin Live Injection
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer" data-testid="label-admin-live-toggle">
                <div
                  onClick={() => setAdminEnabled(v => !v)}
                  style={{
                    width: "28px", height: "15px", borderRadius: "999px",
                    background: adminEnabled ? "#ff2b2b" : "rgba(255,255,255,0.15)",
                    position: "relative", cursor: "pointer", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: "2px",
                    left: adminEnabled ? "15px" : "2px",
                    width: "11px", height: "11px",
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }} />
                </div>
                <span style={{ fontSize: "8px", color: adminEnabled ? "#ff2b2b" : "rgba(255,255,255,0.4)", fontWeight: "600" }}>
                  {adminEnabled ? "ON" : "OFF"}
                </span>
              </label>
            </div>

            {adminEnabled && (
              <>
                <div className="mb-2">
                  <label style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    LIVE SOURCE URL
                  </label>
                  <input
                    type="text"
                    value={adminUrl}
                    onChange={e => setAdminUrl(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    onKeyUp={e => e.stopPropagation()}
                    placeholder="https://youtube.com/live/... or any stream URL"
                    data-testid="input-admin-live-url"
                    style={{
                      width: "100%",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,43,43,0.25)",
                      color: "#fff",
                      fontSize: "9px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {adminUrl && (
                    <div className="flex items-center gap-1 mt-1">
                      <Wifi style={{ width: "8px", height: "8px", color: "rgba(255,255,255,0.4)" }} />
                      <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)" }}>
                        Detected: <strong style={{ color: PLATFORM_COLORS[detectedPlatform]?.bg ?? "#fff" }}>{detectedPlatform}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => { if (adminUrl.trim()) goLiveMutation.mutate(); }}
                    disabled={!adminUrl.trim() || goLiveMutation.isPending}
                    data-testid="button-admin-go-live"
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      borderRadius: "6px",
                      background: adminUrl.trim() ? "#16a34a" : "rgba(22,163,74,0.3)",
                      border: "none",
                      color: "#fff",
                      fontSize: "8px",
                      fontWeight: "700",
                      cursor: adminUrl.trim() ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <Zap style={{ width: "9px", height: "9px" }} />
                    {goLiveMutation.isPending ? "..." : "GO LIVE"}
                  </button>
                  <button
                    onClick={() => stopLiveMutation.mutate()}
                    disabled={stopLiveMutation.isPending}
                    data-testid="button-admin-stop-live"
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      borderRadius: "6px",
                      background: "rgba(239,68,68,0.25)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: "#ef4444",
                      fontSize: "8px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <Square style={{ width: "8px", height: "8px" }} />
                    {stopLiveMutation.isPending ? "..." : "STOP"}
                  </button>
                  <button
                    onClick={() => clearSourceMutation.mutate()}
                    disabled={clearSourceMutation.isPending}
                    data-testid="button-admin-clear-source"
                    style={{
                      padding: "5px 8px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "8px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                    }}
                    title="Clear Source"
                  >
                    <Trash2 style={{ width: "9px", height: "9px" }} />
                  </button>
                </div>

                {activeInj && (
                  <div className="mt-2 flex items-center gap-1.5" style={{ padding: "4px 6px", borderRadius: "5px", background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span style={{ fontSize: "8px", color: "rgba(34,197,94,0.85)", fontWeight: "600" }}>Live injection active — {activeInj.platform}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
