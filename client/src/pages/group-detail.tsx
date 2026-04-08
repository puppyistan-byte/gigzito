import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, MessageSquare, Calendar, Target, ChevronLeft, Plus, Trash2, Lock, Globe,
  Send, ChevronLeft as PrevMonth, ChevronRight as NextMonth, UserPlus, X, Search,
  Copy, Settings, KanbanSquare, ArrowRight, ArrowLeft, CheckSquare, Clock, Camera, Mail,
  Wallet, ExternalLink, Link2, ShieldCheck, AlertCircle, BookOpen, TrendingUp,
  ChevronDown, ChevronUp, Trophy, CircleDollarSign, Info
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, addMonths, subMonths, parseISO
} from "date-fns";

type Group = {
  id: number; name: string; description: string; coverUrl: string | null;
  isPrivate: boolean; inviteCode: string; memberCount: number;
  myRole: string | null; myStatus: string | null; createdBy: number; createdAt: string;
};
type Post = { id: number; groupId: number; userId: number; content: string; createdAt: string; displayName: string | null; avatarUrl: string | null; username: string | null; commentCount: number };
type Comment = { id: number; postId: number; userId: number; content: string; createdAt: string; displayName: string | null; avatarUrl: string | null; username: string | null };
type Endeavor = { id: number; groupId: number; title: string; description: string; goalProgress: number; createdAt: string };
type Event = { id: number; groupId: number; title: string; description: string; startAt: string; endAt: string | null; allDay: boolean; createdBy: number };
type Member = { id: number; groupId: number; userId: number; role: string; status: string; displayName: string | null; avatarUrl: string | null; username: string | null; email: string };
type GroupWallet = { id: number; groupId: number; label: string; network: string; address: string; link: string | null; createdBy: number; createdAt: string; goalAmount: number | null; goalCurrency: string | null; goalLabel: string | null };

const MAIN_TABS = ["wall", "endeavors", "kanban", "wallet"] as const;
type MainTab = typeof MAIN_TABS[number];

const NETWORKS: { value: string; label: string; color: string; explorer: (addr: string) => string }[] = [
  { value: "ETH",   label: "Ethereum",  color: "bg-indigo-500",  explorer: (a) => `https://etherscan.io/address/${a}` },
  { value: "BTC",   label: "Bitcoin",   color: "bg-orange-500",  explorer: (a) => `https://blockchair.com/bitcoin/address/${a}` },
  { value: "SOL",   label: "Solana",    color: "bg-purple-500",  explorer: (a) => `https://solscan.io/account/${a}` },
  { value: "MATIC", label: "Polygon",   color: "bg-violet-500",  explorer: (a) => `https://polygonscan.com/address/${a}` },
  { value: "BNB",   label: "BNB Chain", color: "bg-yellow-500",  explorer: (a) => `https://bscscan.com/address/${a}` },
  { value: "USDT",  label: "USDT",      color: "bg-green-500",   explorer: (a) => `https://etherscan.io/address/${a}` },
  { value: "USDC",  label: "USDC",      color: "bg-blue-500",    explorer: (a) => `https://etherscan.io/address/${a}` },
  { value: "XRP",   label: "XRP",       color: "bg-cyan-500",    explorer: (a) => `https://xrpscan.com/account/${a}` },
  { value: "LINK",  label: "Custom Link", color: "bg-gray-500",  explorer: (a) => a },
];

function networkInfo(value: string) {
  return NETWORKS.find((n) => n.value === value) ?? { value, label: value, color: "bg-gray-400", explorer: (a: string) => a };
}

