import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Share2, Copy, Check, ShoppingCart, Tag, Timer, Volume2, VolumeX, Heart, X, MessageCircle } from "lucide-react";
import { InquireLeadModal } from "@/components/inquire-lead-modal";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ListingWithProvider } from "@shared/schema";

const MAX_PLAY_SECONDS = 60;

const CTA_LABELS: Record<string, string> = {
  "Visit Offer":  "Visit Offer",
  "Shop Product": "Shop Now",
  "Join Event":   "Join Event",
  "Book Service": "Book Now",
  "Join Guild":   "Join Guild",
};

interface VideoCardProps {
  listing: ListingWithProvider;
  className?: string;
  isActive?: boolean;
  onEnd?: () => void;
  isMuted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  initialIsLiked?: boolean;
  suppressLikeQuery?: boolean;
}

const BADGE: Record<string, { bg: string; label: string }> = {
  INFLUENCER:      { bg: "bg-purple-600",             label: "Influencer" },
  MARKETING:       { bg: "bg-red-600",                label: "Marketing" },
  COACHING:        { bg: "bg-violet-600",             label: "Coaching" },
  COURSES:         { bg: "bg-blue-600",               label: "Courses" },
  PRODUCTS:        { bg: "bg-orange-500",             label: "Products" },
  FLASH_SALE:      { bg: "bg-red-600",                label: "Flash Sale" },
  FLASH_COUPON:    { bg: "bg-emerald-600",            label: "Flash Coupon" },
  MUSIC_GIGS:      { bg: "bg-pink-500",               label: "Music Gigs" },
  MUSIC:           { bg: "bg-pink-500",               label: "Music" },
  EVENTS:          { bg: "bg-yellow-500 text-black",  label: "Events" },
  CRYPTO:          { bg: "bg-yellow-600",             label: "Crypto" },
  CORPORATE_DEALS: { bg: "bg-blue-900",               label: "Corporate Deals" },
};

const SPECIAL_GLOW: Record<string, string> = {
  FLASH_SALE:   "ring-2 ring-red-500 shadow-[0_0_24px_rgba(255,0,64,0.55)]",
  FLASH_COUPON: "ring-2 ring-emerald-500 shadow-[0_0_24px_rgba(0,200,83,0.5)]",
};

function getYouTubeId(url: string): string {
  const u = new URL(url);
  if (u.pathname.includes("/embed/")) return u.pathname.split("/embed/")[1].split("?")[0];
  if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
  if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
  return u.searchParams.get("v") ?? "";
}

function isNativeVideo(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  return /\.(mp4|webm|mov|ogg|ogv|avi|m4v|3gp|mkv)(\?|$)/i.test(url);
}

/** URLs that can never be embedded — detected upfront so we skip the broken iframe entirely */
function getUnsupportedPlatform(url: string): string | null {
  if (!url) return null;
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.includes("tiktok.com")) return "TikTok";
    if (hostname.includes("instagram.com")) return "Instagram";
    if (hostname.includes("facebook.com") && pathname.includes("/videos/")) return "Facebook";
    if (hostname.includes("snapchat.com")) return "Snapchat";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "X / Twitter";
  } catch { /* ignore bad URLs */ }
  return null;
}

function isYouTubeShorts(url: string): boolean {
  try { return new URL(url).pathname.includes("/shorts/"); } catch { return false; }
}

