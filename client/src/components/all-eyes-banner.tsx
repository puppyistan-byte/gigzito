import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, X, ChevronRight } from "lucide-react";
import type { AllEyesSlotWithProvider } from "@shared/schema";

function useCountdown(endAt: string | Date): string {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setText("Ended"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return text;
}

interface AllEyesBannerProps {
  slot: AllEyesSlotWithProvider;
  onDismiss: () => void;
}

function AllEyesBannerInner({ slot, onDismiss }: AllEyesBannerProps) {
  const countdown = useCountdown(slot.endAt);
  const provider = slot.provider;
  const initials = provider?.displayName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const title = slot.customTitle || (slot.videoListing as any)?.title || provider?.displayName || "Featured";
  const isEnded = countdown === "Ended";

  if (isEnded || !provider) return null;

  const destination = slot.videoListingId
    ? `/listing/${slot.videoListingId}`
    : `/provider/${provider.username ?? provider.id}`;

  return (
    <div
      className="relative flex items-center gap-2.5 px-3 py-2.5 border-b border-[#ff2b2b]/25 overflow-hidden"
      style={{
        background: "linear-gradient(90deg, rgba(255,43,43,0.18) 0%, rgba(20,0,0,0.95) 60%, rgba(0,0,0,0.95) 100%)",
        backdropFilter: "blur(8px)",
      }}
      data-testid="all-eyes-banner"
    >
      {/* Animated scanner line */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,43,43,0.08) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "scanner 3s linear infinite",
        }}
      />

      {/* ALL EYES ON ME badge */}
      <div className="shrink-0 flex items-center gap-1 bg-[#ff2b2b] rounded-full px-2 py-0.5">
        <Eye className="w-2.5 h-2.5 text-white" />
        <span className="text-white text-[9px] font-black tracking-widest whitespace-nowrap">ALL EYES ON ME</span>
      </div>

      {/* Avatar */}
      <div className="shrink-0 relative">
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", background: "#c41414", border: "1.5px solid #ff2b2b" }}>
          {provider.avatarUrl ? (
            <img src={provider.avatarUrl} alt={provider.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "8px", fontWeight: "700" }}>{initials}</div>
          )}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff2b2b] border border-black animate-pulse" />
      </div>

      {/* Content */}
      <Link href={destination} className="flex-1 min-w-0 flex items-center gap-1.5 group cursor-pointer">
        <span className="text-white text-xs font-semibold truncate">{title}</span>
        <ChevronRight className="w-3 h-3 text-[#ff2b2b] shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Countdown */}
      <div className="shrink-0 flex items-center gap-1">
        <span className="text-[#ff2b2b] text-xs font-bold tabular-nums">{countdown}</span>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[#555] hover:text-white transition-colors"
        data-testid="button-dismiss-all-eyes"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function AllEyesBanner() {
  const [dismissed, setDismissed] = useState<number | null>(null);

  const { data: slot } = useQuery<AllEyesSlotWithProvider | null>({
    queryKey: ["/api/all-eyes/active"],
    queryFn: () => fetch("/api/all-eyes/active").then(r => r.json()),
    refetchInterval: 20000,
  });

  if (!slot || slot.id === dismissed) return null;

  return <AllEyesBannerInner slot={slot} onDismiss={() => setDismissed(slot.id)} />;
}
