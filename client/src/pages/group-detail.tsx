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
  Send, ChevronLeft as PrevMonth, ChevronRight as NextMonth, UserPlus, X, Search, Copy, Settings
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from "date-fns";

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

const TABS = ["wall", "calendar", "endeavors", "members"] as const;
type Tab = typeof TABS[number];

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

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function CalendarTab({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", description: "", startAt: "", endAt: "", allDay: false });

  const { data: events = [] } = useQuery<Event[]>({ queryKey: ["/api/groups", groupId, "events"] });

  const createMut = useMutation({
    mutationFn: (d: typeof eventForm) => apiRequest("POST", `/api/groups/${groupId}/events`, { ...d, startAt: d.startAt, endAt: d.endAt || undefined }),
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
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-muted transition-colors"><PrevMonth className="w-5 h-5" /></button>
          <h3 className="font-semibold">{format(month, "MMMM yyyy")}</h3>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-muted transition-colors"><NextMonth className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-0 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const hasEvents = eventsOnDay(day).length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`relative flex flex-col items-center rounded-lg py-1.5 text-sm transition-colors ${
                  isSelected ? "bg-red-600 text-white" :
                  isToday ? "bg-red-50 dark:bg-red-950/40 text-red-600 font-bold" :
                  "hover:bg-muted"
                }`}
              >
                {format(day, "d")}
                {hasEvents && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-red-500"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{format(selectedDate, "EEEE, MMMM d")}</h3>
            {isAdmin && (
              <Button data-testid="button-add-event" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openCreate(selectedDate)}>
                <Plus className="w-3 h-3" /> Add Event
              </Button>
            )}
          </div>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((ev) => (
                <div key={ev.id} data-testid={`event-card-${ev.id}`} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ev.title}</p>
                    {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                    {!ev.allDay && <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(ev.startAt), "h:mm a")}{ev.endAt ? ` – ${format(parseISO(ev.endAt), "h:mm a")}` : ""}</p>}
                    {ev.allDay && <Badge variant="secondary" className="text-xs mt-0.5">All day</Badge>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ev)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Settings className="w-3.5 h-3.5" /></button>
                      <button data-testid={`button-delete-event-${ev.id}`} onClick={() => deleteMut.mutate(ev.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDate && isAdmin && (
        <Button data-testid="button-add-event-top" variant="outline" className="w-full gap-2" onClick={() => openCreate()}>
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      )}

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

// ─── ENDEAVORS ───────────────────────────────────────────────────────────────
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

// ─── MEMBERS ─────────────────────────────────────────────────────────────────
function MembersTab({ groupId, isAdmin, inviteCode }: { groupId: number; isAdmin: boolean; inviteCode: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ userId: number; displayName: string | null; avatarUrl: string | null; username: string | null; email: string }>>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/groups", groupId, "members"] });

  const inviteMut = useMutation({
    mutationFn: (inviteeUserId: number) => apiRequest("POST", `/api/groups/${groupId}/invite`, { inviteeUserId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] }); toast({ title: "Invite sent!" }); setSearch(""); setSearchResults([]); },
    onError: (e: any) => toast({ title: "Could not invite", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (uid: number) => apiRequest("DELETE", `/api/groups/${groupId}/members/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] }),
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

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Invite a Member</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input data-testid="input-invite-search" placeholder="Search by name, username, or email…" className="pl-9" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((u) => (
                <div key={u.userId} data-testid={`search-result-${u.userId}`} className="flex items-center gap-3 px-3 py-2">
                  <Avatar src={u.avatarUrl} name={u.displayName ?? u.email} size={8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.displayName ?? u.username ?? "User"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Button data-testid={`button-invite-${u.userId}`} size="sm" variant="outline" className="h-7 text-xs" onClick={() => inviteMut.mutate(u.userId)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Invite
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Invite code</p>
              <p data-testid="text-invite-code" className="text-sm font-mono font-bold tracking-widest">{inviteCode}</p>
            </div>
            <Button data-testid="button-copy-code" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copyCode}><Copy className="w-3 h-3" /> Copy</Button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pending ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} data-testid={`member-pending-${m.userId}`} className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2">
                <Avatar src={m.avatarUrl} name={m.displayName} size={8} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.displayName ?? m.username ?? "User"}</p>
                  <p className="text-xs text-amber-500">Invite pending</p>
                </div>
                {isAdmin && (
                  <button data-testid={`button-remove-member-${m.userId}`} onClick={() => removeMut.mutate(m.userId)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Members ({accepted.length})</h3>
        <div className="space-y-2">
          {accepted.map((m) => (
            <div key={m.id} data-testid={`member-card-${m.userId}`} className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2">
              <Avatar src={m.avatarUrl} name={m.displayName} size={9} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.displayName ?? m.username ?? "User"}</p>
                <p className="text-xs text-muted-foreground">{m.username ? `@${m.username}` : m.email}</p>
              </div>
              <Badge variant="secondary" className={`text-xs ${m.role === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : ""}`}>
                {m.role === "admin" ? "Admin" : "Member"}
              </Badge>
              {isAdmin && m.role !== "admin" && (
                <button data-testid={`button-remove-member-${m.userId}`} onClick={() => removeMut.mutate(m.userId)} className="text-muted-foreground hover:text-red-500 transition-colors ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
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
  const [tab, setTab] = useState<Tab>("wall");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", isPrivate: true });

  const myUserId = user?.user?.id ?? 0;

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId && !!user,
    retry: false,
  });

  const isAdmin = group?.myRole === "admin";
  const isMember = group?.myStatus === "accepted";

  const updateMut = useMutation({
    mutationFn: (d: typeof editForm) => apiRequest("PATCH", `/api/groups/${groupId}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups", groupId] }); setEditOpen(false); toast({ title: "Group updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/groups/${groupId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/groups"] }); navigate("/groups"); toast({ title: "Group deleted" }); },
  });

  const openEdit = () => {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description, isPrivate: group.isPrivate });
    setEditOpen(true);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Please log in.</p></div>;

  if (isLoading) return (
    <div className="min-h-screen pt-16">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-10 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  );

  if (!group) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Group not found or you don't have access.</p>
      <Button variant="outline" onClick={() => navigate("/groups")}><ChevronLeft className="w-4 h-4 mr-1" /> Back to Groups</Button>
    </div>
  );

  const tabIcons: Record<Tab, JSX.Element> = {
    wall: <MessageSquare className="w-4 h-4" />,
    calendar: <Calendar className="w-4 h-4" />,
    endeavors: <Target className="w-4 h-4" />,
    members: <Users className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-12">
      <div className="max-w-2xl mx-auto px-4">

        <div className="relative rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-red-600 to-red-900" style={{ height: 160 }}>
          {group.coverUrl && <img src={group.coverUrl} alt={group.name} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {group.isPrivate ? <Lock className="w-3.5 h-3.5 text-white/70" /> : <Globe className="w-3.5 h-3.5 text-white/70" />}
                  {isAdmin && <Badge className="bg-red-500/80 text-white text-xs border-0">Admin</Badge>}
                </div>
                <h1 className="text-white text-xl font-bold leading-tight">{group.name}</h1>
                <p className="text-white/70 text-xs">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</p>
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

        {group.description && (
          <p className="text-sm text-muted-foreground mb-4 px-1">{group.description}</p>
        )}

        <div className="flex gap-1 border-b mb-4">
          {TABS.map((t) => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? "border-red-500 text-red-600 dark:text-red-400" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabIcons[t]}
              <span className="hidden sm:inline">{t}</span>
            </button>
          ))}
        </div>

        {!isMember ? (
          <div className="text-center py-12 text-muted-foreground">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">You need to accept your invite to view group content.</p>
          </div>
        ) : (
          <>
            {tab === "wall" && <WallTab groupId={groupId} isAdmin={isAdmin} myUserId={myUserId} />}
            {tab === "calendar" && <CalendarTab groupId={groupId} isAdmin={isAdmin} />}
            {tab === "endeavors" && <EndeavorsTab groupId={groupId} isAdmin={isAdmin} />}
            {tab === "members" && <MembersTab groupId={groupId} isAdmin={isAdmin} inviteCode={group.inviteCode} />}
          </>
        )}
      </div>

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
