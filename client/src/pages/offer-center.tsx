import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Flame, Clock, Users, Zap, RefreshCw, CheckCircle2, Plus, Home, Tag } from "lucide-react";
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

type HeatZone = "hot" | "trending" | "active" | "cool";

function heatZone(score: number): HeatZone {
  if (score >= 90) return "hot";
  if (score >= 70) return "trending";
  if (score >= 40) return "active";
  return "cool";
}

const ZONE_CONFIG: Record<HeatZone, {
  border: string;
  bg: string;
  glow: string;
  badge: string;
  badgeText: string;
  label: string;
  dot: string;
}> = {
  hot: {
    border: "border-red-500/80",
    bg: "bg-gradient-to-br from-red-950/60 to-[#0d0608]",
    glow: "shadow-[0_0_28px_rgba(239,68,68,0.30)]",
    badge: "bg-red-600 text-white",
    badgeText: "🔴 HOT",
    label: "HOT",
    dot: "bg-red-400",
  },
  trending: {
    border: "border-orange-500/60",
    bg: "bg-gradient-to-br from-orange-950/40 to-[#0a0806]",
    glow: "shadow-[0_0_16px_rgba(249,115,22,0.20)]",
    badge: "bg-orange-600 text-white",
    badgeText: "🟠 TRENDING",
    label: "TRENDING",
    dot: "bg-orange-400",
  },
  active: {
    border: "border-yellow-700/40",
    bg: "bg-[#090a05]",
    glow: "",
    badge: "bg-yellow-800/60 text-yellow-300 border border-yellow-700/40",
    badgeText: "🟡 ACTIVE",
    label: "ACTIVE",
    dot: "bg-yellow-400",
  },
  cool: {
    border: "border-[#181818]",
    bg: "bg-[#070707]",
    glow: "",
    badge: "bg-[#111] text-[#555] border border-[#222]",
    badgeText: "❄ COOL",
    label: "COOL",
    dot: "bg-[#444]",
  },
};

