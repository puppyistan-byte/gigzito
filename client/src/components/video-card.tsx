import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Zap } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

import logoImg from "@assets/-4983491643960921006_121_911912317239584_1772551793308.jpg";

interface VideoCardProps {
  listing: ListingWithProvider;
  className?: string;
}

const VERTICAL_COLORS: Record<string, string> = {
  MARKETING: "bg-blue-500/20 text-blue-400 dark:text-blue-300",
  COACHING: "bg-green-500/20 text-green-500 dark:text-green-300",
  COURSES: "bg-amber-500/20 text-amber-500 dark:text-amber-300",
};

const VERTICAL_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  COACHING: "Coaching",
  COURSES: "Courses",
};

function getVideoEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.pathname.includes("/embed/")) return url;
      if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      else id = u.searchParams.get("v") ?? "";
      return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
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

export function VideoCard({ listing, className = "" }: VideoCardProps) {
  const provider = listing.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  const embedUrl = getVideoEmbedUrl(listing.videoUrl);

  return (
    <div
      data-testid={`card-listing-${listing.id}`}
      className={`feed-item relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* Video Container (Inner) enforced 9:16 */}
      <div className="relative h-full aspect-[9/16] max-w-[420px] w-auto bg-black flex items-center justify-center">
        <iframe
          src={embedUrl}
          title={listing.title}
          className="absolute inset-0 w-full h-full border-0 z-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />

        {/* Gigzito Watermark - High Z-index to appear over iframe */}
        <div 
          className="absolute bottom-6 right-6 opacity-30 pointer-events-none select-none z-30 flex items-center gap-1.5 filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" 
          aria-hidden="true"
        >
          <img src={logoImg} alt="" className="h-6 w-auto brightness-0 invert" />
        </div>

        {/* Info overlay at bottom (inside the 9:16 frame for TikTok feel) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 pb-12 space-y-2 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${VERTICAL_COLORS[listing.vertical]}`}>
              {VERTICAL_LABELS[listing.vertical]}
            </span>
            <span className="text-[10px] text-white/60 flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" />
              {listing.durationSeconds}s
            </span>
          </div>

          <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-md">{listing.title}</h3>

          {listing.description && (
            <p className="text-white/80 text-xs line-clamp-2 drop-shadow-sm">{listing.description}</p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link href={`/listing/${listing.id}`}>
              <a data-testid={`link-provider-${listing.id}`} className="flex items-center gap-2 min-w-0 group">
                <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/20 group-hover:ring-primary transition-all">
                  <AvatarImage src={provider.avatarUrl} alt={provider.displayName} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-white text-xs font-semibold truncate drop-shadow-sm">{provider.displayName || "Provider"}</span>
              </a>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {listing.ctaUrl && (
                <a href={listing.ctaUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-cta-${listing.id}`}>
                  <Button size="sm" variant="default" className="h-8 text-xs px-3 font-bold shadow-lg">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Visit
                  </Button>
                </a>
              )}
              <Link href={`/listing/${listing.id}`}>
                <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 font-bold" data-testid={`link-detail-${listing.id}`}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Details
                </Button>
              </Link>
            </div>
          </div>

          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {listing.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-white/40 font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
