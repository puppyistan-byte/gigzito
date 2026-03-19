import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Play, Zap, MapPin, BarChart3, CreditCard, Users, Star,
  ChevronDown, Send, CheckCircle, Tv, Video, TrendingUp, Globe,
  Shield, Sparkles, Trophy, Gift
} from "lucide-react";

const TIERS = [
  {
    name: "GZLurker",
    price: "Free",
    color: "#9ca3af",
    badge: "bg-gray-500/20 text-gray-300 border-gray-600",
    ring: "ring-gray-600",
    perks: [
      "Access to the full video feed",
      "GeeZee Card (digital identity)",
      "Flash coupons & member-only offers",
      "Geo-push deal notifications",
      "ZitoTV live content access",
      "GigJack event discovery",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "GZMarketer",
    price: "$12/mo",
    color: "#3b82f6",
    badge: "bg-blue-500/20 text-blue-300 border-blue-600",
    ring: "ring-blue-600",
    perks: [
      "Everything in GZLurker",
      "Post video listings to the feed",
      "Audience Aggregator (email list building)",
      "Broadcast to your audience",
      "GZMetrics engagement analytics",
      "GeeZee Rolodex profile listing",
    ],
    cta: "Go Marketer",
    highlight: false,
  },
  {
    name: "GZMarketerPro",
    price: "$15/mo",
    color: "#a855f7",
    badge: "bg-purple-500/20 text-purple-300 border-purple-600",
    ring: "ring-purple-600",
    perks: [
      "Everything in GZMarketer",
      "GigJack Flash Events (live bookings)",
      "All Eyes On Me broadcast slots",
      "ZitoTV presenter access",
      "Priority feed placement",
      "Advanced campaign analytics",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "GZBusiness",
    price: "$25/mo",
    color: "#f59e0b",
    badge: "bg-amber-500/20 text-amber-300 border-amber-600",
    ring: "ring-amber-500",
    perks: [
      "Everything in GZMarketerPro",
      "GZFlash Ad Center (flash sales)",
      "Geo Push Campaigns (location targeting)",
      "Preemptive Marketing automation",
      "Sponsor ad placements",
      "Dedicated business profile + admin tools",
    ],
    cta: "Go Business",
    highlight: false,
  },
];

const FEATURES = [
  {
    icon: Video,
    color: "#ff2b2b",
    title: "The Video Feed",
    subtitle: "Your Open Stage",
    body: "A TikTok-style vertical feed where creators, entrepreneurs, entertainers, and everyday users share short-form video content designed for maximum visibility. Every voice gets a stage. Every scroll is a discovery.",
  },
  {
    icon: Tv,
    color: "#3b82f6",
    title: "Zito TV",
    subtitle: "Live Broadcasting Layer",
    body: "Go live directly or relay broadcasts from other platforms to earn double exposure. Gigzito captures your engagement metrics either way — giving you insights no external platform will share.",
  },
  {
    icon: CreditCard,
    color: "#a855f7",
    title: "GeeZee Cards",
    subtitle: "Digital Identity + Consumer Power",
    body: "Your personal intro card, creator profile, and consumer advantage card all in one. Get discovered in the GeeZee Rolodex and receive member-only flash coupons, geo-triggered alerts, and exclusive offers directly to your phone.",
  },
  {
    icon: Zap,
    color: "#f59e0b",
    title: "GigJack Flash Events",
    subtitle: "Real-Time Booking & Deals",
    body: "Flash-duration live events where creators and businesses offer time-sensitive deals, bookings, or experiences. Scarcity drives urgency. Every second counts.",
  },
  {
    icon: TrendingUp,
    color: "#ff2b2b",
    title: "GZFlash Ad Center",
    subtitle: "Business Advertising Engine",
    body: "Create flash promotions with a built-in potency score system. The formula factors in savings, scarcity, time pressure, and price ease — automatically ranking your offer HOT, TRENDING, ACTIVE, or COOL in real time.",
  },
  {
    icon: MapPin,
    color: "#22c55e",
    title: "Geo Push Campaigns",
    subtitle: "Location-Triggered Marketing",
    body: "Register your business location and fire promotions the moment a Gigzito member walks nearby. Turn everyday foot traffic into customers with hyper-targeted, location-aware notifications.",
  },
  {
    icon: BarChart3,
    color: "#3b82f6",
    title: "GZMetrics",
    subtitle: "Engagement Intelligence",
    body: "Track watch time, returning viewers, audience demographics, CTA interactions, and campaign performance — even when your content is amplified from another platform. Real intelligence, not vanity metrics.",
  },
  {
    icon: Users,
    color: "#a855f7",
    title: "Audience Aggregator",
    subtitle: "Your List, Your Power",
    body: "Build your own subscriber list inside the ecosystem. Broadcast directly to your audience with messages, offers, and content updates. No algorithm gatekeeping — direct access to the people who follow you.",
  },
];

export default function InviteLandingPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    senderName: "",
    senderEmail: "",
    targetName: "",
    targetEmail: "",
  });
  const [sent, setSent] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/invite/send", data);
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "Invitation sent!", description: `Your invite is on its way to ${form.targetEmail}.` });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to send", description: err.message ?? "Please try again." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.senderName.trim() || !form.senderEmail.trim() || !form.targetName.trim() || !form.targetEmail.trim()) {
      toast({ variant: "destructive", title: "All fields required", description: "Please fill in every field before sending." });
      return;
    }
    inviteMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse at center, #ff2b2b 0%, transparent 70%)" }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium tracking-wide">You've been personally invited</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
            The Ecosystem That<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #ff2b2b 0%, #ff6b35 50%, #f59e0b 100%)" }}>
              Gives You an Unfair Advantage
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Gigzito is the first platform where <strong className="text-white">creators, consumers, and businesses</strong> grow together inside a single connected ecosystem — where visibility meets identity meets opportunity.
          </p>
          <p className="text-gray-500 text-base mb-12 max-w-xl mx-auto">
            TikTok-style video discovery · Live broadcasting · Flash deals · Geo-push marketing · Digital identity cards · Real-time analytics
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href="#invite-form"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-full text-base transition-colors">
              <Gift className="w-5 h-5" />
              Claim Your Invitation
            </a>
            <a href="#tiers"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full text-base transition-colors">
              See the Tiers
            </a>
          </div>
          <a href="#ecosystem" className="inline-flex flex-col items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors animate-bounce">
            <span className="text-xs tracking-widest uppercase">Explore</span>
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* ── TAGLINE BANNER ── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-8 px-6 text-center">
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          <span className="text-white font-semibold">Digital engagement should translate directly into real-world opportunity.</span>
          <span className="text-gray-500 ml-2">— The Gigzito Principle</span>
        </p>
      </div>

      {/* ── ECOSYSTEM OVERVIEW ── */}
      <section id="ecosystem" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-red-500 text-sm font-semibold uppercase tracking-widest mb-3">The Ecosystem</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Eight Systems. One Platform.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every component of Gigzito is designed to feed every other — a symbiotic engine where participation drives opportunity and opportunity drives more engagement.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-7 transition-all hover:bg-white/[0.05]">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.color}20`, border: `1px solid ${f.color}40` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: f.color }}>{f.subtitle}</p>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SYMBIOTIC MODEL ── */}
      <section className="py-20 px-6 border-y border-white/5 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Built So Everyone Wins</h2>
          <p className="text-gray-400 text-lg mb-16 max-w-2xl mx-auto">
            The ecosystem is intentionally designed so that every participant's success feeds someone else's growth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Video, color: "#ff2b2b", who: "Creators", get: "Gain visibility through video, live broadcasting, and GeeZee profile discovery. Earn analytics even when content originates on other platforms." },
              { icon: Gift, color: "#f59e0b", who: "Members", get: "Get access to exclusive deals, flash coupons, geo-triggered offers, and member-only promotions that don't exist anywhere else." },
              { icon: TrendingUp, color: "#22c55e", who: "Businesses", get: "Reach a socially engaged, location-aware audience with flash sales, geo push campaigns, and sponsor placements that convert attention into customers." },
            ].map((item) => (
              <div key={item.who} className="bg-white/[0.03] border border-white/5 rounded-2xl p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: item.color }}>{item.who}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.get}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section id="tiers" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-3">Membership Tiers</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Choose Your Level</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Start free and scale up as you grow. Every tier gives you more of the ecosystem — no contracts, cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {TIERS.map((tier) => (
              <div key={tier.name}
                className={`relative bg-white/[0.03] border rounded-2xl p-6 flex flex-col transition-all ${tier.highlight ? "ring-2 ring-purple-500 border-purple-500/40" : "border-white/10"}`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className={`inline-flex self-start items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mb-4 ${tier.badge}`}>
                  <Shield className="w-3 h-3" />
                  {tier.name}
                </div>
                <div className="mb-5">
                  <span className="text-3xl font-black" style={{ color: tier.color }}>{tier.price}</span>
                  {tier.price !== "Free" && <span className="text-gray-500 text-sm ml-1">per month</span>}
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tier.color }} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a href="#invite-form"
                  className="block text-center font-bold py-3 rounded-xl text-sm transition-all"
                  style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}>
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "8", unit: "Systems", label: "working in concert" },
            { value: "4", unit: "Tiers", label: "from free to enterprise" },
            { value: "∞", unit: "Reach", label: "geo + video + live" },
            { value: "1", unit: "Platform", label: "for everyone" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-black text-red-500 mb-1">{stat.value}<span className="text-xl text-white ml-1">{stat.unit}</span></div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GEO PUSH CALLOUT ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row gap-10 items-center">
            <div className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center bg-green-500/20 border border-green-500/30">
              <MapPin className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-2">Geo Push Technology</p>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Your Pocket Finds Deals Before You Do</h3>
              <p className="text-gray-400 leading-relaxed">
                When a Gigzito member walks near a participating business, the platform fires a real-time notification with an exclusive offer. For businesses, this turns foot traffic into customers. For members, it turns every walk into a potential windfall. No other platform does this at this level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── GIGJACK CALLOUT ── */}
      <section className="py-4 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row gap-10 items-center">
            <div className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
              <Zap className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2">GigJack Flash Events</p>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Scarcity Is the Product</h3>
              <p className="text-gray-400 leading-relaxed">
                GigJack events are time-locked, seat-limited flash experiences — live bookings, skill sessions, creator hangouts, and business offers that exist only for a window of time. The moment passes. The deal expires. The community that moves fast wins. Everything else is just noise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INVITE FORM ── */}
      <section id="invite-form" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-red-950/10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-5 py-2 mb-6">
              <Trophy className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">The Gift That Keeps Giving</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Invite Someone<br />
              <span className="text-red-500">Into the Ecosystem</span>
            </h2>
            <p className="text-gray-400 text-lg">
              This page is your invitation card. Share the platform with a friend, a business, or a creator who deserves a seat at the table. Fill in your name and theirs — we'll send them a personalized welcome from you.
            </p>
          </div>

          {sent ? (
            <div className="text-center py-16 bg-white/[0.03] border border-green-500/30 rounded-3xl">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-5" />
              <h3 className="text-2xl font-black text-white mb-3">Invitation Sent!</h3>
              <p className="text-gray-400 mb-2">Your invitation is on its way to <strong className="text-white">{form.targetEmail}</strong>.</p>
              <p className="text-gray-500 text-sm">They'll receive a personalized email from you explaining the full Gigzito ecosystem and how to join.</p>
              <button onClick={() => { setSent(false); setForm({ senderName: "", senderEmail: "", targetName: "", targetEmail: "" }); }}
                className="mt-8 text-sm text-red-400 hover:text-red-300 underline transition-colors">
                Send another invitation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}
              className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6">

              <div className="pb-5 border-b border-white/5">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm mb-4">
                  <Globe className="w-4 h-4" />
                  <span className="font-medium text-white">Your Details</span>
                  <span className="text-gray-600">— so they know who sent this</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-widest mb-1.5 block" htmlFor="sender-name">Your Name</Label>
                    <Input
                      id="sender-name"
                      data-testid="input-sender-name"
                      placeholder="Jane Smith"
                      value={form.senderName}
                      onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-widest mb-1.5 block" htmlFor="sender-email">Your Email</Label>
                    <Input
                      id="sender-email"
                      data-testid="input-sender-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={form.senderEmail}
                      onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm mb-4">
                  <Send className="w-4 h-4" />
                  <span className="font-medium text-white">Their Details</span>
                  <span className="text-gray-600">— who you're inviting</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-widest mb-1.5 block" htmlFor="target-name">Their Name</Label>
                    <Input
                      id="target-name"
                      data-testid="input-target-name"
                      placeholder="Alex Johnson"
                      value={form.targetName}
                      onChange={(e) => setForm((f) => ({ ...f, targetName: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs uppercase tracking-widest mb-1.5 block" htmlFor="target-email">Their Email</Label>
                    <Input
                      id="target-email"
                      data-testid="input-target-email"
                      type="email"
                      placeholder="alex@theirbusiness.com"
                      value={form.targetEmail}
                      onChange={(e) => setForm((f) => ({ ...f, targetEmail: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-red-500/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="button-send-invite"
                disabled={inviteMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
              >
                {inviteMutation.isPending ? (
                  <span className="animate-pulse">Sending invitation...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send the Invitation
                  </>
                )}
              </Button>

              <p className="text-center text-gray-600 text-xs">
                Sent as Gigzito Marketing · Their email address is not shared or stored beyond delivery · One invitation per submit
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-12 px-6 text-center">
        <p className="text-gray-500 text-sm mb-1">
          Gigzito — Social Commerce & Business Intelligence Platform
        </p>
        <p className="text-gray-700 text-xs">
          gigzito.com · When visibility, identity, and opportunity exist in the same environment, everyone grows.
        </p>
      </footer>
    </div>
  );
}
