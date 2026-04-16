import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Music, Plus, Users, ChevronLeft, MapPin, Radio } from "lucide-react";
import type { GzBandWithMeta } from "@shared/schema";

const ORANGE = "#ff7a00";
const DARK = "#0a0a0a";
const CARD = "#111";
const BORDER = "#1e1e1e";

const GENRES = ["Rock", "Hip-Hop", "Pop", "Country", "Jazz", "R&B", "Metal", "Electronic", "Folk", "Punk", "Indie", "Classical", "Reggae", "Latin", "Blues", "Other"];

export default function GzBandsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [showEnroll, setShowEnroll] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", bio: "", genre: "", city: "", state: "",
    websiteUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
    avatarUrl: "", bannerUrl: "",
  });

  const { data: bands = [], isLoading } = useQuery<GzBandWithMeta[]>({
    queryKey: ["/api/bands"],
    queryFn: () => fetch("/api/bands").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bands", form),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/bands"] });
      setShowEnroll(false);
      setForm({ name: "", bio: "", genre: "", city: "", state: "", websiteUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "", avatarUrl: "", bannerUrl: "" });
      toast({ title: "Band enrolled!", description: `${data.name} is now on GZMusic.` });
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
          {user && (
            <button
              onClick={() => setShowEnroll(!showEnroll)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: ORANGE }}
              data-testid="enroll-band-btn"
            >
              <Plus className="h-4 w-4" /> Enroll Band
            </button>
          )}
        </div>

        {/* Enroll form */}
        {showEnroll && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-base font-black text-white">Enroll Your Band</p>
            <p className="text-xs text-[#666]">You'll automatically become the band admin. Invite your bandmates from the clubhouse.</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
                placeholder="Band name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="band-name"
              />
              <select
                className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
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
              <textarea
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] resize-none min-h-[80px]"
                placeholder="Bio — tell the world about your sound..."
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                data-testid="band-bio"
              />
              <input
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
                placeholder="Avatar image URL (optional)"
                value={form.avatarUrl}
                onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                data-testid="band-avatar"
              />
              <input
                className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
                placeholder="Banner image URL (optional)"
                value={form.bannerUrl}
                onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))}
                data-testid="band-banner"
              />
              <p className="col-span-2 text-xs font-semibold text-[#555] uppercase tracking-widest">Social Links (optional)</p>
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Instagram URL" value={form.instagramUrl} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} data-testid="band-instagram" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="TikTok URL" value={form.tiktokUrl} onChange={e => setForm(f => ({ ...f, tiktokUrl: e.target.value }))} data-testid="band-tiktok" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="YouTube URL" value={form.youtubeUrl} onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))} data-testid="band-youtube" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Website URL" value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} data-testid="band-website" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEnroll(false)} className="px-4 py-2 rounded-xl text-sm text-[#888] hover:text-white border border-[#222]">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name.trim()}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ORANGE }}
                data-testid="band-enroll-submit"
              >
                {createMutation.isPending ? "Enrolling..." : "Enroll Band"}
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
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#1a1a1a", border: `1px solid ${BORDER}` }}>
              <Music className="h-7 w-7 text-[#333]" />
            </div>
            <p className="text-[#555] font-bold">No bands yet</p>
            <p className="text-xs text-[#333] mt-1">Be the first to enroll your band on Gigzito.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rest.map(band => <BandCard key={band.id} band={band} onClick={() => setLocation(`/gz-music/bands/${band.id}`)} />)}
          </div>
        )}
      </div>
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
