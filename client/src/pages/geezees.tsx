import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User, QrCode, Heart, SlidersHorizontal, X, CreditCard,
  Sparkles, MessageSquare, Send,
  ChevronDown, ChevronUp, AlertCircle, Info, UserPlus, UserMinus, Loader2,
} from "lucide-react";
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

// ── Comments panel ──────────────────────────────────────────────────────────
function CommentsPanel({ card, isAuthed }: { card: GignessCard; isAuthed: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/gigness-cards/${card.id}/comments`],
    queryFn: () => fetch(`/api/gigness-cards/${card.id}/comments`).then((r) => r.json()),
  });

  const postMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/gigness-cards/${card.id}/comments`, { commentText: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/gigness-cards/${card.id}/comments`] });
      setText("");
      toast({ title: "Comment posted!" });
    },
    onError: (err: any) => {
      toast({ title: "Could not post", description: err?.message ?? "Try again.", variant: "destructive" });
    },
  });

  return (
    <div className="border-t border-[#1a1a1a] px-5 pb-5 pt-4 space-y-3">

      {/* Advisory banner */}
      <div className="flex items-start gap-2 rounded-lg bg-[#0f0f18] border border-purple-900/30 px-3 py-2">
        <Info className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-[#666] leading-relaxed">
          Contacting this user and accessing their CTAs requires{" "}
          <span className="text-purple-400 font-semibold">registration</span> on Gigzito and joining their{" "}
          <span className="text-purple-400 font-semibold">mailing list</span>. Comments are moderated by GZ-Bot.
        </p>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="text-xs text-[#444] animate-pulse">Loading comments…</div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[#444] italic">No comments yet — be the first.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-[#555]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#888]">{c.authorName}</span>
                  <span className="text-[9px] text-[#444]">
                    {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-[#ccc] leading-snug mt-0.5">{c.commentText}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post comment */}
      {isAuthed ? (
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Leave a comment… (GZ-Bot monitored)"
            maxLength={300}
            rows={2}
            className="flex-1 bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder-[#333] text-xs resize-none focus:border-purple-700/60"
            data-testid={`input-comment-${card.id}`}
          />
          <Button
            size="sm"
            onClick={() => text.trim() && postMutation.mutate()}
            disabled={!text.trim() || postMutation.isPending}
            className="h-9 px-3 bg-purple-700 hover:bg-purple-600 text-white shrink-0"
            data-testid={`btn-post-comment-${card.id}`}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Link href="/auth">
          <div className="flex items-center gap-2 rounded-lg bg-[#111] border border-[#1e1e1e] px-3 py-2 cursor-pointer hover:border-[#333] transition-colors">
            <AlertCircle className="h-3.5 w-3.5 text-[#444] shrink-0" />
            <p className="text-xs text-[#555]">
              <span className="text-purple-400 font-semibold underline">Sign in</span> to comment — registration required.
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

// ── GeeZee Card tile ───────────────────────────────────────────────────────
function GeeZeeCard({ card, myTier, isAuthed }: { card: GignessCard; myTier: string; isAuthed: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
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
      className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-all overflow-hidden flex flex-col"
      data-testid={`card-geezee-${card.id}`}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header — click to view full profile */}
        <Link href={`/geezee/${card.userId}`}>
          <div className="flex items-start gap-3 cursor-pointer group" data-testid={`link-geezee-profile-${card.id}`}>
            {card.profilePic ? (
              <img
                src={card.profilePic}
                alt="Profile"
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#222] group-hover:border-purple-700/60 transition-all"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#222] group-hover:border-purple-700/60 transition-all">
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
                <p className="text-sm font-semibold text-white mt-1.5 leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors">
                  {card.slogan}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-[#555]">
                {card.ageBracket && <span>{card.ageBracket}</span>}
                {card.gender && <span>{card.gender}</span>}
                <span className="text-purple-500/60 group-hover:text-purple-400 transition-colors">View profile →</span>
              </div>
            </div>
          </div>
        </Link>

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

        {/* Footer row 1 — stats + View Card */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-3 text-[#555]">
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span className="text-xs">{card.engagementCount ?? 0}</span>
            </div>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-[#555] hover:text-purple-400 transition-colors"
              data-testid={`btn-comments-${card.id}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">Comments</span>
              {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/qr/${card.qrUuid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#383838] hover:text-[#666] transition-colors"
              title="QR Master Card"
              data-testid={`btn-qr-${card.id}`}
            >
              <QrCode className="h-4 w-4" />
            </a>
            <Link href={`/geezee/${card.userId}`}>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs border-purple-800/50 text-purple-300 hover:bg-purple-900/20 hover:border-purple-700 transition-all"
                data-testid={`btn-view-card-${card.id}`}
              >
                View Card
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer row 2 — Follow + Engage (full width so nothing clips) */}
        {isAuthed && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 h-8 text-xs transition-all ${
                followStatus?.following
                  ? "border-purple-700/60 text-purple-300 hover:bg-purple-900/20"
                  : "border-[#2a2a2a] text-[#888] hover:bg-[#1a1a1a] hover:text-white"
              }`}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              data-testid={`btn-follow-${card.id}`}
            >
              {followMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : followStatus?.following ? (
                <><UserMinus className="h-3 w-3 mr-1" />Following</>
              ) : (
                <><UserPlus className="h-3 w-3 mr-1" />Follow</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs border-[#2a2a2a] text-[#888] hover:bg-[#1a1a1a] hover:text-white transition-all"
              onClick={() => engageMutation.mutate()}
              disabled={engageMutation.isPending}
              data-testid={`btn-engage-${card.id}`}
            >
              {engageMutation.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <><Heart className="h-3 w-3 mr-1" />Engage</>
              }
            </Button>
          </div>
        )}
      </div>

      {/* Comments panel — slides open */}
      {showComments && (
        <CommentsPanel card={card} isAuthed={isAuthed} />
      )}
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
            {isAuthed && (
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
              <GeeZeeCard key={card.id} card={card} myTier={myTier} isAuthed={isAuthed} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
