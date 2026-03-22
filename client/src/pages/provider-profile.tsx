import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ArrowLeft, Instagram, Youtube, Webhook, Globe, Images, Camera, X, Upload, LogOut, Film, FileText, Bot, Info, AlertTriangle, Video, Zap, Lock, Radio, Play, Square, Users, Plus, KanbanSquare } from "lucide-react";
import { InviteCard } from "@/components/invite-card";
import { SiTiktok, SiFacebook, SiDiscord, SiX } from "react-icons/si";
import type { ProviderProfile } from "@shared/schema";

function ImageUploadField({
  value, onChange, label, hint, required, testId, aspect = "square",
}: {
  value: string; onChange: (url: string) => void;
  label: string; hint?: string; required?: boolean;
  testId?: string; aspect?: "square" | "wide";
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(() => value?.startsWith("/uploads/") ? value : "");
  const [urlInput, setUrlInput] = useState<string>(() => value && !value?.startsWith("/uploads/") ? value : "");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (value?.startsWith("/uploads/")) {
      setUploadedUrl(value);
      setUrlInput("");
    } else {
      setUrlInput(value ?? "");
      setUploadedUrl("");
    }
  }, [value]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setUploadedUrl(url);
      setUrlInput("");
      onChange(url);
    } catch {
      toast({ title: "Upload failed", description: "Please try again or paste a URL.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (v: string) => {
    setUrlInput(v);
    setUploadedUrl("");
    onChange(v);
  };

  const imgClass = aspect === "wide"
    ? "w-full h-24 object-cover rounded-lg border border-[#2a2a2a]"
    : "w-16 h-16 object-cover rounded-full border-2 border-[#2a2a2a]";

  return (
    <div className="space-y-2">
      <Label className="text-[#aaa] text-sm">{label}{required && " *"}{hint && <span className="text-[#555] font-normal"> {hint}</span>}</Label>

      {/* Upload section */}
      <div className="rounded-lg border border-[#1e1e1e] bg-[#080808] p-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444]">Upload file</p>
        {uploadedUrl ? (
          <div className="flex items-center gap-3">
            <img src={uploadedUrl} alt="" className={imgClass} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <button type="button" onClick={() => { setUploadedUrl(""); onChange(urlInput); }} className="text-xs text-[#555] hover:text-red-400 transition-colors flex items-center gap-1">
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm text-[#666] hover:text-white border border-dashed border-[#2a2a2a] hover:border-[#ff1a1a] rounded-lg px-4 py-2.5 w-full justify-center transition-colors"
            data-testid={testId ? `button-upload-${testId}` : undefined}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Browse & upload"}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[#1a1a1a]" />
        <span className="text-[10px] text-[#3a3a3a]">or paste URL</span>
        <div className="h-px flex-1 bg-[#1a1a1a]" />
      </div>

      {/* URL section */}
      <div className="rounded-lg border border-[#1e1e1e] bg-[#080808] p-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444]">Image URL</p>
        <Input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={urlInput}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff1a1a] text-sm"
          data-testid={testId}
        />
        {urlInput && (
          <div className="flex items-center gap-3">
            <img src={urlInput} alt="Preview" className={imgClass} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <button type="button" onClick={() => handleUrlChange("")} className="text-xs text-[#555] hover:text-red-400 transition-colors flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

const VERTICALS = [
  { value: "INFLUENCER",      label: "Influencer" },
  { value: "MARKETING",       label: "Marketing" },
  { value: "COURSES",         label: "Courses" },
  { value: "COACHING",        label: "Coaching" },
  { value: "PRODUCTS",        label: "Products" },
  { value: "FLASH_SALE",      label: "Flash Sale" },
  { value: "FLASH_COUPON",    label: "Flash Coupon" },
  { value: "MUSIC",           label: "Music" },
  { value: "MUSIC_GIGS",      label: "Music Gigs" },
  { value: "EVENTS",          label: "Events" },
  { value: "CRYPTO",          label: "Crypto" },
  { value: "CORPORATE_DEALS", label: "Corporate Deals" },
  { value: "FOR_SALE",        label: "For Sale" },
  { value: "LAIH",            label: "Life As It Happens" },
  { value: "RANDOMNESS",      label: "Randomness" },
  { value: "HEALTH",          label: "Health" },
  { value: "SCIENCE",         label: "Science" },
  { value: "RANTS",           label: "Rants" },
  { value: "ARTISTS",         label: "Artists" },
  { value: "BUSINESS",        label: "Business" },
];

type FormState = {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  thumbUrl: string;
  primaryCategory: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactTelegram: string;
  websiteUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  discordUrl: string;
  twitterUrl: string;
  photo1Url: string;
  photo2Url: string;
  photo3Url: string;
  photo4Url: string;
  photo5Url: string;
  photo6Url: string;
  webhookUrl: string;
  adFormat: string;
  showPhone: boolean;
};

const EMPTY: FormState = {
  displayName: "", username: "", bio: "", avatarUrl: "", thumbUrl: "",
  primaryCategory: "", location: "", contactEmail: "", contactPhone: "",
  contactTelegram: "", websiteUrl: "", instagramUrl: "", youtubeUrl: "", tiktokUrl: "",
  facebookUrl: "", discordUrl: "", twitterUrl: "",
  photo1Url: "", photo2Url: "", photo3Url: "", photo4Url: "", photo5Url: "", photo6Url: "",
  webhookUrl: "", adFormat: "", showPhone: false,
};

const inputCls = "bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]";

export default function ProviderProfilePage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

  // ── Go Live state ─────────────────────────────────────────────────────────
  const [liveTitle, setLiveTitle]           = useState("");
  const [liveCategory, setLiveCategory]     = useState("");
  const [liveStreamUrl, setLiveStreamUrl]   = useState("");
  const [liveThumbnail, setLiveThumbnail]   = useState("");
  const [liveOpen, setLiveOpen]             = useState(false);
  const [liveSession, setLiveSession]       = useState<{ id: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  const { data: profile } = useQuery<ProviderProfile>({
    queryKey: ["/api/profile/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        displayName:      profile.displayName ?? "",
        username:         profile.username ?? "",
        bio:              profile.bio ?? "",
        avatarUrl:        profile.avatarUrl ?? "",
        thumbUrl:         profile.thumbUrl ?? "",
        primaryCategory:  profile.primaryCategory ?? "",
        location:         profile.location ?? "",
        contactEmail:     profile.contactEmail ?? "",
        contactPhone:     profile.contactPhone ?? "",
        contactTelegram:  profile.contactTelegram ?? "",
        websiteUrl:       profile.websiteUrl ?? "",
        instagramUrl:     profile.instagramUrl ?? "",
        youtubeUrl:       profile.youtubeUrl ?? "",
        tiktokUrl:        profile.tiktokUrl ?? "",
        facebookUrl:      (profile as any).facebookUrl ?? "",
        discordUrl:       (profile as any).discordUrl ?? "",
        twitterUrl:       (profile as any).twitterUrl ?? "",
        photo1Url:        (profile as any).photo1Url ?? "",
        photo2Url:        (profile as any).photo2Url ?? "",
        photo3Url:        (profile as any).photo3Url ?? "",
        photo4Url:        (profile as any).photo4Url ?? "",
        photo5Url:        (profile as any).photo5Url ?? "",
        photo6Url:        (profile as any).photo6Url ?? "",
        webhookUrl:       (profile as any).webhookUrl ?? "",
        adFormat:         (profile as any).adFormat ?? "",
        showPhone:        (profile as any).showPhone ?? false,
      });
    }
  }, [profile]);

  const nullify = (v: string) => v.trim() || null;

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        ...data,
        username:        nullify(data.username),
        primaryCategory: nullify(data.primaryCategory),
        location:        nullify(data.location),
        contactEmail:    nullify(data.contactEmail),
        contactPhone:    nullify(data.contactPhone),
        contactTelegram: nullify(data.contactTelegram),
        websiteUrl:      nullify(data.websiteUrl),
        instagramUrl:    nullify(data.instagramUrl),
        youtubeUrl:      nullify(data.youtubeUrl),
        tiktokUrl:       nullify(data.tiktokUrl),
        facebookUrl:     nullify(data.facebookUrl),
        discordUrl:      nullify(data.discordUrl),
        twitterUrl:      nullify(data.twitterUrl),
        photo1Url:       nullify(data.photo1Url),
        photo2Url:       nullify(data.photo2Url),
        photo3Url:       nullify(data.photo3Url),
        photo4Url:       nullify(data.photo4Url),
        photo5Url:       nullify(data.photo5Url),
        photo6Url:       nullify(data.photo6Url),
        webhookUrl:      nullify(data.webhookUrl),
      };
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/me/completion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile saved", description: "Your creator profile has been updated." });
    },
    onError: () => toast({ title: "Error saving profile", variant: "destructive" }),
  });

  // ── Go Live mutation ───────────────────────────────────────────────────────
  function detectPlatform(url: string): { mode: "external" | "native"; platform: string } {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return { mode: "external", platform: "youtube" };
      if (u.hostname.includes("twitch.tv"))   return { mode: "external", platform: "twitch" };
      if (u.hostname.includes("facebook.com")) return { mode: "external", platform: "facebook" };
      if (u.hostname.includes("instagram.com")) return { mode: "external", platform: "instagram" };
      if (u.hostname.includes("tiktok.com"))   return { mode: "external", platform: "tiktok" };
      return { mode: "native", platform: "native" };
    } catch { return { mode: "native", platform: "native" }; }
  }

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const { mode, platform } = detectPlatform(liveStreamUrl);
      const res = await fetch("/api/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: liveTitle.trim(),
          category: liveCategory || form.primaryCategory || "MARKETING",
          mode,
          platform,
          streamUrl: liveStreamUrl.trim(),
          thumbnailUrl: liveThumbnail.trim() || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Failed to go live"); }
      return res.json();
    },
    onSuccess: (data) => {
      setLiveSession(data);
      queryClient.invalidateQueries({ queryKey: ["/api/live/active"] });
      toast({ title: "You're live! 🔴", description: "Your stream is now broadcasting on Gigzito." });
    },
    onError: (err: any) => toast({ title: "Go live failed", description: err.message, variant: "destructive" }),
  });

  const endLiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/live/${id}/end`, { method: "PATCH", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to end session");
      return res.json();
    },
    onSuccess: () => {
      setLiveSession(null);
      queryClient.invalidateQueries({ queryKey: ["/api/live/active"] });
      toast({ title: "Stream ended", description: "Your live session has been closed." });
    },
    onError: () => toast({ title: "Error ending stream", variant: "destructive" }),
  });

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (authLoading) return <div className="min-h-screen bg-black"><Navbar /></div>;
  if (!user) return null;

  const previewProfile: ProviderProfile = {
    id:              profile?.id ?? 0,
    userId:          profile?.userId ?? 0,
    displayName:     form.displayName || "Your Name",
    bio:             form.bio || "",
    avatarUrl:       form.avatarUrl || "",
    thumbUrl:        form.thumbUrl || "",
    username:        form.username || null,
    primaryCategory: form.primaryCategory || null,
    location:        form.location || null,
    contactEmail:    form.contactEmail || null,
    contactPhone:    form.contactPhone || null,
    contactTelegram: form.contactTelegram || null,
    websiteUrl:      form.websiteUrl || null,
    instagramUrl:    form.instagramUrl || null,
    youtubeUrl:      form.youtubeUrl || null,
    tiktokUrl:       form.tiktokUrl || null,
    facebookUrl:     form.facebookUrl || null,
    discordUrl:      form.discordUrl || null,
    twitterUrl:      form.twitterUrl || null,
    photo1Url:       form.photo1Url || null,
    photo2Url:       form.photo2Url || null,
    photo3Url:       form.photo3Url || null,
    photo4Url:       form.photo4Url || null,
    photo5Url:       form.photo5Url || null,
    photo6Url:       form.photo6Url || null,
    webhookUrl:      form.webhookUrl || null,
  } as any;

  const PHOTOS: (keyof FormState)[] = ["photo1Url", "photo2Url", "photo3Url", "photo4Url", "photo5Url", "photo6Url"];

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-main">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to Main
                </button>
              </Link>
              <Link href="/provider/me">
                <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-profile">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to Profile
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/provider/new">
                <button
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#ff1a1a] hover:bg-[#ff3333] active:scale-95 rounded-full px-3 py-1.5 transition-all"
                  data-testid="button-post-video-profile"
                >
                  <Video className="h-3.5 w-3.5" />
                  Post Video
                </button>
              </Link>
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/70 hover:bg-red-500/10 rounded-full px-3 py-1.5 transition-colors"
                data-testid="button-sign-out-profile"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
          <h1 className="text-xl font-bold text-white" data-testid="text-page-title">Creator Profile</h1>
        </div>

        <ProfileCard profile={previewProfile} />

        <InviteCard />

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Basic Info */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Basic Info</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-[#aaa] text-sm">Display Name *</Label>
                <Input id="displayName" placeholder="Jane Smith" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} required className={inputCls} data-testid="input-display-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[#aaa] text-sm">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">@</span>
                  <Input id="username" placeholder="janesmithpro" value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className={`${inputCls} pl-7`} data-testid="input-username" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[#aaa] text-sm">Bio *</Label>
              <Textarea id="bio" placeholder="Tell viewers about yourself and what you create..." value={form.bio} onChange={(e) => set("bio", e.target.value)} required rows={3} maxLength={300} className={`${inputCls} resize-none`} data-testid="input-bio" />
              <p className="text-xs text-[#444]">{form.bio.length}/300</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primaryCategory" className="text-[#aaa] text-sm">Primary Category *</Label>
                <select
                  value={form.primaryCategory}
                  onChange={(e) => set("primaryCategory", e.target.value)}
                  data-testid="select-primary-category"
                  style={{
                    width: "100%",
                    background: "#111",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    color: form.primaryCategory ? "#fff" : "#444",
                    padding: "10px 12px",
                    fontSize: "14px",
                    outline: "none",
                    appearance: "auto",
                    WebkitAppearance: "auto",
                  }}
                >
                  <option value="" disabled>Choose your niche</option>
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value} style={{ background: "#111", color: "#fff" }}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-[#aaa] text-sm">Location</Label>
                <Input id="location" placeholder="New York, NY" value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} data-testid="input-location" />
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Media</h2>
            <ImageUploadField
              label="Profile Picture"
              hint="(square image)"
              required
              value={form.avatarUrl}
              onChange={(url) => set("avatarUrl", url)}
              testId="input-avatar-url"
              aspect="square"
            />
            <ImageUploadField
              label="Thumbnail"
              hint="(16:9 cover image)"
              value={form.thumbUrl}
              onChange={(url) => set("thumbUrl", url)}
              testId="input-thumb-url"
              aspect="wide"
            />
          </div>

          {/* Photo Gallery */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
                <Images className="h-3.5 w-3.5" /> Photo Gallery
              </h2>
              <p className="text-xs text-[#444] mt-1">Upload or paste up to 6 photos — they appear as a gallery on your public profile.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PHOTOS.map((field, i) => (
                <ImageUploadField
                  key={field}
                  label={`Photo ${i + 1}`}
                  value={form[field]}
                  onChange={(url) => set(field, url)}
                  testId={`input-photo${i + 1}-url`}
                  aspect="wide"
                />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">
              Contact <span className="normal-case font-normal text-[#444]">(at least one required)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail" className="text-[#aaa] text-sm">Email</Label>
                <Input id="contactEmail" type="email" placeholder="contact@example.com" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} data-testid="input-contact-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="text-[#aaa] text-sm">Phone</Label>
                <Input id="contactPhone" type="tel" placeholder="+1 555 000 0000" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={inputCls} data-testid="input-contact-phone" />
                <div className="mt-1.5 rounded-lg border border-yellow-600/40 bg-yellow-950/30 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs text-yellow-400 font-medium leading-snug">
                      Warning: Showing your phone number publicly exposes it to the entire internet. Spam calls, scrapers, and unwanted contact are likely. Only enable this if you fully accept that risk.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.showPhone}
                        onChange={(e) => set("showPhone", e.target.checked)}
                        data-testid="checkbox-show-phone"
                        className="w-4 h-4 accent-yellow-500 cursor-pointer"
                      />
                      <span className="text-xs text-yellow-300 font-semibold">I understand — show my phone publicly</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTelegram" className="text-[#aaa] text-sm">Telegram</Label>
                <Input id="contactTelegram" placeholder="@username" value={form.contactTelegram} onChange={(e) => set("contactTelegram", e.target.value)} className={inputCls} data-testid="input-contact-telegram" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="websiteUrl" className="text-[#aaa] text-sm">Website</Label>
                <Input id="websiteUrl" type="url" placeholder="https://yoursite.com" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} className={inputCls} data-testid="input-website-url" />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Social Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="instagramUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-[#E1306C]" /> Instagram
                </Label>
                <Input id="instagramUrl" type="url" placeholder="https://instagram.com/yourhandle" value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} className={inputCls} data-testid="input-instagram-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="youtubeUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-[#FF0000]" /> YouTube
                </Label>
                <Input id="youtubeUrl" type="url" placeholder="https://youtube.com/@yourchannel" value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} className={inputCls} data-testid="input-youtube-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tiktokUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <SiTiktok className="h-3.5 w-3.5" /> TikTok
                </Label>
                <Input id="tiktokUrl" type="url" placeholder="https://tiktok.com/@yourhandle" value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} className={inputCls} data-testid="input-tiktok-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facebookUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <SiFacebook className="h-3.5 w-3.5 text-[#1877F2]" /> Facebook
                </Label>
                <Input id="facebookUrl" type="url" placeholder="https://facebook.com/yourpage" value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} className={inputCls} data-testid="input-facebook-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discordUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <SiDiscord className="h-3.5 w-3.5 text-[#5865F2]" /> Discord
                </Label>
                <Input id="discordUrl" type="url" placeholder="https://discord.gg/yourserver" value={form.discordUrl} onChange={(e) => set("discordUrl", e.target.value)} className={inputCls} data-testid="input-discord-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="twitterUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                  <SiX className="h-3.5 w-3.5" /> X / Twitter
                </Label>
                <Input id="twitterUrl" type="url" placeholder="https://x.com/yourhandle" value={form.twitterUrl} onChange={(e) => set("twitterUrl", e.target.value)} className={inputCls} data-testid="input-twitter-url" />
              </div>
            </div>
          </div>

          {/* Ad Format */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" /> Sponsor Ad Format
              </h2>
              <p className="text-xs text-[#444] mt-1">Tell us what type of sponsor ad you plan to run on Gigzito.</p>
            </div>

            {/* Format picker */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "VIDEO", label: "Video Ad", icon: Film, desc: "Short-form video clip" },
                { value: "TEXT",  label: "Text Ad",  icon: FileText, desc: "Image + headline copy" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`button-ad-format-${value.toLowerCase()}`}
                  onClick={() => set("adFormat", value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    form.adFormat === value
                      ? "border-[#ff2b2b] bg-[#ff2b2b]/10 text-white"
                      : "border-[#1e1e1e] bg-[#080808] text-[#555] hover:border-[#333] hover:text-[#aaa]"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[10px] text-center leading-relaxed opacity-70">{desc}</span>
                </button>
              ))}
            </div>

            {/* Guidance panel — shown once a format is selected */}
            {form.adFormat && (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#060606] p-4 space-y-3">
                {/* GPT encouragement */}
                <div className="flex items-start gap-2.5">
                  <Bot className="h-4 w-4 text-[#ff2b2b] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white mb-0.5">Build your ad with AI first</p>
                    <p className="text-[11px] text-[#777] leading-relaxed">
                      Before uploading, draft your ad using your favorite AI tool — ChatGPT, Claude, or Gemini work great.
                      Describe your product, audience, and goal, then ask it to write your headline, body copy, and CTA.
                      For video ads, have it script your 15–30 second clip and suggest visuals.
                    </p>
                  </div>
                </div>

                {/* Video dimensions — shown for VIDEO format */}
                {form.adFormat === "VIDEO" && (
                  <div className="flex items-start gap-2.5">
                    <Film className="h-4 w-4 text-[#888] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white mb-1.5">Accepted video dimensions</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { ratio: "9:16", size: "1080 × 1920", label: "Vertical", note: "Recommended" },
                          { ratio: "1:1",  size: "1080 × 1080", label: "Square",   note: "" },
                          { ratio: "16:9", size: "1920 × 1080", label: "Landscape",note: "" },
                        ].map(({ ratio, size, label, note }) => (
                          <div key={ratio} className={`rounded-lg border p-2.5 text-center ${note ? "border-[#ff2b2b]/40 bg-[#ff2b2b]/5" : "border-[#1e1e1e] bg-[#0d0d0d]"}`}>
                            <p className="text-xs font-bold text-white">{ratio}</p>
                            <p className="text-[10px] text-[#666] mt-0.5">{size}</p>
                            <p className="text-[10px] text-[#555]">{label}</p>
                            {note && <p className="text-[9px] text-[#ff2b2b] font-semibold mt-0.5">{note}</p>}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#555] mt-2">Max duration: 30 seconds · MP4/MOV · max 500 MB</p>
                    </div>
                  </div>
                )}

                {/* No server-side tools notice */}
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-[#555] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#555] leading-relaxed">
                    <span className="text-[#777] font-semibold">No server-side media processing in this phase.</span>{" "}
                    Please produce and export your final {form.adFormat === "VIDEO" ? "video" : "image"} before uploading.
                    Full multimedia production tools are coming to the Gigzito ecosystem soon.
                  </p>
                </div>

                {/* Scanning notice */}
                <div className="flex items-start gap-2.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-3">
                  <Bot className="h-4 w-4 text-[#ff2b2b] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#888] leading-relaxed">
                    <span className="text-white font-semibold">All ads are scanned before going live.</span>{" "}
                    Our content intelligence bots automatically review every ad for policy compliance.
                    Ads that pass scan are activated; flagged ads are held for manual review.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Integrations */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Integrations</h2>
            <div className="space-y-1.5">
              <Label htmlFor="webhookUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                <Webhook className="h-3.5 w-3.5" /> Webhook URL <span className="text-[#444] font-normal">(optional)</span>
              </Label>
              <Input id="webhookUrl" type="url" placeholder="https://hooks.yourapp.com/leads" value={form.webhookUrl} onChange={(e) => set("webhookUrl", e.target.value)} className={inputCls} data-testid="input-webhook-url" />
              <p className="text-xs text-[#444]">When set, new lead inquiries will be POSTed as JSON to this URL in real time.</p>
            </div>
          </div>

          {/* ── GZGroups ─────────────────────────────────────────────────────────── */}
          {(() => {
            const tier = (user as any)?.user?.subscriptionTier ?? "";
            const role = (user as any)?.user?.role ?? "";
            const hasGroups = ["GZGroups", "GZMarketerPro", "GZBusiness", "GZEnterprise"].includes(tier) ||
              ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(role);
            return hasGroups ? (
              <div className="rounded-xl border border-green-700/40 bg-green-950/10 p-4 space-y-3" data-testid="section-gzgroups-profile">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-900/40 border border-green-700/40 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">GZGroups</p>
                    <p className="text-[11px] text-[#666]">Your private community clubhouse — Wall, Calendar, Kanban & more</p>
                  </div>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded border border-green-700/50 text-green-300 bg-green-900/30 uppercase tracking-widest">
                    {tier}
                  </span>
                </div>
                <p className="text-xs text-[#555] leading-relaxed">
                  Create invite-only or open groups with a shared <span className="text-green-400 font-semibold">Wall</span>, <span className="text-blue-400 font-semibold">Calendar</span>, <span className="text-amber-400 font-semibold">Kanban board</span>, Endeavors, and Member roster. Meetup charges $39/mo — yours is included.
                </p>
                <div className="flex gap-2">
                  <a href="/groups" data-testid="btn-go-to-my-groups" className="flex-1">
                    <Button
                      type="button"
                      className="w-full bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl h-10 text-sm flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      My Groups
                    </Button>
                  </a>
                  <a href="/groups?create=1" data-testid="btn-create-group-profile" className="flex-1">
                    <Button
                      type="button"
                      className="w-full bg-green-900/60 hover:bg-green-800/60 border border-green-700/40 text-green-300 font-bold rounded-xl h-10 text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Group
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] p-4 space-y-2" data-testid="section-gzgroups-locked">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#444]" />
                  <p className="text-sm font-semibold text-[#555]">GZGroups</p>
                  <span className="ml-auto text-[9px] font-semibold text-[#444] uppercase tracking-wider">Locked</span>
                </div>
                <p className="text-xs text-[#444] leading-relaxed">
                  Community groups are available to <span className="text-green-500">GZGroups</span> ($8/mo) and above. Create your tribe — unlimited members, no extra cost.
                </p>
                <a href="/pricing" data-testid="btn-upgrade-for-groups">
                  <Button type="button" variant="ghost" className="w-full border border-[#2a2a2a] text-[#555] hover:text-white hover:border-green-700/50 text-xs rounded-xl h-9">
                    View Upgrade Plans
                  </Button>
                </a>
              </div>
            );
          })()}

          {/* ── GZFlash Ad Center ───────────────────────────────────────────────── */}
          {(() => {
            const tier = (user as any)?.user?.subscriptionTier ?? "";
            const role = (user as any)?.user?.role ?? "";
            const hasFlash = ["GZMarketerPro", "GZBusiness", "GZEnterprise"].includes(tier) ||
              ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(role);
            return hasFlash ? (
              <div className="rounded-xl border border-blue-700/40 bg-blue-950/10 p-4 space-y-3" data-testid="section-gzflash-profile">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-900/40 border border-blue-700/40 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">GZFlash Ad Center</p>
                    <p className="text-[11px] text-[#666]">Deploy time-limited flash deals — compete for Pole Position in real-time</p>
                  </div>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded border border-blue-700/50 text-blue-300 bg-blue-900/30 uppercase tracking-widest">
                    {tier}
                  </span>
                </div>
                <p className="text-xs text-[#555] leading-relaxed">
                  Create flash deals with countdown timers, set your discount percentage, quantity, and how long the deal runs.
                  Ads are ranked by a live <span className="text-blue-400 font-semibold">Potency Score</span> — HOT, TRENDING, ACTIVE, or COOL — based on claims and time remaining.
                </p>
                <a href="/gz-business" data-testid="btn-open-gzflash-center">
                  <Button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl h-10 text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Open GZFlash Ad Center
                  </Button>
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] p-4 space-y-2" data-testid="section-gzflash-locked">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#444]" />
                  <p className="text-sm font-semibold text-[#555]">GZFlash Ad Center</p>
                  <span className="ml-auto text-[9px] font-semibold text-[#444] uppercase tracking-wider">Locked</span>
                </div>
                <p className="text-xs text-[#444] leading-relaxed">
                  Flash ads are available to <span className="text-blue-400">GZMarketerPro</span>, <span className="text-amber-400">GZBusiness</span>, and <span className="text-cyan-400">GZEnterprise</span> members.
                  Upgrade your plan to unlock time-limited flash deals that compete for real-time Pole Position.
                </p>
                <a href="/pricing" data-testid="btn-upgrade-for-gzflash">
                  <Button type="button" variant="ghost" className="w-full border border-[#2a2a2a] text-[#555] hover:text-white hover:border-blue-700/50 text-xs rounded-xl h-9">
                    View Upgrade Plans
                  </Button>
                </a>
              </div>
            );
          })()}

          {/* ── Go Live Section ─────────────────────────────────────────── */}
          {(() => {
            const liveRole = (user as any)?.user?.role ?? "";
            const canGoLive = ["INFLUENCER", "ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(liveRole);

            return (
              <div
                className={`rounded-xl border overflow-hidden transition-all ${
                  liveSession
                    ? "border-[#ff2b2b]/60 ring-1 ring-[#ff2b2b]/20"
                    : canGoLive ? "border-[#1e1e1e]" : "border-[#141414]"
                }`}
                data-testid="section-go-live"
              >
                {/* Header / toggle */}
                <button
                  type="button"
                  onClick={() => { if (!liveSession) setLiveOpen((o) => !o); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#0b0b0b] hover:bg-[#0e0e0e] transition-colors text-left"
                  data-testid="btn-toggle-go-live"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${liveSession ? "bg-[#ff2b2b]" : "bg-[#ff2b2b]/10 border border-[#ff2b2b]/30"}`}>
                    <Radio className={`w-4 h-4 ${liveSession ? "text-white" : "text-[#ff2b2b]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">
                      {liveSession ? "You're Live 🔴" : "Go Live"}
                    </p>
                    <p className="text-[11px] text-[#555] truncate">
                      {liveSession
                        ? "Your stream is broadcasting on Gigzito + Zito.TV"
                        : canGoLive
                          ? "Set your topic, cover photo, and stream source — then tap Go LIVE"
                          : "Live streaming via Zito.TV — launching soon"}
                    </p>
                  </div>
                  {liveSession ? (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-[#ff2b2b] text-white animate-pulse">
                      LIVE
                    </span>
                  ) : (
                    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${canGoLive ? "bg-cyan-500/10 border border-cyan-500/25 text-cyan-400" : "bg-[#111] border border-[#1e1e1e] text-[#444]"}`}>
                      {canGoLive ? "Zito.TV" : "Coming Soon"}
                    </span>
                  )}
                </button>

                {/* ── Active stream dashboard ── */}
                {liveSession && (
                  <div className="px-4 pb-4 pt-3 bg-[#070a0c] space-y-4">
                    <div className="rounded-xl bg-[#ff2b2b]/5 border border-[#ff2b2b]/20 p-4 flex flex-col items-center gap-3 text-center">
                      <div className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2b2b] opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff2b2b]" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{liveTitle || "Live Stream"}</p>
                        <p className="text-[#555] text-xs mt-0.5">Broadcasting via Zito.TV</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => navigate(`/live/${liveSession.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                          data-testid="btn-view-live-session"
                        >
                          <Play className="w-3.5 h-3.5" /> View Stream
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (liveSession) endLiveMutation.mutate(liveSession.id); }}
                          disabled={endLiveMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#ff2b2b]/10 hover:bg-[#ff2b2b]/20 border border-[#ff2b2b]/30 text-[#ff2b2b] text-xs font-bold transition-colors disabled:opacity-50"
                          data-testid="btn-end-live-profile"
                        >
                          {endLiveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                          End Stream
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Coming Soon (non-influencer users) ── */}
                {!liveSession && liveOpen && !canGoLive && (
                  <div className="px-4 pb-6 pt-4 bg-[#060606] flex flex-col items-center text-center gap-4" data-testid="section-zitotv-coming-soon">
                    {/* Logo mark */}
                    <div className="relative mt-2">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff2b2b]/20 to-cyan-600/10 border border-[#ff2b2b]/20 flex items-center justify-center">
                        <Radio className="w-7 h-7 text-[#ff2b2b]" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-cyan-500 text-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-white font-bold text-base">Zito.TV is on its way</p>
                      <p className="text-[#555] text-xs leading-relaxed max-w-[260px]">
                        We're building the best live-streaming experience on Gigzito — and it's almost ready. Stay tuned.
                      </p>
                    </div>

                    <div className="w-full rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-4 space-y-3 text-left">
                      <p className="text-[10px] font-bold text-[#333] uppercase tracking-widest">What to expect</p>
                      {[
                        { icon: "📡", text: "Broadcast directly through Gigzito — powered by Zito.TV infrastructure" },
                        { icon: "🎥", text: "Some content will be streamable — we support open-format and direct streams" },
                        { icon: "🤝", text: "Out of respect for partner platforms, some streams redirect to their native player instead of embedding — we'll always tell you why" },
                        { icon: "🌐", text: "Live sessions register on Zito.TV automatically, giving you cross-platform reach" },
                      ].map((item) => (
                        <div key={item.icon} className="flex gap-2.5 items-start">
                          <span className="text-sm mt-0.5 shrink-0">{item.icon}</span>
                          <p className="text-[11px] text-[#444] leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="w-full rounded-xl bg-[#0a0f0a] border border-[#1a2a1a] p-3 flex gap-2.5 items-start text-left">
                      <Info className="w-3.5 h-3.5 text-[#444] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#3a3a3a] leading-relaxed">
                        Live streaming access is currently available to select Gigzito creators. If you'd like early access, reach out to the Gigzito team.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Setup form (influencer / admin users only) ── */}
                {!liveSession && liveOpen && canGoLive && (
                  <div className="px-4 pb-5 pt-3 bg-[#070a0c] space-y-4">

                    {/* Cover photo */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#555] uppercase tracking-widest">Cover Photo</p>
                      <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-[#1e1e1e] aspect-video flex items-center justify-center">
                        {liveThumbnail ? (
                          <>
                            <img src={liveThumbnail} alt="Cover" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setLiveThumbnail("")}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                              data-testid="btn-clear-live-thumbnail"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center space-y-2 py-6">
                            <Camera className="w-8 h-8 text-[#333] mx-auto" />
                            <p className="text-[#444] text-xs">Cover photo</p>
                          </div>
                        )}
                      </div>
                      <Input
                        type="url"
                        placeholder="https://... (cover photo URL)"
                        value={liveThumbnail}
                        onChange={(e) => setLiveThumbnail(e.target.value)}
                        className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm focus:border-[#ff2b2b] h-9"
                        data-testid="input-live-thumbnail-url"
                      />
                    </div>

                    {/* Topic */}
                    <div className="space-y-1.5">
                      <Label className="text-[#aaa] text-xs font-semibold uppercase tracking-widest">Topic *</Label>
                      <Input
                        placeholder="What are you broadcasting today?"
                        value={liveTitle}
                        onChange={(e) => setLiveTitle(e.target.value)}
                        maxLength={100}
                        className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                        data-testid="input-live-topic"
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <Label className="text-[#aaa] text-xs font-semibold uppercase tracking-widest">Category</Label>
                      <Select value={liveCategory || form.primaryCategory} onValueChange={setLiveCategory}>
                        <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff2b2b]" data-testid="select-live-category-profile">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-[#2a2a2a]">
                          {[
                            { v: "MUSIC_GIGS",      l: "Music Gigs" },
                            { v: "EVENTS",          l: "Events" },
                            { v: "INFLUENCER",      l: "Influencer" },
                            { v: "COACHING",        l: "Coaching" },
                            { v: "COURSES",         l: "Courses" },
                            { v: "MARKETING",       l: "Marketing" },
                            { v: "CORPORATE_DEALS", l: "Corporate Deals" },
                            { v: "PRODUCTS",        l: "Products" },
                            { v: "CRYPTO",          l: "Crypto" },
                          ].map((c) => (
                            <SelectItem key={c.v} value={c.v} className="text-white focus:bg-[#222]">{c.l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stream source URL */}
                    <div className="space-y-1.5">
                      <Label className="text-[#aaa] text-xs font-semibold uppercase tracking-widest">Stream Source *</Label>
                      <Input
                        type="url"
                        placeholder="https://youtube.com/live/... or twitch.tv/channel or your HLS URL"
                        value={liveStreamUrl}
                        onChange={(e) => setLiveStreamUrl(e.target.value)}
                        className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff2b2b]"
                        data-testid="input-live-stream-url"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          { label: "YouTube", color: "text-[#FF0000] border-[#FF0000]/20 bg-[#FF0000]/5" },
                          { label: "TikTok",  color: "text-white border-white/20 bg-white/5" },
                          { label: "Twitch",  color: "text-[#9147FF] border-[#9147FF]/20 bg-[#9147FF]/5" },
                          { label: "Direct",  color: "text-[#888] border-[#888]/20 bg-[#888]/5" },
                        ].map((p) => (
                          <span key={p.label} className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${p.color}`}>{p.label}</span>
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Quick Tips</p>
                      {[
                        "Start your stream on YouTube/TikTok/Twitch first, then paste the live URL here",
                        "YouTube Live and Twitch embed directly inside Gigzito",
                        "TikTok, Instagram & Facebook redirect viewers to your live — we'll explain why in the player",
                        "Your stream registers on Zito.TV automatically — heartbeats keep it active",
                      ].map((tip) => (
                        <p key={tip} className="text-[11px] text-[#333] flex gap-1.5 items-start">
                          <span className="text-[#ff2b2b] mt-0.5 shrink-0">·</span> {tip}
                        </p>
                      ))}
                    </div>

                    {/* GO LIVE button */}
                    <button
                      type="button"
                      disabled={!liveTitle.trim() || !liveStreamUrl.trim() || goLiveMutation.isPending}
                      onClick={() => goLiveMutation.mutate()}
                      className="w-full h-14 rounded-xl font-black text-lg tracking-wide flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: goLiveMutation.isPending ? "#333" : "linear-gradient(135deg, #ff1a00, #ff2b2b, #cc0000)",
                        color: "#fff",
                        boxShadow: goLiveMutation.isPending ? "none" : "0 0 30px rgba(255,43,43,0.4), 0 4px 16px rgba(255,0,0,0.3)",
                      }}
                      data-testid="btn-go-live-now"
                    >
                      {goLiveMutation.isPending ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</>
                      ) : (
                        <><Radio className="w-5 h-5" /> GO LIVE</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <Button
            type="submit"
            className="w-full bg-[#ff1a1a] hover:bg-[#ff2a2a] text-white font-bold rounded-xl h-12 text-sm"
            disabled={mutation.isPending}
            data-testid="button-save-profile"
          >
            {mutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <CheckCircle2 className="h-4 w-4 mr-2" />
            }
            Save Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
