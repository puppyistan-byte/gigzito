import { useRef, useEffect } from "react";

// Regular nav chips (shown in order)
const NAV_CHIPS = [
  { key: "ALL",            label: "All" },
  { key: "MUSIC_GIGS",    label: "Music Gigs" },
  { key: "EVENTS",        label: "Events" },
  { key: "INFLUENCERS",   label: "Influencers" },
  { key: "MARKETING",     label: "Marketing" },
  { key: "COURSES",       label: "Courses" },
  { key: "PRODUCTS",      label: "Products" },
  { key: "CRYPTO",        label: "Crypto" },
];

// Special highlighted buttons (placed after regular chips)
const SPECIAL_CHIPS = [
  { key: "GIG_BLITZ",    label: "Gig Blitz",     emoji: "🔥", color: "#ff1a1a", glow: "rgba(255,26,26,0.7)" },
  { key: "FLASH_SALE",   label: "Flash Sale",    emoji: "⚡", color: "#ff0040", glow: "rgba(255,0,64,0.7)" },
  { key: "FLASH_COUPONS",label: "Flash Coupons", emoji: "💰", color: "#00c853", glow: "rgba(0,200,83,0.6)" },
];

const ALL_CATEGORIES = [...NAV_CHIPS, ...SPECIAL_CHIPS];

interface CategoryCarouselProps {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}

export function CategoryCarousel({ activeVertical, onVerticalChange }: CategoryCarouselProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const btnRefs  = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = ALL_CATEGORIES.findIndex((c) => c.key === activeVertical);
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
        {NAV_CHIPS.map(({ key, label }, idx) => {
          const isActive = activeVertical === key;
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

        {SPECIAL_CHIPS.map(({ key, label, emoji, color, glow }, i) => {
          const isActive = activeVertical === key;
          const idx = NAV_CHIPS.length + i;
          return (
            <button
              key={key}
              ref={(el) => { btnRefs.current[idx] = el; }}
              onClick={() => onVerticalChange(key)}
              data-testid={`cat-tab-${key.toLowerCase()}`}
              aria-pressed={isActive}
              style={{
                background: isActive ? color : color + "cc",
                color: "#fff",
                borderRadius: "999px",
                padding: "8px 16px",
                fontWeight: "bold",
                fontSize: "12px",
                letterSpacing: "0.2px",
                border: `1.5px solid ${color}88`,
                boxShadow: isActive
                  ? `0 0 18px ${glow}, 0 0 6px ${glow}`
                  : `0 0 10px ${glow}`,
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
                e.currentTarget.style.boxShadow = `0 0 20px ${glow}, 0 0 8px ${glow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = isActive ? "scale(1.05)" : "scale(1)";
                e.currentTarget.style.boxShadow = isActive
                  ? `0 0 18px ${glow}, 0 0 6px ${glow}`
                  : `0 0 10px ${glow}`;
              }}
            >
              <span style={{ fontSize: "14px", lineHeight: 1 }}>{emoji}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
