import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Trophy } from "lucide-react";

type EngagementEntry = {
  providerId: number;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  loveCount: number;
  geezeeCount: number;
  totalEngagement: number;
};

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function MostLovedPage() {
  const [, navigate] = useLocation();

  const { data: entries = [], isLoading } = useQuery<EngagementEntry[]>({
    queryKey: ["/api/engagement/leaderboard"],
    queryFn: () =>
      fetch("/api/engagement/leaderboard")
        .then((r) => r.json())
        .then((d) => (Array.isArray(d) ? d : [])),
    refetchInterval: 30000,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,43,43,0.18)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(10,0,0,0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.7)",
          }}
          data-testid="button-back-most-loved"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Trophy size={16} style={{ color: "#ff2b2b" }} />
            <h1
              style={{
                fontSize: "17px",
                fontWeight: 800,
                margin: 0,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
              data-testid="text-most-loved-heading"
            >
              Most Loved
            </h1>
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(255,43,43,0.55)",
              margin: 0,
              fontWeight: 600,
            }}
          >
            Total engagement · 😍 Show Love + 💜 GeeZee Engage
          </p>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, maxWidth: "600px", width: "100%", margin: "0 auto", padding: "12px 0 40px" }}>
        {isLoading ? (
          <div style={{ padding: "20px 20px" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: "60px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                  marginBottom: "8px",
                }}
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "48px" }}>🏆</span>
            <p
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: "14px",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              No engagement yet.
              <br />
              Show Love or hit Engage on a GeeZee card!
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const rankColor = isTop3 ? RANK_COLORS[idx] : "rgba(255,255,255,0.25)";
            const initials =
              entry.displayName
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() ?? "?";
            const profilePath = entry.username
              ? `/provider/${entry.username}`
              : `/provider/${entry.providerId}`;

            return (
              <Link key={entry.providerId} href={profilePath}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 20px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,43,43,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  data-testid={`most-loved-row-${entry.providerId}`}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: "28px",
                      flexShrink: 0,
                      textAlign: "center",
                      fontSize: rank === 1 ? "20px" : "13px",
                      fontWeight: 800,
                      color: rankColor,
                    }}
                  >
                    {rank === 1 ? "👑" : rank}
                  </div>

                  {/* Avatar */}
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#2a0000",
                      border: isTop3
                        ? `2px solid ${rankColor}`
                        : "2px solid rgba(255,43,43,0.18)",
                    }}
                  >
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.displayName ?? ""}
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
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name + stats */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: isTop3 ? "#fff" : "rgba(255,255,255,0.75)",
                        margin: "0 0 3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.displayName ?? "Unknown"}
                    </p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                      {entry.loveCount > 0 && `😍 ${entry.loveCount} love`}
                      {entry.loveCount > 0 && entry.geezeeCount > 0 && "  ·  "}
                      {entry.geezeeCount > 0 && `💜 ${entry.geezeeCount} engage`}
                    </p>
                  </div>

                  {/* Total score */}
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: "18px",
                      fontWeight: 900,
                      color: isTop3 ? rankColor : "rgba(255,255,255,0.4)",
                      letterSpacing: "-0.02em",
                    }}
                    data-testid={`most-loved-score-${entry.providerId}`}
                  >
                    {entry.totalEngagement.toLocaleString()}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
