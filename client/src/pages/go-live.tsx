import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Radio, ArrowLeft, Youtube, Video, Instagram, Globe } from "lucide-react";
import { SiTiktok, SiFacebook, SiTwitch } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

const LIVE_ALLOWED_CATEGORIES = ["INFLUENCER", "MUSIC_GIGS", "EVENTS", "CORPORATE_DEALS"];
const LIVE_CATEGORIES = [
  { value: "INFLUENCER",      label: "Influencer" },
  { value: "MUSIC_GIGS",      label: "Music Gigs" },
  { value: "EVENTS",          label: "Events" },
  { value: "CORPORATE_DEALS", label: "Corporate Deals" },
  { value: "MARKETING",       label: "Marketing" },
  { value: "COACHING",        label: "Coaching" },
  { value: "COURSES",         label: "Courses" },
  { value: "CRYPTO",          label: "Crypto" },
  { value: "PRODUCTS",        label: "Products" },
];

function detectPlatform(url: string): { mode: "external" | "native"; platform: string; canEmbed: boolean } {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return { mode: "external", platform: "youtube", canEmbed: true };
    if (u.hostname.includes("twitch.tv")) return { mode: "external", platform: "twitch", canEmbed: true };
    if (u.hostname.includes("facebook.com")) return { mode: "external", platform: "facebook", canEmbed: false };
    if (u.hostname.includes("instagram.com")) return { mode: "external", platform: "instagram", canEmbed: false };
    if (u.hostname.includes("tiktok.com")) return { mode: "external", platform: "tiktok", canEmbed: false };
    return { mode: "native", platform: "native", canEmbed: true };
  } catch {
    return { mode: "native", platform: "native", canEmbed: true };
  }
}

const PLATFORM_HINTS: Record<string, string> = {
  youtube:   "YouTube Live — embeds directly in Gigzito.",
  twitch:    "Twitch — embeds directly in Gigzito.",
  facebook:  "Facebook Live — viewers will be redirected to Facebook to watch.",
  instagram: "Instagram Live — viewers will be redirected to Instagram.",
  tiktok:    "TikTok Live — viewers will be redirected to TikTok.",
  native:    "Direct stream URL (.m3u8 / .mp4) or any other platform link.",
};

export default function GoLivePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile/me"],
    enabled: !!user,
  });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (profile?.primaryCategory && !category) {
      setCategory(profile.primaryCategory);
    }
  }, [profile]);

  const detected = streamUrl ? detectPlatform(streamUrl) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/live/start", {
        title,
        category,
        streamUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        mode: detected?.mode ?? "external",
        platform: detected?.platform,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/live/active"] });
      toast({ title: "You're live!", description: "Your session has started." });
      navigate(`/live/${data.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to go live", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !streamUrl.trim() || !category) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  if (authLoading) return <div className="min-h-screen bg-black"><Navbar /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/live" className="text-[#555] hover:text-white transition-colors" data-testid="link-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Go Live</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Stream title */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Session Details</h2>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Stream Title *</Label>
              <Input
                placeholder="What are you streaming today?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                data-testid="input-live-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff2b2b]" data-testid="select-live-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#2a2a2a]">
                  {LIVE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-white focus:bg-[#222]">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stream URL */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Stream Source *</h2>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Stream URL</Label>
              <Input
                type="url"
                placeholder="https://youtube.com/live/... or tiktok.com/@user/live or twitch.tv/channel"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                data-testid="input-stream-url"
              />
              {detected && (
                <p className="text-xs text-[#555]">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${detected.canEmbed ? "bg-green-500" : "bg-yellow-500"}`} />
                  {PLATFORM_HINTS[detected.platform] ?? "Detected as native stream."}
                </p>
              )}
            </div>

            {/* Platform quick links */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "YouTube Live",  icon: <Youtube className="w-3 h-3 text-[#FF0000]" />,    color: "text-[#FF0000] border-[#FF0000]/20" },
                { label: "TikTok Live",   icon: <SiTiktok className="w-3 h-3 text-white" />,        color: "text-white border-white/20" },
                { label: "Instagram Live",icon: <Instagram className="w-3 h-3 text-[#E1306C]" />,   color: "text-[#E1306C] border-[#E1306C]/20" },
                { label: "Facebook Live", icon: <SiFacebook className="w-3 h-3 text-[#1877F2]" />,  color: "text-[#1877F2] border-[#1877F2]/20" },
                { label: "Twitch",        icon: <SiTwitch className="w-3 h-3 text-[#9147FF]" />,    color: "text-[#9147FF] border-[#9147FF]/20" },
                { label: "Direct Video",  icon: <Video className="w-3 h-3 text-[#888]" />,          color: "text-[#888] border-[#888]/20" },
              ].map((p) => (
                <span key={p.label} className={`inline-flex items-center gap-1.5 text-[10px] bg-[#111] border rounded-full px-2.5 py-1 ${p.color}`}>
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#444]">
              Paste your live stream URL above. TikTok, Instagram and Facebook links will redirect viewers to your live — YouTube and Twitch embed directly.
            </p>
          </div>

          {/* Optional thumbnail */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Thumbnail <span className="normal-case font-normal text-[#444]">(optional)</span></h2>
            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Thumbnail URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                data-testid="input-live-thumbnail"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending || !title || !streamUrl || !category}
            className="w-full bg-[#ff2b2b] hover:bg-[#e01e1e] text-white font-bold rounded-xl h-12"
            data-testid="button-start-live"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Starting...</>
            ) : (
              <><Radio className="h-4 w-4 mr-2" /> Go Live Now</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
