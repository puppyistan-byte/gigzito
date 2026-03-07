import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { GigJackCard } from "@/components/gigjack-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield, DollarSign, BarChart2, Eye, EyeOff, Trash2, Zap,
  Users, Video, UserCheck, UserX, LayoutDashboard, CalendarDays, Clock,
  CheckCircle, XCircle, AlertCircle, Pencil, X,
} from "lucide-react";
import type { GigJackWithProvider, UserWithProfile } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminStats {
  todayCount: number;
  todayRevenueCents: number;
  capReached: boolean;
  listings: any[];
}

const DAILY_CAP = 100;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-500/20 text-green-400",
  PAUSED:   "bg-amber-500/20 text-amber-400",
  REMOVED:  "bg-red-500/20 text-red-400",
  PENDING:  "bg-blue-500/20 text-blue-400",
};

const ROLE_LABELS: Record<string, string> = {
  VISITOR: "Visitor", PROVIDER: "Provider", MEMBER: "Member",
  MARKETER: "Marketer", INFLUENCER: "Influencer", CORPORATE: "Corporate", ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  VISITOR: "bg-zinc-500/20 text-zinc-400",
  PROVIDER: "bg-blue-500/20 text-blue-400",
  MEMBER: "bg-teal-500/20 text-teal-400",
  MARKETER: "bg-purple-500/20 text-purple-400",
  INFLUENCER: "bg-pink-500/20 text-pink-400",
  CORPORATE: "bg-amber-500/20 text-amber-400",
  ADMIN: "bg-red-500/20 text-red-400",
};

