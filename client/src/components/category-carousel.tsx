import { useRef, useEffect } from "react";

const CATEGORIES = [
  { key: "MUSIC",           label: "Music Gigs",      flame: false },
  { key: "EVENTS",          label: "Events",           flame: false },
  { key: "INFLUENCERS",     label: "Influencers",      flame: false },
  { key: "MARKETING",       label: "Marketing",        flame: false },
  { key: "COURSES",         label: "Courses",          flame: false },
  { key: "CRYPTO",          label: "Crypto",           flame: false },
  { key: "CORPORATE_DEALS", label: "Corporate Deals",  flame: false },
  { key: "FLASH_COUPONS",   label: "Flash Coupons",    flame: false },
  { key: "GIG_BLITZ",       label: "Gig Blitz",        flame: true  },
  { key: "HOT_COUPONS",     label: "Hot Coupons",      flame: true  },
];

interface CategoryCarouselProps {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}

export function CategoryCarousel({ activeVertical, onVerticalChange }: CategoryCarouselProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const btnRefs  = useRef<(HTMLButtonElement | null)[]>([]);

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
        {CATEGORIES.map(({ key, label, flame }, idx) => {
          const isActive = activeVertical === key;

          if (flame) {
            return (
              <button
                key={key}
                ref={(el) => { btnRefs.current[idx] = el; }}
                onClick={() => onVerticalChange(key)}
                data-testid={`cat-tab-${key.toLowerCase()}`}
                aria-pressed={isActive}
                className="cat-tab-flame"
                style={{
                  background: isActive
                    ? "linear-gradient(45deg, #ff2200, #ff5500, #ff8800)"
                    : "linear-gradient(45deg, #ff3b00, #ff6a00, #ff9a00)",
                  color: "#ffffff",
                  borderRadius: "999px",
                  padding: "8px 16px",
                  fontWeight: "bold",
                  fontSize: "12px",
                  letterSpacing: "0.2px",
                  border: isActive ? "1.5px solid rgba(255,200,0,0.5)" : "1.5px solid rgba(255,120,0,0.35)",
                  boxShadow: isActive
                    ? "0 0 16px rgba(255,120,0,0.9), 0 0 6px rgba(255,80,0,0.5)"
                    : "0 0 10px rgba(255,80,0,0.7)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(255,120,0,0.9), 0 0 6px rgba(255,80,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isActive ? "scale(1.05)" : "scale(1)";
                  e.currentTarget.style.boxShadow = isActive
                    ? "0 0 16px rgba(255,120,0,0.9), 0 0 6px rgba(255,80,0,0.5)"
                    : "0 0 10px rgba(255,80,0,0.7)";
                }}
              >
                <span style={{ fontSize: "14px", lineHeight: 1 }}>🔥</span>
                {label}
              </button>
            );
          }

          return (
            <button
              key={key}
              ref={(el) => { btnRefs.current[idx] = el; }}
              onClick={() => onVerticalChange(key)}
              data-testid={`cat-tab-${key.toLowerCase()}`}
              className={`cat-tab${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
