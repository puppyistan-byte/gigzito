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
  Users, Video, UserCheck, UserX, ChevronDown, LayoutDashboard,
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
const GJ_STATUS_TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_IMPROVEMENT"] as const;
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
    mutationFn: async ({ id, status, reviewNote }: { id: number; status: "APPROVED" | "REJECTED" | "NEEDS_IMPROVEMENT"; reviewNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/gigjacks/${id}/review`, { status, reviewNote });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] }); toast({ title: "GigJack updated" }); },
    onError: () => toast({ title: "Error updating GigJack", variant: "destructive" }),
  });

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
  const filteredGigJacks = (gigJacks ?? []).filter((gj) => gjTab === "ALL" || gj.status === gjTab);
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
            <div className="flex items-center gap-2 flex-wrap">
              {GJ_STATUS_TABS.map((tab) => {
                const count = tab === "ALL" ? (gigJacks ?? []).length : (gigJacks ?? []).filter((gj) => gj.status === tab).length;
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
                    {tab.replace("_", " ")} {count > 0 ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>

            {gjLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : filteredGigJacks.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center text-[#444] text-sm" data-testid="text-gigjack-empty">
                {gjTab === "PENDING_REVIEW" ? "No GigJacks pending review." : `No GigJacks with status "${gjTab.replace("_", " ")}".`}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGigJacks.map((gj) => (
                  <GigJackCard
                    key={gj.id}
                    gigJack={gj}
                    showStatus
                    showAdminActions
                    isPending={reviewMutation.isPending}
                    onApprove={(id) => reviewMutation.mutate({ id, status: "APPROVED" })}
                    onReject={(id) => reviewMutation.mutate({ id, status: "REJECTED" })}
                    onNeedsImprovement={(id) => reviewMutation.mutate({ id, status: "NEEDS_IMPROVEMENT" })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
