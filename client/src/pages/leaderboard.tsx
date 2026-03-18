import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

type EngagementEntry = {
  providerId: number;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  loveCount: number;
  geezeeCount: number;
  totalEngagement: number;
};

const RANK_STYLES = [
  { border: "border-yellow-400/60", bg: "bg-yellow-400/10", crown: "👑", label: "text-yellow-400" },
  { border: "border-gray-400/40", bg: "bg-gray-400/5", crown: "🥈", label: "text-gray-400" },
  { border: "border-orange-600/40", bg: "bg-orange-600/5", crown: "🥉", label: "text-orange-500" },
];

export default function LeaderboardPage() {
  const { data: entries = [], isLoading } = useQuery<EngagementEntry[]>({
    queryKey: ["/api/engagement/leaderboard"],
    queryFn: () => fetch("/api/engagement/leaderboard").then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const winner = entries[0] ?? null;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="link-back-to-main">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Main
        </Link>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-yellow-950/40 via-[#0b0b0b] to-[#0b0b0b] border border-yellow-500/20 p-6 text-center space-y-2">
          <div className="text-4xl">🏆</div>
          <h1 className="text-xl font-bold text-white" data-testid="text-leaderboard-title">Total Engagement Leaderboard</h1>
          <p className="text-sm text-[#888]">All-time — 😍 Show Love votes + 💜 GeeZee Engage clicks</p>
          <p className="text-xs text-[#555]">Combined score ranks every provider by total audience interaction.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center space-y-3">
            <div className="text-4xl">🏆</div>
            <p className="text-white font-semibold">No engagement yet</p>
            <p className="text-sm text-[#555]">Show Love on a video or hit Engage on a GeeZee card to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Winner spotlight */}
            {winner && (
              <Link href={winner.username ? `/provider/${winner.username}` : `/provider/${winner.providerId}`}>
                <div className="rounded-2xl bg-gradient-to-r from-yellow-950/50 to-[#0f0f0f] border border-yellow-500/30 p-5 flex items-center gap-4 hover:border-yellow-400/50 transition-colors cursor-pointer" data-testid="winner-card">
                  <div className="text-3xl">👑</div>
                  <div className="relative shrink-0">
                    {winner.avatarUrl ? (
                      <img src={winner.avatarUrl} alt={winner.displayName ?? ""} className="h-14 w-14 rounded-full object-cover border-2 border-yellow-400/60" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-yellow-900 flex items-center justify-center text-yellow-300 font-bold text-lg border-2 border-yellow-400/60">
                        {(winner.displayName ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-sm">🏆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-yellow-300 truncate text-base">{winner.displayName}</p>
                    {winner.username && <p className="text-xs text-yellow-600">@{winner.username}</p>}
                    <p className="text-xs text-yellow-500 mt-1 font-semibold">
                      {winner.totalEngagement.toLocaleString()} total · {winner.loveCount > 0 ? `😍${winner.loveCount}` : ""}{winner.loveCount > 0 && winner.geezeeCount > 0 ? " · " : ""}{winner.geezeeCount > 0 ? `💜${winner.geezeeCount}` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Full rankings */}
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
              {entries.map((entry, i) => {
                const style = RANK_STYLES[i] ?? { border: "border-transparent", bg: "", crown: `#${i+1}`, label: "text-[#555]" };
                const profilePath = entry.username ? `/provider/${entry.username}` : `/provider/${entry.providerId}`;
                const initials = (entry.displayName ?? "?").slice(0, 2).toUpperCase();
                return (
                  <Link key={entry.providerId} href={profilePath}>
                    <div
                      className={`flex items-center gap-4 px-4 py-3 border-b border-[#111] last:border-0 hover:bg-white/5 transition-colors cursor-pointer ${i < 3 ? style.bg : ""}`}
                      data-testid={`leaderboard-row-${entry.providerId}`}
                    >
                      <div className={`w-8 text-center text-base font-bold ${style.label}`}>
                        {style.crown}
                      </div>
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt={entry.displayName ?? ""} className={`h-10 w-10 rounded-full object-cover border ${i < 3 ? style.border : "border-[#2a2a2a]"}`} />
                      ) : (
                        <div className={`h-10 w-10 rounded-full bg-[#222] flex items-center justify-center text-sm font-bold text-white border ${i < 3 ? style.border : "border-[#2a2a2a]"}`}>
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.displayName ?? "Unknown"}</p>
                        {entry.username && <p className="text-xs text-[#555]">@{entry.username}</p>}
                        <p className="text-xs text-[#444] mt-0.5">
                          {entry.loveCount > 0 ? `😍${entry.loveCount}` : ""}{entry.loveCount > 0 && entry.geezeeCount > 0 ? " · " : ""}{entry.geezeeCount > 0 ? `💜${entry.geezeeCount}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-white">{entry.totalEngagement.toLocaleString()}</span>
                        <p className="text-xs text-[#555]">total</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#444] pb-4">
          All-time engagement · 😍 Show Love votes + 💜 GeeZee Engage clicks
        </p>
      </div>
    </div>
  );
}
