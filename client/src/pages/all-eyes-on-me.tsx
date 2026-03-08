import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Eye, Clock, Check, Zap, Calendar, ChevronRight, Loader2 } from "lucide-react";
import type { ListingWithProvider, AllEyesSlotWithProvider } from "@shared/schema";

const TIERS = [
  {
    id: "tier1",
    label: "Spotlight",
    duration: "15 Minutes",
    durationMinutes: 15,
    price: "$10",
    priceCents: 1000,
    features: [
      "15 minutes of front-page featured placement",
      "ALL EYES ON ME banner on main feed",
      "Countdown timer visible to all users",
      "Your video or offer shown to the entire network",
    ],
    highlight: false,
  },
  {
    id: "tier2",
    label: "Power Spotlight",
    duration: "30 Minutes",
    durationMinutes: 30,
    price: "$20",
    priceCents: 2000,
    features: [
      "30 minutes of front-page featured placement",
      "ALL EYES ON ME banner on main feed",
      "Countdown timer visible to all users",
      "Your video or offer shown to the entire network",
      "Priority placement over regular listings",
    ],
    highlight: true,
  },
  {
    id: "tier3",
    label: "Full Hour",
    duration: "1 Hour",
    durationMinutes: 60,
    price: "$25",
    priceCents: 2500,
    features: [
      "60 minutes of front-page featured placement",
      "ALL EYES ON ME banner on main feed",
      "Countdown timer visible to all users",
      "Your video or offer shown to the entire network",
      "Priority placement over regular listings",
      "Maximum exposure for launches & promotions",
    ],
    highlight: false,
  },
];

