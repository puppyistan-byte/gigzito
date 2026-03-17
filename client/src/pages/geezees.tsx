import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User, QrCode, Heart, SlidersHorizontal, X, CreditCard,
  Sparkles, MessageSquare, UserPlus, UserMinus, Loader2, ArrowLeft,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiFacebook, SiX, SiDiscord, SiYoutube } from "react-icons/si";
import type { GignessCard } from "@shared/schema";

const TIER_META: Record<string, { label: string; color: string; border: string }> = {
  GZLurker:     { label: "GZ Lurker",      color: "text-zinc-400",   border: "border-zinc-700" },
  GZMarketer:   { label: "GZMarketer",     color: "text-blue-400",   border: "border-blue-700" },
  GZMarketerPro:{ label: "GZMarketerPro",  color: "text-purple-400", border: "border-purple-700" },
  GZBusiness:   { label: "GZBusiness",     color: "text-amber-400",  border: "border-amber-600" },
};

const AGE_OPTIONS  = ["18-25", "25-40", "40+"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const INTENT_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "social",    label: "Social" },
  { value: "activity",  label: "Activity" },
];

// ── GeeZee Card tile ───────────────────────────────────────────────────────
function GeeZeeCard({ card, myTier, isAuthed }: { card: GignessCard; myTier: string; isAuthed: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const cardTier = TIER_META[(card as any).userTier ?? "GZLurker"] ?? TIER_META.GZLurker;
  const canEngage = isAuthed;
  const cardUserId = card.userId;

  const engageMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/gigness-cards/${card.id}/engage`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards"] });
      toast({ title: "❤️ Engaged!", description: "Your vibe landed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not engage. Try again.", variant: "destructive" });
    },
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: ["/api/geezee-follows/status", cardUserId],
    queryFn: () => fetch(`/api/geezee-follows/status/${cardUserId}`).then((r) => r.json()),
    enabled: isAuthed && !!cardUserId,
  });

  const followMutation = useMutation({
    mutationFn: () => followStatus?.following
      ? apiRequest("DELETE", `/api/geezee-follows/${cardUserId}`, {})
      : apiRequest("POST", `/api/geezee-follows/${cardUserId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/geezee-follows/status", cardUserId] });
      qc.invalidateQueries({ queryKey: ["/api/zee-motions/feed"] });
      toast({
        title: followStatus?.following ? "Unfollowed" : "✅ Following!",
        description: followStatus?.following ? "You unfollowed this GeeZee card." : "Their ZeeMotions will appear in your feed.",
      });
    },
    onError: () => toast({ title: "Error", description: "Could not update follow status.", variant: "destructive" }),
  });

  return (
    <div
      className="rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-all overflow-hidden flex flex-col"
      style={{ width: 300, minWidth: 300 }}
      data-testid={`card-geezee-${card.id}`}
    >
      {/* Thin gradient stripe */}
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />

      {/* Card body — click anywhere in header area to view profile */}
      <Link href={`/geezee/${card.userId}`}>
        <div className="flex items-center gap-3 px-3 pt-3 pb-2 cursor-pointer group" data-testid={`link-geezee-profile-${card.id}`}>
          {card.profilePic ? (
            <img
              src={card.profilePic}
              alt="Profile"
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#222] group-hover:border-purple-700/60 transition-all"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#222] group-hover:border-purple-700/60 transition-all">
              <User className="h-5 w-5 text-[#444]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cardTier.color} ${cardTier.border} bg-transparent leading-none`}>
                {cardTier.label}
              </span>
              {card.intent && (
                <span className="text-[9px] text-[#555] bg-[#111] border border-[#222] rounded px-1.5 py-0.5 capitalize leading-none">
                  {card.intent}
                </span>
              )}
              {(card as any).username && (
                <span className="ml-auto text-[9px] font-mono text-purple-400/70 truncate max-w-[80px]">
                  @{(card as any).username}
                </span>
              )}
            </div>
            {card.slogan && (
              <p className="text-xs font-semibold text-white mt-1 leading-snug line-clamp-1 group-hover:text-purple-200 transition-colors">
                {card.slogan}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#555]">
              {card.ageBracket && <span>{card.ageBracket}</span>}
              {card.gender && <span>{card.gender}</span>}
              <span className="text-purple-500/60 group-hover:text-purple-400 transition-colors ml-auto">View →</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Social icons strip */}
      {(() => {
        const c = card as any;
        const links = [
          c.instagramUrl && { href: c.instagramUrl, Icon: SiInstagram, color: "hover:text-pink-400",   label: "Instagram" },
          c.tiktokUrl    && { href: c.tiktokUrl,    Icon: SiTiktok,    color: "hover:text-white",       label: "TikTok"    },
          c.youtubeUrl   && { href: c.youtubeUrl,   Icon: SiYoutube,   color: "hover:text-red-500",     label: "YouTube"   },
          c.facebookUrl  && { href: c.facebookUrl,  Icon: SiFacebook,  color: "hover:text-blue-400",    label: "Facebook"  },
          c.twitterUrl   && { href: c.twitterUrl,   Icon: SiX,         color: "hover:text-white",       label: "X"         },
          c.discordUrl   && { href: c.discordUrl,   Icon: SiDiscord,   color: "hover:text-indigo-400",  label: "Discord"   },
        ].filter(Boolean) as { href: string; Icon: any; color: string; label: string }[];
        if (!links.length) return null;
        return (
          <div className="flex items-center gap-2.5 px-3 pb-2">
            {links.map(({ href, Icon, color, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                onClick={(e) => e.stopPropagation()}
                className={`text-[#444] transition-colors ${color}`}
              >
                <Icon size={11} />
              </a>
            ))}
          </div>
        );
      })()}

      {/* Action bar */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 border-t border-[#141414]">
        {/* Stats */}
        <div className="flex items-center gap-2 text-[#555] text-[10px] mr-auto">
          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{card.engagementCount ?? 0}</span>
          <button
            onClick={() => navigate(`/geezee/${card.userId}`)}
            className="flex items-center gap-0.5 hover:text-purple-400 transition-colors"
            data-testid={`btn-comments-${card.id}`}
          >
            <MessageSquare className="h-3 w-3" />
          </button>
          <a
            href={`/qr/${card.qrUuid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#888] transition-colors"
            title="QR Card"
            data-testid={`btn-qr-${card.id}`}
          >
            <QrCode className="h-3 w-3" />
          </a>
        </div>

        {/* Action buttons */}
        {isAuthed ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className={`h-6 px-2 text-[10px] transition-all ${
                followStatus?.following
                  ? "border-purple-700/60 text-purple-300 hover:bg-purple-900/20"
                  : "border-[#2a2a2a] text-[#777] hover:bg-[#1a1a1a] hover:text-white"
              }`}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              data-testid={`btn-follow-${card.id}`}
            >
              {followMutation.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                : followStatus?.following ? <><UserMinus className="h-2.5 w-2.5 mr-0.5" />Following</>
                : <><UserPlus className="h-2.5 w-2.5 mr-0.5" />Follow</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] border-[#2a2a2a] text-[#777] hover:bg-[#1a1a1a] hover:text-white transition-all"
              onClick={() => engageMutation.mutate()}
              disabled={engageMutation.isPending}
              data-testid={`btn-engage-${card.id}`}
            >
              {engageMutation.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Heart className="h-2.5 w-2.5 mr-0.5" />Engage</>}
            </Button>
          </>
        ) : (
          <Link href={`/geezee/${card.userId}`}>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-purple-800/50 text-purple-300 hover:bg-purple-900/20 transition-all" data-testid={`btn-view-card-${card.id}`}>
              View Card
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GeezeesPage() {
  const { user: authData } = useAuth();
  const myTier = authData?.user?.subscriptionTier ?? "GZLurker";
  const isAuthed = !!authData;

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

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 0" }}>
        {/* Back to main */}
        <Link href="/">
          <button
            className="flex items-center gap-1.5 text-xs text-[#555] hover:text-purple-400 transition-colors mb-5"
            data-testid="btn-back-main"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Main Page
          </button>
        </Link>

        {/* Hero header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">GeeZees</h1>
            </div>
            <p className="text-sm text-[#555]">Browse the Gigness Card Rolodex — connect with real people</p>
          </div>
          <div className="flex items-center gap-2">
            {isAuthed ? (
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

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-[#555] mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>

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

        {/* Card row — horizontal scroll, business-card sized */}
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-72 shrink-0 h-64 rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CreditCard className="h-12 w-12 text-[#333] mb-4" />
            <p className="text-[#555] text-base font-semibold">No GeeZee Cards yet</p>
            <p className="text-[#444] text-sm mt-1">
              {hasFilters ? "Try adjusting your filters." : "Be the first to create a card!"}
            </p>
            {isAuthed && (
              <Link href="/card-editor">
                <Button size="sm" className="mt-5 bg-purple-700 hover:bg-purple-600 text-white text-xs" data-testid="btn-create-first-card">
                  Create My Card
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-6"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}
          >
            {cards.map((card) => (
              <div key={card.id} className="w-72 shrink-0">
                <GeeZeeCard card={card} myTier={myTier} isAuthed={isAuthed} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
