import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tv, Lock } from "lucide-react";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { useAuth } from "@/lib/auth";
import type { ListingWithProvider } from "@shared/schema";

function getVideoEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.pathname.includes("/embed/")) return url;
      let id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") ?? "";
      return `https://www.youtube.com/embed/${id}?autoplay=0&controls=0&modestbranding=1&rel=0`;
    }
    return url;
  } catch { return url; }
}

export default function ZitoTVPage() {
  const { user } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const { data: listings = [], isLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings"],
  });

  const listing = listings[currentIdx];

  return (
    <div className="min-h-screen bg-black flex flex-col" data-testid="page-zito-tv">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "rgba(255,43,43,0.2)", background: "#000" }}
      >
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-[#ff2b2b]" />
          <span className="text-white font-bold text-lg tracking-tight">Zito TV</span>
          <span className="text-[10px] text-[#ff2b2b] bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-2 py-0.5 font-bold ml-1">PUBLIC</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/">
              <span className="text-xs text-[#ff2b2b] font-semibold cursor-pointer hover:underline">Full Feed →</span>
            </Link>
          ) : (
            <button
              onClick={() => setShowGuestModal(true)}
              className="text-xs bg-[#ff2b2b] text-white font-bold px-3 py-1.5 rounded-full"
              data-testid="button-zito-tv-join"
            >
              Join Free
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 relative overflow-hidden" ref={feedRef}>
        {isLoading || !listing ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#ff2b2b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center relative">
            {/* Video */}
            <div className="relative w-full h-full max-w-[420px] mx-auto flex items-center justify-center">
              <div className="relative h-full aspect-[9/16] max-w-[420px] w-auto rounded-[22px] overflow-hidden bg-black">
                <iframe
                  src={getVideoEmbedUrl(listing.videoUrl)}
                  title={listing.title}
                  className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />

                {/* Locked CTA overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                  <p className="text-white font-bold text-base">{listing.title}</p>
                  <p className="text-white/60 text-xs">{listing.provider.displayName}</p>
                  {/* Locked action */}
                  <button
                    onClick={() => setShowGuestModal(true)}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-full font-bold text-sm text-white/60 border border-white/20 bg-black/40 backdrop-blur-sm"
                    data-testid="button-zito-tv-locked-cta"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Join to Inquire
                  </button>
                </div>
              </div>
            </div>

            {/* Nav arrows */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white disabled:opacity-30"
                data-testid="button-zito-tv-prev"
              >▲</button>
              <button
                onClick={() => setCurrentIdx((i) => Math.min(listings.length - 1, i + 1))}
                disabled={currentIdx >= listings.length - 1}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white disabled:opacity-30"
                data-testid="button-zito-tv-next"
              >▼</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="px-5 py-3 border-t text-center"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "#000" }}
      >
        <p className="text-[11px] text-[#555]">
          Zito TV is a public broadcast view. <button onClick={() => setShowGuestModal(true)} className="text-[#ff2b2b] font-semibold" data-testid="button-zito-tv-join-bottom">Create a free account</button> to interact with creators.
        </p>
      </div>

      {showGuestModal && <GuestCtaModal reason="general" onClose={() => setShowGuestModal(false)} />}
    </div>
  );
}