const ALL_ROLES = ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "ADMIN"];
const GJ_STATUS_TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "DENIED"] as const;
type GJStatusTab = typeof GJ_STATUS_TABS[number];
type AdminTab = "overview" | "users" | "content" | "gigjacks";

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabBtn({ label, icon: Icon, active, onClick, badge }: {
  label: string; icon: any; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/30"
          : "text-[#666] hover:text-white border border-transparent"
      }`}
      data-testid={`tab-admin-${label.toLowerCase()}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge != null && badge > 0 && (
        <span className="bg-[#ff2b2b] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [gjTab, setGjTab] = useState<GJStatusTab>("PENDING_REVIEW");
  const [gjDateFilter, setGjDateFilter] = useState("");
  const [editingGj, setEditingGj] = useState<GigJackWithProvider | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editStatus, setEditStatus] = useState<"PENDING_REVIEW" | "APPROVED" | "DENIED">("PENDING_REVIEW");

  // Redirect non-admins (inside effect to avoid setState-during-render warning)
  const isAdmin = !authLoading && !!user && user.user?.role === "ADMIN";
  const shouldRedirect = !authLoading && !isAdmin;

  if (shouldRedirect) {
    navigate("/");
    return null;
  }

  // ── Queries ──────────────────────────────────────────────────────────────
  const enabled = isAdmin;

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled,
    refetchInterval: 30000,
  });

  const { data: gigJacks, isLoading: gjLoading } = useQuery<GigJackWithProvider[]>({
    queryKey: ["/api/admin/gigjacks"],
    enabled,
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
    enabled,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/listings/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Listing updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Listing deleted" }); },
    onError: () => toast({ title: "Error deleting listing", variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: number; status: "APPROVED" | "DENIED" | "NEEDS_IMPROVEMENT"; reviewNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/gigjacks/${id}/review`, { status, reviewNote });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Failed to update GigJack");
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] }); toast({ title: "GigJack updated" }); },
    onError: (err: any) => toast({ title: "Error updating GigJack", description: err.message ?? "", variant: "destructive" }),
  });

  const removeGigJackMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/gigjacks/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove GigJack");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] }); toast({ title: "GigJack removed" }); },
    onError: () => toast({ title: "Failed to remove GigJack", variant: "destructive" }),
  });

  const editGigJackMutation = useMutation({
    mutationFn: async ({ id, scheduledAt, status }: { id: number; scheduledAt?: string | null; status?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/gigjacks/${id}/edit`, { scheduledAt, status });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Failed to save changes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] });
      setEditingGj(null);
      toast({ title: "GigJack updated" });
    },
    onError: (err: any) => toast({ title: "Conflict", description: err.message, variant: "destructive" }),
  });

  const openEditModal = (gj: GigJackWithProvider) => {
    setEditingGj(gj);
    const dt = gj.scheduledAt ? new Date(gj.scheduledAt) : null;
    setEditDate(dt ? dt.toISOString().slice(0, 10) : "");
    setEditTime(dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "");
    const s = gj.status === "REJECTED" ? "DENIED" : gj.status as any;
    setEditStatus(s === "NEEDS_IMPROVEMENT" ? "PENDING_REVIEW" : s);
  };

  const handleEditSave = () => {
    if (!editingGj) return;
    let scheduledAt: string | null = null;
    if (editDate && editTime) {
      scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString();
    }
    editGigJackMutation.mutate({ id: editingGj.id, scheduledAt, status: editStatus });
  };

  const userStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "active" | "disabled" }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User status updated" }); },
    onError: () => toast({ title: "Error updating user", variant: "destructive" }),
  });

  const userRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Role updated" }); },
    onError: () => toast({ title: "Error changing role", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User deleted" }); },
    onError: (e: any) => toast({ title: e.message || "Error deleting user", variant: "destructive" }),
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredGigJacks = (gigJacks ?? []).filter((gj) => {
    const statusMatch = gjTab === "ALL" || gj.status === gjTab || (gjTab === "DENIED" && gj.status === "REJECTED");
    const dateMatch = !gjDateFilter || (gj.scheduledAt && new Date(gj.scheduledAt).toISOString().slice(0, 10) === gjDateFilter);
    return statusMatch && dateMatch;
  });
  const pendingCount = (gigJacks ?? []).filter((gj) => gj.status === "PENDING_REVIEW").length;
  const disabledCount = (adminUsers ?? []).filter((u) => u.status === "disabled").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#ff2b2b]" />
          <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Console</h1>
          <span className="ml-auto text-xs text-[#555] font-mono">{user.user?.email}</span>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-2 flex-wrap">
          <TabBtn label="Overview" icon={LayoutDashboard} active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabBtn label="Users" icon={Users} active={activeTab === "users"} onClick={() => setActiveTab("users")} badge={disabledCount} />
          <TabBtn label="Content" icon={Video} active={activeTab === "content"} onClick={() => setActiveTab("content")} />
          <TabBtn label="GigJacks" icon={Zap} active={activeTab === "gigjacks"} onClick={() => setActiveTab("gigjacks")} badge={pendingCount} />
        </div>

        {/* ═══════════════════════════════ OVERVIEW ═══════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-center" data-testid="stat-admin-count">
                <BarChart2 className="h-5 w-5 text-[#ff2b2b] mx-auto mb-1" />
                <p className="text-2xl font-bold">{statsLoading ? "–" : stats?.todayCount ?? 0}</p>
                <p className="text-xs text-[#666]">Today's listings</p>
              </div>
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-center" data-testid="stat-admin-revenue">
                <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">${((stats?.todayRevenueCents ?? 0) / 100).toFixed(0)}</p>
                <p className="text-xs text-[#666]">Today's revenue</p>
              </div>
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-center" data-testid="stat-admin-slots">
                <p className="text-2xl font-bold">{DAILY_CAP - (stats?.todayCount ?? 0)}</p>
                <p className="text-xs text-[#666]">Slots remaining</p>
                {stats?.capReached && <Badge variant="destructive" className="mt-1 text-xs">CAP REACHED</Badge>}
              </div>
            </div>

            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-[#666]">Daily cap usage</span>
                <span className="font-medium text-white">{stats?.todayCount ?? 0} / {DAILY_CAP}</span>
              </div>
              <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff2b2b] rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((stats?.todayCount ?? 0) / DAILY_CAP) * 100)}%` }}
                  data-testid="progress-cap"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-center">
                <p className="text-2xl font-bold text-white">{adminUsers?.length ?? "–"}</p>
                <p className="text-xs text-[#666]">Total users</p>
              </div>
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-center">
                <p className="text-2xl font-bold text-[#ff2b2b]">{disabledCount}</p>
                <p className="text-xs text-[#666]">Disabled accounts</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ USERS ═══════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-3" data-testid="section-admin-users">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#555]">{adminUsers?.length ?? 0} users total · {disabledCount} disabled</p>
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (adminUsers ?? []).map((u) => (
              <div
                key={u.id}
                className={`rounded-xl border p-3 flex items-center gap-3 ${u.status === "disabled" ? "bg-red-500/5 border-red-500/20" : "bg-[#0b0b0b] border-[#1e1e1e]"}`}
                data-testid={`row-user-${u.id}`}
              >
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${u.status === "disabled" ? "bg-red-500" : "bg-green-500"}`} />

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate" data-testid={`text-user-name-${u.id}`}>
                      {u.profile?.displayName || u.profile?.username || "—"}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[u.role] ?? "bg-zinc-500/20 text-zinc-400"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {u.status === "disabled" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">DISABLED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#555] truncate" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                  <p className="text-[10px] text-[#444]">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.profile?.primaryCategory && ` · ${u.profile.primaryCategory}`}
                  </p>
                </div>

                {/* Role selector */}
                <Select
                  value={u.role}
                  onValueChange={(role) => userRoleMutation.mutate({ id: u.id, role })}
                >
                  <SelectTrigger
                    className="w-[110px] h-7 text-xs bg-[#111] border-[#2a2a2a] text-white"
                    data-testid={`select-role-${u.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Enable/Disable */}
                {u.status === "disabled" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-400 hover:text-green-300 h-7 px-2 text-xs border border-green-500/20"
                    onClick={() => userStatusMutation.mutate({ id: u.id, status: "active" })}
                    disabled={userStatusMutation.isPending}
                    data-testid={`button-enable-user-${u.id}`}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Enable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-400 hover:text-amber-300 h-7 px-2 text-xs border border-amber-500/20"
                    onClick={() => userStatusMutation.mutate({ id: u.id, status: "disabled" })}
                    disabled={userStatusMutation.isPending}
                    data-testid={`button-disable-user-${u.id}`}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" /> Disable
                  </Button>
                )}

                {/* Delete */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-[#555] hover:text-red-400 h-7 w-7"
                  onClick={() => {
                    if (confirm(`Delete user ${u.email}? This is permanent.`)) {
                      deleteUserMutation.mutate(u.id);
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                  data-testid={`button-delete-user-${u.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════ CONTENT ═══════════════════════════════ */}
        {activeTab === "content" && (
          <div className="space-y-3" data-testid="section-admin-content">
            <p className="text-sm text-[#555]">{stats?.listings?.length ?? 0} total video posts</p>

            {statsLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (stats?.listings ?? []).map((listing: any) => (
              <div
                key={listing.id}
                className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3 flex items-start gap-3"
                data-testid={`card-admin-listing-${listing.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[listing.status]}`}>
                      {listing.status}
                    </span>
                    <Badge variant="secondary" className="text-xs">{listing.vertical}</Badge>
                    <span className="text-xs text-[#555]">{listing.durationSeconds}s</span>
                  </div>
                  <p className="font-medium text-sm text-white truncate">{listing.title}</p>
                  <p className="text-xs text-[#555] truncate">
                    by {listing.provider?.displayName ?? "Unknown"} · {listing.dropDate}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {listing.status !== "ACTIVE" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-white"
                      onClick={() => statusMutation.mutate({ id: listing.id, status: "ACTIVE" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-admin-activate-${listing.id}`}
                      title="Activate">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {listing.status === "ACTIVE" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-amber-400"
                      onClick={() => statusMutation.mutate({ id: listing.id, status: "PAUSED" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-admin-pause-${listing.id}`}
                      title="Disable">
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-red-400"
                    onClick={() => statusMutation.mutate({ id: listing.id, status: "REMOVED" })}
                    disabled={statusMutation.isPending || listing.status === "REMOVED"}
                    data-testid={`button-admin-remove-${listing.id}`}
                    title="Remove">
                    <EyeOff className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-red-500"
                    onClick={() => { if (confirm("Delete this listing permanently?")) deleteListingMutation.mutate(listing.id); }}
                    disabled={deleteListingMutation.isPending}
                    data-testid={`button-admin-delete-listing-${listing.id}`}
                    title="Delete permanently">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════ GIGJACKS ═══════════════════════════════ */}
        {activeTab === "gigjacks" && (
          <div className="space-y-3" data-testid="section-admin-gigjacks">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {GJ_STATUS_TABS.map((tab) => {
                const count = tab === "ALL"
                  ? (gigJacks ?? []).length
                  : (gigJacks ?? []).filter((gj) => gj.status === tab || (tab === "DENIED" && gj.status === "REJECTED")).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setGjTab(tab)}
                    data-testid={`tab-gigjack-${tab.toLowerCase()}`}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      gjTab === tab
                        ? "bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/30"
                        : "text-[#555] border border-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    {tab === "PENDING_REVIEW" ? "Pending" : tab.charAt(0) + tab.slice(1).toLowerCase()} {count > 0 ? `(${count})` : ""}
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-auto">
                <CalendarDays className="h-3.5 w-3.5 text-[#555]" />
                <input
                  type="date"
                  value={gjDateFilter}
                  onChange={(e) => setGjDateFilter(e.target.value)}
                  className="bg-[#0b0b0b] border border-[#2a2a2a] text-[#999] text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#ff2b2b]/40"
                  data-testid="input-gigjack-date-filter"
                />
                {gjDateFilter && (
                  <button onClick={() => setGjDateFilter("")} className="text-[#555] hover:text-white text-xs">✕</button>
                )}
              </div>
            </div>

            {gjLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}</div>
            ) : filteredGigJacks.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center text-[#444] text-sm" data-testid="text-gigjack-empty">
                {gjDateFilter ? `No GigJacks found for ${gjDateFilter}.` : gjTab === "PENDING_REVIEW" ? "No GigJacks pending review." : `No ${gjTab === "ALL" ? "" : gjTab} GigJacks.`}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGigJacks.map((gj) => {
                  const isDenied = gj.status === "DENIED" || gj.status === "REJECTED";
                  const statusLabel = gj.status === "PENDING_REVIEW" ? "Pending" : isDenied ? "Denied" : gj.status.charAt(0) + gj.status.slice(1).toLowerCase();
                  const statusColor =
                    gj.status === "APPROVED" ? "text-green-400 bg-green-400/10 border-green-400/20" :
                    isDenied ? "text-red-400 bg-red-400/10 border-red-400/20" :
                    "text-blue-400 bg-blue-400/10 border-blue-400/20";

                  const scheduledDt = gj.scheduledAt ? new Date(gj.scheduledAt) : null;
                  const scheduledLabel = scheduledDt
                    ? scheduledDt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                    : null;

                  const createdLabel = new Date(gj.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

                  return (
                    <div key={gj.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3" data-testid={`card-admin-gigjack-${gj.id}`}>
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        {gj.artworkUrl && (
                          <img src={gj.artworkUrl} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0 border border-[#222]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {gj.botWarning && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/20">
                                Bot Flag
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-white text-sm leading-snug line-clamp-2">{gj.offerTitle}</p>
                          <p className="text-xs text-[#555] mt-0.5">
                            by <span className="text-[#888]">{gj.provider?.displayName ?? gj.provider?.username ?? "Unknown"}</span>
                            <span className="mx-1.5 text-[#333]">·</span>
                            submitted {createdLabel}
                          </p>
                        </div>
                      </div>

                      {/* Scheduled datetime */}
                      <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${scheduledLabel ? "bg-[#ff2b2b]/06 border border-[#ff2b2b]/15" : "bg-[#111] border border-[#1e1e1e]"}`}>
                        {scheduledLabel ? (
                          <>
                            <CalendarDays className="h-3.5 w-3.5 text-[#ff2b2b] shrink-0" />
                            <span className="text-xs text-white font-medium">{scheduledLabel}</span>
                          </>
                        ) : (
                          <span className="text-xs text-[#444]">No date/time selected</span>
                        )}
                      </div>

                      {gj.botWarningMessage && (
                        <p className="text-xs text-amber-400/80 bg-amber-400/06 border border-amber-400/15 rounded-lg px-3 py-2">
                          <span className="font-semibold">Bot flag:</span> {gj.botWarningMessage}
                        </p>
                      )}

                      {gj.reviewNote && (
                        <p className="text-xs text-[#888] bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                          <span className="font-semibold text-[#555]">Note:</span> {gj.reviewNote}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {gj.status === "PENDING_REVIEW" && (
                          <>
                            <Button
                              size="sm"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: gj.id, status: "APPROVED" })}
                              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-500 border-0 text-white"
                              data-testid={`btn-approve-gigjack-${gj.id}`}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: gj.id, status: "DENIED" })}
                              variant="outline"
                              className="flex-1 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              data-testid={`btn-deny-gigjack-${gj.id}`}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Deny
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openEditModal(gj)}
                          variant="outline"
                          className="gap-1.5 border-[#2a2a2a] text-[#888] hover:border-[#ff2b2b]/30 hover:text-[#ff2b2b]"
                          data-testid={`btn-edit-gigjack-${gj.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          disabled={removeGigJackMutation.isPending}
                          onClick={() => { if (confirm("Remove this GigJack permanently?")) removeGigJackMutation.mutate(gj.id); }}
                          variant="outline"
                          className="gap-1.5 border-[#2a2a2a] text-[#555] hover:border-red-500/30 hover:text-red-400"
                          data-testid={`btn-remove-gigjack-${gj.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── Edit GigJack Modal ─────────────────────────────────────────────── */}
      {editingGj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="modal-edit-gigjack">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b0b] border border-[#222] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[#ff2b2b]" />
                <h3 className="font-semibold text-white text-sm">Edit GigJack</h3>
              </div>
              <button onClick={() => setEditingGj(null)} className="text-[#555] hover:text-white transition-colors" data-testid="btn-close-edit-modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs text-[#555] mb-1 font-medium uppercase tracking-wider">Offer</p>
                <p className="text-sm text-white font-semibold line-clamp-2">{editingGj.offerTitle}</p>
                <p className="text-xs text-[#555] mt-0.5">by {editingGj.provider?.displayName ?? editingGj.provider?.username ?? "Unknown"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#666] font-medium">Scheduled Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff2b2b]/40"
                    data-testid="input-edit-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#666] font-medium">Scheduled Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    step="900"
                    className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff2b2b]/40"
                    data-testid="input-edit-time"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#666] font-medium">Status</label>
                <div className="flex gap-2">
                  {(["PENDING_REVIEW", "APPROVED", "DENIED"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      data-testid={`btn-edit-status-${s.toLowerCase()}`}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        editStatus === s
                          ? s === "APPROVED" ? "bg-green-600/20 border-green-500/40 text-green-400"
                            : s === "DENIED" ? "bg-red-600/20 border-red-500/40 text-red-400"
                            : "bg-blue-600/20 border-blue-500/40 text-blue-400"
                          : "border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]"
                      }`}
                    >
                      {s === "PENDING_REVIEW" ? "Pending" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/06 border border-amber-500/15 px-3 py-2.5">
                <p className="text-xs text-amber-400/80">
                  <span className="font-semibold">Note:</span> System rules still apply — max 2 approved GigJacks per hour, 15-minute spacing required. Conflicts will be shown as an error.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[#1e1e1e]">
              <Button
                variant="outline"
                className="flex-1 border-[#2a2a2a] text-[#555] hover:text-white"
                onClick={() => setEditingGj(null)}
                data-testid="btn-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#ff2b2b] hover:bg-[#e52222] border-0 text-white"
                disabled={editGigJackMutation.isPending}
                onClick={handleEditSave}
                data-testid="btn-save-edit"
              >
                {editGigJackMutation.isPending ? <span className="animate-spin mr-1">⏳</span> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
