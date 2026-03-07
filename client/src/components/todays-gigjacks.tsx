import { useQuery } from "@tanstack/react-query";
import { Zap, ExternalLink, Clock, X } from "lucide-react";
import type { TodayGigJack } from "@shared/schema";

interface TodaysGigJacksProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-purple-500/20 text-purple-300",
  MUSIC: "bg-pink-500/20 text-pink-300",
  CRYPTO: "bg-yellow-500/20 text-yellow-300",
  COACHING: "bg-teal-500/20 text-teal-300",
  COURSES: "bg-blue-500/20 text-blue-300",
  EVENTS: "bg-orange-500/20 text-orange-300",
  INFLUENCERS: "bg-rose-500/20 text-rose-300",
  CORPORATE_DEALS: "bg-amber-500/20 text-amber-300",
  GIG_BLITZ: "bg-red-500/20 text-red-300",
  FLASH_SALE: "bg-red-500/20 text-red-300",
  FLASH_COUPONS: "bg-red-500/20 text-red-300",
  PRODUCTS: "bg-emerald-500/20 text-emerald-300",
  MUSIC_GIGS: "bg-pink-500/20 text-pink-300",
};

export function TodaysGigJacks({ open, onClose }: TodaysGigJacksProps) {
  const { data: list = [] } = useQuery<TodayGigJack[]>({
    queryKey: ["/api/gigjacks/today"],
    refetchInterval: 15000,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9980] transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
        data-testid="overlay-todays-gigjacks-backdrop"
      />

      {/* Slide-up panel */}
      <div
        className="fixed left-0 right-0 z-[9981] flex flex-col"
        style={{
          bottom: 0,
          maxHeight: "72vh",
          background: "#0a0a0a",
          borderTop: "1px solid #222",
          borderRadius: "20px 20px 0 0",
          transform: open ? "translateY(0)" : "translateY(100%)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.7)",
        }}
        data-testid="panel-todays-gigjacks"
      >
        {/* Panel handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#ff2b2b]" />
            <span className="font-bold text-white text-sm">Today's Offers</span>
            {list.length > 0 && (
              <span className="text-[10px] font-bold bg-[#ff2b2b]/20 text-[#ff2b2b] rounded-full px-2 py-0.5">
                {list.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition-colors"
            data-testid="btn-close-todays-gigjacks"
          >
            <X className="h-3.5 w-3.5 text-[#888]" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2" data-testid="list-todays-gigjacks">
          {list.length === 0 ? (
            <div className="py-12 text-center" data-testid="todays-gigjacks-empty">
              <Zap className="h-8 w-8 text-[#222] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#444]">No GigJacks today yet</p>
              <p className="text-xs text-[#333] mt-1">Check back when live offers are scheduled</p>
            </div>
          ) : (
            list.map((gj) => {
              const isActive = gj.displayState === "flash" || gj.displayState === "siren";
              const catColor = CATEGORY_COLORS[gj.category ?? ""] ?? "bg-zinc-500/20 text-zinc-400";
              return (
                <a
                  key={gj.id}
                  href={gj.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="todays-gigjack-row"
                  data-testid={`row-todays-gigjack-${gj.id}`}
                >
                  {gj.artworkUrl && (
                    <img
                      src={gj.artworkUrl}
                      alt={gj.offerTitle}
                      className="todays-gigjack-thumb"
                      data-testid={`img-todays-gigjack-${gj.id}`}
                    />
                  )}
                  <div className="todays-gigjack-info">
                    <p className="todays-gigjack-title" data-testid={`text-todays-gigjack-title-${gj.id}`}>
                      {gj.offerTitle}
                    </p>
                    <p className="todays-gigjack-brand">{gj.displayName}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {gj.category && (
                        <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${catColor}`}>
                          {gj.category.replace(/_/g, " ")}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        }`}
                        data-testid={`status-todays-gigjack-${gj.id}`}
                      >
                        {isActive ? "Active" : "Expired"}
                      </span>
                    </div>
                  </div>
                  <div className="todays-gigjack-meta">
                    <div className="flex items-center gap-1 text-[10px] text-[#555]">
                      <Clock size={9} />
                      <span>{formatTime(gj.scheduledAt)}</span>
                    </div>
                    <ExternalLink size={11} className="text-[#333] mt-1" />
                  </div>
                </a>
              );
            })
          )}
          {/* Bottom spacing for nav */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}
