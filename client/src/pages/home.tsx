import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryCarousel } from "@/components/category-carousel";
import { VideoCard } from "@/components/video-card";
import { MiniLivePlayer } from "@/components/mini-live-player";
import { GigJackFlashOverlay } from "@/components/gigjack-flash-overlay";
import { TodaysGigJacks } from "@/components/todays-gigjacks";
import { AllEyesBanner } from "@/components/all-eyes-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingWithProvider } from "@shared/schema";
import { ChevronUp, ChevronDown, Zap } from "lucide-react";

import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";

function readPersistedMuted(): boolean {
  try { return localStorage.getItem("gz_muted") !== "false"; } catch { return true; }
}
function persistMuted(v: boolean) {
  try { localStorage.setItem("gz_muted", String(v)); } catch {}
}

export default function HomePage() {
  const [activeVertical, setActiveVertical] = useState("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [showOffers, setShowOffers] = useState(false);

  // Global muted state — persisted in localStorage and shared across all cards
  const [globalMuted, setGlobalMuted] = useState<boolean>(readPersistedMuted);
  const globalMutedRef = useRef(globalMuted);
  const handleMuteChange = useCallback((muted: boolean) => {
    globalMutedRef.current = muted;
    setGlobalMuted(muted);
    persistMuted(muted);
  }, []);

  // Pauses the main feed when ZitoTV live audio turns on
  const [feedPaused, setFeedPaused] = useState(false);
  const feedPausedRef = useRef(false);
  useEffect(() => {
    const handler = () => {
      feedPausedRef.current = true;
      setFeedPaused(true);
    };
    window.addEventListener("zitotv-unmuted", handler);
    return () => window.removeEventListener("zitotv-unmuted", handler);
  }, []);

  const feedRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeSplash(true);
      setTimeout(() => setShowSplash(false), 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const { data: listings = [], isLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings", activeVertical],
    queryFn: async () => {
      const url = activeVertical === "ALL" ? "/api/listings" : `/api/listings?vertical=${activeVertical}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Refs that are always current — used inside wheel handler without stale closure
  const wheelCooldown   = useRef(false);
  const currentIdxRef   = useRef(0);
  const listingsLenRef  = useRef(0);
  const isScrollingRef  = useRef(false);

  useEffect(() => { listingsLenRef.current = listings.length; }, [listings]);

  // Programmatic scroll: set scrollTop directly so the snap math is exact
  const scrollToIndex = useCallback((idx: number) => {
    const container = feedRef.current;
    if (!container) return;
    const h = container.clientHeight;
    if (h === 0) return;
    const clamped = Math.max(0, Math.min(idx, listingsLenRef.current - 1));
    currentIdxRef.current = clamped;
    setCurrentIndex(clamped);
    isScrollingRef.current = true;
    container.scrollTo({ top: clamped * h, behavior: "smooth" });
    // When user explicitly navigates to a new card, resume the feed
    if (feedPausedRef.current) {
      feedPausedRef.current = false;
      setFeedPaused(false);
    }
    // Clear the "scrolling" flag after the animation completes
    setTimeout(() => { isScrollingRef.current = false; }, 600);
  }, []);

  // Wheel handler on window — intercepts before iframes can swallow events
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".category-strip") || target?.closest(".category-track")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();

      if (wheelCooldown.current) return;
      wheelCooldown.current = true;
      // Cooldown slightly longer than the smooth-scroll animation (~600ms)
      setTimeout(() => { wheelCooldown.current = false; }, 700);

      const cur  = currentIdxRef.current;
      const len  = listingsLenRef.current;
      const next = e.deltaY > 0 ? Math.min(cur + 1, len - 1) : Math.max(cur - 1, 0);
      if (next !== cur) scrollToIndex(next);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [scrollToIndex]);

  // Touch swipe handler for mobile
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".category-strip") || target?.closest(".category-track")) return;
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return; // minimum swipe distance
      if (wheelCooldown.current) return;
      wheelCooldown.current = true;
      setTimeout(() => { wheelCooldown.current = false; }, 700);
      const cur  = currentIdxRef.current;
      const len  = listingsLenRef.current;
      const next = diff > 0 ? Math.min(cur + 1, len - 1) : Math.max(cur - 1, 0);
      if (next !== cur) scrollToIndex(next);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollToIndex]);

  useEffect(() => {
    document.body.classList.add("feed-active");
    return () => document.body.classList.remove("feed-active");
  }, []);

  // Reset to top whenever the vertical changes
  useEffect(() => {
    currentIdxRef.current = 0;
    setCurrentIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activeVertical]);

  const categoryBgClass: Record<string, string> = {
    ALL:             "cat-bg-all",
    MARKETING:       "cat-bg-marketing",
    MUSIC:           "cat-bg-music",
    MUSIC_GIGS:      "cat-bg-music",
    CRYPTO:          "cat-bg-crypto",
    COACHING:        "cat-bg-coaching",
    COURSES:         "cat-bg-courses",
    EVENTS:          "cat-bg-events",
    INFLUENCERS:     "cat-bg-influencers",
    INFLUENCER:      "cat-bg-influencers",
    CORPORATE_DEALS: "cat-bg-corporate",
    GIG_BLITZ:       "cat-bg-gigblitz",
    FLASH_SALE:      "cat-bg-flash",
    FLASH_COUPONS:   "cat-bg-flash",
    FLASH_COUPON:    "cat-bg-flash",
    PRODUCTS:        "cat-bg-marketing",
  };
  const activeBgClass = categoryBgClass[activeVertical] ?? "cat-bg-all";

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden relative">
      <div className={`category-bg ${activeBgClass}`} aria-hidden="true" />

      {showSplash && (
        <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
          <img src={logoImg} alt="Gigzito" className="splash-logo" />
        </div>
      )}

      <div className="gigzito-logo-container">
        <img src={logoImg} alt="Gigzito" className="gigzito-logo-img" />
      </div>

      <MiniLivePlayer />

      <CategoryCarousel activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      <AllEyesBanner />

      {/* Feed — no onScroll handler; index is driven by wheel/touch/button, not scroll position */}
      <div
        ref={feedRef}
        className="feed-wrap feed-container flex-1"
        style={{ overflowY: "scroll", scrollSnapType: "y mandatory" }}
        data-testid="feed-container"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="space-y-4 w-full max-w-2xl mx-auto px-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-96 w-full bg-white/10 rounded-md" />
              ))}
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div className="text-white/50 space-y-2">
              <p className="text-2xl font-bold">No listings yet</p>
              <p className="text-sm">Be the first to post a video in {activeVertical === "ALL" ? "any vertical" : activeVertical.toLowerCase()}!</p>
            </div>
          </div>
        ) : (
          listings.map((listing, idx) => (
            <div
              key={listing.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              className="feed-item"
              style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
              data-testid={`listing-item-${idx}`}
            >
              <VideoCard
                listing={listing}
                className="w-full h-full"
                isActive={idx === currentIndex && !feedPaused}
                isMuted={globalMuted}
                onMuteChange={handleMuteChange}
                onEnd={() => {
                  if (idx < listings.length - 1) scrollToIndex(idx + 1);
                }}
              />
              {feedPaused && idx === currentIndex && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                  data-testid="feed-paused-overlay"
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.45)" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <rect x="5" y="4" width="4" height="16" rx="1" />
                      <rect x="15" y="4" width="4" height="16" rx="1" />
                    </svg>
                  </div>
                  <p className="text-white text-sm font-semibold text-center px-6" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    Live audio is on
                  </p>
                  <p className="text-white/70 text-xs text-center px-8" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    Scroll to the next video to resume
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      <GigJackFlashOverlay />

      {/* Today's Offers button */}
      <button
        className="fixed z-[9970] flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: "84px",
          right: "12px",
          background: "rgba(255,43,43,0.15)",
          border: "1px solid rgba(255,43,43,0.35)",
          color: "#ff2b2b",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(255,43,43,0.15)",
        }}
        onClick={() => setShowOffers(true)}
        data-testid="btn-todays-offers"
      >
        <Zap className="h-3 w-3" />
        Today's Offers
      </button>

      {/* Nav arrows (desktop) */}
      {listings.length > 1 && (
        <div className="fixed right-4 bottom-[140px] flex flex-col gap-2 z-40">
          <button
            data-testid="button-scroll-up"
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-all"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            data-testid="button-scroll-down"
            onClick={() => scrollToIndex(Math.min(listings.length - 1, currentIndex + 1))}
            disabled={currentIndex === listings.length - 1}
            className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-all"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}

      <TodaysGigJacks open={showOffers} onClose={() => setShowOffers(false)} />
    </div>
  );
}
