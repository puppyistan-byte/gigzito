import { useState, useEffect } from "react";
import { X, Zap, Tag, Atom, Orbit, ArrowRight } from "lucide-react";

type Panel = "GIG_BLITZ" | "FLASH_COUPONS" | "REACTIVE" | null;

interface SideRailProps {
  onVerticalChange: (v: string) => void;
}

const MOCK_GIG_BLITZ = [
  { id: 1, title: "60% off Brand Strategy Session",  badge: "2h left"  },
  { id: 2, title: "Flash: Logo Pack — 3 slots only", badge: "Urgent"   },
  { id: 3, title: "TikTok Ad Bundle — Today only",   badge: "45m left" },
  { id: 4, title: "Email Campaign Kit — $9",         badge: "Last 5"   },
];

const MOCK_FLASH = [
  { id: 1, title: "25% off SEO Audit — code: FLASH",  badge: "Limited"   },
  { id: 2, title: "Buy 2 Get 1 Free — Ad Creatives",  badge: "Today only" },
  { id: 3, title: "$49 Funnel Template Bundle",        badge: "5 left"    },
  { id: 4, title: "Free Month — any coaching plan",   badge: "New"       },
];

const MOCK_REACTIVE = [
  { id: 1, title: "Crypto Copy Pack — 10× value",    badge: "🔥 Hot"   },
  { id: 2, title: "DeFi Marketing Drop — rare",      badge: "☢️ Melt"  },
  { id: 3, title: "NFT Launch Package — bid now",    badge: "Volatile" },
  { id: 4, title: "Web3 Influencer Bundle",          badge: "💥 Spike" },
];

