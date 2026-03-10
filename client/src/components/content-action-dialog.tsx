import { useState } from "react";
import { AlertTriangle, Trash2, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DISABLE_REASONS = [
  "Content violates community guidelines",
  "Inappropriate or offensive content",
  "Copyright or intellectual property concern",
  "Misleading or fraudulent claim",
  "Non-video format or static image detected",
  "Account under review",
  "Spam or repetitive content",
];

const DELETE_REASONS = [
  "Content violates community guidelines",
  "Inappropriate or offensive content",
  "Copyright or intellectual property concern",
  "Misleading or fraudulent claim",
  "Non-video format or static image detected",
  "Duplicate listing",
  "Provider requested removal",
  "Spam or repetitive content",
];

interface ContentActionDialogProps {
  type: "disable" | "delete";
  title: string;
  onConfirm: (reason: string, sendEmail: boolean) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ContentActionDialog({ type, title, onConfirm, onCancel, isPending = false }: ContentActionDialogProps) {
  const isDelete = type === "delete";
  const reasons = isDelete ? DELETE_REASONS : DISABLE_REASONS;
  const [reason, setReason] = useState(reasons[0]);
  const [sendEmail, setSendEmail] = useState(true);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      data-testid={`content-action-dialog-${type}`}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "#0e0e0e",
          border: `1px solid ${isDelete ? "rgba(255,43,43,0.35)" : "rgba(245,158,11,0.35)"}`,
          boxShadow: isDelete
            ? "0 8px 48px rgba(255,0,0,0.2), 0 2px 16px rgba(0,0,0,0.8)"
            : "0 8px 48px rgba(245,158,11,0.15), 0 2px 16px rgba(0,0,0,0.8)",
        }}
      >
        <div className="h-1 w-full" style={{ background: isDelete ? "linear-gradient(90deg, #ff1a1a, #ff4444)" : "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />

        <div className="p-6 space-y-4">
          {/* Icon + heading */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${isDelete ? "bg-red-500/15" : "bg-amber-500/15"}`}>
              {isDelete
                ? <Trash2 className="h-5 w-5 text-red-400" />
                : <EyeOff className="h-5 w-5 text-amber-400" />
              }
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-white">{isDelete ? "Delete Listing" : "Disable Listing"}</h3>
              <p className="text-xs text-[#666] leading-relaxed">
                {isDelete ? "Permanently remove this video from the platform." : "Hide this video from the feed."}
              </p>
            </div>
          </div>

          {/* Listing title */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: isDelete ? "rgba(255,43,43,0.07)" : "rgba(245,158,11,0.07)", border: isDelete ? "1px solid rgba(255,43,43,0.18)" : "1px solid rgba(245,158,11,0.18)" }}
          >
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2" data-testid="action-dialog-title">
              "{title}"
            </p>
          </div>

          {/* Reason selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#555] uppercase tracking-wider">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger
                className="bg-[#111] border-[#2a2a2a] text-[#ccc] text-xs h-9"
                data-testid={`select-action-reason-${type}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[#2a2a2a]">
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs text-[#ccc]">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email notification toggle */}
          <button
            type="button"
            onClick={() => setSendEmail(!sendEmail)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            style={{ background: sendEmail ? "rgba(255,43,43,0.06)" : "rgba(255,255,255,0.03)", border: sendEmail ? "1px solid rgba(255,43,43,0.2)" : "1px solid #1e1e1e" }}
            data-testid={`toggle-send-email-${type}`}
          >
            <Mail className={`h-4 w-4 flex-shrink-0 ${sendEmail ? "text-[#ff2b2b]" : "text-[#444]"}`} />
            <div className="flex-1 text-left">
              <p className={`text-xs font-semibold ${sendEmail ? "text-white" : "text-[#555]"}`}>
                Notify provider by email
              </p>
              <p className="text-[10px] text-[#444] mt-0.5">
                Send a pre-made notification with the reason above
              </p>
            </div>
            <div
              className="w-8 h-4 rounded-full flex items-center transition-all flex-shrink-0"
              style={{ background: sendEmail ? "#ff2b2b" : "#2a2a2a", padding: "2px" }}
            >
              <div
                className="w-3 h-3 rounded-full bg-white transition-transform"
                style={{ transform: sendEmail ? "translateX(16px)" : "translateX(0)" }}
              />
            </div>
          </button>

          {/* Warning for delete */}
          {isDelete && (
            <div className="flex items-start gap-2 rounded-xl bg-[#1a0000] border border-red-900/40 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300/80 leading-relaxed">
                <strong className="text-red-400">This cannot be undone.</strong> The listing will be permanently removed and cannot be recovered.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-[#2a2a2a] bg-transparent text-[#888] hover:text-white hover:border-[#444] h-9 text-sm"
              onClick={onCancel}
              disabled={isPending}
              data-testid={`action-dialog-cancel-${type}`}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 h-9 text-sm font-bold gap-1.5 border-0 text-white ${isDelete ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
              onClick={() => onConfirm(reason, sendEmail)}
              disabled={isPending}
              data-testid={`action-dialog-confirm-${type}`}
            >
              {isDelete
                ? <><Trash2 className="h-3.5 w-3.5" />{isPending ? "Deleting…" : "Delete"}</>
                : <><EyeOff className="h-3.5 w-3.5" />{isPending ? "Disabling…" : "Disable"}</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
