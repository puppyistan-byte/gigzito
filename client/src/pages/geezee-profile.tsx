import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Heart, UserPlus, UserMinus, Loader2, QrCode,
  MessageSquare, ChevronDown, ChevronUp, Send, ArrowLeft, ImageIcon,
} from "lucide-react";
import type { GignessCard, ZeeMotion, ZeeMotionComment } from "@shared/schema";

type EnrichedCard = GignessCard & { displayName: string | null; username: string | null; avatarUrl: string | null };

const TIER_META: Record<string, { label: string; color: string; border: string }> = {
  GZLurker: { label: "GZ Lurker",  color: "text-zinc-400",  border: "border-zinc-700" },
  GZ_PLUS:  { label: "GZ+",        color: "text-purple-400", border: "border-purple-700" },
  GZ_PRO:   { label: "GZ PRO",     color: "text-amber-400", border: "border-amber-600" },
};

function timeAgo(d: string | Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Comments on a single Geemotion ──────────────────────────────────────────
function GeemotionComments({ motionId, isAuthed, myDisplayName }: { motionId: number; isAuthed: boolean; myDisplayName: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<ZeeMotionComment[]>({
    queryKey: ["/api/zee-motions", motionId, "comments"],
    queryFn: () => fetch(`/api/zee-motions/${motionId}/comments`).then((r) => r.json()),
    enabled: open,
  });

  const postMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/zee-motions/${motionId}/comments`, { commentText: text.trim(), authorName: myDisplayName }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["/api/zee-motions", motionId, "comments"] });
      toast({ title: "Comment posted!" });
    },
    onError: () => toast({ title: "Error", description: "Could not post comment.", variant: "destructive" }),
  });

  return (
    <div className="mt-3 border-t border-[#1a1a1a] pt-3">
      <button
        className="flex items-center gap-1.5 text-xs text-[#555] hover:text-purple-400 transition-colors"
        onClick={() => setOpen(!open)}
        data-testid={`btn-toggle-comments-${motionId}`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{open ? "Hide" : "Comments"}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <Skeleton className="h-10 w-full bg-[#111] rounded" />
          ) : comments.length === 0 ? (
            <p className="text-xs text-[#444] italic">No comments yet. Be the first.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2" data-testid={`comment-${c.id}`}>
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-[#444]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-white">{c.authorName}</span>
                    <span className="text-[10px] text-[#444]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#bbb] leading-relaxed">{c.commentText}</p>
                </div>
              </div>
            ))
          )}

          <div className="flex gap-2 mt-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isAuthed ? "Add a comment…" : "Sign in to comment"}
              disabled={!isAuthed || postMutation.isPending}
              rows={2}
              maxLength={500}
              className="flex-1 text-xs bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] resize-none rounded-xl"
              data-testid={`input-comment-${motionId}`}
            />
            <Button
              size="sm"
              disabled={!isAuthed || !text.trim() || postMutation.isPending}
              onClick={() => postMutation.mutate()}
              className="self-end h-8 px-3 bg-purple-700 hover:bg-purple-600 text-white rounded-xl"
              data-testid={`btn-post-comment-${motionId}`}
            >
              {postMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single Geemotion ────────────────────────────────────────────────────────
function GeemotionCard({ motion, isAuthed, myDisplayName }: { motion: ZeeMotion; isAuthed: boolean; myDisplayName: string }) {
  return (
    <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid={`card-geemotion-${motion.id}`}>
      <p className="text-[10px] text-[#444] mb-2">{timeAgo(motion.createdAt)}</p>
      {motion.text && <p className="text-sm text-[#ddd] whitespace-pre-wrap leading-relaxed">{motion.text}</p>}
      {motion.mediaUrl && (
        <img
          src={motion.mediaUrl}
          alt="Geemotion media"
          className="mt-3 rounded-lg max-h-60 border border-[#222] object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <GeemotionComments motionId={motion.id} isAuthed={isAuthed} myDisplayName={myDisplayName} />
    </div>
  );
}

// ── Main profile page ────────────────────────────────────────────────────────
export default function GeeZeeProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = parseInt(userIdParam ?? "");
  const { user } = useAuth();
  const isAuthed = !!user;
  const myDisplayName = user?.profile?.displayName ?? user?.profile?.username ?? user?.user?.email?.split("@")[0] ?? "Guest";
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: card, isLoading: cardLoading } = useQuery<EnrichedCard>({
    queryKey: ["/api/gigness-cards/user", userId],
    queryFn: () => fetch(`/api/gigness-cards/user/${userId}`).then(async (r) => {
      if (!r.ok) throw new Error("Card not found");
      return r.json();
    }),
    enabled: !isNaN(userId),
    retry: false,
  });

  const { data: motions = [], isLoading: motionsLoading } = useQuery<ZeeMotion[]>({
    queryKey: ["/api/zee-motions/user", userId],
    queryFn: () => fetch(`/api/zee-motions/user/${userId}`).then((r) => r.json()),
    enabled: !isNaN(userId),
  });

  const { data: followStatus } = useQuery<{ following: boolean; followerCount: number }>({
    queryKey: ["/api/geezee-follows/status", userId],
    queryFn: () => fetch(`/api/geezee-follows/status/${userId}`).then((r) => r.json()),
    enabled: isAuthed && !isNaN(userId),
  });

  const followMutation = useMutation({
    mutationFn: () => followStatus?.following
      ? apiRequest("DELETE", `/api/geezee-follows/${userId}`, {})
      : apiRequest("POST", `/api/geezee-follows/${userId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/geezee-follows/status", userId] });
      qc.invalidateQueries({ queryKey: ["/api/zee-motions/feed"] });
      toast({
        title: followStatus?.following ? "Unfollowed" : "✅ Following!",
        description: followStatus?.following ? "You unfollowed this card." : "Their Geemotions will appear in your feed.",
      });
    },
    onError: () => toast({ title: "Error", description: "Could not update follow.", variant: "destructive" }),
  });

  const cardTier = TIER_META[(card as any)?.userTier ?? "GZLurker"] ?? TIER_META.GZLurker;

  if (isNaN(userId)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#555] text-sm">Invalid card URL.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-4">

        {/* Back */}
        <Link href="/geezees">
          <button className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors" data-testid="btn-back-geezees">
            <ArrowLeft className="h-3.5 w-3.5" />
            GeeZee Rolodex
          </button>
        </Link>

        {/* Card header */}
        {cardLoading ? (
          <div className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] p-6 space-y-3">
            <Skeleton className="h-16 w-16 rounded-xl bg-[#111]" />
            <Skeleton className="h-4 w-40 bg-[#111]" />
            <Skeleton className="h-3 w-64 bg-[#111]" />
          </div>
        ) : !card ? (
          <div className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] p-10 text-center">
            <User className="h-8 w-8 text-[#333] mx-auto mb-3" />
            <p className="text-[#555] text-sm">This GeeZee card is private or doesn't exist.</p>
            <Link href="/geezees">
              <button className="mt-4 text-xs text-purple-400 hover:text-purple-300">← Back to Rolodex</button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />
            <div className="p-6 space-y-5">

              {/* Identity row */}
              <div className="flex items-start gap-4">
                {card.profilePic ? (
                  <img src={card.profilePic} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border border-[#222] shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center shrink-0">
                    <User className="h-8 w-8 text-[#444]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border bg-transparent ${cardTier.color} ${cardTier.border}`}>
                      {cardTier.label}
                    </span>
                    {card.intent && (
                      <span className="text-[10px] text-[#555] bg-[#111] border border-[#222] rounded px-1.5 py-0.5 capitalize">{card.intent}</span>
                    )}
                  </div>
                  {card.displayName && <p className="text-base font-bold text-white">{card.displayName}</p>}
                  {card.username && <p className="text-xs text-[#555]">@{card.username}</p>}
                  {card.slogan && <p className="text-sm text-[#ccc] mt-1.5 leading-snug">{card.slogan}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#555]">
                    {card.ageBracket && <span>{card.ageBracket}</span>}
                    {card.gender && <span>{card.gender}</span>}
                    {followStatus !== undefined && (
                      <span>{followStatus.followerCount} follower{followStatus.followerCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery strip */}
              {card.gallery && card.gallery.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {card.gallery.map((url, i) => (
                    <img key={i} src={url} alt={`Gallery ${i + 1}`} className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#222]" />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                {isAuthed && user?.user?.id !== userId && (
                  <Button
                    size="sm"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className={`h-9 px-5 text-xs font-bold rounded-xl transition-all ${
                      followStatus?.following
                        ? "bg-[#1a1a1a] border border-purple-700/60 text-purple-300 hover:bg-purple-900/20"
                        : "bg-purple-700 hover:bg-purple-600 text-white"
                    }`}
                    data-testid="btn-follow-profile"
                  >
                    {followMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : followStatus?.following
                        ? <><UserMinus className="h-3.5 w-3.5 mr-1.5" />Following</>
                        : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Follow</>
                    }
                  </Button>
                )}
                <a
                  href={`/qr/${card.qrUuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-3 text-xs text-[#777] hover:text-white border border-[#222] hover:border-[#444] rounded-xl transition-all bg-[#0b0b0b]"
                  data-testid="btn-qr-profile"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Card
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Geemotions feed */}
        {card && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Geemotions</h2>
              {motions.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                  {motions.length}
                </span>
              )}
            </div>

            {motionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full bg-[#0b0b0b] rounded-xl" />)}
              </div>
            ) : motions.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-8 text-center">
                <ImageIcon className="h-6 w-6 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">No Geemotions yet.</p>
                {!isAuthed && <p className="text-[#444] text-xs mt-1">Sign in and follow this card to see updates in your feed.</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {motions.map((m) => (
                  <GeemotionCard key={m.id} motion={m} isAuthed={isAuthed} myDisplayName={myDisplayName} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
