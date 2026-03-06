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
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, DollarSign, Timer, Tag, ShoppingCart } from "lucide-react";
import type { ProfileCompletionStatus, ProviderProfile } from "@shared/schema";

const VERTICALS = [
  { value: "INFLUENCER",      label: "Influencer",      icon: "⭐" },
  { value: "MARKETING",       label: "Marketing",       icon: "📈" },
  { value: "COURSES",         label: "Courses",         icon: "🎓" },
  { value: "COACHING",        label: "Coaching",        icon: "🧠" },
  { value: "PRODUCTS",        label: "Products",        icon: "📦" },
  { value: "FLASH_SALE",      label: "Flash Sale",      icon: "⚡" },
  { value: "FLASH_COUPON",    label: "Flash Coupon",    icon: "💰" },
  { value: "MUSIC_GIGS",      label: "Music Gigs",      icon: "🎵" },
  { value: "EVENTS",          label: "Events",          icon: "🎪" },
  { value: "CRYPTO",          label: "Crypto",          icon: "₿" },
  { value: "CORPORATE_DEALS", label: "Corporate Deals", icon: "🏢" },
];

type Vertical = typeof VERTICALS[number]["value"];

type FormState = {
  vertical: Vertical | "";
  title: string;
  videoUrl: string;
  durationSeconds: string;
  description: string;
  tags: string;
  ctaLabel: string;
  ctaUrl: string;
  // Flash Sale
  flashSaleEndsAt: string;
  // Flash Coupon
  couponCode: string;
  // Products
  productPrice: string;
  productPurchaseUrl: string;
  productStock: string;
};

const EMPTY: FormState = {
  vertical: "", title: "", videoUrl: "", durationSeconds: "",
  description: "", tags: "", ctaLabel: "", ctaUrl: "",
  flashSaleEndsAt: "", couponCode: "",
  productPrice: "", productPurchaseUrl: "", productStock: "",
};

