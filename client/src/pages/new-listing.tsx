import { useEffect, useState, useMemo } from "react";
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
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, DollarSign, Timer, Tag, ShoppingCart, Zap, Smartphone } from "lucide-react";
import type { ProfileCompletionStatus, ProviderProfile, CtaType } from "@shared/schema";

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

const CTA_TYPES: { value: CtaType; label: string; description: string }[] = [
  { value: "Visit Offer",  label: "Visit Offer",  description: "Link to an offer or landing page" },
  { value: "Shop Product", label: "Shop Now",     description: "Direct product link — no email required" },
  { value: "Join Event",   label: "Join Event",   description: "Link to an event or registration page" },
  { value: "Book Service", label: "Book Now",     description: "Link to a booking or scheduling page" },
  { value: "Join Guild",   label: "Join Guild",   description: "Link to a community or membership" },
];

const TIKTOK_DOMAINS = ["tiktok.com", "tiktokshop.com"];

function isTikTokShopUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return TIKTOK_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

type VideoFormatStatus = "vertical" | "landscape" | "unknown";

function detectVideoFormat(url: string): VideoFormatStatus {
  if (!url) return "unknown";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname;
    // Known vertical / short-form platforms
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "vertical";
    if (host === "instagram.com" && (path.includes("/reel") || path.includes("/p/"))) return "vertical";
    if (host === "facebook.com" && path.includes("/reel")) return "vertical";
    if (host === "fb.watch") return "vertical";
    if ((host === "youtube.com" || host === "youtu.be") && path.includes("/shorts/")) return "vertical";
    // Standard YouTube watch links are typically landscape
    if ((host === "youtube.com" || host === "youtu.be") && !path.includes("/shorts/")) return "landscape";
    // Vimeo is typically landscape
    if (host === "vimeo.com") return "landscape";
    return "unknown";
  } catch {
    return "unknown";
  }
}

type Vertical = typeof VERTICALS[number]["value"];

type FormState = {
  vertical: Vertical | "";
  title: string;
  videoUrl: string;
  durationSeconds: string;
  description: string;
  tags: string;
  ctaType: CtaType | "";
  ctaUrl: string;
  flashSaleEndsAt: string;
  couponCode: string;
  productPrice: string;
  productPurchaseUrl: string;
  productStock: string;
};

const EMPTY: FormState = {
  vertical: "", title: "", videoUrl: "", durationSeconds: "",
  description: "", tags: "", ctaType: "", ctaUrl: "",
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

  const isTikTokLink       = useMemo(() => form.ctaUrl ? isTikTokShopUrl(form.ctaUrl) : false, [form.ctaUrl]);
  const videoFormatStatus  = useMemo(() => detectVideoFormat(form.videoUrl), [form.videoUrl]);

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
        ctaType: form.ctaType || undefined,
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
    if (form.ctaType && !form.ctaUrl) {
      toast({ title: "CTA URL required", description: "Please enter a URL for your CTA button.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  if (authLoading) return <div className="min-h-screen bg-black"><Navbar /></div>;
  if (!user) return null;

  const canSubmit = completion?.isComplete && !dailyStats?.capReached;
  const v = form.vertical;
  const selectedCta = CTA_TYPES.find((c) => c.value === form.ctaType);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="space-y-3">
          <Link href="/provider/me">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-profile">
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Profile
            </button>
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
                placeholder="https://youtube.com/shorts/... or tiktok.com/..."
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-video-url"
              />

              {/* Dynamic landscape warning */}
              {videoFormatStatus === "landscape" && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300"
                  data-testid="alert-landscape-video"
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                  <span>
                    <strong className="text-amber-400">Landscape video detected.</strong> This video does not appear to be a vertical short-form format.
                    Engagement and distribution may be limited. You can still post, but vertical content performs best.
                  </span>
                </div>
              )}

              {/* Source Format Notice — always visible */}
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] text-xs text-[#666] mt-1"
                data-testid="notice-source-format"
              >
                <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#444]" />
                <div className="space-y-1">
                  <p className="text-[#888] font-semibold">Source Format Notice</p>
                  <p>Gigzito performs best with short-form <strong className="text-[#666]">vertical (9:16)</strong> videos from:</p>
                  <ul className="list-none space-y-0.5 text-[#555] pl-0">
                    <li>• YouTube Shorts</li>
                    <li>• TikTok</li>
                    <li>• Instagram Reels</li>
                    <li>• Facebook Reels</li>
                  </ul>
                  <p className="text-[#444]">Horizontal or non-short-form videos may appear letterboxed in the feed. Gigzito does not scale or reformat non-vertical content.</p>
                </div>
              </div>
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

            {/* CTA section */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[#aaa] text-sm">CTA Type</Label>
                <Select value={form.ctaType} onValueChange={(val) => set("ctaType", val === "none" ? "" : val)}>
                  <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff1a1a]" data-testid="select-cta-type">
                    <SelectValue placeholder="No CTA (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#2a2a2a]">
                    <SelectItem value="none" className="text-[#666] focus:bg-[#222]">No CTA</SelectItem>
                    {CTA_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-white focus:bg-[#222]">
                        {c.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCta && (
                  <p className="text-xs text-[#555]">
                    Button will show: <span className="text-white font-semibold">"{selectedCta.label}"</span> — {selectedCta.description}
                  </p>
                )}
              </div>

              {form.ctaType && (
                <div className="space-y-1.5">
                  <Label className="text-[#aaa] text-sm">CTA URL {form.ctaType ? "*" : ""}</Label>
                  <Input
                    type="url"
                    placeholder="https://yoursite.com/offer"
                    value={form.ctaUrl}
                    onChange={(e) => set("ctaUrl", e.target.value)}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                    data-testid="input-cta-url"
                  />
                  {isTikTokLink && (
                    <div
                      className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg bg-black border border-[#2a2a2a] text-xs"
                      data-testid="alert-tiktok-shop-detected"
                    >
                      <Zap className="h-3.5 w-3.5 text-[#ff2b2b] shrink-0" />
                      <span className="text-[#ff2b2b] font-semibold">TikTok Shop Link Detected</span>
                      <span className="text-[#555]">– affiliate tracking handled by TikTok.</span>
                    </div>
                  )}
                  {form.ctaType === "Shop Product" && !isTikTokLink && (
                    <p className="text-xs text-[#555]">Viewers will go directly to this URL — no email required.</p>
                  )}
                </div>
              )}
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
