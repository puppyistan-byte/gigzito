import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Lock, Globe, CheckCircle, XCircle, ChevronRight, Calendar, Image, Bell, KanbanSquare, Shield, Zap, Target, ArrowRight, ArrowLeft, Home, Star, Send } from "lucide-react";

type FeaturedGroup = {
  id: number; name: string; description: string; coverUrl: string | null;
  isPrivate: boolean; memberCount: number;
};

type GroupCard = {
  id: number; name: string; description: string; coverUrl: string | null;
  isPrivate: boolean; memberCount: number; myRole: string; createdAt: string;
};
type Invite = {
  id: number; groupId: number; groupName: string; groupCoverUrl: string | null;
  inviterName: string | null; createdAt: string;
};

export default function GroupsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isPrivate: true });
  const [requestModal, setRequestModal] = useState<{ open: boolean; groupId: number | null; groupName: string }>({ open: false, groupId: null, groupName: "" });
  const [joinMessage, setJoinMessage] = useState("");
  const formValid = form.name.trim().length > 0 && form.description.trim().length > 10;

  useEffect(() => {
    if (user && new URLSearchParams(window.location.search).get("create") === "1") {
      setCreateOpen(true);
    }
  }, [user]);

  const { data: myGroups = [], isLoading } = useQuery<GroupCard[]>({
    queryKey: ["/api/groups"],
    enabled: !!user,
  });

  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ["/api/groups/invites"],
    enabled: !!user,
  });

  const { data: featuredGroups = [] } = useQuery<FeaturedGroup[]>({
    queryKey: ["/api/groups/featured"],
  });

  const [requestedGroups, setRequestedGroups] = useState<Set<number>>(new Set());

  const joinRequestMut = useMutation({
    mutationFn: ({ groupId, message }: { groupId: number; message: string }) =>
      apiRequest("POST", `/api/groups/${groupId}/join-request`, { message }),
    onSuccess: (_, { groupId }) => {
      setRequestedGroups((prev) => new Set(prev).add(groupId));
      setRequestModal({ open: false, groupId: null, groupName: "" });
      setJoinMessage("");
      toast({ title: "Membership request sent!", description: "The group admin has been notified and will review your request." });
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      if (msg.startsWith("401")) { navigate("/auth"); return; }
      if (msg.includes("Already a member")) { toast({ title: "Already a member", description: "You're already in this group." }); return; }
      if (msg.includes("Request already sent")) { toast({ title: "Already requested", description: "Your request is pending." }); return; }
      toast({ title: "Could not send request", description: msg.replace(/^\d+:\s*/, "") || "Please try again.", variant: "destructive" });
    },
  });

  const createMut = useMutation({
    mutationFn: async (d: typeof form) => {
      const res = await apiRequest("POST", "/api/groups", d);
      return res.json() as Promise<{ id: number; name: string }>;
    },
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      setCreateOpen(false);
      setForm({ name: "", description: "", isPrivate: true });
      navigate(`/groups/${group.id}`);
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      if (msg.startsWith("401")) {
        toast({ title: "Session expired", description: "Please sign in again to create a group.", variant: "destructive" });
        navigate("/auth");
      } else {
        toast({ title: "Failed to create group", description: msg.replace(/^\d+:\s*/, "") || "Please try again.", variant: "destructive" });
      }
    },
  });

  const respondMut = useMutation({
    mutationFn: ({ groupId, accept }: { groupId: number; accept: boolean }) =>
      apiRequest("POST", `/api/groups/${groupId}/invite/respond`, { accept }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups/invites"] });
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Response sent" });
    },
  });

  if (!user) return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Top nav bar with Home button ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 py-3 bg-black/80 backdrop-blur border-b border-white/5">
        <button
          data-testid="button-groups-home-loggedout"
          onClick={() => navigate("/")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em", border: "none" }}
        >
          <ArrowLeft size={14} />
          Back to Gigzito
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/60 via-black to-black pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" /> Now live on Gigzito
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-4">
            Build Your Tribe.<br />
            <span className="text-red-500">Not Your Monthly Bill.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Most group platforms treat your community like a product — charging you more as you grow. GZGroups gives you a high-performance, all-in-one dashboard so you can focus on connection, not cost.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              data-testid="button-landing-login"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base font-semibold rounded-xl gap-2"
              onClick={() => navigate("/auth")}
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              data-testid="button-landing-signin"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-900 px-8 py-3 text-base rounded-xl"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* ── Feature Grid ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-10">
          Everything Your Group Needs — Without the Upsell
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Calendar className="w-5 h-5 text-blue-400" />,
              bg: "from-blue-950/50 to-black",
              border: "border-blue-900/40",
              title: "Group Calendar",
              body: "A centralized source of truth. Schedule events, manage RSVPs, and keep every member on the same page — in one view.",
            },
            {
              icon: <Image className="w-5 h-5 text-pink-400" />,
              bg: "from-pink-950/50 to-black",
              border: "border-pink-900/40",
              title: "Media Vault",
              body: "Share high-resolution photos and videos from your latest meetups. No more hunting through fragmented social threads.",
            },
            {
              icon: <Users className="w-5 h-5 text-green-400" />,
              bg: "from-green-950/50 to-black",
              border: "border-green-900/40",
              title: "Member Dashboard",
              body: "A live pulse for your group. Post updates, share documents, and keep everyone aligned on group goals.",
            },
            {
              icon: <Bell className="w-5 h-5 text-yellow-400" />,
              bg: "from-yellow-950/50 to-black",
              border: "border-yellow-900/40",
              title: "Intelligent Notifications",
              body: "Fully integrated Email and SMS alerts for every event and enrollment. Members stay informed without checking an app 20 times a day.",
            },
            {
              icon: <KanbanSquare className="w-5 h-5 text-amber-400" />,
              bg: "from-amber-950/50 to-black",
              border: "border-amber-900/40",
              title: "Kanban Board",
              body: "Keep your group's projects moving. Drag tasks from To Do → In Progress → Done with a visual board built right in.",
            },
            {
              icon: <Shield className="w-5 h-5 text-red-400" />,
              bg: "from-red-950/50 to-black",
              border: "border-red-900/40",
              title: "Private Clubhouses",
              body: "Invite-only groups with role-based access. Your conversations, your members, your rules. No outside noise.",
            },
          ].map((f) => (
            <div key={f.title} className={`rounded-2xl border ${f.border} bg-gradient-to-br ${f.bg} p-5 flex flex-col gap-3`}>
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "5", label: "Tools in one dashboard" },
            { value: "∞", label: "Members per group" },
            { value: "$0", label: "Extra cost to grow" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-red-500 mb-1">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="text-center px-6 py-20 bg-gradient-to-b from-zinc-950 to-black">
        <Target className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-3">Ready to lead your community?</h2>
        <p className="text-zinc-500 mb-6 text-sm">Create your first GZGroup in under 60 seconds.</p>
        <Button
          data-testid="button-landing-cta"
          className="bg-red-600 hover:bg-red-700 text-white px-10 py-3 text-base font-semibold rounded-xl gap-2"
          onClick={() => navigate("/auth")}
        >
          Start for Free <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Top bar: Home + title + Create ── */}
        <div className="flex items-center justify-between py-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              data-testid="button-groups-home"
              onClick={() => navigate("/")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em", border: "none" }}
            >
              <ArrowLeft size={14} />
              Back to Gigzito
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" /> GZGroups
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Private clubhouses for your team, crew, or community</p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-group" className="bg-red-600 hover:bg-red-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create a New GZGroup</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Group Name *</label>
                  <Input data-testid="input-group-name" className="mt-1" placeholder="e.g. The Launch Crew" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Description *</label>
                    <span className={`text-xs ${form.description.trim().length >= 10 ? "text-green-500" : "text-muted-foreground"}`}>
                      {form.description.trim().length}/10 min
                    </span>
                  </div>
                  <Textarea
                    data-testid="input-group-description"
                    className="mt-1"
                    placeholder="Tell people what this group is about, who it's for, and what members can expect. A good description helps others decide if they want to join."
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  {form.description.trim().length > 0 && form.description.trim().length < 10 && (
                    <p className="text-xs text-amber-500 mt-1">Please write at least 10 characters so others know what your group is about.</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    data-testid="toggle-private"
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isPrivate: !f.isPrivate }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${form.isPrivate ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-600" : "border-border text-muted-foreground"}`}
                  >
                    {form.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    {form.isPrivate ? "Private" : "Open"}
                  </button>
                  <span className="text-xs text-muted-foreground">{form.isPrivate ? "Invite only — only members can see content" : "Anyone can see this group"}</span>
                </div>
                <Button data-testid="button-submit-create-group" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={!formValid || createMut.isPending} onClick={() => createMut.mutate(form)}>
                  {createMut.isPending ? "Creating…" : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Marketing Hero ── */}
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1a 0%, #0f0f0f 50%, #0a0a1a 100%)", border: "1px solid rgba(59,130,246,0.35)" }}>
          <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#60a5fa" }}>GZGroups</span>
            </div>
            <h2 className="text-xl font-extrabold leading-tight" style={{ color: "#ffffff" }}>Build Your Tribe. Not Your Monthly Bill.</h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a1a1aa" }}>
              Most group platforms treat your community like a product, charging you more as you grow. At Gigzito, we believe your focus should be on the connection, not the cost — a high-performance, all-in-one dashboard for groups who want to lead, not just subscribe.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { icon: <Calendar className="w-4 h-4" style={{ color: "#60a5fa" }} />, label: "Group Calendar", desc: "Schedule events, sync RSVPs, one source of truth." },
              { icon: <Image className="w-4 h-4" style={{ color: "#f472b6" }} />, label: "Media Vault", desc: "Share hi-res photos & videos from every meetup." },
              { icon: <Users className="w-4 h-4" style={{ color: "#4ade80" }} />, label: "Member Dashboard", desc: "Live pulse for updates, docs, and group goals." },
              { icon: <KanbanSquare className="w-4 h-4" style={{ color: "#fbbf24" }} />, label: "Strategic Kanban", desc: "4-lane board + Impact Matrix + Weekly Retro log." },
            ].map((f, i) => (
              <div key={f.label} className="px-4 py-3 flex flex-col gap-1" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none", borderTop: i >= 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <div className="flex items-center gap-1.5">{f.icon}<span className="text-xs font-semibold" style={{ color: "#f4f4f5" }}>{f.label}</span></div>
                <p className="text-xs leading-snug" style={{ color: "#71717a" }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
            <p className="text-xs" style={{ color: "#71717a" }}>Intelligent Email & SMS notifications keep every member aligned — no app-checking required.</p>
          </div>
        </div>

        {/* ── Featured / Top Group Spotlight ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold">Featured Group</h2>
          </div>
          {featuredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-sm mb-1">No groups yet</p>
              <p className="text-xs text-muted-foreground mb-4">Be the first to create a GZGroup — it will be featured right here for everyone to see.</p>
              <Button data-testid="button-create-first-featured" size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Create the First Group
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {featuredGroups.slice(0, 1).map((g) => {
                const isMember = myGroups.some((m) => m.id === g.id);
                const requested = requestedGroups.has(g.id);
                return (
                  <div
                    key={g.id}
                    data-testid={`featured-group-${g.id}`}
                    className="rounded-2xl border border-border overflow-hidden bg-card"
                  >
                    <div className="relative h-32 bg-gradient-to-br from-red-600 to-red-900">
                      {g.coverUrl && <img src={g.coverUrl} className="w-full h-full object-cover" alt={g.name} />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-3 left-4 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-tight">{g.name}</p>
                          <p className="text-white/70 text-xs flex items-center gap-1">
                            {g.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {g.isPrivate ? "Private" : "Open"} · {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start justify-between gap-4">
                      <p className="text-sm text-muted-foreground flex-1 leading-relaxed line-clamp-2">
                        {g.description || "A vibrant community on Gigzito — join to connect and collaborate."}
                      </p>
                      <div className="flex-shrink-0">
                        {isMember ? (
                          <Button
                            data-testid={`button-enter-featured-${g.id}`}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                            onClick={() => navigate(`/groups/${g.id}`)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Enter Group
                          </Button>
                        ) : requested ? (
                          <Button
                            data-testid={`button-requested-featured-${g.id}`}
                            size="sm"
                            variant="outline"
                            disabled
                            className="gap-1.5 text-muted-foreground"
                          >
                            <Send className="w-3.5 h-3.5" /> Request Sent
                          </Button>
                        ) : (
                          <Button
                            data-testid={`button-join-featured-${g.id}`}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                            onClick={() => {
                              if (!user) { navigate("/auth"); return; }
                              setJoinMessage("");
                              setRequestModal({ open: true, groupId: g.id, groupName: g.name });
                            }}
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> Request Membership
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {invites.length > 0 && (
          <div className="mb-6 border border-amber-400/40 rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4">
            <h2 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 text-sm">Pending Invites ({invites.length})</h2>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} data-testid={`invite-card-${inv.id}`} className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 border">
                  {inv.groupCoverUrl ? (
                    <img src={inv.groupCoverUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{inv.groupName}</p>
                    {inv.inviterName && <p className="text-xs text-muted-foreground">Invited by {inv.inviterName}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button data-testid={`button-accept-invite-${inv.id}`} onClick={() => respondMut.mutate({ groupId: inv.groupId, accept: true })} className="text-green-600 hover:text-green-700 transition-colors">
                      <CheckCircle className="w-6 h-6" />
                    </button>
                    <button data-testid={`button-decline-invite-${inv.id}`} onClick={() => respondMut.mutate({ groupId: inv.groupId, accept: false })} className="text-red-500 hover:text-red-600 transition-colors">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : myGroups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first group or wait to be invited</p>
            <Button data-testid="button-create-first-group" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGroups.map((g) => (
              <button
                key={g.id}
                data-testid={`group-card-${g.id}`}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="text-left rounded-xl border bg-card hover:shadow-md hover:border-red-300 transition-all overflow-hidden"
              >
                <div className="relative h-24 bg-gradient-to-br from-red-500 to-red-800">
                  {g.coverUrl && <img src={g.coverUrl} className="w-full h-full object-cover" alt={g.name} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <span className="text-white font-bold text-sm truncate">{g.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {g.isPrivate ? <Lock className="w-3 h-3 text-white/70" /> : <Globe className="w-3 h-3 text-white/70" />}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                    </span>
                    <Badge variant="secondary" className={`text-xs ${g.myRole === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : ""}`}>
                      {g.myRole === "admin" ? "Admin" : "Member"}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Request Membership Modal ── */}
      <Dialog
        open={requestModal.open}
        onOpenChange={(open) => {
          if (!open) { setRequestModal({ open: false, groupId: null, groupName: "" }); setJoinMessage(""); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500" />
              Request Membership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{requestModal.groupName}</span> is a private group. Tell the admin why you'd like to join — your message will be sent directly to the group for review.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Why do you want to join?
              </label>
              <Textarea
                data-testid="input-join-message"
                placeholder="Tell us about yourself and why you want to be part of this group..."
                className="resize-none min-h-[120px]"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                maxLength={1000}
              />
              <div className={`text-xs flex items-center justify-between ${joinMessage.trim().length < 50 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}>
                <span>{joinMessage.trim().length < 50 ? `${50 - joinMessage.trim().length} more characters needed` : "Looks good!"}</span>
                <span>{joinMessage.trim().length}/1000</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                data-testid="button-cancel-join-request"
                variant="outline"
                size="sm"
                onClick={() => { setRequestModal({ open: false, groupId: null, groupName: "" }); setJoinMessage(""); }}
              >
                Cancel
              </Button>
              <Button
                data-testid="button-submit-join-request"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                disabled={joinMessage.trim().length < 50 || joinRequestMut.isPending}
                onClick={() => {
                  if (!requestModal.groupId) return;
                  joinRequestMut.mutate({ groupId: requestModal.groupId, message: joinMessage.trim() });
                }}
              >
                <Send className="w-3.5 h-3.5" />
                {joinRequestMut.isPending ? "Sending…" : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
