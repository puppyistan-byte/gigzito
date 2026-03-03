import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, AlertCircle, CheckCircle2, Settings, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import type { ListingWithProvider, ProfileCompletionStatus } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-600 dark:text-green-400",
  PAUSED: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  REMOVED: "bg-red-500/20 text-red-600 dark:text-red-400",
  PENDING: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
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

  if (authLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-4"><Skeleton className="h-32 w-full" /></div></div>;
  if (!user) return null;

  const profile = user.profile;
  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.user.email[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold" data-testid="text-dashboard-title">My Dashboard</h1>
          <Link href="/provider/new">
            <Button size="sm" data-testid="button-post-new" disabled={dailyStats?.capReached}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Post Video
            </Button>
          </Link>
        </div>

        {/* Cap warning */}
        {dailyStats?.capReached && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm" data-testid="alert-cap-reached">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Daily cap of {dailyStats.maxCap} listings reached. New submissions open tomorrow.</span>
          </div>
        )}

        {/* Profile status */}
        <Card className="p-4" data-testid="card-profile-status">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatarUrl ?? ""} alt={profile?.displayName ?? ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.displayName || user.user.email}</p>
              {completion?.isComplete ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Profile complete
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Missing: {completion?.missing?.join(", ")}
                </span>
              )}
            </div>
            <Link href="/provider/profile">
              <Button size="sm" variant="outline" data-testid="button-edit-profile">
                <Settings className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </Link>
          </div>
        </Card>

        {/* Stats */}
        {dailyStats && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center" data-testid="stat-today-count">
              <p className="text-2xl font-bold">{dailyStats.count}</p>
              <p className="text-xs text-muted-foreground">Today's posts</p>
            </Card>
            <Card className="p-3 text-center" data-testid="stat-my-listings">
              <p className="text-2xl font-bold">{listings.length}</p>
              <p className="text-xs text-muted-foreground">My listings</p>
            </Card>
            <Card className="p-3 text-center" data-testid="stat-cap">
              <p className="text-2xl font-bold">{dailyStats.maxCap - dailyStats.count}</p>
              <p className="text-xs text-muted-foreground">Slots left today</p>
            </Card>
          </div>
        )}

        {/* My listings */}
        <div>
          <h2 className="text-base font-semibold mb-3">My Videos</h2>
          {listingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : listings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm">No listings yet.</p>
              <Link href="/provider/new">
                <Button className="mt-3" size="sm" disabled={dailyStats?.capReached} data-testid="button-first-post">Post your first video</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <Card key={listing.id} className="p-4" data-testid={`card-listing-${listing.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${STATUS_COLORS[listing.status]}`}>
                          {listing.status}
                        </span>
                        <Badge variant="secondary" className="text-xs">{listing.vertical}</Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{listing.durationSeconds}s · ${(listing.pricePaidCents / 100).toFixed(2)} paid</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/listing/${listing.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-${listing.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {listing.status === "ACTIVE" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-pause-${listing.id}`}
                          onClick={() => statusMutation.mutate({ id: listing.id, status: "PAUSED" })}
                          disabled={statusMutation.isPending}
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : listing.status === "PAUSED" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-resume-${listing.id}`}
                          onClick={() => statusMutation.mutate({ id: listing.id, status: "ACTIVE" })}
                          disabled={statusMutation.isPending}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        data-testid={`button-remove-${listing.id}`}
                        onClick={() => statusMutation.mutate({ id: listing.id, status: "REMOVED" })}
                        disabled={statusMutation.isPending || listing.status === "REMOVED"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