export function SideRail({ onVerticalChange }: SideRailProps) {
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel]       = useState<Panel>(null);

  useEffect(() => {
    if (!panel) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanel(null); setExpanded(false); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [panel]);

  const openPanel = (p: Panel) => {
    setPanel((prev) => (prev === p ? null : p));
  };

  const closePanel = () => setPanel(null);

  const handleViewAll = (key: string) => {
    onVerticalChange(key);
    setPanel(null);
    setExpanded(false);
  };

  const isOpen = (p: Panel) => panel === p;

  return (
    <>
      {/* Overlay when any panel is open */}
      {panel && (
        <div
          className="trinity-overlay"
          onClick={() => { setPanel(null); setExpanded(false); }}
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════════════
           TRINITY CLUSTER  (right side)
          ══════════════════════════════════════════ */}
      <div className={`trinity-cluster ${expanded ? "trinity-expanded" : ""}`}>

        {/* ── Orbit buttons ── */}
        <div className="trinity-orbit-wrap">

          {/* 1. Gig Blitz  (top / 270°) */}
          <div className="orbit-item orbit-item-1">
            <button
              className="orbit-btn orbit-btn-blitz"
              onClick={() => openPanel("GIG_BLITZ")}
              data-testid="btn-trinity-gig-blitz"
              aria-label="Gig Blitz"
            >
              <Zap size={20} strokeWidth={2.5} />
            </button>
            <span className="orbit-tooltip">Gig Blitz</span>
          </div>

          {/* 2. Flash Coupons  (bottom-right / 30°) */}
          <div className="orbit-item orbit-item-2">
            <button
              className="orbit-btn orbit-btn-flash"
              onClick={() => openPanel("FLASH_COUPONS")}
              data-testid="btn-trinity-flash"
              aria-label="Flash Coupons"
            >
              <Tag size={18} strokeWidth={2} />
            </button>
            <span className="orbit-tooltip">Flash Coupons</span>
          </div>

          {/* 3. Reactive Offers  (bottom-left / 150°) */}
          <div className="orbit-item orbit-item-3">
            <button
              className="orbit-btn orbit-btn-reactive"
              onClick={() => openPanel("REACTIVE")}
              data-testid="btn-trinity-reactive"
              aria-label="Reactive Offers"
            >
              <Atom size={20} strokeWidth={1.8} />
            </button>
            <span className="orbit-tooltip">Reactive Offers</span>
          </div>

        </div>

        {/* ── Center Hub ── */}
        <button
          className={`trinity-hub ${expanded ? "hub-open" : ""}`}
          onClick={() => { setExpanded((e) => !e); setPanel(null); }}
          data-testid="btn-trinity-hub"
          aria-label="Toggle Trinity"
          aria-expanded={expanded}
        >
          <Orbit size={26} strokeWidth={1.8} />
        </button>

      </div>

      {/* ══════════════════════════════════════════
           PANELS  (all slide from right)
          ══════════════════════════════════════════ */}

      {/* Gig Blitz */}
      <div
        className={`side-panel side-panel-right ${isOpen("GIG_BLITZ") ? "side-panel-open" : ""}`}
        role="dialog" aria-label="Gig Blitz Panel" data-testid="panel-gig-blitz"
      >
        <div className="side-panel-header">
          <div>
            <div className="side-panel-title"><Zap size={15} /> Gig Blitz</div>
            <p className="side-panel-sub">Urgent limited-time promos</p>
          </div>
          <button className="side-panel-close" onClick={closePanel} data-testid="btn-close-gig-blitz"><X size={16} /></button>
        </div>
        <ul className="side-panel-list">
          {MOCK_GIG_BLITZ.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-blitz">{item.badge}</span>
            </li>
          ))}
        </ul>
        <button className="side-panel-cta" onClick={() => handleViewAll("GIG_BLITZ")} data-testid="btn-view-all-gig-blitz">
          View All Gig Blitz <ArrowRight size={14} />
        </button>
      </div>

      {/* Flash Coupons */}
      <div
        className={`side-panel side-panel-right ${isOpen("FLASH_COUPONS") ? "side-panel-open" : ""}`}
        role="dialog" aria-label="Flash Coupons Panel" data-testid="panel-flash"
      >
        <div className="side-panel-header">
          <div>
            <div className="side-panel-title"><Tag size={15} /> Flash Coupons</div>
            <p className="side-panel-sub">Unfair advantage bin</p>
          </div>
          <button className="side-panel-close" onClick={closePanel} data-testid="btn-close-flash"><X size={16} /></button>
        </div>
        <ul className="side-panel-list">
          {MOCK_FLASH.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-flash">{item.badge}</span>
            </li>
          ))}
        </ul>
        <button className="side-panel-cta side-panel-cta-flash" onClick={() => handleViewAll("FLASH_COUPONS")} data-testid="btn-view-all-flash">
          View All Flash Coupons <ArrowRight size={14} />
        </button>
      </div>

      {/* Reactive Offers */}
      <div
        className={`side-panel side-panel-right ${isOpen("REACTIVE") ? "side-panel-open" : ""}`}
        role="dialog" aria-label="Reactive Offers Panel" data-testid="panel-reactive"
      >
        <div className="side-panel-header side-panel-header-meltdown">
          <div>
            <div className="side-panel-title side-panel-title-meltdown"><Atom size={15} /> Reactive Offers</div>
            <p className="side-panel-sub">Volatile high-value reactor drops</p>
          </div>
          <button className="side-panel-close" onClick={closePanel} data-testid="btn-close-reactive"><X size={16} /></button>
        </div>
        <ul className="side-panel-list">
          {MOCK_REACTIVE.map((item) => (
            <li key={item.id} className="side-panel-item">
              <span className="side-panel-item-title">{item.title}</span>
              <span className="side-panel-badge side-panel-badge-meltdown">{item.badge}</span>
            </li>
          ))}
        </ul>
        <button className="side-panel-cta side-panel-cta-meltdown" onClick={() => handleViewAll("REACTOR")} data-testid="btn-view-all-reactive">
          View All Reactive Offers <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
}
