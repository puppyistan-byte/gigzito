import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Search, ExternalLink, Mail, Globe, Phone,
  ArrowLeft, AlertTriangle, ChevronRight,
} from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

const VERTICAL_LABELS: Record<string, string> = {
  MARKETING: "Marketing", COACHING: "Coaching", COURSES: "Courses",
  MUSIC: "Music", CRYPTO: "Crypto", INFLUENCER: "Influencer",
  PRODUCTS: "Products", FLASH_SALE: "Flash Sale", FLASH_COUPON: "Flash Coupon",
  MUSIC_GIGS: "Music Gigs", EVENTS: "Events", CORPORATE_DEALS: "Corporate",
};

const VERTICAL_COLORS: Record<string, string> = {
  MARKETING:   "bg-blue-500/20 text-blue-400",
  COACHING:    "bg-purple-500/20 text-purple-400",
  COURSES:     "bg-teal-500/20 text-teal-400",
  MUSIC:       "bg-pink-500/20 text-pink-400",
  CRYPTO:      "bg-amber-500/20 text-amber-400",
  INFLUENCER:  "bg-rose-500/20 text-rose-400",
  PRODUCTS:    "bg-green-500/20 text-green-400",
  FLASH_SALE:  "bg-red-500/20 text-red-400",
  FLASH_COUPON:"bg-emerald-500/20 text-emerald-400",
  MUSIC_GIGS:  "bg-violet-500/20 text-violet-400",
  EVENTS:      "bg-cyan-500/20 text-cyan-400",
  CORPORATE_DEALS: "bg-slate-500/20 text-slate-400",
};

function GigCard({ listing }: { listing: ListingWithProvider }) {
  const provider = listing.provider;
  const vertical = listing.vertical;
  const reason = (listing as any).triagedReason;

  return (
    <div
      className="group rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-all overflow-hidden"
      data-testid={`card-gigcard-${listing.id}`}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-orange-500/60 to-amber-500/40" />

      <div className="p-5 space-y-4">
        {/* Header: avatar + name + category */}
        <div className="flex items-start gap-3">
          {provider?.avatarUrl ? (
            <img
              src={provider.avatarUrl}
              alt={provider.displayName}
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#222]"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-[#444]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white text-sm truncate">{provider?.displayName ?? "Unknown Provider"}</p>
            <p className="text-xs text-[#555] truncate">{provider?.username ? `@${provider.username}` : provider?.contactEmail ?? ""}</p>
            <div className="mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${VERTICAL_COLORS[vertical] ?? "bg-zinc-500/20 text-zinc-400"}`}>
                {VERTICAL_LABELS[vertical] ?? vertical}
              </span>
            </div>
          </div>
        </div>

        {/* Listing title */}
        <div className="rounded-xl bg-[#111] border border-[#1e1e1e] p-3">
          <p className="text-xs text-[#555] mb-1">Ad Title</p>
          <p className="text-sm font-semibold text-white leading-snug">{listing.title}</p>
          {listing.description && (
            <p className="text-xs text-[#666] mt-1.5 line-clamp-2">{listing.description}</p>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          {provider?.contactEmail && (
            <a href={`mailto:${provider.contactEmail}`} className="flex items-center gap-2 text-xs text-[#666] hover:text-white transition-colors">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{provider.contactEmail}</span>
            </a>
          )}
          {provider?.websiteUrl && (
            <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#666] hover:text-white transition-colors">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{provider.websiteUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          {provider?.contactPhone && (provider as any)?.showPhone && (
            <a href={`tel:${provider.contactPhone}`} className="flex items-center gap-2 text-xs text-[#666] hover:text-white transition-colors">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{provider.contactPhone}</span>
            </a>
          )}
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#555]">#{tag}</span>
            ))}
          </div>
        )}

        {/* CTA / Triage reason row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {listing.ctaUrl ? (
            <a
              href={listing.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button size="sm" className="w-full bg-[#ff2b2b] hover:bg-[#cc0000] text-white text-xs gap-1.5" data-testid={`button-gigcard-cta-${listing.id}`}>
                <ExternalLink className="h-3 w-3" />
                {listing.ctaLabel ?? "Learn More"}
              </Button>
            </a>
          ) : (
            <div className="flex-1" />
          )}
          <Link href={`/provider/${listing.providerId}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-[#444] hover:text-white shrink-0" title="View provider profile">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {reason && (
          <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/8 border border-orange-500/15 px-2.5 py-1.5">
            <AlertTriangle className="h-3 w-3 text-orange-500/60 shrink-0" />
            <p className="text-[10px] text-orange-400/70 truncate">{reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GigCardDirectoryPage() {
  const [search, setSearch] = useState("");

  const { data: listings = [], isLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/gigcard-directory"],
  });

  const filtered = listings.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.provider?.displayName?.toLowerCase().includes(q) ||
      l.vertical?.toLowerCase().includes(q) ||
      (l.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#000] text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-20 pb-32">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors mb-6">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Feed
            </button>
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/15">
              <CreditCard className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">GigCard Directory</h1>
              <p className="text-sm text-[#555]">Business card ads from our provider community</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-orange-500/8 border border-orange-500/15 px-4 py-2.5 mt-4">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300/80">
              These listings were moved here from the video feed. To appear in the main feed, re-submit with a short-form video.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, or keyword…"
            className="pl-9 bg-[#0d0d0d] border-[#1e1e1e] text-white placeholder:text-[#444]"
            data-testid="input-gigcard-search"
          />
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-xs text-[#444] mb-4" data-testid="text-gigcard-count">
            {filtered.length} {filtered.length === 1 ? "ad" : "ads"} in directory
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CreditCard className="h-12 w-12 text-[#222] mb-4" />
            <p className="text-[#444] font-medium">{search ? "No ads match your search" : "No ads in the GigCard Directory yet"}</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-3 text-xs text-orange-400 hover:text-orange-300">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((listing) => (
              <GigCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
