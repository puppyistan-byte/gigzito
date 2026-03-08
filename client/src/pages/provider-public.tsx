import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Globe, Instagram, Youtube, Mail, Phone, MessageCircle } from "lucide-react";
import { SiTiktok, SiFacebook, SiDiscord, SiX } from "react-icons/si";
import type { ProviderProfile, ListingWithProvider } from "@shared/schema";

export default function ProviderPublicPage() {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery<ProviderProfile>({
    queryKey: ["/api/profile", id],
    queryFn: () => fetch(`/api/profile/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings/provider", id],
    queryFn: () => fetch(`/api/listings?provider=${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const p = profile as any;

  const photos = profile
    ? [p.photo1Url, p.photo2Url, p.photo3Url, p.photo4Url, p.photo5Url, p.photo6Url].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="link-back-to-main">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Main
        </Link>

        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-[#111] rounded-2xl" />
            <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
          </div>
        ) : !profile || (profile as any).message === "Not found" ? (
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center">
            <p className="text-[#555]">Creator not found.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
              {profile.thumbUrl && (
                <div className="h-40 w-full overflow-hidden">
                  <img src={profile.thumbUrl} alt="" className="w-full h-full object-cover opacity-60" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-end gap-4 -mt-2">
                  <div
                    style={{
                      width: "64px", height: "64px", borderRadius: "50%",
                      border: "3px solid #ff2b2b", overflow: "hidden", background: "#1a1a1a", flexShrink: 0,
                    }}
                    data-testid="img-provider-avatar"
                  >
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "20px", fontWeight: "700" }}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <h1 className="text-lg font-bold text-white truncate" data-testid="text-provider-name">{profile.displayName}</h1>
                    {profile.username && (
                      <p className="text-xs text-[#555]">@{profile.username}</p>
                    )}
                  </div>
                  {profile.primaryCategory && (
                    <Badge className="bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/25 text-xs shrink-0">
                      {profile.primaryCategory.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-sm text-[#aaa] mt-3 leading-relaxed">{profile.bio}</p>
                )}

                {profile.location && (
                  <p className="flex items-center gap-1.5 text-xs text-[#555] mt-2">
                    <MapPin className="h-3 w-3" /> {profile.location}
                  </p>
                )}

                {/* Contact links */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.websiteUrl && (
                    <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-website">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                  {profile.contactEmail && (
                    <a href={`mailto:${profile.contactEmail}`}
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-email">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                  )}
                  {profile.contactPhone && (
                    <a href={`tel:${profile.contactPhone}`}
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-phone">
                      <Phone className="h-3.5 w-3.5" /> {profile.contactPhone}
                    </a>
                  )}
                  {profile.contactTelegram && (
                    <a href={`https://t.me/${profile.contactTelegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                      data-testid="link-telegram">
                      <MessageCircle className="h-3.5 w-3.5" /> Telegram
                    </a>
                  )}
                </div>

                {/* Social icons row */}
                {(profile.instagramUrl || profile.youtubeUrl || profile.tiktokUrl || p.facebookUrl || p.discordUrl || p.twitterUrl) && (
                  <div className="flex items-center gap-1 mt-3">
                    {profile.instagramUrl && (
                      <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#E1306C]"
                        title="Instagram" data-testid="link-instagram">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {profile.youtubeUrl && (
                      <a href={profile.youtubeUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#FF0000]"
                        title="YouTube" data-testid="link-youtube">
                        <Youtube className="h-4 w-4" />
                      </a>
                    )}
                    {profile.tiktokUrl && (
                      <a href={profile.tiktokUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-white"
                        title="TikTok" data-testid="link-tiktok">
                        <SiTiktok className="h-4 w-4" />
                      </a>
                    )}
                    {p.facebookUrl && (
                      <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#1877F2]"
                        title="Facebook" data-testid="link-facebook">
                        <SiFacebook className="h-4 w-4" />
                      </a>
                    )}
                    {p.discordUrl && (
                      <a href={p.discordUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-[#5865F2]"
                        title="Discord" data-testid="link-discord">
                        <SiDiscord className="h-4 w-4" />
                      </a>
                    )}
                    {p.twitterUrl && (
                      <a href={p.twitterUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-white"
                        title="X / Twitter" data-testid="link-twitter">
                        <SiX className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
                <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Photos</h2>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-[#111] block border border-[#1e1e1e] hover:border-[#333] transition-colors"
                      data-testid={`img-gallery-${i + 1}`}>
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Listings */}
            {listingsLoading ? (
              <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
            ) : listings.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Videos</h2>
                {listings.map((l) => (
                  <div key={l.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid={`listing-card-${l.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{l.title}</p>
                        {l.description && <p className="text-xs text-[#666] mt-1 line-clamp-2">{l.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className="bg-[#ff2b2b]/10 text-[#ff2b2b] border border-[#ff2b2b]/20 text-xs">
                            {l.vertical.replace(/_/g, " ")}
                          </Badge>
                          {l.tags?.map((tag) => (
                            <span key={tag} className="text-xs text-[#555]">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
