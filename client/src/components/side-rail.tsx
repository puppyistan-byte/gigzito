import { useState, useEffect } from "react";
import { X, Zap, Atom, ArrowRight } from "lucide-react";

type Panel = "GIG_BLITZ" | "MELTDOWN" | null;

interface SideRailProps {
  onVerticalChange: (v: string) => void;
}

const MOCK_GIG_BLITZ = [
  { id: 1, title: "60% off Brand Strategy Session",  badge: "2h left"  },
  { id: 2, title: "Flash: Logo Pack — 3 slots only", badge: "Urgent"   },
  { id: 3, title: "TikTok Ad Bundle — Today only",   badge: "45m left" },
  { id: 4, title: "Email Campaign Kit — $9",         badge: "Last 5"   },
];

const MOCK_MELTDOWN = [
  { id: 1, title: "Crypto Copy Pack — 10× value",    badge: "🔥 Hot"   },
  { id: 2, title: "DeFi Marketing Drop — rare",      badge: "☢️ Melt"  },
  { id: 3, title: "NFT Launch Package — bid now",    badge: "Volatile" },
  { id: 4, title: "Web3 Influencer Bundle",          badge: "💥 Spike" },
];

export function SideRail({ onVerticalChange }: SideRailProps) {
  const [open, setOpen] = useState<Panel>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggle = (panel: "GIG_BLITZ" | "MELTDOWN") =>
    setOpen((prev) => (prev === panel ? null : panel));

  const handleViewAll = (key: string) => {
    onVerticalChange(key);
    setOpen(null);
  };

  const isGigBlitz = open === "GIG_BLITZ";
  const isMeltdown = open === "MELTDOWN";

  return (
    <>
      {/* ── OVERLAY ── */}
      {open && (
        <div
          className="fab-overlay"
          onClick={() => setOpen(null)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════
           GIG BLITZ — Left FAB
          ══════════════════════════════════ */}
      <div className="fab-wrap fab-left">
        <button
          className={`fab fab-blitz ${isGigBlitz ? "fab-active" : ""}`}
          onClick={() => toggle("GIG_BLITZ")}
          data-testid="btn-gig-blitz"
          aria-label="Open Gig Blitz"
        >
          <Zap size={26} strokeWidth={2.5} />
        </button>
        <span className="fab-tooltip">Gig Blitz</span>
      </div>

      {/* ══════════════════════════════════
           MELTDOWN DEALZ — Right FAB
          ══════════════════════════════════ */}
      <div className="fab-wrap fab-right">
        <button
          className={`fab fab-meltdown ${isMeltdown ? "fab-active" : ""}`}
          onClick={() => toggle("MELTDOWN")}
          data-testid="btn-meltdown"
          aria-label="Open Meltdown Dealz"
        >
          <Atom size={26} strokeWidth={2} />
        </button>
        <span className="fab-tooltip">Meltdown Dealz</span>
      </div>

      {/* ══════════════════════════════════
           GIG BLITZ PANEL (slides left)
          ══════════════════════════════════ */}
      <div
        className={`side-panel side-panel-left ${isGigBlitz ? "side-panel-open" : ""}`}
        role="dialog"
        aria-label="Gig Blitz Panel"
      >
        <div className="side-panel-header">
          <div>
            <div className="side-panel-title">
              <Zap size={15} /> Gig Blitz
            </div>
            <p className="side-panel-sub">Urgent limited-time promos</p>
          </div>
          <button className="side-panel-close" onClick={() => setOpen(null)} data-testid="btn-close-gig-blitz">
            <X size={16} />
          </button>
        </div>

        <ul className="side-panel-list">
          {MOCK_GIG_BLITZ.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-blitz">{item.badge}</span>
            </li>
          ))}
        </ul>

        <button
          className="side-panel-cta"
          onClick={() => handleViewAll("GIG_BLITZ")}
          data-testid="btn-view-all-gig-blitz"
        >
          View All Gig Blitz <ArrowRight size={14} />
        </button>
      </div>

      {/* ══════════════════════════════════
           MELTDOWN PANEL (slides right)
          ══════════════════════════════════ */}
      <div
        className={`side-panel side-panel-right ${isMeltdown ? "side-panel-open" : ""}`}
        role="dialog"
        aria-label="Meltdown Dealz Panel"
      >
        <div className="side-panel-header side-panel-header-meltdown">
          <div>
            <div className="side-panel-title side-panel-title-meltdown">
              <Atom size={15} /> Meltdown Dealz
            </div>
            <p className="side-panel-sub">Volatile high-value reactor drops</p>
          </div>
          <button className="side-panel-close" onClick={() => setOpen(null)} data-testid="btn-close-meltdown">
            <X size={16} />
          </button>
        </div>

        <ul className="side-panel-list">
          {MOCK_MELTDOWN.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-meltdown">{item.badge}</span>
            </li>
          ))}
        </ul>

        <button
          className="side-panel-cta side-panel-cta-meltdown"
          onClick={() => handleViewAll("REACTOR")}
          data-testid="btn-view-all-meltdown"
        >
          View All Meltdown Dealz <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
}
