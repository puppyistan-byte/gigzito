import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { LoveLeaderboardEntry } from "@shared/schema";

function currentMonthLabel(): string {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
}

export function LoveLeaderboardPanel() {
  const { data: entries = [], isLoading } = useQuery<LoveLeaderboardEntry[]>({
    queryKey: ["/api/love/leaderboard"],
    queryFn: () => fetch("/api/love/leaderboard").then(r => r.json()),
    refetchInterval: 30000,
  });

  return (
    <div
      className="hidden xl:flex flex-col"
      style={{
        position: "fixed",
        top: "72px",
        right: "12px",
        width: "210px",
        maxHeight: "calc(100vh - 160px)",
        zIndex: 45,
        borderRadius: "16px",
        border: "1px solid rgba(255,43,43,0.35)",
        background: "rgba(10,0,0,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 0 28px rgba(255,43,43,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
      data-testid="love-leaderboard-panel"
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,43,43,0.18)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span style={{ fontSize: "13px" }}>😍</span>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#ff2b2b",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Most Loved
          </p>
        </div>
        <p style={{ fontSize: "9px", color: "rgba(255,43,43,0.55)", fontWeight: 600 }}>
          Top 20 Creators · {currentMonthLabel()}
        </p>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
        {isLoading ? (
          <div style={{ padding: "20px 14px" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  marginBottom: "6px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", lineHeight: "1.5" }}>
              No votes yet this month.<br />Be the first to Show Love! 😍
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
            const rankColor = isTop3 ? rankColors[idx] : "rgba(255,255,255,0.25)";
            const initials = entry.displayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
            const profilePath = entry.username ? `/provider/${entry.username}` : `/provider/${entry.providerId}`;

            return (
              <Link key={entry.providerId} href={profilePath}>
                <div
                  className="group cursor-pointer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "5px 14px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,43,43,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  data-testid={`leaderboard-row-${entry.providerId}`}
                >
                  {/* Rank */}
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

                  {/* Avatar */}
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#2a0000",
                      border: isTop3 ? `1.5px solid ${rankColor}` : "1.5px solid rgba(255,43,43,0.25)",
                    }}
                  >
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.displayName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ff2b2b",
                          fontSize: "8px",
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "10px",
                      fontWeight: 600,
                      color: isTop3 ? "#fff" : "rgba(255,255,255,0.7)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.displayName}
                  </span>

                  {/* Vote count */}
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#ff2b2b",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    😍 {entry.voteCount.toLocaleString()}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid rgba(255,43,43,0.12)",
          flexShrink: 0,
        }}
      >
        <Link href="/leaderboard">
          <p
            style={{
              fontSize: "9px",
              color: "rgba(255,43,43,0.55)",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ff2b2b")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,43,43,0.55)")}
          >
            🏆 View Full Rankings
          </p>
        </Link>
      </div>
    </div>
  );
}
