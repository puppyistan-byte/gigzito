import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, DollarSign } from "lucide-react";
import type { ProfileCompletionStatus, ProviderProfile } from "@shared/schema";

const VERTICALS = [
  { value: "MARKETING", label: "Marketing" },
  { value: "COACHING",  label: "Coaching" },
  { value: "COURSES",   label: "Courses" },
  { value: "MUSIC",     label: "Music" },
  { value: "CRYPTO",    label: "Crypto" },
];

export default function NewListingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    vertical: "" as "MARKETING" | "COACHING" | "COURSES" | "MUSIC" | "CRYPTO" | "",
    title: "",
    videoUrl: "",
    durationSeconds: "",
    description: "",
    tags: "",
    ctaLabel: "",
    ctaUrl: "",
  });
  const [durationWarning, setDurationWarning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  const { data: completion } = useQuery<ProfileCompletionStatus>({
    queryKey: ["/api/profile/me/completion"],
    enabled: !!user,
  });

  const { data: profile } = useQuery<ProviderProfile>({
    queryKey: ["/api/profile/me"],
    enabled: !!user,
  });

  const { data: dailyStats } = useQuery<{ count: number; capReached: boolean; maxCap: number }>({
    queryKey: ["/api/stats/daily"],
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: form.vertical,
          title: form.title,
          videoUrl: form.videoUrl,
          durationSeconds: parseInt(form.durationSeconds, 10),
          description: form.description || undefined,
          tags,
          ctaLabel: form.ctaLabel || undefined,
          ctaUrl: form.ctaUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Submission failed");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: "Video listed!", description: "Your listing is now live in the feed." });
      navigate(`/listing/${data.listingId}`);
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDurationChange = (val: string) => {
    setForm((prev) => ({ ...prev, durationSeconds: val }));
    const n = parseInt(val, 10);
    setDurationWarning(!isNaN(n) && n > 20);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(form.durationSeconds, 10);
    if (isNaN(dur) || dur < 1 || dur > 20) {
      toast({ title: "Invalid duration", description: "Video must be 1–20 seconds.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  if (authLoading) return <div className="min-h-screen bg-black"><Navbar /></div>;
  if (!user) return null;

  const canSubmit = completion?.isComplete && !dailyStats?.capReached;
  const set = (field: keyof typeof form, val: string) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/provider/me" className="text-[#555] hover:text-white transition-colors" data-testid="link-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white" data-testid="text-page-title">Post a Video</h1>
        </div>

        {/* Creator preview */}
        {profile && (
          <div>
            <p className="text-xs text-[#555] uppercase tracking-widest mb-2 font-semibold">Posting as</p>
            <ProfileCard profile={profile} showEditLink />
          </div>
        )}

        {/* Profile incomplete warning */}
        {completion && !completion.isComplete && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-amber-400" data-testid="alert-incomplete-profile">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Complete your profile before posting. Missing: <strong>{completion.missing.join(", ")}</strong>.{" "}
              <Link href="/provider/profile" className="underline font-semibold text-[#ff1a1a]">Edit profile →</Link>
            </span>
          </div>
        )}

        {/* Cap warning */}
        {dailyStats?.capReached && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400" data-testid="alert-cap-reached">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Daily cap of {dailyStats.maxCap} listings reached. Try again tomorrow.
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff1a1a]/8 border border-[#ff1a1a]/20 text-sm text-[#ff6666]">
          <DollarSign className="h-4 w-4 shrink-0" />
          <span><strong className="text-[#ff1a1a]">$3.00 listing fee</strong> — simulated checkout. Stripe can be wired in later.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Required fields */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Video Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="vertical" className="text-[#aaa] text-sm">Category *</Label>
              <Select value={form.vertical} onValueChange={(v) => set("vertical", v as any)}>
                <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff1a1a]" data-testid="select-vertical">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#2a2a2a]">
                  {VERTICALS.map((v) => (
                    <SelectItem key={v.value} value={v.value} className="text-white focus:bg-[#222]">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[#aaa] text-sm">Title *</Label>
              <Input
                id="title"
                placeholder="How I 10x'd my email open rates"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required maxLength={200}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="videoUrl" className="text-[#aaa] text-sm">Video URL *</Label>
              <Input
                id="videoUrl" type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-video-url"
              />
              <p className="text-xs text-[#444]">YouTube and Vimeo supported.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="durationSeconds" className="text-[#aaa] text-sm">
                Duration (seconds) * <span className="text-[#555] font-normal">Max 20s</span>
              </Label>
              <Input
                id="durationSeconds" type="number" min={1} max={20} placeholder="15"
                value={form.durationSeconds}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-duration"
              />
              {durationWarning && (
                <p className="text-xs text-amber-400 flex items-center gap-1" data-testid="text-duration-warning">
                  <AlertCircle className="h-3 w-3" />
                  Videos over 20 seconds may be removed.
                </p>
              )}
            </div>
          </div>

          {/* Optional fields */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Optional Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[#aaa] text-sm">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your video..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3} maxLength={1000}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a] resize-none"
                data-testid="input-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-[#aaa] text-sm">Tags <span className="text-[#555] font-normal">(comma-separated)</span></Label>
              <Input
                id="tags"
                placeholder="marketing, email, growth"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-tags"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctaLabel" className="text-[#aaa] text-sm">CTA Button Label</Label>
                <Input
                  id="ctaLabel"
                  placeholder="Get the guide"
                  value={form.ctaLabel}
                  onChange={(e) => set("ctaLabel", e.target.value)}
                  maxLength={60}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                  data-testid="input-cta-label"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ctaUrl" className="text-[#aaa] text-sm">CTA URL</Label>
                <Input
                  id="ctaUrl" type="url"
                  placeholder="https://yoursite.com/offer"
                  value={form.ctaUrl}
                  onChange={(e) => set("ctaUrl", e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                  data-testid="input-cta-url"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#ff1a1a] hover:bg-[#ff2a2a] text-white font-bold rounded-xl h-12 text-sm"
            disabled={!canSubmit || mutation.isPending || !form.vertical}
            data-testid="button-submit-listing"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Pay $3.00 &amp; List Video
          </Button>
          <p className="text-xs text-center text-[#444]">
            Payment is simulated. Stripe will be connected for real charges.
          </p>
        </form>
      </div>
    </div>
  );
}
