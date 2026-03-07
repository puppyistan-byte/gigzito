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
  CheckCircle, XCircle, AlertCircle, Pencil, X, Search, RotateCcw,
  ClipboardList, ToggleLeft, ToggleRight, ShieldAlert, Archive, RefreshCw,
  Radio, PlusCircle, ExternalLink, Wifi, WifiOff, AlertTriangle, CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import type { GigJackWithProvider, UserWithProfile, AuditLog, InjectedFeed } from "@shared/schema";

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
  TRIAGED:  "bg-orange-500/20 text-orange-400",
};

const ROLE_LABELS: Record<string, string> = {
  VISITOR: "Visitor", PROVIDER: "Provider", MEMBER: "Member",
  MARKETER: "Marketer", INFLUENCER: "Influencer", CORPORATE: "Corporate",
  ADMIN: "Admin", SUPER_ADMIN: "Super Admin", COORDINATOR: "Coordinator",
};

const ROLE_COLORS: Record<string, string> = {
  VISITOR: "bg-zinc-500/20 text-zinc-400",
  PROVIDER: "bg-blue-500/20 text-blue-400",
  MEMBER: "bg-teal-500/20 text-teal-400",
  MARKETER: "bg-purple-500/20 text-purple-400",
  INFLUENCER: "bg-pink-500/20 text-pink-400",
  CORPORATE: "bg-amber-500/20 text-amber-400",
  ADMIN: "bg-red-500/20 text-red-400",
  SUPER_ADMIN: "bg-violet-500/20 text-violet-300",
  COORDINATOR: "bg-cyan-500/20 text-cyan-400",
};

const BASE_ROLES = ["VISITOR", "PROVIDER", "MEMBER", "MARKETER", "INFLUENCER", "CORPORATE", "ADMIN", "COORDINATOR"];
const SUPER_ROLES = [...BASE_ROLES, "SUPER_ADMIN"];
const GJ_STATUS_TABS = ["ALL", "PENDING_REVIEW", "APPROVED", "DENIED"] as const;
type GJStatusTab = typeof GJ_STATUS_TABS[number];
type AdminTab = "overview" | "users" | "content" | "gigjacks" | "audit" | "injection";

