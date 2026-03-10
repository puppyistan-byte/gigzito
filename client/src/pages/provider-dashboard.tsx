import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  PlusCircle, AlertCircle, CheckCircle2, ExternalLink,
  Pause, Play, Trash2, Download, Mail, Phone, MessageSquare,
  Inbox, Zap, Clock, ChevronUp, ChevronLeft, Calendar, CheckCircle2 as CheckCircle, XCircle, Pencil, ShieldCheck, Heart, LogOut,
} from "lucide-react";
import { GigCardSection } from "@/components/gig-card-section";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import type { ListingWithProvider, ProfileCompletionStatus, ProviderProfile, Lead, GigJackWithProvider } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "bg-green-500/15 text-green-400 border border-green-500/25",
  PAUSED:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  REMOVED: "bg-red-500/15 text-red-400 border border-red-500/25",
  PENDING: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
};

const GJ_STATUS: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW:    { label: "Pending Review", color: "#f59e0b" },
  APPROVED:          { label: "Approved",        color: "#22c55e" },
  REJECTED:          { label: "Rejected",         color: "#ef4444" },
  NEEDS_IMPROVEMENT: { label: "Needs Work",       color: "#3b82f6" },
};

const CATEGORIES = [
  "MARKETING", "COACHING", "COURSES", "MUSIC", "CRYPTO",
  "INFLUENCER", "PRODUCTS", "FLASH_SALE", "EVENTS", "MUSIC_GIGS", "CORPORATE_DEALS",
];