function getVideoEmbedUrl(url: string, autoplay = false, muted = true): string {
  try {
    const u = new URL(url);
    const ap = autoplay ? "1" : "0";
    const mt = muted ? "1" : "0";

    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = getYouTubeId(url);
      if (!id) return url; // guard against empty ID
      const shorts = isYouTubeShorts(url);
      const origin = encodeURIComponent(window.location.origin);
      if (shorts) {
        return [
          `https://www.youtube-nocookie.com/embed/${id}`,
          `?autoplay=${ap}`,
          `&mute=${mt}`,
          `&enablejsapi=1`,
          `&rel=0`,
          `&playsinline=1`,
          `&modestbranding=1`,
          `&origin=${origin}`,
        ].join("");
      }
      return [
        `https://www.youtube-nocookie.com/embed/${id}`,
        `?autoplay=${ap}`,
        `&mute=${mt}`,
        `&enablejsapi=1`,
        `&modestbranding=1`,
        `&rel=0`,
        `&playsinline=1`,
        `&loop=1`,
        `&playlist=${id}`,
        `&origin=${origin}`,
      ].join("");
    }

    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return [
        `https://player.vimeo.com/video/${id}`,
        `?autoplay=${ap}`,
        `&muted=${mt}`,
        `&loop=1`,
        `&background=${autoplay ? "1" : "0"}`,
      ].join("");
    }

    return url;
  } catch {
    return url;
  }
}

function getWatchableUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname.includes("/embed/")) {
      const id = u.pathname.split("/embed/")[1].split("?")[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (u.hostname.includes("player.vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return `https://vimeo.com/${id}`;
    }
    return url;
  } catch { return url; }
}

function stopIframe(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  try {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
      "*"
    );
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "*"
    );
  } catch (_) {}
  iframe.src = "about:blank";
}

function handleShare(listing: ListingWithProvider) {
  const text = `${listing.title} by ${listing.provider.displayName}`;
  if (navigator.share) navigator.share({ title: text, url: window.location.href });
  else navigator.clipboard.writeText(window.location.href);
}

function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const calc = () => setDiff(Math.max(0, endsAt.getTime() - Date.now()));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (diff <= 0) return (
    <div className="flex items-center gap-1 text-xs font-bold text-red-400" data-testid="countdown-expired">
      <Timer className="w-3.5 h-3.5" /> Expired
    </div>
  );

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 bg-red-600/25 border border-red-500/40 rounded-lg px-2.5 py-1" data-testid="countdown-timer">
      <Timer className="w-3 h-3 text-red-400 flex-shrink-0" />
      <span className="text-red-300 font-mono font-bold text-sm tracking-widest">
        {h > 0 ? `${fmt(h)}:` : ""}{fmt(m)}:{fmt(s)}
      </span>
      <span className="text-red-400/70 text-[10px]">left</span>
    </div>
  );
}

function CouponCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg px-3 py-1.5" data-testid="coupon-code-block">
      <Tag className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      <span className="font-mono font-bold text-emerald-300 text-sm tracking-widest uppercase flex-1">{code}</span>
      <button onClick={handleCopy} className="text-emerald-400 hover:text-emerald-200 transition-colors flex-shrink-0" data-testid="button-copy-coupon">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ProductBlock({ price, purchaseUrl, stock, onGuestAction }: { price?: string | null; purchaseUrl?: string | null; stock?: string | null; onGuestAction?: () => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="product-block">
      {price && (
        <span className="bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold text-sm px-2.5 py-1 rounded-lg" data-testid="text-product-price">{price}</span>
      )}
      {stock && (
        <span className="bg-white/10 border border-white/20 text-white/70 text-xs px-2 py-1 rounded-lg" data-testid="text-product-stock">{stock}</span>
      )}
      {purchaseUrl && (
        onGuestAction ? (
          <Button size="sm" onClick={onGuestAction} className="bg-orange-500/20 hover:bg-orange-500/35 text-white border border-orange-500/70 hover:border-orange-400 h-7 px-3 rounded-full font-bold text-xs gap-1 backdrop-blur-sm" data-testid="button-buy-product">
            <ShoppingCart className="w-3 h-3" /> Buy Now
          </Button>
        ) : (
          <Button size="sm" className="bg-orange-500/20 hover:bg-orange-500/35 text-white border border-orange-500/70 hover:border-orange-400 h-7 px-3 rounded-full font-bold text-xs gap-1 backdrop-blur-sm" asChild data-testid="button-buy-product">
            <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">
              <ShoppingCart className="w-3 h-3" /> Buy Now
            </a>
          </Button>
        )
      )}
    </div>
  );
}

