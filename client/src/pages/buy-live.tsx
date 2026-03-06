import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Radio, Clock, Star, ArrowLeft, Check } from "lucide-react";

const PACKAGES = [
  {
    name: "1-Hour Live Slot",
    price: "$49",
    features: [
      "1 hour of live airtime on Gigzito",
      "Appears in Live Now feed",
      "Mini player visibility on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
    ],
    highlight: false,
  },
  {
    name: "3-Hour Live Slot",
    price: "$129",
    features: [
      "3 hours of live airtime on Gigzito",
      "Appears in Live Now feed",
      "Mini player visibility on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
      "Featured placement in Live Now",
    ],
    highlight: true,
  },
  {
    name: "Full Day Live Pass",
    price: "$299",
    features: [
      "Up to 8 hours of live airtime",
      "Appears in Live Now feed",
      "Mini player visibility on all feeds",
      "YouTube, Twitch, or direct stream",
      "Replay listing after broadcast",
      "Featured placement in Live Now",
      "Category front-page banner",
    ],
    highlight: false,
  },
];

export default function BuyLivePage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#555] hover:text-white transition-colors text-sm" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        {/* Hero */}
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 mb-2">
            <Radio className="w-7 h-7 text-[#ff2b2b]" />
          </div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-buy-live-heading">Buy a Live Show Slot</h1>
          <p className="text-[#666] text-sm max-w-md mx-auto">
            Purchase an airtime slot to go live on Gigzito. Your stream appears across all feeds and the Live Now section for the duration of your slot.
          </p>
        </div>

        {/* Packages */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-2xl p-5 space-y-4 border transition-all ${
                pkg.highlight
                  ? "bg-[#ff2b2b]/8 border-[#ff2b2b]/50 shadow-[0_0_30px_rgba(255,43,43,0.12)]"
                  : "bg-[#0b0b0b] border-[#1e1e1e]"
              }`}
              data-testid={`card-package-${pkg.name.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {pkg.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-[#ff2b2b] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    <Star className="w-2.5 h-2.5" /> Most Popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-[#888] text-xs font-semibold uppercase tracking-widest mb-1">{pkg.name}</p>
                <p className="text-3xl font-bold text-white">{pkg.price}</p>
                <p className="text-[#555] text-xs mt-0.5">one-time slot</p>
              </div>

              <ul className="space-y-2">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[#aaa] text-xs">
                    <Check className="w-3.5 h-3.5 text-[#ff2b2b] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-xl font-bold ${
                  pkg.highlight
                    ? "bg-[#ff2b2b] hover:bg-[#e01e1e] text-white"
                    : "bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a]"
                }`}
                data-testid={`button-buy-${pkg.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <Clock className="w-4 h-4 mr-2" />
                Book This Slot
              </Button>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 space-y-4">
          <h2 className="text-white font-bold text-sm">How it works</h2>
          <ol className="space-y-3">
            {[
              "Purchase your live slot and choose your time window.",
              "Receive a confirmation with your scheduled start time.",
              "At your scheduled time, go to /live/go and paste your stream URL (YouTube Live, Twitch, or direct).",
              "Your stream appears in the Live Now section and mini player across all feeds.",
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

      </div>
    </div>
  );
}
