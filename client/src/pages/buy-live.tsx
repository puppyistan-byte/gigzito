import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Radio, Clock, Check, ArrowLeft, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { useState } from "react";

const TIERS = [
  {
    id: "tier1",
    label: "Starter Slot",
    duration: "15 Minutes",
    price: "$10",
    priceCents: 1000,
    features: [
      "15 minutes of live airtime",
      "Appears in Live Now feed",
      "Mini player on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
    ],
    highlight: false,
  },
  {
    id: "tier2",
    label: "Pro Slot",
    duration: "30 Minutes",
    price: "$20",
    priceCents: 2000,
    features: [
      "30 minutes of live airtime",
      "Appears in Live Now feed",
      "Mini player on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
      "Featured placement in Live Now",
    ],
    highlight: true,
  },
  {
    id: "tier3",
    label: "Power Slot",
    duration: "60 Minutes",
    price: "$25",
    priceCents: 2500,
    features: [
      "60 minutes of live airtime",
      "Appears in Live Now feed",
      "Mini player on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
      "Featured placement in Live Now",
      "Category front-page banner",
    ],
    highlight: false,
  },
];

export default function BuyLivePage() {
  const { user } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleBook = () => {
    if (!user) { setShowGuestModal(true); return; }
    // TODO: wire up payment
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        <Link href="/" className="inline-flex items-center gap-2 text-[#555] hover:text-white transition-colors text-sm" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        <div className="text-center space-y-3 py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 mb-2">
            <Radio className="w-7 h-7 text-[#ff2b2b]" />
          </div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-buy-live-heading">Buy a Live Show Slot</h1>
          <p className="text-[#666] text-sm max-w-md mx-auto">
            Purchase an airtime slot to broadcast live on Gigzito. Your stream appears in the Live Now section and mini player across all feeds.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-5 space-y-4 border transition-all ${
                tier.highlight
                  ? "bg-[#ff2b2b]/8 border-[#ff2b2b]/50 shadow-[0_0_30px_rgba(255,43,43,0.12)]"
                  : "bg-[#0b0b0b] border-[#1e1e1e]"
              }`}
              data-testid={`card-tier-${tier.id}`}
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
                <p className="text-[#555] text-xs mt-0.5">one-time slot</p>
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
                onClick={handleBook}
                className={`w-full rounded-xl font-bold ${
                  tier.highlight
                    ? "bg-[#ff2b2b] hover:bg-[#e01e1e] text-white"
                    : "bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a]"
                }`}
                data-testid={`button-book-${tier.id}`}
              >
                <Radio className="w-4 h-4 mr-2" />
                Book {tier.duration} Slot
              </Button>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 space-y-4">
          <h2 className="text-white font-bold text-sm">How it works</h2>
          <ol className="space-y-3">
            {[
              "Purchase your slot — choose 15, 30, or 60 minutes.",
              "Receive confirmation with your scheduled start time.",
              "At your scheduled time, go to /live/go and paste your stream URL (YouTube Live, Twitch, or direct).",
              "Your stream appears live in the Live Now section and mini player across all feeds for the duration of your slot.",
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
          Supports music performances, product demos, influencer streams, coaching sessions, corporate announcements, flash sales, and general broadcasts.
        </p>

      </div>

      {showGuestModal && <GuestCtaModal reason="general" onClose={() => setShowGuestModal(false)} />}
    </div>
  );
}
