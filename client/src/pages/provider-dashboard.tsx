import { useEffect, useState, Component, type ReactNode } from "react";

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <p style={{ color: "#ff2b2b", fontWeight: 700, marginBottom: 8 }}>Dashboard Error</p>
          <pre style={{ fontSize: 12, color: "#888", maxWidth: 500, whiteSpace: "pre-wrap" }}>{(this.state.error as Error).message}</pre>
          <button style={{ marginTop: 16, padding: "8px 20px", background: "#111", border: "1px solid #333", color: "#aaa", borderRadius: 8, cursor: "pointer" }} onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
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
  Inbox, Zap, Clock, ChevronUp, ChevronLeft, Calendar, CheckCircle2 as CheckCircle, XCircle, Pencil, ShieldCheck, Heart, LogOut, Users, Shield, AlertOctagon, Loader2, UserCircle,
  Send, Radio, MapPin, Globe, X as XIcon, Megaphone, CreditCard, Bell,
  Music, Headphones, Upload as UploadIcon,
} from "lucide-react";
import { InviteCard } from "@/components/invite-card";
import { Textarea } from "@/components/ui/textarea";
import { GigCardSection } from "@/components/gig-card-section";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import type { ListingWithProvider, ProfileCompletionStatus, ProviderProfile, Lead, GigJackWithProvider, CardMessage, ListingComment, AdInquiry, AudienceBroadcast, GeoTargetCampaign, ZeeMotion, GZMusicTrack } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "bg-green-500/15 text-green-400 border border-green-500/25",
  PAUSED:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  REMOVED: "bg-red-500/15 text-red-400 border border-red-500/25",
  PENDING: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
};

const SCAN_BADGE: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  SCANNING:       { label: "Bif Scanning",    className: "bg-blue-500/15 text-blue-400 border border-blue-500/25",   icon: Loader2 },
  CLEAN:          { label: "Bif: Clean",       className: "bg-green-500/12 text-green-500 border border-green-500/20", icon: Shield },
  FLAGGED:        { label: "Bif: Flagged",     className: "bg-red-500/15 text-red-400 border border-red-500/25",     icon: AlertOctagon },
  APPEAL_PENDING: { label: "Appeal Pending",   className: "bg-amber-500/15 text-amber-400 border border-amber-500/25", icon: Clock },
  APPEAL_DENIED:  { label: "Appeal Denied",    className: "bg-red-600/15 text-red-500 border border-red-600/25",     icon: XCircle },
  HUMAN_REVIEW:   { label: "Human Review",     className: "bg-violet-500/15 text-violet-400 border border-violet-500/25", icon: Users },
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
      </div>

      {/* Info note */}
      <div
        className="rounded-lg mb-3 px-3 py-2 text-[11px] leading-relaxed"
        style={{ background: "rgba(255,43,43,0.04)", border: "1px solid rgba(255,43,43,0.12)", color: "rgba(255,255,255,0.35)" }}
      >
        GigJacks are 5–10 second platform-wide flash events. Max <strong className="text-[rgba(255,255,255,0.5)]">2 per hour</strong>, with a <strong className="text-[rgba(255,255,255,0.5)]">15-minute</strong> gap between each. Book a slot using the scheduling calendar (up to 90 days ahead).
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
            <Calendar className="h-3 w-3 mr-1" /> Book a GigJack
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

