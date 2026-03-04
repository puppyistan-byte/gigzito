import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";

export function EdgeDock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
    setActiveSlide(idx);
  };

  return (
    <div
      className={`edge-dock ${open ? "open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      data-testid="edge-dock"
    >
      <div className="edge-handle" data-testid="button-edge-handle">
        <span>Actions</span>
      </div>

      <div className="edge-panel">
        <div className="edge-header">
          <div className="edge-title">Quick Actions</div>
          <button
            className="edge-close"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            data-testid="button-edge-close"
          >✕</button>
        </div>

        <div className="edge-carousel" ref={carouselRef} onScroll={handleScroll}>
          <div className="edge-slide">
            <div className="edge-card">
              <div className="edge-card-title">Upload</div>
              <div className="edge-card-desc">Buy a $3 spot for 24 hours.</div>
              <button
                className="red-orb"
                onClick={() => window.location.href = user ? "/provider/new" : "/auth"}
                data-testid="button-edge-upload"
              >Upload</button>
            </div>
          </div>

          <div className="edge-slide">
            <div className="edge-card">
              <div className="edge-card-title">Marketers</div>
              <div className="edge-card-desc">Browse featured marketers.</div>
              <button
                className="red-orb"
                onClick={() => window.location.href = "/"}
                data-testid="button-edge-marketers"
              >Marketers</button>
            </div>
          </div>
        </div>

        <div className="edge-dots">
          <span className={`dot ${activeSlide === 0 ? "active" : ""}`} />
          <span className={`dot ${activeSlide === 1 ? "active" : ""}`} />
        </div>
      </div>
    </div>
  );
}
