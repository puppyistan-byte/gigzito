import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Heart, Eye, MessageCircle, Bell, ArrowLeft } from "lucide-react";
import type { ActivityEvent } from "@shared/schema";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ActorAvatar({ name, avatar, username }: { name: string; avatar: string | null; username: string | null }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Avatar className="h-9 w-9 shrink-0">
      {avatar && <AvatarImage src={avatar} alt={name} />}
      <AvatarFallback className="text-[11px] font-bold bg-[#1a1a1a] text-zinc-400">{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}

function EventCard({ event }: { event: ActivityEvent }) {
  const name = event.actorName || "Someone";
  const username = event.actorUsername;

  if (event.type === "profile_view") {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#181818]" data-testid="activity-event-profile-view">
        <div className="relative">
          <ActorAvatar name={name} avatar={event.actorAvatar} username={username} />
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500">
            <Eye className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white">
            <span className="font-semibold">{username ? `@${username}` : name}</span>{" "}
            <span className="text-zinc-400">viewed your profile</span>
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">{timeAgo(event.at)}</p>
        </div>
        <Badge className="shrink-0 text-[10px] bg-blue-900/30 text-blue-400 border-blue-700/40 uppercase tracking-wide">View</Badge>
      </div>
    );
  }

  if (event.type === "love") {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#181818]" data-testid="activity-event-love">
        <div className="relative">
          <ActorAvatar name={name} avatar={event.actorAvatar} username={username} />
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-pink-500">
            <Heart className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white">
            <span className="font-semibold">{username ? `@${username}` : name}</span>{" "}
            <span className="text-zinc-400">showed you love</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {event.monthKey} · {timeAgo(event.at)}
          </p>
        </div>
        <Badge className="shrink-0 text-[10px] bg-pink-900/30 text-pink-400 border-pink-700/40 uppercase tracking-wide">Love</Badge>
      </div>
    );
  }

  if (event.type === "comment_like") {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#181818]" data-testid="activity-event-comment-like">
        <div className="relative">
          <ActorAvatar name={name} avatar={event.actorAvatar} username={username} />
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500">
            <Heart className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white">
            <span className="font-semibold">{username ? `@${username}` : name}</span>{" "}
            <span className="text-zinc-400">liked a comment on your video</span>
          </p>
          {event.commentText && (
            <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 italic">
              "{event.commentText.slice(0, 80)}{event.commentText.length > 80 ? "…" : ""}"
            </p>
          )}
          <p className="text-[11px] text-zinc-600 mt-0.5">{timeAgo(event.at)}</p>
        </div>
        <Badge className="shrink-0 text-[10px] bg-red-900/30 text-red-400 border-red-700/40 uppercase tracking-wide">Like</Badge>
      </div>
    );
  }

  return null;
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "bg-white text-black border-white"
          : "bg-transparent text-zinc-500 border-[#2a2a2a] hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

import { useState } from "react";

type FilterType = "all" | "profile_view" | "love" | "comment_like";

export default function ActivityPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: events = [], isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/notifications/activity"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  const counts = {
    all: events.length,
    profile_view: events.filter(e => e.type === "profile_view").length,
    love: events.filter(e => e.type === "love").length,
    comment_like: events.filter(e => e.type === "comment_like").length,
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500">Please log in to see your activity.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20" data-testid="page-activity">
      <Navbar />

      <div className="max-w-md mx-auto pt-16">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/">
            <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" data-testid="btn-activity-back">
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-white" />
            <h1 className="text-lg font-bold text-white">Activity</h1>
          </div>
          {counts.all > 0 && (
            <span className="ml-auto text-xs text-zinc-500">{counts.all} event{counts.all !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
          <FilterButton label={`All (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton label={`👁 Views (${counts.profile_view})`} active={filter === "profile_view"} onClick={() => setFilter("profile_view")} />
          <FilterButton label={`❤️ Love (${counts.love})`} active={filter === "love"} onClick={() => setFilter("love")} />
          <FilterButton label={`💬 Likes (${counts.comment_like})`} active={filter === "comment_like"} onClick={() => setFilter("comment_like")} />
        </div>

        {/* Feed */}
        <div className="border border-[#1a1a1a] rounded-xl overflow-hidden mx-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-[#181818]">
                <Skeleton className="h-9 w-9 rounded-full bg-[#1a1a1a]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48 bg-[#1a1a1a] rounded" />
                  <Skeleton className="h-2.5 w-24 bg-[#111] rounded" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="activity-empty">
              <Bell className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-zinc-500">Nothing here yet</p>
              <p className="text-xs text-zinc-700 mt-1">
                {filter === "all"
                  ? "When someone views your profile, shows love, or likes a comment on your video, you'll see it here."
                  : filter === "profile_view"
                  ? "No profile views recorded yet."
                  : filter === "love"
                  ? "No one has shown you love yet this month."
                  : "No comment likes yet."}
              </p>
            </div>
          ) : (
            filtered.map((event, i) => <EventCard key={i} event={event} />)
          )}
        </div>

        {/* Legend */}
        {filtered.length > 0 && (
          <div className="mx-4 mt-4 flex items-center gap-4 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> Profile view</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500" /> Love vote</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> Comment like</span>
          </div>
        )}
      </div>
    </div>
  );
}
