import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import {
  Music, Heart, Trophy, Flame, Radio, Mic2, Headphones,
  ExternalLink, Play, Pause, SkipBack, SkipForward, ChevronUp, Upload, Download, Shield, FileBadge2,
  Star, StarHalf, Share2, Copy, Mail, Check, MessageCircle, Send, Trash2, Home, X,
} from "lucide-react";
import { SiX, SiWhatsapp, SiFacebook, SiTelegram } from "react-icons/si";
import type { GZMusicTrack } from "@shared/schema";

const ORANGE = "#ff7a00";
const ORANGE_DIM = "#ff7a0018";
const ORANGE_BORDER = "#ff7a0035";

type TrackWithRating = GZMusicTrack & { avgRating: number; ratingCount: number };

// ── Star helpers ──────────────────────────────────────────────────────────────

function renderStarIcon(position: number, value: number, color: string, sizeClass: string) {
  if (value >= position) {
    return <Star key={position} className={`${sizeClass} shrink-0`} style={{ fill: color, color }} />;
  }
  if (value >= position - 0.5) {
    return <StarHalf key={position} className={`${sizeClass} shrink-0`} style={{ fill: color, color }} />;
  }
  return <Star key={position} className={`${sizeClass} shrink-0`} style={{ fill: "none", color: "#2a2a2a" }} />;
}

function StarDisplay({ value, count }: { value: number; count: number }) {
  const displayVal = count === 0 ? 3.0 : value;
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {[1, 2, 3, 4, 5, 6].map((pos) => renderStarIcon(pos, displayVal, ORANGE, "h-3 w-3"))}
      <span className="text-[10px] font-black ml-1" style={{ color: ORANGE }}>
        {displayVal.toFixed(1)}
      </span>
      {count > 0 ? (
        <span className="text-[9px] text-[#444] ml-0.5">({count} rating{count !== 1 ? "s" : ""})</span>
      ) : (
        <span className="text-[9px] text-[#444] ml-0.5">(gifted starter)</span>
      )}
    </div>
  );
}

