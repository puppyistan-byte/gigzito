import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { LiveCard } from "@/components/live-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import type { LiveSessionWithProvider } from "@shared/schema";

function LiveSkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden animate-pulse">
      <div className="h-28 bg-[#111]" />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="-mt-8 w-14 h-14 rounded-full bg-[#1a1a1a] border-4 border-black shrink-0" />
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-3.5 bg-[#1a1a1a] rounded w-28" />
            <div className="h-3 bg-[#151515] rounded w-16" />
          </div>
        </div>
        <div className="h-3 bg-[#1a1a1a] rounded w-full" />
        <div className="h-3 bg-[#151515] rounded w-2/3" />
        <div className="flex justify-between items-center">
          <div className="h-2.5 bg-[#151515] rounded w-16" />
          <div className="h-8 bg-[#1a1a1a] rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}

export default function LiveNowPage() {
  const { data: sessions = [], isLoading } = useQuery<LiveSessionWithProvider[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 20000,
  });

  const liveCount = sessions.length;

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
                  Live Marketers
                </h1>
              </div>
              <p className="text-sm text-[#555]">
                {liveCount > 0
                  ? `${liveCount} expert${liveCount > 1 ? "s" : ""} broadcasting right now`
                  : "Your live marketplace — tune in when experts go live"}
              </p>
            </div>

            {liveCount > 0 && (
              <div className="shrink-0 flex items-center gap-2 bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
                <span className="text-[#ff2b2b] text-sm font-bold">{liveCount} Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Go live CTA */}
        <Link href="/live/go">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] hover:border-[#ff2b2b]/40 transition-colors cursor-pointer group" data-testid="link-go-live-cta">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 flex items-center justify-center">
                <span className="text-sm">📡</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Are you a creator?</p>
                <p className="text-xs text-[#555]">Start your live session and appear on this page</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#333] group-hover:text-[#ff2b2b] transition-colors shrink-0" />
          </div>
        </Link>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <LiveSkeletonCard key={i} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-14 text-center space-y-4" data-testid="text-no-live">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#ff2b2b]/5 border border-[#ff2b2b]/10" />
              <span className="text-3xl">📡</span>
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">No one is live right now</p>
              <p className="text-[#555] text-sm max-w-xs mx-auto">
                Marketers, coaches, musicians and event creators go live here.<br />Check back soon or start your own session.
              </p>
            </div>
            <Link href="/live/go">
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 text-[#ff2b2b] text-sm font-semibold hover:bg-[#ff2b2b]/20 transition-colors cursor-pointer">
                <span>📡</span> Go Live Now
              </div>
            </Link>
          </div>
        ) : (
          <>
            {/* Grid of business cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <LiveCard key={session.id} session={session} />
              ))}
            </div>
          </>
        )}

        {/* Auto-refresh note */}
        {sessions.length > 0 && (
          <p className="text-center text-xs text-[#333]">Updates every 20 seconds</p>
        )}
      </div>
    </div>
  );
}
