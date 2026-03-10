import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ExternalLink, Eye, Radio, StopCircle, Globe, Instagram, Youtube, Video } from "lucide-react";
import { SiTiktok, SiTwitch } from "react-icons/si";
import type { LiveSessionWithProvider } from "@shared/schema";

function getLiveEmbed(streamUrl: string, sessionId: number): { canEmbed: boolean; type: "youtube" | "twitch" | "direct" | "none"; embedSrc: string } {
  try {
    const url = new URL(streamUrl);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      let videoId = "";
      if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
      else if (url.searchParams.get("v")) videoId = url.searchParams.get("v")!;
      else if (url.pathname.includes("/live/")) videoId = url.pathname.split("/live/")[1]?.split("?")[0];
      else if (url.pathname.includes("/embed/")) return { canEmbed: true, type: "youtube", embedSrc: streamUrl };
      if (videoId) return { canEmbed: true, type: "youtube", embedSrc: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0` };
    }
    if (url.hostname.includes("twitch.tv")) {
      const channel = url.pathname.slice(1).split("/")[0];
      if (channel) return { canEmbed: true, type: "twitch", embedSrc: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true` };
    }
    if (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4") || streamUrl.includes(".webm")) {
      return { canEmbed: true, type: "direct", embedSrc: streamUrl };
    }
    return { canEmbed: false, type: "none", embedSrc: streamUrl };
  } catch {
    return { canEmbed: false, type: "none", embedSrc: streamUrl };
  }
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  youtube:   <Youtube className="w-4 h-4" />,
  twitch:    <SiTwitch className="w-4 h-4" />,
  facebook:  <Globe className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  tiktok:    <SiTiktok className="w-4 h-4" />,
  native:    <Video className="w-4 h-4" />,
};
const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube", twitch: "Twitch", facebook: "Facebook",
  instagram: "Instagram", tiktok: "TikTok", native: "Direct Stream",
};

export default function LiveViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery<LiveSessionWithProvider>({
    queryKey: ["/api/live", id],
    queryFn: () => fetch(`/api/live/${id}`).then((r) => r.json()),
    enabled: !!id,
    refetchInterval: 60000,
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/live/${id}/end`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live/active"] });
      toast({ title: "Live session ended." });
      navigate("/live");
    },
    onError: () => toast({ title: "Failed to end session", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-black"><Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6"><Skeleton className="h-72 w-full bg-[#111] rounded-2xl" /></div>
    </div>
  );

  if (!session || (session as any).message === "Not found") return (
    <div className="min-h-screen bg-black"><Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/live" className="inline-flex items-center gap-2 text-[#555] hover:text-white text-sm mb-6"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-12 text-center">
          <p className="text-[#555]">This live session was not found or has ended.</p>
        </div>
      </div>
    </div>
  );

  const provider = session.provider;
  const initials = provider.displayName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "L";
  const embed = getLiveEmbed(session.streamUrl, session.id);
  const isOwner = user && session.creatorUserId === ((user as any).user?.id ?? (user as any).id);
  const isEnded = session.status === "ended";

  const platformKey = session.platform ?? "native";
  const platformLabel = PLATFORM_LABEL[platformKey] ?? "Stream";

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center justify-between">
          <Link href="/live" className="inline-flex items-center gap-2 text-[#555] hover:text-white text-sm" data-testid="link-back">
            <ArrowLeft className="h-4 w-4" /> Live Now
          </Link>
          {isOwner && !isEnded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => endMutation.mutate()}
              disabled={endMutation.isPending}
              className="text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 rounded-xl"
              data-testid="button-end-live"
            >
              <StopCircle className="h-4 w-4 mr-1.5" />
              End Session
            </Button>
          )}
        </div>

        {/* Video / embed area */}
        <div className="rounded-2xl overflow-hidden bg-[#0b0b0b] border border-[#1e1e1e]">
          {isEnded ? (
            <div className="aspect-video flex items-center justify-center bg-[#0b0b0b]">
              <div className="text-center">
                <Radio className="w-10 h-10 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">This session has ended.</p>
              </div>
            </div>
          ) : embed.canEmbed && embed.type !== "none" ? (
            <>
              {embed.type === "direct" ? (
                <div className="aspect-video">
                  <video
                    src={embed.embedSrc}
                    className="w-full h-full object-contain bg-black"
                    controls
                    autoPlay
                    playsInline
                    data-testid="video-native-live"
                  />
                </div>
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={embed.embedSrc}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={session.title}
                    data-testid="iframe-live-embed"
                  />
                </div>
              )}
            </>
          ) : (
            /* Non-embeddable platform — show card */
            <div className="aspect-video flex flex-col items-center justify-center gap-4 px-6" style={{ background: session.thumbnailUrl ? undefined : "linear-gradient(135deg, #1a0000, #0b0b0b)" }}>
              {session.thumbnailUrl && (
                <div className="absolute inset-0 opacity-20">
                  <img src={session.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                </div>
              )}
              <div className="relative z-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[#ff2b2b]/20 border border-[#ff2b2b]/30 flex items-center justify-center mx-auto mb-3">
                  {PLATFORM_ICON[platformKey] ?? <Globe className="w-5 h-5 text-[#ff2b2b]" />}
                </div>
                <p className="text-[#aaa] text-sm mb-1">{platformLabel} Live doesn't support in-app embedding.</p>
                <p className="text-[#555] text-xs mb-4">Click below to watch on {platformLabel}.</p>
                <a href={session.streamUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#ff2b2b] hover:bg-[#e01e1e] text-white rounded-xl font-bold" data-testid="button-watch-external">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Watch on {platformLabel}
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Session info */}
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] p-4">
          <div className="flex items-start gap-3">
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", background: "#c41414", flexShrink: 0 }}>
              {provider.avatarUrl ? (
                <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>{initials}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-white text-base" data-testid="text-live-title">{session.title}</h2>
                {!isEnded && (
                  <div className="flex items-center gap-1 bg-[#ff2b2b]/15 border border-[#ff2b2b]/30 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2b2b] animate-pulse" />
                    <span className="text-[#ff2b2b] text-[10px] font-bold">LIVE</span>
                  </div>
                )}
                {isEnded && <span className="text-[10px] text-[#555] bg-[#111] border border-[#2a2a2a] rounded-full px-2 py-0.5">ENDED</span>}
              </div>
              <p className="text-[#888] text-sm mt-0.5">{provider.displayName}</p>
              {session.viewerCount > 0 && (
                <p className="flex items-center gap-1 text-[#555] text-xs mt-1">
                  <Eye className="w-3 h-3" /> {session.viewerCount.toLocaleString()} watching
                </p>
              )}
            </div>
            {!embed.canEmbed && !isEnded && (
              <a href={session.streamUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button size="sm" className="bg-[#ff2b2b] hover:bg-[#e01e1e] text-white rounded-xl font-bold">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Watch Live
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