function Avatar({ src, name, size = 8 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "?")[0]?.toUpperCase();
  return src ? (
    <img src={src} alt={name ?? ""} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{initials}</div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return format(new Date(dateStr), "MMM d");
}

// ─── WALL ─────────────────────────────────────────────────────────────────────
function WallTab({ groupId, isAdmin, myUserId }: { groupId: number; isAdmin: boolean; myUserId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [postText, setPostText] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});

  const { data: posts = [], isLoading } = useQuery<Post[]>({ queryKey: ["/api/groups", groupId, "wall"] });

  const postMut = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/groups/${groupId}/wall`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall"] }); setPostText(""); },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  const deletePostMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/groups/${groupId}/wall/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall"] }),
  });

  const toggleComments = (postId: number) => {
    setExpandedComments((prev) => { const next = new Set(prev); if (next.has(postId)) next.delete(postId); else next.add(postId); return next; });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-4">
        <Textarea data-testid="input-wall-post" placeholder="Share an update with the group…" rows={3} value={postText} onChange={(e) => setPostText(e.target.value)} className="mb-3 resize-none" />
        <Button data-testid="button-post-wall" className="bg-red-600 hover:bg-red-700 text-white" disabled={!postText.trim() || postMut.isPending} onClick={() => postMut.mutate(postText.trim())}>
          <Send className="w-4 h-4 mr-2" /> {postMut.isPending ? "Posting…" : "Post"}
        </Button>
      </div>

      {isLoading ? <div className="h-40 bg-muted animate-pulse rounded-xl" /> : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No posts yet. Be the first to share something!</p>
        </div>
      ) : posts.map((post) => (
        <PostCard key={post.id} post={post} groupId={groupId} isAdmin={isAdmin} myUserId={myUserId}
          expanded={expandedComments.has(post.id)} onToggleComments={() => toggleComments(post.id)}
          commentText={commentTexts[post.id] ?? ""} onCommentTextChange={(t) => setCommentTexts((prev) => ({ ...prev, [post.id]: t }))}
          onDelete={() => deletePostMut.mutate(post.id)} />
      ))}
    </div>
  );
}

function PostCard({ post, groupId, isAdmin, myUserId, expanded, onToggleComments, commentText, onCommentTextChange, onDelete }: {
  post: Post; groupId: number; isAdmin: boolean; myUserId: number; expanded: boolean;
  onToggleComments: () => void; commentText: string; onCommentTextChange: (t: string) => void; onDelete: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const canDelete = isAdmin || post.userId === myUserId;

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/groups", groupId, "wall", post.id, "comments"],
    enabled: expanded,
  });

  const commentMut = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/groups/${groupId}/wall/${post.id}/comments`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall", post.id, "comments"] }); qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall"] }); onCommentTextChange(""); },
    onError: () => toast({ title: "Failed to comment", variant: "destructive" }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (cid: number) => apiRequest("DELETE", `/api/groups/${groupId}/wall/${post.id}/comments/${cid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall", post.id, "comments"] }); qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall"] }); },
  });

  return (
    <div data-testid={`post-card-${post.id}`} className="bg-card border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Avatar src={post.avatarUrl} name={post.displayName} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{post.displayName ?? post.username ?? "Member"}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
              {canDelete && (
                <button data-testid={`button-delete-post-${post.id}`} onClick={onDelete} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          <button data-testid={`button-toggle-comments-${post.id}`} onClick={onToggleComments} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            {post.commentCount > 0 ? `${post.commentCount} comment${post.commentCount !== 1 ? "s" : ""}` : "Comment"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pl-12 space-y-2">
          {comments.map((c) => (
            <div key={c.id} data-testid={`comment-${c.id}`} className="flex items-start gap-2">
              <Avatar src={c.avatarUrl} name={c.displayName} size={6} />
              <div className="flex-1 bg-muted rounded-lg px-3 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{c.displayName ?? "Member"}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    {(isAdmin || c.userId === myUserId) && (
                      <button onClick={() => deleteCommentMut.mutate(c.id)} className="text-muted-foreground hover:text-red-500"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
                <p className="text-xs mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input data-testid={`input-comment-${post.id}`} placeholder="Add a comment…" className="h-8 text-sm" value={commentText} onChange={(e) => onCommentTextChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && commentText.trim()) { e.preventDefault(); commentMut.mutate(commentText.trim()); } }} />
            <Button data-testid={`button-submit-comment-${post.id}`} size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8 px-3" disabled={!commentText.trim() || commentMut.isPending} onClick={() => commentMut.mutate(commentText.trim())}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR SIDEBAR ─────────────────────────────────────────────────────────
function CalendarSidebar({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", description: "", startAt: "", endAt: "", allDay: false });

  const { data: events = [] } = useQuery<Event[]>({ queryKey: ["/api/groups", groupId, "events"] });

  const createMut = useMutation({
    mutationFn: (d: typeof eventForm) => apiRequest("POST", `/api/groups/${groupId}/events`, { ...d, endAt: d.endAt || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "events"] }); setEventOpen(false); setEventForm({ title: "", description: "", startAt: "", endAt: "", allDay: false }); },
    onError: () => toast({ title: "Failed to save event", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (d: { id: number } & typeof eventForm) => apiRequest("PATCH", `/api/groups/${groupId}/events/${d.id}`, { title: d.title, description: d.description, startAt: d.startAt, endAt: d.endAt || undefined, allDay: d.allDay }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "events"] }); setEventOpen(false); setEditEvent(null); },
    onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/groups/${groupId}/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "events"] }),
  });

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month));

  const eventsOnDay = (date: Date) => events.filter((e) => isSameDay(parseISO(e.startAt), date));
  const dayEvents = selectedDate ? eventsOnDay(selectedDate) : [];

  const openCreate = (date?: Date) => {
    const iso = (date ?? new Date()).toISOString().slice(0, 16);
    setEditEvent(null);
    setEventForm({ title: "", description: "", startAt: iso, endAt: "", allDay: false });
    setEventOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditEvent(ev);
    setEventForm({ title: ev.title, description: ev.description, startAt: ev.startAt.slice(0, 16), endAt: ev.endAt?.slice(0, 16) ?? "", allDay: ev.allDay });
    setEventOpen(true);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-1 border-b flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-sm">Calendar</h3>
        </div>
        {isAdmin && (
          <button data-testid="button-add-event-sidebar" onClick={() => openCreate()} className="text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-muted transition-colors"><PrevMonth className="w-3.5 h-3.5" /></button>
          <span className="text-xs font-semibold">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-muted transition-colors"><NextMonth className="w-3.5 h-3.5" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] text-muted-foreground py-0.5 font-medium">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const hasEvents = eventsOnDay(day).length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                data-testid={`cal-day-${format(day, "yyyy-MM-dd")}`}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`relative flex flex-col items-center rounded py-1 text-[11px] transition-colors ${
                  isSelected ? "bg-red-600 text-white" :
                  isToday ? "bg-red-50 dark:bg-red-950/40 text-red-600 font-bold" :
                  "hover:bg-muted"
                }`}
              >
                {format(day, "d")}
                {hasEvents && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-red-500"}`} />}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">{format(selectedDate, "EEE, MMM d")}</span>
              {isAdmin && (
                <button onClick={() => openCreate(selectedDate)} className="text-xs text-red-600 hover:underline flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No events</p>
            ) : (
              <div className="space-y-1.5">
                {dayEvents.map((ev) => (
                  <div key={ev.id} data-testid={`sidebar-event-${ev.id}`} className="flex items-start gap-2 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{ev.title}</p>
                      {!ev.allDay && <p className="text-[10px] text-muted-foreground">{format(parseISO(ev.startAt), "h:mm a")}</p>}
                    </div>
                    {isAdmin && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                        <button onClick={() => openEdit(ev)} className="text-muted-foreground hover:text-foreground"><Settings className="w-3 h-3" /></button>
                        <button onClick={() => deleteMut.mutate(ev.id)} className="text-muted-foreground hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events (if no date selected) */}
        {!selectedDate && events.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Upcoming</p>
            <div className="space-y-1.5">
              {events
                .filter(e => new Date(e.startAt) >= new Date())
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                .slice(0, 3)
                .map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(ev.startAt), "MMM d")}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Event dialog */}
      <Dialog open={eventOpen} onOpenChange={(o) => { setEventOpen(o); if (!o) setEditEvent(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editEvent ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium">Title *</label>
              <Input data-testid="input-event-title" className="mt-1" placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea data-testid="input-event-description" className="mt-1" rows={2} value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allday" checked={eventForm.allDay} onChange={(e) => setEventForm((f) => ({ ...f, allDay: e.target.checked }))} className="rounded" />
              <label htmlFor="allday" className="text-xs">All day</label>
            </div>
            <div>
              <label className="text-xs font-medium">Start</label>
              <input data-testid="input-event-start" type={eventForm.allDay ? "date" : "datetime-local"} className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} />
            </div>
            {!eventForm.allDay && (
              <div>
                <label className="text-xs font-medium">End (optional)</label>
                <input type="datetime-local" className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} />
              </div>
            )}
            <Button data-testid="button-save-event" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={!eventForm.title.trim() || !eventForm.startAt || createMut.isPending || updateMut.isPending}
              onClick={() => editEvent ? updateMut.mutate({ id: editEvent.id, ...eventForm }) : createMut.mutate(eventForm)}>
              {createMut.isPending || updateMut.isPending ? "Saving…" : "Save Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MEMBERS SIDEBAR ──────────────────────────────────────────────────────────
function MembersSidebar({ groupId, isAdmin, inviteCode }: { groupId: number; isAdmin: boolean; inviteCode: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ userId: number; displayName: string | null; avatarUrl: string | null; username: string | null; email: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [msgTarget, setMsgTarget] = useState<Member | null>(null);
  const [msgText, setMsgText] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/groups", groupId, "members"] });

  const inviteMut = useMutation({
    mutationFn: (inviteeUserId: number) => apiRequest("POST", `/api/groups/${groupId}/invite`, { inviteeUserId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] }); toast({ title: "Invite sent!" }); setSearch(""); setSearchResults([]); },
    onError: (e: any) => toast({ title: "Could not invite", description: e.message, variant: "destructive" }),
  });

  const emailInviteMut = useMutation({
    mutationFn: (email: string) => apiRequest("POST", `/api/groups/${groupId}/invite/email`, { email }),
    onSuccess: (data: any) => {
      if (data.registered) {
        toast({ title: "Invite sent!", description: "This user is on Gigzito — they've been invited and notified." });
      } else {
        toast({ title: "Email invite sent!", description: "They'll receive an email with a link to join Gigzito and the group." });
      }
      setSearch(""); setSearchResults([]);
    },
    onError: (e: any) => toast({ title: "Could not send email invite", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (uid: number) => apiRequest("DELETE", `/api/groups/${groupId}/members/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] }),
  });

  const postMut = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/groups/${groupId}/wall`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "wall"] }); setMsgTarget(null); setMsgText(""); toast({ title: "Message posted to wall!" }); },
    onError: () => toast({ title: "Failed to post message", variant: "destructive" }),
  });

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (v.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/groups/search-users?q=${encodeURIComponent(v)}&groupId=${groupId}`, { credentials: "include" });
        setSearchResults(await res.json());
      } finally { setSearching(false); }
    }, 300);
  };

  const copyCode = () => { navigator.clipboard.writeText(inviteCode); toast({ title: "Invite code copied!" }); };

  const accepted = members.filter((m) => m.status === "accepted");
  const pending = members.filter((m) => m.status === "pending");

  const sendMsg = () => {
    if (!msgTarget || !msgText.trim()) return;
    const name = msgTarget.displayName ?? msgTarget.username ?? "member";
    postMut.mutate(`@${name}: ${msgText.trim()}`);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-sm">Members ({accepted.length})</h3>
        </div>

        {/* Invite search (admin only) */}
        {isAdmin && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input data-testid="input-invite-search" placeholder="Invite by name / email…" className="pl-8 h-8 text-xs" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
            </div>
            {searching && <p className="text-[10px] text-muted-foreground">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map((u) => (
                  <div key={u.userId} data-testid={`search-result-${u.userId}`} className="flex items-center gap-2 px-2.5 py-1.5">
                    <Avatar src={u.avatarUrl} name={u.displayName ?? u.email} size={6} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-none">{u.displayName ?? u.username ?? "User"}</p>
                    </div>
                    <Button data-testid={`button-invite-${u.userId}`} size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => inviteMut.mutate(u.userId)}>
                      <UserPlus className="w-3 h-3 mr-0.5" /> Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* Email invite fallback — show when no users found and search looks like an email */}
            {!searching && search.length > 3 && search.includes("@") && searchResults.length === 0 && (
              <div className="border rounded-lg px-2.5 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-none truncate">{search}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Not on Gigzito yet — send an email invite</p>
                </div>
                <Button
                  data-testid="button-email-invite"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => emailInviteMut.mutate(search)}
                  disabled={emailInviteMut.isPending}
                >
                  <UserPlus className="w-3 h-3 mr-0.5" /> {emailInviteMut.isPending ? "Sending…" : "Email Invite"}
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-mono">{inviteCode}</span>
              <button data-testid="button-copy-code" onClick={copyCode} className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {/* Pending members */}
        {pending.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">Pending ({pending.length})</p>
            {pending.map((m) => (
              <div key={m.id} data-testid={`member-pending-${m.userId}`} className="flex items-center gap-2">
                <Avatar src={m.avatarUrl} name={m.displayName} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-none truncate">{m.displayName ?? m.username ?? "User"}</p>
                  <p className="text-[10px] text-amber-500">Pending</p>
                </div>
                {isAdmin && (
                  <button data-testid={`button-remove-pending-${m.userId}`} onClick={() => removeMut.mutate(m.userId)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="border-t my-1" />
          </>
        )}

        {/* Active members */}
        {accepted.map((m) => (
          <div key={m.id} data-testid={`member-card-${m.userId}`} className="flex items-center gap-2 group">
            <Avatar src={m.avatarUrl} name={m.displayName} size={7} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-none truncate">{m.displayName ?? m.username ?? "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{m.role === "admin" ? "Admin" : "Member"}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                data-testid={`button-message-${m.userId}`}
                onClick={() => { setMsgTarget(m); setMsgText(""); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Send message"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
              {isAdmin && m.role !== "admin" && (
                <button data-testid={`button-remove-member-${m.userId}`} onClick={() => removeMut.mutate(m.userId)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {accepted.length === 0 && <p className="text-xs text-muted-foreground text-center py-2 italic">No members yet</p>}
      </div>

      {/* Message dialog */}
      <Dialog open={!!msgTarget} onOpenChange={(o) => { if (!o) setMsgTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar src={msgTarget?.avatarUrl} name={msgTarget?.displayName} size={7} />
              Message {msgTarget?.displayName ?? msgTarget?.username ?? "member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">Your message will be posted to the group wall mentioning this member.</p>
            <Textarea
              data-testid="input-member-message"
              placeholder={`Write a message…`}
              rows={3}
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              className="resize-none"
              autoFocus
            />
            <Button
              data-testid="button-send-member-message"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={!msgText.trim() || postMut.isPending}
              onClick={sendMsg}
            >
              <Send className="w-4 h-4 mr-2" />
              {postMut.isPending ? "Sending…" : "Post to Wall"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ENDEAVORS ────────────────────────────────────────────────────────────────
function EndeavorsTab({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [pendingProgress, setPendingProgress] = useState<Record<number, number>>({});
  const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const { data: endeavors = [], isLoading } = useQuery<Endeavor[]>({ queryKey: ["/api/groups", groupId, "endeavors"] });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => apiRequest("POST", `/api/groups/${groupId}/endeavors`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "endeavors"] }); setAddOpen(false); setForm({ title: "", description: "" }); },
    onError: () => toast({ title: "Failed to add endeavor", variant: "destructive" }),
  });

  const progressMut = useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) => apiRequest("PATCH", `/api/groups/${groupId}/endeavors/${id}`, { goalProgress: progress }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "endeavors"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/groups/${groupId}/endeavors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "endeavors"] }),
  });

  const handleProgress = (id: number, value: number) => {
    setPendingProgress((prev) => ({ ...prev, [id]: value }));
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(() => progressMut.mutate({ id, progress: value }), 600);
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button data-testid="button-add-endeavor" className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Endeavor
        </Button>
      )}

      {isLoading ? <div className="h-32 bg-muted animate-pulse rounded-xl" /> : endeavors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No endeavors yet. {isAdmin ? "Add one to track group goals." : "Admins can add endeavors here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endeavors.map((end) => {
            const progress = pendingProgress[end.id] ?? end.goalProgress;
            return (
              <div key={end.id} data-testid={`endeavor-card-${end.id}`} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{end.title}</h3>
                    {end.description && <p className="text-xs text-muted-foreground mt-0.5">{end.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-lg font-bold ${progress >= 100 ? "text-green-500" : progress >= 50 ? "text-amber-500" : "text-red-500"}`}>{progress}%</span>
                    {isAdmin && (
                      <button data-testid={`button-delete-endeavor-${end.id}`} onClick={() => deleteMut.mutate(end.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {isAdmin ? (
                  <Slider data-testid={`slider-endeavor-${end.id}`} min={0} max={100} step={1} value={[progress]} onValueChange={([v]) => handleProgress(end.id, v)} className="mt-3" />
                ) : (
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                )}
                {progress >= 100 && <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold">🎉 Goal achieved!</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Endeavor</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium">Title *</label>
              <Input data-testid="input-endeavor-title" className="mt-1" placeholder="e.g. Launch our website" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea data-testid="input-endeavor-description" className="mt-1" rows={2} placeholder="What does success look like?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <Button data-testid="button-submit-endeavor" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={!form.title.trim() || createMut.isPending} onClick={() => createMut.mutate(form)}>
              {createMut.isPending ? "Adding…" : "Add Endeavor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── KANBAN TAB ───────────────────────────────────────────────────────────────
type KanbanCard = { id: number; groupId: number; title: string; description: string | null; status: string; position: number; createdBy: number; createdAt: string };

const KANBAN_COLS: { key: string; label: string; color: string; icon: JSX.Element }[] = [
  { key: "todo",        label: "To Do",      color: "border-zinc-400",  icon: <Clock className="w-3.5 h-3.5 text-zinc-400" /> },
  { key: "in_progress", label: "In Progress", color: "border-amber-400", icon: <ArrowRight className="w-3.5 h-3.5 text-amber-400" /> },
  { key: "done",        label: "Done",       color: "border-green-500", icon: <CheckSquare className="w-3.5 h-3.5 text-green-500" /> },
];

function KanbanTab({ groupId, isAdmin, myUserId }: { groupId: number; isAdmin: boolean; myUserId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: cards = [], isLoading } = useQuery<KanbanCard[]>({ queryKey: ["/api/groups", groupId, "kanban"] });

  const createMut = useMutation({
    mutationFn: (d: { title: string; description: string; status: string }) =>
      apiRequest("POST", `/api/groups/${groupId}/kanban`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "kanban"] }); setAddingCol(null); setNewTitle(""); setNewDesc(""); },
    onError: () => toast({ title: "Failed to create card", variant: "destructive" }),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/groups/${groupId}/kanban/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "kanban"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/groups/${groupId}/kanban/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "kanban"] }),
  });

  const colKeys = KANBAN_COLS.map((c) => c.key);
  if (isLoading) return <div className="h-40 animate-pulse bg-muted rounded-xl" />;

  return (
    <div className="pb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {KANBAN_COLS.map((col, ci) => {
          const colCards = cards.filter((c) => c.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border-t-2 ${col.color} bg-muted/30 p-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  {col.icon} {col.label}
                  <span className="ml-1 text-xs text-muted-foreground font-normal">({colCards.length})</span>
                </div>
                <button data-testid={`button-add-card-${col.key}`} onClick={() => { setAddingCol(col.key); setNewTitle(""); setNewDesc(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {addingCol === col.key && (
                <div className="bg-card border rounded-lg p-2 flex flex-col gap-2">
                  <Input data-testid="input-kanban-title" autoFocus placeholder="Card title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="text-sm h-8" />
                  <Textarea data-testid="input-kanban-desc" placeholder="Description (optional)" rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="text-xs resize-none" />
                  <div className="flex gap-1.5">
                    <Button data-testid="button-save-kanban-card" size="sm" className="flex-1 h-7 text-xs bg-red-600 hover:bg-red-700 text-white" disabled={!newTitle.trim() || createMut.isPending} onClick={() => createMut.mutate({ title: newTitle, description: newDesc, status: col.key })}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingCol(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {colCards.map((card) => (
                <div key={card.id} data-testid={`kanban-card-${card.id}`} className="bg-card border rounded-lg p-2.5 shadow-sm group">
                  <p className="text-sm font-medium leading-snug">{card.title}</p>
                  {card.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.description}</p>}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ci > 0 && (
                      <button data-testid={`button-move-card-back-${card.id}`} onClick={() => moveMut.mutate({ id: card.id, status: colKeys[ci - 1] })} className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:border-foreground transition-colors">← Back</button>
                    )}
                    {ci < KANBAN_COLS.length - 1 && (
                      <button data-testid={`button-move-card-forward-${card.id}`} onClick={() => moveMut.mutate({ id: card.id, status: colKeys[ci + 1] })} className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:border-foreground transition-colors">Next →</button>
                    )}
                    {(isAdmin || card.createdBy === myUserId) && (
                      <button data-testid={`button-delete-card-${card.id}`} onClick={() => deleteMut.mutate(card.id)} className="ml-auto text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {colCards.length === 0 && addingCol !== col.key && (
                <p className="text-xs text-muted-foreground text-center py-4 italic">No cards yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CONTRIBUTION ROW ─────────────────────────────────────────────────────────
type Contribution = { id: number; walletId: number; userId: number; amount: number; currency: string; txHash: string | null; note: string | null; displayName: string | null; avatarUrl: string | null; verified: boolean; createdAt: string };

function WalletContributions({ groupId, wallet, isAdmin }: { groupId: number; wallet: GroupWallet; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const defaultCurrency = wallet.network === "BTC" ? "BTC" : ["USDT","USDC"].includes(wallet.network) ? wallet.network : wallet.network;
  const [fundForm, setFundForm] = useState({ amount: "", currency: defaultCurrency, txHash: "", note: "" });
  const [goalForm, setGoalForm] = useState({ goalAmount: wallet.goalAmount?.toString() ?? "", goalCurrency: wallet.goalCurrency ?? defaultCurrency, goalLabel: wallet.goalLabel ?? "" });

  const { data: contribs = [], isLoading } = useQuery<Contribution[]>({
    queryKey: ["/api/groups", groupId, "wallets", wallet.id, "contributions"],
    queryFn: () => fetch(`/api/groups/${groupId}/wallets/${wallet.id}/contributions`, { credentials: "include" }).then((r) => r.ok ? r.json() : []),
  });

  const fundMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", `/api/groups/${groupId}/wallets/${wallet.id}/contributions`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "wallets", wallet.id, "contributions"] });
      setFundOpen(false);
      setFundForm((f) => ({ ...f, amount: "", txHash: "", note: "" }));
      toast({ title: "Contribution logged!", description: fundForm.txHash ? "We'll attempt on-chain verification automatically." : "Logged — add a tx hash to get it ✓ Verified." });
    },
    onError: () => toast({ title: "Failed to log contribution", variant: "destructive" }),
  });

  const goalMut = useMutation({
    mutationFn: (body: object) => apiRequest("PUT", `/api/groups/${groupId}/wallets/${wallet.id}/goal`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "wallets"] });
      setGoalOpen(false);
      toast({ title: "Funding goal updated!" });
    },
    onError: () => toast({ title: "Failed to set goal", variant: "destructive" }),
  });

  const verifyMut = useMutation({
    mutationFn: (cid: number) => apiRequest("PATCH", `/api/groups/${groupId}/wallets/${wallet.id}/contributions/${cid}/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "wallets", wallet.id, "contributions"] });
      toast({ title: "Contribution verified!" });
    },
    onError: () => toast({ title: "Failed to verify", variant: "destructive" }),
  });

  const total = contribs.reduce((s, c) => s + c.amount, 0);
  const currency = contribs[0]?.currency ?? defaultCurrency;
  const goalAmt = wallet.goalAmount ?? 0;
  const goalPct = goalAmt > 0 ? Math.min(100, (total / goalAmt) * 100) : 0;

  // Aggregate leaderboard: group by userId, sum amounts
  const leaderMap = new Map<number, { displayName: string | null; avatarUrl: string | null; total: number; verifiedTotal: number; latest: Contribution }>();
  for (const c of contribs) {
    const entry = leaderMap.get(c.userId);
    if (!entry) {
      leaderMap.set(c.userId, { displayName: c.displayName, avatarUrl: c.avatarUrl, total: c.amount, verifiedTotal: c.verified ? c.amount : 0, latest: c });
    } else {
      entry.total += c.amount;
      if (c.verified) entry.verifiedTotal += c.amount;
    }
  }
  const leaderboard = [...leaderMap.entries()].map(([uid, d]) => ({ uid, ...d })).sort((a, b) => b.total - a.total);

  const explorerTxUrl = (hash: string) => networkInfo(wallet.network).explorer(hash);

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {/* Goal progress bar */}
      {(wallet.goalAmount && wallet.goalAmount > 0) ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              <Target className="w-3 h-3 text-indigo-500" />
              {wallet.goalLabel || "Funding Goal"}
            </span>
            <span className="text-muted-foreground">
              {total.toLocaleString(undefined, { maximumFractionDigits: 6 })} / {wallet.goalAmount.toLocaleString()} {wallet.goalCurrency ?? currency}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground text-right">{goalPct.toFixed(0)}% funded</p>
        </div>
      ) : null}

      {/* Contributor toggle + Log button */}
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Trophy className="w-3.5 h-3.5" />
          <span>
            {contribs.length > 0
              ? `${leaderboard.length} contributor${leaderboard.length !== 1 ? "s" : ""} · ${total.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${currency}`
              : "No contributions yet"}
          </span>
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button data-testid={`button-set-goal-${wallet.id}`} size="sm" variant="outline"
              className="h-6 text-xs px-2 gap-1 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
              onClick={() => setGoalOpen(true)}>
              <Target className="w-3 h-3" /> Goal
            </Button>
          )}
          <Button data-testid={`button-fund-wallet-${wallet.id}`} size="sm" variant="outline"
            className="h-6 text-xs px-2 gap-1 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
            onClick={() => setFundOpen(true)}>
            <CircleDollarSign className="w-3 h-3" /> Log Contribution
          </Button>
        </div>
      </div>

      {/* Leaderboard */}
      {open && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="h-8 bg-muted animate-pulse rounded" />
          ) : leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">Be the first to log a contribution.</p>
          ) : (
            leaderboard.map((entry, idx) => (
              <div key={entry.uid} className="flex items-center gap-2 py-1.5 border-b border-dashed last:border-0">
                <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">#{idx + 1}</span>
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {entry.avatarUrl
                    ? <img src={entry.avatarUrl} alt={entry.displayName ?? ""} className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-indigo-600">{(entry.displayName ?? "M")[0].toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{entry.displayName ?? "Member"}</p>
                  {/* Individual tx rows */}
                  {contribs.filter((c) => c.userId === entry.uid).map((c) => (
                    <div key={c.id} className="flex items-center gap-1 mt-0.5">
                      {c.verified
                        ? <ShieldCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                        : <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                      <span className="text-[10px] text-muted-foreground">
                        {c.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {c.currency}
                        {c.verified ? " · ✓ Verified" : " · Pending verification"}
                      </span>
                      {c.txHash && (
                        <a href={explorerTxUrl(c.txHash)} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-500 hover:underline inline-flex items-center gap-0.5 text-[10px]">
                          <ExternalLink className="w-2.5 h-2.5" /> tx
                        </a>
                      )}
                      {isAdmin && !c.verified && (
                        <button onClick={() => verifyMut.mutate(c.id)}
                          className="text-[10px] text-green-600 hover:underline ml-1">
                          Verify
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                  +{entry.total.toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
                </span>
              </div>
            ))
          )}
          {leaderboard.length > 0 && (
            <div className="flex justify-between text-xs font-bold pt-1 border-t">
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Total Raised</span>
              <span className="text-green-600 dark:text-green-400">{total.toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}</span>
            </div>
          )}
        </div>
      )}

      {/* Log Contribution dialog */}
      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-indigo-500" /> Log Contribution — {wallet.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
              <p className="font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> How this works:</p>
              <p>1. Send crypto from <strong>your own wallet</strong> to the group address below.</p>
              <p>2. Paste your transaction hash here — Gigzito will verify it on-chain automatically for ETH-based transactions.</p>
              <p>3. Your contribution appears on the group leaderboard with a ✓ Verified badge.</p>
              <a href={networkInfo(wallet.network).explorer(wallet.address)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline mt-1">
                <ExternalLink className="w-3 h-3" /> View wallet address on explorer →
              </a>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</label>
                <Input data-testid="input-contrib-amount" type="number" min="0" step="any" placeholder="0.00" className="mt-1"
                  value={fundForm.amount} onChange={(e) => setFundForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currency</label>
                <Input data-testid="input-contrib-currency" placeholder="ETH" className="mt-1 uppercase"
                  value={fundForm.currency} onChange={(e) => setFundForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Transaction Hash <span className="font-normal normal-case text-indigo-600">(paste for on-chain verification)</span>
              </label>
              <Input data-testid="input-contrib-txhash" placeholder="0x… or blockchain tx ID" className="mt-1 font-mono text-xs"
                value={fundForm.txHash} onChange={(e) => setFundForm((f) => ({ ...f, txHash: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Note <span className="font-normal normal-case">(optional)</span></label>
              <Input data-testid="input-contrib-note" placeholder="e.g. Monthly pledge, event fund…" className="mt-1"
                value={fundForm.note} onChange={(e) => setFundForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <Button data-testid="button-log-contribution" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              disabled={!fundForm.amount || isNaN(Number(fundForm.amount)) || Number(fundForm.amount) <= 0 || fundMut.isPending}
              onClick={() => fundMut.mutate({ amount: Number(fundForm.amount), currency: fundForm.currency, txHash: fundForm.txHash || undefined, note: fundForm.note || undefined })}>
              <ShieldCheck className="w-4 h-4" />
              {fundMut.isPending ? "Logging & verifying…" : "Submit Contribution"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Goal dialog (admin only) */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" /> Set Funding Goal — {wallet.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground">
              Set a target amount for this wallet. Members will see a progress bar showing how close the group is to reaching it.
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal Label</label>
              <Input data-testid="input-goal-label" placeholder="e.g. Annual retreat fund, Equipment purchase…" className="mt-1"
                value={goalForm.goalLabel} onChange={(e) => setGoalForm((f) => ({ ...f, goalLabel: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Amount</label>
                <Input data-testid="input-goal-amount" type="number" min="0" step="any" placeholder="0.00" className="mt-1"
                  value={goalForm.goalAmount} onChange={(e) => setGoalForm((f) => ({ ...f, goalAmount: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currency</label>
                <Input data-testid="input-goal-currency" className="mt-1 uppercase"
                  value={goalForm.goalCurrency} onChange={(e) => setGoalForm((f) => ({ ...f, goalCurrency: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setGoalForm({ goalAmount: "", goalCurrency: defaultCurrency, goalLabel: "" });
                goalMut.mutate({ goalAmount: null, goalCurrency: null, goalLabel: null });
              }}>
                Clear Goal
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!goalForm.goalAmount || isNaN(Number(goalForm.goalAmount)) || goalMut.isPending}
                onClick={() => goalMut.mutate({ goalAmount: Number(goalForm.goalAmount), goalCurrency: goalForm.goalCurrency, goalLabel: goalForm.goalLabel || null })}>
                {goalMut.isPending ? "Saving…" : "Save Goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── WALLET TAB ───────────────────────────────────────────────────────────────
function WalletTab({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ label: "", network: "ETH", address: "", link: "" });
  const [mmConnecting, setMmConnecting] = useState(false);

  const { data: wallets = [], isLoading } = useQuery<GroupWallet[]>({
    queryKey: ["/api/groups", groupId, "wallets"],
    queryFn: () => fetch(`/api/groups/${groupId}/wallets`, { credentials: "include" }).then((r) => r.ok ? r.json() : []),
  });

  const addMut = useMutation({
    mutationFn: (body: { label: string; network: string; address: string; link?: string }) =>
      apiRequest("POST", `/api/groups/${groupId}/wallets`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "wallets"] });
      setAddOpen(false);
      setForm({ label: "", network: "ETH", address: "", link: "" });
      toast({ title: "Wallet added" });
    },
    onError: () => toast({ title: "Failed to add wallet", variant: "destructive" }),
  });

  const delMut = useMutation({
    mutationFn: (wid: number) => apiRequest("DELETE", `/api/groups/${groupId}/wallets/${wid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "wallets"] });
      toast({ title: "Wallet removed" });
    },
    onError: () => toast({ title: "Failed to remove wallet", variant: "destructive" }),
  });

  async function connectMetaMask() {
    const eth = (window as any).ethereum;
    if (!eth) {
      toast({ title: "MetaMask not detected", description: "Install the MetaMask browser extension first.", variant: "destructive" });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    setMmConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) {
        setForm((f) => ({ ...f, address: accounts[0], network: "ETH", label: f.label || "MetaMask Wallet" }));
        toast({ title: "MetaMask connected!", description: accounts[0].slice(0, 10) + "…" });
      }
    } catch {
      toast({ title: "MetaMask connection cancelled", variant: "destructive" });
    } finally {
      setMmConnecting(false);
    }
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr).then(() => toast({ title: "Address copied!" }));
  }

  function explorerUrl(w: GroupWallet) {
    if (w.link) return w.link;
    const net = networkInfo(w.network);
    return net.explorer(w.address);
  }

  const [tutorialOpen, setTutorialOpen] = useState(true);

  return (
    <div className="space-y-4">

      {/* ── Value Realized Tutorial ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-900/40 bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-900 dark:to-black overflow-hidden shadow-lg shadow-black/30">
        <button
          data-testid="button-toggle-tutorial"
          onClick={() => setTutorialOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-red-400" />
            <span className="font-bold text-sm text-white tracking-wide">Group Wallet — How It Works & Safety Guide</span>
          </div>
          {tutorialOpen
            ? <ChevronUp className="w-4 h-4 text-red-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-red-400 flex-shrink-0" />}
        </button>

        {tutorialOpen && (
          <div className="px-4 pb-5 space-y-4 border-t border-white/10">

            {/* Mastermind Principle banner */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-red-950/80 to-red-900/50 border border-red-700/50 p-4">
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-red-300 leading-snug">
                    Built on the Mastermind Principle
                  </p>
                  <p className="text-xs text-red-200/80 leading-relaxed">
                    The Group Wallet is reserved for the <strong className="text-red-200">strongest of bonds</strong> — members who operate in a true <em>spirit of harmony</em>, united around a shared financial vision. This is not for casual groups. This is for those who hold each other accountable.
                  </p>
                  <a
                    href="https://www.youtube.com/watch?v=XMzu0ZzyIFo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-red-200 underline underline-offset-2 transition-colors mt-0.5"
                    data-testid="link-mastermind-principle"
                  >
                    <ArrowRight className="w-3 h-3" /> Watch: The Mastermind Principle
                  </a>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              The Group Wallet is a <strong className="text-zinc-200">self-custodial contribution tracker</strong>. Gigzito never holds or touches your funds — all crypto flows directly between member wallets and the group's registered addresses.
            </p>

            {/* Steps */}
            <div className="grid sm:grid-cols-3 gap-2.5">
              {[
                {
                  step: "1",
                  icon: <Wallet className="w-4 h-4 text-red-400" />,
                  title: "Admin registers a wallet",
                  body: "The group admin adds a real on-chain address (ETH, BTC, SOL, USDC…). Only the admin controls that wallet — Gigzito has zero access.",
                  border: "border-red-800/40",
                },
                {
                  step: "2",
                  icon: <CircleDollarSign className="w-4 h-4 text-orange-400" />,
                  title: "Members send directly",
                  body: "Open MetaMask, Phantom, or Coinbase Wallet — copy the group address and send. Funds go straight on-chain, no middleman.",
                  border: "border-orange-800/40",
                },
                {
                  step: "3",
                  icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
                  title: "Log tx hash → get Verified",
                  body: "Paste your transaction ID here. Gigzito checks Etherscan to confirm the tx. You earn a ✓ Verified badge on the leaderboard.",
                  border: "border-emerald-800/40",
                },
              ].map((s) => (
                <div key={s.step} className={`rounded-xl p-3 bg-white/5 border ${s.border} space-y-1.5`}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-900/60 flex items-center justify-center text-[10px] font-bold text-red-300 flex-shrink-0">{s.step}</span>
                    {s.icon}
                    <span className="text-xs font-bold text-white">{s.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>

            {/* Safety guarantees */}
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-3 space-y-1.5">
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Safety Guarantees
              </p>
              {[
                "Gigzito never holds any funds — zero custody risk, zero liability.",
                "All contributions are public on the blockchain — full transparency, anyone can verify.",
                "Supports Gnosis Safe (multisig) — admin can use a wallet requiring multiple officer approvals before any funds move.",
                "Admins can manually verify any contribution. Unverified entries are marked clearly so members can see what's confirmed.",
                "The group wallet address is read-only on Gigzito — it can never be changed by the platform.",
              ].map((item, i) => (
                <p key={i} className="text-xs text-emerald-300/80 flex items-start gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400" /> {item}
                </p>
              ))}
            </div>

            <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4" /> Pro Tip: Use a Gnosis Safe for Group Treasuries
              </p>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                For serious group funds, set up a free <strong className="text-amber-300">Gnosis Safe</strong> at{" "}
                <a href="https://safe.global" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-amber-300 hover:text-amber-200">safe.global</a>.
                It requires M-of-N group officers to sign any outgoing transaction — no single person can drain the treasury.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500" /> Group Wallet</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Crypto addresses · member contributions tracked on-chain</p>
        </div>
        {isAdmin && (
          <Button data-testid="button-add-wallet" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Wallet
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No wallets linked yet.</p>
          {isAdmin && <p className="text-xs mt-1">Click "Add Wallet" to attach a crypto address.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((w) => {
            const net = networkInfo(w.network);
            const shortAddr = w.address.length > 16 ? `${w.address.slice(0, 8)}…${w.address.slice(-6)}` : w.address;
            const url = explorerUrl(w);
            return (
              <div key={w.id} data-testid={`card-wallet-${w.id}`}
                className="border rounded-xl p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${net.color}`}>
                    {net.value.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{w.label}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{net.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground break-all">{shortAddr}</code>
                      <button data-testid={`button-copy-wallet-${w.id}`} onClick={() => copyAddress(w.address)} title="Copy full address"
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`link-explorer-${w.id}`}
                          title="View on block explorer" className="text-muted-foreground hover:text-indigo-500 transition-colors flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {w.link && (
                      <a href={w.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-500 hover:underline mt-1">
                        <Link2 className="w-3 h-3" /> {w.link.length > 40 ? w.link.slice(0, 40) + "…" : w.link}
                      </a>
                    )}
                  </div>
                  {isAdmin && (
                    <button data-testid={`button-delete-wallet-${w.id}`} onClick={() => { if (confirm("Remove this wallet?")) delMut.mutate(w.id); }}
                      disabled={delMut.isPending}
                      className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <WalletContributions groupId={groupId} wallet={w} isAdmin={isAdmin} />
              </div>
            );
          })}
        </div>
      )}

      {/* Add wallet dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Add Wallet</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            {/* MetaMask quick connect */}
            <button data-testid="button-connect-metamask"
              onClick={connectMetaMask} disabled={mmConnecting}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg py-2.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors disabled:opacity-60">
              <span className="text-base">🦊</span>
              {mmConnecting ? "Connecting…" : "Connect MetaMask to auto-fill"}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> or fill in manually <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Label</label>
              <Input data-testid="input-wallet-label" placeholder="e.g. Main Treasury" className="mt-1"
                value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Network</label>
              <select data-testid="select-wallet-network" value={form.network}
                onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label} ({n.value})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet Address</label>
              <Input data-testid="input-wallet-address" placeholder="0x… or bc1… or custom" className="mt-1 font-mono text-sm"
                value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Link <span className="font-normal normal-case">(optional)</span></label>
              <Input data-testid="input-wallet-link" placeholder="https://…" className="mt-1"
                value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-0.5">Overrides the auto block-explorer link</p>
            </div>
            <Button data-testid="button-save-wallet" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!form.label.trim() || !form.address.trim() || addMut.isPending}
              onClick={() => addMut.mutate({ label: form.label.trim(), network: form.network, address: form.address.trim(), link: form.link.trim() || undefined })}>
              {addMut.isPending ? "Adding…" : "Add Wallet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id ?? "0");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<MainTab>("wall");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", isPrivate: true });
  const [bannerUploading, setBannerUploading] = useState(false);

  const myUserId = user?.user?.id ?? 0;

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId && !!user,
    retry: false,
  });

  const isAdmin = group?.myRole === "admin";
  const isMember = group?.myStatus === "accepted";

  const updateMut = useMutation({
    mutationFn: (d: Partial<typeof editForm> & { coverUrl?: string }) => apiRequest("PATCH", `/api/groups/${groupId}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId] }); setEditOpen(false); toast({ title: "Group updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/groups/${groupId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups"] }); navigate("/groups"); toast({ title: "Group deleted" }); },
  });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      updateMut.mutate({ coverUrl: url });
    } catch {
      toast({ title: "Failed to upload banner", variant: "destructive" });
    } finally {
      setBannerUploading(false);
      const inp = document.getElementById("banner-upload") as HTMLInputElement | null;
      if (inp) inp.value = "";
    }
  };

  const openEdit = () => {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description, isPrivate: group.isPrivate });
    setEditOpen(true);
  };

  const tabConfig: Record<MainTab, { label: string; icon: JSX.Element }> = {
    wall: { label: "Home", icon: <MessageSquare className="w-4 h-4" /> },
    endeavors: { label: "Endeavors", icon: <Target className="w-4 h-4" /> },
    kanban: { label: "Kanban", icon: <KanbanSquare className="w-4 h-4" /> },
    wallet: { label: "Wallet", icon: <Wallet className="w-4 h-4" /> },
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Please log in.</p></div>;

  if (isLoading) return (
    <div className="min-h-screen pt-16">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-48 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!group) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Group not found or you don't have access.</p>
      <Button variant="outline" onClick={() => navigate("/groups")}><ChevronLeft className="w-4 h-4 mr-1" /> Back to Groups</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16 pb-12">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Back to Gigzito ── */}
        <div className="pt-4 pb-2">
          <button
            data-testid="button-group-detail-home"
            onClick={() => navigate("/")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em", border: "none" }}
          >
            <ArrowLeft size={14} />
            Back to Gigzito
          </button>
        </div>

        {/* ── BANNER ─────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-5 bg-gradient-to-br from-red-600 to-red-900 group/banner" style={{ height: 200 }}>
          {group.coverUrl && <img src={group.coverUrl} alt={group.name} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Admin: hover overlay to upload banner */}
          {isAdmin && (
            <>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleBannerUpload}
              />
              <label
                htmlFor="banner-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer z-10"
              >
                {bannerUploading ? (
                  <div className="text-white text-sm font-medium">Uploading…</div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">Change Banner Photo</span>
                  </div>
                )}
              </label>
            </>
          )}

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {group.isPrivate ? <Lock className="w-3.5 h-3.5 text-white/70" /> : <Globe className="w-3.5 h-3.5 text-white/70" />}
                  {isAdmin && <Badge className="bg-red-500/80 text-white text-xs border-0">Admin</Badge>}
                </div>
                <h1 className="text-white text-2xl font-bold leading-tight">{group.name}</h1>
                {group.description && <p className="text-white/70 text-sm mt-0.5 line-clamp-1">{group.description}</p>}
                <p className="text-white/60 text-xs mt-0.5">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</p>
              </div>
              <div className="flex gap-2">
                <button data-testid="button-back" onClick={() => navigate("/groups")} className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button data-testid="button-edit-group" onClick={openEdit} className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT GRID ────────────────────────────── */}
        {!isMember ? (
          <div className="text-center py-16 text-muted-foreground">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">You need to accept your invite to view group content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

            {/* Left: tabs + content */}
            <div>
              <div className="flex gap-0.5 border-b mb-4">
                {MAIN_TABS.map((t) => (
                  <button
                    key={t}
                    data-testid={`tab-${t}`}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === t ? "border-red-500 text-red-600 dark:text-red-400" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tabConfig[t].icon}
                    {tabConfig[t].label}
                  </button>
                ))}
              </div>

              {tab === "wall" && <WallTab groupId={groupId} isAdmin={isAdmin} myUserId={myUserId} />}
              {tab === "endeavors" && <EndeavorsTab groupId={groupId} isAdmin={isAdmin} />}
              {tab === "kanban" && <KanbanTab groupId={groupId} isAdmin={isAdmin} myUserId={myUserId} />}
              {tab === "wallet" && <WalletTab groupId={groupId} isAdmin={isAdmin} />}
            </div>

            {/* Right: sidebar */}
            <div className="space-y-4 lg:sticky lg:top-20">
              <CalendarSidebar groupId={groupId} isAdmin={isAdmin} />
              <MembersSidebar groupId={groupId} isAdmin={isAdmin} inviteCode={group.inviteCode} />
            </div>
          </div>
        )}
      </div>

      {/* Edit group dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Group</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <Input data-testid="input-edit-group-name" className="mt-1" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea data-testid="input-edit-group-description" className="mt-1" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="private-toggle" checked={editForm.isPrivate} onChange={(e) => setEditForm((f) => ({ ...f, isPrivate: e.target.checked }))} className="rounded" />
              <label htmlFor="private-toggle" className="text-sm">Private group</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button data-testid="button-save-group" className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={!editForm.name.trim() || updateMut.isPending} onClick={() => updateMut.mutate(editForm)}>
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Button data-testid="button-delete-group" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" disabled={deleteMut.isPending}
                onClick={() => { if (confirm("Delete this group? This cannot be undone.")) deleteMut.mutate(); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
