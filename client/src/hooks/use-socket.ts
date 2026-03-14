import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io({ path: "/ws", transports: ["websocket", "polling"] });
  }
  return globalSocket;
}

const SCAN_LABELS: Record<string, { title: string; description: string; variant?: "destructive" | "default" }> = {
  CLEAN: { title: "Video approved", description: "Your video passed the Bif reputation scan.", variant: "default" },
  FLAGGED: { title: "Video flagged", description: "Bif flagged your video for review. You can appeal from your dashboard.", variant: "destructive" },
  APPEAL_DENIED: { title: "Appeal denied", description: "Your appeal was reviewed and denied by the Bif team.", variant: "destructive" },
  HUMAN_REVIEW: { title: "Sent to human review", description: "Your video has been escalated for human review.", variant: "default" },
  APPEAL_PENDING: { title: "Appeal submitted", description: "Your appeal is under review. We'll notify you of the outcome.", variant: "default" },
};

export function useSocket(userId?: number) {
  const listenerAdded = useRef(false);

  useEffect(() => {
    if (listenerAdded.current) return;
    listenerAdded.current = true;

    const socket = getSocket();

    socket.on("GIGJACK_START", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/live-state"] });
    });

    socket.on("GIGJACK_END", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/live-state"] });
    });

    socket.on("SCAN_UPDATE", (payload: { listingId: number; status: string; ownerUserId: number }) => {
      // Always invalidate so the dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/listings/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", payload.listingId, "scan-status"] });

      // Show toast only if this is our own listing
      if (userId && payload.ownerUserId === userId) {
        const label = SCAN_LABELS[payload.status];
        if (label) {
          toast({ title: label.title, description: label.description, variant: label.variant });
        }
      }
    });

    return () => {
      listenerAdded.current = false;
    };
  }, [userId]);
}
