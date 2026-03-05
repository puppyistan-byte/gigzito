import { useRef, useEffect } from "react";

const CATEGORIES = [
  { key: "MUSIC",           label: "Music Gigs"      },
  { key: "EVENTS",          label: "Events"          },
  { key: "INFLUENCERS",     label: "Influencers"     },
  { key: "MARKETING",       label: "Marketing"       },
  { key: "COURSES",         label: "Courses"         },
  { key: "CRYPTO",          label: "Crypto"          },
  { key: "CORPORATE_DEALS", label: "Corporate Deals" },
  { key: "GIG_BLITZ",       label: "Gig Blitz"       },
  { key: "REACTOR",         label: "Reactor"         },
  { key: "FLASH_COUPONS",   label: "Flash Coupons"   },
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
        {CATEGORIES.map(({ key, label }, idx) => (
          <button
            key={key}
            ref={(el) => { btnRefs.current[idx] = el; }}
            onClick={() => onVerticalChange(key)}
            data-testid={`cat-tab-${key.toLowerCase()}`}
            className={`cat-tab${activeVertical === key ? " is-active" : ""}`}
            aria-pressed={activeVertical === key}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
