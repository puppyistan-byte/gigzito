import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { VideoCard } from "@/components/video-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ListingWithProvider } from "@shared/schema";
import { ChevronUp, ChevronDown } from "lucide-react";

const VERTICALS = [
  { key: "ALL", label: "All" },
  { key: "MARKETING", label: "Marketing" },
  { key: "COACHING", label: "Coaching" },
  { key: "COURSES", label: "Courses" },
];

export default function HomePage() {
  const [activeVertical, setActiveVertical] = useState("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    const idx = Math.round(scrollTop / height);
    setCurrentIndex(Math.max(0, Math.min(idx, listings.length - 1)));
  };

  useEffect(() => {
    setCurrentIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activeVertical]);

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="bg-black/95 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-2xl mx-auto flex h-12 items-center justify-between px-4">
          <span className="font-bold text-lg text-white flex items-center gap-1.5">
            <span className="text-primary">⚡</span> Gigzito
          </span>
          <div className="flex gap-1">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                data-testid={`filter-${v.key.toLowerCase()}`}
                onClick={() => setActiveVertical(v.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeVertical === v.key
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <a href="/auth" className="text-white/60 hover:text-white text-xs">Sign in</a>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="feed-container flex-1"
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
              <p className="text-2xl">No listings yet</p>
              <p className="text-sm">Be the first to post a video in {activeVertical === "ALL" ? "any vertical" : activeVertical.toLowerCase()}!</p>
            </div>
          </div>
        ) : (
          listings.map((listing, idx) => (
            <div
              key={listing.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              className="feed-item w-full h-screen overflow-hidden"
              data-testid={`listing-item-${idx}`}
            >
              <VideoCard listing={listing} className="h-full w-full" />
            </div>
          ))
        )}
      </div>

      {/* Nav arrows (desktop helper) */}
      {listings.length > 1 && (
        <div className="fixed right-4 bottom-20 flex flex-col gap-2 z-40">
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

      {/* Counter */}
      {listings.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white/70 text-xs px-3 py-1 rounded-full z-40" data-testid="text-counter">
          {currentIndex + 1} / {listings.length}
        </div>
      )}
    </div>
  );
}
