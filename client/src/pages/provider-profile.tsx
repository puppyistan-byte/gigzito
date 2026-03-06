import { useEffect, useState } from "react";
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
import { Loader2, CheckCircle2, ArrowLeft, Instagram, Youtube } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import type { ProviderProfile } from "@shared/schema";

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
};

const EMPTY: FormState = {
  displayName: "", username: "", bio: "", avatarUrl: "", thumbUrl: "",
  primaryCategory: "", location: "", contactEmail: "", contactPhone: "",
  contactTelegram: "", websiteUrl: "", instagramUrl: "", youtubeUrl: "", tiktokUrl: "",
};

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
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        ...data,
        username:        data.username || null,
        primaryCategory: data.primaryCategory || null,
        location:        data.location || null,
        contactEmail:    data.contactEmail || null,
        contactPhone:    data.contactPhone || null,
        contactTelegram: data.contactTelegram || null,
        websiteUrl:      data.websiteUrl || null,
        instagramUrl:    data.instagramUrl || null,
        youtubeUrl:      data.youtubeUrl || null,
        tiktokUrl:       data.tiktokUrl || null,
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
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/provider/me" className="text-[#555] hover:text-white transition-colors" data-testid="link-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
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
                <Input
                  id="displayName"
                  placeholder="Jane Smith"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  required
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                  data-testid="input-display-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[#aaa] text-sm">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">@</span>
                  <Input
                    id="username"
                    placeholder="janesmithpro"
                    value={form.username}
                    onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a] pl-7"
                    data-testid="input-username"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[#aaa] text-sm">Bio *</Label>
              <Textarea
                id="bio"
                placeholder="Tell viewers about yourself and what you create..."
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                required
                rows={3}
                maxLength={300}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a] resize-none"
                data-testid="input-bio"
              />
              <p className="text-xs text-[#444]">{form.bio.length}/300</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primaryCategory" className="text-[#aaa] text-sm">Primary Category *</Label>
                <Select value={form.primaryCategory} onValueChange={(v) => set("primaryCategory", v)}>
                  <SelectTrigger
                    className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff1a1a]"
                    data-testid="select-primary-category"
                  >
                    <SelectValue placeholder="Choose your niche" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#2a2a2a]">
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.value} value={v.value} className="text-white focus:bg-[#222]">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-[#aaa] text-sm">Location</Label>
                <Input
                  id="location"
                  placeholder="New York, NY"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                  data-testid="input-location"
                />
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Media</h2>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl" className="text-[#aaa] text-sm">Avatar URL * <span className="text-[#555] font-normal">(square image)</span></Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://..."
                value={form.avatarUrl}
                onChange={(e) => set("avatarUrl", e.target.value)}
                required
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-avatar-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thumbUrl" className="text-[#aaa] text-sm">Thumbnail URL <span className="text-[#555] font-normal">(16:9 image)</span></Label>
              <Input
                id="thumbUrl"
                type="url"
                placeholder="https://..."
                value={form.thumbUrl}
                onChange={(e) => set("thumbUrl", e.target.value)}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]"
                data-testid="input-thumb-url"
              />
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
                <Input id="contactEmail" type="email" placeholder="contact@example.com" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-contact-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="text-[#aaa] text-sm">Phone</Label>
                <Input id="contactPhone" type="tel" placeholder="+1 555 000 0000" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-contact-phone" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTelegram" className="text-[#aaa] text-sm">Telegram</Label>
                <Input id="contactTelegram" placeholder="@username" value={form.contactTelegram} onChange={(e) => set("contactTelegram", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-contact-telegram" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="websiteUrl" className="text-[#aaa] text-sm">Website</Label>
                <Input id="websiteUrl" type="url" placeholder="https://yoursite.com" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-website-url" />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest">Social Links</h2>
            <div className="space-y-1.5">
              <Label htmlFor="instagramUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </Label>
              <Input id="instagramUrl" type="url" placeholder="https://instagram.com/yourhandle" value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-instagram-url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="youtubeUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                <Youtube className="h-3.5 w-3.5" /> YouTube
              </Label>
              <Input id="youtubeUrl" type="url" placeholder="https://youtube.com/@yourchannel" value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-youtube-url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktokUrl" className="text-[#aaa] text-sm flex items-center gap-1.5">
                <SiTiktok className="h-3.5 w-3.5" /> TikTok
              </Label>
              <Input id="tiktokUrl" type="url" placeholder="https://tiktok.com/@yourhandle" value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] focus:border-[#ff1a1a]" data-testid="input-tiktok-url" />
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
