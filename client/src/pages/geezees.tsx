import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User, QrCode, Heart, SlidersHorizontal, X, CreditCard,
  Lock, ChevronRight, Sparkles,
} from "lucide-react";
import type { GignessCard } from "@shared/schema";

// ── Tier config ────────────────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; color: string; border: string }> = {
  GZLurker: { label: "GZ Lurker",  color: "text-zinc-400",  border: "border-zinc-700" },
  GZ2:      { label: "GZ2",        color: "text-blue-400",  border: "border-blue-700" },
  GZ_PLUS:  { label: "GZ+",        color: "text-purple-400", border: "border-purple-700" },
  GZ_PRO:   { label: "GZ PRO",     color: "text-amber-400", border: "border-amber-600" },
};

const AGE_OPTIONS  = ["18-25", "25-40", "40+"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const INTENT_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "social",    label: "Social" },
  { value: "activity",  label: "Activity" },
];

// ── GeeZee Card tile ───────────────────────────────────────────────────────
function GeeZeeCard({ card, myTier }: { card: GignessCard; myTier: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tier = TIER_META[myTier] ?? TIER_META.GZLurker;
  const cardTier = TIER_META[(card as any).userTier ?? "GZLurker"] ?? TIER_META.GZLurker;
  const canEngage = myTier !== "GZLurker";

  const engageMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/gigness-cards/${card.id}/engage`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards"] });
      toast({ title: "❤️ Engaged!", description: "Your vibe landed." });
    },
    onError: (err: any) => {
      if (err?.upgradeRequired) {
        toast({ title: "Upgrade Required", description: "Reach GZ2 to engage with cards.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Could not engage.", variant: "destructive" });
      }
    },
  });

  return (
    <div
      className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-all overflow-hidden flex flex-col"
      data-testid={`card-geezee-${card.id}`}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          {card.profilePic ? (
            <img
              src={card.profilePic}
              alt="Profile"
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#222]"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#222]">
              <User className="h-6 w-6 text-[#444]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cardTier.color} ${cardTier.border} bg-transparent`}>
                {cardTier.label}
              </span>
              {card.intent && (
                <span className="text-[10px] text-[#555] bg-[#111] border border-[#222] rounded px-1.5 py-0.5 capitalize">
                  {card.intent}
                </span>
              )}
            </div>
            {card.slogan && (
              <p className="text-sm font-semibold text-white mt-1.5 leading-snug line-clamp-2">
                {card.slogan}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#555]">
              {card.ageBracket && <span>{card.ageBracket}</span>}
              {card.gender && <span>{card.gender}</span>}
            </div>
          </div>
        </div>

        {/* Gallery strip */}
        {card.gallery && card.gallery.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {card.gallery.slice(0, 6).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Gallery ${i + 1}`}
                className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[#222]"
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-1.5 text-[#555]">
            <Heart className="h-3.5 w-3.5" />
            <span className="text-xs">{card.engagementCount ?? 0}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/qr/${card.qrUuid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#444] hover:text-[#777] transition-colors"
              title="QR Master Card"
              data-testid={`btn-qr-${card.id}`}
            >
              <QrCode className="h-4 w-4" />
            </a>
            {canEngage ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs border-[#333] text-white hover:bg-[#1a1a1a]"
                onClick={() => engageMutation.mutate()}
                disabled={engageMutation.isPending}
                data-testid={`btn-engage-${card.id}`}
              >
                <Heart className="h-3 w-3 mr-1" />
                Engage
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs border-[#2a2a2a] text-[#555] cursor-not-allowed"
                disabled
                title="Upgrade to GZ2 to engage"
                data-testid={`btn-engage-locked-${card.id}`}
              >
                <Lock className="h-3 w-3 mr-1" />
                GZ2
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GeezeesPage() {
  const { user: authData } = useAuth();
  const myTier = authData?.user?.subscriptionTier ?? "GZLurker";

  const [filterAge, setFilterAge]     = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterIntent, setFilterIntent] = useState("");

  const params = new URLSearchParams();
  if (filterAge)    params.set("ageBracket", filterAge);
  if (filterGender) params.set("gender", filterGender);
  if (filterIntent) params.set("intent", filterIntent);

  const { data: cards = [], isLoading } = useQuery<GignessCard[]>({
    queryKey: ["/api/gigness-cards", filterAge, filterGender, filterIntent],
    queryFn: () =>
      fetch(`/api/gigness-cards?${params.toString()}`).then((r) => r.json()),
  });

  const hasFilters = filterAge || filterGender || filterIntent;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff" }}>
      <Navbar />

      {/* Hero header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 0" }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">GeeZees</h1>
            </div>
            <p className="text-sm text-[#555]">Browse the Gigness Card Rolodex — connect with real people</p>
          </div>
          <div className="flex items-center gap-2">
            {authData ? (
              <Link href="/card-editor">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-4"
                  data-testid="btn-edit-my-card"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  My GeeZee Card
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="sm" variant="outline" className="border-[#333] text-[#aaa] text-xs h-8 px-4">
                  Sign in to create card
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* GZ2 Upgrade Banner for lurkers */}
        {authData && myTier === "GZLurker" && (
          <div className="rounded-xl bg-[#0f0a1a] border border-purple-900/40 p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-purple-400 shrink-0" />
              <p className="text-sm text-[#aaa]">
                You&apos;re a <span className="text-zinc-300 font-semibold">GZ Lurker</span> — upgrade to{" "}
                <span className="text-blue-400 font-semibold">GZ2</span> to engage with cards and send messages.
              </p>
            </div>
            <Link href="/advertise">
              <Button size="sm" className="bg-purple-700 hover:bg-purple-600 text-white text-xs h-7 px-3 shrink-0">
                Upgrade <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-[#555] mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>

          {/* Age bracket */}
          {AGE_OPTIONS.map((age) => (
            <button
              key={age}
              onClick={() => setFilterAge(filterAge === age ? "" : age)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                filterAge === age
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-transparent border-[#2a2a2a] text-[#777] hover:border-[#444]"
              }`}
              data-testid={`filter-age-${age}`}
            >
              {age}
            </button>
          ))}

          <div className="w-px h-4 bg-[#222] mx-1" />

          {/* Gender */}
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGender(filterGender === g ? "" : g)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                filterGender === g
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-transparent border-[#2a2a2a] text-[#777] hover:border-[#444]"
              }`}
              data-testid={`filter-gender-${g}`}
            >
              {g}
            </button>
          ))}

          <div className="w-px h-4 bg-[#222] mx-1" />

          {/* Intent */}
          {INTENT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterIntent(filterIntent === value ? "" : value)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                filterIntent === value
                  ? "bg-pink-600 border-pink-500 text-white"
                  : "bg-transparent border-[#2a2a2a] text-[#777] hover:border-[#444]"
              }`}
              data-testid={`filter-intent-${value}`}
            >
              {label}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={() => { setFilterAge(""); setFilterGender(""); setFilterIntent(""); }}
              className="text-xs px-2 py-1 text-[#666] hover:text-white transition-colors flex items-center gap-1"
              data-testid="btn-clear-filters"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Card grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CreditCard className="h-12 w-12 text-[#333] mb-4" />
            <p className="text-[#555] text-base font-semibold">No GeeZee Cards yet</p>
            <p className="text-[#444] text-sm mt-1">
              {hasFilters ? "Try adjusting your filters." : "Be the first to create a card!"}
            </p>
            {authData && (
              <Link href="/card-editor">
                <Button size="sm" className="mt-5 bg-purple-700 hover:bg-purple-600 text-white text-xs" data-testid="btn-create-first-card">
                  Create My Card
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
            {cards.map((card) => (
              <GeeZeeCard key={card.id} card={card} myTier={myTier} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
