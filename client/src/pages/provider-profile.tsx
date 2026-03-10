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
import { Loader2, CheckCircle2, ArrowLeft, Instagram, Youtube, Webhook, Globe, Images, Camera, X, Upload } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
    } catch {
      toast({ title: "Upload failed", description: "Please try again or paste a URL.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const previewClass = aspect === "wide"
    ? "w-full h-28 object-cover rounded-lg border border-[#2a2a2a]"
    : "w-20 h-20 object-cover rounded-full border-2 border-[#2a2a2a]";

  return (
    <div className="space-y-2">
      <Label className="text-[#aaa] text-sm">{label}{required && " *"}{hint && <span className="text-[#555] font-normal"> {hint}</span>}</Label>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 group">
          {value ? (
            <img src={value} alt="" className={previewClass} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className={`${aspect === "wide" ? "w-28 h-20" : "w-20 h-20 rounded-full"} bg-[#1a1a1a] border border-dashed border-[#333] flex items-center justify-center rounded-${aspect === "wide" ? "lg" : "full"}`}>
              <Camera className="h-5 w-5 text-[#444]" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
            data-testid={testId ? `button-upload-${testId}` : undefined}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
          </button>
        </div>
        <div className="flex-1 space-y-1.5">
          <Input
            type="url"
            placeholder="https://... or upload ↙"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a] text-sm"
            data-testid={testId}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs text-[#888] hover:text-white transition-colors flex items-center gap-1"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload photo
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-xs text-[#555] hover:text-red-400 transition-colors flex items-center gap-1">
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
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
  { value: "MUSIC_GIGS",      label: "Music Gigs" },
  { value: "EVENTS",          label: "Events" },
  { value: "CRYPTO",          label: "Crypto" },
  { value: "CORPORATE_DEALS", label: "Corporate Deals" },
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
};

const EMPTY: FormState = {
  displayName: "", username: "", bio: "", avatarUrl: "", thumbUrl: "",
  primaryCategory: "", location: "", contactEmail: "", contactPhone: "",
  contactTelegram: "", websiteUrl: "", instagramUrl: "", youtubeUrl: "", tiktokUrl: "",
  facebookUrl: "", discordUrl: "", twitterUrl: "",
  photo1Url: "", photo2Url: "", photo3Url: "", photo4Url: "", photo5Url: "", photo6Url: "",
  webhookUrl: "",
};

const inputCls = "bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]";

export default function ProviderProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

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

  const set = (field: keyof FormState, value: string) =>
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
          <h1 className="text-xl font-bold text-white" data-testid="text-page-title">Creator Profile</h1>
        </div>

        <ProfileCard profile={previewProfile} />

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
                <Select value={form.primaryCategory} onValueChange={(v) => set("primaryCategory", v)}>
                  <SelectTrigger className={`${inputCls}`} data-testid="select-primary-category">
                    <SelectValue placeholder="Choose your niche" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#2a2a2a]">
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.value} value={v.value} className="text-white focus:bg-[#222]">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