function AdCard({ ad, rank, onClaim, isClaiming }: {
  ad: GzFlashAdWithOwner;
  rank: number;
  onClaim: () => void;
  isClaiming: boolean;
}) {
  const countdown = useCountdown(ad.expiresAt.toString());
  const zone = heatZone(ad.potencyScore);
  const cfg = ZONE_CONFIG[zone];
  const remaining = ad.quantity - ad.claimedCount;
  const salePrice = ((ad.retailPriceCents * (1 - ad.discountPercent / 100)) / 100).toFixed(2);
  const originalPrice = (ad.retailPriceCents / 100).toFixed(2);
  const soldOut = remaining <= 0;
  const isUrgent = remaining <= 3;
  const isLowTime = Math.max(0, Math.floor((new Date(ad.expiresAt).getTime() - Date.now()) / 1000)) < 600;
  const mode = (ad as any).displayMode ?? "countdown";
  const score = Math.round(ad.potencyScore);

  const fireSize =
    rank === 1 ? "3.8rem" :
    rank <= 3  ? "3.2rem" :
    rank <= 10 ? "2.6rem" : "2.1rem";

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden ${cfg.border} ${cfg.bg} ${cfg.glow} p-4 flex flex-col h-full transition-all duration-500 group hover:scale-[1.015]`}
      data-testid={`card-ad-${ad.id}`}
    >
      {rank === 1 && (
        <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      )}

      {/* Fiery rank number — top 30 only */}
      {rank <= 30 && (
        <div
          className="absolute top-1 right-2 font-black italic leading-none select-none pointer-events-none z-0"
          style={{
            fontSize: fireSize,
            background: "linear-gradient(170deg, #FDE68A 0%, #FB923C 38%, #EF4444 72%, #991B1B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 10px rgba(251,146,60,0.65)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
            opacity: rank === 1 ? 0.95 : rank <= 5 ? 0.85 : 0.7,
          }}
          data-testid={`rank-fire-${ad.id}`}
        >
          {rank}
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`relative z-10 text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
      </div>

      {ad.artworkUrl && (
        <img
          src={ad.artworkUrl}
          alt={ad.title}
          className="w-full h-24 object-cover rounded-xl mb-3 border border-[#1a1a1a]"
        />
      )}

      <h3 className="text-white font-bold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-blue-100 transition-colors">
        {ad.title}
      </h3>

      {(ad.displayName || ad.username) && (
        <p className="text-[#555] text-[10px] mb-3 truncate">
          {ad.displayName ?? ad.username}
        </p>
      )}

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-green-400 font-black text-xl">${salePrice}</span>
        <span className="text-[#444] line-through text-xs">${originalPrice}</span>
        <span className="ml-auto bg-green-900/40 border border-green-800/40 text-green-400 text-[10px] font-bold rounded-lg px-2 py-0.5 shrink-0">
          {ad.discountPercent}% OFF
        </span>
      </div>

      {/* Primary display — large hero widget based on displayMode */}
      {mode === "countdown" ? (
        <div className={`mb-3 rounded-xl border py-2.5 px-3 flex items-center gap-2 ${isLowTime ? "border-orange-800/50 bg-orange-950/20" : "border-[#181818] bg-black/20"}`}>
          <Clock className={`h-4 w-4 shrink-0 ${isLowTime ? "text-orange-400" : "text-[#555]"}`} />
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-0.5">Time Remaining</p>
            <p className={`font-mono font-bold text-base leading-none ${isLowTime ? "text-orange-300" : "text-white"}`}>{countdown}</p>
          </div>
        </div>
      ) : (
        <div className={`mb-3 rounded-xl border py-2.5 px-3 flex items-center gap-2 ${isUrgent ? "border-red-800/50 bg-red-950/20" : "border-[#181818] bg-black/20"}`}>
          <Users className={`h-4 w-4 shrink-0 ${isUrgent ? "text-red-400" : "text-[#555]"}`} />
          <div>
            <p className="text-[9px] text-[#444] uppercase tracking-wider mb-0.5">Offers Remaining</p>
            <p className={`font-mono font-bold text-base leading-none ${isUrgent ? "text-red-300" : "text-white"}`}>
              {remaining} / {ad.quantity}
            </p>
          </div>
        </div>
      )}

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1 text-[9px]">
          <span className="text-[#444] uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-2.5 w-2.5 text-blue-500/60" /> GZFlash Score
          </span>
          <span className="text-blue-400 font-mono font-bold">{score}</span>
        </div>
        <div className="h-1 rounded-full bg-[#111] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 90 ? "bg-red-500" : score >= 70 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-[#333]"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="mt-auto">
        <Button
          onClick={onClaim}
          disabled={soldOut || isClaiming}
          size="sm"
          className={`w-full h-9 text-xs font-bold rounded-xl ${
            soldOut
              ? "bg-[#111] text-[#444] border border-[#222] cursor-not-allowed"
              : zone === "hot"
              ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              : "bg-blue-700 hover:bg-blue-600 text-white"
          }`}
          data-testid={`btn-claim-${ad.id}`}
        >
          {isClaiming ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : soldOut ? (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Sold Out</>
          ) : (
            <><Zap className="h-3.5 w-3.5 mr-1" />Claim This Deal</>
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
  const [tick, setTick] = useState(0);

  const { data: ads = [], isLoading, refetch } = useQuery<GzFlashAdWithOwner[]>({
    queryKey: ["/api/gz-flash"],
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const claimMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/gz-flash/${id}/claim`, {}),
    onMutate: (id) => setClaimingId(id),
    onSettled: () => setClaimingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gz-flash"] });
      toast({ title: "Deal claimed!", description: "You locked in this offer. Scores are updating." });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't claim", description: e.message ?? "Already sold out or expired", variant: "destructive" });
    },
  });

  const userRole = (user as any)?.user?.role ?? "";
  const userTier = (user as any)?.user?.subscriptionTier ?? "";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(userRole);
  const canCreateAd = isAdmin || ["GZMarketerPro", "GZBusiness", "GZEnterprise"].includes(userTier);

  const sortedAds = [...ads].sort((a, b) => b.potencyScore - a.potencyScore);

  const zoneCounts = sortedAds.reduce<Record<HeatZone, number>>((acc, ad) => {
    acc[heatZone(ad.potencyScore)]++;
    return acc;
  }, { hot: 0, trending: 0, active: 0, cool: 0 });

  const avatarUrl = (user as any)?.profile?.avatarUrl as string | undefined;
  const username = (user as any)?.profile?.username as string | undefined;
  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* Slim top bar */}
      <div className="sticky top-0 z-50 border-b border-[#111] bg-[#050505]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/">
            <button
              className="flex items-center gap-2 text-[#555] hover:text-white transition-colors text-sm font-medium"
              data-testid="btn-back-home"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>
          </Link>

          <div className="flex items-center gap-2">
            {/* Create Ad CTA — always visible, behaviour changes by auth/tier */}
            {!user ? (
              <Link href="/auth">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-8 text-xs rounded-xl gap-1.5"
                  data-testid="btn-create-ad-login"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Flash Ad
                </Button>
              </Link>
            ) : canCreateAd ? (
              <Link href="/gz-business">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-8 text-xs rounded-xl gap-1.5"
                  data-testid="btn-create-ad"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Flash Ad
                </Button>
              </Link>
            ) : (
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-700/50 text-blue-400 hover:bg-blue-900/30 h-8 text-xs rounded-xl gap-1.5"
                  data-testid="btn-upgrade-for-ad"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade to Create
                </Button>
              </Link>
            )}

            {/* Profile avatar / login */}
            {user ? (
              <Link href="/profile">
                <button
                  className="flex items-center gap-2 group"
                  data-testid="btn-profile-avatar"
                  title={username ?? "Profile"}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={username ?? "avatar"}
                      className="w-8 h-8 rounded-full object-cover border border-[#222] group-hover:border-blue-500/50 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold group-hover:border-blue-500/60 transition-all">
                      {initials}
                    </div>
                  )}
                </button>
              </Link>
            ) : (
              <Link href="/auth">
                <button
                  className="text-xs font-semibold text-[#555] hover:text-white transition-colors"
                  data-testid="btn-login"
                >
                  Log in
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-600/40 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">GZFlash Sales</h1>
            </div>
            <p className="text-[#555] text-xs ml-11">
              Ranked by Potency Score — highest score claims top-left position
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCreateAd && (
              <Link href="/gz-business">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-8 text-xs rounded-xl gap-1.5"
                  data-testid="btn-create-ad"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Ad
                </Button>
              </Link>
            )}
            <button
              onClick={() => { refetch(); setTick((t) => t + 1); }}
              className="w-8 h-8 rounded-xl bg-[#111] border border-[#1e1e1e] flex items-center justify-center text-[#555] hover:text-blue-400 hover:border-blue-900/50 transition-all"
              data-testid="btn-refresh"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {ads.length > 0 && (
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            {(["hot", "trending", "active", "cool"] as HeatZone[]).map((zone) => (
              <div key={zone} className="flex items-center gap-1.5 text-[10px] text-[#555]">
                <div className={`w-2 h-2 rounded-full ${ZONE_CONFIG[zone].dot}`} />
                <span className="uppercase tracking-wider font-semibold">{ZONE_CONFIG[zone].label}</span>
                <span className="text-[#333]">({zoneCounts[zone]})</span>
              </div>
            ))}
            <span className="text-[10px] text-[#333] ml-auto">{sortedAds.length} active</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse" />
            ))}
          </div>
        ) : sortedAds.length === 0 ? (
          <div className="text-center py-28 border border-dashed border-[#1a1a1a] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-900/10 border border-blue-900/20 flex items-center justify-center mx-auto mb-5">
              <Tag className="h-7 w-7 text-blue-900" />
            </div>
            <p className="text-[#555] text-base font-semibold">No GZFlash deals live right now</p>
            <p className="text-[#3a3a3a] text-sm mt-1.5 max-w-xs mx-auto">
              GZBusiness members deploy flash offers — they rank here by Potency Score.
            </p>
            {canCreateAd && (
              <Link href="/gz-business">
                <Button className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-sm rounded-xl gap-2" data-testid="btn-empty-create">
                  <Plus className="h-4 w-4" />
                  Launch Your First Ad
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAds.map((ad, i) => (
              <AdCard
                key={ad.id}
                ad={ad}
                rank={i + 1}
                onClaim={() => claimMutation.mutate(ad.id)}
                isClaiming={claimingId === ad.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
