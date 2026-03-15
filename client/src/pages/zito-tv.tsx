import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tv, Calendar, Clock, ChevronLeft, ChevronRight, Plus, X, ExternalLink, Loader2, ArrowLeft, Mic, Users, BookOpen, Music, Presentation, Radio, MessageSquare, Zap, MonitorPlay, Trash2, CheckCircle2, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { GuestCtaModal } from "@/components/guest-cta-modal";
import { apiRequest } from "@/lib/queryClient";
import type { ZitoTVEventWithHost, InjectedFeed } from "@shared/schema";
import { ZITO_TV_CATEGORIES } from "@shared/schema";

const CATEGORY_META: Record<string, { icon: any; label: string; color: string }> = {
  INTERVIEW:     { icon: Mic,           label: "Interview",       color: "#7c5cbf" },
  COACHING:      { icon: Users,         label: "Coaching",        color: "#2563eb" },
  PRESENTATION:  { icon: Presentation,  label: "Presentation",    color: "#059669" },
  DEMO:          { icon: Zap,           label: "Demo",            color: "#d97706" },
  MUSIC:         { icon: Music,         label: "Music",           color: "#db2777" },
  CLASS:         { icon: BookOpen,      label: "Class",           color: "#0891b2" },
  DISCUSSION:    { icon: MessageSquare, label: "Discussion",      color: "#65a30d" },
  BROADCAST:     { icon: Radio,         label: "Broadcast",       color: "#ff2b2b" },
  OTHER:         { icon: Tv,            label: "Other",           color: "#888" },
};

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatEventTime(event: ZitoTVEventWithHost): string {
  const s = new Date(event.startAt);
  const e = new Date(event.endAt);
  return `${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function isToday(d: Date): boolean {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface EventCardProps {
  event: ZitoTVEventWithHost;
  onDelete?: (id: number) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
}

function EventCard({ event, onDelete, isAdmin, isOwner }: EventCardProps) {
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.OTHER;
  const Icon = meta.icon;
  const now = new Date();
  const isLive = new Date(event.startAt) <= now && new Date(event.endAt) > now;
  const isPast = new Date(event.endAt) < now;

  return (
    <div
      className="rounded-xl border p-4 space-y-2.5 transition-all"
      style={{
        background: isLive ? "rgba(255,43,43,0.08)" : "rgba(255,255,255,0.03)",
        borderColor: isLive ? "rgba(255,43,43,0.40)" : "rgba(255,255,255,0.08)",
        opacity: isPast ? 0.55 : 1,
      }}
      data-testid={`event-card-${event.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}22` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{event.title}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive && (
            <span className="flex items-center gap-1 bg-[#ff2b2b] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          {(isAdmin || isOwner) && onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#555] hover:text-[#ff2b2b] hover:bg-[#ff2b2b]/10 transition-colors"
              data-testid={`button-delete-event-${event.id}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[#666]">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {formatEventTime(event)}
        </span>
        <span className="text-[#444]">·</span>
        <span>{event.durationMinutes}m</span>
      </div>

      {event.hostName && (
        <p className="text-xs text-[#888]">
          Hosted by <span className="text-[#bbb] font-medium">{event.hostName}</span>
        </p>
      )}

      {event.description && (
        <p className="text-xs text-[#666] leading-relaxed line-clamp-2">{event.description}</p>
      )}

      <div className="flex gap-2 pt-1">
        {event.liveUrl && (
          <a href={event.liveUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-7 text-[10px] bg-[#ff2b2b] hover:bg-[#e01e1e] text-white rounded-lg px-3" data-testid={`button-join-event-${event.id}`}>
              <ExternalLink className="w-3 h-3 mr-1" /> Join Live
            </Button>
          </a>
        )}
        {event.ctaUrl && (
          <a href={event.ctaUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#2a2a2a] bg-transparent text-[#aaa] hover:text-white rounded-lg px-3">
              Register
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

interface BookingFormProps {
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
  profile: any;
}

function BookingForm({ selectedDate, onClose, onSuccess, user, profile }: BookingFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostName, setHostName] = useState(profile?.displayName ?? "");
  const [category, setCategory] = useState("OTHER");
  const [liveUrl, setLiveUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [time, setTime] = useState("10:00");

  const startAt = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    parseInt(time.split(":")[0]),
    parseInt(time.split(":")[1]),
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/zitotv/events", {
        title, description: description || undefined, hostName, category, liveUrl: liveUrl || undefined,
        ctaUrl: ctaUrl || undefined, durationMinutes, startAt: startAt.toISOString(),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event scheduled!", description: "Your ZitoTV event is now on the calendar." });
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-2xl bg-[#0b0b0b] border border-[#ff2b2b]/30 p-5 space-y-4" data-testid="booking-form">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Book a Live Event</h3>
          <p className="text-[#555] text-xs mt-0.5">
            {selectedDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={onClose} className="text-[#555] hover:text-white text-xs" data-testid="button-close-booking">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[#aaa] text-xs">Event Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mindset Mastery Live Session" className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm" data-testid="input-event-title" />
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Time *</Label>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white focus:border-[#ff2b2b] h-9 text-sm" data-testid="input-event-time" />
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Duration *</Label>
          <Select value={String(durationMinutes)} onValueChange={v => setDurationMinutes(parseInt(v))}>
            <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-[#2a2a2a]">
              {DURATIONS.map(d => (
                <SelectItem key={d} value={String(d)} className="text-white focus:bg-[#222]">
                  {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-[#2a2a2a]">
              {ZITO_TV_CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="text-white focus:bg-[#222]">{CATEGORY_META[c]?.label ?? c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Host Name *</Label>
          <Input value={hostName} onChange={e => setHostName(e.target.value)} placeholder="Your name or brand" className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm" data-testid="input-host-name" />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-[#aaa] text-xs">Description (optional)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will this event cover?" rows={2} className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] text-sm resize-none" data-testid="input-description" />
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Live Stream URL (optional)</Label>
          <Input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="https://..." className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm" data-testid="input-live-url" />
        </div>

        <div className="space-y-1">
          <Label className="text-[#aaa] text-xs">Registration CTA URL (optional)</Label>
          <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm" data-testid="input-cta-url" />
        </div>
      </div>

      <Button
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending || !title.trim() || !hostName.trim()}
        className="w-full bg-[#ff2b2b] hover:bg-[#e01e1e] text-white font-bold rounded-xl h-10"
        data-testid="button-submit-event"
      >
        {createMutation.isPending
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Scheduling…</>
          : <><Calendar className="h-4 w-4 mr-2" /> Schedule Event</>
        }
      </Button>
    </div>
  );
}

// ── Super Admin: Inject Live Frame Modal ───────────────────────────────────
function InjectFrameModal({ activeFeed, onClose }: { activeFeed: InjectedFeed | null; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState("YouTube");
  const [sourceUrl, setSourceUrl] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");

  const injectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/injected-feeds", {
        platform,
        sourceUrl,
        displayTitle: displayTitle || undefined,
        injectMode: "immediate",
        status: "active",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      toast({ title: "Frame injected", description: "The Zito TV main frame is now live." });
      onClose();
    },
    onError: (err: any) => toast({ title: "Injection failed", description: err.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!activeFeed) return;
      const res = await apiRequest("PATCH", `/api/admin/injected-feeds/${activeFeed.id}`, { status: "inactive" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      toast({ title: "Frame cleared", description: "Zito TV main frame deactivated." });
      onClose();
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl border border-[#ff2b2b]/20 bg-[#0d0d0d] p-5 space-y-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff2b2b]/15 border border-[#ff2b2b]/20 flex items-center justify-center">
              <MonitorPlay className="w-4 h-4 text-[#ff2b2b]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Insert Zito TV Frame</p>
              <p className="text-[#555] text-[10px]">Super Admin · Immediate injection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors" data-testid="button-close-inject-modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active feed notice */}
        {activeFeed && (
          <div className="flex items-start gap-3 rounded-xl bg-[#0a0a0a] border border-yellow-500/20 p-3">
            <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-yellow-400 text-xs font-semibold">Frame currently active</p>
              <p className="text-[#666] text-[10px] truncate mt-0.5">{activeFeed.displayTitle || activeFeed.sourceUrl}</p>
            </div>
            <button
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
              data-testid="button-deactivate-feed"
            >
              {deactivateMutation.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CircleSlash className="w-3 h-3" />
              }
              Clear
            </button>
          </div>
        )}

        {/* Platform */}
        <div className="space-y-1.5">
          <Label className="text-[#aaa] text-xs">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm focus:border-[#ff2b2b]" data-testid="select-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-[#2a2a2a]">
              {["YouTube", "Twitch", "Vimeo", "Custom"].map(p => (
                <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* URL */}
        <div className="space-y-1.5">
          <Label className="text-[#aaa] text-xs">Embed / Stream URL</Label>
          <Input
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/..."
            className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm"
            data-testid="input-inject-url"
          />
          <p className="text-[#444] text-[10px]">Use an embed URL (not a watch URL) for YouTube/Twitch/Vimeo</p>
        </div>

        {/* Display title */}
        <div className="space-y-1.5">
          <Label className="text-[#aaa] text-xs">Display Title <span className="text-[#555]">(optional)</span></Label>
          <Input
            value={displayTitle}
            onChange={e => setDisplayTitle(e.target.value)}
            placeholder="e.g. Gigzito Live Q&A"
            className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#333] focus:border-[#ff2b2b] h-9 text-sm"
            data-testid="input-inject-title"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#2a2a2a] text-[#aaa] hover:text-white bg-transparent h-9 text-sm"
            data-testid="button-cancel-inject"
          >
            Cancel
          </Button>
          <Button
            onClick={() => injectMutation.mutate()}
            disabled={injectMutation.isPending || !sourceUrl.trim()}
            className="flex-1 bg-[#ff2b2b] hover:bg-[#e01e1e] text-white font-bold h-9 text-sm"
            data-testid="button-submit-inject"
          >
            {injectMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Injecting…</>
              : <><MonitorPlay className="w-3.5 h-3.5 mr-1.5" /> Go Live</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ZitoTVPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showBooking, setShowBooking] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showInjectModal, setShowInjectModal] = useState(false);

  const isSuperAdmin = user?.user?.role === "SUPER_ADMIN";

  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);

  const { data: events = [], isLoading } = useQuery<ZitoTVEventWithHost[]>({
    queryKey: ["/api/zitotv/events", viewYear, viewMonth],
    queryFn: () => fetch(`/api/zitotv/events?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: activeFeed = null } = useQuery<InjectedFeed | null>({
    queryKey: ["/api/injected-feed/active"],
    enabled: isSuperAdmin,
    refetchInterval: isSuperAdmin ? 15000 : false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/zitotv/events/${id}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zitotv/events"] });
      toast({ title: "Event removed" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const calDays = getCalendarDays(viewYear, viewMonth);
  const selectedEvents = events.filter(e => sameDay(new Date(e.startAt), selectedDate));
  const isAdmin = user?.user?.role === "ADMIN" || user?.user?.role === "SUPER_ADMIN";

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleBookClick = () => {
    if (!user) { setShowGuestModal(true); return; }
    setShowBooking(true);
  };

  const eventDays = new Set(events.map(e => {
    const d = new Date(e.startAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));
  const hasEvents = (d: Date) => eventDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  const liveDays = new Set(events.filter(e => {
    const n = new Date();
    return new Date(e.startAt) <= n && new Date(e.endAt) > n;
  }).map(e => {
    const d = new Date(e.startAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));
  const isLiveDay = (d: Date) => liveDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  return (
    <div className="min-h-screen bg-black pb-20" data-testid="page-zito-tv">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", borderColor: "rgba(255,43,43,0.20)" }}>
        <div className="flex items-center gap-2.5">
          <Link href="/">
            <button className="text-[#555] hover:text-white transition-colors mr-1" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <Tv className="w-5 h-5 text-[#ff2b2b]" />
          <div>
            <span className="text-white font-black text-base tracking-tight">ZitoTV</span>
            <span className="text-[#ff2b2b] text-[10px] font-bold ml-1.5 opacity-70">Live Events Calendar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button
              onClick={() => setShowInjectModal(true)}
              size="sm"
              className="text-xs font-bold rounded-full px-3 h-8 border"
              style={{
                background: activeFeed ? "rgba(255,43,43,0.12)" : "rgba(255,255,255,0.05)",
                borderColor: activeFeed ? "rgba(255,43,43,0.35)" : "rgba(255,255,255,0.1)",
                color: activeFeed ? "#ff6b6b" : "#888",
              }}
              data-testid="button-inject-frame"
            >
              <MonitorPlay className="w-3.5 h-3.5 mr-1" />
              {activeFeed ? "Frame Live" : "Insert Frame"}
            </Button>
          )}
          <Button
            onClick={handleBookClick}
            size="sm"
            className="bg-[#ff2b2b] hover:bg-[#e01e1e] text-white text-xs font-bold rounded-full px-3 h-8"
            data-testid="button-book-event"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Book a Live Event
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Calendar */}
        <div className="rounded-2xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a]">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors" data-testid="button-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-white font-bold text-sm" data-testid="text-current-month">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors" data-testid="button-next-month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#111]">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-[#444] uppercase tracking-widest">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-11 border-r border-b border-[#111] last:border-r-0" />;
              const sel = sameDay(day, selectedDate);
              const tod = isToday(day);
              const live = isLiveDay(day);
              const hasEv = hasEvents(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setShowBooking(false); }}
                  className="h-11 flex flex-col items-center justify-center gap-0.5 border-r border-b border-[#0f0f0f] last:border-r-0 transition-colors relative"
                  style={{
                    background: sel ? "rgba(255,43,43,0.15)" : tod ? "rgba(255,43,43,0.05)" : "transparent",
                  }}
                  data-testid={`calendar-day-${day.getDate()}`}
                >
                  <span className={`text-xs font-semibold ${sel ? "text-[#ff2b2b]" : tod ? "text-white" : "text-[#666]"}`}>
                    {day.getDate()}
                  </span>
                  {(hasEv || live) && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: live ? "#ff2b2b" : "#555" }}
                    />
                  )}
                  {sel && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2b2b]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day heading */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm" data-testid="text-selected-date">
              {isToday(selectedDate) ? "Today" : selectedDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <p className="text-[#444] text-xs mt-0.5">
              {selectedEvents.length === 0 ? "No events scheduled" : `${selectedEvents.length} event${selectedEvents.length !== 1 ? "s" : ""} scheduled`}
            </p>
          </div>
          <button
            onClick={handleBookClick}
            className="flex items-center gap-1.5 text-xs text-[#ff2b2b] font-semibold hover:text-white transition-colors"
            data-testid="button-add-event-day"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>

        {/* Booking form */}
        {showBooking && user && (
          <BookingForm
            selectedDate={selectedDate}
            onClose={() => setShowBooking(false)}
            onSuccess={() => {
              setShowBooking(false);
              queryClient.invalidateQueries({ queryKey: ["/api/zitotv/events"] });
            }}
            user={user}
            profile={user?.profile}
          />
        )}

        {/* Events for selected day */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#ff2b2b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedEvents.length === 0 ? (
          <div className="rounded-2xl bg-[#0b0b0b] border border-[#1a1a1a] py-10 flex flex-col items-center gap-3" data-testid="empty-events">
            <Tv className="w-8 h-8 text-[#2a2a2a]" />
            <p className="text-[#444] text-sm">No events on this day</p>
            <button
              onClick={handleBookClick}
              className="text-xs text-[#ff2b2b] font-semibold hover:underline"
            >
              Be the first to book a live event →
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="events-list">
            {selectedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onDelete={isAdmin || event.hostUserId === user?.user?.id ? deleteMutation.mutate : undefined}
                isAdmin={isAdmin}
                isOwner={event.hostUserId === user?.user?.id}
              />
            ))}
          </div>
        )}

        {/* Upcoming events this month */}
        {events.filter(e => {
          const s = new Date(e.startAt);
          return s >= today && !sameDay(s, selectedDate);
        }).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[#555] text-xs font-bold uppercase tracking-widest">Upcoming This Month</h3>
            <div className="space-y-2">
              {events.filter(e => {
                const s = new Date(e.startAt);
                return s >= today && !sameDay(s, selectedDate);
              }).slice(0, 5).map(event => {
                const meta = CATEGORY_META[event.category] ?? CATEGORY_META.OTHER;
                const Icon = meta.icon;
                return (
                  <button
                    key={event.id}
                    onClick={() => { setSelectedDate(new Date(event.startAt)); setShowBooking(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#1a1a1a] bg-[#0b0b0b] hover:border-[#ff2b2b]/20 transition-colors text-left"
                    data-testid={`upcoming-event-${event.id}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{event.title}</p>
                      <p className="text-[#555] text-[10px]">
                        {new Date(event.startAt).toLocaleDateString("default", { month: "short", day: "numeric" })} · {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category legend */}
        <div className="rounded-xl bg-[#0b0b0b] border border-[#1a1a1a] p-4">
          <p className="text-[#444] text-[10px] font-bold uppercase tracking-widest mb-3">Event Types</p>
          <div className="grid grid-cols-3 gap-2">
            {ZITO_TV_CATEGORIES.map(cat => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                  <span className="text-[10px] text-[#666]">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {showGuestModal && <GuestCtaModal reason="general" onClose={() => setShowGuestModal(false)} />}
      {isSuperAdmin && showInjectModal && (
        <InjectFrameModal activeFeed={activeFeed} onClose={() => setShowInjectModal(false)} />
      )}
    </div>
  );
}
