import { useRef, useEffect } from "react";
import {
  Home,
  Guitar,
  Ticket,
  Megaphone,
  TrendingUp,
  GraduationCap,
  Bitcoin,
  Building2,
  Zap,
  Atom,
  Gift,
} from "lucide-react";

const CATEGORIES = [
  { key: "ALL",             label: "Feed",            Icon: Home         },
  { key: "MUSIC",           label: "Music Gigs",      Icon: Guitar       },
  { key: "EVENTS",          label: "Events",          Icon: Ticket       },
  { key: "INFLUENCERS",     label: "Influencers",     Icon: Megaphone    },
  { key: "MARKETING",       label: "Marketing",       Icon: TrendingUp   },
  { key: "COURSES",         label: "Courses",         Icon: GraduationCap},
  { key: "CRYPTO",          label: "Crypto",          Icon: Bitcoin      },
  { key: "CORPORATE_DEALS", label: "Corporate Deals", Icon: Building2    },
  { key: "GIG_BLITZ",       label: "Gig Blitz",       Icon: Zap          },
  { key: "REACTOR",         label: "Reactor",         Icon: Atom         },
  { key: "FLASH_COUPONS",   label: "Flash Coupons",   Icon: Gift         },
];

interface CategoryCarouselProps {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}

export function CategoryCarousel({ activeVertical, onVerticalChange }: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIdx = CATEGORIES.findIndex((c) => c.key === activeVertical);
    const pill = pillRefs.current[activeIdx];
    if (pill && trackRef.current) {
      const track = trackRef.current;
      const pillLeft = pill.offsetLeft;
      const pillWidth = pill.offsetWidth;
      const trackWidth = track.offsetWidth;
      const target = pillLeft - trackWidth / 2 + pillWidth / 2;
      track.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [activeVertical]);

  return (
    <div className="cat-carousel-wrap" data-testid="category-carousel">
      <div className="cat-carousel-track" ref={trackRef}>
        {CATEGORIES.map(({ key, label, Icon }, idx) => {
          const isActive = key === activeVertical;
          return (
            <button
              key={key}
              ref={(el) => { pillRefs.current[idx] = el; }}
              onClick={() => onVerticalChange(key)}
              data-testid={`cat-pill-${key.toLowerCase()}`}
              className={`cat-pill ${isActive ? "cat-pill-active" : "cat-pill-inactive"}`}
              aria-pressed={isActive}
            >
              <Icon size={14} className="cat-pill-icon" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
