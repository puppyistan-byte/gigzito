import { useMemo, useState } from "react";

export function OrbitDrawer() {
  const [open, setOpen] = useState(false);

  const marketers = useMemo(
    () => [
      {
        name: "James Okafor",
        niche: "YouTube Growth",
        price: "$20/mo",
        avatar: "https://i.pravatar.cc/80?img=12",
        url: "#",
      },
      {
        name: "Sierra Lane",
        niche: "Brand + Ads",
        price: "$49/mo",
        avatar: "https://i.pravatar.cc/80?img=44",
        url: "#",
      },
      {
        name: "Marco V",
        niche: "Funnels + Copy",
        price: "$35/mo",
        avatar: "https://i.pravatar.cc/80?img=22",
        url: "#",
      },
      {
        name: "Kira Bloom",
        niche: "IG Reels",
        price: "$25/mo",
        avatar: "https://i.pravatar.cc/80?img=31",
        url: "#",
      },
      {
        name: "Dante M",
        niche: "Email Automation",
        price: "$29/mo",
        avatar: "https://i.pravatar.cc/80?img=6",
        url: "#",
      },
      {
        name: "Nora Chen",
        niche: "SEO + Local",
        price: "$19/mo",
        avatar: "https://i.pravatar.cc/80?img=50",
        url: "#",
      },
    ],
    []
  );

  return (
    <>
      {/* CLICK-OUT OVERLAY */}
      <div
        className={`orbit-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* RIGHT EDGE RING TAB */}
      <button
        className={`orbit-tab ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Orbit Rolodex"
        data-testid="button-orbit-tab"
      >
        <span className="orbit-tab-dot" />
        <span className="orbit-tab-dot" />
        <span className="orbit-tab-dot" />
      </button>

      {/* DRAWER */}
      <aside className={`orbit-drawer ${open ? "open" : ""}`}>
        <div className="orbit-header">
          <div>
            <div className="orbit-title">Orbit</div>
            <div className="orbit-subtitle">Featured Marketers</div>
          </div>
          <button className="orbit-close" onClick={() => setOpen(false)} data-testid="button-orbit-close">
            ✕
          </button>
        </div>

        {/* SATURN RING VISUAL */}
        <div className="orbit-ring-wrap" aria-hidden="true">
          <div className="orbit-ring orbit-ring-a" />
          <div className="orbit-ring orbit-ring-b" />
          <div className="orbit-ring orbit-ring-c" />
        </div>

        {/* ROLODEX LIST */}
        <div className="orbit-list">
          {marketers.map((m) => (
            <a className="orbit-card" href={m.url} key={m.name} data-testid={`card-orbit-${m.name.replace(/\s+/g, "-").toLowerCase()}`}>
              <img className="orbit-avatar" src={m.avatar} alt={m.name} />
              <div className="orbit-meta">
                <div className="orbit-name">{m.name}</div>
                <div className="orbit-niche">{m.niche}</div>
              </div>
              <div className="orbit-cta">
                <span className="orbit-price">{m.price}</span>
                <span className="orbit-btn">View</span>
              </div>
            </a>
          ))}
        </div>
      </aside>
    </>
  );
}
