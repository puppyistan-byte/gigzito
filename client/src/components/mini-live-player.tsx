import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Radio, X, Eye, ChevronRight } from "lucide-react";
import type { LiveSessionWithProvider } from "@shared/schema";

export function MiniLivePlayer() {
  const [dismissed, setDismissed] = useState(false);

  const { data: sessions = [] } = useQuery<LiveSessionWithProvider[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 30000,
  });

  const session = sessions[0];

  // Reset dismissed state when a new session becomes available
  const hasSession = !!session && !dismissed;

  return (
    <div
      className="fixed z-50"
      style={{ top: "10px", right: "10px" }}
      data-testid="mini-live-player"
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: "190px",
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
        {hasSession ? (
          <>
            {/* Dismiss button — only when live */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
              className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              data-testid="button-dismiss-live"
            >
              <X className="w-2.5 h-2.5 text-white/70" />
            </button>

            <Link href={`/live/${session.id}`}>
              <div className="cursor-pointer">
                {/* Thumbnail area */}
                <div className="relative w-full" style={{ height: "90px" }}>
                  {session.thumbnailUrl ? (
                    <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0000, #0b0b0b)" }}>
                      <Radio className="w-6 h-6 text-[#ff2b2b]/40" />
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(11,11,11,0.9) 0%, transparent 60%)" }} />

                  {/* LIVE badge */}
                  <div
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5"
                    style={{ background: "#ff2b2b" }}
                  >
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
                <div className="flex items-center gap-1.5 px-2 py-2">
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
                  <ChevronRight style={{ width: "12px", height: "12px", color: "#ff2b2b", flexShrink: 0 }} />
                </div>
              </div>
            </Link>

            {sessions.length > 1 && (
              <Link href="/live">
                <div
                  className="text-center cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderTop: "1px solid rgba(255,43,43,0.2)", padding: "4px", fontSize: "9px", color: "rgba(255,43,43,0.8)", fontWeight: "600" }}
                >
                  +{sessions.length - 1} more live
                </div>
              </Link>
            )}
          </>
        ) : (
          /* ── Off Air state ── */
          <Link href="/live">
            <div className="cursor-pointer" data-testid="mini-live-off-air">
              {/* Screen area */}
              <div
                className="relative w-full flex flex-col items-center justify-center gap-1.5"
                style={{ height: "90px", background: "#000" }}
              >
                {/* Antenna icon — Radio with red color */}
                <Radio
                  style={{ width: "28px", height: "28px", color: "#ff2b2b" }}
                  strokeWidth={1.5}
                />
                {/* Off Air label */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#ff2b2b",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Off Air
                </span>
              </div>

              {/* Bottom strip */}
              <div
                className="flex items-center justify-between px-2.5 py-2"
                style={{ borderTop: "1px solid rgba(255,43,43,0.15)" }}
              >
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "500" }}>
                  No one is live
                </span>
                <span style={{ fontSize: "9px", color: "rgba(255,43,43,0.6)", fontWeight: "600" }}>
                  Go Live →
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
