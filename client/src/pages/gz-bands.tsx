import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Music, Plus, Users, ChevronLeft, Radio, Mic2, Upload, X, Guitar, User } from "lucide-react";
import type { GzBandWithMeta } from "@shared/schema";

const ORANGE = "#ff7a00";
const DARK = "#0a0a0a";
const CARD = "#111";
const BORDER = "#1e1e1e";

const GENRES = ["Rock", "Hip-Hop", "Pop", "Country", "Jazz", "R&B", "Metal", "Electronic", "Folk", "Punk", "Indie", "Classical", "Reggae", "Latin", "Blues", "Other"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function GzBandsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [showEnroll, setShowEnroll] = useState(false);
  const [search, setSearch] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Auto-open enroll form when ?enroll=1 is in URL
  useEffect(() => {
    if (searchParams.includes("enroll=1")) {
      if (user) setShowEnroll(true);
      else setShowSignupPrompt(true);
    }
  }, [searchParams, user]);
  const [form, setForm] = useState({
    name: "", bio: "", genre: "", city: "", state: "",
    websiteUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
    avatarUrl: "", bannerUrl: "", bandType: "band",
  });

  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    const setter = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setter(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload-image", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      const { url } = await r.json();
      if (kind === "avatar") { setAvatarPreview(url); setForm(f => ({ ...f, avatarUrl: url })); }
      else { setBannerPreview(url); setForm(f => ({ ...f, bannerUrl: url })); }
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  const { data: bands = [], isLoading } = useQuery<GzBandWithMeta[]>({
    queryKey: ["/api/bands"],
    queryFn: () => fetch("/api/bands").then(r => r.json()),
  });

  const resetForm = () => {
    setForm({ name: "", bio: "", genre: "", city: "", state: "", websiteUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "", avatarUrl: "", bannerUrl: "", bandType: "band" });
    setAvatarPreview("");
    setBannerPreview("");
  };

  const createMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/bands", form); return res.json(); },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/bands"] });
      setShowEnroll(false);
      resetForm();
      const label = data.bandType === "artist" ? "Artist" : "Band";
      toast({ title: `${label} enrolled!`, description: `${data.name} is now on GZMusic.` });
      setLocation(`/gz-music/bands/${data.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message ?? "Could not create band", variant: "destructive" }),
  });

  const filtered = bands.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.genre ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (b.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const liveNow = filtered.filter(b => b.isLive);
  const rest = filtered.filter(b => !b.isLive);

  return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/gz-music")} className="text-[#555] hover:text-white transition-colors" data-testid="back-to-music">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white">GZ Bands</h1>
              <p className="text-xs text-[#555]">Enroll your band · Get your clubhouse</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (user) setShowEnroll(!showEnroll);
              else setShowSignupPrompt(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: ORANGE }}
            data-testid="enroll-band-btn"
          >
            <Plus className="h-4 w-4" /> Enroll Band
          </button>
        </div>

        {/* Enroll form */}
        {showEnroll && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-base font-black text-white">
              {form.bandType === "artist" ? "Enroll as Artist" : "Enroll Your Band"}
            </p>
            <p className="text-xs text-[#666]">
              {form.bandType === "artist"
                ? "You'll get a solo artist clubhouse. Add collaborators from your profile."
                : "You'll automatically become the band admin. Invite your bandmates from the clubhouse."}
            </p>

            {/* Band / Artist toggle */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: "#0f0f0f", border: `1px solid ${BORDER}` }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, bandType: "band" }))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all"
                style={form.bandType === "band"
                  ? { background: ORANGE, color: "#fff" }
                  : { color: "#555" }}
                data-testid="type-band"
              >
                <Guitar className="h-4 w-4" /> Band
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, bandType: "artist" }))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all"
                style={form.bandType === "artist"
                  ? { background: ORANGE, color: "#fff" }
                  : { color: "#555" }}
                data-testid="type-artist"
              >
                <User className="h-4 w-4" /> Artist
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
                placeholder={form.bandType === "artist" ? "Artist / stage name *" : "Band name *"}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="band-name"
              />
              <select
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
                value={form.genre}
                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                data-testid="band-genre"
              >
                <option value="">Genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <input
                className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
                placeholder="City"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                data-testid="band-city"
              />
              <select
                className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                data-testid="band-state"
              >
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] resize-none min-h-[80px]"
                placeholder="Bio — tell the world about your sound..."
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                data-testid="band-bio"
              />
              {/* Square Avatar Upload */}
              <div className="col-span-1 space-y-1.5">
                <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest">Square Image</p>
                <div
                  className="relative flex items-center justify-center rounded-xl cursor-pointer border border-dashed transition-colors hover:border-[#444]"
                  style={{ borderColor: avatarPreview ? "transparent" : "#2a2a2a", background: "#1a1a1a", aspectRatio: "1", overflow: "hidden" }}
                  onClick={() => avatarRef.current?.click()}
                  data-testid="band-avatar-upload"
                >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); setAvatarPreview(""); setForm(f => ({ ...f, avatarUrl: "" })); }}
                        data-testid="band-avatar-clear"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#444]">
                      {uploadingAvatar ? <div className="h-4 w-4 rounded-full border-2 border-[#555] border-t-transparent animate-spin" /> : <Upload className="h-5 w-5" />}
                      <span className="text-[10px]">{uploadingAvatar ? "Uploading…" : "Upload"}</span>
                    </div>
                  )}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} data-testid="band-avatar-input" />
              </div>

              {/* Wide Banner Upload */}
              <div className="col-span-1 space-y-1.5">
                <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest">Banner Image</p>
                <div
                  className="relative flex items-center justify-center rounded-xl cursor-pointer border border-dashed transition-colors hover:border-[#444]"
                  style={{ borderColor: bannerPreview ? "transparent" : "#2a2a2a", background: "#1a1a1a", aspectRatio: "1", overflow: "hidden" }}
                  onClick={() => bannerRef.current?.click()}
                  data-testid="band-banner-upload"
                >
                  {bannerPreview ? (
                    <>
                      <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); setBannerPreview(""); setForm(f => ({ ...f, bannerUrl: "" })); }}
                        data-testid="band-banner-clear"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#444]">
                      {uploadingBanner ? <div className="h-4 w-4 rounded-full border-2 border-[#555] border-t-transparent animate-spin" /> : <Upload className="h-5 w-5" />}
                      <span className="text-[10px]">{uploadingBanner ? "Uploading…" : "Upload"}</span>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "banner")} data-testid="band-banner-input" />
              </div>
              <p className="col-span-2 text-xs font-semibold text-[#555] uppercase tracking-widest">Social Links (optional)</p>
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Instagram URL" value={form.instagramUrl} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} data-testid="band-instagram" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="TikTok URL" value={form.tiktokUrl} onChange={e => setForm(f => ({ ...f, tiktokUrl: e.target.value }))} data-testid="band-tiktok" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="YouTube URL" value={form.youtubeUrl} onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))} data-testid="band-youtube" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Website URL" value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} data-testid="band-website" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowEnroll(false); resetForm(); }} className="px-4 py-2 rounded-xl text-sm text-[#888] hover:text-white border border-[#222]">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name.trim()}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ORANGE }}
                data-testid="band-enroll-submit"
              >
                {createMutation.isPending ? "Enrolling..." : form.bandType === "artist" ? "Enroll Artist" : "Enroll Band"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <input
          className="w-full bg-[#111] rounded-xl px-4 py-3 text-sm text-white outline-none border border-[#1e1e1e] focus:border-[#2a2a2a]"
          placeholder="Search bands by name, genre, or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="band-search"
        />

        {/* Live now */}
        {liveNow.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">Live Now</p>
            </div>
            <div className="space-y-2">
              {liveNow.map(band => <BandCard key={band.id} band={band} onClick={() => setLocation(`/gz-music/bands/${band.id}`)} />)}
            </div>
          </div>
        )}

        {/* All bands */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : rest.length === 0 && liveNow.length === 0 ? (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-5 text-center" style={{ background: "#0d0d0d", border: `2px dashed #1e1e1e` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1a1a1a", border: `1px solid ${BORDER}` }}>
              <Mic2 className="h-7 w-7" style={{ color: ORANGE }} />
            </div>
            <div>
              <p className="font-black text-white text-lg">No bands yet</p>
              <p className="text-sm text-[#555] mt-1 max-w-[240px] leading-relaxed">Be the first to claim your Clubhouse on GZ Bands.</p>
            </div>
            {user ? (
              <button
                onClick={() => setShowEnroll(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, boxShadow: "0 4px 20px rgba(255,122,0,0.35)" }}
                data-testid="enroll-band-empty-cta"
              >
                <Plus className="h-4 w-4" /> Add Your Band
              </button>
            ) : (
              <button
                onClick={() => setShowSignupPrompt(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, boxShadow: "0 4px 20px rgba(255,122,0,0.35)" }}
                data-testid="enroll-band-empty-guest"
              >
                <Plus className="h-4 w-4" /> Add Your Band
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {rest.map(band => <BandCard key={band.id} band={band} onClick={() => setLocation(`/gz-music/bands/${band.id}`)} />)}
          </div>
        )}
      </div>

      {/* Sign-up prompt for guests hitting Enroll Band */}
      {showSignupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#111", border: `1px solid #222` }}>
            {/* Accent bar */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${ORANGE}, #cc5200)` }} />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,122,0,0.12)", border: "1px solid rgba(255,122,0,0.2)" }}>
                    <Mic2 className="h-5 w-5" style={{ color: ORANGE }} />
                  </div>
                  <p className="text-base font-black text-white">Get Your Clubhouse</p>
                </div>
                <button onClick={() => setShowSignupPrompt(false)} className="text-[#444] hover:text-white transition-colors" data-testid="signup-prompt-close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-[#888] leading-relaxed">
                Create a free Gigzito account to enroll your band or artist page, get your clubhouse, and start connecting with fans.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setLocation("/auth?signup=1")}
                  className="w-full py-3 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #cc5200)`, boxShadow: "0 4px 18px rgba(255,122,0,0.3)" }}
                  data-testid="signup-prompt-create"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => setLocation("/auth")}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ color: "#888", border: "1px solid #222" }}
                  data-testid="signup-prompt-signin"
                >
                  Already have an account? Sign In
                </button>
              </div>

              <p className="text-[10px] text-[#444] text-center">Free to join · No credit card required</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BandCard({ band, onClick }: { band: GzBandWithMeta; onClick: () => void }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:border-[#2a2a2a] active:scale-[0.99]"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
      onClick={onClick}
      data-testid={`band-card-${band.id}`}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: "#1a1a1a", border: `1px solid ${BORDER}` }}>
        {band.avatarUrl ? (
          <img src={band.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-5 w-5 text-[#333]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-white truncate">{band.name}</p>
          {/* Band / Artist type badge */}
          <span
            className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase shrink-0"
            style={(band as any).bandType === "artist"
              ? { background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }
              : { background: "rgba(255,122,0,0.12)", color: ORANGE, border: "1px solid rgba(255,122,0,0.25)" }}
          >
            {(band as any).bandType === "artist" ? "Artist" : "Band"}
          </span>
          {band.isLive && (
            <div className="flex items-center gap-1 shrink-0">
              <Radio className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-bold text-green-400">LIVE</span>
            </div>
          )}
          {band.isMember && (
            <Badge className="text-[9px] px-1.5 shrink-0" style={{ background: "#ff7a0015", color: ORANGE, border: `1px solid #ff7a0030` }}>
              {band.memberRole === "admin" ? "Admin" : "Member"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-[#888] truncate">
          {[band.genre, band.city].filter(Boolean).join(" · ")}
        </p>
        {band.bio && <p className="text-xs text-[#555] truncate mt-0.5">{band.bio}</p>}
        <div className="flex items-center gap-1 mt-1">
          <Users className="h-3 w-3 text-[#444]" />
          <span className="text-[10px] text-[#444]">{band.memberCount} member{band.memberCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <ChevronLeft className="h-4 w-4 text-[#333] rotate-180 shrink-0" />
    </div>
  );
}
