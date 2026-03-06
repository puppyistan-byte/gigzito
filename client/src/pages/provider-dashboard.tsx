import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, AlertCircle, CheckCircle2, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import type { ListingWithProvider, ProfileCompletionStatus, ProviderProfile } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "bg-green-500/15 text-green-400 border border-green-500/25",
  PAUSED:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  REMOVED: "bg-red-500/15 text-red-400 border border-red-500/25",
  PENDING: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
};

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
      </div>
    </div>
  );
}