function formatScheduleTime(slot: AllEyesSlotWithProvider): string {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  const now = new Date();
  const isActive = start <= now && end > now;
  if (isActive) {
    const remaining = Math.ceil((end.getTime() - now.getTime()) / 60000);
    return `LIVE NOW · ${remaining}m remaining`;
  }
  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AllEyesOnMePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [videoListingId, setVideoListingId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const { data: myListings = [] } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings/my"],
    enabled: !!user,
    queryFn: () => fetch("/api/listings/my").then(r => r.json()),
  });

  const { data: upcoming = [] } = useQuery<AllEyesSlotWithProvider[]>({
    queryKey: ["/api/all-eyes/upcoming"],
    refetchInterval: 30000,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/all-eyes/book", {
        durationMinutes: selectedTier!.durationMinutes,
        videoListingId: videoListingId ? parseInt(videoListingId) : undefined,
        customTitle: customTitle || undefined,
        startAt: new Date(startAt).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/all-eyes/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-eyes/active"] });
      toast({ title: "Slot booked!", description: "Your All Eyes On Me spotlight has been scheduled." });
      setSelectedTier(null);
      navigate("/");
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSelect = (tier: typeof TIERS[0]) => {
    if (!user) { setShowGuestModal(true); return; }
    setSelectedTier(tier);
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        <Link href="/" className="inline-flex items-center gap-2 text-[#555] hover:text-white transition-colors text-sm" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        {/* Hero */}
        <div className="text-center space-y-4 py-4">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-2xl bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 flex items-center justify-center">
              <Eye className="w-8 h-8 text-[#ff2b2b]" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2b2b] opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff2b2b]" />
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight" data-testid="text-all-eyes-heading">All Eyes On Me</h1>
            <p className="text-[#666] text-sm max-w-sm mx-auto mt-2 leading-relaxed">
              A featured spotlight placement on the Gigzito front page. When you purchase a slot, your content or offer is promoted directly on the main page so the entire network can see it.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#ff2b2b]/10 border border-[#ff2b2b]/25 rounded-full px-4 py-2 text-xs text-[#ff2b2b] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
            Designed for marketers, creators and businesses who want maximum attention
          </div>
        </div>

        {/* Tiers */}
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-5 space-y-4 border transition-all cursor-pointer ${
                tier.highlight
                  ? "bg-[#ff2b2b]/8 border-[#ff2b2b]/50 shadow-[0_0_30px_rgba(255,43,43,0.12)]"
                  : "bg-[#0b0b0b] border-[#1e1e1e] hover:border-[#ff2b2b]/30"
              }`}
              data-testid={`card-tier-${tier.id}`}
              onClick={() => handleSelect(tier)}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-[#ff2b2b] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    <Zap className="w-2.5 h-2.5" /> Best Value
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#ff2b2b]" />
                  <span className="text-[#ff2b2b] text-xs font-bold uppercase tracking-widest">{tier.duration}</span>
                </div>
                <p className="text-[#888] text-xs font-semibold uppercase tracking-widest mb-1">{tier.label}</p>
                <p className="text-3xl font-bold text-white">{tier.price}</p>
                <p className="text-[#555] text-xs mt-0.5">one-time spotlight</p>
              </div>
              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[#aaa] text-xs">
                    <Check className="w-3.5 h-3.5 text-[#ff2b2b] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={(e) => { e.stopPropagation(); handleSelect(tier); }}
                className={`w-full rounded-xl font-bold ${
                  tier.highlight
                    ? "bg-[#ff2b2b] hover:bg-[#e01e1e] text-white"
                    : "bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a]"
                }`}
                data-testid={`button-book-${tier.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Book {tier.duration}
              </Button>
            </div>
          ))}
        </div>

        {/* Booking form — shown after selecting a tier */}
        {selectedTier && user && (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#ff2b2b]/30 p-6 space-y-5" data-testid="booking-form">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-base">Book {selectedTier.duration} Spotlight</h2>
                <p className="text-[#555] text-xs mt-0.5">{selectedTier.price} · {selectedTier.label}</p>
              </div>
              <button onClick={() => setSelectedTier(null)} className="text-[#555] hover:text-white text-xs">✕ Cancel</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">Schedule Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff2b2b]"
                  data-testid="input-start-at"
                />
                <p className="text-xs text-[#444]">Your spotlight will run from the selected time for {selectedTier.duration}.</p>
              </div>

              {myListings.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[#aaa] text-sm">Feature a Video (optional)</Label>
                  <Select value={videoListingId} onValueChange={setVideoListingId}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white" data-testid="select-video-listing">
                      <SelectValue placeholder="Choose one of your listings…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#2a2a2a]">
                      <SelectItem value="" className="text-[#888]">No specific video — show my profile</SelectItem>
                      {myListings.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} className="text-white focus:bg-[#222]">
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">Custom spotlight message (optional)</Label>
                <Input
                  placeholder="e.g. 🔥 Flash sale — 50% off today only!"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={80}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                  data-testid="input-custom-title"
                />
              </div>
            </div>

            <Button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending || !startAt}
              className="w-full bg-[#ff2b2b] hover:bg-[#e01e1e] text-white font-bold rounded-xl h-12"
              data-testid="button-confirm-booking"
            >
              {bookMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Booking…</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" /> Confirm Spotlight · {selectedTier.price}</>
              )}
            </Button>
          </div>
        )}

        {/* Upcoming schedule */}
        {upcoming.length > 0 && (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-5 space-y-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#ff2b2b]" /> Upcoming Spotlights
            </h2>
            <div className="space-y-2">
              {upcoming.map((slot) => {
                const now = new Date();
                const isActive = new Date(slot.startAt) <= now && new Date(slot.endAt) > now;
                return (
                  <div key={slot.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? "bg-[#ff2b2b]/8 border-[#ff2b2b]/25" : "bg-[#111] border-[#1a1a1a]"}`} data-testid={`upcoming-slot-${slot.id}`}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "#222", flexShrink: 0 }}>
                      {slot.provider.avatarUrl ? (
                        <img src={slot.provider.avatarUrl} alt={slot.provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px" }}>
                          {slot.provider.displayName?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{slot.provider.displayName}</p>
                      <p className="text-[10px] text-[#555]">{formatScheduleTime(slot)}</p>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[#ff2b2b] text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
                        LIVE
                      </span>
                    )}
                    <span className="text-[#555] text-[10px] shrink-0">{slot.durationMinutes}m</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 space-y-4">
          <h2 className="text-white font-bold text-sm">How it works</h2>
          <ol className="space-y-3">
            {[
              "Select a spotlight duration — 15, 30, or 60 minutes.",
              "Choose a video or offer to feature, or spotlight your full profile.",
              "Pick your scheduled start time. The system prevents double-booking.",
              "At the scheduled time, an ALL EYES ON ME banner appears on the main feed for all visitors, showing your content with a live countdown timer.",
              "When your slot expires, your content returns to the normal feed.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[#888] text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#ff2b2b]/20 border border-[#ff2b2b]/30 flex items-center justify-center text-[#ff2b2b] font-bold text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center text-xs text-[#444]">
          All Eyes On Me is a premium front-page spotlight — perfect for product launches, flash sales, course debuts, and live event promotions.
        </p>

        <div className="flex justify-center">
          <Link href="/">
            <Button
              variant="outline"
              className="rounded-xl border-[#2a2a2a] bg-[#0b0b0b] text-[#aaa] hover:text-white hover:border-[#444] px-8"
              data-testid="button-return-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Main Page
            </Button>
          </Link>
        </div>

      </div>

      {showGuestModal && <GuestCtaModal reason="general" onClose={() => setShowGuestModal(false)} />}
    </div>
  );
}
