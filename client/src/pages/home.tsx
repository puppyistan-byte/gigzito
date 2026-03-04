import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { VideoCard } from "@/components/video-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingWithProvider } from "@shared/schema";
import { ChevronUp, ChevronDown } from "lucide-react";

import logoImg from "@assets/gigzito_1772574609697.jpg";

export default function HomePage() {
  const [activeVertical, setActiveVertical] = useState("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
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
      return res.json();
    },
  });

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

  useEffect(() => {
    document.body.classList.add("feed-active");
    return () => document.body.classList.remove("feed-active");
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activeVertical]);

  return (
    <div className="app-shell flex flex-col h-screen bg-white overflow-hidden relative">
      {showSplash && (
        <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
          <img src={logoImg} alt="Gigzito" className="splash-logo" />
        </div>
      )}

      <div className="gigzito-logo">
        <img src="/gigzito-logo-v2.jpg" alt="Gigzito" />
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="feed-wrap feed-container flex-1 bg-white"
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
              <VideoCard listing={listing} className="w-full h-full" />
            </div>
          ))
        )}
      </div>

      <BottomNav activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      {/* Nav arrows (desktop helper) */}
      {listings.length > 1 && (
        <div className="fixed right-4 bottom-24 flex flex-col gap-2 z-40">
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

    </div>
  );
}
