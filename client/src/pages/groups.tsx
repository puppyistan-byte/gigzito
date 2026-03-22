import { useState } from "react";
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
import { Users, Plus, Lock, Globe, CheckCircle, XCircle, ChevronRight } from "lucide-react";

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

  const { data: myGroups = [], isLoading } = useQuery<GroupCard[]>({
    queryKey: ["/api/groups"],
    enabled: !!user,
  });

  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ["/api/groups/invites"],
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => apiRequest("POST", "/api/groups", d),
    onSuccess: async (res) => {
      const group = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      setCreateOpen(false);
      setForm({ name: "", description: "", isPrivate: true });
      navigate(`/groups/${group.id}`);
    },
    onError: () => toast({ title: "Failed to create group", variant: "destructive" }),
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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Please log in to access GZGroups.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-4">

        <div className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" /> GZGroups
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Private clubhouses for your team, crew, or community</p>
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
                  <label className="text-sm font-medium">Description</label>
                  <Textarea data-testid="input-group-description" className="mt-1" placeholder="What's this group about?" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
                <Button data-testid="button-submit-create-group" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={!form.name.trim() || createMut.isPending} onClick={() => createMut.mutate(form)}>
                  {createMut.isPending ? "Creating…" : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
    </div>
  );
}
