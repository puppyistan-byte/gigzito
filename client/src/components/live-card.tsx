import { Link } from "wouter";
import { Radio, Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveSessionWithProvider } from "@shared/schema";

const CATEGORY_COLORS: Record<string, string> = {
  INFLUENCER:      "bg-purple-600",
  MUSIC_GIGS:      "bg-pink-500",
  EVENTS:          "bg-yellow-500 text-black",
  CORPORATE_DEALS: "bg-blue-900",
  MARKETING:       "bg-red-600",
  COACHING:        "bg-violet-600",
  COURSES:         "bg-blue-600",
  PRODUCTS:        "bg-orange-500",
  CRYPTO:          "bg-yellow-600",
  FLASH_SALE:      "bg-red-600",
  FLASH_COUPON:    "bg-emerald-600",
};

interface LiveCardProps {
  session: LiveSessionWithProvider;
  compact?: boolean;
}

export function LiveCard({ session, compact = false }: LiveCardProps) {
  const provider = session.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "L";
  const catColor = CATEGORY_COLORS[session.category] ?? "bg-gray-600";

  return (
    <Link href={`/live/${session.id}`}>
      <div
        className={`group relative rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#ff2b2b]/50 hover:shadow-[0_0_20px_rgba(255,43,43,0.15)] ${compact ? "flex items-center gap-3 p-3" : "p-4"}`}
        data-testid={`card-live-${session.id}`}
      >
        {/* Thumbnail */}
        {!compact && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 bg-[#111]">
            {session.thumbnailUrl ? (
              <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a0000] to-[#0b0b0b]">
                <Radio className="w-8 h-8 text-[#ff2b2b]/50" />
              </div>
            )}
            {/* LIVE badge overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#ff2b2b] rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[10px] font-bold tracking-widest">LIVE</span>
            </div>
            {session.viewerCount > 0 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Eye className="w-3 h-3 text-white/70" />
                <span className="text-white/80 text-[10px] font-semibold">{session.viewerCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Compact thumbnail */}
        {compact && (
          <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#111]">
            {session.thumbnailUrl ? (
              <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a0000] to-[#111]">
                <Radio className="w-4 h-4 text-[#ff2b2b]/60" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
            </div>
          </div>
        )}

        <div className={`flex-1 min-w-0 ${compact ? "" : ""}`}>
          {/* Creator row */}
          <div className="flex items-center gap-2 mb-1">
            <div
              style={{ width: compact ? "20px" : "24px", height: compact ? "20px" : "24px", borderRadius: "50%", overflow: "hidden", background: "#c41414", flexShrink: 0 }}
            >
              {provider.avatarUrl ? (
                <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "9px", fontWeight: "700" }}>{initials}</div>
              )}
            </div>
            <span className={`text-[#aaa] font-medium truncate ${compact ? "text-[11px]" : "text-xs"}`}>{provider.displayName}</span>
            {!compact && <Badge className={`${catColor} text-white text-[9px] px-2 py-0 border-0 ml-auto shrink-0`}>{session.category.replace(/_/g, " ")}</Badge>}
          </div>

          {/* Title */}
          <p className={`font-bold text-white leading-tight truncate ${compact ? "text-xs" : "text-sm"}`}>{session.title}</p>

          {!compact && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
                  <span className="text-[#ff2b2b] text-[10px] font-bold">LIVE</span>
                </div>
                {session.viewerCount > 0 && (
                  <span className="flex items-center gap-1 text-[#555] text-[11px]">
                    <Eye className="w-3 h-3" /> {session.viewerCount.toLocaleString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                className="h-7 px-3 bg-[#ff2b2b] hover:bg-[#e01e1e] text-white rounded-full font-bold text-[11px] border-0"
                data-testid={`button-join-live-${session.id}`}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Join Live
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
