import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { LiveCard } from "@/components/live-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio } from "lucide-react";
import type { LiveSessionWithProvider } from "@shared/schema";

export default function LiveNowPage() {

  const { data: sessions = [], isLoading } = useQuery<LiveSessionWithProvider[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff2b2b] animate-pulse" />
            <h1 className="text-xl font-bold text-white" data-testid="text-live-heading">Live Now</h1>
            {sessions.length > 0 && (
              <span className="text-xs text-[#ff2b2b] font-semibold bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-2 py-0.5">
                {sessions.length} Live
              </span>
            )}
          </div>
        </div>

        {/* Live sessions */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full bg-[#111] rounded-2xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center" data-testid="text-no-live">
            <Radio className="h-10 w-10 text-[#222] mx-auto mb-3" />
            <p className="text-white font-bold mb-1">No one is live right now</p>
            <p className="text-[#555] text-sm">Check back soon — Influencers, Musicians, and Event creators go live here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <LiveCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