export default function NewListingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
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
      const payload: Record<string, unknown> = {
        vertical: form.vertical,
        title: form.title,
        videoUrl: form.videoUrl,
        durationSeconds: parseInt(form.durationSeconds, 10),
        description: form.description || undefined,
        tags,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
      };
      if (form.vertical === "FLASH_SALE" && form.flashSaleEndsAt) {
        payload.flashSaleEndsAt = new Date(form.flashSaleEndsAt).toISOString();
      }
      if (form.vertical === "FLASH_COUPON" && form.couponCode) {
        payload.couponCode = form.couponCode;
      }
      if (form.vertical === "PRODUCTS") {
        if (form.productPrice) payload.productPrice = form.productPrice;
        if (form.productPurchaseUrl) payload.productPurchaseUrl = form.productPurchaseUrl;
        if (form.productStock) payload.productStock = form.productStock;
      }
      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const set = (field: keyof FormState, val: string) => setForm((p) => ({ ...p, [field]: val }));

  const handleDurationChange = (val: string) => {
    set("durationSeconds", val);
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
  const v = form.vertical;

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

        {profile && (
          <div>
            <p className="text-xs text-[#555] uppercase tracking-widest mb-2 font-semibold">Posting as</p>
            <ProfileCard profile={profile} showEditLink />
          </div>
        )}

        {completion && !completion.isComplete && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-amber-400" data-testid="alert-incomplete-profile">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Complete your profile before posting. Missing: <strong>{completion.missing.join(", ")}</strong>.{" "}
              <Link href="/provider/profile" className="underline font-semibold text-[#ff1a1a]">Edit profile →</Link>
            </span>
          </div>
        )}

        {dailyStats?.capReached && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400" data-testid="alert-cap-reached">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Daily cap of {dailyStats.maxCap} listings reached. Try again tomorrow.
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff1a1a]/8 border border-[#ff1a1a]/20 text-sm text-[#ff6666]">
          <DollarSign className="h-4 w-4 shrink-0" />
          <span><strong className="text-[#ff1a1a]">$3.00 listing fee</strong> — simulated checkout.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Required fields */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Video Details</h2>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Category *</Label>
              <Select value={form.vertical} onValueChange={(val) => set("vertical", val)}>
                <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff1a1a]" data-testid="select-vertical">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#2a2a2a]">
                  {VERTICALS.map((v) => (
                    <SelectItem key={v.value} value={v.value} className="text-white focus:bg-[#222]">
                      {v.icon} {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Title *</Label>
              <Input
                placeholder="Your video title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required maxLength={200}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Video URL *</Label>
              <Input
                type="url"
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
              <Label className="text-[#aaa] text-sm">Duration (seconds) * <span className="text-[#555] font-normal">Max 20s</span></Label>
              <Input
                type="number" min={1} max={20} placeholder="15"
                value={form.durationSeconds}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-duration"
              />
              {durationWarning && (
                <p className="text-xs text-amber-400 flex items-center gap-1" data-testid="text-duration-warning">
                  <AlertCircle className="h-3 w-3" />
                  Videos over 20 seconds will be rejected.
                </p>
              )}
            </div>
          </div>

          {/* Flash Sale extras */}
          {v === "FLASH_SALE" && (
            <div className="rounded-xl bg-red-950/30 border border-red-500/30 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> Flash Sale Details
              </h2>
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">Sale Ends At</Label>
                <Input
                  type="datetime-local"
                  value={form.flashSaleEndsAt}
                  onChange={(e) => set("flashSaleEndsAt", e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white focus:border-red-500 [color-scheme:dark]"
                  data-testid="input-flash-sale-ends-at"
                />
                <p className="text-xs text-[#555]">A live countdown timer will appear on your video card.</p>
              </div>
            </div>
          )}

          {/* Flash Coupon extras */}
          {v === "FLASH_COUPON" && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Coupon Details
              </h2>
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">Coupon Code *</Label>
                <Input
                  placeholder="SAVE20"
                  value={form.couponCode}
                  onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
                  maxLength={40}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-emerald-500 font-mono tracking-widest uppercase"
                  data-testid="input-coupon-code"
                />
                <p className="text-xs text-[#555]">Viewers can copy this code with one tap. A green glowing border highlights your card.</p>
              </div>
            </div>
          )}

          {/* Products extras */}
          {v === "PRODUCTS" && (
            <div className="rounded-xl bg-orange-950/30 border border-orange-500/30 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" /> Product Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[#aaa] text-sm">Price</Label>
                  <Input
                    placeholder="$29.99"
                    value={form.productPrice}
                    onChange={(e) => set("productPrice", e.target.value)}
                    maxLength={30}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-orange-500"
                    data-testid="input-product-price"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#aaa] text-sm">Stock Indicator</Label>
                  <Input
                    placeholder="Only 12 left!"
                    value={form.productStock}
                    onChange={(e) => set("productStock", e.target.value)}
                    maxLength={50}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-orange-500"
                    data-testid="input-product-stock"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">Purchase URL</Label>
                <Input
                  type="url"
                  placeholder="https://yourstore.com/product"
                  value={form.productPurchaseUrl}
                  onChange={(e) => set("productPurchaseUrl", e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-orange-500"
                  data-testid="input-product-purchase-url"
                />
              </div>
            </div>
          )}

          {/* Optional fields */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Optional Details</h2>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Description</Label>
              <Textarea
                placeholder="Brief description of your video..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3} maxLength={1000}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a] resize-none"
                data-testid="input-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#aaa] text-sm">Tags <span className="text-[#555] font-normal">(comma-separated)</span></Label>
              <Input
                placeholder="marketing, email, growth"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-tags"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">CTA Button Label</Label>
                <Input
                  placeholder="Get the guide"
                  value={form.ctaLabel}
                  onChange={(e) => set("ctaLabel", e.target.value)}
                  maxLength={60}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                  data-testid="input-cta-label"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">CTA URL</Label>
                <Input
                  type="url"
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
            Payment is simulated. Stripe can be connected for real charges.
          </p>
        </form>
      </div>
    </div>
  );
}
