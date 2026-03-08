import { useRef, useEffect } from "react";
import { useLocation } from "wouter";

const CATEGORIES = [
  { key: "ALL",            label: "All" },
  { key: "MUSIC_GIGS",    label: "Music Gigs" },
  { key: "EVENTS",        label: "Events" },
  { key: "INFLUENCERS",   label: "Influencers" },
  { key: "MARKETING",     label: "Marketing" },
  { key: "COURSES",       label: "Courses" },
  { key: "PRODUCTS",      label: "Products" },
  { key: "CRYPTO",        label: "Crypto" },
  { key: "GIG_BLITZ",    label: "Gig Blitz" },
  { key: "FLASH_SALE",   label: "Flash Sale" },
  { key: "FLASH_COUPONS",label: "Flash Coupons" },
];

interface CategoryCarouselProps {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}

export function CategoryCarousel({ activeVertical, onVerticalChange }: CategoryCarouselProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const btnRefs  = useRef<(HTMLButtonElement | null)[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    const idx = CATEGORIES.findIndex((c) => c.key === activeVertical);
    const btn = btnRefs.current[idx];
    if (btn && stripRef.current) {
      const strip = stripRef.current;
      const target = btn.offsetLeft - strip.offsetWidth / 2 + btn.offsetWidth / 2;
      strip.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [activeVertical]);

  return (
    <div className="category-strip" ref={stripRef} data-testid="category-carousel">
      <div className="category-track">
        {CATEGORIES.map(({ key, label }, idx) => {
          const isActive = activeVertical === key;
          return (
            <button
              key={key}
              ref={(el) => { btnRefs.current[idx] = el; }}
              onClick={() => onVerticalChange(key)}
              data-testid={`cat-tab-${key.toLowerCase()}`}
              aria-pressed={isActive}
              style={{
                background: "transparent",
                borderRadius: "999px",
                border: isActive
                  ? "1px solid #ff2b2b"
                  : "1px solid rgba(255,255,255,0.15)",
                color: "#ff2b2b",
                padding: "6px 14px",
                fontWeight: "500",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                boxShadow: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ff2b2b";
                e.currentTarget.style.boxShadow = "0 0 6px rgba(255,0,0,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isActive ? "#ff2b2b" : "rgba(255,255,255,0.15)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {label}
            </button>
          );
        })}

        {/* All Eyes On Me CTA — pinned after categories */}
        <button
          onClick={() => navigate("/all-eyes-on-me")}
          data-testid="button-all-eyes-on-me"
          style={{
            background: "#ff2b2b",
            borderRadius: "999px",
            border: "none",
            color: "#fff",
            padding: "6px 16px",
            fontWeight: "700",
            fontSize: "12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            flexShrink: 0,
            letterSpacing: "0.01em",
            boxShadow: "0 0 10px rgba(255,43,43,0.4)",
          }}
        >
          👁️ All Eyes On Me
        </button>
      </div>
    </div>
  );
}
