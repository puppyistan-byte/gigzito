import { useState } from "react";
import { Gift, Send, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function InviteCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [targetName, setTargetName] = useState("");
  const [targetEmail, setTargetEmail] = useState("");

  const inviteUrl = `${window.location.origin}/gz-invite`;

  const senderName =
    user?.profile?.displayName ?? user?.user?.email?.split("@")[0] ?? "A Gigzito member";
  const senderEmail = user?.user?.email ?? "";

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/invite/send", {
        senderName,
        senderEmail,
        targetName: targetName.trim() || undefined,
        targetEmail: targetEmail.trim(),
      }),
    onSuccess: () => {
      toast({
        title: "Invite sent!",
        description: `${targetEmail} will receive a link to the Gigzito invite page.`,
      });
      setTargetName("");
      setTargetEmail("");
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Couldn't send invite",
        description: err?.message ?? "Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = targetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: "destructive", title: "Enter a valid email address" });
      return;
    }
    mutation.mutate();
  };

  return (
    <div
      className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/30 to-transparent p-4 space-y-3"
      data-testid="card-invite"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/15 border border-red-500/25 mt-0.5">
          <Gift className="w-4 h-4 text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-0.5">
            The Gift That Keeps Giving
          </p>
          <p className="text-sm font-semibold text-white">
            Invite a Friend to Gigzito
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Send them a formal invite and they'll receive a full breakdown of every tier with your name on it.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Their name (optional)"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/60 transition-colors"
          data-testid="input-invite-name"
        />
        <div className="space-y-1.5">
          <input
            type="email"
            placeholder="Their email address *"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/60 transition-colors"
            data-testid="input-invite-email"
          />
          <a
            href="/gz-invite"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-invite-page-preview"
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors pl-0.5"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {inviteUrl}
          </a>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          data-testid="button-send-invite"
          className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send Invite</>
          )}
        </button>
      </form>
    </div>
  );
}
