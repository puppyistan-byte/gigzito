import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Share2, Copy, Check, ShoppingCart, Tag, Timer, Volume2, VolumeX, Heart, X } from "lucide-react";
import { InquireLeadModal } from "@/components/inquire-lead-modal";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
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
          <Button size="sm" onClick={onGuestAction} className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-7 px-3 rounded-full font-bold text-xs gap-1" data-testid="button-buy-product">
            <ShoppingCart className="w-3 h-3" /> Buy Now
          </Button>
        ) : (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-7 px-3 rounded-full font-bold text-xs gap-1" asChild data-testid="button-buy-product">
            <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">
              <ShoppingCart className="w-3 h-3" /> Buy Now
            </a>
          </Button>
        )
      )}
    </div>
  );
}

export function VideoCard({ listing, className = "", isActive = false, onEnd, isMuted = true, onMuteChange }: VideoCardProps) {
  const { user } = useAuth();
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

  const { data: likeData } = useQuery<{ likeCount: number; isLiked: boolean }>({
    queryKey: [`/api/videos/${listing.id}/likes`],
    staleTime: 60_000,
  });

  const isLiked = optimisticLiked ?? likeData?.isLiked ?? false;
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
  const [iframeSrc,  setIframeSrc]  = useState("about:blank");
  const [videoBlocked, setVideoBlocked] = useState(false);

  // Keep a ref to the current muted state so the iframe postMessage always uses the latest value
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const toggleMute = () => {
    const iframe = iframeRef.current;
    const next = !isMuted;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
          "*"
        );
      } catch (_) {}
    }
    onMuteChange?.(next);
  };

  const playSeconds = Math.min(listing.durationSeconds ?? MAX_PLAY_SECONDS, MAX_PLAY_SECONDS);

  // Reset blocked state when switching videos
  useEffect(() => {
    setVideoBlocked(false);
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
    if (!isActive) {
      stopIframe(iframeRef.current);
      setIframeSrc("about:blank");
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeLeft(null);
      endCalledRef.current = false;
      return;
    }
    // Activate: load the autoplay URL, honouring the current global muted preference
    setIframeSrc(getVideoEmbedUrl(listing.videoUrl, true, isMutedRef.current));
    endCalledRef.current = false;
    setTimeLeft(playSeconds);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, playSeconds - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && !endCalledRef.current) {
        endCalledRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onEnd?.();
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

          {/* Iframe — only mounted when active; unmounting fully kills browser audio */}
          {iframeSrc !== "about:blank" && <iframe
            ref={iframeRef}
            key={`video-${listing.id}`}
            src={iframeSrc}
            title={listing.title}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", border: "none", zIndex: 0, pointerEvents: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />}

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
                href={getWatchableUrl(listing.videoUrl)}
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
                position: "absolute", bottom: 196, right: 12, zIndex: 30,
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
            style={{ position: "absolute", bottom: 132, right: 12, zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
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
              {likeCount > 0 ? likeCount.toLocaleString() : ""}
            </span>
          </div>

          {/* FLOATING CREATOR AVATAR */}
          <Link href={`/provider/${listing.provider.id}`}>
            <div
              style={{ position: "absolute", bottom: 76, right: 16, zIndex: 30, cursor: "pointer", transition: "transform 0.15s ease" }}
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
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#c41414] hover:bg-[#a51010] text-white h-8 rounded-full font-bold text-xs transition-colors"
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
                  const watchUrl = getWatchableUrl(listing.videoUrl);
                  const handleCopyLink = () => {
                    navigator.clipboard.writeText(watchUrl).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    });
                  };
                  return (
                    <div
                      style={{
                        position: "absolute", bottom: "calc(100% + 8px)", right: 0,
                        background: "rgba(15,15,15,0.96)", backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
                        padding: "10px 12px", minWidth: 220, zIndex: 50,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                      }}
                      data-testid={`share-menu-${listing.id}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Source Video</span>
                        <button onClick={() => setShowShareMenu(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {watchUrl}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={handleCopyLink}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: linkCopied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)",
                            border: linkCopied ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8, padding: "6px 0", cursor: "pointer", transition: "all 0.2s",
                          }}
                          data-testid={`button-copy-link-${listing.id}`}
                        >
                          {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/70" />}
                          <span style={{ fontSize: 11, color: linkCopied ? "rgba(74,222,128,1)" : "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                            {linkCopied ? "Copied!" : "Copy link"}
                          </span>
                        </button>
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            background: "rgba(196,20,20,0.2)", border: "1px solid rgba(196,20,20,0.4)",
                            borderRadius: 8, padding: "6px 0", textDecoration: "none",
                          }}
                          data-testid={`link-open-video-${listing.id}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                          <span style={{ fontSize: 11, color: "rgba(252,100,100,1)", fontWeight: 600 }}>Watch</span>
                        </a>
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
