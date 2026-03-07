import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { CategoryCarousel } from "@/components/category-carousel";
import { VideoCard } from "@/components/video-card";
import { MiniLivePlayer } from "@/components/mini-live-player";
import { GigJackFlashOverlay } from "@/components/gigjack-flash-overlay";
import { TodaysGigJacks } from "@/components/todays-gigjacks";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingWithProvider } from "@shared/schema";
import { ChevronUp, ChevronDown, Zap } from "lucide-react";

import logoImg from "@assets/gigzito_1772574609697.jpg";

export default function HomePage() {
  const [activeVertical, setActiveVertical] = useState("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
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

  const wheelCooldown   = useRef(false);
  const currentIdxRef   = useRef(currentIndex);
  const listingsLenRef  = useRef(0);

  useEffect(() => { currentIdxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { listingsLenRef.current = listings.length; }, [listings]);

  const scrollToIndex = (idx: number) => {
    const el = itemRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentIndex(idx);
    }
  };

  const handleScroll = () => {
    if (!feedRef.current) return;
    const scrollTop = feedRef.current.scrollTop;
    const height = feedRef.current.clientHeight;
    if (height === 0) return;
    const idx = Math.round(scrollTop / height);
    setCurrentIndex(Math.max(0, Math.min(idx, listings.length - 1)));
  };

  // Wheel handler — intercepts mouse wheel anywhere on the page so the
  // iframe / overflow:hidden layers cannot swallow the event.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Let the carousel (and any other horizontally-scrollable element) handle its own scroll
      const target = e.target as Element | null;
      if (target?.closest(".category-strip") || target?.closest(".category-track")) return;
      // Also skip if the wheel is primarily horizontal (trackpad side-scroll)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      if (wheelCooldown.current) return;
      e.preventDefault();
      wheelCooldown.current = true;
      setTimeout(() => { wheelCooldown.current = false; }, 750);
      const cur  = currentIdxRef.current;
      const next = e.deltaY > 0
        ? Math.min(cur + 1, listingsLenRef.current - 1)
        : Math.max(cur - 1, 0);
      if (next !== cur) {
        const el = itemRefs.current[next];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setCurrentIndex(next);
        }
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    document.body.classList.add("feed-active");
    return () => document.body.classList.remove("feed-active");
  }, []);

  useEffect(() => {
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
      {/* Dynamic blurred category background */}
      <div className={`category-bg ${activeBgClass}`} aria-hidden="true" />

      {showSplash && (
        <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
          <img src={logoImg} alt="Gigzito" className="splash-logo" />
        </div>
      )}

      <div className="gigzito-logo">
        <img src="/gigzito-logo.png" alt="Gigzito" />
      </div>

      <MiniLivePlayer />

      {/* Category Carousel */}
      <CategoryCarousel activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      {/* Feed */}
      <div
        ref={feedRef}
        className="feed-wrap feed-container flex-1"
        onScroll={handleScroll}
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
              data-testid={`listing-item-${idx}`}
            >
              <VideoCard
                listing={listing}
                className="w-full h-full"
                isActive={idx === currentIndex}
                onEnd={() => {
                  if (idx < listings.length - 1) scrollToIndex(idx + 1);
                }}
              />
            </div>
          ))
        )}
      </div>

      <BottomNav activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      {/* GigJack flash overlay — fires platform-wide when a scheduled event is active */}
      <GigJackFlashOverlay />

      {/* Today's Offers button — bottom-right corner above nav */}
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

      {/* Nav arrows (desktop helper) */}
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

      {/* Today's GigJacks slide-up panel */}
      <TodaysGigJacks open={showOffers} onClose={() => setShowOffers(false)} />

    </div>
  );
}
