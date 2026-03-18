import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Flame, Clock, Tag, Users, Zap, ArrowLeft, RefreshCw, CheckCircle2, ExternalLink,
} from "lucide-react";
import type { GzFlashAdWithOwner } from "@shared/schema";

function useCountdown(expiresAt: string) {
  const [seconds, setSeconds] = useState(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function heatLevel(score: number): "pole" | "hot" | "warm" | "cool" {
  if (score >= 2) return "pole";
  if (score >= 0.8) return "hot";
  if (score >= 0.3) return "warm";
  return "cool";
}

const HEAT_STYLES = {
  pole: {
    card: "border-blue-500/70 bg-gradient-to-br from-blue-950/60 to-[#07101e] shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    badge: "bg-blue-600 text-white",
    label: "🔥 POLE POSITION",
    glow: true,
  },
  hot: {
    card: "border-blue-700/50 bg-blue-950/30",
    badge: "bg-blue-800 text-blue-200",
    label: "⚡ HOT",
    glow: false,
  },
  warm: {
    card: "border-[#1e2a3a] bg-[#090e18]",
    badge: "bg-[#111] text-[#777] border border-[#222]",
    label: "Active",
    glow: false,
  },
  cool: {
    card: "border-[#151515] bg-[#070707]",
    badge: "bg-[#0a0a0a] text-[#444] border border-[#1a1a1a]",
    label: "❄️ Cool Zone",
    glow: false,
  },
};

function FlashAdCard({ ad, rank, onClaim, isClaiming }: {
  ad: GzFlashAdWithOwner;
  rank: number;
  onClaim: () => void;
  isClaiming: boolean;
}) {
  const countdown = useCountdown(ad.expiresAt.toString());
  const heat = heatLevel(ad.potencyScore);
  const style = HEAT_STYLES[heat];
  const remaining = ad.quantity - ad.claimedCount;
  const salePrice = (ad.retailPriceCents * (1 - ad.discountPercent / 100) / 100).toFixed(2);
  const soldOut = remaining <= 0;

  return (
    <div
      className={`rounded-xl border ${style.card} p-4 flex flex-col h-full transition-all duration-700`}
      data-testid={`card-offer-${ad.id}`}
    >
      {ad.artworkUrl && (
        <img
          src={ad.artworkUrl}
          alt={ad.title}
          className="w-full h-28 object-cover rounded-lg mb-3 border border-[#1e1e1e]"
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-[10px] text-[#555] font-mono">#{rank}</span>
      </div>

      <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2">{ad.title}</h3>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-green-400 font-bold text-lg">${salePrice}</span>
        <span className="text-[#666] line-through text-xs">${(ad.retailPriceCents / 100).toFixed(2)}</span>
        <span className="bg-green-900/30 border border-green-800/40 text-green-400 text-[10px] font-bold rounded px-1.5 py-0.5 ml-auto">
          {ad.discountPercent}% OFF
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[#666] mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-orange-400/70" />
          <span className={remaining <= 3 ? "text-orange-400 font-semibold" : ""}>{countdown}</span>
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 text-blue-400/70" />
          <span className={remaining <= 5 ? "text-red-400 font-semibold" : ""}>{remaining} left</span>
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Flame className="h-3 w-3 text-blue-400/70" />
          <span className="text-blue-400 font-mono">{ad.potencyScore.toFixed(2)}</span>
        </span>
      </div>

      {ad.displayName && (
        <p className="text-[#555] text-[10px] mb-3 truncate">by {ad.displayName}</p>
      )}

      <div className="mt-auto">
        <Button
          onClick={onClaim}
          disabled={soldOut || isClaiming}
          size="sm"
          className={`w-full h-8 text-xs font-bold ${
            soldOut
              ? "bg-[#111] text-[#444] border border-[#222] cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
          data-testid={`btn-claim-${ad.id}`}
        >
          {isClaiming ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : soldOut ? (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Sold Out</>
          ) : (
            <><Zap className="h-3.5 w-3.5 mr-1" />Claim</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function OfferCenterPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: ads = [], isLoading, refetch } = useQuery<GzFlashAdWithOwner[]>({
    queryKey: ["/api/gz-flash"],
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const claimMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/gz-flash/${id}/claim`, {}),
    onMutate: (id) => setClaimingId(id),
    onSettled: () => setClaimingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gz-flash"] });
      toast({ title: "🎉 Claimed!", description: "You locked in this deal. Scores are updating." });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't claim", description: e.message ?? "Already sold out or expired", variant: "destructive" });
    },
  });

  const poleAds = ads.slice(0, 1);
  const restAds = ads.slice(1);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-blue-400 transition-colors mb-6" data-testid="link-back-home">
          <ArrowLeft className="h-3.5 w-3.5" /> Main Page
        </Link>

        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Flame className="h-5 w-5 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">GZFlash Offer Center</h1>
            </div>
            <p className="text-[#555] text-sm">Live deals ranked by Potency Score — top-left is Pole Position</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#444]">
              Refreshes in ~{Math.max(0, 60 - Math.floor((Date.now() - lastRefresh.getTime()) / 1000))}s
            </span>
            <button onClick={() => { refetch(); setLastRefresh(new Date()); }} className="text-[#555] hover:text-blue-400 transition-colors" data-testid="btn-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {((user as any)?.user?.subscriptionTier === "GZBusiness" || (user as any)?.user?.role === "ADMIN") && (
              <Link href="/gz-business">
                <Button size="sm" variant="outline" className="border-blue-700/50 text-blue-300 hover:bg-blue-900/30 text-xs h-8" data-testid="link-portal">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  My Portal
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#1a1a1a] rounded-2xl">
            <Flame className="h-12 w-12 text-blue-900 mx-auto mb-4" />
            <p className="text-[#555] text-base font-semibold">No active GZFlash deals right now</p>
            <p className="text-[#444] text-sm mt-1">GZBusiness members can deploy flash offers from their portal.</p>
          </div>
        ) : (
          <>
            {poleAds.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🔥 Pole Position — Hot Zone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {poleAds.map((ad, i) => (
                    <FlashAdCard
                      key={ad.id}
                      ad={ad}
                      rank={i + 1}
                      onClaim={() => claimMutation.mutate(ad.id)}
                      isClaiming={claimingId === ad.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {restAds.length > 0 && (
              <div>
                {ads.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Active Grid</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restAds.map((ad, i) => (
                    <FlashAdCard
                      key={ad.id}
                      ad={ad}
                      rank={i + 2}
                      onClaim={() => claimMutation.mutate(ad.id)}
                      isClaiming={claimingId === ad.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
