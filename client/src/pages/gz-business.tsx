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
  Zap, HelpCircle, Trash2, Edit2, X, Clock, Tag, Users, TrendingUp,
  BarChart2, CreditCard, ArrowLeft, Plus, Flame, RefreshCw, ExternalLink,
} from "lucide-react";
import type { GzFlashAd } from "@shared/schema";

const BLUE = {
  accent: "#3b82f6",
  glow: "rgba(59,130,246,0.3)",
  border: "border-blue-700/50",
  bg: "bg-blue-900/20",
  text: "text-blue-400",
  badge: "bg-blue-900/40 border-blue-700/60 text-blue-300",
};

function computePotencyPreview(retailCents: number, discount: number, qty: number, durMin: number): number {
  if (!retailCents || !discount || !qty || !durMin) return 0;
  const savings = discount / 100;
  const scarcity = 1;
  const timeScore = 1;
  const friction = Math.max(retailCents / 2000, 0.1);
  return parseFloat(((savings * timeScore * scarcity) / friction).toFixed(3));
}

function PotencyTooltip({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#0a0f1e] border border-blue-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="potency-tooltip-modal"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-bold text-base">GZFlash Ranking Matrix</h3>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-tooltip"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-4">
          <p className="text-[#aaa] text-xs mb-3">Ad positions are determined by the <span className="text-blue-300 font-semibold">Potency Score (S)</span>:</p>
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3 text-center mb-4">
            <span className="text-blue-200 font-mono text-sm">S = (Savings × Time × Scarcity) ÷ Price Friction</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { icon: <Tag className="h-3.5 w-3.5 text-green-400" />, label: "Savings", desc: "Deeper discounts dramatically increase strength" },
              { icon: <Clock className="h-3.5 w-3.5 text-orange-400" />, label: "Time Pressure", desc: "As the clock winds down, your ad heats up and drifts to the top-left" },
              { icon: <Users className="h-3.5 w-3.5 text-purple-400" />, label: "Scarcity", desc: "Fewer slots remaining = higher urgency = better rank" },
              { icon: <TrendingUp className="h-3.5 w-3.5 text-blue-400" />, label: "Price Friction", desc: "Items priced $1–$20 have high 'ease of buy' — they climb fastest" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <div>
                  <span className="text-white font-semibold">{label}: </span>
                  <span className="text-[#999]">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-blue-900/50 pt-4">
          <p className="text-[#777] text-[10px] uppercase tracking-wider font-semibold mb-2">Grid Zones</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-2">
              <div className="text-blue-300 font-bold mb-0.5">🔥 Top-Left</div>
              <div className="text-[#888]">Pole Position — Max visibility</div>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-lg p-2">
              <div className="text-white font-bold mb-0.5">⚡ Mid-Grid</div>
              <div className="text-[#888]">Active Growth</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2">
              <div className="text-[#666] font-bold mb-0.5">❄️ Bottom-Right</div>
              <div className="text-[#555]">Cool Zone</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlashAdForm({ existing, onClose, onSaved }: {
  existing?: GzFlashAd;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [artworkUrl, setArtworkUrl] = useState(existing?.artworkUrl ?? "");
  const [retailDollars, setRetailDollars] = useState(existing ? (existing.retailPriceCents / 100).toFixed(2) : "");
  const [discount, setDiscount] = useState(existing?.discountPercent?.toString() ?? "");
  const [qty, setQty] = useState(existing?.quantity?.toString() ?? "10");
  const [durHours, setDurHours] = useState(existing ? Math.floor(existing.durationMinutes / 60).toString() : "");
  const [durMins, setDurMins] = useState(existing ? (existing.durationMinutes % 60).toString() : "30");

  const retailCents = Math.round(parseFloat(retailDollars || "0") * 100);
  const discountNum = parseInt(discount || "0");
  const qtyNum = parseInt(qty || "0");
  const durMinTotal = (parseInt(durHours || "0") * 60) + parseInt(durMins || "0");
  const preview = computePotencyPreview(retailCents, discountNum, qtyNum, durMinTotal);
  const salePrice = retailCents > 0 && discountNum > 0 ? ((retailCents * (1 - discountNum / 100)) / 100).toFixed(2) : null;

  const saveMutation = useMutation({
    mutationFn: (data: object) => existing
      ? apiRequest("PUT", `/api/gz-flash/${existing.id}`, data)
      : apiRequest("POST", "/api/gz-flash", data),
    onSuccess: () => {
      toast({ title: existing ? "✅ Ad updated!" : "🚀 GZFlash launched!", description: "Your ad is live in the Offer Center." });
      onSaved();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message ?? "Failed to save ad", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!title.trim()) return toast({ title: "Title required", variant: "destructive" });
    if (!retailCents || retailCents < 1) return toast({ title: "Enter a valid retail price", variant: "destructive" });
    if (!discountNum || discountNum < 1 || discountNum > 99) return toast({ title: "Discount must be 1–99%", variant: "destructive" });
    if (!qtyNum || qtyNum < 1) return toast({ title: "Quantity must be at least 1", variant: "destructive" });
    if (!durMinTotal || durMinTotal < 5) return toast({ title: "Duration must be at least 5 minutes", variant: "destructive" });
    saveMutation.mutate({
      title: title.trim(),
      artworkUrl: artworkUrl.trim() || null,
      retailPriceCents: retailCents,
      discountPercent: discountNum,
      quantity: qtyNum,
      durationMinutes: durMinTotal,
    });
  };

  return (
    <div className="bg-[#070d1a] border border-blue-800/50 rounded-2xl p-6" data-testid="flash-ad-form">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-400" />
          <h3 className="text-white font-bold text-sm">{existing ? "Edit GZFlash Ad" : "New GZFlash Ad"}</h3>
        </div>
        <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-flash-form"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Ad Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer Sale – 50% off sneakers" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm" data-testid="input-flash-title" />
        </div>

        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Artwork URL (optional)</Label>
          <Input value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} placeholder="https://example.com/banner.jpg" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm" data-testid="input-flash-artwork" />
          <p className="text-[#555] text-[10px] mt-1">Must fit standard GeeZee Card dimensions (300×168px)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Retail Price ($) *</Label>
            <Input type="number" min="0.01" step="0.01" value={retailDollars} onChange={(e) => setRetailDollars(e.target.value)} placeholder="29.99" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm" data-testid="input-flash-price" />
          </div>
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Discount % *</Label>
            <Input type="number" min="1" max="99" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="25" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm" data-testid="input-flash-discount" />
          </div>
        </div>

        {salePrice && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666] line-through">${parseFloat(retailDollars).toFixed(2)}</span>
            <span className="text-green-400 font-bold text-sm">→ ${salePrice}</span>
            <span className="bg-green-900/30 border border-green-700/40 text-green-400 rounded px-1.5 py-0.5 font-bold">{discountNum}% OFF</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Quantity (slots) *</Label>
            <Input type="number" min="1" max="999" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm" data-testid="input-flash-qty" />
          </div>
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Duration *</Label>
            <div className="flex gap-1.5">
              <Input type="number" min="0" max="23" value={durHours} onChange={(e) => setDurHours(e.target.value)} placeholder="0h" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full" data-testid="input-flash-hours" />
              <Input type="number" min="0" max="59" value={durMins} onChange={(e) => setDurMins(e.target.value)} placeholder="30m" className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full" data-testid="input-flash-mins" />
            </div>
            <p className="text-[#444] text-[10px] mt-0.5">hours / minutes</p>
          </div>
        </div>

        {preview > 0 && (
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 flex items-center gap-3">
            <Flame className="h-4 w-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] text-[#777] uppercase tracking-wider font-semibold">Initial Potency Score</p>
              <p className="text-blue-300 font-mono font-bold">{preview.toFixed(3)}</p>
              <p className="text-[#555] text-[10px]">Score grows as time runs out and slots are claimed</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-sm mt-1"
          data-testid="btn-launch-flash"
        >
          {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          {existing ? "Replace Ad (Full Update)" : "Launch GZFlash"}
        </Button>
      </div>
    </div>
  );
}

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
  const isAllowed = tier === "GZBusiness" || (user as any)?.user?.role === "ADMIN";

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
            <FlashAdForm
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
