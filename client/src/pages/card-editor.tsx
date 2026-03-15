import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User, QrCode, Heart, Globe, Lock, Image, Trash2,
  Save, ChevronLeft, Sparkles, Mail, MessageSquare, Radio, MapPin,
} from "lucide-react";
import { Link } from "wouter";
import type { GignessCard } from "@shared/schema";

const TIER_META: Record<string, { label: string; color: string; desc: string }> = {
  GZLurker: { label: "GZ Lurker", color: "text-zinc-400",  desc: "Create a card — but can't engage others yet." },
  GZ2:      { label: "GZ2",       color: "text-blue-400",  desc: "Engage cards and send messages." },
  GZ_PLUS:  { label: "GZ+",       color: "text-purple-400", desc: "Priority placement in the Rolodex." },
  GZ_PRO:   { label: "GZ PRO",    color: "text-amber-400", desc: "Featured VIP row + analytics." },
};

const AGE_OPTIONS  = ["18-25", "25-40", "40+"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const INTENT_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "social",    label: "Social" },
  { value: "activity",  label: "Activity" },
];

function QRCodeBox({ uuid }: { uuid: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    typeof window !== "undefined" ? `${window.location.origin}/geezees/qr/${uuid}` : uuid
  )}&bgcolor=080808&color=ffffff&qzone=1&format=png`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={qrUrl}
        alt="QR Code"
        className="w-[120px] h-[120px] rounded-xl border border-[#222]"
        data-testid="img-qr-code"
      />
      <p className="text-[10px] text-[#444] font-mono text-center break-all max-w-[130px]">{uuid.slice(0, 8)}…</p>
      <button
        onClick={() => navigator.clipboard.writeText(uuid).then(() => {})}
        className="text-[10px] text-[#555] hover:text-[#888] transition-colors underline"
        data-testid="btn-copy-uuid"
      >
        Copy UUID
      </button>
    </div>
  );
}

function GalleryUploader({
  gallery,
  onChange,
}: {
  gallery: string[];
  onChange: (g: string[]) => void;
}) {
  const [drafts, setDrafts] = useState<string[]>(Array(6).fill("").map((_, i) => gallery[i] ?? ""));

  function commit(idx: number, val: string) {
    const next = [...drafts];
    next[idx] = val;
    setDrafts(next);
    onChange(next.filter(Boolean));
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {drafts.map((url, i) => (
        <div key={i} className="relative group">
          {url ? (
            <div className="relative">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full aspect-square object-cover rounded-xl border border-[#222]"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
              />
              <button
                onClick={() => commit(i, "")}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`btn-remove-gallery-${i}`}
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-square rounded-xl border border-dashed border-[#2a2a2a] bg-[#0d0d0d] cursor-pointer hover:border-[#444] transition-colors group">
              <Image className="h-4 w-4 text-[#444] mb-1" />
              <span className="text-[10px] text-[#444]">Photo {i + 1}</span>
              <input
                type="url"
                className="sr-only"
                placeholder="https://..."
                onBlur={(e) => commit(i, e.target.value.trim())}
              />
            </label>
          )}
          <input
            type="url"
            placeholder="Paste image URL…"
            value={url}
            onChange={(e) => {
              const next = [...drafts];
              next[i] = e.target.value;
              setDrafts(next);
            }}
            onBlur={(e) => commit(i, e.target.value.trim())}
            className="mt-1 w-full rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] text-[10px] text-[#777] placeholder-[#333] px-2 py-1 focus:outline-none focus:border-[#444]"
            data-testid={`input-gallery-${i}`}
          />
        </div>
      ))}
    </div>
  );
}

// ── Live card preview ──────────────────────────────────────────────────────
function CardPreview({
  slogan, profilePic, gallery, ageBracket, gender, intent, isPublic, tier,
}: {
  slogan: string; profilePic: string; gallery: string[]; ageBracket: string;
  gender: string; intent: string; isPublic: boolean; tier: string;
}) {
  const tierMeta = TIER_META[tier] ?? TIER_META.GZLurker;
  return (
    <div className="rounded-2xl bg-[#0d0d0d] border border-[#2a2a2a] overflow-hidden w-full">
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          {profilePic ? (
            <img src={profilePic} alt="Preview" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#222]" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#222]">
              <User className="h-6 w-6 text-[#444]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold ${tierMeta.color}`}>{tierMeta.label}</span>
              {isPublic ? (
                <span className="text-[10px] text-green-500 flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> Public</span>
              ) : (
                <span className="text-[10px] text-[#555] flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> Private</span>
              )}
              {intent && <span className="text-[10px] text-[#555] capitalize">{intent}</span>}
            </div>
            <p className="text-sm font-semibold text-white mt-1.5 leading-snug">
              {slogan || <span className="text-[#333] italic">Your slogan goes here…</span>}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#555]">
              {ageBracket && <span>{ageBracket}</span>}
              {gender && <span>{gender}</span>}
            </div>
          </div>
        </div>
        {gallery.filter(Boolean).length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {gallery.filter(Boolean).slice(0, 6).map((url, i) => (
              <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#222]" />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-1 text-[#555]">
            <Heart className="h-3.5 w-3.5" />
            <span className="text-xs">0</span>
          </div>
          <QrCode className="h-4 w-4 text-[#444]" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CardEditorPage() {
  const { user: authData, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Form state
  const [slogan, setSlogan]         = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [gallery, setGallery]       = useState<string[]>([]);
  const [isPublic, setIsPublic]                           = useState(false);
  const [locationServicesEnabled, setLocationServices]    = useState(false);
  const [ageBracket, setAgeBracket]                       = useState("");
  const [gender, setGender]                               = useState("");
  const [intent, setIntent]                               = useState("");
  const [dirty, setDirty]                                 = useState(false);

  // Redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !authData) navigate("/auth");
  }, [authLoading, authData]);

  const tier = authData?.user?.subscriptionTier ?? "GZLurker";
  const tierMeta = TIER_META[tier] ?? TIER_META.GZLurker;

  // Fetch existing card
  const { data: existingCard, isLoading: cardLoading } = useQuery<GignessCard | null>({
    queryKey: ["/api/gigness-cards/mine"],
    enabled: !!authData,
  });

  // Populate form when card loads
  useEffect(() => {
    if (existingCard && !dirty) {
      setSlogan(existingCard.slogan ?? "");
      setProfilePic(existingCard.profilePic ?? "");
      setGallery(existingCard.gallery ?? []);
      setIsPublic(existingCard.isPublic ?? false);
      setLocationServices(existingCard.locationServicesEnabled ?? false);
      setAgeBracket(existingCard.ageBracket ?? "");
      setGender(existingCard.gender ?? "");
      setIntent(existingCard.intent ?? "");
    }
  }, [existingCard]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/gigness-cards", {
        slogan: slogan || undefined,
        profilePic: profilePic || null,
        gallery: gallery.filter(Boolean),
        isPublic,
        locationServicesEnabled,
        ageBracket: ageBracket || null,
        gender: gender || null,
        intent: intent || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards"] });
      setDirty(false);
      toast({ title: "Card saved!", description: "Your GeeZee Card has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Something went wrong.", variant: "destructive" });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gigness-cards/broadcast"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/gigness-cards"] });
      setIsPublic(true);
      toast({ title: "🎙️ Broadcasted!", description: "Your GeeZee Card is now live in the Rolodex." });
    },
    onError: () => toast({ title: "Error", description: "Could not broadcast.", variant: "destructive" }),
  });

  function markDirty() { setDirty(true); }

  if (authLoading || cardLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808" }}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/geezees">
            <button className="text-[#555] hover:text-white transition-colors" data-testid="btn-back-geezees">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <h1 className="text-xl font-bold text-white">My GeeZee Card</h1>
              <span className={`text-xs font-bold ml-1 ${tierMeta.color}`}>{tierMeta.label}</span>
            </div>
            <p className="text-xs text-[#555] mt-0.5">{tierMeta.desc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* ── Left: form ── */}
          <div className="space-y-7">

            {/* Slogan */}
            <div>
              <Label className="text-xs text-[#888] mb-1.5 block">Slogan <span className="text-[#555]">— max 120 chars</span></Label>
              <Textarea
                value={slogan}
                onChange={(e) => { setSlogan(e.target.value); markDirty(); }}
                placeholder="Your one-line pitch to the Gigzito world…"
                maxLength={120}
                rows={2}
                className="bg-[#0d0d0d] border-[#1e1e1e] text-white placeholder-[#333] text-sm focus:border-purple-700/60 resize-none"
                data-testid="input-slogan"
              />
              <p className="text-[11px] text-[#444] mt-1 text-right">{slogan.length}/120</p>
            </div>

            {/* Profile pic */}
            <div>
              <Label className="text-xs text-[#888] mb-1.5 block">Profile Photo URL</Label>
              <Input
                value={profilePic}
                onChange={(e) => { setProfilePic(e.target.value); markDirty(); }}
                placeholder="https://your-image-url.com/photo.jpg"
                className="bg-[#0d0d0d] border-[#1e1e1e] text-white placeholder-[#333] text-sm focus:border-purple-700/60"
                data-testid="input-profile-pic"
              />
              {profilePic && (
                <img
                  src={profilePic}
                  alt="Profile preview"
                  className="mt-2 w-20 h-20 rounded-xl object-cover border border-[#222]"
                  onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                />
              )}
            </div>

            {/* Gallery */}
            <div>
              <Label className="text-xs text-[#888] mb-2 block">Photo Gallery <span className="text-[#555]">— up to 6 photos</span></Label>
              <GalleryUploader gallery={gallery} onChange={(g) => { setGallery(g); markDirty(); }} />
            </div>

            {/* Metadata row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Age bracket */}
              <div>
                <Label className="text-xs text-[#888] mb-1.5 block">Age Bracket</Label>
                <div className="flex gap-2 flex-wrap">
                  {AGE_OPTIONS.map((age) => (
                    <button
                      key={age}
                      onClick={() => { setAgeBracket(ageBracket === age ? "" : age); markDirty(); }}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        ageBracket === age
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-transparent border-[#2a2a2a] text-[#666] hover:border-[#444]"
                      }`}
                      data-testid={`btn-age-${age}`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <Label className="text-xs text-[#888] mb-1.5 block">Gender</Label>
                <div className="flex gap-2 flex-wrap">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGender(gender === g ? "" : g); markDirty(); }}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        gender === g
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-transparent border-[#2a2a2a] text-[#666] hover:border-[#444]"
                      }`}
                      data-testid={`btn-gender-${g}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intent */}
              <div>
                <Label className="text-xs text-[#888] mb-1.5 block">Intent</Label>
                <div className="flex gap-2 flex-wrap">
                  {INTENT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { setIntent(intent === value ? "" : value); markDirty(); }}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        intent === value
                          ? "bg-pink-600 border-pink-500 text-white"
                          : "bg-transparent border-[#2a2a2a] text-[#666] hover:border-[#444]"
                      }`}
                      data-testid={`btn-intent-${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Public toggle */}
            <div className="flex items-center justify-between rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] p-4">
              <div>
                <p className="text-sm font-semibold text-white">Show in Rolodex</p>
                <p className="text-xs text-[#555] mt-0.5">
                  {isPublic ? "Your card is visible to everyone in /geezees" : "Your card is private — only you can see it"}
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={(v) => { setIsPublic(v); markDirty(); }}
                data-testid="switch-is-public"
              />
            </div>

            {/* Location Services toggle */}
            <div className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
              locationServicesEnabled
                ? "bg-[#100a00] border-yellow-500/30"
                : "bg-[#0d0d0d] border-[#1e1e1e]"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  locationServicesEnabled ? "bg-yellow-500/15 border border-yellow-500/25" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                }`}>
                  <MapPin className={`h-4 w-4 ${locationServicesEnabled ? "text-yellow-400" : "text-[#555]"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Preemptive Marketing</p>
                  <p className="text-xs text-[#555] mt-0.5">
                    {locationServicesEnabled
                      ? "Location services on — you'll receive geo-targeted ads from Gigzito partner shops near you"
                      : "Turn on to receive location-enabled offers when you're near a Gigzito partner shop"}
                  </p>
                  {locationServicesEnabled && (
                    <p className="text-[10px] text-yellow-500/70 mt-1.5 font-medium">
                      📍 Active — partner shops can reach you with proximity offers
                    </p>
                  )}
                </div>
              </div>
              <Switch
                checked={locationServicesEnabled}
                onCheckedChange={(v) => { setLocationServices(v); markDirty(); }}
                data-testid="switch-location-services"
              />
            </div>

            {/* Save + Broadcast buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold h-11"
                data-testid="btn-save-card"
              >
                {saveMutation.isPending ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Card</span>
                )}
              </Button>

              {!isPublic && (
                <Button
                  onClick={() => broadcastMutation.mutate()}
                  disabled={broadcastMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-pink-700 to-purple-700 hover:from-pink-600 hover:to-purple-600 text-white font-semibold h-11"
                  data-testid="btn-broadcast-card"
                >
                  {broadcastMutation.isPending ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Broadcasting…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Radio className="h-4 w-4" /> Broadcast</span>
                  )}
                </Button>
              )}
            </div>

            {isPublic && (
              <div className="flex items-center gap-2 rounded-lg bg-green-950/30 border border-green-800/30 px-3 py-2">
                <Radio className="h-3.5 w-3.5 text-green-400 animate-pulse shrink-0" />
                <p className="text-xs text-green-400 font-semibold">Live in the Rolodex</p>
                <Link href="/geezees" className="ml-auto">
                  <span className="text-[10px] text-[#555] hover:text-white underline transition-colors">View →</span>
                </Link>
              </div>
            )}
          </div>

          {/* ── Right: preview + QR ── */}
          <div className="space-y-5 lg:sticky lg:top-24 h-fit">
            <p className="text-xs text-[#555] font-semibold uppercase tracking-wider">Live Preview</p>
            <CardPreview
              slogan={slogan}
              profilePic={profilePic}
              gallery={gallery}
              ageBracket={ageBracket}
              gender={gender}
              intent={intent}
              isPublic={isPublic}
              tier={tier}
            />

            {existingCard?.qrUuid && (
              <div className="rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] p-4 flex flex-col items-center">
                <p className="text-xs text-[#555] mb-3 font-semibold uppercase tracking-wider">Your QR Master Card</p>
                <QRCodeBox uuid={existingCard.qrUuid} />
                <p className="text-[10px] text-[#444] mt-3 text-center">
                  Share this QR — anyone who scans it lands on your GeeZee Card.
                </p>
              </div>
            )}

            {/* GZ Inbox link */}
            <Link href="/gz-inbox">
              <button
                className="w-full rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-all p-3 flex items-center justify-between"
                data-testid="btn-gz-inbox"
              >
                <div className="flex items-center gap-2 text-[#777]">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">GZ Inbox</span>
                </div>
                <span className="text-[#444] text-xs">→</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
