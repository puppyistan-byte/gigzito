import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap, X, Flame, Clock, Tag, Users, TrendingUp, RefreshCw,
  Upload, Calendar, ImageIcon, Timer, Hash, FileText,
  CheckCircle2, AlertCircle, AlertTriangle, ChevronRight,
} from "lucide-react";
import type { GzFlashAd } from "@shared/schema";

const COMFORT_DOLLARS = 100;

export function computeGZScore(
  retailDollars: number,
  flashDollars: number,
  qtyTotal: number,
  qtyClaimed: number,
  durationMinutes: number,
  elapsedMinutes: number,
): number {
  if (!retailDollars || !flashDollars || !qtyTotal || !durationMinutes) return 0;
  const V = retailDollars;
  const P = flashDollars;
  if (P >= V || P <= 0) return 0;
  const savingsIndex = (V - P) / V;
  const tRemaining = Math.max(durationMinutes - elapsedMinutes, 0);
  const timeFactor = 1 + (1 - Math.min(tRemaining / durationMinutes, 1));
  const sRemaining = Math.max(qtyTotal - qtyClaimed, 0);
  const scarcityFactor = 1 + (1 - sRemaining / qtyTotal);
  const priceFriction = 1 / (1 + P / COMFORT_DOLLARS);
  const raw = savingsIndex * timeFactor * scarcityFactor * priceFriction;
  return Math.min(100, raw * 100);
}

export function getHeatZone(score: number): { label: string; color: string; bg: string; dot: string } {
  if (score >= 90) return { label: "HOT",      color: "text-red-300",    bg: "bg-red-900/40 border-red-700/50",    dot: "bg-red-400" };
  if (score >= 70) return { label: "TRENDING",  color: "text-orange-300", bg: "bg-orange-900/40 border-orange-700/50", dot: "bg-orange-400" };
  if (score >= 40) return { label: "ACTIVE",    color: "text-yellow-300", bg: "bg-yellow-900/40 border-yellow-700/50", dot: "bg-yellow-400" };
  return               { label: "COOL",       color: "text-[#666]",     bg: "bg-[#111] border-[#222]",            dot: "bg-[#444]" };
}

