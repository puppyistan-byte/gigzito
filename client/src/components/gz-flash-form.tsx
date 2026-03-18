import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap, X, Flame, Clock, Tag, Users, TrendingUp, RefreshCw,
} from "lucide-react";
import type { GzFlashAd } from "@shared/schema";

export function computePotencyPreview(
  retailCents: number,
  discount: number,
  qty: number,
  durMin: number,
): number {
  if (!retailCents || !discount || !qty || !durMin) return 0;
  const savings = discount / 100;
  const scarcity = 1;
  const timeScore = 1;
  const friction = Math.max(retailCents / 2000, 0.1);
  return parseFloat(((savings * timeScore * scarcity) / friction).toFixed(3));
}

export function PotencyTooltip({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
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
          <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-tooltip">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[#aaa] text-xs mb-3">
            Ad positions are determined by the{" "}
            <span className="text-blue-300 font-semibold">Potency Score (S)</span>:
          </p>
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3 text-center mb-4">
            <span className="text-blue-200 font-mono text-sm">
              S = (Savings × Time × Scarcity) ÷ Price Friction
            </span>
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

export function GzFlashForm({
  existing,
  onClose,
  onSaved,
}: {
  existing?: GzFlashAd;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [artworkUrl, setArtworkUrl] = useState(existing?.artworkUrl ?? "");
  const [retailDollars, setRetailDollars] = useState(
    existing ? (existing.retailPriceCents / 100).toFixed(2) : "",
  );
  const [discount, setDiscount] = useState(existing?.discountPercent?.toString() ?? "");
  const [qty, setQty] = useState(existing?.quantity?.toString() ?? "10");
  const [durHours, setDurHours] = useState(
    existing ? Math.floor(existing.durationMinutes / 60).toString() : "",
  );
  const [durMins, setDurMins] = useState(
    existing ? (existing.durationMinutes % 60).toString() : "30",
  );

  const retailCents = Math.round(parseFloat(retailDollars || "0") * 100);
  const discountNum = parseInt(discount || "0");
  const qtyNum = parseInt(qty || "0");
  const durMinTotal = parseInt(durHours || "0") * 60 + parseInt(durMins || "0");
  const preview = computePotencyPreview(retailCents, discountNum, qtyNum, durMinTotal);
  const salePrice =
    retailCents > 0 && discountNum > 0
      ? ((retailCents * (1 - discountNum / 100)) / 100).toFixed(2)
      : null;

  const heatZone =
    preview >= 2.5 ? { label: "POLE", color: "text-blue-300", bg: "bg-blue-900/40 border-blue-700/50" } :
    preview >= 1.0 ? { label: "HOT",  color: "text-orange-300", bg: "bg-orange-900/40 border-orange-700/50" } :
    preview >= 0.3 ? { label: "ACTIVE", color: "text-yellow-300", bg: "bg-yellow-900/40 border-yellow-700/50" } :
    preview > 0   ? { label: "COOL", color: "text-[#666]", bg: "bg-[#111] border-[#222]" } :
    null;

  const saveMutation = useMutation({
    mutationFn: (data: object) =>
      existing
        ? apiRequest("PUT", `/api/gz-flash/${existing.id}`, data)
        : apiRequest("POST", "/api/gz-flash", data),
    onSuccess: () => {
      toast({
        title: existing ? "✅ Ad updated!" : "🚀 GZFlash launched!",
        description: "Ad is live in the Offer Center.",
      });
      onSaved();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message ?? "Failed to save ad", variant: "destructive" }),
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
          <h3 className="text-white font-bold text-sm">
            {existing ? "Edit GZFlash Ad" : "New GZFlash Ad"}
          </h3>
        </div>
        <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-flash-form">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Ad Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Sale – 50% off sneakers"
            className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
            data-testid="input-flash-title"
          />
        </div>

        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Artwork URL (optional)</Label>
          <Input
            value={artworkUrl}
            onChange={(e) => setArtworkUrl(e.target.value)}
            placeholder="https://example.com/banner.jpg"
            className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
            data-testid="input-flash-artwork"
          />
          <p className="text-[#555] text-[10px] mt-1">Must fit standard GeeZee Card dimensions (300×168px)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Retail Price ($) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={retailDollars}
              onChange={(e) => setRetailDollars(e.target.value)}
              placeholder="29.99"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
              data-testid="input-flash-price"
            />
          </div>
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Discount % *</Label>
            <Input
              type="number"
              min="1"
              max="99"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="25"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
              data-testid="input-flash-discount"
            />
          </div>
        </div>

        {salePrice && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666] line-through">${parseFloat(retailDollars).toFixed(2)}</span>
            <span className="text-green-400 font-bold text-sm">→ ${salePrice}</span>
            <span className="bg-green-900/30 border border-green-700/40 text-green-400 rounded px-1.5 py-0.5 font-bold">
              {discountNum}% OFF
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Quantity (slots) *</Label>
            <Input
              type="number"
              min="1"
              max="999"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="10"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
              data-testid="input-flash-qty"
            />
          </div>
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Duration *</Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min="0"
                max="23"
                value={durHours}
                onChange={(e) => setDurHours(e.target.value)}
                placeholder="0h"
                className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full"
                data-testid="input-flash-hours"
              />
              <Input
                type="number"
                min="0"
                max="59"
                value={durMins}
                onChange={(e) => setDurMins(e.target.value)}
                placeholder="30m"
                className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full"
                data-testid="input-flash-mins"
              />
            </div>
            <p className="text-[#444] text-[10px] mt-0.5">hours / minutes</p>
          </div>
        </div>

        {preview > 0 && (
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Flame className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-[#777] uppercase tracking-wider font-semibold">
                  Initial Potency Score
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-blue-300 font-mono font-bold text-lg">{preview.toFixed(3)}</p>
                  {heatZone && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${heatZone.bg} ${heatZone.color}`}>
                      {heatZone.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-[#0a0f1e] border border-[#1a2030] rounded-lg p-2 text-center">
                <p className="text-[#555] mb-0.5">Savings</p>
                <p className="text-green-400 font-mono font-bold">{(discountNum / 100).toFixed(2)}</p>
              </div>
              <div className="bg-[#0a0f1e] border border-[#1a2030] rounded-lg p-2 text-center">
                <p className="text-[#555] mb-0.5">Price Friction</p>
                <p className="text-orange-400 font-mono font-bold">{Math.max(retailCents / 2000, 0.1).toFixed(2)}</p>
              </div>
              <div className="bg-[#0a0f1e] border border-[#1a2030] rounded-lg p-2 text-center">
                <p className="text-[#555] mb-0.5">At Expiry</p>
                <p className="text-blue-300 font-mono font-bold">
                  {computePotencyPreview(retailCents, discountNum, 1, durMinTotal) > 0
                    ? (((discountNum / 100) * 3 * (1 / qtyNum)) / Math.max(retailCents / 2000, 0.1)).toFixed(3)
                    : "–"}
                </p>
              </div>
            </div>

            <p className="text-[#444] text-[10px]">
              Score grows as time runs out and slots are claimed — watch it climb in the Offer Center.
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-sm mt-1"
          data-testid="btn-launch-flash"
        >
          {saveMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {existing ? "Replace Ad (Full Update)" : "Launch GZFlash"}
        </Button>
      </div>
    </div>
  );
}
