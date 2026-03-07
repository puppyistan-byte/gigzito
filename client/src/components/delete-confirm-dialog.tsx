import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DeleteConfirmDialog({ title, onConfirm, onCancel, isPending = false }: DeleteConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      data-testid="delete-confirm-dialog"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "#0e0e0e", border: "1px solid rgba(255,43,43,0.35)", boxShadow: "0 8px 48px rgba(255,0,0,0.2), 0 2px 16px rgba(0,0,0,0.8)" }}
      >
        {/* Red accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ff1a1a, #ff4444)" }} />

        <div className="p-6 space-y-5">
          {/* Icon + heading */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center mt-0.5">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-white">Delete Listing</h3>
              <p className="text-xs text-[#666] leading-relaxed">
                You are about to permanently delete:
              </p>
            </div>
          </div>

          {/* Listing title */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,43,43,0.07)", border: "1px solid rgba(255,43,43,0.18)" }}
          >
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2" data-testid="delete-dialog-title">
              "{title}"
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-xl bg-[#1a0000] border border-red-900/40 px-3 py-2.5">
            <Trash2 className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">
              <strong className="text-red-400">This cannot be undone.</strong> The listing will be permanently removed from the platform and cannot be recovered.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-[#2a2a2a] bg-transparent text-[#888] hover:text-white hover:border-[#444] h-9 text-sm"
              onClick={onCancel}
              disabled={isPending}
              data-testid="delete-confirm-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0 h-9 text-sm font-bold gap-1.5"
              onClick={onConfirm}
              disabled={isPending}
              data-testid="delete-confirm-yes"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isPending ? "Deleting…" : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