export function VideoCard({ listing, className = "", isActive = false, onEnd, isMuted = true, onMuteChange, initialIsLiked, suppressLikeQuery = false }: VideoCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const provider = listing.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  const badgeInfo = BADGE[listing.vertical] ?? { bg: "bg-gray-600", label: listing.vertical };
  const glowClass = SPECIAL_GLOW[listing.vertical] ?? "";

  const isFlashSale   = listing.vertical === "FLASH_SALE";
  const isFlashCoupon = listing.vertical === "FLASH_COUPON";
  const isProduct     = listing.vertical === "PRODUCTS";
  const flashEndsAt   = listing.flashSaleEndsAt ? new Date(listing.flashSaleEndsAt) : null;

  const [showInquire,    setShowInquire]    = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [nativeVideoFailed, setNativeVideoFailed] = useState(false);

  const unsupportedPlatform = getUnsupportedPlatform(listing.videoUrl ?? "");

  const { data: commentsData = [], refetch: refetchComments } = useQuery<{ id: number; authorName: string; commentText: string; createdAt: string }[]>({
    queryKey: [`/api/listings/${listing.id}/comments`],
    enabled: showComments,
    staleTime: 0,
  });

  const commentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/listings/${listing.id}/comments`, {
      commentText: commentInput.trim(),
    }),
    onSuccess: () => {
      setCommentInput("");
      refetchComments();
    },
    onError: (err: Error) => {
      if (err.message.startsWith("401")) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Session expired", description: "Please sign in again to post a comment.", variant: "destructive" });
      } else {
        toast({ title: "Couldn't post comment", description: err.message || "Something went wrong.", variant: "destructive" });
      }
    },
  });

  const { data: likeData } = useQuery<{ likeCount: number; isLiked: boolean }>({
    queryKey: [`/api/videos/${listing.id}/likes`],
    staleTime: 60_000,
    enabled: !suppressLikeQuery && initialIsLiked === undefined,
  });

  const isLiked = optimisticLiked ?? (initialIsLiked !== undefined ? initialIsLiked : likeData?.isLiked ?? false);
  const likeCount = optimisticCount ?? likeData?.likeCount ?? listing.likeCount;

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/videos/${listing.id}/like`) as Promise<{ liked: boolean; likeCount: number }>,
    onMutate: () => {
      const newLiked = !isLiked;
      setOptimisticLiked(newLiked);
      setOptimisticCount((likeCount ?? 0) + (newLiked ? 1 : -1));
      setHeartAnimating(true);
      setTimeout(() => setHeartAnimating(false), 400);
    },
    onSuccess: (data) => {
      setOptimisticLiked(data.liked);
      setOptimisticCount(data.likeCount);
    },
    onError: () => {
      setOptimisticLiked(null);
      setOptimisticCount(null);
    },
  });

  const handleLike = () => {
    if (!user) { setShowGuestModal(true); return; }
    likeMutation.mutate();
  };

  const ctaType = listing.ctaType ?? null;
  const ctaUrl  = listing.ctaUrl ?? null;
  const isShopProduct = ctaType === "Shop Product";
  const ctaButtonLabel = ctaType ? (CTA_LABELS[ctaType] ?? ctaType) : "Inquire";

  const handleCtaClick = () => {
    if (isShopProduct && ctaUrl) {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setShowInquire(true);
  };

  const handleInquireClick = () => {
    if (!user) { setShowGuestModal(true); return; }
    setShowInquire(true);
  };

  const [timeLeft,   setTimeLeft]   = useState<number | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const endCalledRef = useRef(false);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const [iframeSrc,  setIframeSrc]  = useState("about:blank");
  const [videoBlocked, setVideoBlocked] = useState(false);

  // Keep a ref to the current muted state so the iframe postMessage always uses the latest value
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
    // Sync muted state live to native video element
    if (isNativeVideo(listing.videoUrl ?? "") && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted, listing.videoUrl]);

  const toggleMute = () => {
    const next = !isMuted;
    if (isNativeVideo(listing.videoUrl ?? "")) {
      const v = videoRef.current;
      if (v) { v.muted = next; v.volume = next ? 0 : 1; }
    } else {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
            "*"
          );
        } catch (_) {}
      }
    }
    onMuteChange?.(next);
  };

  const playSeconds = Math.min(listing.durationSeconds ?? MAX_PLAY_SECONDS, MAX_PLAY_SECONDS);

  // Always-fresh ref so the timer closure never goes stale
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // Reset error states when switching videos
  useEffect(() => {
    setVideoBlocked(false);
    setNativeVideoFailed(false);
  }, [listing.id]);

  // Listen for YouTube iframe API error events
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube iframe API: event=onError, info=100/101/150 means restricted/embedding disabled
        if (data?.event === "onError" && [100, 101, 150].includes(Number(data?.info))) {
          setVideoBlocked(true);
        }
        // Alternate format used by some YouTube player versions
        if (data?.channel === "widget" && [100, 101, 150].includes(Number(data?.info))) {
          setVideoBlocked(true);
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const native = isNativeVideo(listing.videoUrl ?? "");
    if (!isActive) {
      if (native) {
        const v = videoRef.current;
        if (v) { v.pause(); v.currentTime = 0; }
      } else {
        stopIframe(iframeRef.current);
        setIframeSrc("about:blank");
      }
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeLeft(null);
      endCalledRef.current = false;
      return;
    }
    // Activate
    endCalledRef.current = false;
    setTimeLeft(playSeconds);
    if (native) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.muted = isMutedRef.current;
        v.volume = isMutedRef.current ? 0 : 1;
        v.play().catch(() => {});
      }
    } else {
      setIframeSrc(getVideoEmbedUrl(listing.videoUrl ?? "", true, isMutedRef.current));
    }
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, playSeconds - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && !endCalledRef.current) {
        endCalledRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onEndRef.current?.();
      }
    }, 200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, listing.id]);

  const posterUrl = provider.thumbUrl || provider.avatarUrl || null;

  return (
    <>
      {/* Single player shell — is BOTH the sizing box and the absolute positioning context.
          No nested wrapper. All children stack inside this one div. */}
      <div
        data-testid={`card-listing-${listing.id}`}
        className={`video-card ${glowClass} ${className}`}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          maxWidth: "420px",
          borderRadius: "22px",
          background: "#0b0b0b",
        }}
      >

          {/* Poster thumbnail shown when video is not active */}
          {!isActive && posterUrl && (
            <img
              src={posterUrl}
              alt={listing.title}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
              data-testid={`img-poster-${listing.id}`}
            />
          )}

          {/* Dark background fallback when no poster */}
          {!isActive && !posterUrl && (
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, background: "#0b0b0b", zIndex: 0 }} />
          )}

          {/* Autoplay fallback play button — only shown if autoplay failed */}
          {!isActive && autoplayFailed && (
            <button
              style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)", zIndex: 20,
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              }}
              aria-label="Play video"
              data-testid={`button-play-${listing.id}`}
            >
              <Play className="w-10 h-10 fill-white text-white ml-1" />
            </button>
          )}

          {/* Text post overlay — shown when there is no video */}
          {!listing.videoUrl && (
            <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(160deg, #111 0%, #0a0a0a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 4 }}>📢</div>
              <p style={{ color: "#fff", fontSize: 17, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{listing.title}</p>
              {listing.description && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>{listing.description}</p>}
            </div>
          )}

          {/* Native video element — used when listing.videoUrl is an uploaded file */}
          {isNativeVideo(listing.videoUrl ?? "") && !nativeVideoFailed && (
            <video
              ref={videoRef}
              key={`native-${listing.id}`}
              src={listing.videoUrl ?? undefined}
              playsInline
              loop={false}
              preload="metadata"
              onEnded={() => {
                if (!endCalledRef.current) {
                  endCalledRef.current = true;
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  onEnd?.();
                }
              }}
              onError={() => setNativeVideoFailed(true)}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
              data-testid={`native-video-${listing.id}`}
            />
          )}

          {/* Iframe — only mounted when active; unmounting fully kills browser audio */}
          {listing.videoUrl && !isNativeVideo(listing.videoUrl ?? "") && iframeSrc !== "about:blank" && <iframe
            ref={iframeRef}
            key={`video-${listing.id}`}
            src={iframeSrc}
            title={listing.title}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", border: "none", zIndex: 0, pointerEvents: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />}

          {/* Unsupported platform (TikTok, Instagram, etc.) — detected upfront */}
          {unsupportedPlatform && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 6,
                background: "rgba(0,0,0,0.92)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
              }}
              data-testid={`overlay-unsupported-${listing.id}`}
            >
              <div style={{ fontSize: 36 }}>🔒</div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 700, textAlign: "center" }}>
                {unsupportedPlatform} videos can't be embedded
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 1.5 }}>
                Open the link directly to watch this video
              </p>
              {listing.videoUrl && (
                <a
                  href={listing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#c41414", color: "white",
                    borderRadius: 20, padding: "9px 22px",
                    fontSize: 13, fontWeight: 700, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <ExternalLink style={{ width: 14, height: 14 }} />
                  Open on {unsupportedPlatform}
                </a>
              )}
            </div>
          )}

          {/* Native video failed to load */}
          {nativeVideoFailed && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 6,
                background: "rgba(0,0,0,0.92)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
              }}
              data-testid={`overlay-video-error-${listing.id}`}
            >
              <div style={{ fontSize: 36 }}>⚠️</div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 700, textAlign: "center" }}>
                Video couldn't be played
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 1.5 }}>
                The file format may not be supported, or the video is still processing. Try again shortly.
              </p>
              {listing.videoUrl && (
                <a
                  href={listing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#c41414", color: "white",
                    borderRadius: 20, padding: "9px 22px",
                    fontSize: 13, fontWeight: 700, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <ExternalLink style={{ width: 14, height: 14 }} />
                  Open video directly
                </a>
              )}
            </div>
          )}

          {/* Video blocked / embedding disabled fallback */}
          {videoBlocked && isActive && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 6,
                background: "rgba(0,0,0,0.93)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 14,
              }}
              data-testid={`overlay-blocked-${listing.id}`}
            >
              <div style={{ fontSize: 36 }}>🎬</div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
                This video can't be embedded. Watch it directly on YouTube.
              </p>
              <a
                href={getWatchableUrl(listing.videoUrl ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#ff0000", color: "white",
                  borderRadius: 20, padding: "9px 20px",
                  fontSize: 13, fontWeight: 700,
                  textDecoration: "none",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                data-testid={`link-watch-youtube-${listing.id}`}
              >
                ▶ Watch on YouTube
              </a>
            </div>
          )}

          {/* Transparent event interceptor */}
          <div
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1, touchAction: "pan-y" }}
            aria-hidden="true"
          />

          {/* Gradient overlay */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, pointerEvents: "none",
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
          }} />

          {/* TOP: Duration badge — live countdown while active */}
          <div
            style={{ position: "absolute", top: 12, right: 12, zIndex: 20, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: 999, padding: "2px 8px" }}
            data-testid={`badge-duration-${listing.id}`}
          >
            <Clock className="w-2.5 h-2.5 text-white/70" />
            <span
              className="text-[10px] font-semibold"
              style={{ color: timeLeft !== null && timeLeft <= 5 ? "#ff4444" : timeLeft !== null && timeLeft <= 15 ? "#f59e0b" : "rgba(255,255,255,0.8)" }}
            >
              {timeLeft !== null ? `${Math.ceil(timeLeft)}s` : `${playSeconds}s`}
            </span>
          </div>

          {/* SOUND BUTTON — bottom-right rail, above heart */}
          {isActive && (
            <button
              onClick={toggleMute}
              style={{
                position: "absolute", bottom: 350, right: 12, zIndex: 30,
                width: 44, height: 44, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}
              data-testid={`button-mute-${listing.id}`}
              title={isMuted ? "Tap for sound" : "Mute"}
            >
              {isMuted
                ? <VolumeX className="w-5 h-5 text-white/70" />
                : <Volume2 className="w-5 h-5 text-white" />}
            </button>
          )}

          {/* HEART LIKE BUTTON */}
          <div
            style={{ position: "absolute", bottom: 290, right: 12, zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            data-testid={`like-container-${listing.id}`}
          >
            <button
              onClick={handleLike}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isLiked ? "rgba(220,38,38,0.25)" : "rgba(0,0,0,0.5)",
                border: isLiked ? "1.5px solid rgba(220,38,38,0.6)" : "1.5px solid rgba(255,255,255,0.2)",
                transform: heartAnimating ? "scale(1.35)" : "scale(1)",
                transition: "transform 0.2s cubic-bezier(.36,.07,.19,.97), background 0.15s, border-color 0.15s",
                backdropFilter: "blur(6px)",
                cursor: "pointer",
              }}
              data-testid={`button-like-${listing.id}`}
              title={isLiked ? "Unlike" : "Like"}
            >
              <Heart
                className="w-5 h-5"
                style={{
                  color: isLiked ? "#ef4444" : "rgba(255,255,255,0.85)",
                  fill: isLiked ? "#ef4444" : "transparent",
                  transition: "fill 0.15s, color 0.15s",
                }}
              />
            </button>
            <span
              style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontVariantNumeric: "tabular-nums" }}
              data-testid={`text-like-count-${listing.id}`}
            >
              {(likeCount ?? 0).toLocaleString()}
            </span>
          </div>

          {/* COMMENTS BUTTON */}
          <div
            style={{ position: "absolute", bottom: 228, right: 12, zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            data-testid={`comments-container-${listing.id}`}
          >
            <button
              onClick={() => setShowComments(true)}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}
              data-testid={`button-comments-${listing.id}`}
              title="Comments"
            >
              <MessageCircle className="w-5 h-5 text-white/80" />
            </button>
            <span
              style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontVariantNumeric: "tabular-nums" }}
              data-testid={`text-comment-count-${listing.id}`}
            >
              {showComments
                ? (commentsData.length > 0 ? commentsData.length.toLocaleString() : "0")
                : ((listing.commentCount ?? 0) > 0 ? (listing.commentCount ?? 0).toLocaleString() : "0")}
            </span>
          </div>

          {/* FLOATING CREATOR AVATAR */}
          <Link href={`/provider/${listing.provider.id}`}>
            <div
              style={{ position: "absolute", bottom: 20, right: 12, zIndex: 30, cursor: "pointer", transition: "transform 0.15s ease" }}
              data-testid={`avatar-creator-${listing.id}`}
              title={`View ${provider.displayName}'s profile`}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.5)",
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)",
                  background: "#1a1a1a", flexShrink: 0,
                }}
              >
                {provider.avatarUrl ? (
                  <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: 15, fontWeight: 700 }}>
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* BOTTOM: Info & CTAs */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "48px 16px 22px", zIndex: 20 }} className="space-y-2">

            {/* Category badge */}
            <Badge className={`${badgeInfo.bg} text-white text-[10px] px-2.5 py-0.5 uppercase font-bold border-0 tracking-wide`}>
              {badgeInfo.label}
            </Badge>

            {/* Flash Sale countdown */}
            {isFlashSale && flashEndsAt && <CountdownTimer endsAt={flashEndsAt} />}

            {/* Coupon code */}
            {isFlashCoupon && listing.couponCode && <CouponCodeBlock code={listing.couponCode} />}

            {/* Product extras */}
            {isProduct && (
              <ProductBlock
                price={listing.productPrice}
                purchaseUrl={listing.productPurchaseUrl}
                stock={listing.productStock}
                onGuestAction={!user ? () => setShowGuestModal(true) : undefined}
              />
            )}

            {/* Title + Description — right-padded to clear the avatar column */}
            <div style={{ paddingRight: "64px" }}>
              <h4 className="font-bold text-base leading-snug text-white drop-shadow-md">{listing.title}</h4>
              {listing.description && (
                <p className="text-[12px] text-white/80 line-clamp-1 leading-relaxed mt-0.5 drop-shadow-sm">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Action Row: CTA · Share */}
            <div className="flex items-center gap-2" style={{ paddingRight: "64px", position: "relative" }}>
              <button
                onClick={handleCtaClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#ff2b2b]/20 hover:bg-[#ff2b2b]/35 border border-[#ff2b2b]/70 hover:border-[#ff2b2b] text-white h-8 rounded-full font-bold text-xs transition-colors backdrop-blur-sm"
                data-testid={`button-inquire-${listing.id}`}
              >
                {isShopProduct ? <ShoppingCart className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                {ctaButtonLabel}
              </button>

              {/* Share button + dropdown */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowShareMenu((v) => !v)}
                  className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                  data-testid={`button-share-${listing.id}`}
                >
                  <Share2 className="w-3.5 h-3.5 text-white" />
                </button>

                {showShareMenu && (() => {
                  const watchUrl = getWatchableUrl(listing.videoUrl ?? "");
                  const shareTitle = `${listing.title} — ${listing.provider.displayName}`;
                  const shareText = `Check this out on Gigzito: ${shareTitle}`;

                  const handleCopyLink = () => {
                    navigator.clipboard.writeText(watchUrl).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    });
                  };

                  const handleNativeShare = () => {
                    if (navigator.share) {
                      navigator.share({ title: shareTitle, text: shareText, url: watchUrl }).catch(() => {});
                    }
                  };

                  const enc = encodeURIComponent;
                  const SHARE_PLATFORMS = [
                    {
                      label: "SMS",
                      color: "#22c55e",
                      href: `sms:?body=${enc(shareText + " " + watchUrl)}`,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                      ),
                    },
                    {
                      label: "WhatsApp",
                      color: "#25d366",
                      href: `https://wa.me/?text=${enc(shareText + " " + watchUrl)}`,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      ),
                    },
                    {
                      label: "Facebook",
                      color: "#1877f2",
                      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(watchUrl)}`,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      ),
                    },
                    {
                      label: "X / Twitter",
                      color: "#e7e7e7",
                      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(watchUrl)}`,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      ),
                    },
                    {
                      label: "Telegram",
                      color: "#2aabee",
                      href: `https://t.me/share/url?url=${enc(watchUrl)}&text=${enc(shareText)}`,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      ),
                    },
                    {
                      label: "Email",
                      color: "#a78bfa",
                      href: `mailto:?subject=${enc(shareTitle)}&body=${enc(shareText + "\n\n" + watchUrl)}`,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                      ),
                    },
                  ];

                  return (
                    <div
                      style={{
                        position: "absolute", bottom: "calc(100% + 8px)", right: 0,
                        background: "rgba(12,12,12,0.97)", backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
                        padding: "12px", minWidth: 240, zIndex: 50,
                        boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
                      }}
                      data-testid={`share-menu-${listing.id}`}
                    >
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Share</span>
                        <button onClick={() => setShowShareMenu(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 0 }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* URL preview */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {watchUrl}
                        </span>
                      </div>

                      {/* Native share (mobile) + Copy link row */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        {typeof navigator !== "undefined" && navigator.share && (
                          <button
                            onClick={handleNativeShare}
                            style={{
                              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                              background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)",
                              borderRadius: 8, padding: "7px 0", cursor: "pointer",
                            }}
                            data-testid={`button-native-share-${listing.id}`}
                          >
                            <Share2 className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                            <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Share…</span>
                          </button>
                        )}
                        <button
                          onClick={handleCopyLink}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: linkCopied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                            border: linkCopied ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8, padding: "7px 0", cursor: "pointer", transition: "all 0.2s",
                          }}
                          data-testid={`button-copy-link-${listing.id}`}
                        >
                          {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />}
                          <span style={{ fontSize: 11, color: linkCopied ? "#4ade80" : "rgba(255,255,255,0.65)", fontWeight: 600 }}>
                            {linkCopied ? "Copied!" : "Copy link"}
                          </span>
                        </button>
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: "rgba(196,20,20,0.18)", border: "1px solid rgba(196,20,20,0.38)",
                            borderRadius: 8, padding: "7px 0", textDecoration: "none",
                          }}
                          data-testid={`link-open-video-${listing.id}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                          <span style={{ fontSize: 11, color: "#fc6464", fontWeight: 600 }}>Watch</span>
                        </a>
                      </div>

                      {/* Platform grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {SHARE_PLATFORMS.map(({ label, color, href, icon }) => (
                          <a
                            key={label}
                            href={href}
                            target={label === "SMS" || label === "Email" ? "_self" : "_blank"}
                            rel="noopener noreferrer"
                            onClick={() => setShowShareMenu(false)}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              gap: 5, padding: "8px 4px", borderRadius: 10, textDecoration: "none",
                              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                              transition: "background 0.15s",
                            }}
                            data-testid={`btn-share-${label.toLowerCase().replace(/\s/g, "-")}-${listing.id}`}
                          >
                            <span style={{ color }}>{icon}</span>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex gap-2 text-[11px] text-white/50 flex-wrap" style={{ paddingRight: "64px" }}>
                {listing.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            )}
          </div>
      </div>

      {/* Comments Drawer */}
      {showComments && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowComments(false)}
            style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }}
          />
          {/* Panel */}
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 51,
              background: "#111", borderRadius: "18px 18px 0 0",
              maxHeight: "72%", display: "flex", flexDirection: "column",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.7)",
            }}
            data-testid={`comments-drawer-${listing.id}`}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #222" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Comments {commentsData.length > 0 ? `(${commentsData.length})` : ""}
              </span>
              <button
                onClick={() => setShowComments(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}
                data-testid={`button-close-comments-${listing.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comment list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {commentsData.length === 0 ? (
                <p style={{ color: "#555", fontSize: 13, textAlign: "center", marginTop: 24 }}>No comments yet. Be the first!</p>
              ) : (
                commentsData.map((c) => (
                  <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff4444" }}>{c.authorName}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{c.commentText}</span>
                    <span style={{ fontSize: 10, color: "#555" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div style={{ padding: "10px 12px 16px", borderTop: "1px solid #1e1e1e" }}>
              {user ? (
                <>
                  <p style={{ fontSize: 10, color: "#555", marginBottom: 6, lineHeight: 1.4 }}>
                    Posting as <span style={{ color: "#888" }}>{(user as any)?.user?.profile?.displayName || (user as any)?.user?.email}</span> — your name &amp; email are logged automatically.
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && commentInput.trim() && !commentMutation.isPending) commentMutation.mutate(); }}
                      placeholder="Add a comment…"
                      maxLength={300}
                      style={{
                        flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10,
                        padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none",
                      }}
                      data-testid={`input-comment-${listing.id}`}
                    />
                    <button
                      onClick={() => { if (commentInput.trim()) commentMutation.mutate(); }}
                      disabled={!commentInput.trim() || commentMutation.isPending}
                      style={{
                        background: "#ff2b2b", border: "none", borderRadius: 10, padding: "8px 14px",
                        color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        opacity: !commentInput.trim() || commentMutation.isPending ? 0.4 : 1,
                      }}
                      data-testid={`button-submit-comment-${listing.id}`}
                    >
                      Post
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#555", textAlign: "center", flex: 1 }}>
                  <a href="/auth" style={{ color: "#ff4444", textDecoration: "underline" }}>Sign in</a> to leave a comment.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showInquire && (
        <InquireLeadModal listing={listing} onClose={() => setShowInquire(false)} />
      )}
      {showGuestModal && (
        <GuestCtaModal reason="cta" onClose={() => setShowGuestModal(false)} />
      )}
    </>
  );
}
