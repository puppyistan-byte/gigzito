import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { LoveLeaderboardEntry } from "@shared/schema";

type EngageEntry = {
  userId: number;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  engagementCount: number;
};

function currentMonthLabel(): string {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
}

export function LoveLeaderboardPanel() {
  const [open, setOpen] = useState(false);

  const { data: loveEntries = [], isLoading: loveLoading } = useQuery<LoveLeaderboardEntry[]>({
    queryKey: ["/api/love/leaderboard"],
    queryFn: () => fetch("/api/love/leaderboard").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    refetchInterval: 30000,
  });

  const { data: engageEntries = [], isLoading: engageLoading } = useQuery<EngageEntry[]>({
    queryKey: ["/api/geezee/engage-leaderboard"],
    queryFn: () => fetch("/api/geezee/engage-leaderboard").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    refetchInterval: 30000,
  });

  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <>
      {/* Side tab — always visible on right edge */}
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="love-leaderboard-tab"
        style={{
          position: "fixed",
          top: "50%",
          right: open ? "280px" : "0px",
          transform: "translateY(-50%)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "12px 6px",
          background: "rgba(10,0,0,0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,43,43,0.40)",
          borderRight: open ? "1px solid rgba(255,43,43,0.40)" : "none",
          borderRadius: "10px 0 0 10px",
          boxShadow: "-2px 0 18px rgba(255,43,43,0.12)",
          cursor: "pointer",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          writingMode: "vertical-rl",
          userSelect: "none",
        }}
        aria-label="Toggle Most Loved leaderboard"
      >
        <span style={{ fontSize: "18px", writingMode: "horizontal-tb" }}>😍</span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            color: "#ff2b2b",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
          }}
        >
          Most Loved
        </span>
      </button>

      {/* Slide-out panel */}
      <div
        data-testid="love-leaderboard-panel"
        style={{
          position: "fixed",
          top: "0",
          right: open ? "0" : "-280px",
          width: "280px",
          height: "100vh",
          zIndex: 49,
          display: "flex",
          flexDirection: "column",
          background: "rgba(8,0,0,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,43,43,0.30)",
          boxShadow: open ? "-4px 0 32px rgba(255,43,43,0.12)" : "none",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* ── Most Loved (video likes) ── */}
          <div style={{ padding: "20px 16px 10px", borderBottom: "1px solid rgba(255,43,43,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "15px" }}>😍</span>
              <p style={{ fontSize: "11px", fontWeight: 800, color: "#ff2b2b", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Most Loved
              </p>
            </div>
            <p style={{ fontSize: "9px", color: "rgba(255,43,43,0.50)", fontWeight: 600 }}>
              Top 20 · {currentMonthLabel()}
            </p>
          </div>

          <div style={{ padding: "4px 0 8px" }}>
            {loveLoading ? (
              <div style={{ padding: "12px 16px" }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", marginBottom: "6px" }} />
                ))}
              </div>
            ) : loveEntries.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "10px", lineHeight: "1.6" }}>
                  No votes yet this month.<br />Be the first to Show Love! 😍
                </p>
              </div>
            ) : (
              loveEntries.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const rankColor = isTop3 ? rankColors[idx] : "rgba(255,255,255,0.22)";
                const initials = entry.displayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
                const profilePath = entry.username ? `/provider/${entry.username}` : `/provider/${entry.providerId}`;
                return (
                  <Link key={entry.providerId} href={profilePath}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 14px", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,43,43,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      data-testid={`leaderboard-row-${entry.providerId}`}
                    >
                      <span style={{ width: "16px", flexShrink: 0, fontSize: "9px", fontWeight: 700, color: rankColor, textAlign: "center" }}>
                        {rank === 1 ? "👑" : rank}
                      </span>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#2a0000", border: isTop3 ? `1.5px solid ${rankColor}` : "1.5px solid rgba(255,43,43,0.20)" }}>
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt={entry.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff2b2b", fontSize: "7px", fontWeight: 700 }}>{initials}</div>
                        )}
                      </div>
                      <span style={{ flex: 1, fontSize: "10px", fontWeight: 600, color: isTop3 ? "#fff" : "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.displayName}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: "#ff2b2b" }}>😍{entry.voteCount.toLocaleString()}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* ── GeeZee Engage Leaderboard ── */}
          <div style={{ padding: "14px 16px 10px", borderTop: "1px solid rgba(147,51,234,0.20)", borderBottom: "1px solid rgba(147,51,234,0.20)", background: "rgba(88,28,135,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "15px" }}>💜</span>
              <p style={{ fontSize: "11px", fontWeight: 800, color: "#a855f7", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                GeeZee Engage
              </p>
            </div>
            <p style={{ fontSize: "9px", color: "rgba(168,85,247,0.50)", fontWeight: 600 }}>
              Top GeeZee cards by Engage count
            </p>
          </div>

          <div style={{ padding: "4px 0 8px" }}>
            {engageLoading ? (
              <div style={{ padding: "12px 16px" }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", marginBottom: "6px" }} />
                ))}
              </div>
            ) : engageEntries.filter(e => e.engagementCount > 0).length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "10px", lineHeight: "1.6" }}>
                  No engagements yet.<br />Hit Engage on a GeeZee card! 💜
                </p>
              </div>
            ) : (
              engageEntries.filter(e => e.engagementCount > 0).map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const rankColor = isTop3 ? rankColors[idx] : "rgba(255,255,255,0.22)";
                const initials = entry.displayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
                const profilePath = entry.username ? `/geezee/${entry.userId}` : `/geezee/${entry.userId}`;
                return (
                  <Link key={entry.userId} href={profilePath}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 14px", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(147,51,234,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      data-testid={`geezee-engage-row-${entry.userId}`}
                    >
                      <span style={{ width: "16px", flexShrink: 0, fontSize: "9px", fontWeight: 700, color: rankColor, textAlign: "center" }}>
                        {rank === 1 ? "👑" : rank}
                      </span>
                      <div style={{ width: "24px", height: "24px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: "#1a0a2e", border: isTop3 ? `1.5px solid ${rankColor}` : "1.5px solid rgba(147,51,234,0.25)" }}>
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt={entry.displayName ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", fontSize: "7px", fontWeight: 700 }}>{initials}</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: isTop3 ? "#fff" : "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.displayName ?? "Unknown"}
                        </span>
                        {entry.username && (
                          <span style={{ fontSize: "8px", color: "rgba(168,85,247,0.60)", fontFamily: "monospace" }}>@{entry.username}</span>
                        )}
                      </div>
                      <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: "#a855f7" }}>❤️{entry.engagementCount.toLocaleString()}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,43,43,0.12)", flexShrink: 0 }}>
          <Link href="/leaderboard">
            <p
              style={{ fontSize: "9px", color: "rgba(255,43,43,0.50)", textAlign: "center", cursor: "pointer", fontWeight: 600, letterSpacing: "0.04em" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ff2b2b")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,43,43,0.50)")}
            >
              🏆 View Full Rankings
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