function HalfStarRating({
  value,
  onRate,
  disabled,
}: {
  value: number;
  onRate: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number>(0);
  const display = hovered || value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
      data-testid="half-star-rating"
    >
      {[1, 2, 3, 4, 5, 6].map((pos) => (
        <div
          key={pos}
          className="relative"
          style={{ width: 18, height: 18, cursor: disabled ? "default" : "pointer" }}
        >
          {renderStarIcon(pos, display, ORANGE, "h-[18px] w-[18px]")}
          {!disabled && (
            <>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(pos - 0.5)}
                onClick={() => onRate(pos - 0.5)}
              />
              <div
                className="absolute inset-y-0 right-0"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(pos)}
                onClick={() => onRate(pos)}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Share menu ────────────────────────────────────────────────────────────────

function ShareMenu({ track, onClose }: { track: TrackWithRating; onClose: () => void }) {
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/gz-music#track-${track.id}`;
  const text = `🎵 "${track.title}" by ${track.artist} — on GZMusic (GZ100)`;
  const subject = encodeURIComponent(`Check out this track on GZMusic: ${track.title}`);
  const body = encodeURIComponent(`${text}\n\n${url}`);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    }).catch(() => toast({ title: "Couldn't copy", variant: "destructive" }));
  };

  const options = [
    {
      label: "Copy link",
      icon: copied ? Check : Copy,
      color: copied ? "#22c55e" : "#aaa",
      action: handleCopy,
      testId: "share-copy-link",
    },
    {
      label: "Share on X",
      icon: SiX,
      color: "#fff",
      bg: "#000",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank"),
      testId: "share-twitter",
    },
    {
      label: "WhatsApp",
      icon: SiWhatsapp,
      color: "#25d366",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank"),
      testId: "share-whatsapp",
    },
    {
      label: "Telegram",
      icon: SiTelegram,
      color: "#26a5e4",
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank"),
      testId: "share-telegram",
    },
    {
      label: "Facebook",
      icon: SiFacebook,
      color: "#1877f2",
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank"),
      testId: "share-facebook",
    },
    {
      label: "Email",
      icon: Mail,
      color: "#888",
      action: () => { window.location.href = `mailto:?subject=${subject}&body=${body}`; onClose(); },
      testId: "share-email",
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 rounded-xl overflow-hidden shadow-2xl"
      style={{
        background: "#141414",
        border: `1px solid ${ORANGE_BORDER}`,
        minWidth: 160,
      }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: "#222" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#444]">Share this track</p>
      </div>
      {options.map((opt) => {
        const Icon = opt.icon as any;
        return (
          <button
            key={opt.testId}
            onClick={opt.action}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 transition-colors text-left hover:bg-white/5"
            data-testid={opt.testId}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: opt.color }} />
            <span className="text-xs font-semibold" style={{ color: copied && opt.testId === "share-copy-link" ? "#22c55e" : "#bbb" }}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #ffd700, #ffa500)", color: "#000", boxShadow: "0 0 12px rgba(255,165,0,0.6)" }}>
      <Trophy className="h-4 w-4" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #c0c0c0, #a8a8a8)", color: "#000" }}>
      2
    </div>
  );
  if (rank === 3) return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-sm"
      style={{ background: "linear-gradient(135deg, #cd7f32, #a0522d)", color: "#fff" }}>
      3
    </div>
  );
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-black text-xs"
      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#555" }}>
      {rank}
    </div>
  );
}

// ── Comment section ───────────────────────────────────────────────────────────

type TrackComment = {
  id: number;
  trackId: number;
  userId: number;
  content: string;
  createdAt: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
};

function CommentSection({
  trackId,
  expanded,
  userId,
  navigate,
  isAdmin,
}: {
  trackId: number;
  expanded: boolean;
  userId: number | undefined;
  navigate: (to: string) => void;
  isAdmin: boolean;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useQuery<TrackComment[]>({
    queryKey: ["/api/gz-music/tracks", trackId, "comments"],
    queryFn: () => fetch(`/api/gz-music/tracks/${trackId}/comments`).then((r) => r.json()),
    enabled: expanded,
  });

  const submitMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/gz-music/tracks/${trackId}/comments`, { content }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/tracks", trackId, "comments"] });
    },
    onError: () => toast({ title: "Could not post comment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiRequest("DELETE", `/api/gz-music/comments/${commentId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/tracks", trackId, "comments"] }),
    onError: () => toast({ title: "Could not delete comment", variant: "destructive" }),
  });

  if (!expanded) return null;

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="px-3 pb-4 mt-1 border-t" style={{ borderColor: "#1e1e1e" }}>
      <div className="flex items-center gap-1.5 py-2 mb-2">
        <MessageCircle className="h-3.5 w-3.5" style={{ color: ORANGE }} />
        <span className="text-xs font-bold" style={{ color: ORANGE }}>
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </span>
      </div>

      {/* Input area */}
      {userId ? (
        <div className="flex gap-2 mb-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts on this track..."
            maxLength={500}
            rows={2}
            className="flex-1 text-xs rounded-lg px-3 py-2 resize-none outline-none"
            style={{
              background: "#111",
              border: `1px solid #2a2a2a`,
              color: "#ddd",
              fontFamily: "inherit",
            }}
            data-testid={`textarea-comment-${trackId}`}
            onFocus={(e) => (e.target.style.borderColor = ORANGE)}
            onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
          />
          <button
            onClick={() => { if (text.trim()) submitMutation.mutate(text.trim()); }}
            disabled={!text.trim() || submitMutation.isPending}
            className="flex items-center justify-center rounded-lg px-3 transition-all"
            style={{
              background: text.trim() ? ORANGE : "#1a1a1a",
              color: text.trim() ? "#fff" : "#555",
              border: `1px solid ${text.trim() ? ORANGE : "#2a2a2a"}`,
              minWidth: "40px",
            }}
            data-testid={`button-submit-comment-${trackId}`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate("/auth")}
          className="w-full text-xs py-2 rounded-lg mb-3 font-semibold transition-all"
          style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}`, color: ORANGE }}
          data-testid={`button-login-to-comment-${trackId}`}
        >
          Register or login to comment
        </button>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="h-7 w-7 rounded-full bg-[#1a1a1a] shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-24 rounded bg-[#1a1a1a]" />
                <div className="h-2 w-full rounded bg-[#1a1a1a]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "#444" }}>
          No comments yet. Be first!
        </p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
              {/* Avatar */}
              <div className="shrink-0">
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt={c.displayName ?? ""}
                    className="h-7 w-7 rounded-full object-cover"
                    style={{ border: `1px solid #2a2a2a` }}
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: ORANGE_DIM, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}
                  >
                    {(c.displayName ?? "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>
                    {c.displayName ?? c.username ?? "User"}
                  </span>
                  <span className="text-[10px]" style={{ color: "#444" }}>
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: "#aaa" }}>
                  {c.content}
                </p>
              </div>
              {(c.userId === userId || isAdmin) && (
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                  style={{ color: "#555" }}
                  data-testid={`button-delete-comment-${c.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Track card ────────────────────────────────────────────────────────────────

function TrackCard({
  track,
  rank,
  liked,
  onLike,
  myRating,
  onRate,
  ratingPending,
  expanded,
  onToggleExpand,
  onJukeboxPlay,
  highlighted,
  userId,
  navigate,
  isAdmin,
}: {
  track: TrackWithRating;
  rank: number;
  liked: boolean;
  onLike: () => void;
  myRating: number;
  onRate: (stars: number) => void;
  ratingPending: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onJukeboxPlay?: () => void;
  highlighted: boolean;
  userId: number | undefined;
  navigate: (to: string) => void;
  isAdmin: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [localPlayCount, setLocalPlayCount] = useState<number>((track as any).playCount ?? 0);
  const hasCountedRef = useRef(false);
  const hasFile = !!(track as any).fileUrl;

  // Fire-and-forget play count increment on first expand
  useEffect(() => {
    if (expanded && !hasCountedRef.current) {
      hasCountedRef.current = true;
      setLocalPlayCount((c) => c + 1);
      fetch(`/api/gz-music/tracks/${track.id}/play`, { method: "POST" }).catch(() => {});
    }
  }, [expanded]);
  const hasLicense = !!(track as any).licenseFileUrl;
  const downloadOk = (track as any).downloadEnabled;

  return (
    <div
      id={`track-${track.id}`}
      className="rounded-xl transition-all border"
      style={{
        background: liked ? ORANGE_DIM : "#0b0b0b",
        borderColor: highlighted ? ORANGE : liked ? ORANGE_BORDER : "#1e1e1e",
        boxShadow: highlighted ? `0 0 0 2px ${ORANGE}, 0 0 20px rgba(255,122,0,0.35)` : undefined,
        transition: "box-shadow 0.6s ease, border-color 0.6s ease",
      }}
      data-testid={`track-card-${track.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <RankBadge rank={rank} />

        {/* Cover art */}
        <div
          className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "#111", border: "1px solid #2a2a2a" }}
        >
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Headphones className="h-5 w-5" style={{ color: ORANGE }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate" data-testid={`track-title-${track.id}`}>{track.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-[#888]">{track.artist}</p>
            {track.genre && (
              <Badge className="text-[9px] font-bold px-1.5 py-0 h-4 border-0" style={{ background: ORANGE_DIM, color: ORANGE }}>
                {track.genre}
              </Badge>
            )}
          </div>

          {/* Avg community rating */}
          <div className="mt-1">
            <StarDisplay value={track.avgRating} count={track.ratingCount} />
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {hasLicense && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#3b82f610", borderColor: "#3b82f630", color: "#3b82f6" }}>
                <FileBadge2 className="h-2.5 w-2.5" /> Licensed
              </span>
            )}
            {(track as any).authenticityConfirmed && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#22c55e10", borderColor: "#22c55e30", color: "#22c55e" }}>
                <Shield className="h-2.5 w-2.5" /> Certified
              </span>
            )}
            {downloadOk ? (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: ORANGE_DIM, borderColor: ORANGE_BORDER, color: ORANGE }}>
                <Download className="h-2.5 w-2.5" /> Download OK
              </span>
            ) : hasFile ? (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "#1a1a1a", borderColor: "#2a2a2a", color: "#555" }}>
                <Shield className="h-2.5 w-2.5" /> Stream Only
              </span>
            ) : null}
          </div>

          {/* Play controls */}
          <div className="flex items-center gap-3 mt-1">
            {hasFile && onJukeboxPlay && (
              <button
                onClick={onJukeboxPlay}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: ORANGE }}
                data-testid={`button-jukebox-play-${track.id}`}
              >
                <Play className="h-2.5 w-2.5" fill={ORANGE} /> Play
              </button>
            )}
            {!hasFile && track.audioUrl && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: expanded ? ORANGE : "#555" }}
              >
                <Play className="h-2.5 w-2.5" /> {expanded ? "Hide" : "Play"}
              </button>
            )}
            {downloadOk && hasFile && (
              <a
                href={(track as any).fileUrl}
                download
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: "#888" }}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-download-track-${track.id}`}
              >
                <Download className="h-2.5 w-2.5" /> Download
              </a>
            )}
            {hasLicense && (
              <a
                href={(track as any).licenseFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: "#3b82f6" }}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-license-track-${track.id}`}
              >
                <FileBadge2 className="h-2.5 w-2.5" /> View License
              </a>
            )}
          </div>
        </div>

        {/* Right action column: Like + Share */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {/* Like button */}
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all active:scale-90"
            style={{
              background: liked ? ORANGE_DIM : "#111",
              border: `1px solid ${liked ? ORANGE_BORDER : "#2a2a2a"}`,
            }}
            data-testid={`button-like-track-${track.id}`}
          >
            <Heart
              className="h-4 w-4"
              style={{ color: liked ? ORANGE : "#555", fill: liked ? ORANGE : "none" }}
            />
            <span className="text-[10px] font-bold" style={{ color: liked ? ORANGE : "#555" }}>
              {track.likeCount}
            </span>
          </button>

          {/* Share button */}
          <div className="relative">
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90"
              style={{
                background: shareOpen ? ORANGE_DIM : "#111",
                border: `1px solid ${shareOpen ? ORANGE_BORDER : "#2a2a2a"}`,
              }}
              data-testid={`button-share-track-${track.id}`}
              title="Share this track"
            >
              <Share2 className="h-3.5 w-3.5" style={{ color: shareOpen ? ORANGE : "#555" }} />
            </button>
            {shareOpen && (
              <ShareMenu track={track} onClose={() => setShareOpen(false)} />
            )}
          </div>

          {/* Play count */}
          <div
            className="flex flex-col items-center gap-0.5 px-1"
            data-testid={`play-count-${track.id}`}
            title="Total plays"
          >
            <Play className="h-3 w-3" style={{ color: "#444", fill: "#444" }} />
            <span className="text-[9px] font-bold tabular-nums" style={{ color: "#444" }}>
              {localPlayCount >= 1000
                ? `${(localPlayCount / 1000).toFixed(localPlayCount >= 10000 ? 0 : 1)}k`
                : localPlayCount}
            </span>
          </div>
        </div>
      </div>

      {/* Rating row */}
      <div
        className="px-3 pb-2.5 flex items-center gap-2"
        style={{ borderTop: "1px solid #111" }}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#444] shrink-0">
          {myRating ? "Your rating:" : "Rate:"}
        </span>
        <HalfStarRating
          value={myRating}
          onRate={ratingPending ? () => {} : onRate}
          disabled={ratingPending}
        />
        {myRating > 0 && (
          <span className="text-[10px] font-black ml-1" style={{ color: ORANGE }}>
            {myRating.toFixed(1)} ★
          </span>
        )}
      </div>

      {/* Embedded player */}
      {expanded && (track.audioUrl || hasFile) && (
        <div className="px-3 pb-3">
          {hasFile ? (
            <audio
              ref={(el) => { if (el) el.play().catch(() => {}); }}
              controls
              src={(track as any).fileUrl}
              className="w-full rounded-lg"
              style={{ height: "40px" }}
            />
          ) : track.audioUrl ? (
            <>
              {track.audioUrl.includes("soundcloud.com") ? (
                <iframe
                  width="100%"
                  height="80"
                  allow="autoplay"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.audioUrl)}&color=%23ff7a00&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
                  className="rounded-lg"
                  style={{ border: "none" }}
                />
              ) : track.audioUrl.includes("youtube.com") || track.audioUrl.includes("youtu.be") ? (
                <iframe
                  width="100%"
                  height="120"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(track.audioUrl)}?autoplay=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                  style={{ border: "none" }}
                />
              ) : (
                <a
                  href={track.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: ORANGE }}
                >
                  <ExternalLink className="h-3 w-3" /> Open in new tab
                </a>
              )}
            </>
          ) : null}
        </div>
      )}

      <CommentSection
        trackId={track.id}
        expanded={expanded}
        userId={userId}
        navigate={navigate}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GZMusicPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<number | null>(null);

  // ── Jukebox ─────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [jukeboxInfo, setJukeboxInfo] = useState<{
    track: TrackWithRating; rank: number; fileIdx: number;
  } | null>(null);
  const [jkPlaying, setJkPlaying]     = useState(false);
  const [jkProgress, setJkProgress]   = useState(0);   // 0–1
  const [jkTimeSec, setJkTimeSec]     = useState(0);
  const [jkDurSec, setJkDurSec]       = useState(0);

  const { data: tracks = [], isLoading } = useQuery<TrackWithRating[]>({
    queryKey: ["/api/gz-music/tracks"],
  });

  // Deep-link: scroll to + highlight the track from the URL hash once tracks load
  useEffect(() => {
    if (isLoading || tracks.length === 0) return;
    const hash = window.location.hash; // e.g. "#track-7"
    const match = hash.match(/^#track-(\d+)$/);
    if (!match) return;
    const trackId = parseInt(match[1]);
    const el = document.getElementById(`track-${trackId}`);
    if (!el) return;
    // Small delay to let the DOM fully settle
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedTrackId(trackId);
      setTimeout(() => setHighlightedTrackId(null), 3000);
    }, 150);
    return () => clearTimeout(t);
  }, [isLoading, tracks.length]);

  const userId = (user as any)?.user?.id as number | undefined;
  const userRole = (user as any)?.user?.role as string | undefined;
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(userRole ?? "");

  // ── Jukebox helpers ──────────────────────────────────────────────────────────
  const fileTracks = tracks.filter((t) => !!(t as any).fileUrl);

  const jukeboxPlay = useCallback((track: TrackWithRating, rank: number) => {
    const fileUrl = (track as any).fileUrl as string;
    if (!fileUrl || !audioRef.current) return;
    const fileIdx = fileTracks.findIndex((t) => t.id === track.id);
    audioRef.current.src = fileUrl;
    audioRef.current.currentTime = 0;
    setJukeboxInfo({ track, rank, fileIdx });
    setJkProgress(0);
    setJkTimeSec(0);
    audioRef.current.play().catch(() => {});
  }, [fileTracks]);

  const jukeboxPrev = useCallback(() => {
    if (!jukeboxInfo) return;
    const prevIdx = jukeboxInfo.fileIdx - 1;
    if (prevIdx >= 0) {
      const t = fileTracks[prevIdx];
      const r = tracks.findIndex((x) => x.id === t.id) + 1;
      jukeboxPlay(t, r);
    }
  }, [jukeboxInfo, fileTracks, tracks, jukeboxPlay]);

  const jukeboxNext = useCallback(() => {
    if (!jukeboxInfo) return;
    const nextIdx = jukeboxInfo.fileIdx + 1;
    if (nextIdx < fileTracks.length) {
      const t = fileTracks[nextIdx];
      const r = tracks.findIndex((x) => x.id === t.id) + 1;
      jukeboxPlay(t, r);
    } else {
      setJkPlaying(false);
    }
  }, [jukeboxInfo, fileTracks, tracks, jukeboxPlay]);

  const { data: likedMap = {} } = useQuery<Record<number, boolean>>({
    queryKey: ["/api/gz-music/likes/batch", tracks.map((t) => t.id).join(",")],
    queryFn: () => {
      const ids = tracks.map((t) => t.id).join(",");
      return fetch(`/api/gz-music/likes/batch?ids=${ids}`).then((r) => r.json());
    },
    enabled: !!userId && tracks.length > 0,
    staleTime: 30_000,
  });

  const { data: ratingsMap = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/gz-music/ratings/batch", tracks.map((t) => t.id).join(",")],
    queryFn: () => {
      const ids = tracks.map((t) => t.id).join(",");
      return fetch(`/api/gz-music/ratings/batch?ids=${ids}`).then((r) => r.json());
    },
    enabled: !!userId && tracks.length > 0,
    staleTime: 30_000,
  });

  const likeMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/gz-music/tracks/${trackId}/like`),
    onMutate: async (trackId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gz-music/tracks"] });
      const prevTracks = queryClient.getQueryData<TrackWithRating[]>(["/api/gz-music/tracks"]);
      const wasLiked = likedMap[trackId] ?? false;
      queryClient.setQueryData<TrackWithRating[]>(["/api/gz-music/tracks"], (old) =>
        old?.map((t) => t.id === trackId ? { ...t, likeCount: t.likeCount + (wasLiked ? -1 : 1) } : t)
      );
      return { prevTracks };
    },
    onError: (err: any, _trackId, ctx) => {
      if (ctx?.prevTracks) queryClient.setQueryData(["/api/gz-music/tracks"], ctx.prevTracks);
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        toast({ title: "Sign in to vote", description: "Create a free account to like tracks.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Couldn't update your vote.", variant: "destructive" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gz-music/likes/batch"] });
    },
  });

  const [ratingPending, setRatingPending] = useState<number | null>(null);

  const rateMutation = useMutation({
    mutationFn: ({ trackId, stars }: { trackId: number; stars: number }) =>
      apiRequest("POST", `/api/gz-music/tracks/${trackId}/rate`, { stars }),
    onMutate: ({ trackId }) => setRatingPending(trackId),
    onSuccess: (data: any, { trackId, stars }) => {
      setRatingPending(null);
      // Optimistically update avg in track list
      queryClient.setQueryData<TrackWithRating[]>(["/api/gz-music/tracks"], (old) =>
        old?.map((t) => t.id === trackId
          ? { ...t, avgRating: data?.avgRating ?? t.avgRating, ratingCount: data?.ratingCount ?? t.ratingCount }
          : t)
      );
      // Update ratings batch cache
      queryClient.setQueryData<Record<number, number>>(
        ["/api/gz-music/ratings/batch", tracks.map((t) => t.id).join(",")],
        (old) => ({ ...(old ?? {}), [trackId]: stars })
      );
      toast({ title: "Rated!", description: `You gave this track ${stars} star${stars !== 1 ? "s" : ""}.` });
    },
    onError: (err: any) => {
      setRatingPending(null);
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        toast({ title: "Sign in to rate", description: "Create a free Gigzito account to rate tracks.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Couldn't save your rating.", variant: "destructive" });
      }
    },
  });

  const handleLike = (trackId: number) => {
    if (!user) {
      toast({ title: "Sign in to vote", description: "Create a free Gigzito account to vote for your favorites.", variant: "destructive" });
      return;
    }
    likeMutation.mutate(trackId);
  };

  const handleRate = (trackId: number, stars: number) => {
    if (!user) {
      toast({ title: "Sign in to rate", description: "Create a free Gigzito account to rate tracks.", variant: "destructive" });
      return;
    }
    rateMutation.mutate({ trackId, stars });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hidden audio element for jukebox */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a || !a.duration) return;
          setJkTimeSec(a.currentTime);
          setJkProgress(a.currentTime / a.duration);
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a) setJkDurSec(a.duration || 0);
        }}
        onEnded={jukeboxNext}
        onPause={() => setJkPlaying(false)}
        onPlay={() => setJkPlaying(true)}
      />

      {/* ── Jukebox bar ─────────────────────────────────────────────────────── */}
      {jukeboxInfo && (
        <div
          data-testid="jukebox-bar"
          style={{
            position: "fixed",
            bottom: 62,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 24px)",
            maxWidth: 680,
            zIndex: 1000,
            background: "linear-gradient(135deg, #0f0800 0%, #1c1000 100%)",
            border: `1px solid ${ORANGE_BORDER}`,
            borderRadius: 16,
            padding: "10px 14px",
            boxShadow: "0 8px 40px rgba(255,122,0,0.28)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            {/* Cover art */}
            <div
              style={{
                width: 46, height: 46, borderRadius: 8, overflow: "hidden",
                background: "#111", border: `1px solid ${ORANGE_BORDER}`,
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {(jukeboxInfo.track as any).coverUrl ? (
                <img
                  src={(jukeboxInfo.track as any).coverUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Headphones style={{ color: ORANGE, width: 20, height: 20 }} />
              )}
            </div>

            {/* Track info + progress */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "#fff", fontWeight: 700, fontSize: 12,
                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", margin: 0,
                }}
              >
                #{jukeboxInfo.rank} {jukeboxInfo.track.title}
              </p>
              <p
                style={{
                  color: "#888", fontSize: 11,
                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", margin: 0,
                }}
              >
                {jukeboxInfo.track.artist}
              </p>

              {/* Seek bar */}
              <div
                data-testid="jukebox-seek"
                style={{ height: 4, background: "#222", borderRadius: 2, marginTop: 5, cursor: "pointer" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = (e.clientX - rect.left) / rect.width;
                  const a = audioRef.current;
                  if (a && a.duration) a.currentTime = fraction * a.duration;
                }}
              >
                <div
                  style={{
                    height: "100%", width: `${jkProgress * 100}%`,
                    background: `linear-gradient(90deg, ${ORANGE}, #ff9a40)`,
                    borderRadius: 2, transition: "width 0.2s linear",
                  }}
                />
              </div>

              {/* Time */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 9, color: "#444" }}>{formatTime(jkTimeSec)}</span>
                <span style={{ fontSize: 9, color: "#444" }}>{formatTime(jkDurSec)}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                data-testid="jukebox-prev"
                onClick={jukeboxPrev}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: jukeboxInfo.fileIdx === 0 ? 0.3 : 1 }}
              >
                <SkipBack style={{ color: "#bbb", width: 17, height: 17 }} />
              </button>

              <button
                data-testid="jukebox-playpause"
                onClick={() => {
                  const a = audioRef.current;
                  if (!a) return;
                  if (jkPlaying) a.pause();
                  else a.play().catch(() => {});
                }}
                style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`,
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(255,122,0,0.4)",
                }}
              >
                {jkPlaying
                  ? <Pause style={{ color: "#fff", width: 17, height: 17 }} />
                  : <Play  style={{ color: "#fff", width: 17, height: 17, marginLeft: 2 }} />
                }
              </button>

              <button
                data-testid="jukebox-next"
                onClick={jukeboxNext}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: jukeboxInfo.fileIdx >= fileTracks.length - 1 ? 0.3 : 1 }}
              >
                <SkipForward style={{ color: "#bbb", width: 17, height: 17 }} />
              </button>

              <button
                data-testid="jukebox-close"
                onClick={() => {
                  audioRef.current?.pause();
                  setJukeboxInfo(null);
                  setJkPlaying(false);
                  setJkProgress(0);
                  setJkTimeSec(0);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X style={{ color: "#444", width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-6">

        {/* ── Back to Home ─────────────────────────────────────────────────── */}
        <button
          data-testid="btn-home-gz-music"
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,122,0,0.08)", border: "1px solid rgba(255,122,0,0.22)",
            borderRadius: 8, padding: "6px 14px", cursor: "pointer",
            color: ORANGE, fontSize: 13, fontWeight: 600, transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,122,0,0.16)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,122,0,0.08)")}
        >
          <Home size={14} />
          Return to Homepage
        </button>

        {/* ── Hero / Manifesto ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0f0800 0%, #1a0c00 50%, #0a0a0a 100%)",
            border: `1px solid ${ORANGE_BORDER}`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.12) 0%, transparent 70%)" }} />

          <div className="relative p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, boxShadow: `0 4px 20px rgba(255,122,0,0.5)` }}
              >
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: ORANGE, textShadow: `0 0 20px rgba(255,122,0,0.5)` }}>
                  GZMusic
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#555]">The Sound of Autonomy</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}` }}>
                  <Radio className="h-3 w-3" style={{ color: ORANGE }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>Live Chart</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(user ? "/gz-music/upload" : "/auth")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`,
                  color: "#fff",
                  boxShadow: `0 4px 20px rgba(255,122,0,0.4)`,
                }}
                data-testid="button-upload-track-hero"
              >
                <Upload className="h-4 w-4" />
                Upload Your Track
              </button>
              <button
                onClick={() => navigate("/gz-music/bands")}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] border"
                style={{ background: "#1a1a1a", color: ORANGE, borderColor: "#ff7a0035" }}
                data-testid="button-bands-directory"
              >
                <Mic2 className="h-4 w-4" />
                Bands
              </button>
            </div>

            <div className="space-y-2 text-sm leading-relaxed text-[#999]">
              <p>
                The old systems of control are fading. GZMusic is not just a platform — it is a{" "}
                <span className="font-semibold" style={{ color: ORANGE }}>declaration of independence</span>{" "}
                for the creator and the listener. We are reclaiming the frequency, stripping away the corporate filters, and returning the power of sound to the people who make it and the souls who feel it.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Mic2, label: "Our Artist", sub: "Our Way" },
                { icon: Flame, label: "Pure Engagement", sub: "No gatekeepers" },
                { icon: ChevronUp, label: "Real Talent", sub: "Rises to the top" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl p-3 text-center space-y-1" style={{ background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}` }}>
                    <Icon className="h-4 w-4 mx-auto" style={{ color: ORANGE }} />
                    <p className="text-[10px] font-black text-white">{item.label}</p>
                    <p className="text-[9px] text-[#555]">{item.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── GZ100 Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)` }}
          >
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">The GZ100</h2>
            <p className="text-xs text-[#555]">Ranked by star ratings + community likes</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {fileTracks.length > 0 && (
              <button
                data-testid="button-play-all"
                onClick={() => {
                  const first = fileTracks[0];
                  const rank = tracks.findIndex((t) => t.id === first.id) + 1;
                  jukeboxPlay(first, rank);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`,
                  border: "none", borderRadius: 8, padding: "7px 13px",
                  cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(255,122,0,0.3)",
                }}
              >
                <Play style={{ width: 12, height: 12 }} fill="#fff" />
                Play All
              </button>
            )}
            <div className="text-right">
              <p className="text-lg font-black" style={{ color: ORANGE }}>{tracks.length}</p>
              <p className="text-[10px] text-[#444] uppercase tracking-widest">tracks</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">How the GZ100 works</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "6-Star Rating", desc: "Each track starts at 3★ gifted. Your rating shifts the rank." },
              { label: "Transparent", desc: "Real ratings, real artists, real movement." },
              { label: "Living", desc: "Rankings shift live as votes and ratings pour in." },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-bold" style={{ color: ORANGE }}>{item.label}</p>
                <p className="text-[10px] text-[#444] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chart ────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" style={{ background: "#111" }} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div
            className="rounded-2xl p-16 flex flex-col items-center gap-4 text-center"
            style={{ background: "#0b0b0b", border: "1px solid #1e1e1e" }}
          >
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ background: ORANGE_DIM, border: `2px solid ${ORANGE_BORDER}` }}
            >
              <Music className="h-7 w-7" style={{ color: ORANGE }} />
            </div>
            <div className="space-y-1.5">
              <p className="font-black text-white text-lg">No tracks yet</p>
              <p className="text-sm text-[#555] max-w-[240px] leading-relaxed">
                The GZ100 is being built. Artists are loading their sound. Check back soon — the movement is coming.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                rank={index + 1}
                liked={likedMap[track.id] ?? false}
                onLike={() => handleLike(track.id)}
                myRating={ratingsMap[track.id] ?? 0}
                onRate={(stars) => handleRate(track.id, stars)}
                ratingPending={ratingPending === track.id}
                expanded={expandedTrackId === track.id}
                onToggleExpand={() =>
                  setExpandedTrackId((prev) => (prev === track.id ? null : track.id))
                }
                onJukeboxPlay={
                  (track as any).fileUrl
                    ? () => jukeboxPlay(track, index + 1)
                    : undefined
                }
                highlighted={highlightedTrackId === track.id}
                userId={userId}
                navigate={navigate}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 text-center space-y-3"
          style={{
            background: `linear-gradient(135deg, #0f0800, #1a0c00)`,
            border: `1px solid ${ORANGE_BORDER}`,
          }}
        >
          <p className="font-black text-white text-base">Break the cycle. Find your frequency.</p>
          <p className="text-sm text-[#888]">
            This is more than a library of tracks — it is an endeavor to shift the paradigm. Whether we are pushing code to ash or hills, the goal remains the same: a total replacement of the outdated structures that limit our potential.
          </p>
          <p className="font-black text-lg" style={{ color: ORANGE }}>This is GZMusic.</p>
        </div>
      </div>
    </div>
  );
}
