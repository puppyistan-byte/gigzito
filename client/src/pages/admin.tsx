import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, DollarSign, BarChart2, Eye, EyeOff, Trash2 } from "lucide-react";

interface AdminStats {
  todayCount: number;
  todayRevenueCents: number;
  capReached: boolean;
  listings: any[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-600 dark:text-green-400",
  PAUSED: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  REMOVED: "bg-red-500/20 text-red-500 dark:text-red-400",
  PENDING: "bg-blue-500/20 text-blue-500 dark:text-blue-400",
};

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || user.user?.role !== "ADMIN")) navigate("/");
  }, [user, authLoading]);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && user.user?.role === "ADMIN",
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/listings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Listing updated" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || user.user?.role !== "ADMIN") return null;

  const DAILY_CAP = 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center" data-testid="stat-admin-count">
            <BarChart2 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.todayCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Today's listings</p>
          </Card>
          <Card className="p-4 text-center" data-testid="stat-admin-revenue">
            <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">${((stats?.todayRevenueCents ?? 0) / 100).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Today's revenue</p>
          </Card>
          <Card className="p-4 text-center" data-testid="stat-admin-slots">
            <p className="text-2xl font-bold">{DAILY_CAP - (stats?.todayCount ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Slots remaining</p>
            {stats?.capReached && <Badge variant="destructive" className="mt-1 text-xs">CAP REACHED</Badge>}
          </Card>
        </div>

        {/* Progress bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Daily cap usage</span>
            <span className="font-medium">{stats?.todayCount ?? 0} / {DAILY_CAP}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, ((stats?.todayCount ?? 0) / DAILY_CAP) * 100)}%` }}
              data-testid="progress-cap"
            />
          </div>
        </Card>

        {/* All listings */}
        <div>
          <h2 className="text-base font-semibold mb-3">All Listings ({stats?.listings?.length ?? 0})</h2>
          <div className="space-y-2">
            {(stats?.listings ?? []).map((listing: any) => (
              <Card key={listing.id} className="p-3" data-testid={`card-admin-listing-${listing.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-sm font-medium ${STATUS_COLORS[listing.status]}`}>
                        {listing.status}
                      </span>
                      <Badge variant="secondary" className="text-xs">{listing.vertical}</Badge>
                      <span className="text-xs text-muted-foreground">{listing.durationSeconds}s</span>
                    </div>
                    <p className="font-medium text-sm truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      by {listing.provider?.displayName ?? "Unknown"} · {listing.dropDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {listing.status !== "ACTIVE" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-admin-activate-${listing.id}`}
                        onClick={() => statusMutation.mutate({ id: listing.id, status: "ACTIVE" })}
                        disabled={statusMutation.isPending}
                        title="Activate"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {listing.status === "ACTIVE" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-admin-pause-${listing.id}`}
                        onClick={() => statusMutation.mutate({ id: listing.id, status: "PAUSED" })}
                        disabled={statusMutation.isPending}
                        title="Pause"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      data-testid={`button-admin-remove-${listing.id}`}
                      onClick={() => statusMutation.mutate({ id: listing.id, status: "REMOVED" })}
                      disabled={statusMutation.isPending || listing.status === "REMOVED"}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