function GigJackCenter() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [denyNote, setDenyNote] = useState("");
  const [showDenyInput, setShowDenyInput] = useState<number | null>(null);
  const [confirmRemoveGJ, setConfirmRemoveGJ] = useState<{ id: number; title: string } | null>(null);

  const isAdmin = user?.user?.role === "ADMIN" || user?.user?.role === "SUPER_ADMIN";

  const { data: myGigJacks = [], isLoading: gjLoading } = useQuery<GigJackWithProvider[]>({
    queryKey: isAdmin ? ["/api/admin/gigjacks"] : ["/api/gigjacks/mine"],
    enabled: !!user,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: number; status: "APPROVED" | "DENIED"; reviewNote?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/gigjacks/${id}/review`, { status, reviewNote });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] });
      setShowDenyInput(null);
      setDenyNote("");
      toast({ title: "GigJack updated successfully" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/gigjacks/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gigjacks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/mine"] });
      toast({ title: "GigJack removed" });
    },
    onError: () => toast({ title: "Failed to remove GigJack", variant: "destructive" }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-[#ff2b2b]" />
          <h2 className="text-sm font-semibold text-white" data-testid="text-gigjack-center-title">
            GigJack Center
          </h2>
          {isAdmin && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
              <ShieldCheck size={9} /> All Users
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/gigjack/new")}
          className="text-xs h-7 px-2.5 rounded-lg font-semibold"
          style={{ background: "#ff2b2b", color: "#fff", border: "none" }}
          data-testid="button-new-gigjack"
        >
          <PlusCircle className="h-3 w-3 mr-1" /> New GigJack
        </Button>
      </div>

      {/* Info note */}
      <div
        className="rounded-lg mb-3 px-3 py-2 text-[11px] leading-relaxed"
        style={{ background: "rgba(255,43,43,0.04)", border: "1px solid rgba(255,43,43,0.12)", color: "rgba(255,255,255,0.35)" }}
      >
        GigJacks are 5–10 second platform-wide flash events. Max <strong className="text-[rgba(255,255,255,0.5)]">2 per hour</strong>, with a <strong className="text-[rgba(255,255,255,0.5)]">15-minute</strong> gap between each. Click &ldquo;New GigJack&rdquo; to book a slot using the scheduling calendar (up to 90 days ahead).
      </div>

      {/* GigJack list */}
      {gjLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
        </div>
      ) : myGigJacks.length === 0 ? (
        <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-gigjacks">
          <Zap className="h-5 w-5 text-[#333] mx-auto mb-2" />
          <p className="text-[#555] text-sm">No GigJacks yet.</p>
          <Button
            size="sm"
            onClick={() => navigate("/gigjack/new")}
            className="mt-3 text-xs"
            style={{ background: "#ff2b2b", color: "#fff", border: "none" }}
            data-testid="button-first-gigjack"
          >
            <Calendar className="h-3 w-3 mr-1" /> Book Your First GigJack Slot
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {myGigJacks.map((gj) => {
            const isPending = gj.status === "PENDING_REVIEW";
            const isApproved = gj.status === "APPROVED";
            const isDenied = gj.status === "DENIED" || gj.status === "REJECTED";
            const statusColor = isApproved ? "#22c55e" : isDenied ? "#ef4444" : isPending ? "#f59e0b" : "#888";
            const statusLabel = isApproved ? "Approved" : isDenied ? "Denied" : isPending ? "Pending Review" : gj.status;

            return (
              <div
                key={gj.id}
                className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3.5"
                data-testid={`card-gigjack-${gj.id}`}
              >
                <div className="flex gap-3 items-start">
                  {gj.artworkUrl && (
                    <img
                      src={gj.artworkUrl}
                      alt={gj.offerTitle}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                      data-testid={`img-gj-artwork-${gj.id}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate" data-testid={`text-gj-title-${gj.id}`}>
                          {gj.offerTitle}
                        </p>
                        {isAdmin && gj.provider?.displayName && (
                          <p className="text-[10px] text-[#555] mt-0.5">
                            by <span className="text-[#777]">{gj.provider.displayName}</span>
                          </p>
                        )}
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}44` }}
                        data-testid={`badge-gj-status-${gj.id}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap mt-1.5">
                      {gj.scheduledAt ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#555]">
                          <Clock size={9} />
                          {new Date(gj.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#444] italic">No time scheduled</span>
                      )}
                      {gj.category && (
                        <span className="text-[10px] text-[#555] bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-0.5">
                          {gj.category.replace(/_/g, " ")}
                        </span>
                      )}
                      {gj.flashDurationSeconds && (
                        <span className="text-[10px] text-[#444]">{gj.flashDurationSeconds}s flash</span>
                      )}
                      <a
                        href={gj.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#ff2b2b]"
                        data-testid={`link-gj-cta-${gj.id}`}
                      >
                        <ExternalLink size={9} /> Offer link
                      </a>
                    </div>

                    {gj.reviewNote && (
                      <p className="text-[11px] text-amber-400 mt-1.5">Note: {gj.reviewNote}</p>
                    )}

                    {/* Admin action buttons */}
                    {isAdmin && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: gj.id, status: "APPROVED" })}
                              className="h-6 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-500 text-white border-0"
                              data-testid={`btn-approve-gigjack-${gj.id}`}
                            >
                              <CheckCircle size={10} /> Approve
                            </Button>
                            {showDenyInput === gj.id ? (
                              <div className="flex gap-1 items-center">
                                <input
                                  value={denyNote}
                                  onChange={(e) => setDenyNote(e.target.value)}
                                  placeholder="Reason (optional)"
                                  className="h-6 px-2 text-[10px] rounded bg-[#111] border border-[#2a2a2a] text-white w-32 focus:outline-none focus:border-red-500/30"
                                  data-testid={`input-deny-note-${gj.id}`}
                                />
                                <Button
                                  size="sm"
                                  disabled={reviewMutation.isPending}
                                  onClick={() => { reviewMutation.mutate({ id: gj.id, status: "DENIED", reviewNote: denyNote || undefined }); }}
                                  className="h-6 px-2 text-[10px] gap-1 bg-red-600 hover:bg-red-500 text-white border-0"
                                  data-testid={`btn-confirm-deny-${gj.id}`}
                                >
                                  Confirm Deny
                                </Button>
                                <button
                                  onClick={() => { setShowDenyInput(null); setDenyNote(""); }}
                                  className="text-[#555] hover:text-white text-[10px]"
                                >✕</button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowDenyInput(gj.id)}
                                className="h-6 px-2 text-[10px] gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                data-testid={`btn-deny-gigjack-${gj.id}`}
                              >
                                <XCircle size={10} /> Deny
                              </Button>
                            )}
                          </>
                        )}
                        {!isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: gj.id, status: "APPROVED" })}
                            className="h-6 px-2 text-[10px] gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                            data-testid={`btn-re-approve-gigjack-${gj.id}`}
                          >
                            <CheckCircle size={10} /> {isApproved ? "Re-approve" : "Approve"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin?tab=gigjacks`)}
                          className="h-6 px-2 text-[10px] gap-1 border-[#2a2a2a] text-[#888] hover:border-[#ff2b2b]/30 hover:text-[#ff2b2b]"
                          data-testid={`btn-edit-gigjack-${gj.id}`}
                        >
                          <Pencil size={10} /> Edit in Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={removeMutation.isPending}
                          onClick={() => setConfirmRemoveGJ({ id: gj.id, title: gj.offerTitle })}
                          className="h-6 px-2 text-[10px] gap-1 border-[#2a2a2a] text-[#555] hover:border-red-500/30 hover:text-red-400"
                          data-testid={`btn-remove-gigjack-${gj.id}`}
                        >
                          <Trash2 size={10} /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmRemoveGJ && (
        <DeleteConfirmDialog
          title={confirmRemoveGJ.title}
          isPending={removeMutation.isPending}
          onConfirm={() => {
            removeMutation.mutate(confirmRemoveGJ.id);
            setConfirmRemoveGJ(null);
          }}
          onCancel={() => setConfirmRemoveGJ(null)}
        />
      )}
    </div>
  );
}

export default function ProviderDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete confirmation for listings
  const [confirmRemoveListing, setConfirmRemoveListing] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings/mine"],
    enabled: !!user,
  });

  const { data: completion } = useQuery<ProfileCompletionStatus>({
    queryKey: ["/api/profile/me/completion"],
    enabled: !!user,
  });

  const { data: profile } = useQuery<ProviderProfile>({
    queryKey: ["/api/profile/me"],
    enabled: !!user,
  });

  const { data: dailyStats } = useQuery<{ date: string; count: number; capReached: boolean; maxCap: number }>({
    queryKey: ["/api/stats/daily"],
  });

  const { data: totalLikesData } = useQuery<{ totalLikes: number }>({
    queryKey: ["/api/profile/me/total-likes"],
    enabled: !!user,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads/mine"],
    enabled: !!user,
  });

  const exportLeadsCSV = () => {
    if (!leads.length) return;
    const headers = ["ID", "Name", "Email", "Phone", "Message", "Video Title", "Category", "Date"];
    const rows = leads.map((l) => [
      l.id,
      `"${(l.firstName ?? "").replace(/"/g, '""')}"`,
      `"${(l.email ?? "").replace(/"/g, '""')}"`,
      `"${(l.phone ?? "").replace(/"/g, '""')}"`,
      `"${(l.message ?? "").replace(/"/g, '""')}"`,
      `"${(l.videoTitle ?? "").replace(/"/g, '""')}"`,
      `"${(l.category ?? "").replace(/"/g, '""')}"`,
      new Date(l.createdAt).toLocaleString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gigzito-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/listings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings/mine"] });
      toast({ title: "Listing updated" });
    },
    onError: () => toast({ title: "Error updating listing", variant: "destructive" }),
  });

  const handlePostVideo = () => {
    if (completion && !completion.isComplete) {
      toast({
        title: "Complete your profile first",
        description: `Missing: ${completion.missing.join(", ")}`,
        variant: "destructive",
      });
      navigate("/provider/profile");
      return;
    }
    navigate("/provider/new");
  };

  if (authLoading) return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="p-4 max-w-2xl mx-auto"><Skeleton className="h-32 w-full bg-[#111]" /></div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Return to Main + Sign Out */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-main">
              <ChevronLeft className="h-3.5 w-3.5" />
              Return to Main
            </button>
          </Link>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-red-400 transition-colors"
            data-testid="button-sign-out-dashboard"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-white" data-testid="text-dashboard-title">My Dashboard</h1>
          <Button
            size="sm"
            onClick={handlePostVideo}
            disabled={dailyStats?.capReached}
            className="bg-[#ff1a1a] hover:bg-[#ff2a2a] text-white font-bold rounded-xl shrink-0"
            data-testid="button-post-new"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Post Video
          </Button>
        </div>

        {/* Daily cap warning */}
        {dailyStats?.capReached && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400 text-sm" data-testid="alert-cap-reached">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Daily cap of {dailyStats.maxCap} listings reached. New submissions open tomorrow.</span>
          </div>
        )}

        {/* Profile card */}
        {profile ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#555] uppercase tracking-widest font-semibold">Your Creator Profile</p>
              {completion?.isComplete ? (
                <span className="flex items-center gap-1 text-xs text-green-400" data-testid="text-profile-complete">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Profile complete
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400" data-testid="text-profile-incomplete">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Incomplete
                </span>
              )}
            </div>
            <ProfileCard profile={profile} showEditLink data-testid="card-profile-status" />
            {completion && !completion.isComplete && (
              <p className="text-xs text-amber-400/80 mt-2 ml-1">
                Missing: {completion.missing.join(", ")} —{" "}
                <Link href="/provider/profile" className="underline text-[#ff1a1a]">complete now to post videos</Link>
              </p>
            )}
          </div>
        ) : (
          <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
        )}

        {/* Stats row */}
        {dailyStats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Today's posts", value: dailyStats.count,                           testId: "stat-today-count" },
              { label: "My listings",   value: listings.length,                            testId: "stat-my-listings" },
              { label: "Slots left",    value: dailyStats.maxCap - dailyStats.count,       testId: "stat-cap" },
              { label: "Total Likes",   value: (totalLikesData?.totalLikes ?? 0).toLocaleString(), testId: "stat-total-likes", heart: true },
            ].map(({ label, value, testId, heart }) => (
              <div key={testId} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3 text-center" data-testid={testId}>
                <p className="text-2xl font-bold text-white flex items-center justify-center gap-1.5">
                  {heart && <Heart className="w-5 h-5 text-red-500 fill-red-500" />}
                  {value}
                </p>
                <p className="text-xs text-[#555] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* My listings */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">My Videos</h2>
          {listingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-8 text-center">
              <p className="text-[#555] text-sm mb-3">No listings yet.</p>
              <Button
                size="sm"
                onClick={handlePostVideo}
                disabled={dailyStats?.capReached}
                className="bg-[#ff1a1a] hover:bg-[#ff2a2a] text-white font-bold rounded-xl"
                data-testid="button-first-post"
              >
                Post your first video
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid={`card-listing-${listing.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[listing.status]}`}>
                          {listing.status}
                        </span>
                        <Badge variant="secondary" className="text-xs bg-[#1a1a1a] text-[#888] border-[#2a2a2a]">{listing.vertical}</Badge>
                      </div>
                      <p className="font-semibold text-sm text-white truncate">{listing.title}</p>
                      <p className="text-xs text-[#555] mt-0.5 flex items-center gap-2">
                        <span>{listing.durationSeconds}s · $3.00 paid</span>
                        <span className="flex items-center gap-0.5 text-red-400" data-testid={`text-likes-listing-${listing.id}`}>
                          <Heart className="w-3 h-3 fill-red-400" />
                          {(listing.likeCount ?? 0).toLocaleString()} {(listing.likeCount ?? 0) === 1 ? "like" : "likes"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/listing/${listing.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-[#555] hover:text-white" data-testid={`button-view-${listing.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {listing.status === "ACTIVE" ? (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-[#555] hover:text-white" data-testid={`button-pause-${listing.id}`} onClick={() => statusMutation.mutate({ id: listing.id, status: "PAUSED" })} disabled={statusMutation.isPending}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : listing.status === "PAUSED" ? (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-[#555] hover:text-white" data-testid={`button-resume-${listing.id}`} onClick={() => statusMutation.mutate({ id: listing.id, status: "ACTIVE" })} disabled={statusMutation.isPending}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-[#ff1a1a]/60 hover:text-[#ff1a1a]" data-testid={`button-remove-${listing.id}`} onClick={() => setConfirmRemoveListing({ id: listing.id, title: listing.title })} disabled={statusMutation.isPending || listing.status === "REMOVED"}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── GigJack Center ─── */}
        <GigJackCenter />

        {/* ─── Gig Cards ─── */}
        {profile && <GigCardSection profile={profile} />}

        {/* CTA Leads section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white" data-testid="text-leads-title">CTA Leads</h2>
            {leads.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={exportLeadsCSV}
                className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg h-7 px-2.5"
                data-testid="button-export-leads"
              >
                <Download className="h-3 w-3 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>

          {leadsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full bg-[#111] rounded-xl" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-leads">
              <Inbox className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-sm">No CTA leads yet. When visitors click a CTA button on your listings, their contact info will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3.5" data-testid={`card-lead-${lead.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{lead.firstName}</p>
                    <span className="text-[10px] text-[#444] shrink-0">{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                  {lead.videoTitle && (
                    <p className="text-xs text-[#ff2b2b] mb-1.5">{lead.videoTitle}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1 text-xs text-[#777]">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </span>
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-xs text-[#777]">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                    )}
                  </div>
                  {lead.message && (
                    <p className="text-xs text-[#555] mt-1.5 flex gap-1">
                      <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                      {lead.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {confirmRemoveListing && (
        <DeleteConfirmDialog
          title={confirmRemoveListing.title}
          isPending={statusMutation.isPending}
          onConfirm={() => {
            statusMutation.mutate({ id: confirmRemoveListing.id, status: "REMOVED" });
            setConfirmRemoveListing(null);
          }}
          onCancel={() => setConfirmRemoveListing(null)}
        />
      )}
    </div>
  );
}
