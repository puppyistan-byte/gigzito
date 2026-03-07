import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, ChevronDown, ChevronUp, ExternalLink, Clock } from "lucide-react";
import type { TodayGigJack } from "@shared/schema";

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
};

export function TodaysGigJacks() {
  const [open, setOpen] = useState(false);

  const { data: list = [] } = useQuery<TodayGigJack[]>({
    queryKey: ["/api/gigjacks/today"],
    refetchInterval: 15000,
  });

  if (list.length === 0) return null;

  return (
    <div className="todays-gigjacks-section" data-testid="section-todays-gigjacks">
      <button
        className="todays-gigjacks-header"
        onClick={() => setOpen((o) => !o)}
        data-testid="btn-toggle-todays-gigjacks"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[#ff2b2b]" />
          <span className="text-xs font-semibold text-white">Today's GigJacks</span>
          <span className="text-[10px] font-bold bg-[#ff2b2b]/20 text-[#ff2b2b] rounded-full px-2 py-0.5">
            {list.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#555]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#555]" />}
      </button>

      {open && (
        <div className="todays-gigjacks-list" data-testid="list-todays-gigjacks">
          {list.map((gj) => {
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
          })}
        </div>
      )}
    </div>
  );
}
