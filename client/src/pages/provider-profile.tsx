import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, User } from "lucide-react";
import type { ProviderProfile } from "@shared/schema";

export default function ProviderProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    thumbUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactTelegram: "",
    websiteUrl: "",
  });

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
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        thumbUrl: profile.thumbUrl ?? "",
        contactEmail: profile.contactEmail ?? "",
        contactPhone: profile.contactPhone ?? "",
        contactTelegram: profile.contactTelegram ?? "",
        websiteUrl: profile.websiteUrl ?? "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        contactTelegram: data.contactTelegram || null,
        websiteUrl: data.websiteUrl || null,
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
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    },
    onError: () => toast({ title: "Error saving profile", variant: "destructive" }),
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (authLoading) return <div className="min-h-screen bg-background"><Navbar /></div>;
  if (!user) return null;

  const initials = form.displayName
    ? form.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.user.email[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold" data-testid="text-page-title">Edit Profile</h1>

        {/* Preview */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={form.avatarUrl} alt={form.displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{form.displayName || "Your Name"}</p>
              <p className="text-muted-foreground text-xs line-clamp-2">{form.bio || "Your bio will appear here..."}</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h2>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name *</Label>
              <Input
                id="displayName"
                placeholder="Jane Smith"
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                required
                data-testid="input-display-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                placeholder="Tell providers and viewers about yourself..."
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                required
                rows={3}
                data-testid="input-bio"
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Media</h2>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL * <span className="text-muted-foreground font-normal">(square image)</span></Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://..."
                value={form.avatarUrl}
                onChange={(e) => handleChange("avatarUrl", e.target.value)}
                required
                data-testid="input-avatar-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thumbUrl">Thumbnail URL * <span className="text-muted-foreground font-normal">(16:9 image)</span></Label>
              <Input
                id="thumbUrl"
                type="url"
                placeholder="https://..."
                value={form.thumbUrl}
                onChange={(e) => handleChange("thumbUrl", e.target.value)}
                required
                data-testid="input-thumb-url"
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact <span className="text-xs font-normal normal-case">(at least one required)</span></h2>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@example.com"
                value={form.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="+1 555 000 0000"
                value={form.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactTelegram">Telegram</Label>
              <Input
                id="contactTelegram"
                placeholder="@username"
                value={form.contactTelegram}
                onChange={(e) => handleChange("contactTelegram", e.target.value)}
                data-testid="input-contact-telegram"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl">Website</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yoursite.com"
                value={form.websiteUrl}
                onChange={(e) => handleChange("websiteUrl", e.target.value)}
                data-testid="input-website-url"
              />
            </div>
          </Card>

          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-profile">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
