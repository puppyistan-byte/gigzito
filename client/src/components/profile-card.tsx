import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Edit2 } from "lucide-react";
import type { ProviderProfile } from "@shared/schema";

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  COACHING:  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  COURSES:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MUSIC:     "bg-purple-500/20 text-purple-400 border-purple-500/30",
  CRYPTO:    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  COACHING:  "Coaching",
  COURSES:   "Courses",
  MUSIC:     "Music",
  CRYPTO:    "Crypto",
};

interface ProfileCardProps {
  profile: ProviderProfile;
  showEditLink?: boolean;
  compact?: boolean;
}

export function ProfileCard({ profile, showEditLink = false, compact = false }: ProfileCardProps) {
  const initials = profile.displayName
    ? profile.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const categoryColor = CATEGORY_COLORS[profile.primaryCategory ?? ""] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const categoryLabel = CATEGORY_LABELS[profile.primaryCategory ?? ""] ?? profile.primaryCategory;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0b0b0b] border border-[#222]" data-testid="profile-card-compact">
        <Avatar className="h-10 w-10 ring-2 ring-[#333]">
          <AvatarImage src={profile.avatarUrl ?? ""} alt={profile.displayName} />
          <AvatarFallback className="bg-[#ff1a1a] text-white text-sm font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{profile.displayName || "Unnamed Creator"}</p>
          {profile.bio && <p className="text-xs text-[#888] line-clamp-1">{profile.bio}</p>}
        </div>
        {profile.primaryCategory && (
          <Badge className={`text-xs border shrink-0 ${categoryColor}`}>{categoryLabel}</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0b0b0b] border border-[#222] p-4" data-testid="profile-card">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 ring-2 ring-[#333] shrink-0">
          <AvatarImage src={profile.avatarUrl ?? ""} alt={profile.displayName} />
          <AvatarFallback className="bg-[#ff1a1a] text-white text-xl font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-white truncate">{profile.displayName || "Unnamed Creator"}</p>
            {profile.username && (
              <span className="text-xs text-[#555]">@{profile.username}</span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-[#aaa] line-clamp-2 mb-2">{profile.bio}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {profile.primaryCategory && (
              <Badge className={`text-xs border ${categoryColor}`} data-testid="badge-primary-category">
                {categoryLabel}
              </Badge>
            )}
            {profile.location && (
              <span className="flex items-center gap-1 text-xs text-[#666]">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </span>
            )}
          </div>
        </div>
        {showEditLink && (
          <Link href="/provider/profile">
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-[#666] hover:text-white border border-[#2a2a2a] hover:border-[#444]"
              data-testid="button-edit-profile-card"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
