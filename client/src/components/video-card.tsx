import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play, Share2, Youtube } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

import logoImg from "@assets/file_00000000e17471fdb85cd1f020d6f5a2_1772560922928.png";

interface VideoCardProps {
  listing: ListingWithProvider;
  className?: string;
}

const VERTICAL_COLORS: Record<string, string> = {
  MARKETING: "bg-orange-500 text-white",
  COACHING: "bg-orange-500 text-white",
  COURSES: "bg-orange-500 text-white",
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

export function VideoCard({ listing, className = "" }: VideoCardProps) {
  const provider = listing.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  const embedUrl = getVideoEmbedUrl(listing.videoUrl);

  return (
    <div
      data-testid={`card-listing-${listing.id}`}
      className={`video-card relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* Video Container (Inner) enforced 9:16 */}
      <div className="relative h-full aspect-[9/16] max-w-[420px] w-auto bg-black flex items-center justify-center rounded-[22px] overflow-hidden group">
        <iframe
          src={embedUrl}
          title={listing.title}
          className="absolute inset-0 w-full h-full border-0 z-0 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />

        {/* Top Info */}
        <div className="absolute top-5 left-5 right-5 z-20 flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            <AvatarImage src={provider.avatarUrl} alt={provider.displayName} />
            <AvatarFallback className="bg-primary text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm truncate drop-shadow-md">
              {provider.displayName} - {listing.title}
            </h3>
            <p className="text-white/80 text-xs truncate drop-shadow-sm">{provider.displayName}</p>
          </div>
        </div>

        {/* Center Play Button (Visual only) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl scale-110">
            <Play className="w-8 h-8 fill-white text-white ml-1" />
          </div>
        </div>

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-4 z-20">
          <div className="flex items-center gap-3">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] px-2 py-0 uppercase font-bold border-0 text-white">
              {VERTICAL_LABELS[listing.vertical]}
            </Badge>
            <div className="flex items-center gap-1 text-[10px] text-white/90 font-medium">
              <Clock className="w-3 h-3" />
              {listing.durationSeconds}s
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg leading-tight mb-1 text-white drop-shadow-md">
              {listing.title}
            </h4>
            {listing.description && (
              <p className="text-sm text-white/90 line-clamp-2 leading-relaxed drop-shadow-sm">
                {listing.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-1 ring-white/20">
              <AvatarImage src={provider.avatarUrl} alt={provider.displayName} />
              <AvatarFallback className="bg-primary text-white text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-white truncate drop-shadow-sm">{provider.displayName}</span>

            <div className="flex gap-2 ml-auto">
              {listing.ctaUrl && (
                <Button size="sm" className="bg-[#6366f1] hover:bg-[#4f46e5] text-white border-0 h-9 px-4 rounded-lg font-bold gap-2" asChild>
                  <a href={listing.ctaUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Visit
                  </a>
                </Button>
              )}
              <Link href={`/listing/${listing.id}`}>
                <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 h-9 px-4 rounded-lg font-bold gap-2 backdrop-blur-sm">
                  <Play className="w-4 h-4 fill-white" />
                  Details
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex gap-3 text-xs text-white/60">
              {listing.tags?.slice(0, 3).map(tag => (
                <span key={tag}>#{tag}</span>
              ))}
              {(!listing.tags || listing.tags.length === 0) && (
                <>
                  <span>#gigzito</span>
                  <span>#provider</span>
                  <span>#featured</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-white/60 cursor-pointer hover:text-white" />
              <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-[10px] font-bold text-white">Watch on</span>
                <Youtube className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
