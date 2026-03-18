import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap, HelpCircle, Trash2, Edit2, X,
  BarChart2, CreditCard, ArrowLeft, Plus, Flame, RefreshCw, ExternalLink,
} from "lucide-react";
import type { GzFlashAd } from "@shared/schema";
import { GzFlashForm, PotencyTooltip } from "@/components/gz-flash-form";

const BLUE = {
  accent: "#3b82f6",
  glow: "rgba(59,130,246,0.3)",
  border: "border-blue-700/50",
  bg: "bg-blue-900/20",
  text: "text-blue-400",
  badge: "bg-blue-900/40 border-blue-700/60 text-blue-300",
};


function MyAdCard({ ad, onEdit, onDelete }: { ad: GzFlashAd; onEdit: (a: GzFlashAd) => void; onDelete: (id: number) => void }) {
  const remaining = ad.quantity - ad.claimedCount;
  const salePrice = (ad.retailPriceCents * (1 - ad.discountPercent / 100) / 100).toFixed(2);
  const expiresAt = new Date(ad.expiresAt);
  const now = new Date();
  const minsLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000));
  const isLive = ad.status === "active" && expiresAt > now;

  return (
    <div className={`rounded-xl border ${isLive ? "border-blue-700/50 bg-blue-950/20" : "border-[#222] bg-[#0a0a0a]"} p-4 flex gap-3`} data-testid={`card-my-flash-${ad.id}`}>
      {ad.artworkUrl && (
        <img src={ad.artworkUrl} alt={ad.title} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[#1e1e1e]" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-semibold text-sm truncate">{ad.title}</p>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(ad)} className="text-[#555] hover:text-blue-400 transition-colors p-1" data-testid={`btn-edit-flash-${ad.id}`}><Edit2 className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete(ad.id)} className="text-[#555] hover:text-red-400 transition-colors p-1" data-testid={`btn-delete-flash-${ad.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
          <span className="text-green-400 font-bold">${salePrice}</span>
          <span className="text-[#666] line-through">${(ad.retailPriceCents / 100).toFixed(2)}</span>
          <span className="bg-green-900/30 text-green-400 border border-green-800/40 rounded px-1 font-bold">{ad.discountPercent}% OFF</span>
          <span className={`rounded px-1 font-bold ${isLive ? "bg-blue-900/40 text-blue-300 border border-blue-700/40" : "bg-[#111] text-[#555] border border-[#222]"}`}>
            {isLive ? `${minsLeft}m left` : ad.status}
          </span>
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-[#666]">
          <span>{remaining}/{ad.quantity} slots</span>
          <span>Score: <span className="text-blue-400 font-mono">{ad.potencyScore.toFixed(2)}</span></span>
        </div>
        {ad.adminNote && (
          <div className="mt-2 bg-amber-950/30 border border-amber-700/40 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-300 leading-snug">
            <span className="font-bold uppercase tracking-wider text-amber-400">⚠ Admin note: </span>{ad.adminNote}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GzBusinessPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<GzFlashAd | null>(null);

  const tier = (user as any)?.user?.subscriptionTier ?? "";
  const role = (user as any)?.user?.role ?? "";
  const isAllowed = tier === "GZBusiness" || role === "ADMIN" || role === "SUPER_ADMIN";

  const { data: myAds = [], isLoading } = useQuery<GzFlashAd[]>({
    queryKey: ["/api/gz-flash/mine"],
    enabled: isAllowed,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gz-flash/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gz-flash/mine"] });
      toast({ title: "Ad removed" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <Zap className="h-12 w-12 text-blue-500 mb-4" />
          <p className="text-[#666] text-lg">Sign in to access the GZBusiness portal.</p>
          <Link href="/auth"><Button className="mt-5 bg-blue-600 hover:bg-blue-500 text-white" data-testid="btn-signin-gzbusiness">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <CreditCard className="h-12 w-12 text-blue-500/50 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">GZBusiness Tier Required</h2>
          <p className="text-[#666] text-sm max-w-sm">The GZFlash Ad Center is exclusive to GZBusiness members. Upgrade to unlock the Offer Center, GZFlash ads, and the full merchant suite.</p>
          <Link href="/pricing"><Button className="mt-5 bg-blue-600 hover:bg-blue-500 text-white" data-testid="btn-upgrade-gzbusiness">View Plans</Button></Link>
        </div>
      </div>
    );
  }

  const handleSaved = () => {
    setShowForm(false);
    setEditingAd(null);
    qc.invalidateQueries({ queryKey: ["/api/gz-flash/mine"] });
    qc.invalidateQueries({ queryKey: ["/api/gz-flash"] });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <PotencyTooltip open={showTooltip} onClose={() => setShowTooltip(false)} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/geezees" className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-blue-400 transition-colors mb-6" data-testid="link-back-geezees">
          <ArrowLeft className="h-3.5 w-3.5" /> GeeZees Rolodex
        </Link>

        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Zap className="h-5 w-5 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">GZBusiness Portal</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-700/60 text-blue-300 bg-blue-900/30">AD CENTER</span>
            </div>
            <p className="text-[#555] text-sm">Deploy GZFlash ads. Your deals compete in real-time for Pole Position.</p>
          </div>
          <button
            onClick={() => setShowTooltip(true)}
            className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/40 transition-colors rounded-lg px-3 py-1.5"
            data-testid="btn-ranking-tooltip"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How ranking works?
          </button>
        </div>

        <div className="flex gap-3 mt-5 mb-6 flex-wrap">
          <Link href="/offer-center">
            <Button variant="outline" size="sm" className="border-blue-700/50 text-blue-300 hover:bg-blue-900/30 text-xs h-8" data-testid="link-offer-center">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Offer Center
            </Button>
          </Link>
          <Link href="/card-editor">
            <Button variant="outline" size="sm" className="border-[#333] text-[#999] hover:text-white hover:border-[#555] text-xs h-8" data-testid="link-card-editor">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Edit My GeeZee Card
            </Button>
          </Link>
        </div>

        {(showForm || editingAd) ? (
          <div className="mb-6">
            <GzFlashForm
              existing={editingAd ?? undefined}
              onClose={() => { setShowForm(false); setEditingAd(null); }}
              onSaved={handleSaved}
            />
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 text-sm mb-6 flex items-center gap-2"
            data-testid="btn-new-flash-ad"
          >
            <Plus className="h-4 w-4" />
            New GZFlash Ad
          </Button>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-400" />
              <h2 className="text-white font-semibold text-sm">My GZFlash Ads</h2>
            </div>
            <span className="text-[10px] text-[#555]">{myAds.length} ad{myAds.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] animate-pulse" />)}
            </div>
          ) : myAds.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#222] rounded-xl">
              <Zap className="h-8 w-8 text-blue-800 mx-auto mb-3" />
              <p className="text-[#555] text-sm">No GZFlash ads yet.</p>
              <p className="text-[#444] text-xs mt-1">Create your first ad to appear in the Offer Center.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAds.map((ad) => (
                <MyAdCard
                  key={ad.id}
                  ad={ad}
                  onEdit={(a) => { setEditingAd(a); setShowForm(false); }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
