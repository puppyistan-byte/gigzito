import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface InviteInfo {
  groupId: number;
  groupName: string;
  inviterName: string | null;
  email: string;
}

export default function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invite, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ["/api/groups/join", token],
    queryFn: async () => {
      const res = await fetch(`/api/groups/join/${token}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Invite not found");
      }
      return res.json();
    },
    retry: false,
  });

  const claimMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/join/${token}`, {}),
    onSuccess: (data: any) => {
      toast({ title: `Joined ${data.groupName}!`, description: "Welcome to the group." });
      navigate(`/groups/${data.groupId}`);
    },
    onError: (e: any) => toast({ title: "Could not join", description: e.message, variant: "destructive" }),
  });

  const goToLogin = () => {
    navigate(`/login?redirect=/join-group/${token}`);
  };

  const goToRegister = () => {
    navigate(`/register?redirect=/join-group/${token}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl font-black tracking-tight text-red-500">Gigzito</span>
          <p className="text-xs text-muted-foreground mt-1">Getcho Gig On</p>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-xl">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading invitation…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <XCircle className="h-10 w-10 text-red-500" />
              <h2 className="text-lg font-bold">Invite Not Found</h2>
              <p className="text-sm text-muted-foreground text-center">
                This invitation link has expired, already been used, or doesn't exist.
              </p>
              <Button variant="outline" onClick={() => navigate("/")} className="mt-2">
                Go to Gigzito
              </Button>
            </div>
          )}

          {invite && !error && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-400" />
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold">You're Invited!</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {invite.inviterName ? (
                    <><span className="text-white font-medium">{invite.inviterName}</span> invited you to join</>
                  ) : (
                    "You've been invited to join"
                  )}
                </p>
                <p className="text-2xl font-black text-blue-400 mt-2">{invite.groupName}</p>
                <p className="text-xs text-muted-foreground mt-1">Private Group on Gigzito</p>
              </div>

              {user ? (
                <div className="w-full space-y-3 mt-2">
                  <Button
                    data-testid="button-accept-invite"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    onClick={() => claimMut.mutate()}
                    disabled={claimMut.isPending}
                  >
                    {claimMut.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Joining…</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Accept & Join Group</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground text-sm"
                    onClick={() => navigate("/")}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-3 mt-2">
                  <p className="text-xs text-center text-muted-foreground">
                    Sign in or create a free account to accept this invitation
                  </p>
                  <Button
                    data-testid="button-register-to-join"
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                    onClick={goToRegister}
                  >
                    Create Account & Join
                  </Button>
                  <Button
                    data-testid="button-login-to-join"
                    variant="outline"
                    className="w-full"
                    onClick={goToLogin}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
