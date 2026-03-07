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
  Inbox, Zap, Clock, ChevronUp, Calendar,
} from "lucide-react";
import type { ListingWithProvider, ProfileCompletionStatus, ProviderProfile, Lead, GigJackWithProvider, GigJackSlot } from "@shared/schema";

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

const gjFormSchema = z.object({
  artworkUrl:          z.string().url("Must be a valid image URL (include https://)"),
  offerTitle:          z.string().min(5, "Min 5 characters").max(120, "Max 120 characters"),
  tagline:             z.string().max(120, "Max 120 characters").optional().or(z.literal("")),
  category:            z.string().min(1, "Select a category"),
  ctaLink:             z.string().url("Must be a valid URL (include https://)"),
  scheduledAt:         z.string().min(1, "Select a time slot"),
  flashDurationSeconds: z.coerce.number().int().min(5).max(10),
});

type GJFormValues = z.infer<typeof gjFormSchema>;

function GigJackCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data: myGigJacks = [], isLoading: gjLoading } = useQuery<GigJackWithProvider[]>({
    queryKey: ["/api/gigjacks/mine"],
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery<GigJackSlot[]>({
    queryKey: ["/api/gigjacks/slots"],
    enabled: showForm,
  });

  const uniqueDates = [...new Set(slots.map((s) => s.dateLabel))];
  const slotsForDate = slots.filter((s) => s.dateLabel === selectedDate && s.available);

  const form = useForm<GJFormValues>({
    resolver: zodResolver(gjFormSchema),
    defaultValues: {
      artworkUrl: "",
      offerTitle: "",
      tagline: "",
      category: "",
      ctaLink: "",
      scheduledAt: "",
      flashDurationSeconds: 7,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: GJFormValues) => {
      const res = await apiRequest("POST", "/api/gigjacks/submit", {
        ...data,
        tagline: data.tagline || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "GigJack submitted!", description: "Pending admin review before it goes live." });
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/mine"] });
      setShowForm(false);
      form.reset();
      setSelectedDate("");
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Zap size={15} style={{ color: "#ff2b2b" }} />
          <h2 className="text-sm font-semibold text-white" data-testid="text-gigjack-center-title">GigJack Center</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs border border-[#2a2a2a] hover:border-[#444] rounded-lg h-7 px-2.5 text-[#888] hover:text-white"
          data-testid="button-toggle-gigjack-form"
        >
          {showForm ? <><ChevronUp className="h-3 w-3 mr-1" /> Cancel</> : <><PlusCircle className="h-3 w-3 mr-1" /> New GigJack</>}
        </Button>
      </div>

      {/* Submission form */}
      {showForm && (
        <div
          style={{
            background: "rgba(255,43,43,0.03)",
            border: "1px solid rgba(255,43,43,0.18)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "12px",
          }}
          data-testid="form-gigjack-center"
        >
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "14px", lineHeight: "1.5" }}>
            GigJacks are 5–10 second flash events that appear platform-wide when scheduled. Submit for review and pick a calendar slot.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">

              <FormField control={form.control} name="artworkUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>Logo / Artwork URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      data-testid="input-gj-artwork-url"
                      style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Paste a direct image link (e.g. from Imgur). Square images work best.</p>
                  <FormMessage />
                  {field.value && (
                    <img
                      src={field.value}
                      alt="preview"
                      style={{ width: "72px", height: "72px", borderRadius: "8px", objectFit: "cover", marginTop: "6px" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </FormItem>
              )} />

              <FormField control={form.control} name="offerTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>Offer Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 50% off — today only!"
                      data-testid="input-gj-offer-title"
                      style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="tagline" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>Tagline <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>(optional)</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Short punchy description…"
                      data-testid="input-gj-tagline"
                      style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "12px" }}>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-gj-category"
                          style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                        >
                          <SelectValue placeholder="Pick one" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent style={{ background: "#0b0b0b", border: "1px solid #2a2a2a" }}>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} style={{ fontSize: "13px" }}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="flashDurationSeconds" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "12px" }}>Flash Duration</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-gj-duration"
                          style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent style={{ background: "#0b0b0b", border: "1px solid #2a2a2a" }}>
                        {[5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)} style={{ fontSize: "13px" }}>{n} seconds</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="ctaLink" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>Offer URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://yoursite.com/deal"
                      data-testid="input-gj-cta-link"
                      style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", fontSize: "13px" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Slot picker */}
              <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Calendar size={12} />
                    Schedule Slot
                  </FormLabel>
                  {slotsLoading ? (
                    <div style={{ height: "48px", background: "#111", borderRadius: "8px", border: "1px solid #222" }} />
                  ) : (
                    <div className="space-y-2">
                      {/* Date row */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {uniqueDates.map((d) => {
                          const hasAvail = slots.some((s) => s.dateLabel === d && s.available);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { setSelectedDate(d); field.onChange(""); }}
                              data-testid={`button-gj-date-${d.replace(/\s/g, "-")}`}
                              style={{
                                fontSize: "11px",
                                fontWeight: "500",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                border: selectedDate === d ? "1px solid rgba(255,43,43,0.6)" : "1px solid #2a2a2a",
                                background: selectedDate === d ? "rgba(255,43,43,0.12)" : "#0b0b0b",
                                color: selectedDate === d ? "#ff2b2b" : hasAvail ? "#888" : "#444",
                                cursor: hasAvail ? "pointer" : "not-allowed",
                                opacity: hasAvail ? 1 : 0.4,
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                      {/* Time slots */}
                      {selectedDate && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                          {slotsForDate.length === 0 ? (
                            <p style={{ fontSize: "12px", color: "#555" }}>No available slots on this date.</p>
                          ) : slotsForDate.map((s) => {
                            const t = new Date(s.iso).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
                            const isSelected = field.value === s.iso;
                            return (
                              <button
                                key={s.iso}
                                type="button"
                                onClick={() => field.onChange(s.iso)}
                                data-testid={`button-gj-slot-${s.iso}`}
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  padding: "4px 12px",
                                  borderRadius: "999px",
                                  border: isSelected ? "1px solid rgba(255,43,43,0.6)" : "1px solid #2a2a2a",
                                  background: isSelected ? "rgba(255,43,43,0.12)" : "#0b0b0b",
                                  color: isSelected ? "#ff2b2b" : "#888",
                                  cursor: "pointer",
                                }}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div
                style={{
                  background: "rgba(255,43,43,0.05)",
                  border: "1px solid rgba(255,43,43,0.12)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  lineHeight: "1.5",
                }}
              >
                Billing is currently disabled. Slot reservations are free during the beta period.
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending}
                data-testid="button-submit-gigjack"
                style={{ background: "#ff2b2b", color: "#fff", border: "none", fontWeight: 700 }}
              >
                <Zap size={14} style={{ marginRight: "6px" }} />
                {submitMutation.isPending ? "Submitting…" : "Submit GigJack for Review"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* Existing GigJacks */}
      {gjLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full bg-[#111] rounded-xl" />)}
        </div>
      ) : myGigJacks.length === 0 ? (
        <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-6 text-center" data-testid="text-no-gigjacks">
          <Zap className="h-5 w-5 text-[#333] mx-auto mb-2" />
          <p className="text-[#555] text-sm">No GigJacks yet. Submit one above to schedule a flash event.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myGigJacks.map((gj) => {
            const st = GJ_STATUS[gj.status] ?? { label: gj.status, color: "#888" };
            return (
              <div
                key={gj.id}
                className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3.5"
                data-testid={`card-gigjack-${gj.id}`}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  {gj.artworkUrl && (
                    <img
                      src={gj.artworkUrl}
                      alt={gj.offerTitle}
                      style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                      data-testid={`img-gj-artwork-${gj.id}`}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <p className="text-sm font-semibold text-white truncate" data-testid={`text-gj-title-${gj.id}`}>
                        {gj.offerTitle}
                      </p>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: st.color,
                          background: `${st.color}18`,
                          border: `1px solid ${st.color}44`,
                          borderRadius: "999px",
                          padding: "2px 7px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        data-testid={`badge-gj-status-${gj.id}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    {gj.tagline && (
                      <p className="text-xs text-[#555] mt-0.5" data-testid={`text-gj-tagline-${gj.id}`}>{gj.tagline}</p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
                      {gj.category && (
                        <span style={{ fontSize: "10px", color: "#555", background: "#111", border: "1px solid #222", borderRadius: "4px", padding: "1px 6px" }}>
                          {gj.category.replace(/_/g, " ")}
                        </span>
                      )}
                      {gj.scheduledAt && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#555" }}>
                          <Clock size={9} />
                          {new Date(gj.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", hour12: true })}
                        </span>
                      )}
                      {gj.flashDurationSeconds && (
                        <span style={{ fontSize: "10px", color: "#444" }}>{gj.flashDurationSeconds}s flash</span>
                      )}
                      <a
                        href={gj.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "#ff2b2b" }}
                        data-testid={`link-gj-cta-${gj.id}`}
                      >
                        <ExternalLink size={9} /> View offer
                      </a>
                    </div>
                    {gj.reviewNote && (
                      <p style={{ fontSize: "11px", color: "#f59e0b", marginTop: "5px" }}>Note: {gj.reviewNote}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProviderDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Today's posts", value: dailyStats.count, testId: "stat-today-count" },
              { label: "My listings",   value: listings.length,  testId: "stat-my-listings" },
              { label: "Slots left",    value: dailyStats.maxCap - dailyStats.count, testId: "stat-cap" },
            ].map(({ label, value, testId }) => (
              <div key={testId} className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-3 text-center" data-testid={testId}>
                <p className="text-2xl font-bold text-white">{value}</p>
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
                      <p className="text-xs text-[#555] mt-0.5">{listing.durationSeconds}s · $3.00 paid</p>
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-[#ff1a1a]/60 hover:text-[#ff1a1a]" data-testid={`button-remove-${listing.id}`} onClick={() => statusMutation.mutate({ id: listing.id, status: "REMOVED" })} disabled={statusMutation.isPending || listing.status === "REMOVED"}>
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
    </div>
  );
}
