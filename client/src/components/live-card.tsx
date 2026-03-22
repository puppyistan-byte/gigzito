import { Link } from "wouter";
import { Eye, ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiTiktok, SiYoutube, SiInstagram, SiFacebook, SiTwitch, SiX } from "react-icons/si";
import { Globe } from "lucide-react";
import type { LiveSessionWithProvider } from "@shared/schema";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  INFLUENCER:      { bg: "bg-purple-500/20",  text: "text-purple-300",  border: "border-purple-500/30" },
  MUSIC_GIGS:      { bg: "bg-pink-500/20",    text: "text-pink-300",    border: "border-pink-500/30" },
  EVENTS:          { bg: "bg-yellow-500/20",  text: "text-yellow-300",  border: "border-yellow-500/30" },
  CORPORATE_DEALS: { bg: "bg-blue-500/20",    text: "text-blue-300",    border: "border-blue-500/30" },
  MARKETING:       { bg: "bg-red-500/20",     text: "text-red-300",     border: "border-red-500/30" },
  COACHING:        { bg: "bg-violet-500/20",  text: "text-violet-300",  border: "border-violet-500/30" },
  COURSES:         { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
  PRODUCTS:        { bg: "bg-orange-500/20",  text: "text-orange-300",  border: "border-orange-500/30" },
  CRYPTO:          { bg: "bg-yellow-600/20",  text: "text-yellow-200",  border: "border-yellow-600/30" },
  FLASH_SALE:      { bg: "bg-red-600/20",     text: "text-red-200",     border: "border-red-600/30" },
  FLASH_COUPON:    { bg: "bg-emerald-600/20", text: "text-emerald-200", border: "border-emerald-600/30" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube:   <SiYoutube className="w-3 h-3" />,
  tiktok:    <SiTiktok className="w-3 h-3" />,
  instagram: <SiInstagram className="w-3 h-3" />,
  facebook:  <SiFacebook className="w-3 h-3" />,
  twitch:    <SiTwitch className="w-3 h-3" />,
  twitter:   <SiX className="w-3 h-3" />,
  native:    <Globe className="w-3 h-3" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   "text-[#FF0000] bg-[#FF0000]/10 border-[#FF0000]/20",
  tiktok:    "text-white bg-white/10 border-white/20",
  instagram: "text-[#E1306C] bg-[#E1306C]/10 border-[#E1306C]/20",
  facebook:  "text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20",
  twitch:    "text-[#9147FF] bg-[#9147FF]/10 border-[#9147FF]/20",
  twitter:   "text-white bg-white/10 border-white/20",
  native:    "text-[#888] bg-[#888]/10 border-[#888]/20",
};

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

interface LiveCardProps {
  session: LiveSessionWithProvider;
  compact?: boolean;
}

export function LiveCard({ session, compact = false }: LiveCardProps) {
  const provider = session.provider;
  const initials = provider.displayName
    ? provider.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "L";

  const cat = CATEGORY_COLORS[session.category] ?? { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" };
  const platformKey = (session.platform ?? "native").toLowerCase();
  const platformColor = PLATFORM_COLORS[platformKey] ?? PLATFORM_COLORS.native;
  const platformIcon = PLATFORM_ICONS[platformKey] ?? PLATFORM_ICONS.native;
  const platformLabel = session.platform ?? "Live";

  if (compact) {
    return (
      <Link href={`/live/${session.id}`}>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] hover:border-[#ff2b2b]/40 transition-colors cursor-pointer" data-testid={`card-live-compact-${session.id}`}>
          <div className="relative shrink-0">
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "#1a1a1a", border: "2px solid #ff2b2b" }}>
              {provider.avatarUrl ? (
                <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{initials}</div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ff2b2b] border-2 border-black animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{provider.displayName}</p>
            <p className="text-[10px] text-[#666] truncate">{session.title}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#ff2b2b] rounded-full px-2 py-0.5 shrink-0">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[9px] font-bold">LIVE</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/live/${session.id}`}>
      <div
        className="group relative rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#ff2b2b]/50 hover:shadow-[0_0_24px_rgba(255,43,43,0.12)]"
        data-testid={`card-live-${session.id}`}
      >
        {/* Thumbnail strip or gradient hero */}
        <div className="relative w-full h-28 overflow-hidden bg-gradient-to-br from-[#1a0000] via-[#0f0000] to-[#0b0b0b]">
          {session.thumbnailUrl ? (
            <img
              src={session.thumbnailUrl}
              alt={session.title}
              className="w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-[#ff2b2b]/20 flex items-center justify-center bg-[#ff2b2b]/5">
                <span className="text-2xl">📡</span>
              </div>
            </div>
          )}

          {/* Top-left: LIVE badge */}
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5 bg-[#ff2b2b] rounded-full px-2.5 py-1 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[11px] font-black tracking-widest">LIVE</span>
          </div>

          {/* Top-right: Platform badge */}
          <div className={`absolute top-2.5 right-3 flex items-center gap-1.5 rounded-full px-2 py-1 border text-[10px] font-semibold ${platformColor}`}>
            {platformIcon}
            {platformLabel}
          </div>

          {/* Bottom-right: viewer count */}
          {session.viewerCount > 0 && (
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Eye className="w-2.5 h-2.5 text-white/60" />
              <span className="text-white/80 text-[10px] font-semibold">{formatViewers(session.viewerCount)}</span>
            </div>
          )}
        </div>

        {/* Business card body */}
        <div className="p-4 space-y-3">
          {/* Avatar + name row */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0 -mt-8">
              <div
                style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  border: "3px solid #ff2b2b",
                  overflow: "hidden", background: "#1a1a1a",
                  boxShadow: "0 0 12px rgba(255,43,43,0.4)",
                }}
              >
                {provider.avatarUrl ? (
                  <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c41414", color: "#fff", fontSize: "18px", fontWeight: "700" }}>{initials}</div>
                )}
              </div>
              {/* Pulsing live dot on avatar */}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#ff2b2b] border-2 border-black animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-sm truncate">{provider.displayName}</p>
                {provider.username && (
                  <span className="text-[10px] text-[#555]">@{provider.username}</span>
                )}
              </div>
              <Badge className={`mt-1 text-[10px] px-2 py-0 border ${cat.bg} ${cat.text} ${cat.border}`}>
                {session.category.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Stream title */}
          <div>
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{session.title}</p>
            {provider.bio && (
              <p className="text-xs text-[#666] mt-1 line-clamp-1">{provider.bio}</p>
            )}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[#555] text-xs">
              {session.viewerCount > 0 && (
                <>
                  <Users className="w-3 h-3" />
                  <span>{formatViewers(session.viewerCount)} watching</span>
                </>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 px-4 bg-[#ff2b2b]/20 hover:bg-[#ff2b2b]/35 text-white border border-[#ff2b2b]/60 hover:border-[#ff2b2b] rounded-full font-bold text-xs backdrop-blur-sm group-hover:shadow-[0_0_12px_rgba(255,43,43,0.35)] transition-all"
              data-testid={`button-join-live-${session.id}`}
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Watch Live
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
