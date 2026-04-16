import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Music, Users, Calendar, Image, Tv2, Radio, Plus, Trash2, ExternalLink,
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Send, Globe,
  Settings, MapPin, Mic2, Video, Clock, Pencil, UserPlus, X, Check,
  Heart, Bell, BellOff, Upload, Search,
} from "lucide-react";
import { SiTiktok, SiYoutube, SiInstagram } from "react-icons/si";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, parseISO,
} from "date-fns";
import type { GzBandWithMeta, GzBandWallPostWithAuthor, GzBandWallCommentWithAuthor, GzBandMemberWithProfile, GzBandEvent, GzBandPhoto, GzBandTvShow, GzBandRosterMember } from "@shared/schema";
import type { GZMusicTrack } from "@shared/schema";

const ORANGE = "#ff7a00";
const DARK = "#0a0a0a";
const CARD = "#111";
const BORDER = "#1e1e1e";

type Tab = "wall" | "gallery" | "tv";

const EVENT_COLORS: Record<string, string> = {
  show: "#ff7a00",
  rehearsal: "#6366f1",
  livestream: "#22c55e",
  other: "#6b7280",
};

const EVENT_LABELS: Record<string, string> = {
  show: "Live Show",
  rehearsal: "Rehearsal",
  livestream: "Livestream",
  other: "Event",
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Band Roster ───────────────────────────────────────────────────────────────
type RosterForm = { name: string; thumbUrl: string; bio: string; role: string; hometown: string; age: string };
const EMPTY_ROSTER: RosterForm = { name: "", thumbUrl: "", bio: "", role: "", hometown: "", age: "" };

function RosterSection({ bandId, isAdmin, bandType }: { bandId: number; isAdmin: boolean; bandType?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const thumbRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GzBandRosterMember | null>(null);
  const [form, setForm] = useState<RosterForm>(EMPTY_ROSTER);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const { data: roster = [], isLoading } = useQuery<GzBandRosterMember[]>({
    queryKey: ["/api/bands", bandId, "roster"],
    queryFn: () => fetch(`/api/bands/${bandId}/roster`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_ROSTER); setShowForm(true); };
  const openEdit = (m: GzBandRosterMember) => {
    setEditing(m);
    setForm({ name: m.name, thumbUrl: m.thumbUrl ?? "", bio: m.bio ?? "", role: m.role ?? "", hometown: (m as any).hometown ?? "", age: (m as any).age ?? "" });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_ROSTER); };

  const uploadThumb = async (file: File) => {
    setUploadingThumb(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload-image", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error((await r.json()).message);
      const { url } = await r.json();
      setForm(f => ({ ...f, thumbUrl: url }));
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingThumb(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bands/${bandId}/roster`, { name: form.name, thumbUrl: form.thumbUrl || null, bio: form.bio || null, role: form.role || null, hometown: form.hometown || null, age: form.age || null });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "roster"] }); closeForm(); toast({ title: "Member added!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/bands/${bandId}/roster/${editing!.id}`, { name: form.name, thumbUrl: form.thumbUrl || null, bio: form.bio || null, role: form.role || null, hometown: form.hometown || null, age: form.age || null });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "roster"] }); closeForm(); toast({ title: "Updated!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bands/${bandId}/roster/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "roster"] }),
  });

  if (!isAdmin && roster.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#555]">{bandType === "artist" ? "About the Artist" : "Meet the Band"}</p>
        {isAdmin && roster.length < 8 && (
          <button onClick={openAdd} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }} data-testid="add-roster-btn">
            <UserPlus className="h-3 w-3" /> Add Member
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-24 h-32 rounded-xl shrink-0" />)}</div>
      ) : roster.length === 0 ? (
        isAdmin && (
          <button onClick={openAdd} className="w-full rounded-lg border border-dashed border-[#222] py-2.5 text-xs text-[#444] hover:border-[#333] hover:text-[#666] transition-colors flex items-center justify-center gap-2" data-testid="roster-empty-add">
            <UserPlus className="h-3.5 w-3.5" />
            Add members (up to 8)
          </button>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {roster.map(m => (
            <div key={m.id} className="relative shrink-0 w-28 rounded-xl overflow-hidden group" style={{ background: "#0f0f0f", border: `1px solid ${BORDER}` }} data-testid={`roster-${m.id}`}>
              {/* Thumb */}
              <div className="w-full aspect-square bg-[#1a1a1a] overflow-hidden">
                {m.thumbUrl
                  ? <img src={m.thumbUrl} alt={m.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#333]">{m.name[0]}</div>}
              </div>
              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-bold text-white truncate">{m.name}</p>
                {m.role && <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: ORANGE }}>{m.role}</p>}
                {(m as any).hometown && <p className="text-[10px] text-[#555] mt-0.5 truncate"><MapPin className="inline h-2.5 w-2.5 mr-0.5" />{(m as any).hometown}</p>}
                {(m as any).age && <p className="text-[10px] text-[#444] mt-0.5">Age: {(m as any).age}</p>}
                {m.bio && <p className="text-[10px] text-[#555] mt-1 line-clamp-2 leading-relaxed">{m.bio}</p>}
              </div>
              {/* Admin controls */}
              {isAdmin && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(m)} className="bg-black/70 rounded p-0.5 text-[#aaa] hover:text-white" data-testid={`roster-edit-${m.id}`}><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => deleteMutation.mutate(m.id)} className="bg-black/70 rounded p-0.5 text-[#aaa] hover:text-red-400" data-testid={`roster-delete-${m.id}`}><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
          {isAdmin && roster.length < 8 && (
            <button onClick={openAdd} className="shrink-0 w-28 aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-[#333] hover:text-[#555] transition-colors border border-dashed border-[#1e1e1e] hover:border-[#2a2a2a]" data-testid="roster-add-tile">
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">Add</span>
            </button>
          )}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={closeForm}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-3" style={{ background: "#111", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-white">{editing ? "Edit Member" : "Add Member"}</p>
              <button onClick={closeForm} className="text-[#555] hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {/* Thumb upload */}
            <div className="flex gap-3 items-center">
              <div
                className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 flex items-center justify-center border border-dashed"
                style={{ background: "#1a1a1a", borderColor: "#2a2a2a" }}
                onClick={() => thumbRef.current?.click()}
                data-testid="roster-thumb-upload"
              >
                {form.thumbUrl
                  ? <img src={form.thumbUrl} alt="" className="w-full h-full object-cover" />
                  : uploadingThumb
                    ? <div className="h-4 w-4 rounded-full border-2 border-[#555] border-t-transparent animate-spin" />
                    : <UserPlus className="h-5 w-5 text-[#444]" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-[10px] text-[#555]">Tap photo to upload</p>
                <button onClick={() => thumbRef.current?.click()} className="text-xs px-3 py-1 rounded-lg border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors">
                  {uploadingThumb ? "Uploading…" : form.thumbUrl ? "Change Photo" : "Upload Photo"}
                </button>
              </div>
              <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadThumb(e.target.files[0])} data-testid="roster-thumb-input" />
            </div>

            <input
              className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
              placeholder="Full name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              data-testid="roster-name"
            />
            <input
              className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
              placeholder="Role — e.g. Lead Guitar, Drums, Vocals…"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              data-testid="roster-role"
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
                placeholder="Hometown (optional)"
                value={form.hometown}
                onChange={e => setForm(f => ({ ...f, hometown: e.target.value }))}
                data-testid="roster-hometown"
              />
              <input
                className="w-20 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]"
                placeholder="Age"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                data-testid="roster-age"
              />
            </div>
            <textarea
              className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333] resize-none min-h-[60px]"
              placeholder="Brief bio (optional)"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              data-testid="roster-bio"
            />
            <div className="flex gap-3">
              <button onClick={closeForm} className="flex-1 py-2 rounded-xl text-sm text-[#888] border border-[#222]">Cancel</button>
              <button
                onClick={() => editing ? editMutation.mutate() : addMutation.mutate()}
                disabled={(editing ? editMutation.isPending : addMutation.isPending) || !form.name.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ORANGE }}
                data-testid="roster-save"
              >
                {(editing ? editMutation.isPending : addMutation.isPending) ? "Saving…" : editing ? "Save Changes" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tracks Tab ────────────────────────────────────────────────────────────────
function TracksTab({ bandId, isAdmin, bandName }: { bandId: number; isAdmin: boolean; bandName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [searchQuery, setSearchQuery] = useState(bandName);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: tracks = [], isLoading } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/bands", bandId, "tracks"],
    queryFn: () => fetch(`/api/bands/${bandId}/tracks`).then(r => r.json()),
  });

  const { data: searchResults = [], isLoading: isSearching, refetch: doSearch } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/bands", bandId, "tracks/search", searchQuery],
    queryFn: () => fetch(`/api/bands/${bandId}/tracks/search?artist=${encodeURIComponent(searchQuery)}`, { credentials: "include" }).then(r => r.json()),
    enabled: false,
  });

  const claimMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/bands/${bandId}/claim-track/${trackId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tracks"] });
      toast({ title: "Track claimed!", description: "Track is now in your Tracks tab." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unclaimMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/bands/${bandId}/unclaim-track/${trackId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tracks"] });
      toast({ title: "Track removed from band" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const current = tracks[currentIdx];

  useEffect(() => {
    if (!audioRef.current || !current) return;
    const src = current.fileUrl || current.audioUrl || "";
    if (audioRef.current.src !== window.location.origin + src) {
      audioRef.current.src = src;
      if (playing) audioRef.current.play().catch(() => {});
    }
  }, [currentIdx, current]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const prev = () => setCurrentIdx(i => Math.max(0, i - 1));
  const next = () => setCurrentIdx(i => Math.min(tracks.length - 1, i + 1));

  const claimedIds = new Set(tracks.map(t => t.id));

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    doSearch();
  };

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Admin claim panel */}
      {isAdmin && (
        <div className="rounded-xl p-4" style={{ background: "#0d0d0d", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Claim Your Tracks</p>
            <button
              onClick={() => setShowClaim(v => !v)}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white transition-colors"
              style={{ background: showClaim ? "#333" : ORANGE }}
              data-testid="tracks-claim-toggle"
            >
              {showClaim ? "Close" : "Search & Claim"}
            </button>
          </div>
          {showClaim && (
            <div className="space-y-3">
              <p className="text-xs text-[#555]">Search for tracks you uploaded where the artist name exactly matches your band name.</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]"
                  placeholder="Artist name (exact match)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  data-testid="tracks-search-input"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-3 py-2 rounded-lg text-white transition-colors flex items-center gap-1.5"
                  style={{ background: ORANGE }}
                  data-testid="tracks-search-btn"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              {isSearching && <Skeleton className="h-16 rounded-lg" />}
              {hasSearched && !isSearching && searchResults.length === 0 && (
                <p className="text-xs text-[#444] text-center py-2">No tracks found. Artist name must match exactly.</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map(t => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#1a1a1a" }} data-testid={`search-result-${t.id}`}>
                      <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-[#222] flex items-center justify-center">
                        {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music className="h-3.5 w-3.5 text-[#444]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-[#666] truncate">{t.artist}</p>
                      </div>
                      {claimedIds.has(t.id) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#1e3a1e", color: "#22c55e" }}>Claimed</span>
                      ) : (
                        <button
                          onClick={() => claimMutation.mutate(t.id)}
                          disabled={claimMutation.isPending}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white transition-colors"
                          style={{ background: ORANGE }}
                          data-testid={`claim-track-${t.id}`}
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Track player */}
      {tracks.length === 0 ? (
        <div className="text-center py-16 text-[#444]">
          <Music className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">No tracks claimed yet.</p>
          {isAdmin && <p className="text-xs mt-1">Use "Search & Claim" above to add your tracks.</p>}
        </div>
      ) : (
        <>
          {/* Now playing */}
          <div className="rounded-xl p-5" style={{ background: "#0d0d0d", border: `1px solid ${BORDER}` }}>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                {current?.coverUrl ? (
                  <img src={current.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="h-7 w-7 text-[#333]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{current?.title}</p>
                <p className="text-sm text-[#888] truncate">{current?.artist}</p>
                {current?.genre && <Badge className="mt-1 text-[10px]" style={{ background: "#1a1a1a", color: ORANGE, border: `1px solid ${ORANGE}22` }}>{current.genre}</Badge>}
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-5">
              <button onClick={prev} disabled={currentIdx === 0} className="text-[#555] hover:text-white disabled:opacity-30 transition-colors" data-testid="tracks-prev"><SkipBack className="h-5 w-5" /></button>
              <button onClick={togglePlay} className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95" style={{ background: ORANGE }} data-testid="tracks-play">
                {playing ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
              </button>
              <button onClick={next} disabled={currentIdx === tracks.length - 1} className="text-[#555] hover:text-white disabled:opacity-30 transition-colors" data-testid="tracks-next"><SkipForward className="h-5 w-5" /></button>
            </div>
            <audio ref={audioRef} onEnded={next} />
          </div>
          {/* Track list */}
          <div className="space-y-1">
            {tracks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#1a1a1a] group" style={{ background: i === currentIdx ? "#1a1a1a" : "transparent", borderLeft: i === currentIdx ? `2px solid ${ORANGE}` : "2px solid transparent" }} data-testid={`tracks-track-${t.id}`}>
                <button
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                  onClick={() => { setCurrentIdx(i); setPlaying(true); setTimeout(() => audioRef.current?.play(), 50); }}
                >
                  <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-[#222] flex items-center justify-center">
                    {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music className="h-3.5 w-3.5 text-[#444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-[#666] truncate">{t.artist}</p>
                  </div>
                  {i === currentIdx && playing && <Radio className="h-3.5 w-3.5 shrink-0" style={{ color: ORANGE }} />}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => unclaimMutation.mutate(t.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#444] hover:text-red-400 shrink-0"
                    data-testid={`unclaim-track-${t.id}`}
                    title="Remove from band"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Wall Post Card (shared between WallTab + WallOverflow) ────────────────────
function WallPostCard({ post, bandId, isAdmin, currentUserId }: {
  post: GzBandWallPostWithAuthor; bandId: number; isAdmin: boolean; currentUserId?: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedComments, setExpandedComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: comments = [] } = useQuery<GzBandWallCommentWithAuthor[]>({
    queryKey: ["/api/bands", bandId, "wall", post.id, "comments"],
    queryFn: () => fetch(`/api/bands/${bandId}/wall/${post.id}/comments`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: expandedComments,
  });

  const commentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/wall/${post.id}/comments`, { content: commentText }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "wall", post.id, "comments"] }); setCommentText(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/bands/${bandId}/wall/${post.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "wall"] }),
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/wall/${post.id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "wall"] }),
  });

  const unlikeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/bands/${bandId}/wall/${post.id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "wall"] }),
  });

  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#222]">
          {post.avatarUrl
            ? <img src={post.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-[#333] flex items-center justify-center text-[10px] text-[#888]">{(post.displayName ?? "?")[0]?.toUpperCase()}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">{post.displayName ?? "Guest"}</span>
              {!post.userId && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ background: "#1a1a1a", color: "#555", border: "1px solid #222" }}>Guest</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#444]">{timeAgo(post.createdAt)}</span>
              {(currentUserId === post.userId || isAdmin) && (
                <button onClick={() => deleteMutation.mutate()} className="text-[#444] hover:text-red-500 transition-colors" data-testid={`wall-delete-${post.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
          <p className="text-sm text-[#ccc] mt-1 whitespace-pre-wrap">{post.content}</p>
          {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-2 rounded-lg max-h-64 object-cover" />}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                if (!currentUserId) { toast({ title: "Sign in to like posts" }); return; }
                if (post.hasLiked) unlikeMutation.mutate(); else likeMutation.mutate();
              }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: post.hasLiked ? "#ef4444" : "#555" }}
              data-testid={`wall-like-${post.id}`}
            >
              <Heart className={`h-3.5 w-3.5 ${post.hasLiked ? "fill-red-500" : ""}`} />
              <span>{post.likeCount > 0 ? post.likeCount : ""}</span>
            </button>
            <button
              onClick={() => setExpandedComments(v => !v)}
              className="text-xs text-[#555] hover:text-[#888] transition-colors"
              data-testid={`wall-comments-toggle-${post.id}`}
            >
              {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""} {expandedComments ? "▲" : "▼"}
            </button>
          </div>
          {expandedComments && (
            <div className="mt-3 space-y-2 pl-3 border-l border-[#1e1e1e]">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#222] shrink-0 overflow-hidden">
                    {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#aaa]">{c.displayName ?? "Member"} </span>
                    <span className="text-xs text-[#888]">{c.content}</span>
                    <p className="text-[10px] text-[#444] mt-0.5">{timeAgo(c.createdAt)}</p>
                  </div>
                </div>
              ))}
              {currentUserId && (
                <div className="flex gap-2 mt-2">
                  <input
                    className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-white outline-none border border-[#222] focus:border-[#333]"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commentMutation.mutate(); } }}
                    data-testid={`comment-input-${post.id}`}
                  />
                  <button onClick={() => commentMutation.mutate()} className="text-[#555] hover:text-white" data-testid={`comment-submit-${post.id}`}>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wall Tab (center column: composer + tracks + first 3 posts) ────────────────
function WallTab({ bandId, isAdmin, currentUserId, allowGuestPosts, bandName }: {
  bandId: number;
  isAdmin: boolean;
  currentUserId?: number;
  allowGuestPosts?: boolean;
  bandName: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [showClaimPanel, setShowClaimPanel] = useState(false);
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState(bandName);
  const [hasSearched, setHasSearched] = useState(false);
  const [, navigate] = useLocation();

  const isGuest = !currentUserId && !!allowGuestPosts;

  const { data: posts = [], isLoading: postsLoading } = useQuery<GzBandWallPostWithAuthor[]>({
    queryKey: ["/api/bands", bandId, "wall"],
    queryFn: () => fetch(`/api/bands/${bandId}/wall`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/bands", bandId, "tracks"],
    queryFn: () => fetch(`/api/bands/${bandId}/tracks`).then(r => r.json()),
  });

  const { data: searchResults = [], isLoading: isSearching, refetch: doSearch } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/bands", bandId, "tracks/search", searchQuery],
    queryFn: () => fetch(`/api/bands/${bandId}/tracks/search?artist=${encodeURIComponent(searchQuery)}`, { credentials: "include" }).then(r => r.json()),
    enabled: false,
  });

  const claimedIds = new Set(tracks.map(t => t.id));

  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[currentIdx];

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const src = (currentTrack as any).fileUrl || (currentTrack as any).audioUrl || "";
    if (audioRef.current.src !== window.location.origin + src) {
      audioRef.current.src = src;
      if (playing) audioRef.current.play().catch(() => {});
    }
  }, [currentIdx, currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const postMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/wall`, {
      content,
      ...(isGuest ? { guestName: guestName.trim(), guestEmail: guestEmail.trim() } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "wall"] });
      setContent(""); setShowComposer(false);
      if (isGuest) { setGuestName(""); setGuestEmail(""); }
    },
    onError: () => toast({ title: "Error", description: "Could not post", variant: "destructive" }),
  });

  const claimMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/bands/${bandId}/claim-track/${trackId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tracks"] });
      toast({ title: "Track claimed!", description: "It's now on your band wall." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unclaimMutation = useMutation({
    mutationFn: (trackId: number) => apiRequest("POST", `/api/bands/${bandId}/unclaim-track/${trackId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tracks"] });
      toast({ title: "Track removed from band wall" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    doSearch();
  };

  const primaryPosts = posts.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Admin toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowComposer(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: showComposer ? "#333" : ORANGE }}
            data-testid="wall-post-btn"
          >
            <Mic2 className="h-3.5 w-3.5" /> Post to Wall
          </button>
          <button
            onClick={() => navigate("/gz-music/upload")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors text-[#888] hover:text-white hover:border-[#444]"
            style={{ borderColor: BORDER }}
            data-testid="wall-add-track-btn"
          >
            <Music className="h-3.5 w-3.5" /> Add Track
          </button>
          <button
            onClick={() => setShowClaimPanel(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors"
            style={{ borderColor: showClaimPanel ? ORANGE : BORDER, color: showClaimPanel ? ORANGE : "#888" }}
            data-testid="wall-claim-tracks-btn"
          >
            <Search className="h-3.5 w-3.5" /> Claim Tracks
          </button>
        </div>
      )}

      {/* Claim tracks panel */}
      {isAdmin && showClaimPanel && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0d0d0d", border: `1px solid ${ORANGE}44` }}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-bold text-white mb-0.5">Claim Your Tracks</p>
              <p className="text-[11px] text-[#555] leading-relaxed">Uploaded a track before creating your band? Search by artist name to claim it here.</p>
            </div>
            <button onClick={() => setShowClaimPanel(false)} className="text-[#444] hover:text-white shrink-0 mt-0.5"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]"
              placeholder="Artist name (exact match)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              data-testid="tracks-search-input"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3 py-2 rounded-lg text-white transition-colors flex items-center gap-1.5"
              style={{ background: ORANGE }}
              data-testid="tracks-search-btn"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {isSearching && <Skeleton className="h-12 rounded-lg" />}
          {hasSearched && !isSearching && searchResults.length === 0 && (
            <p className="text-xs text-[#444] text-center py-2">No tracks found. The artist name must match exactly.</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#1a1a1a" }} data-testid={`search-result-${t.id}`}>
                  <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-[#222] flex items-center justify-center">
                    {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music className="h-3.5 w-3.5 text-[#444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-[#555] truncate">{t.artist}</p>
                  </div>
                  {claimedIds.has(t.id) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#1e3a1e", color: "#22c55e" }}>Claimed</span>
                  ) : (
                    <button
                      onClick={() => claimMutation.mutate(t.id)}
                      disabled={claimMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white transition-colors"
                      style={{ background: ORANGE }}
                      data-testid={`claim-track-${t.id}`}
                    >
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post composer */}
      {showComposer && isAdmin && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <textarea
            className="w-full bg-transparent text-white text-sm resize-none outline-none placeholder-[#444] min-h-[100px]"
            placeholder="Write a post for the wall..."
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
            data-testid="wall-post-input"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowComposer(false); setContent(""); }} className="px-3 py-1.5 rounded-lg text-sm text-[#555] hover:text-white">Cancel</button>
            <button
              onClick={() => { if (content.trim()) postMutation.mutate(); }}
              disabled={postMutation.isPending || !content.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: ORANGE }}
              data-testid="wall-post-submit"
            >
              {postMutation.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* Guest wall post form */}
      {isGuest && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex gap-2">
            <input className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]" placeholder="Your name *" value={guestName} onChange={e => setGuestName(e.target.value)} data-testid="wall-guest-name" />
            <input className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#333]" placeholder="Email (optional)" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} data-testid="wall-guest-email" />
          </div>
          <textarea className="w-full bg-transparent text-white text-sm resize-none outline-none placeholder-[#444] min-h-[70px]" placeholder="Leave a message on the wall…" value={content} onChange={e => setContent(e.target.value)} data-testid="wall-post-input" />
          <div className="flex justify-end">
            <button onClick={() => { if (content.trim() && guestName.trim()) postMutation.mutate(); }} disabled={postMutation.isPending || !content.trim() || !guestName.trim()} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: ORANGE }} data-testid="wall-post-submit">{postMutation.isPending ? "Posting..." : "Post"}</button>
          </div>
        </div>
      )}

      {/* Tracks section */}
      {tracksLoading ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : tracks.length === 0 && isAdmin ? (
        <div className="rounded-xl p-4 text-center space-y-1" style={{ background: "#0d0d0d", border: `1px dashed #222` }}>
          <Music className="mx-auto h-6 w-6 text-[#333]" />
          <p className="text-xs text-[#444]">No tracks on this wall yet.</p>
          <p className="text-[11px] text-[#333]">Upload a new track or click <span className="text-[#666] font-medium">Claim Tracks</span> to add tracks you've already uploaded.</p>
        </div>
      ) : tracks.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: `1px solid ${BORDER}` }}>
          {/* Now playing mini */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
              {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music className="h-4 w-4 text-[#333]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentTrack?.title}</p>
              <p className="text-xs text-[#666] truncate">{currentTrack?.artist}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} className="text-[#555] hover:text-white disabled:opacity-30"><SkipBack className="h-4 w-4" /></button>
              <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: ORANGE }} data-testid="tracks-play">
                {playing ? <Pause className="h-3.5 w-3.5 text-white" /> : <Play className="h-3.5 w-3.5 text-white ml-0.5" />}
              </button>
              <button onClick={() => setCurrentIdx(i => Math.min(tracks.length - 1, i + 1))} disabled={currentIdx === tracks.length - 1} className="text-[#555] hover:text-white disabled:opacity-30"><SkipForward className="h-4 w-4" /></button>
            </div>
            <audio ref={audioRef} onEnded={() => setCurrentIdx(i => Math.min(tracks.length - 1, i + 1))} />
          </div>
          {/* Track list */}
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {tracks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-0 group" style={{ borderLeft: i === currentIdx ? `2px solid ${ORANGE}` : "2px solid transparent" }}>
                <button
                  onClick={() => { setCurrentIdx(i); setPlaying(true); setTimeout(() => audioRef.current?.play(), 50); }}
                  className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1a1a1a] transition-colors"
                  data-testid={`tracks-track-${t.id}`}
                >
                  <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-[#222] flex items-center justify-center">
                    {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music className="h-3 w-3 text-[#444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{t.title}</p>
                    <p className="text-[10px] text-[#555] truncate">{t.artist}</p>
                  </div>
                  {i === currentIdx && playing && <Radio className="h-3 w-3 shrink-0" style={{ color: ORANGE }} />}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => unclaimMutation.mutate(t.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#333] hover:text-red-400 px-3 py-2.5"
                    title="Remove from band wall"
                    data-testid={`unclaim-track-${t.id}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Wall posts (first 3 only in center) */}
      {postsLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
      ) : primaryPosts.length === 0 && !isAdmin ? (
        <div className="text-center py-8 text-[#444]">
          <Mic2 className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">No wall posts yet.</p>
        </div>
      ) : (
        primaryPosts.map(post => (
          <WallPostCard key={post.id} post={post} bandId={bandId} isAdmin={isAdmin} currentUserId={currentUserId} />
        ))
      )}
    </div>
  );
}

// ── Wall Overflow (right rail: posts 4+) ──────────────────────────────────────
function WallOverflow({ bandId, isAdmin, currentUserId }: { bandId: number; isAdmin: boolean; currentUserId?: number }) {
  const { data: posts = [] } = useQuery<GzBandWallPostWithAuthor[]>({
    queryKey: ["/api/bands", bandId, "wall"],
    queryFn: () => fetch(`/api/bands/${bandId}/wall`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const overflow = posts.slice(3);
  if (overflow.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">More Posts</p>
      {overflow.map(post => (
        <WallPostCard key={post.id} post={post} bandId={bandId} isAdmin={isAdmin} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarTab({ bandId, isMember, currentUserId }: { bandId: number; isMember: boolean; currentUserId?: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", venue: "", city: "", startAt: "", endAt: "", ticketUrl: "", type: "show" });

  const { data: events = [], isLoading } = useQuery<GzBandEvent[]>({
    queryKey: ["/api/bands", bandId, "events"],
    queryFn: () => fetch(`/api/bands/${bandId}/events`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/events`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "events"] });
      setShowForm(false);
      setForm({ title: "", description: "", venue: "", city: "", startAt: "", endAt: "", ticketUrl: "", type: "show" });
      toast({ title: "Event added!" });
    },
    onError: () => toast({ title: "Error", description: "Could not add event", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bands/${bandId}/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "events"] }),
  });

  const upcoming = events.filter(e => new Date(e.startAt) >= new Date()).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const past = events.filter(e => new Date(e.startAt) < new Date()).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div className="space-y-4">
      {isMember && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: ORANGE }}
          data-testid="add-event-btn"
        >
          <Plus className="h-4 w-4" /> Add Event
        </button>
      )}
      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-sm font-bold text-white">New Event</p>
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Event title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="event-title" />
            <select className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} data-testid="event-type">
              <option value="show">Live Show</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="livestream">Livestream</option>
              <option value="other">Other</option>
            </select>
            <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} data-testid="event-venue" />
            <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} data-testid="event-city" />
            <input type="datetime-local" className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} data-testid="event-start" />
            <input type="datetime-local" className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} data-testid="event-end" />
            <input className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Ticket URL (optional)" value={form.ticketUrl} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))} data-testid="event-tickets" />
            <textarea className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] resize-none min-h-[60px]" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="event-description" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-lg text-sm text-[#888] hover:text-white">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title.trim() || !form.startAt} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: ORANGE }} data-testid="event-save">
              {createMutation.isPending ? "Saving..." : "Save Event"}
            </button>
          </div>
        </div>
      )}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.map(ev => <EventCard key={ev.id} event={ev} isMember={isMember} onDelete={() => deleteMutation.mutate(ev.id)} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-2 mt-4">Past</p>
              <div className="space-y-2 opacity-60">
                {past.map(ev => <EventCard key={ev.id} event={ev} isMember={isMember} onDelete={() => deleteMutation.mutate(ev.id)} />)}
              </div>
            </div>
          )}
          {events.length === 0 && (
            <div className="text-center py-12 text-[#444]">
              <Calendar className="mx-auto mb-3 h-10 w-10" />
              <p className="text-sm">No events yet. Add your first show!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, isMember, onDelete }: { event: GzBandEvent; isMember: boolean; onDelete: () => void }) {
  const color = EVENT_COLORS[event.type] ?? "#6b7280";
  return (
    <div className="rounded-xl p-4 flex gap-3 items-start" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center text-white font-bold text-xs" style={{ background: color + "22", border: `1px solid ${color}44` }}>
        <span className="text-[10px] uppercase" style={{ color }}>{new Date(event.startAt).toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="text-base leading-none" style={{ color }}>{new Date(event.startAt).getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white">{event.title}</p>
          {isMember && (
            <button onClick={onDelete} className="text-[#444] hover:text-red-500 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
          )}
        </div>
        <p className="text-xs text-[#888] mt-0.5">{fmtTime(event.startAt)}{event.venue ? ` · ${event.venue}` : ""}{event.city ? `, ${event.city}` : ""}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge className="text-[10px] px-1.5 py-0" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{EVENT_LABELS[event.type] ?? "Event"}</Badge>
          {event.ticketUrl && (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-0.5 hover:underline" style={{ color: ORANGE }}>
              Tickets <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        {event.description && <p className="text-xs text-[#666] mt-1">{event.description}</p>}
      </div>
    </div>
  );
}

// ── Calendar Sidebar ──────────────────────────────────────────────────────────
function CalendarSidebar({ bandId, isAdmin }: { bandId: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", venue: "", city: "", startAt: "", endAt: "", ticketUrl: "", type: "show" });

  const { data: events = [] } = useQuery<GzBandEvent[]>({
    queryKey: ["/api/bands", bandId, "events"],
    queryFn: () => fetch(`/api/bands/${bandId}/events`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/events`, form).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "events"] });
      setAddOpen(false);
      setForm({ title: "", venue: "", city: "", startAt: "", endAt: "", ticketUrl: "", type: "show" });
      toast({ title: "Event added!" });
    },
    onError: () => toast({ title: "Error", description: "Could not save event", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bands/${bandId}/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "events"] }),
  });

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month));
  const eventsOnDay = (d: Date) => events.filter(e => isSameDay(parseISO(e.startAt), d));
  const dayEvents = selectedDate ? eventsOnDay(selectedDate) : [];
  const upcoming = events
    .filter(e => new Date(e.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" style={{ color: ORANGE }} />
          <span className="text-sm font-semibold text-white">Events</span>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setAddOpen(v => !v); setSelectedDate(null); }}
            className="text-[#555] hover:text-white transition-colors"
            data-testid="sidebar-add-event-btn"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add form (admin only) */}
      {isAdmin && addOpen && (
        <div className="px-3 py-3 space-y-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <p className="text-xs font-bold text-white">New Event</p>
          <input
            className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]"
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            data-testid="sidebar-event-title"
          />
          <select
            className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            data-testid="sidebar-event-type"
          >
            <option value="show">Live Show</option>
            <option value="rehearsal">Rehearsal</option>
            <option value="livestream">Livestream</option>
            <option value="other">Other</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]" placeholder="Venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} data-testid="sidebar-event-venue" />
            <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]" placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} data-testid="sidebar-event-city" />
          </div>
          <input type="datetime-local" className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} data-testid="sidebar-event-start" />
          <input type="datetime-local" className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} data-testid="sidebar-event-end" />
          <input className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white outline-none border border-[#222]" placeholder="Ticket URL (optional)" value={form.ticketUrl} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))} data-testid="sidebar-event-tickets" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.title.trim() || !form.startAt}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: ORANGE }}
              data-testid="sidebar-event-save"
            >
              {createMut.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="p-3">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#666] hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-xs font-semibold text-white">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#666] hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] text-[#444] py-0.5 font-medium">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const hasEvents = eventsOnDay(day).length > 0;
            const isSelected = !!selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className="relative flex flex-col items-center rounded py-1 text-[11px] transition-colors"
                style={isSelected
                  ? { background: ORANGE, color: "#fff" }
                  : isToday
                  ? { color: ORANGE, fontWeight: "bold" }
                  : { color: "#888" }
                }
                data-testid={`cal-day-${format(day, "yyyy-MM-dd")}`}
              >
                {format(day, "d")}
                {hasEvents && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#fff" : ORANGE }} />}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">{format(selectedDate, "EEE, MMM d")}</span>
              {isAdmin && (
                <button
                  onClick={() => { setForm(f => ({ ...f, startAt: format(selectedDate, "yyyy-MM-dd") + "T20:00" })); setAddOpen(true); }}
                  className="text-xs flex items-center gap-0.5 hover:underline"
                  style={{ color: ORANGE }}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-xs text-[#444] italic">No events on this day</p>
            ) : (
              <div className="space-y-1.5">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="flex items-start gap-2 group">
                    <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: EVENT_COLORS[ev.type] ?? "#6b7280" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white leading-snug">{ev.title}</p>
                      <p className="text-[10px] text-[#555]">{format(parseISO(ev.startAt), "h:mm a")}{ev.venue ? ` · ${ev.venue}` : ""}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deleteMut.mutate(ev.id)} className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-500 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming (when no date selected) */}
        {!selectedDate && upcoming.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-semibold text-[#444] uppercase tracking-wide mb-1.5">Upcoming</p>
            <div className="space-y-1.5">
              {upcoming.map(ev => (
                <div key={ev.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: EVENT_COLORS[ev.type] ?? "#6b7280" }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white leading-snug truncate">{ev.title}</p>
                    <p className="text-[10px] text-[#555]">{format(parseISO(ev.startAt), "MMM d")}{ev.city ? ` · ${ev.city}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!selectedDate && events.length === 0 && (
          <p className="text-[11px] text-[#444] text-center mt-3 italic">No events yet</p>
        )}
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function GalleryTab({ bandId, isMember }: { bandId: number; isMember: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery<GzBandPhoto[]>({
    queryKey: ["/api/bands", bandId, "photos"],
    queryFn: () => fetch(`/api/bands/${bandId}/photos`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bands/${bandId}/photos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "photos"] }),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", caption);
    try {
      const r = await fetch(`/api/bands/${bandId}/photos`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "photos"] });
      setCaption("");
      toast({ title: "Photo added!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {isMember && (
        <div className="mb-4 flex gap-2 items-center">
          <input
            type="text"
            className="flex-1 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]"
            placeholder="Caption (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            data-testid="photo-caption"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 shrink-0"
            style={{ background: ORANGE }}
            data-testid="photo-upload-btn"
          >
            <Plus className="h-4 w-4" /> {uploading ? "Uploading..." : "Add Photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 text-[#444]"><Image className="mx-auto mb-3 h-10 w-10" /><p className="text-sm">No photos yet.</p></div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden" data-testid={`photo-${photo.id}`}>
              <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightbox(photo.url)} />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white">{photo.caption}</p>
                </div>
              )}
              {isMember && (
                <button onClick={() => deleteMutation.mutate(photo.id)} className="absolute top-1 right-1 bg-black/60 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Zito TV ───────────────────────────────────────────────────────────────────
function ZitoTVTab({ bandId, isMember, band }: { bandId: number; isMember: boolean; band: GzBandWithMeta }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", streamUrl: "", thumbnailUrl: "", type: "archived", scheduledAt: "" });
  const [activeShow, setActiveShow] = useState<GzBandTvShow | null>(null);

  const { data: shows = [], isLoading } = useQuery<GzBandTvShow[]>({
    queryKey: ["/api/bands", bandId, "tv"],
    queryFn: () => fetch(`/api/bands/${bandId}/tv`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/tv`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tv"] });
      setShowForm(false);
      setForm({ title: "", description: "", streamUrl: "", thumbnailUrl: "", type: "archived", scheduledAt: "" });
      toast({ title: "Show added!" });
    },
    onError: () => toast({ title: "Error", description: "Could not add show", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bands/${bandId}/tv/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bands", bandId, "tv"] }),
  });

  const liveShows = shows.filter(s => s.type === "live");
  const archivedShows = shows.filter(s => s.type === "archived");

  function getEmbedUrl(url: string) {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return url;
  }

  return (
    <div className="space-y-4">
      {band.isLive && (
        <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: "#22c55e" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#22c55e22" }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">LIVE NOW</span>
          </div>
          {band.liveStreamUrl ? (
            <div className="aspect-video bg-black">
              <iframe src={getEmbedUrl(band.liveStreamUrl) ?? ""} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
            </div>
          ) : (
            <div className="aspect-video bg-[#0d0d0d] flex items-center justify-center">
              <div className="text-center"><Radio className="mx-auto mb-2 h-10 w-10 text-green-400" /><p className="text-sm text-green-400 font-bold">Live stream starting soon...</p></div>
            </div>
          )}
        </div>
      )}
      {activeShow && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setActiveShow(null)} className="text-[#888] hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-bold text-white">{activeShow.title}</p>
          </div>
          <div className="rounded-xl overflow-hidden aspect-video bg-black">
            {getEmbedUrl(activeShow.streamUrl ?? "") ? (
              <iframe src={getEmbedUrl(activeShow.streamUrl ?? "") ?? ""} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#444]"><Video className="h-12 w-12" /></div>
            )}
          </div>
          {activeShow.description && <p className="text-sm text-[#888] mt-2">{activeShow.description}</p>}
        </div>
      )}
      {isMember && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: ORANGE }}
          data-testid="add-show-btn"
        >
          <Plus className="h-4 w-4" /> Add Show
        </button>
      )}
      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-sm font-bold text-white">Add TV Show</p>
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Show title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="show-title" />
            <select className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} data-testid="show-type">
              <option value="archived">Archived Show</option>
              <option value="live">Scheduled Live</option>
            </select>
            {form.type === "live" && <input type="datetime-local" className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} data-testid="show-scheduled" />}
            <input className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Stream / YouTube URL" value={form.streamUrl} onChange={e => setForm(f => ({ ...f, streamUrl: e.target.value }))} data-testid="show-url" />
            <input className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222]" placeholder="Thumbnail URL (optional)" value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} data-testid="show-thumbnail" />
            <textarea className="col-span-2 bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] resize-none min-h-[60px]" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="show-description" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-lg text-sm text-[#888] hover:text-white">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title.trim()} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: ORANGE }} data-testid="show-save">
              {createMutation.isPending ? "Saving..." : "Add Show"}
            </button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}</div>
      ) : shows.length === 0 ? (
        <div className="text-center py-12 text-[#444]"><Tv2 className="mx-auto mb-3 h-10 w-10" /><p className="text-sm">No shows yet. Add your first broadcast!</p></div>
      ) : (
        <>
          {liveShows.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-2">Scheduled Live</p>
              <div className="grid grid-cols-2 gap-3">{liveShows.map(s => <ShowCard key={s.id} show={s} isMember={isMember} onPlay={() => setActiveShow(s)} onDelete={() => deleteMutation.mutate(s.id)} />)}</div>
            </div>
          )}
          {archivedShows.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-2 mt-4">Archived Shows</p>
              <div className="grid grid-cols-2 gap-3">{archivedShows.map(s => <ShowCard key={s.id} show={s} isMember={isMember} onPlay={() => setActiveShow(s)} onDelete={() => deleteMutation.mutate(s.id)} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShowCard({ show, isMember, onPlay, onDelete }: { show: GzBandTvShow; isMember: boolean; onPlay: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl overflow-hidden group cursor-pointer" style={{ background: CARD, border: `1px solid ${BORDER}` }} onClick={onPlay} data-testid={`show-card-${show.id}`}>
      <div className="aspect-video bg-[#0d0d0d] relative">
        {show.thumbnailUrl ? (
          <img src={show.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Tv2 className="h-8 w-8 text-[#333]" /></div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: ORANGE }}><Play className="h-4 w-4 text-white ml-0.5" /></div>
        </div>
        {show.type === "live" && show.scheduledAt && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 text-green-400" />
            <span className="text-[10px] text-green-400">{fmtDate(show.scheduledAt)}</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-white truncate">{show.title}</p>
        {show.description && <p className="text-[10px] text-[#666] mt-0.5 truncate">{show.description}</p>}
      </div>
      {isMember && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-full py-1.5 text-[10px] text-[#444] hover:text-red-500 hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-1">
          <Trash2 className="h-2.5 w-2.5" /> Remove
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BandClubbousePage() {
  const { id } = useParams<{ id: string }>();
  const bandId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("wall");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followEmail, setFollowEmail] = useState("");
  const [followName, setFollowName] = useState("");
  const [editForm, setEditForm] = useState({ name: "", bio: "", genre: "", city: "", state: "", avatarUrl: "", bannerUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "", websiteUrl: "", bandType: "band", allowGuestPosts: false });
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editBannerPreview, setEditBannerPreview] = useState("");
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false);
  const [uploadingEditBanner, setUploadingEditBanner] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);
  const editBannerRef = useRef<HTMLInputElement>(null);

  const uploadEditImage = async (file: File, kind: "avatar" | "banner") => {
    const setUploading = kind === "avatar" ? setUploadingEditAvatar : setUploadingEditBanner;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload-image", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error((await r.json()).message);
      const { url } = await r.json();
      if (kind === "avatar") { setEditAvatarPreview(url); setEditForm(f => ({ ...f, avatarUrl: url })); }
      else { setEditBannerPreview(url); setEditForm(f => ({ ...f, bannerUrl: url })); }
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: band, isLoading } = useQuery<GzBandWithMeta>({
    queryKey: ["/api/bands", bandId],
    queryFn: () => fetch(`/api/bands/${bandId}`).then(r => r.json()),
  });

  const { data: members = [] } = useQuery<GzBandMemberWithProfile[]>({
    queryKey: ["/api/bands", bandId, "members"],
    queryFn: () => fetch(`/api/bands/${bandId}/members`).then(r => r.json()),
  });

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bands/${bandId}`, editForm).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId] });
      setShowEditModal(false);
      toast({ title: "Band updated!" });
    },
    onError: () => toast({ title: "Error", description: "Could not save changes", variant: "destructive" }),
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bands/${bandId}/follow`, {
      email: followEmail.trim() || undefined,
      displayName: followName.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId] });
      setShowFollowModal(false);
      setFollowEmail(""); setFollowName("");
      toast({ title: "You're now following!", description: "You'll get updates on events and offerings." });
    },
    onError: () => toast({ title: "Error", description: "Could not follow band", variant: "destructive" }),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/bands/${bandId}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bands", bandId] });
      toast({ title: "Unfollowed" });
    },
  });

  const isMember = !!band?.isMember;
  const isAdmin = band?.memberRole === "admin";
  const isFollowing = !!band?.isFollowing;

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "wall", label: "Wall", icon: Mic2 },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "tv", label: "Zito TV", icon: Tv2 },
  ];

  function openEdit() {
    if (!band) return;
    setEditForm({
      name: band.name ?? "",
      bio: band.bio ?? "",
      genre: band.genre ?? "",
      city: band.city ?? "",
      state: band.state ?? "",
      avatarUrl: band.avatarUrl ?? "",
      bannerUrl: band.bannerUrl ?? "",
      instagramUrl: band.instagramUrl ?? "",
      tiktokUrl: band.tiktokUrl ?? "",
      youtubeUrl: band.youtubeUrl ?? "",
      websiteUrl: band.websiteUrl ?? "",
      bandType: (band as any).bandType ?? "band",
      allowGuestPosts: !!(band as any).allowGuestPosts,
    });
    setEditAvatarPreview(band.avatarUrl ?? "");
    setEditBannerPreview(band.bannerUrl ?? "");
    setShowEditModal(true);
  }

  if (isLoading) return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );

  if (!band) return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[#888]">Band not found.</p>
        <button onClick={() => setLocation("/gz-music")} className="mt-4 text-sm underline" style={{ color: ORANGE }}>← Back to GZMusic</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      <Navbar />

      {/* Banner */}
      <div className="relative">
        <div
          className="w-full h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]"
          style={band.bannerUrl ? { backgroundImage: `url(${band.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]/60" />
        <button onClick={() => setLocation("/gz-music?tab=bands")} className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-[#aaa] hover:text-white bg-black/50 rounded-lg px-2.5 py-1.5 backdrop-blur-sm" data-testid="back-to-bands">
          <ChevronLeft className="h-3 w-3" /> All Bands
        </button>
        {band.isLive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-400">LIVE</span>
          </div>
        )}
      </div>

      {/* Outer container — wide for two-column layout */}
      <div className="max-w-5xl mx-auto px-4">

        {/* Band header — sits cleanly below the banner */}
        <div className="flex items-center gap-4 pt-5 pb-4">
          <div className="w-20 h-20 rounded-2xl border-2 overflow-hidden shrink-0" style={{ borderColor: ORANGE, background: "#1a1a1a" }}>
            {band.avatarUrl ? (
              <img src={band.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Music className="h-8 w-8 text-[#333]" /></div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{band.name}</h1>
              <span
                className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase"
                style={(band as any).bandType === "artist"
                  ? { background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }
                  : { background: "rgba(255,122,0,0.15)", color: ORANGE, border: `1px solid rgba(255,122,0,0.3)` }}
              >
                {(band as any).bandType === "artist" ? "Artist" : "Band"}
              </span>
            </div>
            <p className="text-sm text-[#888]">{[band.genre, band.city && band.state ? `${band.city}, ${band.state}` : band.city ?? band.state].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="pb-1 flex gap-2 items-center flex-wrap">
            {/* Follow / Unfollow — visible to everyone who isn't the admin */}
            {!isAdmin && (
              isFollowing ? (
                <button
                  onClick={() => unfollowMutation.mutate()}
                  disabled={unfollowMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors"
                  style={{ color: "#22c55e", borderColor: "#22c55e44", background: "#22c55e11" }}
                  data-testid="unfollow-btn"
                >
                  <BellOff className="h-3.5 w-3.5" /> Following
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (user) followMutation.mutate();
                    else setShowFollowModal(true);
                  }}
                  disabled={followMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: "#22c55e" }}
                  data-testid="follow-btn"
                >
                  <Bell className="h-3.5 w-3.5" /> Follow
                </button>
              )
            )}
            {isAdmin && (
              <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[#888] border border-[#222] hover:border-[#444] hover:text-white transition-colors" data-testid="edit-band-btn">
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {band.bio && <p className="text-sm text-[#aaa] mb-3">{band.bio}</p>}

        {/* Social + member count */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-xs text-[#555]"><span className="font-bold text-[#888]">{band.memberCount}</span> member{band.memberCount !== 1 ? "s" : ""}</span>
          {band.instagramUrl && <a href={band.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors"><SiInstagram className="h-4 w-4" /></a>}
          {band.tiktokUrl && <a href={band.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors"><SiTiktok className="h-4 w-4" /></a>}
          {band.youtubeUrl && <a href={band.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors"><SiYoutube className="h-4 w-4" /></a>}
          {band.websiteUrl && <a href={band.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors"><Globe className="h-4 w-4" /></a>}
        </div>

        {/* Members strip */}
        {members.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {members.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1 shrink-0" data-testid={`member-${m.id}`}>
                <div className="w-9 h-9 rounded-full overflow-hidden border" style={{ borderColor: m.role === "admin" ? ORANGE : BORDER }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#222] flex items-center justify-center text-xs text-[#666]">{(m.displayName ?? "?")[0]}</div>}
                </div>
                <p className="text-[9px] text-[#666] max-w-[48px] truncate">{m.displayName ?? "Member"}</p>
                {m.instrument && <p className="text-[8px] text-[#444] truncate max-w-[48px]">{m.instrument}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Band Roster */}
        <RosterSection bandId={bandId} isAdmin={isAdmin} bandType={(band as any).bandType} />

        {/* Two-column: main content + calendar sidebar */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_280px] gap-6 pb-20">

          {/* Left: tabs + content */}
          <div>
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all shrink-0"
                  style={tab === t.id ? { background: ORANGE, color: "#fff" } : { background: "#111", color: "#555", border: `1px solid ${BORDER}` }}
                  data-testid={`tab-${t.id}`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "wall" && <WallTab bandId={bandId} isAdmin={isAdmin} currentUserId={user?.id} allowGuestPosts={(band as any).allowGuestPosts} bandName={band?.name ?? ""} />}
            {tab === "gallery" && <GalleryTab bandId={bandId} isMember={isMember} />}
            {tab === "tv" && <ZitoTVTab bandId={bandId} isMember={isMember} band={band} />}
          </div>

          {/* Right: overflow wall posts (when on wall tab) + calendar */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {tab === "wall" && <WallOverflow bandId={bandId} isAdmin={isAdmin} currentUserId={user?.id} />}
            <CalendarSidebar bandId={bandId} isAdmin={isAdmin} />
          </div>
        </div>
      </div>


      {/* ── Follow Modal (for non-logged-in guests) ── */}
      {showFollowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="h-5 w-5" style={{ color: "#22c55e" }} /> Follow {band?.name}
              </h2>
              <button onClick={() => setShowFollowModal(false)} className="text-[#555] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[#777]">Get notified about upcoming events and new releases.</p>
            <div className="space-y-2">
              <input
                className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]"
                placeholder="Your name (optional)"
                value={followName}
                onChange={e => setFollowName(e.target.value)}
                data-testid="follow-modal-name"
              />
              <input
                className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]"
                placeholder="Email address (optional)"
                type="email"
                value={followEmail}
                onChange={e => setFollowEmail(e.target.value)}
                data-testid="follow-modal-email"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowFollowModal(false)} className="px-4 py-2 rounded-lg text-sm text-[#555] hover:text-white transition-colors">Cancel</button>
              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: "#22c55e" }}
                data-testid="follow-modal-submit"
              >
                {followMutation.isPending ? "Following…" : "Follow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit band modal (admin only) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "#111", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black text-white">Edit {editForm.bandType === "artist" ? "Artist" : "Band"}</p>
              <button onClick={() => setShowEditModal(false)} className="text-[#555] hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {/* Band / Artist type toggle */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
              <button type="button" onClick={() => setEditForm(f => ({ ...f, bandType: "band" }))}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={editForm.bandType === "band" ? { background: ORANGE, color: "#fff" } : { color: "#555" }}
                data-testid="edit-type-band">
                Band
              </button>
              <button type="button" onClick={() => setEditForm(f => ({ ...f, bandType: "artist" }))}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={editForm.bandType === "artist" ? { background: "#a855f7", color: "#fff" } : { color: "#555" }}
                data-testid="edit-type-artist">
                Artist
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">{editForm.bandType === "artist" ? "Artist / Stage Name *" : "Band Name *"}</label>
                <input className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} data-testid="edit-band-name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">Bio</label>
                <textarea className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444] resize-none min-h-[70px]" value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} data-testid="edit-band-bio" />
              </div>
              <div>
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">Genre</label>
                <input className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" value={editForm.genre} onChange={e => setEditForm(f => ({ ...f, genre: e.target.value }))} data-testid="edit-band-genre" />
              </div>
              <div>
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">City</label>
                <input className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} data-testid="edit-band-city" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">State</label>
                <input className="w-full bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" placeholder="e.g. Arizona" value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} data-testid="edit-band-state" />
              </div>
              {/* Profile Image Upload */}
              <div className="col-span-1">
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">Profile Image</label>
                <div
                  className="relative flex items-center justify-center rounded-xl cursor-pointer border border-dashed transition-colors hover:border-[#444]"
                  style={{ borderColor: editAvatarPreview ? "transparent" : "#2a2a2a", background: "#1a1a1a", height: "80px", overflow: "hidden" }}
                  onClick={() => editAvatarRef.current?.click()}
                  data-testid="edit-band-avatar-upload"
                >
                  {editAvatarPreview ? (
                    <>
                      <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); setEditAvatarPreview(""); setEditForm(f => ({ ...f, avatarUrl: "" })); }}
                        data-testid="edit-band-avatar-clear"
                      ><X className="h-3 w-3" /></button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#444]">
                      {uploadingEditAvatar ? <div className="h-3.5 w-3.5 rounded-full border-2 border-[#555] border-t-transparent animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="text-[10px]">{uploadingEditAvatar ? "Uploading…" : "Upload"}</span>
                    </div>
                  )}
                </div>
                <input ref={editAvatarRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadEditImage(e.target.files[0], "avatar")} data-testid="edit-band-avatar" />
              </div>
              {/* Banner Image Upload */}
              <div className="col-span-1">
                <label className="text-xs text-[#555] uppercase tracking-wide mb-1 block">Banner Image</label>
                <div
                  className="relative flex items-center justify-center rounded-xl cursor-pointer border border-dashed transition-colors hover:border-[#444]"
                  style={{ borderColor: editBannerPreview ? "transparent" : "#2a2a2a", background: "#1a1a1a", height: "80px", overflow: "hidden" }}
                  onClick={() => editBannerRef.current?.click()}
                  data-testid="edit-band-banner-upload"
                >
                  {editBannerPreview ? (
                    <>
                      <img src={editBannerPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); setEditBannerPreview(""); setEditForm(f => ({ ...f, bannerUrl: "" })); }}
                        data-testid="edit-band-banner-clear"
                      ><X className="h-3 w-3" /></button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#444]">
                      {uploadingEditBanner ? <div className="h-3.5 w-3.5 rounded-full border-2 border-[#555] border-t-transparent animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="text-[10px]">{uploadingEditBanner ? "Uploading…" : "Upload"}</span>
                    </div>
                  )}
                </div>
                <input ref={editBannerRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadEditImage(e.target.files[0], "banner")} data-testid="edit-band-banner" />
              </div>
            </div>
            {/* Allow stranger wall posts toggle */}
            <div className="flex items-center justify-between py-3 border-t border-[#1e1e1e]">
              <div>
                <p className="text-sm font-semibold text-white">Allow stranger posts</p>
                <p className="text-xs text-[#555] mt-0.5">Let visitors write on the wall without signing in</p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm(f => ({ ...f, allowGuestPosts: !f.allowGuestPosts }))}
                className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                style={{ background: editForm.allowGuestPosts ? ORANGE : "#1e1e1e", border: `1px solid ${editForm.allowGuestPosts ? ORANGE : "#333"}` }}
                data-testid="edit-allow-guest-posts"
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: editForm.allowGuestPosts ? "calc(100% - 1.1rem)" : "2px" }} />
              </button>
            </div>
            <p className="text-xs text-[#444] uppercase tracking-wide pt-1">Social Links</p>
            <div className="grid grid-cols-2 gap-3">
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" placeholder="Instagram URL" value={editForm.instagramUrl} onChange={e => setEditForm(f => ({ ...f, instagramUrl: e.target.value }))} data-testid="edit-band-instagram" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" placeholder="TikTok URL" value={editForm.tiktokUrl} onChange={e => setEditForm(f => ({ ...f, tiktokUrl: e.target.value }))} data-testid="edit-band-tiktok" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" placeholder="YouTube URL" value={editForm.youtubeUrl} onChange={e => setEditForm(f => ({ ...f, youtubeUrl: e.target.value }))} data-testid="edit-band-youtube" />
              <input className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none border border-[#222] focus:border-[#444]" placeholder="Website URL" value={editForm.websiteUrl} onChange={e => setEditForm(f => ({ ...f, websiteUrl: e.target.value }))} data-testid="edit-band-website" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-xl text-sm text-[#888] border border-[#222]" data-testid="edit-band-cancel">Cancel</button>
              <button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.name.trim()} className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: ORANGE }} data-testid="edit-band-save">
                {editMutation.isPending ? "Saving…" : <><Check className="h-4 w-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
