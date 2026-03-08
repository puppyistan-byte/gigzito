import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy } from "lucide-react";
import type { LoveLeaderboardEntry } from "@shared/schema";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function currentMonthLabel() {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

const RANK_STYLES = [
  { border: "border-yellow-400/60", bg: "bg-yellow-400/10", crown: "👑", label: "text-yellow-400" },
  { border: "border-gray-400/40", bg: "bg-gray-400/5", crown: "🥈", label: "text-gray-400" },
  { border: "border-orange-600/40", bg: "bg-orange-600/5", crown: "🥉", label: "text-orange-500" },
];

export default function LeaderboardPage() {
  const { data: entries = [], isLoading } = useQuery<LoveLeaderboardEntry[]>({
    queryKey: ["/api/love/leaderboard"],
    queryFn: () => fetch("/api/love/leaderboard").then((r) => r.json()),
  });

  const winner = entries[0];

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
          <div className="text-4xl">👑</div>
          <h1 className="text-xl font-bold text-white" data-testid="text-leaderboard-title">Marketer of the Month</h1>
          <p className="text-sm text-[#888]">{currentMonthLabel()} — Who gets the most 😍?</p>
          <p className="text-xs text-[#555]">Every user gets one vote per month. Votes reset on the 1st.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center space-y-3">
            <div className="text-4xl">😍</div>
            <p className="text-white font-semibold">No votes yet this month</p>
            <p className="text-sm text-[#555]">Visit a creator's profile and tap "Show Love" to cast your vote!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Winner spotlight */}
            {winner && (
              <Link href={`/provider/${winner.providerId}`}>
                <div className="rounded-2xl bg-gradient-to-r from-yellow-950/50 to-[#0f0f0f] border border-yellow-500/30 p-5 flex items-center gap-4 hover:border-yellow-400/50 transition-colors cursor-pointer" data-testid="winner-card">
                  <div className="text-3xl">👑</div>
                  <div className="relative shrink-0">
                    {winner.avatarUrl ? (
                      <img src={winner.avatarUrl} alt={winner.displayName} className="h-14 w-14 rounded-full object-cover border-2 border-yellow-400/60" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-yellow-900 flex items-center justify-center text-yellow-300 font-bold text-lg border-2 border-yellow-400/60">
                        {winner.displayName.slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-sm">😍</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-yellow-300 truncate text-base">{winner.displayName}</p>
                    {winner.username && <p className="text-xs text-yellow-600">@{winner.username}</p>}
                    <p className="text-xs text-yellow-500 mt-1 font-semibold">{winner.voteCount} 😍 this month</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Full rankings */}
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
              {entries.map((entry, i) => {
                const style = RANK_STYLES[i] ?? { border: "border-transparent", bg: "", crown: `#${i+1}`, label: "text-[#555]" };
                return (
                  <Link key={entry.providerId} href={`/provider/${entry.providerId}`}>
                    <div
                      className={`flex items-center gap-4 px-4 py-3 border-b border-[#111] last:border-0 hover:bg-white/5 transition-colors cursor-pointer ${i < 3 ? style.bg : ""}`}
                      data-testid={`leaderboard-row-${entry.providerId}`}
                    >
                      <div className={`w-8 text-center text-base font-bold ${style.label}`}>
                        {typeof style.crown === "string" && style.crown.startsWith("#") ? style.crown : style.crown}
                      </div>
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt={entry.displayName} className={`h-10 w-10 rounded-full object-cover border ${i < 3 ? style.border : "border-[#2a2a2a]"}`} />
                      ) : (
                        <div className={`h-10 w-10 rounded-full bg-[#222] flex items-center justify-center text-sm font-bold text-white border ${i < 3 ? style.border : "border-[#2a2a2a]"}`}>
                          {entry.displayName.slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.displayName}</p>
                        {entry.username && <p className="text-xs text-[#555]">@{entry.username}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-base">😍</span>
                        <span className="text-sm font-bold text-white">{entry.voteCount}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#444] pb-4">
          Votes reset on the 1st of each month · One vote per account
        </p>
      </div>
    </div>
  );
}