function ProviderDashboardInner() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.user?.role === "ADMIN" || user?.user?.role === "SUPER_ADMIN";

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

  const { data: audienceData } = useQuery<{ count: number; members: { id: number; leadName: string; leadEmail: string; leadPhone: string | null; createdAt: string }[] }>({
    queryKey: ["/api/my-audience"],
  });

  const { data: audienceBroadcasts = [] } = useQuery<AudienceBroadcast[]>({
    queryKey: ["/api/my-audience/broadcasts"],
    enabled: !!user,
  });

  const myUserId = (user as any)?.user?.id;
  const { data: myMusicTracksRaw, isLoading: musicLoading } = useQuery<GZMusicTrack[]>({
    queryKey: ["/api/gz-music/tracks/by-user", myUserId],
    queryFn: () => fetch(`/api/gz-music/tracks/by-user/${myUserId}`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    enabled: !!myUserId,
  });
  const myMusicTracks: GZMusicTrack[] = Array.isArray(myMusicTracksRaw) ? myMusicTracksRaw : [];

  const { data: presenterContacts = [] } = useQuery<{ id: number; memberUserId: number; displayName: string | null; username: string | null; email: string; optedInAt: string }[]>({
    queryKey: ["/api/presenter-contacts/my-contacts"],
  });

  const { data: geoCampaigns = [] } = useQuery<GeoTargetCampaign[]>({
    queryKey: ["/api/geo-campaigns"],
    enabled: !!user,
  });

  // Broadcast modal state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bcSubject, setBcSubject] = useState("");
  const [bcBody, setBcBody] = useState("");

  const broadcastMutation = useMutation({
    mutationFn: (data: { subject: string; body: string }) => apiRequest("POST", "/api/my-audience/broadcast", data),
    onSuccess: (data: any) => {
      toast({ title: "Broadcast sent", description: `Delivered to ${data.recipientCount} subscriber${data.recipientCount !== 1 ? "s" : ""}.` });
      setBcSubject(""); setBcBody(""); setShowBroadcast(false);
      queryClient.invalidateQueries({ queryKey: ["/api/my-audience/broadcasts"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to send broadcast.", variant: "destructive" }),
  });

  // Geo campaign form state
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [geoTitle, setGeoTitle] = useState("");
  const [geoOffer, setGeoOffer] = useState("");
  const [geoRadius, setGeoRadius] = useState("10");
  const [geoCity, setGeoCity] = useState("");
  const [geoState, setGeoState] = useState("");
  const [geoCountry, setGeoCountry] = useState("US");
  const [geoImageUrl, setGeoImageUrl] = useState("");

  const createCampaignMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/geo-campaigns", data),
    onSuccess: () => {
      toast({ title: "Campaign created" });
      setShowGeoForm(false); setGeoTitle(""); setGeoOffer(""); setGeoRadius("10"); setGeoCity(""); setGeoState(""); setGeoCountry("US"); setGeoImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/geo-campaigns"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" }),
  });

  const updateCampaignStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/geo-campaigns/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/geo-campaigns"] }),
    onError: () => toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" }),
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads/mine"],
    enabled: !!user,
  });

  // ── Inbox ──────────────────────────────────────────────────────────────────
  const [inboxTab, setInboxTab] = useState<"geezees" | "comments" | "inquiries">("geezees");
  const [selectedGeezees, setSelectedGeezees] = useState<Set<number>>(new Set());
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
  const [selectedInquiries, setSelectedInquiries] = useState<Set<number>>(new Set());
  const toggleGeezee = (id: number) => setSelectedGeezees((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleComment = (id: number) => setSelectedComments((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleInquiry = (id: number) => setSelectedInquiries((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const { data: geezeesMessages = [], isLoading: geezeesLoading } = useQuery<CardMessage[]>({
    queryKey: ["/api/gigness-cards/inbox"],
    enabled: !!user,
  });

  type VideoCommentWithTitle = ListingComment & { listingTitle: string | null };
  const { data: videoComments = [], isLoading: commentsLoading } = useQuery<VideoCommentWithTitle[]>({
    queryKey: ["/api/listings/comments/mine"],
    enabled: !!user,
  });

  const { data: adInquiries = [], isLoading: inquiriesLoading } = useQuery<AdInquiry[]>({
    queryKey: ["/api/ad-inquiries"],
    enabled: !!user,
  });

  const { data: zeeFeed = [] } = useQuery<(ZeeMotion & { username: string | null; displayName: string | null; avatarUrl: string | null })[]>({
    queryKey: ["/api/zee-motions/feed"],
    enabled: !!user,
  });

  const unreadGeezees = geezeesMessages.filter((m) => !m.isRead).length;
  const unreadComments = videoComments.filter((c) => !c.isRead).length;
  const unreadInquiries = adInquiries.filter((i) => !i.isRead).length;
  const totalUnread = unreadGeezees + unreadComments + unreadInquiries;

  const [replyingId, setReplyingId] = useState<string | null>(null); // "geezee-5" | "comment-3" | "inquiry-7"
  const [replyText, setReplyText] = useState("");

  const markGeezeeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/gigness-cards/messages/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gigness-cards/inbox"] }),
  });
  const deleteGeezeeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gigness-cards/messages/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gigness-cards/inbox"] }),
  });
  const replyGeezeeMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => apiRequest("POST", `/api/gigness-cards/messages/${id}/reply`, { replyText: text }),
    onSuccess: () => { setReplyingId(null); setReplyText(""); toast({ title: "Reply sent" }); },
    onError: (e: Error) => toast({ title: "Reply failed", description: e.message, variant: "destructive" }),
  });

  const markCommentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/listings/comments/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/listings/comments/mine"] }),
  });
  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/listings/comments/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/listings/comments/mine"] }),
  });
  const replyCommentMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => apiRequest("POST", `/api/listings/comments/${id}/reply`, { replyText: text }),
    onSuccess: () => { setReplyingId(null); setReplyText(""); toast({ title: "Reply sent" }); },
    onError: (e: Error) => toast({ title: "Reply failed", description: e.message, variant: "destructive" }),
  });

  const markInquiryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/ad-inquiries/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ad-inquiries"] }),
  });
  const deleteInquiryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ad-inquiries/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ad-inquiries"] }),
  });
  const bulkDeleteGeezeeMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("POST", "/api/gigness-cards/messages/bulk-delete", { ids }),
    onSuccess: () => { setSelectedGeezees(new Set()); queryClient.invalidateQueries({ queryKey: ["/api/gigness-cards/inbox"] }); },
    onError: () => toast({ title: "Bulk delete failed", variant: "destructive" }),
  });
  const bulkDeleteCommentMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("POST", "/api/listings/comments/bulk-delete", { ids }),
    onSuccess: () => { setSelectedComments(new Set()); queryClient.invalidateQueries({ queryKey: ["/api/listings/comments/mine"] }); },
    onError: () => toast({ title: "Bulk delete failed", variant: "destructive" }),
  });
  const bulkDeleteInquiryMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("POST", "/api/ad-inquiries/bulk-delete", { ids }),
    onSuccess: () => { setSelectedInquiries(new Set()); queryClient.invalidateQueries({ queryKey: ["/api/ad-inquiries"] }); },
    onError: () => toast({ title: "Bulk delete failed", variant: "destructive" }),
  });
  const replyInquiryMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => apiRequest("POST", `/api/ad-inquiries/${id}/reply`, { replyText: text }),
    onSuccess: () => { setReplyingId(null); setReplyText(""); toast({ title: "Reply sent" }); },
    onError: (e: Error) => toast({ title: "Reply failed", description: e.message, variant: "destructive" }),
  });

  const exportCSV = (tab: typeof inboxTab) => {
    let headers: string[];
    let rows: (string | number)[][];
    let filename: string;
    if (tab === "geezees") {
      if (!geezeesMessages.length) return;
      headers = ["ID", "From User ID", "Message", "Emoji", "Date"];
      rows = geezeesMessages.map((m) => [m.id, m.fromUserId, `"${(m.messageText ?? "").replace(/"/g, '""')}"`, m.emojiReaction ?? "", new Date(m.createdAt).toLocaleString()]);
      filename = `gigzito-geezees-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (tab === "comments") {
      if (!videoComments.length) return;
      headers = ["ID", "Author", "Video", "Comment", "Date"];
      rows = videoComments.map((c) => [c.id, `"${(c.authorName ?? "").replace(/"/g, '""')}"`, `"${(c.listingTitle ?? "").replace(/"/g, '""')}"`, `"${c.commentText.replace(/"/g, '""')}"`, new Date(c.createdAt).toLocaleString()]);
      filename = `gigzito-video-comments-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      if (!adInquiries.length) return;
      headers = ["ID", "Name", "Email", "Message", "Date"];
      rows = adInquiries.map((i) => [i.id, `"${(i.viewerName ?? "").replace(/"/g, '""')}"`, `"${(i.viewerEmail ?? "").replace(/"/g, '""')}"`, `"${(i.viewerMessage ?? "").replace(/"/g, '""')}"`, new Date(i.createdAt).toLocaleString()]);
      filename = `gigzito-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    }
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLeadsCSV = () => {
    if (!leads.length) return;
    const headers = ["Name", "Username", "Email", "Location"];
    const rows = leads.map((l) => {
      const isUS = (l as any).viewerCountry === "United States";
      const location = isUS
        ? [(l as any).viewerState, (l as any).viewerCity].filter(Boolean).join(", ")
        : [(l as any).viewerCountry, (l as any).viewerCity].filter(Boolean).join(", ");
      return [
        `"${(l.firstName ?? "").replace(/"/g, '""')}"`,
        `"${((l as any).viewerUsername ?? "").replace(/"/g, '""')}"`,
        `"${(l.email ?? "").replace(/"/g, '""')}"`,
        `"${location.replace(/"/g, '""')}"`,
      ];
    });
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

  const appealMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/listings/${id}/appeal`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings/mine"] });
      toast({ title: "Appeal submitted", description: "Your appeal is under review. We'll notify you when we have a decision." });
    },
    onError: (err: any) => toast({ title: "Appeal failed", description: err.message, variant: "destructive" }),
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
  if (!user) return (
    <div className="min-h-screen bg-black">
      <Navbar />
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* ── Broadcast Modal Overlay ── */}
      {showBroadcast && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
          data-testid="modal-broadcast"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0a0a0a] border border-[#222] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#ff2b2b]" />
                <h2 className="text-sm font-bold text-white">Send Broadcast</h2>
              </div>
              <button onClick={() => { setShowBroadcast(false); setBcSubject(""); setBcBody(""); }} data-testid="button-close-broadcast">
                <XIcon className="h-4 w-4 text-[#555]" />
              </button>
            </div>
            <p className="text-[11px] text-[#555]">
              This message will be emailed to all {audienceData?.count ?? 0} subscriber{(audienceData?.count ?? 0) !== 1 ? "s" : ""} in your audience.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block mb-1">Subject *</label>
                <Input
                  placeholder="e.g. Big announcement — don't miss this"
                  value={bcSubject} onChange={(e) => setBcSubject(e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white"
                  data-testid="input-broadcast-subject"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block mb-1">Message *</label>
                <Textarea
                  placeholder="Write your message..."
                  value={bcBody} onChange={(e) => setBcBody(e.target.value)}
                  rows={5}
                  className="bg-[#111] border-[#2a2a2a] text-white resize-none"
                  data-testid="input-broadcast-body"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowBroadcast(false); setBcSubject(""); setBcBody(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#888] border border-[#2a2a2a] hover:border-[#444] transition-all"
                data-testid="button-cancel-broadcast"
              >Cancel</button>
              <button
                onClick={() => {
                  if (!bcSubject.trim() || !bcBody.trim()) { toast({ title: "Subject and message are required", variant: "destructive" }); return; }
                  broadcastMutation.mutate({ subject: bcSubject, body: bcBody });
                }}
                disabled={broadcastMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#ff2b2b,#cc0000)" }}
                data-testid="button-send-broadcast"
              >
                {broadcastMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</> : <><Send className="h-3.5 w-3.5" /> Send Now</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Return to Main + Admin Console + Sign Out */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-main">
              <ChevronLeft className="h-3.5 w-3.5" />
              Return to Main
            </button>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/10 rounded-full px-3 py-1.5 transition-colors"
                data-testid="button-admin-console-dashboard"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Console
              </button>
            )}
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/70 hover:bg-red-500/10 rounded-full px-3 py-1.5 transition-colors"
              data-testid="button-sign-out-dashboard"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-white" data-testid="text-dashboard-title">My Dashboard</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate("/advertise")}
              className="h-8 px-3 text-xs font-bold gap-1 bg-[#111] hover:bg-[#1a1a1a] text-white rounded-xl border border-[#2a2a2a]"
              data-testid="button-dashboard-advertise"
            >
              <Megaphone className="h-3.5 w-3.5 text-[#ff2b2b]" />
              Advertise
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/card-editor")}
              className="h-8 px-3 text-xs font-bold gap-1 bg-[#111] hover:bg-[#1a1a1a] text-white rounded-xl border border-purple-700/60"
              data-testid="button-my-geezee-card"
            >
              <CreditCard className="h-3.5 w-3.5 text-purple-400" />
              My GeeZee Card
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/provider/profile")}
              className="h-8 px-3 text-xs bg-[#111] hover:bg-[#1a1a1a] text-white font-semibold rounded-xl border border-[#2a2a2a]"
              data-testid="button-my-profile"
            >
              <UserCircle className="h-3.5 w-3.5 mr-1 text-[#ff2b2b]" />
              My Profile
            </Button>
          </div>
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

        {/* Invite card — visible to all users */}
        <InviteCard />

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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">My Videos</h2>
            <Button
              size="sm"
              onClick={handlePostVideo}
              disabled={dailyStats?.capReached}
              className="h-7 px-3 text-xs font-bold gap-1"
              style={{ background: "linear-gradient(135deg,#ff2b2b,#cc0000)", color: "#fff", border: "none" }}
              data-testid="button-post-video"
            >
              <PlusCircle className="h-3 w-3" />
              Post Video
            </Button>
          </div>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[listing.status]}`} data-testid={`badge-status-${listing.id}`}>
                          {listing.status}
                        </span>
                        {(() => {
                          const scan = listing.scanStatus as string | undefined;
                          if (!scan || scan === "CLEAN") return null;
                          const b = SCAN_BADGE[scan];
                          if (!b) return null;
                          const Icon = b.icon;
                          return (
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${b.className}`} data-testid={`badge-scan-${listing.id}`}>
                              <Icon className={`w-3 h-3 ${scan === "SCANNING" ? "animate-spin" : ""}`} />
                              {b.label}
                            </span>
                          );
                        })()}
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
                      {listing.scanStatus === "FLAGGED" && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/8 border border-red-500/20 px-2.5 py-2">
                          <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {listing.scanNote && <p className="text-[11px] text-red-400/90 mb-1">{listing.scanNote}</p>}
                            <p className="text-[10px] text-red-400/60">Bif flagged this video. You can appeal if you believe this is incorrect.</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={appealMutation.isPending}
                            onClick={() => appealMutation.mutate(listing.id)}
                            className="h-6 px-2.5 text-[10px] font-semibold shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                            data-testid={`button-appeal-${listing.id}`}
                          >
                            Appeal
                          </Button>
                        </div>
                      )}
                      {listing.scanStatus === "APPEAL_DENIED" && listing.scanNote && (
                        <p className="text-[11px] text-red-500/70 mt-1.5 pl-0.5">Appeal denied: {listing.scanNote}</p>
                      )}
                      {listing.scanStatus === "SCANNING" && (
                        <p className="text-[10px] text-blue-400/60 mt-1.5 pl-0.5">Bif is scanning your video for reputation issues. This usually takes under a minute.</p>
                      )}
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

        {/* ─── GZMusic ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4" style={{ color: "#ff7a00" }} />
              <h2 className="text-sm font-semibold text-white">GZMusic</h2>
              {myMusicTracks.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#ff7a0018", color: "#ff7a00", border: "1px solid #ff7a0035" }}>
                  {myMusicTracks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {myMusicTracks.length > 0 && (
                <button onClick={() => navigate("/gz-music")} className="text-xs transition-colors" style={{ color: "#ff7a00" }} data-testid="link-gz100-chart">
                  GZ100 Chart
                </button>
              )}
              <button onClick={() => navigate("/gz-music/upload")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all" style={{ background: "linear-gradient(135deg, #ff7a00, #cc5200)", color: "#fff" }} data-testid="button-upload-track">
                <UploadIcon className="h-3 w-3" /> Upload Track
              </button>
            </div>
          </div>

          {musicLoading ? (
            <div className="space-y-2">
              <div className="h-16 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
              <div className="h-16 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
            </div>
          ) : myMusicTracks.length === 0 ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-music">
              <Music className="h-7 w-7 mx-auto mb-3" style={{ color: "#333" }} />
              <p className="text-[#555] text-sm font-semibold">No tracks yet</p>
              <p className="text-[#444] text-xs mt-1 mb-4">Upload your music to the GZ100 chart and announce it to your audience.</p>
              <button onClick={() => navigate("/gz-music/upload")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all" style={{ background: "linear-gradient(135deg, #ff7a00, #cc5200)", color: "#fff", boxShadow: "0 4px 18px rgba(255,122,0,0.35)" }} data-testid="button-upload-first-track">
                <UploadIcon className="h-3.5 w-3.5" /> Upload Your First Track
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myMusicTracks.map((track) => (
                <div key={track.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e]" data-testid={`card-music-track-${track.id}`}>
                  {(track as any).coverUrl ? (
                    <img src={(track as any).coverUrl} alt={track.title} className="w-10 h-10 rounded-lg object-cover border border-[#2a2a2a] shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#ff7a0015", border: "1px solid #ff7a0030" }}>
                      <Music className="h-4 w-4" style={{ color: "#ff7a00" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#888]">{track.artist}</span>
                      <span className="text-[10px] text-[#444]">·</span>
                      <span className="text-[11px] text-[#666]">{track.genre}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(track as any).downloadEnabled && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#ff7a0015", color: "#ff7a00", border: "1px solid #ff7a0030" }}>DL</span>
                    )}
                    {(track as any).licenseFileUrl && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#3b82f615", color: "#60a5fa", border: "1px solid #3b82f630" }}>LIC</span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-[#555]">
                      <Headphones className="h-3 w-3" />
                      {track.likeCount ?? 0}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate("/gz-music")} className="w-full text-center text-xs py-2 rounded-xl border transition-colors" style={{ border: "1px solid #1e1e1e", background: "#080808", color: "#555" }} data-testid="button-view-full-chart">
                View full GZ100 Chart →
              </button>
            </div>
          )}
        </div>

        {/* ─── ZeeMotion Feed ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">ZeeMotion Feed</h2>
              {zeeFeed.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                  {zeeFeed.length}
                </span>
              )}
            </div>
            <Link href="/card-editor">
              <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors" data-testid="btn-go-card-editor">
                + Post ZeeMotion
              </button>
            </Link>
          </div>

          {zeeFeed.length === 0 ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-zeefeed">
              <Zap className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-sm">No ZeeMotion updates yet.</p>
              <p className="text-[#444] text-xs mt-1">Follow GeeZee cards to see their updates here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {zeeFeed.map((m) => {
                const ago = (d: string | Date) => {
                  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
                  if (s < 60) return "just now";
                  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
                  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
                  return `${Math.floor(s / 86400)}d ago`;
                };
                return (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e]" data-testid={`card-zeemotion-${m.id}`}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.displayName ?? ""} className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a] shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-white">{m.displayName ?? m.username ?? "Unknown"}</span>
                        <span className="text-[10px] text-[#444]">·</span>
                        <span className="text-[10px] text-[#444]">{ago(m.createdAt)}</span>
                      </div>
                      {m.text && <p className="text-xs text-[#bbb] leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                      {m.mediaUrl && (
                        <img
                          src={m.mediaUrl}
                          alt="ZeeMotion media"
                          className="mt-2 rounded-lg max-h-40 border border-[#222] object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Your Audience ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#ff2b2b]" />
              <h2 className="text-sm font-semibold text-white" data-testid="text-audience-title">Your Audience</h2>
              {(audienceData?.count ?? 0) > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#ff2b2b22", color: "#ff2b2b", border: "1px solid #ff2b2b44" }}
                  data-testid="badge-audience-count"
                >
                  {audienceData!.count}
                </span>
              )}
            </div>
            {(audienceData?.count ?? 0) > 0 && (
              <button
                onClick={() => setShowBroadcast(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg,#ff2b2b,#cc0000)", color: "#fff" }}
                data-testid="button-broadcast-audience"
              >
                <Send className="h-3 w-3" />
                Broadcast
              </button>
            )}
          </div>

          {!audienceData ? (
            <Skeleton className="h-20 w-full bg-[#111] rounded-xl" />
          ) : (audienceData.count ?? 0) === 0 || !Array.isArray(audienceData.members) ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-audience">
              <Users className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-sm">No subscribers yet. Every CTA lead with an email is automatically added to your broadcast list.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4" data-testid="card-audience-summary">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl text-xl font-black"
                  style={{ background: "linear-gradient(135deg,#ff2b2b22,#ff2b2b08)", border: "1px solid #ff2b2b33", color: "#ff2b2b" }}
                >
                  {audienceData.count}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Broadcast-Ready Subscribers</p>
                  <p className="text-[#555] text-xs">These contacts receive your email broadcasts directly.</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {audienceData.members.slice(0, 20).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#161616] last:border-0" data-testid={`row-audience-${m.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-[#666] font-bold">{(m.leadName ?? "?").charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">{m.leadName ?? "—"}</p>
                        <p className="text-[10px] text-[#555] truncate">{m.leadEmail}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-[#444] shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {audienceData.count > 20 && (
                  <p className="text-center text-[10px] text-[#444] pt-1">+{audienceData.count - 20} more</p>
                )}
              </div>
            </div>
          )}

          {/* Past broadcasts */}
          {audienceBroadcasts.length > 0 && (
            <div className="mt-3 rounded-xl bg-[#070707] border border-[#181818] p-3" data-testid="card-past-broadcasts">
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider mb-2">Sent Broadcasts</p>
              <div className="space-y-2">
                {audienceBroadcasts.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2" data-testid={`row-broadcast-${b.id}`}>
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">{b.subject}</p>
                      <p className="text-[10px] text-[#555]">{b.recipientCount} sent · {new Date(b.sentAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Presenter Contacts ─── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-pink-400" />
            <h2 className="text-sm font-semibold text-white" data-testid="text-presenter-contacts-title">My Audience Contacts</h2>
            {presenterContacts.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#ec489922", color: "#f472b6", border: "1px solid #ec489944" }}>
                {presenterContacts.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#555] mb-3">Users who opted in to receive your contact messages when they engaged with your card.</p>
          {presenterContacts.length === 0 ? (
            <div className="rounded-xl bg-[#070707] border border-[#181818] p-4 text-center" data-testid="card-no-presenter-contacts">
              <Bell className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-xs">No subscribers yet. When users engage with your GeeZee card and opt in, they'll appear here.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#070707] border border-[#181818] p-3" data-testid="card-presenter-contacts">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">{presenterContacts.length} Subscriber{presenterContacts.length !== 1 ? "s" : ""}</p>
                <button
                  onClick={() => {
                    const rows = [["Name", "Username", "Email", "Opted In"]];
                    presenterContacts.forEach(c => rows.push([c.displayName ?? "", c.username ?? "", c.email, new Date(c.optedInAt).toLocaleDateString()]));
                    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
                    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "presenter_contacts.csv"; a.click();
                  }}
                  className="text-[10px] text-[#555] hover:text-white flex items-center gap-1 transition-colors"
                  data-testid="btn-export-presenter-contacts"
                >
                  <Download className="h-3 w-3" /> Export CSV
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}>
                {presenterContacts.slice(0, 50).map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#111] last:border-0" data-testid={`row-presenter-contact-${c.id}`}>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-pink-300">{(c.displayName ?? c.username ?? c.email)[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white font-medium truncate">{c.displayName ?? c.username ?? c.email}</p>
                      <p className="text-[10px] text-[#555] truncate">{c.email}</p>
                    </div>
                    <span className="text-[9px] text-[#444] shrink-0">{new Date(c.optedInAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {presenterContacts.length > 50 && (
                  <p className="text-center text-[10px] text-[#444] pt-1">+{presenterContacts.length - 50} more (export CSV for full list)</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Geo Target Campaigns ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white" data-testid="text-geocampaigns-title">Geo Campaigns</h2>
              {geoCampaigns.filter((c) => c.status === "ACTIVE").length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {geoCampaigns.filter((c) => c.status === "ACTIVE").length} active
                </span>
              )}
            </div>
            <button
              onClick={() => setShowGeoForm(!showGeoForm)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all"
              data-testid="button-new-geo-campaign"
            >
              {showGeoForm ? "Cancel" : "+ New Campaign"}
            </button>
          </div>

          {showGeoForm && (
            <div className="rounded-xl bg-[#0a0a0a] border border-amber-400/20 p-4 mb-3 space-y-3" data-testid="form-geo-campaign">
              <Input
                placeholder="Campaign title *"
                value={geoTitle} onChange={(e) => setGeoTitle(e.target.value)}
                className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                data-testid="input-geo-title"
              />
              <Textarea
                placeholder="Offer / message (e.g. '20% off when you're within 5 miles') *"
                value={geoOffer} onChange={(e) => setGeoOffer(e.target.value)}
                rows={2}
                className="bg-[#111] border-[#2a2a2a] text-white text-sm resize-none"
                data-testid="input-geo-offer"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" value={geoCity} onChange={(e) => setGeoCity(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white text-sm" data-testid="input-geo-city" />
                <Input placeholder="State / Province" value={geoState} onChange={(e) => setGeoState(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white text-sm" data-testid="input-geo-state" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Country (e.g. US)" value={geoCountry} onChange={(e) => setGeoCountry(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white text-sm" data-testid="input-geo-country" />
                <Input placeholder="Radius (miles)" type="number" value={geoRadius} onChange={(e) => setGeoRadius(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white text-sm" data-testid="input-geo-radius" />
              </div>
              <Input placeholder="Image URL (optional)" value={geoImageUrl} onChange={(e) => setGeoImageUrl(e.target.value)} className="bg-[#111] border-[#2a2a2a] text-white text-sm" data-testid="input-geo-image-url" />
              <button
                onClick={() => {
                  if (!geoTitle.trim() || !geoOffer.trim()) { toast({ title: "Title and offer are required", variant: "destructive" }); return; }
                  createCampaignMutation.mutate({ title: geoTitle, offer: geoOffer, radiusMiles: parseInt(geoRadius) || 10, city: geoCity || null, state: geoState || null, country: geoCountry || "US", imageUrl: geoImageUrl || null });
                }}
                disabled={createCampaignMutation.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-black transition-all"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                data-testid="button-submit-geo-campaign"
              >
                {createCampaignMutation.isPending ? "Creating..." : "Launch Campaign"}
              </button>
            </div>
          )}

          {geoCampaigns.length === 0 && !showGeoForm ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-geo-campaigns">
              <Globe className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-sm">No geo campaigns yet. Target customers by location with a radius-based campaign.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {geoCampaigns.map((c) => (
                <div key={c.id} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3" data-testid={`card-geo-campaign-${c.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                      <p className="text-[11px] text-[#888] mt-0.5">{c.offer}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        c.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        c.status === "PAUSED" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >{c.status}</span>
                  </div>
                  {(c.city || c.state || c.country) && (
                    <p className="text-[10px] text-[#555] flex items-center gap-1 mb-2">
                      <MapPin className="h-2.5 w-2.5" />
                      {[c.city, c.state, c.country].filter(Boolean).join(", ")} · {c.radiusMiles}mi radius
                    </p>
                  )}
                  <div className="flex gap-2">
                    {c.status !== "ACTIVE" && (
                      <button
                        onClick={() => updateCampaignStatusMutation.mutate({ id: c.id, status: "ACTIVE" })}
                        disabled={updateCampaignStatusMutation.isPending}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
                        data-testid={`button-activate-campaign-${c.id}`}
                      >Activate</button>
                    )}
                    {c.status === "ACTIVE" && (
                      <button
                        onClick={() => updateCampaignStatusMutation.mutate({ id: c.id, status: "PAUSED" })}
                        disabled={updateCampaignStatusMutation.isPending}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                        data-testid={`button-pause-campaign-${c.id}`}
                      >Pause</button>
                    )}
                    {c.status !== "ENDED" && (
                      <button
                        onClick={() => updateCampaignStatusMutation.mutate({ id: c.id, status: "ENDED" })}
                        disabled={updateCampaignStatusMutation.isPending}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        data-testid={`button-end-campaign-${c.id}`}
                      >End</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Inbox section ─────────────────────────────────────────────── */}
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-[#ff2b2b]" />
              <h2 className="text-sm font-semibold text-white" data-testid="text-inbox-title">Inbox</h2>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff2b2b] text-white" data-testid="badge-inbox-unread">{totalUnread}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => exportCSV(inboxTab)}
              className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg h-7 px-2.5"
              data-testid="button-export-inbox-csv"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Export CSV
            </Button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-3 p-1 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
            {(["geezees", "comments", "inquiries"] as const).map((tab) => {
              const labels: Record<typeof tab, string> = { geezees: "GeeZees", comments: "Video Comments", inquiries: "Inquiries" };
              const unreadCounts = { geezees: unreadGeezees, comments: unreadComments, inquiries: unreadInquiries };
              const u = unreadCounts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => { setInboxTab(tab); setSelectedGeezees(new Set()); setSelectedComments(new Set()); setSelectedInquiries(new Set()); }}
                  data-testid={`tab-inbox-${tab}`}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 rounded-lg transition-all ${
                    inboxTab === tab ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]"
                  }`}
                >
                  {labels[tab]}
                  {u > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inboxTab === tab ? "bg-[#ff2b2b] text-white" : "bg-[#ff2b2b]/20 text-[#ff2b2b]"}`}>{u}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GeeZees tab */}
          {inboxTab === "geezees" && (
            geezeesLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full bg-[#111] rounded-xl" />)}</div>
            ) : geezeesMessages.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-geezees">
                <Inbox className="h-5 w-5 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">No GeeZee messages yet. When someone engages with your Gigness Card, messages will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#555] hover:text-[#888]" data-testid="checkbox-select-all-geezees">
                    <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5"
                      checked={selectedGeezees.size === geezeesMessages.length && geezeesMessages.length > 0}
                      onChange={(e) => setSelectedGeezees(e.target.checked ? new Set(geezeesMessages.map((m) => m.id)) : new Set())}
                    />
                    Select all
                  </label>
                  {selectedGeezees.size > 0 && (
                    <button
                      onClick={() => bulkDeleteGeezeeMutation.mutate(Array.from(selectedGeezees))}
                      disabled={bulkDeleteGeezeeMutation.isPending}
                      className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#ff2b2b]/10 border border-[#ff2b2b]/30 text-[#ff4444] hover:bg-[#ff2b2b]/20 transition-all disabled:opacity-50"
                      data-testid="button-bulk-delete-geezees"
                    >Delete selected ({selectedGeezees.size})</button>
                  )}
                </div>
                {geezeesMessages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => { if (!m.isRead) markGeezeeMutation.mutate(m.id); }}
                    className={`rounded-xl border p-3.5 transition-colors ${m.isRead ? "bg-[#0b0b0b] border-[#1e1e1e]" : "bg-[#110808] border-[#ff2b2b]/20"} ${selectedGeezees.has(m.id) ? "ring-1 ring-[#ff2b2b]/40" : ""}`}
                    data-testid={`card-geezee-${m.id}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5 mt-0.5 shrink-0 cursor-pointer"
                        checked={selectedGeezees.has(m.id)}
                        onChange={() => toggleGeezee(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-geezee-${m.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {m.emojiReaction && <span className="text-xl mr-2">{m.emojiReaction}</span>}
                            {m.messageText && <p className="text-sm text-white inline">{m.messageText}</p>}
                            <p className="text-[10px] text-[#555] mt-1">from user #{m.fromUserId}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!m.isRead && <span className="w-2 h-2 rounded-full bg-[#ff2b2b]" />}
                            <span className="text-[10px] text-[#444]">{new Date(m.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setReplyingId(replyingId === `geezee-${m.id}` ? null : `geezee-${m.id}`); setReplyText(""); }}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all"
                            data-testid={`button-reply-geezee-${m.id}`}
                          >Reply</button>
                          <button
                            onClick={() => deleteGeezeeMutation.mutate(m.id)}
                            disabled={deleteGeezeeMutation.isPending}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#ff4444]/70 hover:text-[#ff4444] hover:border-[#ff4444]/30 transition-all"
                            data-testid={`button-delete-geezee-${m.id}`}
                          >Delete</button>
                        </div>
                        {replyingId === `geezee-${m.id}` && (
                          <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply…"
                              rows={2}
                              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white resize-none outline-none focus:border-[#444]"
                              data-testid={`input-reply-geezee-${m.id}`}
                            />
                            <button
                              onClick={() => replyGeezeeMutation.mutate({ id: m.id, text: replyText })}
                              disabled={!replyText.trim() || replyGeezeeMutation.isPending}
                              className="self-end text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#ff2b2b] text-white disabled:opacity-40"
                              data-testid={`button-send-reply-geezee-${m.id}`}
                            >Send</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Video Comments tab */}
          {inboxTab === "comments" && (
            commentsLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full bg-[#111] rounded-xl" />)}</div>
            ) : videoComments.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-video-comments">
                <MessageSquare className="h-5 w-5 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">No video comments yet. Comments left on your listings will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#555] hover:text-[#888]" data-testid="checkbox-select-all-comments">
                    <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5"
                      checked={selectedComments.size === videoComments.length && videoComments.length > 0}
                      onChange={(e) => setSelectedComments(e.target.checked ? new Set(videoComments.map((c) => c.id)) : new Set())}
                    />
                    Select all
                  </label>
                  {selectedComments.size > 0 && (
                    <button
                      onClick={() => bulkDeleteCommentMutation.mutate(Array.from(selectedComments))}
                      disabled={bulkDeleteCommentMutation.isPending}
                      className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#ff2b2b]/10 border border-[#ff2b2b]/30 text-[#ff4444] hover:bg-[#ff2b2b]/20 transition-all disabled:opacity-50"
                      data-testid="button-bulk-delete-comments"
                    >Delete selected ({selectedComments.size})</button>
                  )}
                </div>
                {videoComments.map((c) => {
                  const geo = [(c as any).viewerCity, (c as any).viewerState, (c as any).viewerCountry].filter(Boolean).join(", ");
                  return (
                    <div
                      key={c.id}
                      onClick={() => { if (!c.isRead) markCommentMutation.mutate(c.id); }}
                      className={`rounded-xl border p-3.5 transition-colors ${c.isRead ? "bg-[#0b0b0b] border-[#1e1e1e]" : "bg-[#080b11] border-blue-500/20"} ${selectedComments.has(c.id) ? "ring-1 ring-[#ff2b2b]/40" : ""}`}
                      data-testid={`card-comment-${c.id}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5 mt-0.5 shrink-0 cursor-pointer"
                          checked={selectedComments.has(c.id)}
                          onChange={() => toggleComment(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-comment-${c.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-white">
                              {c.authorName}
                              {(c as any).viewerUsername && <span className="text-[#555] font-normal text-xs ml-1">@{(c as any).viewerUsername}</span>}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              {!c.isRead && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                              <span className="text-[10px] text-[#444]">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {c.listingTitle && <p className="text-[10px] text-[#ff2b2b] mb-1">{c.listingTitle}</p>}
                          <p className="text-xs text-[#888] mb-1">{c.commentText}</p>
                          <div className="text-[10px] text-[#555] flex flex-wrap gap-x-3 mb-2">
                            {(c as any).viewerEmail && <span>✉ {(c as any).viewerEmail}</span>}
                            {geo && <span>📍 {geo}</span>}
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setReplyingId(replyingId === `comment-${c.id}` ? null : `comment-${c.id}`); setReplyText(""); }}
                              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all"
                              data-testid={`button-reply-comment-${c.id}`}
                            >Reply</button>
                            <button
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                              disabled={deleteCommentMutation.isPending}
                              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#ff4444]/70 hover:text-[#ff4444] hover:border-[#ff4444]/30 transition-all"
                              data-testid={`button-delete-comment-${c.id}`}
                            >Delete</button>
                          </div>
                          {replyingId === `comment-${c.id}` && (
                            <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${(c as any).viewerEmail ? c.authorName : "commenter (no email on file)"}…`}
                                rows={2}
                                disabled={!(c as any).viewerEmail}
                                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white resize-none outline-none focus:border-[#444] disabled:opacity-40"
                                data-testid={`input-reply-comment-${c.id}`}
                              />
                              <button
                                onClick={() => replyCommentMutation.mutate({ id: c.id, text: replyText })}
                                disabled={!replyText.trim() || replyCommentMutation.isPending || !(c as any).viewerEmail}
                                className="self-end text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#ff2b2b] text-white disabled:opacity-40"
                                data-testid={`button-send-reply-comment-${c.id}`}
                              >Send</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Inquiries tab */}
          {inboxTab === "inquiries" && (
            inquiriesLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full bg-[#111] rounded-xl" />)}</div>
            ) : adInquiries.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-inquiries">
                <Mail className="h-5 w-5 text-[#333] mx-auto mb-2" />
                <p className="text-[#555] text-sm">No ad inquiries yet. When someone contacts you via a sponsor ad, their message appears here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#555] hover:text-[#888]" data-testid="checkbox-select-all-inquiries">
                    <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5"
                      checked={selectedInquiries.size === adInquiries.length && adInquiries.length > 0}
                      onChange={(e) => setSelectedInquiries(e.target.checked ? new Set(adInquiries.map((i) => i.id)) : new Set())}
                    />
                    Select all
                  </label>
                  {selectedInquiries.size > 0 && (
                    <button
                      onClick={() => bulkDeleteInquiryMutation.mutate(Array.from(selectedInquiries))}
                      disabled={bulkDeleteInquiryMutation.isPending}
                      className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-[#ff2b2b]/10 border border-[#ff2b2b]/30 text-[#ff4444] hover:bg-[#ff2b2b]/20 transition-all disabled:opacity-50"
                      data-testid="button-bulk-delete-inquiries"
                    >Delete selected ({selectedInquiries.size})</button>
                  )}
                </div>
                {adInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    onClick={() => { if (!inq.isRead) markInquiryMutation.mutate(inq.id); }}
                    className={`rounded-xl border p-3.5 transition-colors ${inq.isRead ? "bg-[#0b0b0b] border-[#1e1e1e]" : "bg-[#080b08] border-green-500/20"} ${selectedInquiries.has(inq.id) ? "ring-1 ring-[#ff2b2b]/40" : ""}`}
                    data-testid={`card-inquiry-${inq.id}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input type="checkbox" className="accent-[#ff2b2b] w-3.5 h-3.5 mt-0.5 shrink-0 cursor-pointer"
                        checked={selectedInquiries.has(inq.id)}
                        onChange={() => toggleInquiry(inq.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-inquiry-${inq.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {inq.viewerName}
                              {inq.viewerUsername && <span className="text-[#888] font-normal ml-1.5">@{inq.viewerUsername}</span>}
                            </p>
                            {(inq.viewerCity || inq.viewerState || inq.viewerCountry) && (
                              <p className="text-[10px] text-[#555] flex items-center gap-1 mt-0.5">
                                <span>📍</span>
                                {[inq.viewerCity, inq.viewerState, inq.viewerCountry].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!inq.isRead && <span className="w-2 h-2 rounded-full bg-green-400" />}
                            <span className="text-[10px] text-[#444]">{new Date(inq.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {inq.viewerEmail && (
                          <p className="text-xs text-[#555] flex items-center gap-1 mb-1.5">
                            <Mail className="h-3 w-3" />{inq.viewerEmail}
                          </p>
                        )}
                        <p className="text-xs text-[#aaa] mb-2">{inq.viewerMessage}</p>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setReplyingId(replyingId === `inquiry-${inq.id}` ? null : `inquiry-${inq.id}`); setReplyText(""); }}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all"
                            data-testid={`button-reply-inquiry-${inq.id}`}
                          >Reply</button>
                          <button
                            onClick={() => deleteInquiryMutation.mutate(inq.id)}
                            disabled={deleteInquiryMutation.isPending}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#ff4444]/70 hover:text-[#ff4444] hover:border-[#ff4444]/30 transition-all"
                            data-testid={`button-delete-inquiry-${inq.id}`}
                          >Delete</button>
                        </div>
                        {replyingId === `inquiry-${inq.id}` && (
                          <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${inq.viewerEmail ? inq.viewerName : "sender (no email on file)"}…`}
                              rows={2}
                              disabled={!inq.viewerEmail}
                              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white resize-none outline-none focus:border-[#444] disabled:opacity-40"
                              data-testid={`input-reply-inquiry-${inq.id}`}
                            />
                            <button
                              onClick={() => replyInquiryMutation.mutate({ id: inq.id, text: replyText })}
                              disabled={!replyText.trim() || replyInquiryMutation.isPending || !inq.viewerEmail}
                              className="self-end text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#ff2b2b] text-white disabled:opacity-40"
                              data-testid={`button-send-reply-inquiry-${inq.id}`}
                            >Send</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

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
            <div className="space-y-1">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full bg-[#111] rounded" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-leads">
              <Inbox className="h-6 w-6 text-[#333] mx-auto mb-2" />
              <p className="text-[#555] text-sm">No CTA leads yet. When visitors click a CTA button on your listings, their contact info will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#1e1e1e]" data-testid="table-cta-leads">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="bg-[#111] border-b border-[#1e1e1e]">
                    {["Name", "Username", "Email", "Location"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[#555] font-semibold uppercase tracking-wider whitespace-nowrap border-r border-[#1a1a1a] last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => {
                    const isUS = (lead as any).viewerCountry === "United States";
                    const location = isUS
                      ? [(lead as any).viewerState, (lead as any).viewerCity].filter(Boolean).join(", ")
                      : [(lead as any).viewerCountry, (lead as any).viewerCity].filter(Boolean).join(", ");
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b border-[#111] ${idx % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#070707]"} hover:bg-[#0f0f0f] transition-colors`}
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <td className="px-3 py-1.5 text-white whitespace-nowrap border-r border-[#111]">{lead.firstName}</td>
                        <td className="px-3 py-1.5 text-[#888] whitespace-nowrap border-r border-[#111]">{(lead as any).viewerUsername ? `@${(lead as any).viewerUsername}` : "—"}</td>
                        <td className="px-3 py-1.5 text-[#aaa] whitespace-nowrap border-r border-[#111]">{lead.email || "—"}</td>
                        <td className="px-3 py-1.5 text-[#666] whitespace-nowrap">{location || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

export default function ProviderDashboard() {
  return (
    <DashboardErrorBoundary>
      <ProviderDashboardInner />
    </DashboardErrorBoundary>
  );
}