function TabBtn({ label, icon: Icon, active, onClick, badge, superOnly }: {
  label: string; icon: any; active: boolean; onClick: () => void; badge?: number; superOnly?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active
          ? superOnly
            ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
            : "bg-[#ff2b2b]/15 text-[#ff2b2b] border border-[#ff2b2b]/30"
          : "text-[#666] hover:text-white border border-transparent"
      }`}
      data-testid={`tab-admin-${label.toLowerCase().replace(/ /g, "-")}`}
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
  const [editOfferDurationMinutes, setEditOfferDurationMinutes] = useState<number>(60);
  const [editFlashDurationSeconds, setEditFlashDurationSeconds] = useState<number>(7);
  const [overrideMode, setOverrideMode] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");

  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // Injection state
  const [injPlatform, setInjPlatform] = useState("YouTube");
  const [injUrl, setInjUrl] = useState("");
  const [injTitle, setInjTitle] = useState("");
  const [injCategory, setInjCategory] = useState("");
  const [injMode, setInjMode] = useState<"immediate" | "fallback">("fallback");
  const [injStatus, setInjStatus] = useState<"active" | "inactive">("active");
  const [injEndsAt, setInjEndsAt] = useState("");
  const [editingInj, setEditingInj] = useState<InjectedFeed | null>(null);

  // Delete confirmation dialog state
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);

  // Triage dialog state
  const [confirmTriage, setConfirmTriage] = useState<{ id: number; title: string } | null>(null);
  const [triagedReason, setTriagedReason] = useState("Non-video format — static image detected");

  const userRole = user?.user?.role ?? "";
  const isAdmin = !authLoading && !!user && (userRole === "ADMIN" || userRole === "SUPER_ADMIN");
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const shouldRedirect = !authLoading && !isAdmin;
  if (shouldRedirect) {
    navigate("/");
    return null;
  }

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

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-log"],
    enabled: enabled && isSuperAdmin && activeTab === "audit",
  });

  const { data: injectedFeeds = [], isLoading: injLoading } = useQuery<InjectedFeed[]>({
    queryKey: ["/api/admin/injected-feeds"],
    enabled: enabled && activeTab === "injection",
  });

  const createInjMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await apiRequest("POST", "/api/admin/injected-feeds", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      toast({ title: "Feed injected" });
      setInjUrl(""); setInjTitle(""); setInjCategory(""); setInjEndsAt("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateInjMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) => {
      const res = await apiRequest("PATCH", `/api/admin/injected-feeds/${id}`, data);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      toast({ title: "Feed updated" });
      setEditingInj(null);
    },
    onError: () => toast({ title: "Error updating feed", variant: "destructive" }),
  });

  const deleteInjMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/injected-feeds/${id}`, undefined);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/injected-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/injected-feed/active"] });
      toast({ title: "Feed removed" });
    },
    onError: () => toast({ title: "Error removing feed", variant: "destructive" }),
  });

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

  const triageMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/listings/${id}/triage`, { reason });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gigcard-directory"] });
      toast({ title: "Listing triaged", description: "Moved to GigCard Directory. Provider has been notified." });
      setConfirmTriage(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: number; status: "APPROVED" | "DENIED" | "NEEDS_IMPROVEMENT"; reviewNote?: string }) => {
      const endpoint = overrideMode && isSuperAdmin
        ? `/api/admin/gigjacks/${id}/review-override`
        : `/api/admin/gigjacks/${id}/review`;
      const res = await apiRequest("PATCH", endpoint, { status, reviewNote });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Failed to update GigJack");
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] }); toast({ title: overrideMode ? "GigJack updated (Override)" : "GigJack updated" }); },
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
    mutationFn: async ({ id, scheduledAt, status, offerDurationMinutes, flashDurationSeconds }: { id: number; scheduledAt?: string | null; status?: string; offerDurationMinutes?: number; flashDurationSeconds?: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/gigjacks/${id}/edit`, {
        scheduledAt, status, offerDurationMinutes, flashDurationSeconds,
        override: overrideMode && isSuperAdmin,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Failed to save changes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] });
      setEditingGj(null);
      toast({ title: overrideMode ? "GigJack updated (Override)" : "GigJack updated" });
    },
    onError: (err: any) => toast({ title: "Conflict", description: err.message, variant: "destructive" }),
  });

  const forceExpireMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/gigjacks/${id}/force-expire`, {});
      if (!res.ok) throw new Error("Failed to force expire");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] });
      toast({ title: "GigJack force-expired" });
    },
    onError: () => toast({ title: "Failed to force expire", variant: "destructive" }),
  });

  const openEditModal = (gj: GigJackWithProvider) => {
    setEditingGj(gj);
    const dt = gj.scheduledAt ? new Date(gj.scheduledAt) : null;
    setEditDate(dt ? dt.toISOString().slice(0, 10) : "");
    setEditTime(dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "");
    const s = gj.status === "REJECTED" ? "DENIED" : gj.status as any;
    setEditStatus(s === "NEEDS_IMPROVEMENT" ? "PENDING_REVIEW" : s);
    setEditOfferDurationMinutes((gj as any).offerDurationMinutes ?? 60);
    setEditFlashDurationSeconds((gj as any).flashDurationSeconds ?? 7);
  };

  const handleEditSave = () => {
    if (!editingGj) return;
    let scheduledAt: string | null = null;
    if (editDate && editTime) {
      scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString();
    }
    editGigJackMutation.mutate({ id: editingGj.id, scheduledAt, status: editStatus, offerDurationMinutes: editOfferDurationMinutes, flashDurationSeconds: editFlashDurationSeconds });
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User permanently deleted" }); },
    onError: (e: any) => toast({ title: e.message || "Error deleting user", variant: "destructive" }),
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/soft-delete`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User soft-deleted (restorable)" });
    },
    onError: (e: any) => toast({ title: e.message || "Error", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/restore`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User restored" });
    },
    onError: (e: any) => toast({ title: e.message || "Error", variant: "destructive" }),
  });

  const editUserProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/profile`, data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({ title: "User profile updated" });
    },
    onError: (e: any) => toast({ title: e.message || "Error updating profile", variant: "destructive" }),
  });

  const openUserEdit = (u: UserWithProfile) => {
    setEditingUser(u);
    setEditDisplayName(u.profile?.displayName ?? "");
    setEditBio(u.profile?.bio ?? "");
    setEditAvatarUrl(u.profile?.avatarUrl ?? "");
    setEditContactEmail(u.profile?.contactEmail ?? "");
    setEditLocation(u.profile?.location ?? "");
  };

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

  const filteredGigJacks = (gigJacks ?? []).filter((gj) => {
    const statusMatch = gjTab === "ALL" || gj.status === gjTab || (gjTab === "DENIED" && gj.status === "REJECTED");
    const dateMatch = !gjDateFilter || (gj.scheduledAt && new Date(gj.scheduledAt).toISOString().slice(0, 10) === gjDateFilter);
    return statusMatch && dateMatch;
  });

  const pendingCount = (gigJacks ?? []).filter((gj) => gj.status === "PENDING_REVIEW").length;
  const disabledCount = (adminUsers ?? []).filter((u) => u.status === "disabled").length;

  const filteredUsers = (adminUsers ?? []).filter((u) => {
    const q = userSearch.toLowerCase();
    const nameMatch = !q || u.email.toLowerCase().includes(q) || (u.profile?.displayName ?? "").toLowerCase().includes(q) || (u.profile?.username ?? "").toLowerCase().includes(q);
    const roleMatch = userRoleFilter === "ALL" || u.role === userRoleFilter;
    const statusMatch = userStatusFilter === "ALL" ||
      (userStatusFilter === "DELETED" ? !!u.deletedAt : userStatusFilter === "active" ? !u.deletedAt && u.status === "active" : !u.deletedAt && u.status === userStatusFilter);
    return nameMatch && roleMatch && statusMatch;
  });

  const availableRoles = isSuperAdmin ? SUPER_ROLES : BASE_ROLES;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="h-5 w-5 text-[#ff2b2b]" />
          <h1 className="text-xl font-bold" data-testid="text-admin-title">
            {isSuperAdmin ? "Super Admin Console" : "Admin Console"}
          </h1>
          {isSuperAdmin && (
            <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              SUPER ADMIN
            </span>
          )}
          <span className="ml-auto text-xs text-[#555] font-mono">{user?.user?.email}</span>
        </div>

        {/* Override Mode Banner (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
              overrideMode
                ? "bg-violet-500/10 border-violet-500/40"
                : "bg-[#0b0b0b] border-[#1e1e1e]"
            }`}
            data-testid="panel-override-mode"
          >
            <ShieldAlert className={`h-4 w-4 shrink-0 ${overrideMode ? "text-violet-300" : "text-[#555]"}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${overrideMode ? "text-violet-300" : "text-[#777]"}`}>
                Override Mode {overrideMode ? "ACTIVE" : "Off"}
              </p>
              <p className="text-[11px] text-[#555]">
                {overrideMode
                  ? "Scheduling rules bypassed. Actions are audit-logged."
                  : "Enable to bypass 15-min spacing and 2-per-hour GigJack caps."}
              </p>
            </div>
            <button
              onClick={() => setOverrideMode((v) => !v)}
              className="shrink-0"
              data-testid="toggle-override-mode"
            >
              {overrideMode
                ? <ToggleRight className="h-7 w-7 text-violet-400" />
                : <ToggleLeft className="h-7 w-7 text-[#444]" />}
            </button>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex items-center gap-2 flex-wrap">
          <TabBtn label="Overview" icon={LayoutDashboard} active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabBtn label="Users" icon={Users} active={activeTab === "users"} onClick={() => setActiveTab("users")} badge={disabledCount} />
          <TabBtn label="Content" icon={Video} active={activeTab === "content"} onClick={() => setActiveTab("content")} />
          <TabBtn label="GigJacks" icon={Zap} active={activeTab === "gigjacks"} onClick={() => setActiveTab("gigjacks")} badge={pendingCount} />
          <TabBtn label="Live Injection" icon={Radio} active={activeTab === "injection"} onClick={() => setActiveTab("injection")} />
          {isSuperAdmin && (
            <TabBtn label="Audit Log" icon={ClipboardList} active={activeTab === "audit"} onClick={() => setActiveTab("audit")} superOnly />
          )}
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
            {/* Search + Filters */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-[#0b0b0b] border border-[#1e1e1e] rounded-xl text-white placeholder:text-[#444] focus:outline-none focus:border-[#ff2b2b]/40"
                  data-testid="input-user-search"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Role filter */}
                <div className="flex gap-1 flex-wrap">
                  {["ALL", ...availableRoles].map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        userRoleFilter === r
                          ? "bg-[#ff2b2b]/15 text-[#ff2b2b] border-[#ff2b2b]/30"
                          : "text-[#555] border-[#2a2a2a] hover:text-white"
                      }`}
                      data-testid={`filter-role-${r.toLowerCase()}`}
                    >
                      {r === "ALL" ? "All Roles" : ROLE_LABELS[r] ?? r}
                    </button>
                  ))}
                </div>

                {/* Status filter */}
                <div className="flex gap-1 ml-auto">
                  {["ALL", "active", "disabled", ...(isSuperAdmin ? ["DELETED"] : [])].map((s) => (
                    <button
                      key={s}
                      onClick={() => setUserStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        userStatusFilter === s
                          ? "bg-[#ff2b2b]/15 text-[#ff2b2b] border-[#ff2b2b]/30"
                          : "text-[#555] border-[#2a2a2a] hover:text-white"
                      }`}
                      data-testid={`filter-status-${s.toLowerCase()}`}
                    >
                      {s === "ALL" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#444]">{filteredUsers.length} of {adminUsers?.length ?? 0} users</p>
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredUsers.map((u) => {
              const isDeleted = !!u.deletedAt;
              const cardBg = isDeleted
                ? "bg-zinc-900/50 border-zinc-800/50 opacity-70"
                : u.status === "disabled"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-[#0b0b0b] border-[#1e1e1e]";

              return (
                <div
                  key={u.id}
                  className={`rounded-xl border p-3 flex items-center gap-3 ${cardBg}`}
                  data-testid={`row-user-${u.id}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isDeleted ? "bg-zinc-600" : u.status === "disabled" ? "bg-red-500" : "bg-green-500"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate" data-testid={`text-user-name-${u.id}`}>
                        {u.profile?.displayName || u.profile?.username || "—"}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[u.role] ?? "bg-zinc-500/20 text-zinc-400"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      {u.status === "disabled" && !isDeleted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">DISABLED</span>
                      )}
                      {isDeleted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-400">DELETED</span>
                      )}
                    </div>
                    <p className="text-xs text-[#555] truncate" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                    <p className="text-[10px] text-[#444]">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                      {u.profile?.primaryCategory && ` · ${u.profile.primaryCategory}`}
                      {isDeleted && u.deletedAt && ` · Deleted ${new Date(u.deletedAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Role selector (not for deleted) */}
                  {!isDeleted && (
                    <Select
                      value={u.role}
                      onValueChange={(role) => userRoleMutation.mutate({ id: u.id, role })}
                    >
                      <SelectTrigger className="w-[110px] h-7 text-xs bg-[#111] border-[#2a2a2a] text-white" data-testid={`select-role-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r] ?? r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Action buttons */}
                  {!isDeleted && (
                    <>
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

                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#555] hover:text-blue-400 h-7 px-2 text-xs border border-[#2a2a2a]"
                          onClick={() => openUserEdit(u)}
                          data-testid={`button-edit-profile-${u.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      )}

                      {isSuperAdmin ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-[#555] hover:text-amber-400 h-7 w-7"
                          title="Soft-delete (restorable)"
                          onClick={() => {
                            if (confirm(`Soft-delete ${u.email}? They can be restored later.`)) {
                              softDeleteMutation.mutate(u.id);
                            }
                          }}
                          disabled={softDeleteMutation.isPending}
                          data-testid={`button-soft-delete-user-${u.id}`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-[#555] hover:text-red-400 h-7 w-7"
                        title="Delete permanently"
                        onClick={() => {
                          if (confirm(`Permanently delete ${u.email}? This cannot be undone.`)) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                        disabled={deleteUserMutation.isPending}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {/* Restore button for deleted users */}
                  {isDeleted && isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-400 hover:text-green-300 h-7 px-2 text-xs border border-green-500/20"
                      onClick={() => restoreMutation.mutate(u.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-user-${u.id}`}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restore
                    </Button>
                  )}
                </div>
              );
            })}

            {!usersLoading && filteredUsers.length === 0 && (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center text-[#444] text-sm">
                No users match your filters.
              </div>
            )}
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
                  {listing.status !== "ACTIVE" && listing.status !== "TRIAGED" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-white"
                      onClick={() => statusMutation.mutate({ id: listing.id, status: "ACTIVE" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-admin-activate-${listing.id}`}
                      title="Restore to feed">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {listing.status === "ACTIVE" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-amber-400"
                      onClick={() => statusMutation.mutate({ id: listing.id, status: "PAUSED" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-admin-pause-${listing.id}`}
                      title="Pause">
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {listing.status !== "TRIAGED" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-orange-400"
                      onClick={() => { setConfirmTriage({ id: listing.id, title: listing.title }); setTriagedReason("Non-video format — static image detected"); }}
                      disabled={triageMutation.isPending}
                      data-testid={`button-admin-triage-${listing.id}`}
                      title="Triage — move to GigCard Directory">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#666] hover:text-red-500"
                    onClick={() => setConfirmDelete({ id: listing.id, title: listing.title })}
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
            {/* Override indicator */}
            {overrideMode && isSuperAdmin && (
              <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/30 px-3 py-2">
                <ShieldAlert className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <p className="text-xs text-violet-300 font-semibold">Override Mode Active — scheduling rules bypassed</p>
              </div>
            )}

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
                      <div className="flex items-start gap-3">
                        {gj.artworkUrl && (
                          <img src={gj.artworkUrl} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0 border border-[#222]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {(() => {
                              const ds = (gj as any).displayState as string | undefined;
                              if (!ds || ds === "hidden") return null;
                              const dsColors: Record<string, string> = {
                                flash: "bg-orange-500/20 text-orange-300 border-orange-500/30",
                                siren: "bg-red-500/20 text-red-300 border-red-500/30",
                                expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
                              };
                              return (
                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${dsColors[ds] ?? ""}`}>
                                  {ds}
                                </span>
                              );
                            })()}
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

                      <div className="flex gap-2 pt-1 flex-wrap">
                        {gj.status === "PENDING_REVIEW" && (
                          <>
                            <Button
                              size="sm"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: gj.id, status: "APPROVED" })}
                              className={`flex-1 gap-1.5 border-0 text-white ${overrideMode && isSuperAdmin ? "bg-violet-600 hover:bg-violet-500" : "bg-green-600 hover:bg-green-500"}`}
                              data-testid={`btn-approve-gigjack-${gj.id}`}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> {overrideMode && isSuperAdmin ? "Override Approve" : "Approve"}
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
                          className={`gap-1.5 ${overrideMode && isSuperAdmin ? "border-violet-500/30 text-violet-300 hover:bg-violet-500/10" : "border-[#2a2a2a] text-[#888] hover:border-[#ff2b2b]/30 hover:text-[#ff2b2b]"}`}
                          data-testid={`btn-edit-gigjack-${gj.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" /> {overrideMode && isSuperAdmin ? "Override Edit" : "Edit"}
                        </Button>
                        {(() => {
                          const ds = (gj as any).displayState as string | undefined;
                          const canExpire = ds === "flash" || ds === "siren";
                          if (!canExpire) return null;
                          return (
                            <Button
                              size="sm"
                              disabled={forceExpireMutation.isPending}
                              onClick={() => { if (confirm("Force expire this live GigJack?")) forceExpireMutation.mutate(gj.id); }}
                              variant="outline"
                              className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                              data-testid={`btn-force-expire-gigjack-${gj.id}`}
                            >
                              <Zap className="h-3.5 w-3.5" /> Force Expire
                            </Button>
                          );
                        })()}
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

        {/* ═══════════════════════════════ LIVE INJECTION ═══════════════════════════════ */}
        {activeTab === "injection" && (
          <div className="space-y-4" data-testid="section-admin-injection">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#ff2b2b]" />
              <h2 className="text-sm font-semibold text-white">Live Feed Injection</h2>
              <span className="ml-auto text-xs text-[#444]">Content continuity tool</span>
            </div>

            <div className="rounded-xl bg-[#070707] border border-[#ff2b2b]/20 p-3 text-xs text-[#666] leading-relaxed">
              <p className="text-[#888]">Inject a live or fallback source into the platform when no scheduled content is active. <strong className="text-[#aaa]">Immediate</strong> mode activates right away; <strong className="text-[#aaa]">Fallback Only</strong> shows only when no GigJack or live event is running.</p>
            </div>

            {/* Create form */}
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" /> {editingInj ? "Edit Injection" : "New Injection"}
                </h3>
                {editingInj && (
                  <button onClick={() => { setEditingInj(null); setInjUrl(""); setInjTitle(""); setInjCategory(""); setInjEndsAt(""); }} className="text-[10px] text-[#555] hover:text-white flex items-center gap-1">
                    <X className="h-3 w-3" /> Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Platform</label>
                  <Select value={injPlatform} onValueChange={setInjPlatform}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-inj-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#2a2a2a]">
                      {["YouTube", "TikTok", "Instagram", "Facebook"].map((p) => (
                        <SelectItem key={p} value={p} className="text-white focus:bg-[#222]">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Inject Mode</label>
                  <Select value={injMode} onValueChange={(v) => setInjMode(v as "immediate" | "fallback")}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-inj-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#2a2a2a]">
                      <SelectItem value="immediate" className="text-white focus:bg-[#222]">Immediate — activate now</SelectItem>
                      <SelectItem value="fallback" className="text-white focus:bg-[#222]">Fallback Only — quiet periods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#666]">Source URL *</label>
                <Input
                  placeholder="https://youtube.com/watch?v=... or tiktok.com/..."
                  value={injUrl}
                  onChange={(e) => setInjUrl(e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] h-9 text-sm"
                  data-testid="input-inj-url"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Display Title <span className="text-[#444]">(optional)</span></label>
                  <Input
                    placeholder="Admin Live Feed"
                    value={injTitle}
                    onChange={(e) => setInjTitle(e.target.value)}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] h-9 text-sm"
                    data-testid="input-inj-title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Category <span className="text-[#444]">(optional)</span></label>
                  <Input
                    placeholder="marketing, music, crypto..."
                    value={injCategory}
                    onChange={(e) => setInjCategory(e.target.value)}
                    className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] h-9 text-sm"
                    data-testid="input-inj-category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Status</label>
                  <Select value={injStatus} onValueChange={(v) => setInjStatus(v as "active" | "inactive")}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-inj-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#2a2a2a]">
                      <SelectItem value="active" className="text-green-400 focus:bg-[#222]">Active</SelectItem>
                      <SelectItem value="inactive" className="text-[#666] focus:bg-[#222]">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666]">Expires At <span className="text-[#444]">(optional)</span></label>
                  <Input
                    type="datetime-local"
                    value={injEndsAt}
                    onChange={(e) => setInjEndsAt(e.target.value)}
                    className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm [color-scheme:dark]"
                    data-testid="input-inj-ends-at"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="bg-[#ff1a1a] hover:bg-[#ff2a2a] text-white border-0 h-8 px-4 text-xs font-bold flex-1"
                  onClick={() => {
                    if (!injUrl) { toast({ title: "Source URL required", variant: "destructive" }); return; }
                    const payload = { platform: injPlatform, sourceUrl: injUrl, displayTitle: injTitle || undefined, category: injCategory || undefined, injectMode: injMode, status: injStatus, endsAt: injEndsAt || null };
                    if (editingInj) {
                      updateInjMutation.mutate({ id: editingInj.id, data: payload });
                    } else {
                      createInjMutation.mutate(payload);
                    }
                  }}
                  disabled={createInjMutation.isPending || updateInjMutation.isPending}
                  data-testid="btn-inject-now"
                >
                  {editingInj ? "Update Feed" : injStatus === "active" ? "Inject Now" : "Save as Fallback"}
                </Button>
              </div>
            </div>

            {/* Existing injections list */}
            {injLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : injectedFeeds.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center text-[#444] text-sm">
                No injected feeds yet. Use the form above to inject content.
              </div>
            ) : (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
                {injectedFeeds.map((feed, i) => (
                  <div
                    key={feed.id}
                    className={`flex items-start gap-3 px-4 py-3 ${i !== injectedFeeds.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}
                    data-testid={`row-injection-${feed.id}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${feed.status === "active" ? "bg-green-500/15" : "bg-[#1a1a1a]"}`}>
                      {feed.status === "active" ? <Wifi className="h-3.5 w-3.5 text-green-400" /> : <WifiOff className="h-3.5 w-3.5 text-[#444]" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white">{feed.displayTitle || feed.platform + " Feed"}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${feed.status === "active" ? "bg-green-500/20 text-green-400" : "bg-[#1e1e1e] text-[#555]"}`}>
                          {feed.status}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ff2b2b]/10 text-[#ff6666]">
                          {feed.injectMode}
                        </span>
                        <span className="text-[10px] text-[#555]">{feed.platform}</span>
                      </div>
                      <p className="text-[10px] text-[#444] truncate max-w-sm">{feed.sourceUrl}</p>
                      {feed.endsAt && (
                        <p className="text-[10px] text-amber-500/70">Expires: {new Date(feed.endsAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => window.open(feed.sourceUrl, "_blank")}
                        className="h-7 w-7 rounded-lg bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-[#666] hover:text-white transition-colors"
                        title="Open source URL"
                        data-testid={`btn-inj-open-${feed.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => updateInjMutation.mutate({ id: feed.id, data: { status: feed.status === "active" ? "inactive" : "active" } })}
                        className={`h-7 px-2 rounded-lg text-[10px] font-bold transition-colors ${feed.status === "active" ? "bg-red-500/15 hover:bg-red-500/25 text-red-400" : "bg-green-500/15 hover:bg-green-500/25 text-green-400"}`}
                        data-testid={`btn-inj-toggle-${feed.id}`}
                      >
                        {feed.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingInj(feed);
                          setInjPlatform(feed.platform);
                          setInjUrl(feed.sourceUrl);
                          setInjTitle(feed.displayTitle ?? "");
                          setInjCategory(feed.category ?? "");
                          setInjMode(feed.injectMode as "immediate" | "fallback");
                          setInjStatus(feed.status as "active" | "inactive");
                          setInjEndsAt(feed.endsAt ? new Date(feed.endsAt).toISOString().slice(0,16) : "");
                        }}
                        className="h-7 w-7 rounded-lg bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-[#666] hover:text-white transition-colors"
                        data-testid={`btn-inj-edit-${feed.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteInjMutation.mutate(feed.id)}
                        className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                        data-testid={`btn-inj-delete-${feed.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Priority reminder */}
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3 space-y-1.5 text-xs text-[#555]">
              <p className="text-[#777] font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Content Priority Order</p>
              <ol className="space-y-0.5 pl-4 list-decimal marker:text-[#444]">
                <li>Scheduled live event</li>
                <li>Active GigJack event</li>
                <li>Admin injected — immediate mode</li>
                <li>Admin injected — fallback mode</li>
              </ol>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ AUDIT LOG ═══════════════════════════════ */}
        {activeTab === "audit" && isSuperAdmin && (
          <div className="space-y-3" data-testid="section-admin-audit">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Audit Log</h2>
              <span className="ml-auto text-xs text-[#444]">{auditLogs?.length ?? 0} entries</span>
            </div>

            {auditLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (auditLogs?.length ?? 0) === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center text-[#444] text-sm">
                No audit log entries yet.
              </div>
            ) : (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] overflow-hidden">
                {(auditLogs ?? []).map((log, i) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 px-4 py-3 text-xs ${i !== (auditLogs!.length - 1) ? "border-b border-[#1a1a1a]" : ""} ${log.usedOverride ? "bg-violet-500/05" : ""}`}
                    data-testid={`row-audit-${log.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`font-mono font-semibold text-[11px] ${log.usedOverride ? "text-violet-300" : "text-[#ff2b2b]"}`}>
                          {log.actionType}
                        </span>
                        {log.usedOverride && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300">
                            OVERRIDE
                          </span>
                        )}
                        <span className="text-[#444]">·</span>
                        <span className="text-[#666]">{log.targetType} #{log.targetId ?? "—"}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-[#444]">
                        {log.oldValue && <span>from: <span className="text-[#666]">{log.oldValue}</span></span>}
                        {log.newValue && <span>to: <span className="text-[#666]">{log.newValue}</span></span>}
                        <span className="ml-auto">actor: <span className="text-[#666]">user #{log.actorUserId ?? "—"}</span></span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#444] shrink-0 mt-0.5 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── Edit GigJack Modal ─────────────────────────────────────────────── */}
      {editingGj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="modal-edit-gigjack">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b0b] border border-[#222] shadow-2xl overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] ${overrideMode && isSuperAdmin ? "bg-violet-500/10" : ""}`}>
              <div className="flex items-center gap-2">
                {overrideMode && isSuperAdmin
                  ? <ShieldAlert className="h-4 w-4 text-violet-400" />
                  : <Pencil className="h-4 w-4 text-[#ff2b2b]" />}
                <h3 className="font-semibold text-white text-sm">
                  {overrideMode && isSuperAdmin ? "Override Edit GigJack" : "Edit GigJack"}
                </h3>
              </div>
              <button onClick={() => setEditingGj(null)} className="text-[#555] hover:text-white transition-colors" data-testid="btn-close-edit-modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs text-[#555] mb-1 font-medium uppercase tracking-wider">Offer</p>
                <p className="text-sm text-white font-semibold line-clamp-2">{editingGj.offerTitle}</p>
                <p className="text-xs text-[#555] mt-0.5">by {editingGj.provider?.displayName ?? editingGj.provider?.username ?? "Unknown"}</p>
              </div>

              {overrideMode && isSuperAdmin && (
                <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/30 px-3 py-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <p className="text-xs text-violet-300">Override active — scheduling rules bypassed</p>
                </div>
              )}

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
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger className="w-full bg-[#111] border-[#2a2a2a] text-white h-9" data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="DENIED">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#666] font-medium">Flash Duration</label>
                  <Select value={String(editFlashDurationSeconds)} onValueChange={(v) => setEditFlashDurationSeconds(Number(v))}>
                    <SelectTrigger className="w-full bg-[#111] border-[#2a2a2a] text-white h-9" data-testid="select-edit-flash-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 7, 10, 15, 30, 60].map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}s</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#666] font-medium">Offer Duration</label>
                  <Select value={String(editOfferDurationMinutes)} onValueChange={(v) => setEditOfferDurationMinutes(Number(v))}>
                    <SelectTrigger className="w-full bg-[#111] border-[#2a2a2a] text-white h-9" data-testid="select-edit-offer-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="360">6 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#2a2a2a] text-[#666] hover:text-white"
                onClick={() => setEditingGj(null)}
                data-testid="btn-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 text-white border-0 ${overrideMode && isSuperAdmin ? "bg-violet-600 hover:bg-violet-500" : "bg-[#ff2b2b] hover:bg-[#e02222]"}`}
                onClick={handleEditSave}
                disabled={editGigJackMutation.isPending}
                data-testid="btn-save-edit"
              >
                {editGigJackMutation.isPending ? "Saving…" : overrideMode && isSuperAdmin ? "Override Save" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit User Profile Modal (SUPER_ADMIN) ──────────────────────────── */}
      {editingUser && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="modal-edit-user-profile">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b0b] border border-[#222] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] bg-violet-500/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-violet-400" />
                <h3 className="font-semibold text-white text-sm">Edit User Profile</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-[#555] hover:text-white transition-colors" data-testid="btn-close-user-edit-modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-xs text-[#555] mb-1">Editing: <span className="text-white">{editingUser.email}</span></p>
              </div>

              {[
                { label: "Display Name", value: editDisplayName, onChange: setEditDisplayName, testid: "input-edit-display-name" },
                { label: "Bio", value: editBio, onChange: setEditBio, testid: "input-edit-bio" },
                { label: "Avatar URL", value: editAvatarUrl, onChange: setEditAvatarUrl, testid: "input-edit-avatar-url" },
                { label: "Contact Email", value: editContactEmail, onChange: setEditContactEmail, testid: "input-edit-contact-email" },
                { label: "Location", value: editLocation, onChange: setEditLocation, testid: "input-edit-location" },
              ].map(({ label, value, onChange, testid }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs text-[#666] font-medium">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500/40"
                    data-testid={testid}
                  />
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#2a2a2a] text-[#666] hover:text-white"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white border-0"
                onClick={() => {
                  editUserProfileMutation.mutate({
                    id: editingUser.id,
                    data: {
                      displayName: editDisplayName,
                      bio: editBio,
                      avatarUrl: editAvatarUrl,
                      contactEmail: editContactEmail,
                      location: editLocation,
                    },
                  });
                }}
                disabled={editUserProfileMutation.isPending}
                data-testid="btn-save-user-profile"
              >
                {editUserProfileMutation.isPending ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <DeleteConfirmDialog
          title={confirmDelete.title}
          isPending={deleteListingMutation.isPending}
          onConfirm={() => {
            deleteListingMutation.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Triage dialog */}
      {confirmTriage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmTriage(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl bg-[#0d0d0d] border border-orange-500/30 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="triage-confirm-dialog"
          >
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-500" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/15">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base" data-testid="triage-dialog-heading">Move to GigCard Directory</h3>
                  <p className="text-xs text-[#555]">The poster will be notified by email</p>
                </div>
              </div>

              <div className="rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] px-4 py-3">
                <p className="text-xs text-[#555] mb-1">Listing being triaged</p>
                <p className="text-sm font-semibold text-white" data-testid="triage-dialog-title">{confirmTriage.title}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#888] font-semibold uppercase tracking-wider">Reason (sent to provider)</label>
                <Input
                  value={triagedReason}
                  onChange={(e) => setTriagedReason(e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                  placeholder="e.g. Non-video format — static image detected"
                  data-testid="input-triage-reason"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Non-video format — static image detected", "PDF or document file — not a video", "Low quality / unplayable video"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTriagedReason(preset)}
                      className="text-[10px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-orange-400 hover:border-orange-500/40 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
                <p className="text-xs text-orange-300/80">
                  This listing will be removed from the video feed and added to the public GigCard Directory. The provider will receive an automatic email explaining why.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="ghost" className="flex-1 text-[#666] hover:text-white border border-[#2a2a2a]" onClick={() => setConfirmTriage(null)} data-testid="triage-confirm-cancel">
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  onClick={() => triageMutation.mutate({ id: confirmTriage.id, reason: triagedReason })}
                  disabled={triageMutation.isPending || !triagedReason.trim()}
                  data-testid="triage-confirm-yes"
                >
                  {triageMutation.isPending ? "Triaging…" : "Move to GigCard Directory"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
