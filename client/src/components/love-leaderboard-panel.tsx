import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { LoveLeaderboardEntry } from "@shared/schema";

function currentMonthLabel(): string {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
}

export function LoveLeaderboardPanel() {
  const [open, setOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery<LoveLeaderboardEntry[]>({
    queryKey: ["/api/love/leaderboard"],
    queryFn: () => fetch("/api/love/leaderboard").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    refetchInterval: 30000,
  });

  return (
    <>
      {/* Side tab — always visible on right edge */}
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="love-leaderboard-tab"
        style={{
          position: "fixed",
          top: "50%",
          right: open ? "214px" : "0px",
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
          borderRadius: open ? "10px 0 0 10px" : "10px 0 0 10px",
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
          right: open ? "0" : "-214px",
          width: "214px",
          height: "100vh",
          zIndex: 49,
          display: "flex",
          flexDirection: "column",
          background: "rgba(8,0,0,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,43,43,0.30)",
          boxShadow: open ? "-4px 0 32px rgba(255,43,43,0.12)" : "none",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 16px 12px",
            borderBottom: "1px solid rgba(255,43,43,0.18)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
            <span style={{ fontSize: "16px" }}>😍</span>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#ff2b2b",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Most Loved
            </p>
          </div>
          <p style={{ fontSize: "9px", color: "rgba(255,43,43,0.50)", fontWeight: 600 }}>
            Top 20 · {currentMonthLabel()}
          </p>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {isLoading ? (
            <div style={{ padding: "16px" }}>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    marginBottom: "6px",
                  }}
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "10px", lineHeight: "1.6" }}>
                No votes yet this month.<br />Be the first to Show Love! 😍
              </p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
              const rankColor = isTop3 ? rankColors[idx] : "rgba(255,255,255,0.22)";
              const initials = entry.displayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
              const profilePath = entry.username ? `/provider/${entry.username}` : `/provider/${entry.providerId}`;

              return (
                <Link key={entry.providerId} href={profilePath}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "5px 14px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,43,43,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    data-testid={`leaderboard-row-${entry.providerId}`}
                  >
                    <span
                      style={{
                        width: "16px",
                        flexShrink: 0,
                        fontSize: "9px",
                        fontWeight: 700,
                        color: rankColor,
                        textAlign: "center",
                      }}
                    >
                      {rank === 1 ? "👑" : rank}
                    </span>

                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "#2a0000",
                        border: isTop3 ? `1.5px solid ${rankColor}` : "1.5px solid rgba(255,43,43,0.20)",
                      }}
                    >
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt={entry.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff2b2b", fontSize: "8px", fontWeight: 700 }}>
                          {initials}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        flex: 1,
                        fontSize: "10px",
                        fontWeight: 600,
                        color: isTop3 ? "#fff" : "rgba(255,255,255,0.65)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.displayName}
                    </span>

                    <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: "#ff2b2b" }}>
                      😍{entry.voteCount.toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
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
