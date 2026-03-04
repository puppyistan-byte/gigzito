import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";

const MARKETERS = [
  { initial: "A", name: "Ava Growth",  tag: "TikTok Ads • Funnels",      slug: "ava"   },
  { initial: "J", name: "Jaron Media", tag: "UGC • Shorts • Editing",    slug: "jaron" },
  { initial: "K", name: "Kira Brand",  tag: "Brand • Copy • Email",      slug: "kira"  },
];

export function MarketerDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const openDrawer = () => setOpen(true);
  const closeDrawer = () => setOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
    setActiveIdx(idx);
  };

  const scrollTo = (idx: number) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: idx * carouselRef.current.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      {/* Right edge tabs */}
      <div className="right-tabs">
        <button
          className="right-tab"
          onClick={() => window.location.href = user ? "/provider/new" : "/auth"}
          data-testid="button-right-upload"
        >
          <span>Upload</span>
        </button>
        <button
          className="right-tab"
          onClick={openDrawer}
          data-testid="button-right-marketers"
        >
          <span>Marketers</span>
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`mk-overlay ${open ? "open" : ""}`}
        onClick={closeDrawer}
        data-testid="mk-overlay"
      />

      {/* Drawer */}
      <aside
        className={`mk-drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
        data-testid="mk-drawer"
      >
        <div className="mk-head">
          <div className="mk-title">Featured Marketers</div>
          <button className="mk-close" onClick={closeDrawer} data-testid="button-mk-close">✕</button>
        </div>

        <div className="mk-carousel" ref={carouselRef} onScroll={handleScroll}>
          {MARKETERS.map((m) => (
            <div className="mk-card" key={m.slug}>
              <div>
                <div className="mk-avatar">{m.initial}</div>
                <div className="mk-name">{m.name}</div>
                <div className="mk-tag">{m.tag}</div>
              </div>
              <div className="mk-actions">
                <button
                  className="mk-btn"
                  onClick={() => window.location.href = `/marketers/${m.slug}`}
                  data-testid={`button-mk-view-${m.slug}`}
                >View</button>
                <button
                  className="mk-btn ghost"
                  onClick={() => window.location.href = `/marketers/${m.slug}/book`}
                  data-testid={`button-mk-book-${m.slug}`}
                >Book</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mk-dots">
          {MARKETERS.map((m, i) => (
            <span
              key={m.slug}
              className={`mk-dot ${i === activeIdx ? "active" : ""}`}
              onClick={() => scrollTo(i)}
              data-testid={`mk-dot-${i}`}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
