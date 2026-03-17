import { useState, useEffect, useRef } from "react";
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
  User, QrCode, Heart, Globe, Lock, Image, ImageIcon, Trash2, Camera, Plus, Pencil,
  Save, ChevronLeft, Sparkles, Mail, MessageSquare, Radio, MapPin, Upload, Loader2,
  Smile, Film, Sticker, Send, X as XIcon, Zap, Share2,
} from "lucide-react";
import { Link } from "wouter";
import type { GignessCard, ZeeMotion } from "@shared/schema";

const TIER_META: Record<string, { label: string; color: string; desc: string }> = {
  GZLurker:     { label: "GZ Lurker",     color: "text-zinc-400",   desc: "Create a card — browsing only, can't engage others yet." },
  GZMarketer:   { label: "GZMarketer",    color: "text-blue-400",   desc: "Engage cards, send messages & publish unlimited content." },
  GZMarketerPro:{ label: "GZMarketerPro", color: "text-purple-400", desc: "Priority Rolodex placement + advanced targeting." },
  GZBusiness:   { label: "GZBusiness",    color: "text-amber-400",  desc: "Featured VIP row, geo-push, audience aggregator & analytics." },
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

const GALLERY_SLOTS = 9;

function GalleryUploader({
  gallery,
  onChange,
}: {
  gallery: string[];
  onChange: (g: string[]) => void;
}) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<string[]>(
    Array(GALLERY_SLOTS).fill("").map((_, i) => gallery[i] ?? "")
  );
  const [uploading, setUploading] = useState<boolean[]>(Array(GALLERY_SLOTS).fill(false));

  // Sync slots when gallery prop changes (async card load)
  useEffect(() => {
    setSlots(Array(GALLERY_SLOTS).fill("").map((_, i) => gallery[i] ?? ""));
  }, [gallery.join(",")]);
  const [expanded, setExpanded] = useState(false);

  function setSlot(idx: number, val: string) {
    const next = [...slots];
    next[idx] = val;
    setSlots(next);
    onChange(next.filter(Boolean));
  }

  async function handleFileSelect(idx: number, file: File) {
    const up = [...uploading];
    up[idx] = true;
    setUploading(up);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setSlot(idx, url);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo. Try again.", variant: "destructive" });
    } finally {
      const up2 = [...uploading];
      up2[idx] = false;
      setUploading(up2);
    }
  }

  const filled = slots.filter(Boolean);

  return (
    <div className="space-y-2">
      {/* ── 9-slot thumbnail row — each slot is its own upload target ── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${GALLERY_SLOTS}, 1fr)`, gap: "5px" }}>
        {slots.map((url, i) => (
          <div key={i} className="relative group aspect-square" data-testid={`thumb-gallery-${i}`}>
            {url ? (
              <>
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full rounded-lg object-cover border border-[#1e1e1e]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {/* Hover overlay — replace or delete */}
                <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <label className="cursor-pointer" title="Replace" data-testid={`btn-replace-gallery-${i}`}>
                    <Camera className="h-3 w-3 text-white" />
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(i, f); e.target.value = ""; }} />
                  </label>
                  <button onClick={() => setSlot(i, "")} title="Remove" data-testid={`btn-remove-gallery-${i}`}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-full h-full rounded-lg border border-dashed bg-[#0d0d0d] cursor-pointer transition-all ${
                  uploading[i]
                    ? "border-[#444]"
                    : "border-[#252525] hover:border-purple-800/60 hover:bg-[#0f0f18]"
                }`}
                data-testid={`btn-upload-gallery-${i}`}
              >
                {uploading[i]
                  ? <Loader2 className="h-3 w-3 text-[#555] animate-spin" />
                  : <Plus className="h-3 w-3 text-[#3a3a3a]" />
                }
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading[i]}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(i, f); e.target.value = ""; }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {/* See Photos toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
          expanded
            ? "border-purple-700/60 text-purple-300 bg-purple-900/10"
            : "border-[#222] text-[#555] hover:border-[#333] hover:text-[#888] bg-[#0a0a0a]"
        }`}
        data-testid="btn-toggle-gallery"
      >
        <ImageIcon className="h-3 w-3" />
        {expanded ? "Hide photos" : `See all photos${filled.length > 0 ? ` (${filled.length})` : ""}`}
      </button>

      {/* ── Full grid view (expanded) ── */}
      {expanded && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {slots.filter(Boolean).map((url, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full rounded-xl object-cover border border-[#1e1e1e]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-white/10 hover:bg-white/20 rounded-lg p-1.5" data-testid={`btn-replace-gallery-full-${i}`}>
                  <Upload className="h-3.5 w-3.5 text-white" />
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const realIdx = slots.indexOf(url); const f = e.target.files?.[0]; if (f && realIdx !== -1) handleFileSelect(realIdx, f); e.target.value = ""; }} />
                </label>
                <button
                  onClick={() => { const realIdx = slots.indexOf(url); if (realIdx !== -1) setSlot(realIdx, ""); }}
                  className="bg-red-500/20 hover:bg-red-500/40 rounded-lg p-1.5"
                  data-testid={`btn-remove-gallery-full-${i}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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

// ── Common emojis panel ──────────────────────────────────────────────────────
const EMOJI_LIST = [
  "😀","😂","🥰","😎","🤩","🔥","💯","✨","🎉","👏","💪","🙌","❤️","💜","⭐",
  "🚀","🌟","💡","🎯","🏆","🎤","💰","🤝","👋","😤","🤔","😏","🥳","👀","💥",
];

const PRESET_STICKERS = [
  { url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", label: "Fire" },
  { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", label: "Party" },
  { url: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif", label: "Vibes" },
  { url: "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif", label: "Money" },
  { url: "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif", label: "Deal" },
  { url: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif", label: "Hype" },
  { url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif", label: "Winner" },
  { url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", label: "Boom" },
];

function ZeeMotionItem({ m, onDelete }: { m: ZeeMotion; onDelete: (id: number) => void }) {
  const ago = (d: string | Date) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
      <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {m.text && <p className="text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap">{m.text}</p>}
        {m.mediaUrl && (
          <img
            src={m.mediaUrl}
            alt="ZeeMotion media"
            className="mt-1.5 rounded-lg max-h-32 object-contain border border-[#222]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <p className="text-[10px] text-[#444] mt-1">{ago(m.createdAt)}</p>
      </div>
      <button
        onClick={() => onDelete(m.id)}
        className="text-[#444] hover:text-red-400 transition-colors shrink-0 mt-0.5"
        data-testid={`btn-delete-zeemotion-${m.id}`}
      >
        <XIcon className="h-3 w-3" />
      </button>
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
  const [slogan, setSlogan]               = useState("");
  const [sloganEditing, setSloganEditing] = useState(false);
  const [profilePic, setProfilePic]       = useState("");
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [gallery, setGallery]             = useState<string[]>([]);
  const [isPublic, setIsPublic]                           = useState(false);
  const [locationServicesEnabled, setLocationServices]    = useState(false);
  const [allowMessaging, setAllowMessaging]               = useState(true);
  const [showSocialLinks, setShowSocialLinks]             = useState(false);
  const [ageBracket, setAgeBracket]                       = useState("");
  const [gender, setGender]                               = useState("");
  const [intent, setIntent]                               = useState("");
  const [dirty, setDirty]                                 = useState(false);

  // ZeeMotion state
  const [zmText, setZmText]           = useState("");
  const [zmMedia, setZmMedia]         = useState<{ url: string; type: "image" | "gif" | "sticker" } | null>(null);
  const [zmPanel, setZmPanel]         = useState<"emoji" | "gif" | "sticker" | null>(null);
  const [zmGifUrl, setZmGifUrl]       = useState("");
  const [zmUploading, setZmUploading] = useState(false);
  const zmTextRef = useRef<HTMLTextAreaElement>(null);

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
      setAllowMessaging(existingCard.allowMessaging ?? true);
      setShowSocialLinks((existingCard as any).showSocialLinks ?? false);
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
        allowMessaging,
        showSocialLinks,
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

  // ZeeMotion queries + mutations
  const { data: myMotions = [] } = useQuery<ZeeMotion[]>({
    queryKey: ["/api/zee-motions/mine"],
    enabled: !!authData,
  });

  const postMotionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/zee-motions", {
      text: zmText.trim() || null,
      mediaUrl: zmMedia?.url ?? null,
      mediaType: zmMedia?.type ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/zee-motions/mine"] });
      setZmText(""); setZmMedia(null); setZmPanel(null); setZmGifUrl("");
      toast({ title: "ZeeMotion posted!", description: "Your followers will see your update." });
    },
    onError: (err: any) => toast({ title: "Post failed", description: err?.message ?? "Something went wrong.", variant: "destructive" }),
  });

  const deleteMotionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/zee-motions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/zee-motions/mine"] }); },
  });

  async function handleZmImageUpload(file: File) {
    setZmUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setZmMedia({ url, type: "image" });
      setZmPanel(null);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setZmUploading(false); }
  }

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

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* Back + edit indicator */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/geezees">
            <button className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors" data-testid="btn-back-geezees">
              <ChevronLeft className="h-3.5 w-3.5" />
              GeeZee Rolodex
            </button>
          </Link>
          <span className="flex items-center gap-1 text-[10px] text-[#383838]">
            <Pencil className="h-2.5 w-2.5" /> editing your card
          </span>
        </div>

        {/* ── THE CARD — looks like the production profile ── */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] overflow-hidden mb-4">
          <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-pink-500/40" />
          <div className="p-6 space-y-5">

            {/* Identity row */}
            <div className="flex items-start gap-4">

              {/* Clickable profile photo */}
              <div className="relative group shrink-0">
                <label className="cursor-pointer block" data-testid="btn-upload-profile-pic" title="Click to change photo">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover border border-[#222] group-hover:border-purple-700/50 transition-all"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-dashed border-[#2a2a2a] group-hover:border-purple-700/50 flex flex-col items-center justify-center gap-1 transition-all">
                      <Camera className="h-5 w-5 text-[#333]" />
                      <span className="text-[9px] text-[#2a2a2a]">add photo</span>
                    </div>
                  )}
                  {profilePic && (
                    <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {profilePicUploading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/70 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="sr-only" disabled={profilePicUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
                      setProfilePicUploading(true);
                      try {
                        const fd = new FormData(); fd.append("file", file);
                        const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
                        if (!res.ok) throw new Error();
                        const { url } = await res.json(); setProfilePic(url); markDirty();
                      } catch { toast({ title: "Upload failed", description: "Could not upload photo.", variant: "destructive" }); }
                      finally { setProfilePicUploading(false); }
                    }}
                  />
                </label>
                {profilePic && (
                  <button type="button" onClick={() => { setProfilePic(""); markDirty(); }}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 rounded-full p-0.5 shadow z-10 transition-colors opacity-0 group-hover:opacity-100"
                    data-testid="btn-remove-profile-pic">
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>

              {/* Info column */}
              <div className="flex-1 min-w-0">
                {/* Tier badge + intent pills */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border bg-transparent ${tierMeta.color}`}>
                    {tierMeta.label}
                  </span>
                  {INTENT_OPTIONS.map(({ value, label }) => (
                    <button key={value}
                      onClick={() => { setIntent(intent === value ? "" : value); markDirty(); }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        intent === value
                          ? "bg-pink-600/20 border-pink-600/50 text-pink-300"
                          : "bg-transparent border-[#1e1e1e] text-[#383838] hover:border-[#2a2a2a] hover:text-[#666]"
                      }`}
                      data-testid={`btn-intent-${value}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Username */}
                {authData?.profile?.username && (
                  <p className="text-xs text-[#555] mb-1">@{authData.profile.username}</p>
                )}

                {/* Slogan — gradient display or inline textarea */}
                {slogan && !sloganEditing ? (
                  <div className="relative group/slogan">
                    <p className="text-lg font-extrabold leading-tight cursor-pointer pr-6"
                      style={{ background: "linear-gradient(135deg,#a855f7 0%,#ec4899 50%,#f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                      onClick={() => setSloganEditing(true)}
                      data-testid="display-slogan">
                      {slogan}
                    </p>
                    <button onClick={() => setSloganEditing(true)}
                      className="absolute top-0 right-0 opacity-0 group-hover/slogan:opacity-100 transition-opacity bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] rounded p-1"
                      data-testid="btn-edit-slogan">
                      <Pencil className="h-2.5 w-2.5 text-[#666]" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Textarea value={slogan} onChange={(e) => { setSlogan(e.target.value); markDirty(); }}
                      placeholder="Your one-line pitch to the Gigzito world…"
                      maxLength={120} rows={2} autoFocus={sloganEditing}
                      onBlur={() => { if (slogan.trim()) setSloganEditing(false); }}
                      className="bg-transparent border-[#252525] text-white placeholder-[#282828] text-sm focus:border-purple-700/50 resize-none shadow-none"
                      data-testid="input-slogan" />
                    <p className="text-[10px] text-[#333] mt-0.5 text-right">{slogan.length}/120</p>
                  </div>
                )}

                {/* Age + gender tag pills */}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {AGE_OPTIONS.map((age) => (
                    <button key={age}
                      onClick={() => { setAgeBracket(ageBracket === age ? "" : age); markDirty(); }}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        ageBracket === age
                          ? "bg-purple-600/20 border-purple-600/50 text-purple-300"
                          : "bg-transparent border-[#1a1a1a] text-[#2e2e2e] hover:border-[#282828] hover:text-[#555]"
                      }`}
                      data-testid={`btn-age-${age}`}>{age}</button>
                  ))}
                  {GENDER_OPTIONS.map((g) => (
                    <button key={g}
                      onClick={() => { setGender(gender === g ? "" : g); markDirty(); }}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        gender === g
                          ? "bg-blue-600/20 border-blue-600/50 text-blue-300"
                          : "bg-transparent border-[#1a1a1a] text-[#2e2e2e] hover:border-[#282828] hover:text-[#555]"
                      }`}
                      data-testid={`btn-gender-${g}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gallery strip — same layout as production */}
            <GalleryUploader gallery={gallery} onChange={(g) => { setGallery(g); markDirty(); }} />

            {/* ZeeMotion composer — embedded in card like a feed input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                <p className="text-xs font-semibold text-[#777]">ZeeMotion</p>
                <span className="text-[9px] text-[#333]">posts to your card feed</span>
              </div>
              <div className="rounded-xl bg-[#111] border border-[#1a1a1a] focus-within:border-purple-700/30 transition-all">
                <Textarea ref={zmTextRef} value={zmText}
                  onChange={(e) => setZmText(e.target.value.slice(0, 500))}
                  placeholder="What's moving with you…"
                  rows={2}
                  className="bg-transparent border-none text-sm text-white placeholder-[#272727] resize-none focus:ring-0 shadow-none px-3 pt-3 pb-1"
                  data-testid="input-zeemotion-text" />
                {zmMedia && (
                  <div className="px-3 pb-2 relative inline-block">
                    <img src={zmMedia.url} alt="zm media" className="h-20 rounded-lg object-contain border border-[#222]" />
                    <button onClick={() => setZmMedia(null)} className="absolute top-0 right-3 bg-black/70 rounded-full p-0.5"><XIcon className="h-3 w-3 text-white" /></button>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                  <div className="flex items-center gap-0.5">
                    <div className="relative">
                      <button onClick={() => setZmPanel(zmPanel === "emoji" ? null : "emoji")}
                        className={`p-1.5 rounded-lg transition-colors ${zmPanel === "emoji" ? "bg-purple-900/30 text-purple-300" : "text-[#383838] hover:text-[#666]"}`}
                        data-testid="btn-zeemotion-emoji"><Smile className="h-3.5 w-3.5" /></button>
                      {zmPanel === "emoji" && (
                        <div className="absolute bottom-9 left-0 z-50 bg-[#111] border border-[#2a2a2a] rounded-xl p-2 w-52 grid grid-cols-6 gap-1 shadow-2xl">
                          {EMOJI_LIST.map((em) => (
                            <button key={em} onClick={() => { setZmText((t) => (t + em).slice(0, 500)); zmTextRef.current?.focus(); }}
                              className="text-lg hover:scale-125 transition-transform">{em}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button onClick={() => setZmPanel(zmPanel === "gif" ? null : "gif")}
                        className={`p-1.5 rounded-lg transition-colors text-[10px] font-bold tracking-widest ${zmPanel === "gif" ? "bg-pink-900/30 text-pink-300" : "text-[#383838] hover:text-[#666]"}`}
                        data-testid="btn-zeemotion-gif">GIF</button>
                      {zmPanel === "gif" && (
                        <div className="absolute bottom-9 left-0 z-50 bg-[#111] border border-[#2a2a2a] rounded-xl p-3 w-64 shadow-2xl">
                          <input value={zmGifUrl} onChange={(e) => setZmGifUrl(e.target.value)}
                            placeholder="Paste GIF URL…"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 mb-2 outline-none focus:border-pink-700/60"
                            data-testid="input-gif-url" />
                          <button onClick={() => { if (zmGifUrl.trim()) { setZmMedia({ url: zmGifUrl.trim(), type: "gif" }); setZmGifUrl(""); setZmPanel(null); } }}
                            className="text-xs bg-pink-700 hover:bg-pink-600 text-white px-3 py-1 rounded-lg w-full">Add GIF</button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button onClick={() => setZmPanel(zmPanel === "sticker" ? null : "sticker")}
                        className={`p-1.5 rounded-lg transition-colors ${zmPanel === "sticker" ? "bg-yellow-900/30 text-yellow-300" : "text-[#383838] hover:text-[#666]"}`}
                        data-testid="btn-zeemotion-sticker"><Sticker className="h-3.5 w-3.5" /></button>
                      {zmPanel === "sticker" && (
                        <div className="absolute bottom-9 left-0 z-50 bg-[#111] border border-[#2a2a2a] rounded-xl p-2 grid grid-cols-4 gap-1.5 shadow-2xl w-48">
                          {PRESET_STICKERS.map((s) => (
                            <button key={s.url} onClick={() => { setZmMedia({ url: s.url, type: "sticker" }); setZmPanel(null); }}
                              className="rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-yellow-500/60 transition-all">
                              <img src={s.url} alt={s.label} className="w-full h-10 object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className={`p-1.5 rounded-lg transition-colors cursor-pointer ${zmUploading ? "text-[#444]" : "text-[#383838] hover:text-[#666]"}`}
                      data-testid="btn-zeemotion-upload">
                      {zmUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                      <input type="file" accept="image/*,video/*" className="sr-only" disabled={zmUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleZmImageUpload(f); e.target.value = ""; }} />
                    </label>
                    <span className="text-[10px] text-[#2a2a2a] ml-1">{zmText.length}/500</span>
                  </div>
                  <button onClick={() => postMotionMutation.mutate()}
                    disabled={postMotionMutation.isPending || (!zmText.trim() && !zmMedia)}
                    className="flex items-center gap-1 text-xs font-bold bg-purple-700 hover:bg-purple-600 disabled:bg-[#151515] disabled:text-[#2a2a2a] text-white px-3 py-1 rounded-lg transition-all"
                    data-testid="btn-post-zeemotion">
                    {postMotionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Post
                  </button>
                </div>
              </div>
              {myMotions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {myMotions.slice(0, 5).map((m) => (
                    <ZeeMotionItem key={m.id} m={m} onDelete={(id) => deleteMotionMutation.mutate(id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Rolodex visibility row */}
            <div className="flex items-center justify-between pt-3 border-t border-[#141414]">
              <div className="flex items-center gap-2">
                {isPublic
                  ? <><Radio className="h-3 w-3 text-green-400 animate-pulse" /><span className="text-xs text-green-400 font-semibold">Live in the Rolodex</span><Link href="/geezees"><span className="text-[10px] text-[#444] hover:text-white ml-2 underline">View →</span></Link></>
                  : <><Lock className="h-3 w-3 text-[#444]" /><span className="text-xs text-[#444]">Private — not in Rolodex</span></>
                }
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#383838]">Show in Rolodex</span>
                <Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); markDirty(); }} data-testid="switch-is-public" />
              </div>
            </div>
          </div>
        </div>

        {/* Save + Broadcast */}
        <div className="flex gap-3 mb-5">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold h-11"
            data-testid="btn-save-card">
            {saveMutation.isPending
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</span>
              : <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Card</span>}
          </Button>
          {!isPublic && (
            <Button onClick={() => broadcastMutation.mutate()} disabled={broadcastMutation.isPending}
              variant="outline"
              className="border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444] bg-transparent h-11 px-4"
              data-testid="btn-broadcast">
              {broadcastMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Radio className="h-4 w-4 mr-1" /> Broadcast</>}
            </Button>
          )}
        </div>

        {/* Settings panel */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-[#141414]">
            <p className="text-[10px] font-semibold text-[#444] uppercase tracking-wider">Card Settings</p>
          </div>
          <div className="p-3 space-y-2">
            <div className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
              locationServicesEnabled ? "bg-[#0e0900] border-yellow-500/20" : "bg-[#0a0a0a] border-[#181818]"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  locationServicesEnabled ? "bg-yellow-500/15 border border-yellow-500/25" : "bg-[#141414] border border-[#1e1e1e]"
                }`}>
                  <MapPin className={`h-3.5 w-3.5 ${locationServicesEnabled ? "text-yellow-400" : "text-[#383838]"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Preemptive Marketing</p>
                  <p className="text-[10px] text-[#3a3a3a] mt-0.5">Geo-targeted offers from nearby Gigzito shops</p>
                </div>
              </div>
              <Switch checked={locationServicesEnabled} onCheckedChange={(v) => { setLocationServices(v); markDirty(); }} data-testid="switch-location-services" />
            </div>
            <div className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
              allowMessaging ? "bg-[#040d0c] border-teal-500/20" : "bg-[#0a0a0a] border-[#181818]"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  allowMessaging ? "bg-teal-500/15 border border-teal-500/25" : "bg-[#141414] border border-[#1e1e1e]"
                }`}>
                  <MessageSquare className={`h-3.5 w-3.5 ${allowMessaging ? "text-teal-400" : "text-[#383838]"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Allow Incoming Messaging</p>
                  <p className="text-[10px] text-[#3a3a3a] mt-0.5">Let others message you via your GeeZee Card</p>
                </div>
              </div>
              <Switch checked={allowMessaging} onCheckedChange={(v) => { setAllowMessaging(v); markDirty(); }} data-testid="switch-allow-messaging" />
            </div>
            <div className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
              showSocialLinks ? "bg-[#0d0a1a] border-purple-500/20" : "bg-[#0a0a0a] border-[#181818]"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  showSocialLinks ? "bg-purple-500/15 border border-purple-500/25" : "bg-[#141414] border border-[#1e1e1e]"
                }`}>
                  <Share2 className={`h-3.5 w-3.5 ${showSocialLinks ? "text-purple-400" : "text-[#383838]"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Import Social Media Links</p>
                  <p className="text-[10px] text-[#3a3a3a] mt-0.5">Show your Gigzito profile social links on this card</p>
                </div>
              </div>
              <Switch checked={showSocialLinks} onCheckedChange={(v) => { setShowSocialLinks(v); markDirty(); }} data-testid="switch-show-social-links" />
            </div>
          </div>
        </div>

        {/* QR Card */}
        {existingCard?.qrUuid && (
          <div className="rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] p-4 flex flex-col items-center mb-4">
            <p className="text-[10px] text-[#444] mb-3 font-semibold uppercase tracking-wider">Your QR Master Card</p>
            <QRCodeBox uuid={existingCard.qrUuid} />
            <p className="text-[10px] text-[#333] mt-3 text-center">Share this QR — anyone who scans it lands on your GeeZee Card.</p>
          </div>
        )}

        {/* Inbox link */}
        <Link href="/gz-inbox">
          <button className="w-full rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all p-3 flex items-center justify-between" data-testid="btn-gz-inbox">
            <div className="flex items-center gap-2 text-[#666]">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">GZ Inbox</span>
            </div>
            <span className="text-[#333] text-xs">→</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
