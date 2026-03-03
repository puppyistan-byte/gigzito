import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Play } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

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
      className={`feed-item flex flex-col w-full h-full bg-black ${className}`}
    >
      {/* Video embed */}
      <div className="relative flex-1 bg-black">
        <iframe
          src={embedUrl}
          title={listing.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Info overlay at bottom */}
      <div className="bg-gradient-to-t from-black/90 to-transparent p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${VERTICAL_COLORS[listing.vertical]}`}>
            {VERTICAL_LABELS[listing.vertical]}
          </span>
          <span className="text-xs text-white/60 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {listing.durationSeconds}s
          </span>
        </div>

        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">{listing.title}</h3>

        {listing.description && (
          <p className="text-white/70 text-xs line-clamp-2">{listing.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link href={`/listing/${listing.id}`}>
            <a data-testid={`link-provider-${listing.id}`} className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={provider.avatarUrl} alt={provider.displayName} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-white/90 text-xs font-medium truncate">{provider.displayName || "Provider"}</span>
            </a>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {listing.ctaUrl && (
              <a href={listing.ctaUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-cta-${listing.id}`}>
                <Button size="sm" variant="default" className="h-7 text-xs px-2">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Learn more
                </Button>
              </a>
            )}
            <Link href={`/listing/${listing.id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-white/20 text-white" data-testid={`link-detail-${listing.id}`}>
                <Play className="h-3 w-3 mr-1" />
                Detail
              </Button>
            </Link>
          </div>
        </div>

        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {listing.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-white/50">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
