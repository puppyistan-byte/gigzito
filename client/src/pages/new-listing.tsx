import { useEffect, useState, useMemo, useRef } from "react";
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
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, DollarSign, Timer, Tag, ShoppingCart, Zap, Smartphone, Link2, Upload, Film, X } from "lucide-react";
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
  revealUrl: boolean;
  revealEmail: boolean;
  revealName: boolean;
  collectEmail: boolean;
};

const EMPTY: FormState = {
  vertical: "", title: "", videoUrl: "", durationSeconds: "",
  description: "", tags: "", ctaType: "", ctaUrl: "",
  flashSaleEndsAt: "", couponCode: "",
  productPrice: "", productPurchaseUrl: "", productStock: "",
  revealUrl: true, revealEmail: false, revealName: false, collectEmail: true,
};

export default function NewListingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [videoMode, setVideoMode] = useState<"url" | "upload">("url");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        durationSeconds: 60,
        description: form.description || undefined,
        tags,
        ctaType: form.ctaType || undefined,
        ctaUrl: form.ctaUrl || undefined,
        revealUrl: form.revealUrl,
        revealEmail: form.revealEmail,
        revealName: form.revealName,
        collectEmail: form.collectEmail,
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
      const isScanning = data.scanStatus === "SCANNING";
      toast({
        title: "Video listed!",
        description: isScanning
          ? "Your video is live. Bif is scanning it for reputation — you'll be notified when it's done."
          : "Your listing is now live in the feed.",
      });
      navigate(`/listing/${data.listingId}`);
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const set = (field: keyof FormState, val: string) => setForm((p) => ({ ...p, [field]: val }));

  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please upload a video file (MP4, MOV, WebM).", variant: "destructive" });
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 200MB.", variant: "destructive" });
      return;
    }
    // Client-side duration check
    const objectUrl = URL.createObjectURL(file);
    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(objectUrl); resolve(v.duration); };
      v.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(0); };
      v.src = objectUrl;
    });
    if (duration > 61) {
      toast({ title: "Video too long", description: `Your video is ${Math.ceil(duration)}s. Maximum is 60 seconds.`, variant: "destructive" });
      return;
    }
    setUploadedFileName(file.name);
    setUploadProgress(0);
    set("videoUrl", "");
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        set("videoUrl", result.url);
        setUploadProgress(100);
      } else {
        toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
        setUploadProgress(null);
        setUploadedFileName(null);
      }
    };
    xhr.onerror = () => {
      toast({ title: "Upload failed", description: "Network error. Please try again.", variant: "destructive" });
      setUploadProgress(null);
      setUploadedFileName(null);
    };
    xhr.open("POST", "/api/upload/video");
    xhr.send(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.videoUrl) {
      if (videoMode === "upload") {
        toast({ title: "No video uploaded", description: "Please upload your video before submitting.", variant: "destructive" });
      } else {
        toast({ title: "Video URL required", description: "Please enter a video URL.", variant: "destructive" });
      }
      return;
    }
    if (videoMode === "upload" && uploadProgress !== null && uploadProgress < 100) {
      toast({ title: "Upload in progress", description: "Please wait for your video to finish uploading.", variant: "destructive" });
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

            <div className="space-y-3">
              <Label className="text-[#aaa] text-sm">Video *</Label>

              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0d0d0d]" data-testid="video-mode-toggle">
                <button
                  type="button"
                  onClick={() => { setVideoMode("url"); set("videoUrl", ""); setUploadProgress(null); setUploadedFileName(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors"
                  style={{ background: videoMode === "url" ? "rgba(255,43,43,0.15)" : "transparent", color: videoMode === "url" ? "#ff4444" : "#555", borderRight: "1px solid #2a2a2a" }}
                  data-testid="toggle-url-mode"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  URL Mirror
                </button>
                <button
                  type="button"
                  onClick={() => { setVideoMode("upload"); set("videoUrl", ""); setUploadProgress(null); setUploadedFileName(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors"
                  style={{ background: videoMode === "upload" ? "rgba(255,43,43,0.15)" : "transparent", color: videoMode === "upload" ? "#ff4444" : "#555" }}
                  data-testid="toggle-upload-mode"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Video
                </button>
              </div>

              {/* URL Mirror mode */}
              {videoMode === "url" && (
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="https://youtube.com/shorts/... or tiktok.com/..."
                    value={form.videoUrl}
                    onChange={(e) => set("videoUrl", e.target.value)}
                    required
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                    data-testid="input-video-url"
                  />
                  {videoFormatStatus === "landscape" && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300" data-testid="alert-landscape-video">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                      <span><strong className="text-amber-400">Landscape video detected.</strong> Vertical content performs best on Gigzito.</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] text-xs text-[#666]" data-testid="notice-source-format">
                    <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#444]" />
                    <div className="space-y-0.5">
                      <p className="text-[#888] font-semibold">Best with vertical short-form (9:16)</p>
                      <p>YouTube Shorts · TikTok · Instagram Reels · Facebook Reels</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Native Upload mode */}
              {videoMode === "upload" && (
                <div className="space-y-3">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*"
                    className="hidden"
                    data-testid="input-video-file"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }}
                  />

                  {/* Drop zone */}
                  {!uploadedFileName && (
                    <div
                      className="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer"
                      style={{ borderColor: dragOver ? "#ff4444" : "#2a2a2a", background: dragOver ? "rgba(255,43,43,0.05)" : "#0d0d0d", padding: "32px 20px", textAlign: "center" }}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f); }}
                      data-testid="video-drop-zone"
                    >
                      <Film className="h-8 w-8 mx-auto mb-3" style={{ color: "#333" }} />
                      <p className="text-sm font-semibold text-[#555]">Drop your video here</p>
                      <p className="text-xs text-[#333] mt-1">or click to browse</p>
                      <p className="text-[10px] text-[#2a2a2a] mt-3">MP4 · MOV · WebM · Max 60s · Max 200MB</p>
                    </div>
                  )}

                  {/* Upload progress */}
                  {uploadedFileName && uploadProgress !== null && uploadProgress < 100 && (
                    <div className="rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] p-4 space-y-3" data-testid="upload-progress">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-[#ff4444] animate-spin flex-shrink-0" />
                        <p className="text-xs text-[#888] truncate flex-1">{uploadedFileName}</p>
                        <span className="text-xs font-bold text-[#ff4444] flex-shrink-0">{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, #ff2b2b, #ff6644)" }} />
                      </div>
                    </div>
                  )}

                  {/* Upload success */}
                  {uploadedFileName && uploadProgress === 100 && form.videoUrl && (
                    <div className="rounded-xl bg-[#0d1a0d] border border-green-900/50 p-3 flex items-center gap-3" data-testid="upload-success">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-400">Video uploaded</p>
                        <p className="text-[10px] text-green-900/80 text-green-700 truncate mt-0.5">{uploadedFileName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { set("videoUrl", ""); setUploadProgress(null); setUploadedFileName(null); }}
                        className="text-[#444] hover:text-white flex-shrink-0"
                        data-testid="button-remove-upload"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-xs text-[#555]">
                    <Film className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#333]" />
                    <p>Upload vertical (9:16) portrait videos for best results. Content is reviewed before going live.</p>
                  </div>
                </div>
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
                <Select value={form.ctaType || "none"} onValueChange={(val) => set("ctaType", val === "none" ? "" : val)}>
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

          {/* Inquiry reveal settings */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Inquiry Settings</p>
            <div className="rounded-xl border border-[#222] bg-[#111] divide-y divide-[#1e1e1e]">
              {[
                { key: "collectEmail" as const, label: "Collect viewer email", sub: "Ask for email in the inquiry form" },
                { key: "revealUrl" as const, label: "Reveal CTA link after inquiry", sub: "Show the destination URL to viewers after they submit" },
                { key: "revealEmail" as const, label: "Reveal your contact email", sub: "Share your email with inquiring viewers" },
                { key: "revealName" as const, label: "Reveal your first name", sub: "Show your first name in the post-inquiry confirmation" },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-xs text-[#555]">{sub}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form[key]}
                    data-testid={`toggle-${key}`}
                    onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                    style={{
                      width: 40, height: 22,
                      borderRadius: 999,
                      background: form[key] ? "#c41414" : "#333",
                      border: "none",
                      cursor: "pointer",
                      position: "relative",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 3, left: form[key] ? 21 : 3,
                      width: 16, height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              ))}
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
