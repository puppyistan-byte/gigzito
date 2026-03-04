import { type ElementType } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, Music, Zap, BookOpen, User } from "lucide-react";

const TABS: { key: string; label: string; icon?: ElementType; emoji?: string }[] = [
  { key: "ALL",       label: "Feed",      icon: Home     },
  { key: "MUSIC",     label: "Music",     icon: Music    },
  { key: "MARKETING", label: "Marketing", icon: Zap      },
  { key: "CRYPTO",    label: "Crypto",    emoji: "₿"     },
  { key: "COURSES",   label: "Courses",   icon: BookOpen },
  { key: "PROFILE",   label: "Profile",   icon: User     },
];

export function BottomNav({ activeVertical, onVerticalChange }: {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}) {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleTab = (key: string) => {
    if (key === "PROFILE") {
      window.location.href = user ? "/provider/me" : "/auth";
    } else {
      if (location !== "/") window.location.href = "/";
      onVerticalChange(key);
    }
  };

  const isActive = (key: string) => {
    if (key === "PROFILE") return location.startsWith("/provider") || location === "/auth";
    return location === "/" && activeVertical === key;
  };

  return (
    <nav className="bottom-nav">
      {TABS.map(({ key, label, icon: Icon, emoji }) => (
        <button
          key={key}
          onClick={() => handleTab(key)}
          className={`nav-item transition-colors ${isActive(key) ? "active" : ""}`}
          data-testid={`nav-${key.toLowerCase()}`}
        >
          {emoji
            ? <span className="nav-emoji">{emoji}</span>
            : Icon && <Icon size={20} />
          }
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
