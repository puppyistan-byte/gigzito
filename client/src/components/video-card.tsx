import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Share2 } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

interface VideoCardProps {
  listing: ListingWithProvider;
  className?: string;
}

const VERTICAL_COLORS: Record<string, string> = {
  MARKETING: "bg-orange-500 text-white",
  COACHING:  "bg-violet-600 text-white",
  COURSES:   "bg-emerald-500 text-white",
  MUSIC:     "bg-purple-600 text-white",
  CRYPTO:    "bg-yellow-500 text-white",
};

const VERTICAL_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  COACHING:  "Coaching",
  COURSES:   "Courses",
  MUSIC:     "Music",
  CRYPTO:    "Crypto",
};

const VERTICAL_CSS: Record<string, string> = {
  MARKETING: "video-marketing",
  COACHING:  "video-coaching",
  COURSES:   "video-courses",
  MUSIC:     "video-music",
  CRYPTO:    "video-crypto",
};


function getVideoEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.pathname.includes("/embed/")) return url;
      if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      else id = u.searchParams.get("v") ?? "";
      return `https://www.youtube.com/embed/${id}?autoplay=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

function handleShare(listing: ListingWithProvider) {
  const text = `${listing.title} by ${listing.provider.displayName}`;
  if (navigator.share) {
    navigator.share({ title: text, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
  }
}

export function VideoCard({ listing, className = "" }: VideoCardProps) {
  const provider = listing.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  const embedUrl = getVideoEmbedUrl(listing.videoUrl);
  const verticalColor = VERTICAL_COLORS[listing.vertical] ?? "bg-gray-500 text-white";
  const verticalCss  = VERTICAL_CSS[listing.vertical]  ?? "";

  return (
    <div
      data-testid={`card-listing-${listing.id}`}
      className={`video-card ${verticalCss} relative w-full h-full overflow-hidden flex items-center justify-center ${className}`}
    >
      <div className="relative h-full aspect-[9/16] max-w-[420px] w-auto flex items-center justify-center rounded-[22px] overflow-hidden group">

        {/* Video */}
        <iframe
          src={embedUrl}
          title={listing.title}
          className="absolute inset-0 w-full h-full border-0 z-0 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 z-10 pointer-events-none" />

        {/* ── TOP: Avatar + Provider name + Duration ── */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/30 flex-shrink-0">
            <AvatarImage src={provider.avatarUrl ?? ""} alt={provider.displayName} />
            <AvatarFallback className="bg-primary text-white text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-tight drop-shadow truncate">
              {provider.displayName}
            </p>
            {provider.bio && (
              <p className="text-white/65 text-[11px] leading-tight truncate">
                {provider.bio}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 flex-shrink-0">
            <Clock className="w-3 h-3 text-white/80" />
            <span className="text-white/80 text-[10px] font-semibold">{listing.durationSeconds}s</span>
          </div>
        </div>

        {/* ── CENTER: Hover play button ── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/30">
            <Play className="w-8 h-8 fill-white text-white ml-1" />
          </div>
        </div>

        {/* ── BOTTOM: All info & CTAs ── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 z-20 space-y-3">

          {/* Vertical badge */}
          <div>
            <Badge className={`${verticalColor} text-[10px] px-2.5 py-0.5 uppercase font-bold border-0 tracking-wide`}>
              {VERTICAL_LABELS[listing.vertical]}
            </Badge>
          </div>

          {/* Title + Description */}
          <div>
            <h4 className="font-bold text-base leading-snug text-white drop-shadow-md">
              {listing.title}
            </h4>
            {listing.description && (
              <p className="text-[12px] text-white/80 line-clamp-2 leading-relaxed mt-0.5 drop-shadow-sm">
                {listing.description}
              </p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            {listing.ctaUrl && (
              <Button
                size="sm"
                className="bg-[#c41414] hover:bg-[#a51010] text-white border-0 h-8 px-4 rounded-full font-bold gap-1.5 text-xs flex-1"
                asChild
                data-testid={`button-cta-${listing.id}`}
              >
                <a href={listing.ctaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visit
                </a>
              </Button>
            )}
            <Link href={`/listing/${listing.id}`}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 h-8 px-4 rounded-full font-bold gap-1.5 text-xs backdrop-blur-sm"
                data-testid={`button-details-${listing.id}`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Details
              </Button>
            </Link>
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
              {listing.tags.slice(0, 3).map(tag => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
