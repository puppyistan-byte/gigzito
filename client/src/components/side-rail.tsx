import { useState, useEffect, useRef } from "react";
import { X, Zap, Atom, ArrowRight } from "lucide-react";

type Panel = "GIG_BLITZ" | "REACTOR" | null;

interface SideRailProps {
  onVerticalChange: (v: string) => void;
}

const MOCK_GIG_BLITZ = [
  { id: 1, title: "60% off Brand Strategy Session",   badge: "2h left"   },
  { id: 2, title: "Flash: Logo Pack — 3 slots only",  badge: "Urgent"    },
  { id: 3, title: "TikTok Ad Bundle — Today only",    badge: "45m left"  },
  { id: 4, title: "Email Campaign Kit — $9",          badge: "Last 5"    },
];

const MOCK_REACTOR = [
  { id: 1, title: "Crypto Copy Pack — 10× value",     badge: "🔥 Hot"    },
  { id: 2, title: "DeFi Marketing Drop — rare",       badge: "Nuclear"   },
  { id: 3, title: "NFT Launch Package — bid now",     badge: "Volatile"  },
  { id: 4, title: "Web3 Influencer Bundle",           badge: "💥 Spike"  },
];

export function SideRail({ onVerticalChange }: SideRailProps) {
  const [open, setOpen] = useState<Panel>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggle = (panel: "GIG_BLITZ" | "REACTOR") =>
    setOpen((prev) => (prev === panel ? null : panel));

  const handleViewAll = (key: "GIG_BLITZ" | "REACTOR") => {
    onVerticalChange(key);
    setOpen(null);
  };

  const isGigBlitz = open === "GIG_BLITZ";
  const isReactor  = open === "REACTOR";

  return (
    <>
      {/* ── OVERLAY ── */}
      {open && (
        <div
          className="side-rail-overlay"
          onClick={() => setOpen(null)}
          aria-hidden="true"
        />
      )}

      {/* ── LEFT BUTTON — Gig Blitz ── */}
      <button
        className={`side-rail-btn side-rail-left ${isGigBlitz ? "side-rail-btn-on" : ""}`}
        onClick={() => toggle("GIG_BLITZ")}
        data-testid="btn-gig-blitz"
        aria-label="Open Gig Blitz"
      >
        <Zap size={16} className="side-rail-icon" />
        <span className="side-rail-label">Gig Blitz</span>
      </button>

      {/* ── LEFT PANEL — Gig Blitz ── */}
      <div
        ref={panelRef}
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

      {/* ── RIGHT BUTTON — Reactor ── */}
      <button
        className={`side-rail-btn side-rail-right ${isReactor ? "side-rail-btn-on" : ""}`}
        onClick={() => toggle("REACTOR")}
        data-testid="btn-reactor"
        aria-label="Open Reactor"
      >
        <Atom size={16} className="side-rail-icon" />
        <span className="side-rail-label">Reactor</span>
      </button>

      {/* ── RIGHT PANEL — Reactor ── */}
      <div
        className={`side-panel side-panel-right ${isReactor ? "side-panel-open" : ""}`}
        role="dialog"
        aria-label="Reactor Panel"
      >
        <div className="side-panel-header">
          <div>
            <div className="side-panel-title">
              <Atom size={15} /> Reactor Drops
            </div>
            <p className="side-panel-sub">Volatile high-value offers</p>
          </div>
          <button className="side-panel-close" onClick={() => setOpen(null)} data-testid="btn-close-reactor">
            <X size={16} />
          </button>
        </div>

        <ul className="side-panel-list">
          {MOCK_REACTOR.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-reactor">{item.badge}</span>
            </li>
          ))}
        </ul>

        <button
          className="side-panel-cta"
          onClick={() => handleViewAll("REACTOR")}
          data-testid="btn-view-all-reactor"
        >
          View All Reactor <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
}
