import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Clock, Mail, Phone, Globe, MessageCircle } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

const VERTICAL_LABELS: Record<string, string> = { MARKETING: "Marketing", COACHING: "Coaching", COURSES: "Courses" };

function getVideoEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.pathname.includes("/embed/")) return url;
      let id = "";
      if (u.pathname.includes("/shorts/")) id = u.pathname.split("/shorts/")[1].split("?")[0];
      else if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("?")[0];
      else id = u.searchParams.get("v") ?? "";
      if (!id) return url;
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`;
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

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: listing, isLoading } = useQuery<ListingWithProvider>({
    queryKey: ["/api/listings", id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Listing not found.</p>
          <Link href="/"><Button variant="outline" className="mt-4">Back to Feed</Button></Link>
        </div>
      </div>
    );
  }

  const provider = listing.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";
  const embedUrl = listing.videoUrl ? getVideoEmbedUrl(listing.videoUrl) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Link href="/">
          <a data-testid="link-back" className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </a>
        </Link>

        {/* Video or Text Ad */}
        {embedUrl ? (
          <div className="aspect-video w-full rounded-md overflow-hidden bg-black" data-testid="video-player">
            <iframe
              src={embedUrl}
              title={listing.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full rounded-md overflow-hidden bg-[#0f0f0f] border border-[#1e1e1e] p-8 flex flex-col items-center justify-center gap-4 min-h-[160px]" data-testid="text-ad-display">
            <div className="text-3xl">📢</div>
            <p className="text-white font-bold text-lg text-center">{listing.title}</p>
            {listing.description && <p className="text-[#888] text-sm text-center max-w-sm leading-relaxed">{listing.description}</p>}
          </div>
        )}

        {/* Title and tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-vertical">{VERTICAL_LABELS[listing.vertical]}</Badge>
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {listing.durationSeconds} seconds
            </span>
          </div>
          <h1 className="text-xl font-bold" data-testid="text-listing-title">{listing.title}</h1>
          {listing.description && (
            <p className="text-muted-foreground text-sm" data-testid="text-listing-description">{listing.description}</p>
          )}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.tags.map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
          {listing.ctaUrl && (
            <a href={listing.ctaUrl} target="_blank" rel="noopener noreferrer" data-testid="link-cta">
              <Button className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn more / Get started
              </Button>
            </a>
          )}
        </div>

        {/* Provider card */}
        <Card className="p-4" data-testid="card-provider">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={provider.avatarUrl} alt={provider.displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" data-testid="text-provider-name">{provider.displayName || "Provider"}</p>
              {provider.bio && <p className="text-muted-foreground text-sm mt-0.5 line-clamp-3">{provider.bio}</p>}
            </div>
          </div>

          {/* Contact methods */}
          <div className="mt-3 flex flex-wrap gap-2">
            {provider.contactEmail && (
              <a href={`mailto:${provider.contactEmail}`} data-testid="link-contact-email">
                <Button size="sm" variant="outline" className="h-8">
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Email
                </Button>
              </a>
            )}
            {provider.contactPhone && (provider as any).showPhone && (
              <a href={`tel:${provider.contactPhone}`} data-testid="link-contact-phone">
                <Button size="sm" variant="outline" className="h-8">
                  <Phone className="h-3.5 w-3.5 mr-1.5" />
                  Call
                </Button>
              </a>
            )}
            {provider.contactTelegram && (
              <a href={`https://t.me/${provider.contactTelegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" data-testid="link-contact-telegram">
                <Button size="sm" variant="outline" className="h-8">
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Telegram
                </Button>
              </a>
            )}
            {provider.websiteUrl && (
              <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" data-testid="link-contact-website">
                <Button size="sm" variant="outline" className="h-8">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  Website
                </Button>
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