export function PotencyTooltip({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-tooltip">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[#aaa] text-xs mb-3">
            Ad positions are determined by the{" "}
            <span className="text-blue-300 font-semibold">GZFlash Score (0–100)</span>:
          </p>
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3 text-center mb-4">
            <span className="text-blue-200 font-mono text-xs">
              Score = (Savings × Time × Scarcity × Price Ease) × 100
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { icon: <Tag className="h-3.5 w-3.5 text-green-400" />, label: "Savings", desc: "Bigger gap between retail and flash price = higher score" },
              { icon: <Clock className="h-3.5 w-3.5 text-orange-400" />, label: "Time Pressure", desc: "Score climbs toward 2× as the countdown expires" },
              { icon: <Users className="h-3.5 w-3.5 text-purple-400" />, label: "Scarcity", desc: "Fewer slots remaining = higher urgency multiplier" },
              { icon: <TrendingUp className="h-3.5 w-3.5 text-blue-400" />, label: "Price Ease", desc: "Lower flash price = easier impulse buy = faster climb" },
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
          <p className="text-[#777] text-[10px] uppercase tracking-wider font-semibold mb-2">Score Zones</p>
          <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
            {[
              { label: "HOT", range: "90–100", bg: "bg-red-900/40 border-red-700/50 text-red-300" },
              { label: "TRENDING", range: "70–89", bg: "bg-orange-900/40 border-orange-700/50 text-orange-300" },
              { label: "ACTIVE", range: "40–69", bg: "bg-yellow-900/40 border-yellow-700/50 text-yellow-300" },
              { label: "COOL", range: "0–39", bg: "bg-[#111] border-[#222] text-[#555]" },
            ].map(({ label, range, bg }) => (
              <div key={label} className={`border rounded-lg p-1.5 ${bg}`}>
                <div className="font-bold text-[9px] mb-0.5">{label}</div>
                <div className="text-[8px] opacity-70">{range}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Grade = "strong" | "good" | "fair" | "weak";

function gradeIcon(g: Grade) {
  if (g === "strong") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />;
  if (g === "good")   return <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
  if (g === "fair")   return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
  return                     <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
}
function gradeBadgeBg(g: Grade) {
  if (g === "strong") return "bg-green-900/30 border-green-700/40 text-green-300";
  if (g === "good")   return "bg-blue-900/30 border-blue-700/40 text-blue-300";
  if (g === "fair")   return "bg-yellow-900/30 border-yellow-700/40 text-yellow-300";
  return "bg-red-900/30 border-red-700/40 text-red-300";
}
function gradeLabel(g: Grade) {
  if (g === "strong") return "STRONG";
  if (g === "good")   return "GOOD";
  if (g === "fair")   return "FAIR";
  return "WEAK";
}

function buildReport(
  retailDollars: number,
  flashDollars: number,
  discountNum: number,
  qtyNum: number,
  durationMinutes: number,
  initialScore: number,
  peakScore: number,
) {
  const savingsIndex = retailDollars > 0 ? (retailDollars - flashDollars) / retailDollars : 0;
  const priceFriction = flashDollars > 0 ? 1 / (1 + flashDollars / COMFORT_DOLLARS) : 0;

  let savingsGrade: Grade;
  let savingsTip: string;
  if (discountNum >= 70) { savingsGrade = "strong"; savingsTip = "Your discount is powerful — buyers will notice the deal immediately."; }
  else if (discountNum >= 50) { savingsGrade = "good"; savingsTip = `Solid discount. Pushing to 70%+ would move you into the TRENDING zone faster.`; }
  else if (discountNum >= 30) { savingsGrade = "fair"; savingsTip = `A ${discountNum}% discount is moderate. Increase to 50%+ to meaningfully boost your At Launch score.`; }
  else { savingsGrade = "weak"; savingsTip = `${discountNum}% is a low discount. Buyers compare fast — under 30% often gets ignored. Aim for at least 50%.`; }

  let priceGrade: Grade;
  let priceTip: string;
  if (flashDollars <= 0) { priceGrade = "weak"; priceTip = "Enter a flash price to see your score."; }
  else if (flashDollars < 25) { priceGrade = "strong"; priceTip = `$${flashDollars.toFixed(2)} is well below the $100 impulse-buy comfort zone — excellent for Price Ease.`; }
  else if (flashDollars < 75) { priceGrade = "good"; priceTip = `$${flashDollars.toFixed(2)} is manageable. Dropping below $25 would push Price Ease significantly higher.`; }
  else if (flashDollars < 150) { priceGrade = "fair"; priceTip = `$${flashDollars.toFixed(2)} is above the sweet spot. Prices above $100 create friction — buyers hesitate on impulse buys.`; }
  else { priceGrade = "weak"; priceTip = `$${flashDollars.toFixed(2)} is a high flash price. The formula applies a steep friction penalty above $100 — this is your biggest drag.`; }

  let qtyGrade: Grade;
  let qtyTip: string;
  if (qtyNum <= 5) { qtyGrade = "strong"; qtyTip = `Only ${qtyNum} slot${qtyNum > 1 ? "s" : ""} creates instant scarcity. The Scarcity multiplier climbs quickly as each one is claimed.`; }
  else if (qtyNum <= 20) { qtyGrade = "good"; qtyTip = `${qtyNum} slots is a healthy offer size. Scarcity pressure builds as the first half sells out.`; }
  else if (qtyNum <= 50) { qtyGrade = "fair"; qtyTip = `${qtyNum} slots means it takes longer for scarcity to kick in. Consider limiting to 20 or fewer for faster momentum.`; }
  else { qtyGrade = "weak"; qtyTip = `${qtyNum} slots is a large inventory. Scarcity won't become a meaningful factor until you're near sold-out. Smaller batches perform better.`; }

  let durGrade: Grade;
  let durTip: string;
  const durHours = durationMinutes / 60;
  if (durHours <= 2) { durGrade = "strong"; durTip = `${durationMinutes < 120 ? durationMinutes + " minutes" : "2 hours"} is a tight window — Time Pressure ramps up fast, pushing toward 2× quickly.`; }
  else if (durHours <= 8) { durGrade = "good"; durTip = `${Math.round(durHours)}h is a good flash window. Urgency builds through the afternoon/evening cycle.`; }
  else if (durHours <= 24) { durGrade = "fair"; durTip = `${Math.round(durHours)}h is a long run. Time Pressure won't feel urgent until the final few hours. Try 4–6h for better punch.`; }
  else { durGrade = "weak"; durTip = `${Math.round(durHours)}h is too long for a flash event. Buyers have no urgency to act. Shorten to 8h or less to compress the Time factor.`; }

  const scoreNeededForHot = 90;
  const scoreNeededForTrending = 70;

  let target = "";
  let targetTips: string[] = [];
  if (initialScore >= 90) {
    target = "You're already in the HOT zone at launch — you're maximizing your position.";
  } else if (initialScore >= 70) {
    target = "You're TRENDING. To reach HOT (90+) at launch you need both a very steep discount (90%+) and a very low flash price (under $10).";
    if (discountNum < 90) targetTips.push(`Raise your discount to 90%+ (currently ${discountNum}%)`);
    if (flashDollars >= 10) targetTips.push(`Lower your flash price below $10 (currently $${flashDollars.toFixed(2)})`);
  } else if (initialScore >= 40) {
    target = "You're ACTIVE. To climb to TRENDING (70+) at launch, focus on these two levers:";
    if (discountNum < 70) targetTips.push(`Push discount to 70%+ (currently ${discountNum}%)`);
    if (flashDollars >= 30) targetTips.push(`Bring flash price under $30 (currently $${flashDollars.toFixed(2)})`);
    if (qtyNum > 20) targetTips.push(`Reduce slots to 20 or fewer (currently ${qtyNum})`);
  } else {
    target = `Your At Launch score is ${initialScore.toFixed(1)} (COOL). Here's what to fix first:`;
    if (discountNum < 50) targetTips.push(`Increase discount to at least 50% (currently ${discountNum}%)`);
    if (flashDollars >= 75) targetTips.push(`Lower your flash price below $75 (currently $${flashDollars.toFixed(2)})`);
    if (qtyNum > 30) targetTips.push(`Cut slots down to 10–20 (currently ${qtyNum})`);
    if (durHours > 12) targetTips.push(`Shorten duration to 6–12h (currently ${Math.round(durHours)}h)`);
  }

  return {
    savingsGrade, savingsTip, savingsIndex,
    priceGrade, priceTip, priceFriction,
    qtyGrade, qtyTip,
    durGrade, durTip,
    target, targetTips,
    initialScore, peakScore,
  };
}

function ScoreReportModal({
  open, onClose,
  retailDollars, flashDollars, discountNum, qtyNum, durationMinutes, initialScore, peakScore,
}: {
  open: boolean; onClose: () => void;
  retailDollars: number; flashDollars: number; discountNum: number;
  qtyNum: number; durationMinutes: number; initialScore: number; peakScore: number;
}) {
  if (!open) return null;
  const r = buildReport(retailDollars, flashDollars, discountNum, qtyNum, durationMinutes, initialScore, peakScore);
  const launchZone = getHeatZone(initialScore);
  const peakZone = getHeatZone(peakScore);

  const factors: { icon: React.ReactNode; label: string; value: string; grade: Grade; tip: string }[] = [
    {
      icon: <Tag className="h-3.5 w-3.5 text-green-400" />,
      label: "Savings Index",
      value: `${discountNum}% off  →  ${(r.savingsIndex * 100).toFixed(1)} pts`,
      grade: r.savingsGrade,
      tip: r.savingsTip,
    },
    {
      icon: <TrendingUp className="h-3.5 w-3.5 text-blue-400" />,
      label: "Price Ease",
      value: flashDollars > 0 ? `$${flashDollars.toFixed(2)} flash  →  ${(r.priceFriction).toFixed(3)}×` : "Enter a price",
      grade: r.priceGrade,
      tip: r.priceTip,
    },
    {
      icon: <Users className="h-3.5 w-3.5 text-purple-400" />,
      label: "Scarcity (at launch)",
      value: `${qtyNum} slot${qtyNum !== 1 ? "s" : ""}  →  starts at 1.0×, peaks at 2.0×`,
      grade: r.qtyGrade,
      tip: r.qtyTip,
    },
    {
      icon: <Clock className="h-3.5 w-3.5 text-orange-400" />,
      label: "Time Pressure (at launch)",
      value: `${durationMinutes >= 60 ? `${Math.round(durationMinutes / 60)}h` : `${durationMinutes}m`} duration  →  starts at 1.0×, peaks at 2.0×`,
      grade: r.durGrade,
      tip: r.durTip,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-[#060c1a] border border-blue-800/60 rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        data-testid="score-report-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-bold text-base">AT Launch Score Report</h3>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white" data-testid="close-report">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#0a1020] border border-[#1a2030] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#555] mb-1 uppercase tracking-wider">At Launch</p>
            <p className="text-3xl font-black font-mono text-white">{initialScore.toFixed(1)}</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${launchZone.bg} ${launchZone.color}`}>
              {launchZone.label}
            </span>
          </div>
          <div className="bg-[#0a1020] border border-[#1a2030] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#555] mb-1 uppercase tracking-wider">Peak Potential</p>
            <p className="text-3xl font-black font-mono text-white">{peakScore.toFixed(1)}</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${peakZone.bg} ${peakZone.color}`}>
              {peakZone.label}
            </span>
          </div>
        </div>

        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl px-4 py-2.5 text-center mb-5">
          <span className="text-blue-200 font-mono text-[10px]">
            Score = Savings × TimePressure × Scarcity × PriceEase × 100
          </span>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-3 mb-5">
          {factors.map(({ icon, label, value, grade, tip }) => (
            <div key={label} className="bg-[#0a0f1e] border border-[#1a2030] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {icon}
                  <span className="text-xs font-semibold text-[#ccc]">{label}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${gradeBadgeBg(grade)}`}>
                  {gradeLabel(grade)}
                </span>
              </div>
              <p className="text-[10px] text-[#666] font-mono mb-2">{value}</p>
              <div className="flex items-start gap-1.5">
                {gradeIcon(grade)}
                <p className="text-[10px] text-[#aaa] leading-relaxed">{tip}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What to fix */}
        <div className="bg-[#0a0f1e] border border-blue-900/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
            <p className="text-xs font-semibold text-blue-300">Score Advice</p>
          </div>
          <p className="text-[10px] text-[#aaa] leading-relaxed mb-2">{r.target}</p>
          {r.targetTips.length > 0 && (
            <ul className="space-y-1">
              {r.targetTips.map((t) => (
                <li key={t} className="flex items-start gap-1.5 text-[10px] text-[#bbb]">
                  <span className="text-blue-400 mt-0.5">→</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[9px] text-[#444] mt-3">
            Time Pressure and Scarcity always start at 1.0× and climb to 2.0× as time expires and slots are claimed. Your At Launch score is determined entirely by Savings and Price Ease.
          </p>
        </div>
      </div>
    </div>
  );
}

function minToNow(m: number): Date {
  return new Date(Date.now() + m * 60 * 1000);
}

function toDateLocal(d: Date) {
  return d.toISOString().slice(0, 10);
}
function toTimeLocal(d: Date) {
  return d.toTimeString().slice(0, 5);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [artworkUrl, setArtworkUrl] = useState(existing?.artworkUrl ?? "");
  const [artworkUrlError, setArtworkUrlError] = useState("");

  const existingRetail = existing ? (existing.retailPriceCents / 100).toFixed(2) : "";
  const existingFlash = existing
    ? ((existing.retailPriceCents * (1 - existing.discountPercent / 100)) / 100).toFixed(2)
    : "";
  const [retailStr, setRetailStr] = useState(existingRetail);
  const [flashStr, setFlashStr] = useState(existingFlash);

  const [qty, setQty] = useState(existing?.quantity?.toString() ?? "10");

  const [durationMode, setDurationMode] = useState<"calendar" | "relative">("relative");
  const defaultEnd = minToNow(existing?.durationMinutes ?? 60);
  const [endDate, setEndDate] = useState(toDateLocal(defaultEnd));
  const [endTime, setEndTime] = useState(toTimeLocal(defaultEnd));
  const [durHours, setDurHours] = useState(existing ? Math.floor((existing.durationMinutes ?? 60) / 60).toString() : "1");
  const [durMins, setDurMins] = useState(existing ? ((existing.durationMinutes ?? 60) % 60).toString() : "0");

  const [displayMode, setDisplayMode] = useState<"countdown" | "slots">(
    (existing?.displayMode as "countdown" | "slots") ?? "countdown",
  );
  const [couponCode, setCouponCode] = useState(existing?.couponCode ?? "");
  const [couponExpiryHours, setCouponExpiryHours] = useState(
    existing?.couponExpiryHours?.toString() ?? "48",
  );
  const [showReport, setShowReport] = useState(false);

  const retailDollars = parseFloat(retailStr || "0");
  const flashDollars = parseFloat(flashStr || "0");
  const retailCents = Math.round(retailDollars * 100);
  const flashCents = Math.round(flashDollars * 100);
  const discountNum = retailCents > 0 && flashCents > 0 && flashCents < retailCents
    ? Math.round(((retailCents - flashCents) / retailCents) * 100)
    : 0;
  const qtyNum = parseInt(qty || "0");

  const durationMinutes = durationMode === "calendar"
    ? Math.max(5, Math.round((new Date(`${endDate}T${endTime}`).getTime() - Date.now()) / 60000))
    : (parseInt(durHours || "0") * 60) + parseInt(durMins || "0");

  const initialScore = computeGZScore(retailDollars, flashDollars, qtyNum, 0, durationMinutes, 0);
  const peakScore = computeGZScore(retailDollars, flashDollars, qtyNum, qtyNum - 1, durationMinutes, durationMinutes - 1);
  const heatZone = initialScore > 0 ? getHeatZone(initialScore) : null;
  const peakZone = peakScore > 0 ? getHeatZone(peakScore) : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setArtworkUrl(url);
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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
    if (!flashCents || flashCents < 1) return toast({ title: "Enter a valid flash price", variant: "destructive" });
    if (flashCents >= retailCents) return toast({ title: "Flash price must be below retail price", variant: "destructive" });
    if (!discountNum || discountNum < 1) return toast({ title: "Discount must be at least 1%", variant: "destructive" });
    if (!qtyNum || qtyNum < 1) return toast({ title: "Quantity must be at least 1", variant: "destructive" });
    if (!durationMinutes || durationMinutes < 5) return toast({ title: "Duration must be at least 5 minutes", variant: "destructive" });
    saveMutation.mutate({
      title: title.trim(),
      artworkUrl: artworkUrl.trim() || null,
      retailPriceCents: retailCents,
      discountPercent: discountNum,
      quantity: qtyNum,
      durationMinutes,
      displayMode,
      couponCode: couponCode.trim() || null,
      couponExpiryHours: parseInt(couponExpiryHours || "48"),
    });
  };

  return (
    <>
    <ScoreReportModal
      open={showReport}
      onClose={() => setShowReport(false)}
      retailDollars={retailDollars}
      flashDollars={flashDollars}
      discountNum={discountNum}
      qtyNum={qtyNum}
      durationMinutes={durationMinutes}
      initialScore={initialScore}
      peakScore={peakScore}
    />
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

      <div className="grid gap-5">

        {/* Title */}
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

        {/* Image Upload */}
        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Ad Image</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            data-testid="input-flash-file"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 px-3 border border-blue-800/50 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs"
              data-testid="btn-upload-image"
            >
              {uploading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {uploading ? "Uploading…" : "Upload Image"}
            </Button>
            <Input
              value={artworkUrl}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("file://") || val.startsWith("blob:")) {
                  setArtworkUrlError("Local file paths can't be used as image URLs. Use the Upload Image button instead.");
                  setArtworkUrl("");
                } else {
                  setArtworkUrlError("");
                  setArtworkUrl(val);
                }
              }}
              placeholder="or paste image URL"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-xs flex-1"
              data-testid="input-flash-artwork"
            />
          </div>
          {artworkUrlError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-start gap-1">
              <span className="shrink-0 mt-0.5">⚠</span>
              {artworkUrlError}
            </p>
          )}
          {artworkUrl && !artworkUrlError && (
            <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-blue-900/40 bg-[#0a1020]">
              <img
                src={artworkUrl}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  setArtworkUrlError("This URL couldn't be loaded as an image. Try uploading the file instead.");
                }}
              />
              <button
                onClick={() => { setArtworkUrl(""); setArtworkUrlError(""); }}
                className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-0.5 text-[#888] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {!artworkUrl && (
            <div
              className="mt-2 h-20 rounded-xl border border-dashed border-[#1e1e1e] flex items-center justify-center cursor-pointer hover:border-blue-800/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-2 text-[#444] text-xs">
                <ImageIcon className="h-4 w-4" />
                <span>Click to add banner image (300×168px ideal)</span>
              </div>
            </div>
          )}
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Retail Price ($) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={retailStr}
              onChange={(e) => setRetailStr(e.target.value)}
              placeholder="29.99"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
              data-testid="input-flash-retail"
            />
          </div>
          <div>
            <Label className="text-[#aaa] text-xs mb-1.5 block">Flash Sale Price ($) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={flashStr}
              onChange={(e) => setFlashStr(e.target.value)}
              placeholder="14.99"
              className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
              data-testid="input-flash-price"
            />
          </div>
        </div>

        {discountNum > 0 && (
          <div className="flex items-center gap-2 text-xs -mt-2">
            <span className="text-[#666] line-through">${retailStr}</span>
            <span className="text-green-400 font-bold text-sm">→ ${flashStr}</span>
            <span className="bg-green-900/30 border border-green-700/40 text-green-400 rounded px-1.5 py-0.5 font-bold">
              {discountNum}% OFF
            </span>
          </div>
        )}

        {/* Quantity */}
        <div>
          <Label className="text-[#aaa] text-xs mb-1.5 block">Number of Offers (slots) *</Label>
          <Input
            type="number"
            min="1"
            max="9999"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="10"
            className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm"
            data-testid="input-flash-qty"
          />
        </div>

        {/* Duration */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label className="text-[#aaa] text-xs">Duration *</Label>
            <div className="flex gap-1 ml-auto">
              <button
                type="button"
                onClick={() => setDurationMode("calendar")}
                className={`text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-colors ${
                  durationMode === "calendar"
                    ? "bg-blue-900/40 border-blue-700/50 text-blue-300"
                    : "bg-[#0a1020] border-[#222] text-[#555] hover:text-[#888]"
                }`}
                data-testid="btn-duration-calendar"
              >
                <Calendar className="h-2.5 w-2.5" /> Pick date & time
              </button>
              <button
                type="button"
                onClick={() => setDurationMode("relative")}
                className={`text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-colors ${
                  durationMode === "relative"
                    ? "bg-blue-900/40 border-blue-700/50 text-blue-300"
                    : "bg-[#0a1020] border-[#222] text-[#555] hover:text-[#888]"
                }`}
                data-testid="btn-duration-relative"
              >
                <Clock className="h-2.5 w-2.5" /> From now
              </button>
            </div>
          </div>

          {durationMode === "calendar" ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[#555] text-[10px] mb-1 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={toDateLocal(new Date())}
                  className="bg-[#0a1020] border-blue-900/50 text-white text-sm [color-scheme:dark]"
                  data-testid="input-flash-enddate"
                />
              </div>
              <div>
                <Label className="text-[#555] text-[10px] mb-1 block">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-[#0a1020] border-blue-900/50 text-white text-sm [color-scheme:dark]"
                  data-testid="input-flash-endtime"
                />
              </div>
              {durationMinutes > 0 && (
                <div className="col-span-2 text-[10px] text-[#555]">
                  Duration: <span className="text-blue-400">{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</span> from now
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={durHours}
                  onChange={(e) => setDurHours(e.target.value)}
                  placeholder="0"
                  className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full"
                  data-testid="input-flash-hours"
                />
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={durMins}
                  onChange={(e) => setDurMins(e.target.value)}
                  placeholder="30"
                  className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-full"
                  data-testid="input-flash-mins"
                />
              </div>
              <p className="text-[#444] text-[10px] mt-0.5">hours / minutes from now</p>
            </div>
          )}
        </div>

        {/* Display Mode toggle */}
        <div>
          <Label className="text-[#aaa] text-xs mb-2 block">Ad Display Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDisplayMode("countdown")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors ${
                displayMode === "countdown"
                  ? "bg-blue-900/30 border-blue-700/60 text-blue-200"
                  : "bg-[#0a0f1e] border-[#1a2030] text-[#555] hover:border-[#2a3040]"
              }`}
              data-testid="btn-mode-countdown"
            >
              <Timer className="h-4 w-4" />
              <span className="font-semibold">Countdown Clock</span>
              <span className="text-[9px] opacity-70 text-center">Shows live timer — drives time urgency</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("slots")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors ${
                displayMode === "slots"
                  ? "bg-blue-900/30 border-blue-700/60 text-blue-200"
                  : "bg-[#0a0f1e] border-[#1a2030] text-[#555] hover:border-[#2a3040]"
              }`}
              data-testid="btn-mode-slots"
            >
              <Hash className="h-4 w-4" />
              <span className="font-semibold">Number of Offers</span>
              <span className="text-[9px] opacity-70 text-center">Shows slots remaining — drives scarcity</span>
            </button>
          </div>
        </div>

        {/* Coupon Code */}
        <div className="rounded-xl border border-blue-900/40 bg-blue-950/10 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Tag className="h-3.5 w-3.5 text-blue-400" />
            <Label className="text-xs font-semibold text-blue-300">Coupon Code (optional)</Label>
          </div>
          <p className="text-[10px] text-[#555] -mt-1 leading-relaxed">
            When a buyer claims this offer, they'll enter their email and receive this code instantly — along with a liability disclosure. They'll also be added to your mailing list.
          </p>
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="e.g. FLASH50 or SUMMER2026"
            maxLength={60}
            className="bg-[#0a1020] border-blue-900/50 text-blue-200 placeholder-[#444] text-sm font-mono tracking-widest"
            data-testid="input-coupon-code"
          />
          {couponCode.trim() && (
            <div>
              <Label className="text-[#aaa] text-xs mb-1.5 block">Coupon Valid For (hours after claim)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="720"
                  value={couponExpiryHours}
                  onChange={(e) => setCouponExpiryHours(e.target.value)}
                  className="bg-[#0a1020] border-blue-900/50 text-white placeholder-[#444] text-sm w-28"
                  data-testid="input-coupon-expiry"
                />
                <span className="text-[#555] text-xs">
                  {parseInt(couponExpiryHours || "0") >= 24
                    ? `${Math.round(parseInt(couponExpiryHours || "0") / 24)} day(s)`
                    : `${couponExpiryHours} hour(s)`} after claiming
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Score Preview */}
        {initialScore > 0 && (
          <div className="bg-[#060c1a] border border-blue-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-[#777] uppercase tracking-wider font-semibold">GZFlash Score Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-200 border border-blue-800/50 hover:border-blue-600/60 rounded-lg px-2 py-1 transition-colors"
                data-testid="btn-explain-report"
              >
                <FileText className="h-3 w-3" />
                Explain Report
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a1020] border border-[#1a2030] rounded-xl p-3">
                <p className="text-[10px] text-[#555] mb-1">At Launch</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white">{initialScore.toFixed(1)}</span>
                  {heatZone && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${heatZone.bg} ${heatZone.color}`}>
                      {heatZone.label}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#111] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${initialScore}%` }}
                  />
                </div>
              </div>
              <div className="bg-[#0a1020] border border-[#1a2030] rounded-xl p-3">
                <p className="text-[10px] text-[#555] mb-1">At Peak (near expiry)</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white">{peakScore.toFixed(1)}</span>
                  {peakZone && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${peakZone.bg} ${peakZone.color}`}>
                      {peakZone.label}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#111] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{ width: `${peakScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center">
              {[
                { label: "Savings", val: retailDollars > 0 && flashDollars > 0 ? `${discountNum}%` : "–", color: "text-green-400" },
                { label: "Price Ease", val: flashDollars > 0 ? (1 / (1 + flashDollars / COMFORT_DOLLARS)).toFixed(3) : "–", color: "text-blue-400" },
                { label: "Time×", val: "1.0→2.0", color: "text-orange-400" },
                { label: "Scarcity×", val: "1.0→2.0", color: "text-purple-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-[#060a14] border border-[#1a2030] rounded-lg py-1.5 px-1">
                  <p className="text-[#444] mb-0.5">{label}</p>
                  <p className={`font-mono font-bold ${color}`}>{val}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[#444]">
              Gigzito feeds your inputs into the formula live — your score shifts every 60s as time and slots change.
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 text-sm"
          data-testid="btn-launch-flash"
        >
          {saveMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {existing ? "Save Changes" : "Launch GZFlash"}
        </Button>
      </div>
    </div>
    </>
  );
}
