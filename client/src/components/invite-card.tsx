import { useState } from "react";
import { Gift, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function InviteCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/gz-invite`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share /gz-invite with anyone you want to bring in." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Please copy the link manually." });
    }
  };

  return (
    <div
      className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/30 to-transparent p-4"
      data-testid="card-invite"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/15 border border-red-500/25 mt-0.5">
          <Gift className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-0.5">
            The Gift That Keeps Giving
          </p>
          <p className="text-sm font-semibold text-white mb-1">
            Invite Anyone — Free to Enterprise
          </p>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Share this link with any creator, business, or consumer you want in the ecosystem. They'll get a full breakdown of every feature and every tier — no login required to read it.
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 min-w-0 bg-black/40 border border-white/8 rounded-lg px-3 py-1.5 font-mono text-[11px] text-gray-400 truncate"
              data-testid="text-invite-url"
            >
              {inviteUrl}
            </div>
            <button
              onClick={copyLink}
              data-testid="button-copy-invite-link"
              className="shrink-0 flex items-center gap-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? (
                <><CheckCheck className="w-3.5 h-3.5" />Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copy</>
              )}
            </button>
            <a
              href="/gz-invite"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-open-invite-page"
              className="shrink-0 flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs transition-colors px-1"
              title="Open invite page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
