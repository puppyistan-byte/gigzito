import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Share2, Copy, Check, ShoppingCart, Tag, Timer, Info, Volume2, VolumeX } from "lucide-react";
import { InquireLeadModal } from "@/components/inquire-lead-modal";
import { VideoInfoModal } from "@/components/video-info-modal";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { useAuth } from "@/lib/auth";
import type { ListingWithProvider } from "@shared/schema";

const MAX_PLAY_SECONDS = 20;

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
  if (u.hostname === "youtu.be") return u.pathname.slice(1);
  return u.searchParams.get("v") ?? "";
}

function getVideoEmbedUrl(url: string, autoplay = false): string {
  try {
    const u = new URL(url);
    const ap = autoplay ? "1" : "0";

    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = getYouTubeId(url);
      return [
        `https://www.youtube.com/embed/${id}`,
        `?autoplay=${ap}`,
        `&mute=${ap}`,
        `&enablejsapi=1`,
        `&controls=0`,
        `&modestbranding=1`,
        `&rel=0`,
        `&iv_load_policy=3`,
        `&showinfo=0`,
        `&playsinline=1`,
        `&loop=1`,
        `&playlist=${id}`,
      ].join("");
    }

    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return [
        `https://player.vimeo.com/video/${id}`,
        `?autoplay=${ap}`,
        `&muted=${ap}`,
        `&loop=1`,
        `&background=${autoplay ? "1" : "0"}`,
      ].join("");
    }

    return url;
  } catch {
    return url;
  }
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

export function VideoCard({ listing, className = "", isActive = false, onEnd }: VideoCardProps) {
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
  const [showInfo,       setShowInfo]       = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

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
  const [isMuted,    setIsMuted]    = useState(true);

  const toggleMute = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const next = !isMuted;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
        "*"
      );
    } catch (_) {}
    setIsMuted(next);
  };

  const playSeconds = Math.min(listing.durationSeconds ?? MAX_PLAY_SECONDS, MAX_PLAY_SECONDS);

  useEffect(() => {
    if (!isActive) {
      // Stop video immediately via postMessage then blank the src
      stopIframe(iframeRef.current);
      setIframeSrc("about:blank");
      setIsMuted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeLeft(null);
      endCalledRef.current = false;
      return;
    }
    // Activate: load the autoplay URL
    setIframeSrc(getVideoEmbedUrl(listing.videoUrl, true));
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
      <div
        data-testid={`card-listing-${listing.id}`}
        className={`video-card relative w-full h-full overflow-hidden flex items-center justify-center ${className}`}
      >
        <div className={`relative h-full aspect-[9/16] max-w-[420px] w-auto flex items-center justify-center rounded-[22px] overflow-hidden ${glowClass}`}>

          {/* Poster thumbnail shown when video is not active */}
          {!isActive && posterUrl && (
            <img
              src={posterUrl}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover z-0"
              data-testid={`img-poster-${listing.id}`}
            />
          )}

          {/* Dark background fallback when no poster */}
          {!isActive && !posterUrl && (
            <div className="absolute inset-0 bg-[#0b0b0b] z-0" />
          )}

          {/* Autoplay fallback play button — only shown if autoplay failed */}
          {!isActive && autoplayFailed && (
            <button
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/30 transition-opacity"
              aria-label="Play video"
              data-testid={`button-play-${listing.id}`}
            >
              <Play className="w-10 h-10 fill-white text-white ml-1" />
            </button>
          )}

          {/* Iframe — src is controlled via state; ref used to send stop commands */}
          <iframe
            ref={iframeRef}
            key={`video-${listing.id}`}
            src={iframeSrc}
            title={listing.title}
            className="absolute inset-0 w-full h-full border-0 z-0 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 z-10 pointer-events-none" />

          {/* TOP: Duration badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/55 backdrop-blur-sm rounded-full px-2 py-0.5" data-testid={`badge-duration-${listing.id}`}>
            <Clock className="w-2.5 h-2.5 text-white/70" />
            <span className="text-white/80 text-[10px] font-semibold">{listing.durationSeconds}s</span>
          </div>

          {/* Mute / Unmute toggle — tap to hear sound */}
          {isActive && (
            <button
              onClick={toggleMute}
              className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/65 hover:bg-black/80 backdrop-blur-sm rounded-full px-2.5 py-1 transition-colors cursor-pointer"
              data-testid={`button-mute-${listing.id}`}
              title={isMuted ? "Tap to unmute" : "Tap to mute"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3 h-3 text-white/70" />
                  <span className="text-white/70 text-[10px] font-semibold">Tap for sound</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-white" />
                  <span className="text-white text-[10px] font-semibold">Sound on</span>
                </>
              )}
            </button>
          )}

          {/* FLOATING CREATOR AVATAR */}
          <Link href={`/provider/${listing.provider.id}`}>
            <div
              className="absolute bottom-[76px] right-4 z-30 cursor-pointer"
              data-testid={`avatar-creator-${listing.id}`}
              title={`View ${provider.displayName}'s profile`}
              style={{ transition: "transform 0.15s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.5)",
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)",
                  background: "#1a1a1a",
                  flexShrink: 0,
                }}
              >
                {provider.avatarUrl ? (
                  <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "15px", fontWeight: "700" }}>
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* BOTTOM: Info & CTAs */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 z-20 space-y-2.5">

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

            {/* Title + Description */}
            <div>
              <h4 className="font-bold text-base leading-snug text-white drop-shadow-md">{listing.title}</h4>
              {listing.description && (
                <p className="text-[12px] text-white/80 line-clamp-2 leading-relaxed mt-0.5 drop-shadow-sm">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Action Row: CTA · Info · Share */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCtaClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#c41414] hover:bg-[#a51010] text-white h-8 rounded-full font-bold text-xs transition-colors"
                data-testid={`button-inquire-${listing.id}`}
              >
                {isShopProduct ? <ShoppingCart className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                {ctaButtonLabel}
              </button>
              <button
                onClick={() => setShowInfo(true)}
                className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm flex items-center justify-center gap-1.5 text-white font-bold text-xs flex-shrink-0 transition-colors"
                data-testid={`button-info-${listing.id}`}
              >
                <Info className="w-3.5 h-3.5" />
                Info
              </button>
              <button
                onClick={() => handleShare(listing)}
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 transition-colors"
                data-testid={`button-share-${listing.id}`}
              >
                <Share2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex gap-2 text-[11px] text-white/50 flex-wrap">
                {listing.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInquire && (
        <InquireLeadModal listing={listing} onClose={() => setShowInquire(false)} />
      )}
      {showInfo && (
        <VideoInfoModal listing={listing} onClose={() => setShowInfo(false)} onInquire={handleCtaClick} />
      )}
      {showGuestModal && (
        <GuestCtaModal reason="cta" onClose={() => setShowGuestModal(false)} />
      )}
    </>
  );
}
