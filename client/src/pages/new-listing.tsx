import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { ProfileCompletionStatus } from "@shared/schema";

export default function NewListingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    vertical: "" as "MARKETING" | "COACHING" | "COURSES" | "",
    title: "",
    videoUrl: "",
    durationSeconds: "",
    description: "",
    tags: "",
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

  if (authLoading) return <div className="min-h-screen bg-background"><Navbar /></div>;
  if (!user) return null;

  const canSubmit = completion?.isComplete && !dailyStats?.capReached;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/provider/me">
            <a data-testid="link-back" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Post a Video</h1>
        </div>

        {/* Pricing info */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span><strong>$3 listing fee</strong> — Simulated checkout for now. Real Stripe can be wired in later.</span>
          </div>
        </Card>

        {/* Profile incomplete warning */}
        {completion && !completion.isComplete && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400" data-testid="alert-incomplete-profile">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Complete your profile before posting. Missing: {completion.missing.join(", ")}.{" "}
              <Link href="/provider/profile"><a className="underline font-medium">Edit profile</a></Link>
            </span>
          </div>
        )}

        {/* Cap warning */}
        {dailyStats?.capReached && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400" data-testid="alert-cap-reached">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Daily cap of {dailyStats.maxCap} listings reached. Try again tomorrow.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Listing Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="vertical">Vertical *</Label>
              <Select
                value={form.vertical}
                onValueChange={(val) => setForm((prev) => ({ ...prev, vertical: val as any }))}
              >
                <SelectTrigger data-testid="select-vertical">
                  <SelectValue placeholder="Choose a vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="COACHING">Coaching</SelectItem>
                  <SelectItem value="COURSES">Courses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="How I 10x'd my email open rates"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                maxLength={200}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={form.videoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                required
                data-testid="input-video-url"
              />
              <p className="text-xs text-muted-foreground">YouTube and Vimeo links supported.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="durationSeconds">Duration (seconds) * <span className="text-muted-foreground font-normal">Max 20s</span></Label>
              <Input
                id="durationSeconds"
                type="number"
                min={1}
                max={20}
                placeholder="15"
                value={form.durationSeconds}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
                data-testid="input-duration"
              />
              {durationWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1" data-testid="text-duration-warning">
                  <AlertCircle className="h-3 w-3" />
                  Videos over 20 seconds may be removed for false reporting.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Optional Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your video..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={1000}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <Input
                id="tags"
                placeholder="marketing, email, growth"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                data-testid="input-tags"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ctaUrl">CTA URL</Label>
              <Input
                id="ctaUrl"
                type="url"
                placeholder="https://yoursite.com/course"
                value={form.ctaUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                data-testid="input-cta-url"
              />
            </div>
          </Card>

          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || mutation.isPending || !form.vertical}
              data-testid="button-submit-listing"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay $3 & List Video
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Payment is simulated. Stripe will be connected for real charges.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
